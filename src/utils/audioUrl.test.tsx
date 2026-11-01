import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOTIVATIONAL_AUDIO_KEYS } from '../hooks/useAudio';
import { getMotivationalAudioUrl, getWordAudioUrl } from './audioUrl';

afterEach(() => vi.unstubAllEnvs());

describe('audio source routing', () => {
  it('keeps bundled pronunciation on R2 when the CDN is configured', () => {
    vi.stubEnv('VITE_CLOUDFLARE_URL', 'https://audio.vocaband.com/');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://storage.example.supabase.co/');
    expect(getWordAudioUrl(1)).toBe('https://audio.vocaband.com/sound/1.mp3');
    expect(getWordAudioUrl(9130)).toBe('https://audio.vocaband.com/sound/9130.mp3');
    expect(getWordAudioUrl(42, 'he')).toBe('https://audio.vocaband.com/sound-hebrew/42.mp3');
  });

  it('reads negative and timestamp custom IDs from the upload destination', () => {
    vi.stubEnv('VITE_CLOUDFLARE_URL', 'https://audio.vocaband.com');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://storage.example.supabase.co/');
    expect(getWordAudioUrl(-1_800_000_000_000)).toBe(
      'https://storage.example.supabase.co/storage/v1/object/public/sound/-1800000000000.mp3',
    );
    expect(getWordAudioUrl(1_800_000_000_000)).toBe(
      'https://storage.example.supabase.co/storage/v1/object/public/sound/1800000000000.mp3',
    );
  });

  it('uses Supabase for bundled words when no CDN is configured', () => {
    vi.stubEnv('VITE_CLOUDFLARE_URL', '');
    vi.stubEnv('VITE_CLOUDFRONT_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://storage.example.supabase.co');
    expect(getWordAudioUrl(1)).toBe(
      'https://storage.example.supabase.co/storage/v1/object/public/sound/1.mp3',
    );
  });

  it('uses the same public Supabase fallback as the app when build env is blank', () => {
    vi.stubEnv('VITE_CLOUDFLARE_URL', 'https://audio.vocaband.com');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(getWordAudioUrl(-123456789)).toBe(
      'https://auth.vocaband.com/storage/v1/object/public/sound/-123456789.mp3',
    );
  });

  it('only selects encouragement clips shipped on the website', () => {
    vi.stubEnv('VITE_CLOUDFLARE_URL', 'https://audio.vocaband.com');
    expect(getMotivationalAudioUrl('great-job')).toBe('/motivational/great-job.mp3');
    const shippedKeys = readdirSync(join(process.cwd(), 'public', 'motivational'))
      .filter(name => name.endsWith('.mp3'))
      .map(name => name.slice(0, -4))
      .sort();
    expect([...MOTIVATIONAL_AUDIO_KEYS].sort()).toEqual(shippedKeys);
  });
});
