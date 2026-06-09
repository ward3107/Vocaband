import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { supabase } from '../lib/supabase';

// Self-serve sign-in: Google OAuth or a passwordless email magic link.
// Signing in for the first time creates the teacher's account.
export default function LoginView() {
  const { language, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(t(language, 'login_error'));
  };

  const magicLink = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(t(language, 'login_error'));
    else setSent(true);
  };

  return (
    <div dir={dir} className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5">
        <div className="text-5xl">🎓</div>
        <h1 className="mt-3 text-2xl font-black text-slate-900">{t(language, 'login_title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t(language, 'login_subtitle')}</p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-5 font-semibold text-emerald-700">
            📧 {t(language, 'login_sent')}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={google}
              style={{ touchAction: 'manipulation' }}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.5 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.7 17.6 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.2-9.6 6.2-17z" />
                <path fill="#FBBC05" d="M10.3 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.6 2.1-7.9 2.1-6.4 0-11.8-4.2-13.7-9.9l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
              </svg>
              {t(language, 'login_google')}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t(language, 'login_or')}
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(language, 'login_email_label')}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={magicLink}
              disabled={busy || !email.trim()}
              style={{ touchAction: 'manipulation' }}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 font-bold text-white shadow-md shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? t(language, 'login_sending') : t(language, 'login_email_btn')}
            </button>

            <p className="mt-4 text-xs text-slate-400">{t(language, 'login_terms')}</p>
          </>
        )}

        {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
