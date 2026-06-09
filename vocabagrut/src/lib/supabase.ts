import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// VocaBagrut reuses the main Vocaband Supabase project for teacher identity
// and AI-usage metering (it can later be pointed at its own project by
// swapping these env vars). The anon/publishable key is safe in the browser
// — every table is protected by RLS.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anon);

// Null when env is missing (e.g. a preview deploy before secrets are set);
// the app then shows a "sign-in not configured" notice instead of crashing.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Bearer header for calling our own /api routes as the logged-in teacher. */
export async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
