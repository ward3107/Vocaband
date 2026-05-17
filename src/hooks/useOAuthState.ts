import { useState } from "react";

export type PendingClassSwitch = {
  fromCode: string;
  fromClassName: string | null;
  toCode: string;
  toClassName: string | null;
  supabaseUser: { id: string; email?: string | null };
};

/**
 * Bundles the post-OAuth + class-switch state that App.tsx threads
 * through useOAuthFlow / useClassSwitch / useAuthRestore.
 *
 * - `classNotFoundIntent`: sticky banner when a student typed a class
 *   code that doesn't exist (toasts get dismissed; this stays visible).
 *   Funnels both the OAuth path and the session-restore path.
 * - `pendingClassSwitch`: set when an already-approved student logs in
 *   with a class code that differs from their current one — drives the
 *   class-switch confirmation modal.
 */
export function useOAuthState() {
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [oauthAuthUid, setOauthAuthUid] = useState<string | null>(null);
  const [showOAuthClassCode, setShowOAuthClassCode] = useState(false);
  const [classNotFoundIntent, setClassNotFoundIntent] = useState<string | null>(null);
  const [pendingClassSwitch, setPendingClassSwitch] = useState<PendingClassSwitch | null>(null);

  return {
    isOAuthCallback, setIsOAuthCallback,
    oauthEmail, setOauthEmail,
    oauthAuthUid, setOauthAuthUid,
    showOAuthClassCode, setShowOAuthClassCode,
    classNotFoundIntent, setClassNotFoundIntent,
    pendingClassSwitch, setPendingClassSwitch,
  };
}
