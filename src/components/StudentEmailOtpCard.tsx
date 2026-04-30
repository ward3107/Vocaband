/**
 * StudentEmailOtpCard — alternative student login path that swaps the
 * Google OAuth button for "type your email → get a 6-digit code →
 * sign in."
 *
 * Why students need this just like teachers do:
 *   * Shared classroom PCs.  When a kid signs in with Google on a
 *     school computer, their personal Google session persists in
 *     Chrome until the next user explicitly signs out.  The next
 *     student tapping "Sign in with Google" sees the previous
 *     student's email auto-completed — privacy + identity confusion.
 *   * Some students don't want to use their personal Google account
 *     for a school-tracked app.  Email OTP gives them a path that
 *     creates a fresh Supabase session each visit, no Google cookie.
 *
 * Reuses the existing `useTeacherOtpAuth` hook — the hook is purely
 * about Supabase auth state machinery (sendOtp + verifyOtp + cooldown
 * + error states) and has nothing teacher-specific.  After verifyOtp
 * succeeds, this component flips the parent's isOAuthCallback flag so
 * the existing OAuthCallback → OAuthClassCode chain takes over for
 * post-auth routing (find existing student profile OR show class-code
 * binding screen).  The class code typed earlier is stashed via
 * writeIntendedClassCode so OAuthClassCode pre-fills it.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTeacherOtpAuth } from "../hooks/useTeacherOtpAuth";
import { writeIntendedClassCode } from "../utils/oauthIntent";

export interface StudentEmailOtpCardProps {
  /** Class code the student typed on the parent screen.  Stashed
   *  before sendOtp so OAuthClassCode can pre-fill it after the new
   *  Supabase session lands. */
  classCode: string;
  /** Called when verifyOtp succeeds — parent flips to OAuthCallback so
   *  the existing post-auth chain (teacher / existing-student / new-
   *  student-needs-class-code) takes over. */
  onVerified: () => void;
  /** "Use Google instead" — return to the Google OAuth button. */
  onUseGoogle: () => void;
}

const RESEND_LABEL_THRESHOLD = 0;

export default function StudentEmailOtpCard({
  classCode,
  onVerified,
  onUseGoogle,
}: StudentEmailOtpCardProps) {
  const otp = useTeacherOtpAuth();
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmedClassCode = classCode.trim().toUpperCase();
  const hasClassCode = trimmedClassCode.length >= 3;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!hasClassCode) {
      setValidationError("Type your class code first — your teacher gave it to you.");
      return;
    }
    if (otp.stage === "sending") return;
    // Stash the class code BEFORE sending so OAuthClassCode pre-fills
    // when the post-auth flow lands.  Without this, the student would
    // have to type the code again on the binding screen.
    writeIntendedClassCode(trimmedClassCode);
    await otp.sendCode(emailInput);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.stage === "verifying") return;
    await otp.verifyCode(codeInput);
  };

  // After verifyOtp returns 'done', let the parent know so it can flip
  // to the OAuthCallback view.  We don't auto-navigate from inside the
  // hook because the caller might have view chrome around us that
  // needs to react first.
  if (otp.stage === "done") {
    // Fire once via a microtask so React doesn't complain about
    // setting parent state during a child render.
    queueMicrotask(onVerified);
  }

  const showEmailForm = otp.stage === "idle" || otp.stage === "sending" || otp.stage === "error-send";
  const showCodeForm =
    otp.stage === "awaiting-code" || otp.stage === "verifying" || otp.stage === "error-verify" || otp.stage === "done";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      {/* Heading + back link to the Google flow */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onUseGoogle}
          className="text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
        >
          <ArrowLeft size={14} />
          Use Google instead
        </button>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">
          Email sign-in
        </span>
      </div>

      {showEmailForm && (
        <form onSubmit={handleSendCode}>
          <label htmlFor="student-otp-email" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
            Your email
          </label>
          <input
            id="student-otp-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            disabled={otp.stage === "sending"}
            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-indigo-500 focus:outline-none text-base font-medium disabled:bg-stone-50 disabled:opacity-60"
          />
          {validationError && (
            <p className="mt-2 text-xs font-bold text-rose-600 flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
          {otp.stage === "error-send" && otp.error && (
            <p className="mt-2 text-xs font-bold text-rose-600 flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{otp.error}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={otp.stage === "sending" || emailInput.trim().length === 0}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white font-black text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
          >
            {otp.stage === "sending" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending code…
              </>
            ) : (
              <>
                <Mail size={16} />
                Send me a 6-digit code
              </>
            )}
          </button>
          <p className="mt-3 text-[11px] text-stone-500 text-center leading-relaxed">
            We'll send a one-time code to your email.  No password needed.
          </p>
        </form>
      )}

      {showCodeForm && (
        <form onSubmit={handleVerifyCode}>
          <p className="text-sm text-stone-600 mb-3 break-words">
            We sent a 6-digit code to <strong>{otp.email}</strong>.
          </p>
          <label htmlFor="student-otp-code" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
            Enter the code
          </label>
          <input
            id="student-otp-code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={otp.stage === "verifying" || otp.stage === "done"}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-indigo-500 focus:outline-none text-2xl font-black tracking-[0.5em] text-center font-mono tabular-nums disabled:bg-stone-50 disabled:opacity-60"
          />
          {otp.stage === "error-verify" && otp.error && (
            <p className="mt-2 text-xs font-bold text-rose-600 flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{otp.error}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={otp.stage === "verifying" || otp.stage === "done" || codeInput.length !== 6}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white font-black text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
          >
            {otp.stage === "verifying" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Checking code…
              </>
            ) : otp.stage === "done" ? (
              <>
                <CheckCircle2 size={16} />
                Signing in…
              </>
            ) : (
              <>Sign in →</>
            )}
          </button>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-stone-500">
            <button
              type="button"
              onClick={() => { otp.reset(); setCodeInput(""); }}
              className="font-bold hover:text-stone-900 transition-colors"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => otp.resend()}
              disabled={otp.resendInSeconds > RESEND_LABEL_THRESHOLD || otp.stage === "verifying"}
              className="font-bold hover:text-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              {otp.resendInSeconds > 0 ? `Resend in ${otp.resendInSeconds}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
