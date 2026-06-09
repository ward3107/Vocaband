import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Auth/session state for the whole app. Self-serve: any Google / email
// magic-link sign-in works and creates the account on first use — VocaBagrut
// does not use the main app's teacher_allowlist.
interface SessionState {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <SessionContext.Provider value={{ session, loading, configured: isSupabaseConfigured, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = (): SessionState => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
