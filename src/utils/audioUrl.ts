// Word-audio URL resolver. Single source of truth for both the in-app
// player (useAudio.ts) and the printable QR-code resources
// (FreeResourcesView.tsx) — keeps them from drifting.
//
// Curriculum words use R2 when configured. Custom-word MP3s are generated
// into Supabase Storage, so their URLs must always point to Supabase.
import { getPublicSupabaseUrl } from '../core/supabasePublicUrl';

export type AudioLang = 'en' | 'he';

/** Cloudflare bucket for English word audio (and any custom-word
 * upload that pre-dated the Hebrew lemma split). */
const EN_BUCKET = 'sound';

/** Cloudflare bucket for Hebrew lemma audio. The bucket exists but
 * may be empty until the Hebrew TTS pipeline ships; useAudio.ts
 * gracefully falls back to browser SpeechSynthesis when 404. */
const HE_BUCKET = 'sound-hebrew';

// Custom IDs are generated as negative timestamps or positive Date.now()
// values. Bundled vocabulary IDs are small positive integers (currently
// below 10,000). Keep a generous gap so future bundled sets stay on R2.
export const isCustomWordAudioId = (wordId: number): boolean =>
  wordId < 0 || wordId >= 1_000_000;

/** Praise clips ship with the website in public/motivational/. */
export const getMotivationalAudioUrl = (key: string): string =>
  `/motivational/${key}.mp3`;

export function getWordAudioUrl(wordId: number, lang: AudioLang = 'en'): string {
  const bucket = lang === 'he' ? HE_BUCKET : EN_BUCKET;
  // Legacy `VITE_CLOUDFRONT_URL` kept for backward compat with old
  // build configs; new deployments should use VITE_CLOUDFLARE_URL.
  const cdn =
    (import.meta.env.VITE_CLOUDFLARE_URL as string | undefined) ||
    (import.meta.env.VITE_CLOUDFRONT_URL as string | undefined);
  if (cdn && cdn.trim().length > 0 && !isCustomWordAudioId(wordId)) {
    return `${cdn.trim().replace(/\/+$/, '')}/${bucket}/${wordId}.mp3`;
  }
  const base = getPublicSupabaseUrl();
  return `${base}/storage/v1/object/public/${bucket}/${wordId}.mp3`;
}
