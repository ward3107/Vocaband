/**
 * useTeacherOtpAuth — state machine + Supabase calls for the email
 * + 6-digit OTP teacher login flow.
 *
 * Self-contained — does NOT depend on App.tsx state or props.  When
 * verifyOtp succeeds, Supabase Auth issues a session and the
 * existing onAuthStateChange listener in App.tsx picks it up,
 * runs the teacher allowlist check, and routes the user to the
 * dashboard.  This hook just drives the form's UI states + emits
 * those Supabase calls; it doesn't manage post-login routing.
 *
 * Stages:
 *   'idle'           - show the email input
 *   'sending'        - email submitted, awaiting Supabase ACK
 *   'awaiting-code'  - email sent, show the 6-digit input
 *   'verifying'      - code submitted, awaiting Supabase verify
 *   'done'           - verifyOtp returned a session — caller
 *                      typically navigates away on this transition
 *                      (or the global onAuthStateChange listener
 *                      handles routing automatically)
 *   'error-send'     - sendOtp failed; surfaces .error to the UI
 *   'error-verify'   - verifyOtp failed; surfaces .error
 *
 * Resend cooldown: after sending, the hook tracks an internal
 * countdown (default 30s) before allowing another send.  UI reads
 * `resendInSeconds` to render "Resend in 25s".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../core/supabase";

export type OtpAuthStage =
  | "idle"
  | "sending"
  | "awaiting-code"
  | "verifying"
  | "done"
  | "error-send"
  | "error-verify";

/**
 * Category of a failed `signInWithOtp` send.  We surface this instead
 * of leaving the UI to substring-match the raw GoTrue message — that
 * string drifts between Supabase releases, and lumping every failure
 * into one "couldn't send the code" line hides the single most common
 * cause (a per-email cooldown on a quick retry), which tells the
 * teacher to re-check a perfectly valid email instead of just waiting.
 */
export type OtpSendErrorKind =
  | "invalid-email"
  | "rate-limited"
  | "not-allowed"
  | "send-failed";

/**
 * Map a GoTrue send error to a UI-stable category.  Match on the
 * stable `code`/`status` first, fall back to substring sniffing for
 * older Supabase releases that only set `message`.
 */
function classifySendError(err: { message?: string; status?: number; code?: string }): OtpSendErrorKind {
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  // 429 + "for security purposes, you can only request this after N
  // seconds" is GoTrue's per-email cooldown — by far the most common
  // reason a code "won't send" on a retry.  Give it its own category
  // so we tell the teacher to wait, not to re-check their email.
  if (
    err.status === 429 ||
    code.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("you can only request this after") ||
    msg.includes("for security purposes")
  ) {
    return "rate-limited";
  }
  if (msg.includes("not allow") || msg.includes("not authorized") || code.includes("not_allowed")) {
    return "not-allowed";
  }
  return "send-failed";
}

export interface UseTeacherOtpAuth {
  stage: OtpAuthStage;
  email: string;
  /** When stage is 'error-send' or 'error-verify', the human-readable
   *  reason from Supabase Auth (or our own validation). */
  error: string | null;
  /** Category of the last send failure — lets the UI pick accurate
   *  copy (e.g. "wait a moment" for a cooldown vs "check the email"). */
  errorKind: OtpSendErrorKind | null;
  /** Seconds until resend is allowed. 0 = enabled. */
  resendInSeconds: number;
  /** Type-and-submit the email to send the OTP. */
  sendCode: (email: string) => Promise<void>;
  /** Type-and-submit the 6-digit code to verify. */
  verifyCode: (code: string) => Promise<void>;
  /** Resend the same email's code. */
  resend: () => Promise<void>;
  /** Reset back to 'idle' so the user can edit the email again. */
  reset: () => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

export function useTeacherOtpAuth(): UseTeacherOtpAuth {
  const [stage, setStage] = useState<OtpAuthStage>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<OtpSendErrorKind | null>(null);
  const [resendInSeconds, setResendInSeconds] = useState(0);

  // Tick the cooldown timer down to zero.
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (resendInSeconds <= 0) {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      return;
    }
    if (cooldownIntervalRef.current) return;
    cooldownIntervalRef.current = setInterval(() => {
      setResendInSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [resendInSeconds]);

  const sendCode = useCallback(async (rawEmail: string) => {
    const trimmed = rawEmail.trim().toLowerCase();
    // Cheap client-side sanity check — Supabase rejects malformed
    // emails too, but failing fast keeps the loading spinner from
    // flashing for an obvious typo.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      setErrorKind("invalid-email");
      setStage("error-send");
      return;
    }

    setEmail(trimmed);
    setStage("sending");
    setError(null);
    setErrorKind(null);

    // signInWithOtp sends an email containing BOTH a magic link AND
    // a 6-digit code.  We use the code path so school PCs work even
    // when the teacher reads the email on their phone.
    //
    // shouldCreateUser:true is the correct policy — for first-time
    // teacher signups we need to create an auth.users row, then the
    // allowlist check in App.tsx's onAuthStateChange handler blocks
    // any non-allowlisted teacher from getting a public.users row.
    const { error: sendErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });

    if (sendErr) {
      console.warn("[teacher-otp] sendOtp failed:", sendErr);
      setError(sendErr.message);
      setErrorKind(classifySendError(sendErr));
      setStage("error-send");
      return;
    }

    setStage("awaiting-code");
    setResendInSeconds(RESEND_COOLDOWN_SECONDS);
  }, []);

  const verifyCode = useCallback(async (rawCode: string) => {
    const code = rawCode.replace(/\D/g, ""); // digits only
    if (code.length !== 6) {
      setError("Code must be 6 digits.");
      setStage("error-verify");
      return;
    }

    setStage("verifying");
    setError(null);
    setErrorKind(null);

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyErr) {
      console.warn("[teacher-otp] verifyOtp failed:", verifyErr);
      setError(verifyErr.message);
      setStage("error-verify");
      return;
    }

    // Success — Supabase has set the session.  The global
    // onAuthStateChange listener in App.tsx will handle:
    //   1. Allowlist check (CLAUDE.md §14)
    //   2. users-row creation if first-time teacher
    //   3. Routing to teacher-dashboard
    setStage("done");
  }, [email]);

  const resend = useCallback(async () => {
    if (!email || resendInSeconds > 0) return;
    await sendCode(email);
  }, [email, resendInSeconds, sendCode]);

  const reset = useCallback(() => {
    setStage("idle");
    setError(null);
    setErrorKind(null);
    setResendInSeconds(0);
  }, []);

  return {
    stage,
    email,
    error,
    errorKind,
    resendInSeconds,
    sendCode,
    verifyCode,
    resend,
    reset,
  };
}
