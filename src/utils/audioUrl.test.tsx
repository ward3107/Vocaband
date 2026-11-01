import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOTIVATIONAL_AUDIO_KEYS, useAudio } from '../hooks/useAudio';
import { getMotivationalAudioUrl, getWordAudioUrl } from './audioUrl';

const audioMock = vi.hoisted(() => ({
  instances: [] as Array<{ playCount: number; unloadCount: number }>,
  failNextPlay: false,
}));

vi.mock('../hooks/useEffectiveConnection', () => ({ isSlowConnection: () => false }));
vi.mock('howler', () => ({
  Howl: class {
    playCount = 0;
    unloadCount = 0;
    private listeners = new Map<string, () => void>();
    constructor(private options: { onplayerror?: () => void }) {
      audioMock.instances.push(this);
    }
    off(event: string) { this.listeners.delete(event); }
    on(event: string, callback: () => void) { this.listeners.set(event, callback); }
    once(event: string, callback: () => void) { this.on(event, callback); }
    rate() { return 1; }
    state() { return 'loaded'; }
    playing() { return false; }
    stop() { return this; }
    unload() { this.unloadCount++; return this; }
    play() {
      this.playCount++;
      if (audioMock.failNextPlay) {
        audioMock.failNextPlay = false;
        this.options.onplayerror?.();
        this.listeners.get('playerror')?.();
      }
      return 1;
    }
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  audioMock.instances.length = 0;
  audioMock.failNextPlay = false;
});

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

describe('recorded word playback', () => {
  it('retries a bundled MP3 after a transient play error instead of silencing later taps', async () => {
    const speakTTS = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(public text: string) {}
    });
    vi.stubGlobal('speechSynthesis', {
      addEventListener: vi.fn(), getVoices: () => [], cancel: vi.fn(), speak: speakTTS,
    });
    const realNow = Date.now.bind(Date);
    let clockOffset = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => realNow() + clockOffset);

    audioMock.failNextPlay = true;
    const { result } = renderHook(() => useAudio());
    act(() => result.current.speak(1, 'hello'));
    await waitFor(() => expect(speakTTS).toHaveBeenCalledTimes(1));
    expect(audioMock.instances[0].unloadCount).toBe(1);

    clockOffset += 1_000; // A deliberate second tap, past the same-word debounce.
    act(() => result.current.speak(1, 'hello'));
    await waitFor(() => expect(audioMock.instances).toHaveLength(2));
    expect(audioMock.instances[1].playCount).toBe(1);
    expect(speakTTS).toHaveBeenCalledTimes(1);
  });
});
