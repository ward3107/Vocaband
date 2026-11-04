// Keep Storage URLs aligned with the Supabase client when build-time VITE_*
// values are blank. The custom domain also serves /storage/v1/ assets.
const FALLBACK_SUPABASE_URL = 'https://auth.vocaband.com';

export function getPublicSupabaseUrl(): string {
  const configured = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return (configured?.trim() || FALLBACK_SUPABASE_URL).replace(/\/+$/, '');
}
