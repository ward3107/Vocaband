/**
 * TeacherLoginCard — the actual sign-in card.
 *
 * Two-pane layout:
 *  - Left (md+): brand pitch — animated V mark, welcome headline,
 *    floating mini cards, trust strip.  Hidden on mobile so the form
 *    keeps full width on phones.
 *  - Right: the form.  Two paths share it:
 *      1. "Sign in with Google" (dominant — most teachers)
 *      2. Microsoft fallback (small text link below)
 *      3. Email + 6-digit OTP code (shared classroom PCs)
 *
 * Self-contained: owns its state via useTeacherOtpAuth, calls
 * supabase.auth.signInWithOAuth directly for the Google path.  No
 * App.tsx state or props consumed -- just an `onCancel` callback so
 * the parent can pop the user back to the landing page.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowLeft, Loader2, AlertTriangle, MapPin, ShieldCheck, BookOpen, Gamepad2, Trophy, Flame, Gift } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { teacherLoginT } from "../locales/student/teacher-login";
import { useTeacherOtpAuth } from "../hooks/useTeacherOtpAuth";
import { writeIntendedRole } from "../utils/oauthIntent";
import { Turnstile, isTurnstileEnabled, turnstileSiteKey } from "./Turnstile";

interface TeacherLoginCardProps {
  /** Optional close-button hook, e.g. to navigate back to the
   *  landing page when the teacher backs out of the form. */
  onCancel?: () => void;
}

