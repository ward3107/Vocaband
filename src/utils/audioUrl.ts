// Word-audio URL resolver. Single source of truth for both the in-app
// player (useAudio.ts) and the printable QR-code resources
// (FreeResourcesView.tsx) — keeps them from drifting.
//
// Strategy: prefer Cloudflare R2 + CDN when VITE_CLOUDFLARE_URL is set
// (faster + cheaper at scale), fall back to Supabase Storage so the
// app keeps working before the bucket is provisioned. Both sources
// expose the same path layout (`<bucket>/<id>.mp3`), so flipping the
// env var is a no-op for callers.

export type AudioLang = 'en' | 'he';

/** Cloudflare bucket for English word audio (and any custom-word
 * upload that pre-dated the Hebrew lemma split). */
const EN_BUCKET = 'sound';

/** Cloudflare bucket for Hebrew lemma audio. The bucket exists but
 * may be empty until the Hebrew TTS pipeline ships; useAudio.ts
 * gracefully falls back to browser SpeechSynthesis when 404. */
const HE_BUCKET = 'sound-hebrew';

export function getWordAudioUrl(wordId: number, lang: AudioLang = 'en'): string {
  const bucket = lang === 'he' ? HE_BUCKET : EN_BUCKET;
  // Legacy `VITE_CLOUDFRONT_URL` kept for backward compat with old
  // build configs; new deployments should use VITE_CLOUDFLARE_URL.
  const cdn =
    (import.meta.env.VITE_CLOUDFLARE_URL as string | undefined) ||
    (import.meta.env.VITE_CLOUDFRONT_URL as string | undefined);
  if (cdn && cdn.length > 0) {
    return `${cdn}/${bucket}/${wordId}.mp3`;
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  return `${base}/storage/v1/object/public/${bucket}/${wordId}.mp3`;
}
