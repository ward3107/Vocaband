import React from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../core/supabase';

export type OAuthProvider = 'google' | 'azure';

interface OAuthButtonProps {
  onSuccess: (email: string, isNewUser: boolean) => void;
  onError: (error: string) => void;
  loading?: boolean;
  /** Which identity provider to use. Defaults to Google to keep
   *  existing call sites unchanged. Microsoft (azure) covers MoE
   *  @edu.gov.il accounts plus any Outlook/Hotmail/Microsoft 365. */
  provider?: OAuthProvider;
  /** Override the visible button label. Defaults to a per-provider label. */
  label?: string;
  /** Runs synchronously right before the OAuth redirect starts.
   * Use for persisting intent (e.g. class-code to switch to) to sessionStorage
   * so the app can read it back after the OAuth round-trip. */
  beforeSignIn?: () => void;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({
  onSuccess: _onSuccess,
  onError,
  loading = false,
  provider = 'google',
  label,
  beforeSignIn,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      beforeSignIn?.();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Google-only: ask for offline access + force consent so we
          // can refresh the session.  Azure ignores these params.
          ...(provider === 'google'
            ? { queryParams: { access_type: 'offline', prompt: 'consent' } }
            : { scopes: 'email openid profile' }),
        },
      });

      if (error) throw error;
      // Redirect happens automatically
    } catch (error) {
      console.error('OAuth error:', error);
      onError(
        provider === 'azure'
          ? 'Could not sign in with Microsoft. Please try again.'
          : 'Could not sign in with Google. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const defaultLabel =
    provider === 'azure' ? 'Sign in with Microsoft' : 'Sign in with Google';

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading || loading}
      className="w-full bg-white text-stone-800 py-4 rounded-xl text-lg font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mb-4 border-2 border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading || loading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Connecting...
        </>
      ) : provider === 'azure' ? (
        <>
          <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
            <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
          </svg>
          {label ?? defaultLabel}
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {label ?? defaultLabel}
        </>
      )}
    </button>
  );
};

export default OAuthButton;