export default function TeacherLoginCard({ onCancel }: TeacherLoginCardProps) {
  const { language, dir } = useLanguage();
  const tt = teacherLoginT[language];
  const otp = useTeacherOtpAuth();

  // "Remember my email on this device" — opt-in, OFF by default.
  // The previous always-on browser-autofill behavior leaked the
  // previous teacher's email on shared classroom PCs (reported
  // 2026-04-30).  The opt-in checkbox lets teachers on personal
  // devices benefit from the convenience while keeping shared PCs
  // safe by default.
  const REMEMBER_FLAG_KEY = "vocaband_teacher_remember_email";
  const REMEMBER_EMAIL_KEY = "vocaband_teacher_saved_email";

  const initialRemembered = (() => {
    try {
      if (typeof window === "undefined") return { remember: false, email: "" };
      const remember = localStorage.getItem(REMEMBER_FLAG_KEY) === "true";
      const email = remember ? (localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "") : "";
      return { remember, email };
    } catch {
      return { remember: false, email: "" };
    }
  })();

  // Local form state -- the hook owns auth state, this owns input state.
  const [emailInput, setEmailInput] = useState(initialRemembered.email);
  const [rememberEmail, setRememberEmail] = useState(initialRemembered.remember);
  const [codeInput, setCodeInput] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [microsoftSubmitting, setMicrosoftSubmitting] = useState(false);

  // Cloudflare Turnstile token.  Only relevant when CAPTCHA protection
  // is enabled in Supabase Auth (dashboard → Bot and Abuse Protection).
  // The widget (rendered below in the email form) sets this on solve
  // and clears it on expiry.  An empty string with the env key
  // configured means "not yet solved" — submit is gated.  When the
  // env key is absent (dev / local), the gate is skipped.
  const captchaEnabled = isTurnstileEnabled();
  const [captchaToken, setCaptchaToken] = useState("");

  const handleGoogle = async () => {
    if (googleSubmitting) return;
    setGoogleSubmitting(true);
    try {
      writeIntendedRole("teacher");
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
    } catch (err) {
      console.warn("[teacher-login] google OAuth failed:", err);
      setGoogleSubmitting(false);
    }
  };

  const handleMicrosoft = async () => {
    if (microsoftSubmitting) return;
    setMicrosoftSubmitting(true);
    try {
      writeIntendedRole("teacher");
      await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
          scopes: "email openid profile",
        },
      });
    } catch (err) {
      console.warn("[teacher-login] microsoft OAuth failed:", err);
      setMicrosoftSubmitting(false);
    }
  };

  const onSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.stage === "sending") return;
    if (captchaEnabled && !captchaToken) return;
    try {
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_FLAG_KEY, "true");
        localStorage.setItem(REMEMBER_EMAIL_KEY, emailInput.trim().toLowerCase());
      } else {
        localStorage.removeItem(REMEMBER_FLAG_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch { /* ignore quota / private-mode errors */ }
    writeIntendedRole("teacher");
    void otp.sendCode(emailInput, captchaEnabled ? captchaToken : undefined);
  };

  const onSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.stage === "verifying") return;
    void otp.verifyCode(codeInput);
  };

  const showEmailForm = otp.stage === "idle" || otp.stage === "sending" || otp.stage === "error-send";
  const showCodeForm =
    otp.stage === "awaiting-code" || otp.stage === "verifying" || otp.stage === "error-verify" || otp.stage === "done";

  // Floating mini cards on the brand pane — abstract product hint
  // (matches the hero's "floating cards" pattern so login feels like
  // an extension of the landing page, not a separate experience).
  const miniCards = [
    { icon: <Gamepad2 size={20} />, color: "from-violet-500 to-purple-600", delay: 0 },
    { icon: <Trophy size={20} />,   color: "from-blue-500 to-cyan-500",     delay: 0.2 },
    { icon: <Flame size={20} />,    color: "from-amber-500 to-orange-500",  delay: 0.4 },
    { icon: <Gift size={20} />,     color: "from-emerald-500 to-teal-500",  delay: 0.6 },
  ];

  return (
    <div
      dir={dir}
      className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2 bg-white border border-stone-200 relative"
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back"
          className={`absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"} z-30 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900 shadow-sm flex items-center justify-center transition-colors`}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
        >
          <ArrowLeft size={18} className={dir === "rtl" ? "rotate-180" : ""} />
        </button>
      )}

      {/* ── LEFT PANE — Brand pitch (md+ only) ────────────────────── */}
      <div className="hidden md:flex relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-10 flex-col justify-between text-white overflow-hidden">
        {/* Animated gradient mesh blobs (subtle texture) */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-fuchsia-400/40 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -45, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-violet-400/40 blur-3xl pointer-events-none"
        />

        {/* Top: animated V logo */}
        <div className="relative z-10">
          <motion.div
            animate={{ rotateY: [0, 12, 0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-2xl shadow-black/20 mb-6"
          >
            <span className="text-white text-5xl font-black font-headline italic drop-shadow-lg">V</span>
          </motion.div>

          <h2 className="text-3xl lg:text-4xl font-black font-headline mb-3 leading-tight tracking-tight">
            {tt.welcomeHeading}
          </h2>
          <p className="text-white/85 font-bold text-sm lg:text-base leading-relaxed max-w-sm">
            {tt.welcomeSubtitle}
          </p>
        </div>

        {/* Middle: floating mini cards (product hint) */}
        <div className="relative z-10 flex justify-center gap-3 my-6">
          {miniCards.map((c, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-xl shadow-black/30 border border-white/20`}
            >
              {c.icon}
            </motion.div>
          ))}
        </div>

        {/* Bottom: trust chips */}
        <div className="relative z-10 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-[10px] font-black uppercase tracking-wider">
            <MapPin size={11} aria-hidden="true" />
            {tt.trustOrigin}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck size={11} aria-hidden="true" />
            {tt.trustEu}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-[10px] font-black uppercase tracking-wider">
            <BookOpen size={11} aria-hidden="true" />
            {tt.trustCurriculum}
          </span>
        </div>
      </div>

      {/* ── RIGHT PANE — Form ──────────────────────────────────────── */}
      <div className="bg-white p-6 sm:p-8 md:p-10 flex flex-col justify-center">
        {/* Mobile-only V logo (hidden on md+ since the left pane has the big one) */}
        <div className="md:hidden flex items-center justify-center mb-5">
          <motion.div
            animate={{ rotateY: [0, 12, 0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="w-12 h-12 rounded-xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <span className="text-white text-2xl font-black font-headline italic">V</span>
          </motion.div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-stone-900 text-center md:text-start mb-2 tracking-tight">
          {tt.heading}
        </h1>
        <p className="text-sm text-stone-500 font-medium text-center md:text-start mb-6">
          {tt.subtitleHint}
        </p>

        <AnimatePresence mode="wait">
          {/* ── EMAIL FORM (idle / sending / error-send) ──────────── */}
          {showEmailForm && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Google button — promoted as the dominant CTA.  Most
                  teachers in Israeli schools have Google Workspace
                  accounts so this should be the visually obvious
                  primary path.  Bigger padding, stronger shadow. */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleSubmitting}
                className="w-full inline-flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-stone-300 hover:border-primary hover:bg-stone-50 text-stone-900 font-black text-base transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {googleSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                )}
                <span>{tt.signInWithGoogle}</span>
              </button>

              {/* Microsoft sign-in — same visual treatment as Google so
                  teachers on Microsoft 365 / @edu.gov.il accounts see an
                  equally prominent path.  Same teacher_allowlist gate
                  applies after the OAuth redirect. */}
              <button
                type="button"
                onClick={handleMicrosoft}
                disabled={microsoftSubmitting}
                className="w-full mt-3 inline-flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-stone-300 hover:border-primary hover:bg-stone-50 text-stone-900 font-black text-base transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {microsoftSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 23 23" aria-hidden="true">
                    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                  </svg>
                )}
                <span>{tt.signInWithMicrosoft}</span>
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

                {/* Remember-me — opt-in convenience for teachers on personal
                    devices.  When checked, the email is saved to localStorage
                    and pre-filled on next visit.  Default OFF so shared
                    classroom PCs keep their existing safety.  See header
                    comment near REMEMBER_FLAG_KEY. */}
                <div className="mt-3 flex items-start gap-2">
                  <input
                    id="teacher-remember"
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-stone-300 accent-current cursor-pointer"
                    style={{ accentColor: "var(--vb-accent, #6366f1)" }}
                  />
                  <label htmlFor="teacher-remember" className="text-sm text-stone-700 leading-snug cursor-pointer select-none">
                    <span className="font-semibold">{tt.rememberMe}</span>
                    <span className="block text-xs text-stone-500">{tt.rememberMeHint}</span>
                  </label>
                </div>

                {/* Cloudflare Turnstile — only renders when VITE_TURNSTILE_SITE_KEY
                    is set at build time.  The widget is invisible-by-default
                    (managed mode) so most teachers never see a challenge,
                    but bots / Tor / suspicious IPs do.  Solved token is
                    forwarded to Supabase Auth via captchaToken. */}
                {captchaEnabled && (
                  <div className="mt-4">
                    <Turnstile
                      siteKey={turnstileSiteKey()}
                      onToken={(t) => setCaptchaToken(t)}
                      onExpired={() => setCaptchaToken("")}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    otp.stage === "sending" ||
                    emailInput.trim().length === 0 ||
                    (captchaEnabled && !captchaToken)
                  }
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
                      onClick={() => void otp.resend(captchaEnabled ? captchaToken : undefined)}
                      className="text-primary hover:underline font-semibold"
                      disabled={otp.stage === "verifying" || (captchaEnabled && !captchaToken)}
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
    </div>
  );
}
