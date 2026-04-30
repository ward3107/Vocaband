/**
 * TeacherLoginCard — the actual sign-in card.
 *
 * Two paths in one card:
 *   1. "Sign in with Google" button (existing OAuth flow)
 *   2. Email + 6-digit OTP code form (new — shared classroom PCs)
 *
 * Self-contained: owns its state via useTeacherOtpAuth, calls
 * supabase.auth.signInWithOAuth directly for the Google path.  No
 * App.tsx state or props consumed -- just an `onCancel` callback so
 * the parent can pop the user back to the landing page.
 *
 * The component uses motion/react for the stage transitions so the
 * email -> code -> success flow feels like one continuous form, not
 * three separate screens.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { teacherLoginT } from "../locales/student/teacher-login";
import { useTeacherOtpAuth } from "../hooks/useTeacherOtpAuth";
import { writeIntendedRole } from "../utils/oauthIntent";

interface TeacherLoginCardProps {
  /** Optional close-button hook, e.g. to navigate back to the
   *  landing page when the teacher backs out of the form. */
  onCancel?: () => void;
}

export default function TeacherLoginCard({ onCancel }: TeacherLoginCardProps) {
  const { language, dir } = useLanguage();
  const tt = teacherLoginT[language];
  const otp = useTeacherOtpAuth();

  // Local form state -- the hook owns auth state, this owns input state.
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogle = async () => {
    if (googleSubmitting) return;
    setGoogleSubmitting(true);
    try {
      // Stamp the user's intended role BEFORE the Google redirect so
      // the post-OAuth restoreSession logic can enforce it (without
      // this stamp, an account with a student profile would silently
      // sign in as a student even though the teacher pressed the
      // teacher button).  Same protection the previous inline
      // App.tsx onTeacherOAuth handler used; relocated here so all
      // teacher-OAuth concerns live in this component.
      writeIntendedRole("teacher");
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
      // After signInWithOAuth, the browser is mid-redirect to
      // accounts.google.com -- we never re-render past this line.
    } catch (err) {
      console.warn("[teacher-login] google OAuth failed:", err);
      setGoogleSubmitting(false);
    }
  };

  const onSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.stage === "sending") return;
    // Same intended-role stamp as the Google OAuth path -- the post-
    // verifyOtp restoreSession check uses this to refuse a student
    // account that happens to share the email.
    writeIntendedRole("teacher");
    void otp.sendCode(emailInput);
  };

  const onSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.stage === "verifying") return;
    void otp.verifyCode(codeInput);
  };

  const showEmailForm = otp.stage === "idle" || otp.stage === "sending" || otp.stage === "error-send";
  const showCodeForm =
    otp.stage === "awaiting-code" || otp.stage === "verifying" || otp.stage === "error-verify" || otp.stage === "done";

  return (
    <div
      dir={dir}
      className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 sm:p-8 relative"
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back"
          className={`absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"} w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
        >
          <ArrowLeft size={18} className={dir === "rtl" ? "rotate-180" : ""} />
        </button>
      )}

      {/* Brand V (canonical inclined V — matches PublicNav, footer, QP) */}
      <div className="flex items-center justify-center mb-5">
        <div className="w-12 h-12 rounded-xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white text-2xl font-black font-headline italic">V</span>
        </div>
      </div>

      <h1 className="text-2xl font-black text-stone-900 text-center mb-6">
        {tt.heading}
      </h1>

      <AnimatePresence mode="wait">
        {/* ── EMAIL FORM (idle / sending / error-send) ──────────────────── */}
        {showEmailForm && (
          <motion.div
            key="email-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleSubmitting}
              className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-900 font-bold text-sm transition-all shadow-sm hover:shadow disabled:opacity-60"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            >
              {googleSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
              )}
              <span>{tt.signInWithGoogle}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5 text-stone-400 text-xs uppercase tracking-widest font-bold">
              <span className="flex-1 border-t border-stone-200" />
              <span>{tt.divider}</span>
              <span className="flex-1 border-t border-stone-200" />
            </div>

            {/* Email form */}
            <form onSubmit={onSubmitEmail}>
              <label htmlFor="teacher-email" className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                {tt.emailLabel}
              </label>
              <input
                id="teacher-email"
                type="email"
                /* autoComplete="off" + a non-standard name tells most
                   browsers not to remember + autofill the email after
                   the teacher logs in.  On a shared classroom PC this
                   prevents the next teacher from seeing the previous
                   teacher's email pre-filled (they could otherwise
                   click 'Send code' and start a code-to-someone-else's-
                   inbox flow).  Reported 2026-04-30. */
                autoComplete="off"
                name="vocaband-otp-email"
                spellCheck={false}
                inputMode="email"
                placeholder={tt.emailPlaceholder}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                disabled={otp.stage === "sending"}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none text-base font-medium disabled:bg-stone-50 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              />

              {otp.stage === "error-send" && otp.error && (
                <div className="mt-3 flex items-start gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{otp.error.includes("not allow") ? tt.errorNotAllowlisted : tt.errorSendFailed}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={otp.stage === "sending" || emailInput.trim().length === 0}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white font-black text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {otp.stage === "sending" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {tt.sending}
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    {tt.sendCodeButton}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── CODE FORM (awaiting-code / verifying / error-verify / done) ─── */}
        {showCodeForm && (
          <motion.div
            key="code-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="text-center mb-4">
              <div className="text-3xl mb-2" aria-hidden>📬</div>
              <h2 className="text-lg font-black text-stone-900 mb-1">{tt.checkEmailHeading}</h2>
              <p className="text-sm text-stone-600 break-words">{tt.codeSentTo(otp.email)}</p>
            </div>

            <form onSubmit={onSubmitCode}>
              <label htmlFor="teacher-code" className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1.5 text-center">
                {tt.enterCodeLabel}
              </label>
              <input
                id="teacher-code"
                type="text"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="••••••"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={otp.stage === "verifying" || otp.stage === "done"}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none text-2xl font-black tracking-[0.5em] text-center font-mono tabular-nums disabled:bg-stone-50 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              />

              {otp.stage === "error-verify" && otp.error && (
                <div className="mt-3 flex items-start gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{tt.errorInvalidCode}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={otp.stage === "verifying" || otp.stage === "done" || codeInput.length !== 6}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white font-black text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {otp.stage === "verifying" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {tt.verifying}
                  </>
                ) : (
                  tt.verifyButton
                )}
              </button>

              {/* Resend / different-email row */}
              <div className="flex items-center justify-between mt-4 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    otp.reset();
                    setCodeInput("");
                  }}
                  className="text-stone-500 hover:text-stone-900 font-semibold"
                  disabled={otp.stage === "verifying"}
                >
                  {tt.useDifferentEmail}
                </button>
                {otp.resendInSeconds > 0 ? (
                  <span className="text-stone-400 font-medium">{tt.resendIn(otp.resendInSeconds)}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void otp.resend()}
                    className="text-primary hover:underline font-semibold"
                    disabled={otp.stage === "verifying"}
                  >
                    {tt.resendButton}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[11px] text-stone-400 text-center mt-6 leading-relaxed">
        {tt.helpText}
      </p>
    </div>
  );
}
