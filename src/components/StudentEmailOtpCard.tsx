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
import { useLanguage } from "../hooks/useLanguage";

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
  const { language } = useLanguage();
  const s = {
    useGoogle: language === 'he' ? 'השתמשו ב-Google במקום' : language === 'ar' ? 'استخدم Google بدلًا من ذلك' : 'Use Google instead',
    emailSignIn: language === 'he' ? 'כניסה במייל' : language === 'ar' ? 'تسجيل دخول بالبريد' : 'Email sign-in',
    yourEmail: language === 'he' ? 'המייל שלכם' : language === 'ar' ? 'بريدك الإلكتروني' : 'Your email',
    classCodeFirst: language === 'he' ? 'הקלידו תחילה את קוד הכיתה — המורה נתן לכם.' : language === 'ar' ? 'أدخل رمز الفصل أولاً — أعطاك إياه المعلم.' : 'Type your class code first — your teacher gave it to you.',
    sendingCode: language === 'he' ? 'שולח קוד…' : language === 'ar' ? 'جارٍ إرسال الرمز…' : 'Sending code…',
    sendMe6Digit: language === 'he' ? 'שלחו לי קוד בן 6 ספרות' : language === 'ar' ? 'أرسل لي رمزًا من 6 أرقام' : 'Send me a 6-digit code',
    weWillSend: language === 'he' ? 'נשלח קוד חד-פעמי לאימייל. אין צורך בסיסמה.' : language === 'ar' ? 'سنرسل رمزًا لمرة واحدة إلى بريدك. لا حاجة لكلمة مرور.' : "We'll send a one-time code to your email.  No password needed.",
    weSent6Digit: (email: string) =>
      language === 'he' ? <>שלחנו קוד בן 6 ספרות אל <strong>{email}</strong>.</> :
      language === 'ar' ? <>أرسلنا رمزًا من 6 أرقام إلى <strong>{email}</strong>.</> :
      <>We sent a 6-digit code to <strong>{email}</strong>.</>,
    enterCode: language === 'he' ? 'הזינו את הקוד' : language === 'ar' ? 'أدخل الرمز' : 'Enter the code',
    checkingCode: language === 'he' ? 'בודק קוד…' : language === 'ar' ? 'جارٍ التحقق…' : 'Checking code…',
    signingIn: language === 'he' ? 'מחבר…' : language === 'ar' ? 'جارٍ تسجيل الدخول…' : 'Signing in…',
    signIn: language === 'he' ? 'כניסה ←' : language === 'ar' ? 'تسجيل الدخول ←' : 'Sign in →',
    useDifferentEmail: language === 'he' ? 'מייל אחר' : language === 'ar' ? 'استخدم بريدًا آخر' : 'Use a different email',
    resendIn: (s: number) => language === 'he' ? `שלחו שוב בעוד ${s}ש׳` : language === 'ar' ? `إعادة الإرسال خلال ${s}ث` : `Resend in ${s}s`,
    resendCode: language === 'he' ? 'שלחו שוב' : language === 'ar' ? 'إعادة إرسال' : 'Resend code',
  };
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
      setValidationError(s.classCodeFirst);
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
          {s.useGoogle}
        </button>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">
          {s.emailSignIn}
        </span>
      </div>

      {showEmailForm && (
        <form onSubmit={handleSendCode}>
          <label htmlFor="student-otp-email" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
            {s.yourEmail}
          </label>
          <input
            id="student-otp-email"
            /* Non-standard `name` + autoComplete="off" so the browser
               doesn't remember + autofill the email on the next visit
               from a shared classroom PC.  Privacy: prevents the next
               student from seeing the previous student's email pre-
               filled, which would let them trigger a code-to-someone-
               else's-inbox flow. */
            name="vocaband-student-otp-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
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
                {s.sendingCode}
              </>
            ) : (
              <>
                <Mail size={16} />
                {s.sendMe6Digit}
              </>
            )}
          </button>
          <p className="mt-3 text-[11px] text-stone-500 text-center leading-relaxed">
            {s.weWillSend}
          </p>
        </form>
      )}

      {showCodeForm && (
        <form onSubmit={handleVerifyCode}>
          <p className="text-sm text-stone-600 mb-3 break-words">
            {s.weSent6Digit(otp.email ?? '')}
          </p>
          <label htmlFor="student-otp-code" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
            {s.enterCode}
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
                {s.checkingCode}
              </>
            ) : otp.stage === "done" ? (
              <>
                <CheckCircle2 size={16} />
                {s.signingIn}
              </>
            ) : (
              <>{s.signIn}</>
            )}
          </button>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-stone-500">
            <button
              type="button"
              onClick={() => { otp.reset(); setCodeInput(""); }}
              className="font-bold hover:text-stone-900 transition-colors"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              {s.useDifferentEmail}
            </button>
            <button
              type="button"
              onClick={() => otp.resend()}
              disabled={otp.resendInSeconds > RESEND_LABEL_THRESHOLD || otp.stage === "verifying"}
              className="font-bold hover:text-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              {otp.resendInSeconds > 0 ? s.resendIn(otp.resendInSeconds) : s.resendCode}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
