/**
 * GameMusicPlayer — compact background-music control bar for live host
 * screens (Category Race, Speed Round).
 *
 * Self-contained: owns its Howl instance, play/pause state, current track
 * and volume — so a host view can render it with no wiring. The teacher
 * can play / pause, skip tracks forward & back, and lower / mute the
 * volume with a slider (or the mouse wheel over it) from the front of the
 * room. Track + volume persist in localStorage and are shared with the
 * Quick Play monitor so the room's "house music" feels continuous across
 * game modes.
 *
 * The instrumental loops live in public/game-music/ and are served from
 * the same origin (see getMusicUrl). iOS only starts audio after a user
 * gesture — the Play button is that gesture, so nothing autoplays.
 */
import { useEffect, useRef, useState, type WheelEvent } from "react";
import { Howl } from "howler";
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";

// Instrumental background loops in public/game-music/. Mirrors the Quick
// Play monitor list so the teacher gets the same library everywhere.
const MUSIC_TRACKS = [
  { name: "Steady Focus", icon: "🎯", file: "bgm-steady-focus" },
  { name: "Upbeat Energy", icon: "⚡", file: "bgm-upbeat-energy" },
  { name: "Chill Vibes", icon: "🌊", file: "bgm-chill-vibes" },
  { name: "Adventure Quest", icon: "🗺️", file: "bgm-adventure-quest" },
  { name: "Funky Groove", icon: "🎸", file: "bgm-funky-groove" },
  { name: "Space Explorer", icon: "🚀", file: "bgm-space-explorer" },
  { name: "Victory March", icon: "🏆", file: "bgm-victory-march" },
  { name: "Steady Gains", icon: "📈", file: "bgm-steady-gains" },
  { name: "Clear The Lane", icon: "🏀", file: "bgm-clear-the-lane" },
  { name: "Watch It Ignite", icon: "🔥", file: "bgm-watch-it-ignite" },
  { name: "Victory Lap", icon: "🏁", file: "bgm-victory-lap" },
  { name: "Kinetic Lock", icon: "🔒", file: "bgm-kinetic-lock" },
];

// Same-origin path; the Worker serves public/game-music/ directly. (The R2
// audio CDN only carries word-pronunciation buckets, so routing music
// there 404s — keep it local.)
const getMusicUrl = (file: string): string => `/game-music/${file}.mp3`;

const AUTO_SHUFFLE_MS = 2 * 60 * 1000; // swap tracks every 2 min so the loop doesn't go stale

const STRINGS = {
  en: { label: "Background Music", prev: "Previous track", next: "Next track", play: "Play", pause: "Pause", volume: "Background music volume" },
  he: { label: "מוזיקת רקע", prev: "רצועה קודמת", next: "רצועה הבאה", play: "נגן", pause: "השהה", volume: "עוצמת מוזיקת רקע" },
  ar: { label: "موسيقى الخلفية", prev: "المقطع السابق", next: "المقطع التالي", play: "تشغيل", pause: "إيقاف مؤقت", volume: "مستوى صوت الموسيقى" },
} as const;

interface GameMusicPlayerProps {
  language: Language;
}

export default function GameMusicPlayer({ language }: GameMusicPlayerProps) {
  const tr = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(() => {
    try { return parseInt(localStorage.getItem("vocaband-music-track") || "0") || 0; } catch { return 0; }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("vocaband-music-volume") || "0.5") || 0.5; } catch { return 0.5; }
  });
  const musicRef = useRef<Howl | null>(null);

  const toggleMusic = () => {
    if (musicPlaying && musicRef.current) {
      musicRef.current.fade(musicVolume, 0, 300);
      setTimeout(() => {
        musicRef.current?.pause();
        musicRef.current?.volume(musicVolume);
        setMusicPlaying(false);
      }, 300);
    } else {
      if (!musicRef.current) {
        musicRef.current = new Howl({
          src: [getMusicUrl(MUSIC_TRACKS[currentTrack].file)],
          volume: 0,
          loop: true,
          onloaderror: () => console.warn(`[GameMusicPlayer] music load failed: ${MUSIC_TRACKS[currentTrack].file}`),
        });
      }
      musicRef.current.play();
      musicRef.current.fade(0, musicVolume, 500);
      setMusicPlaying(true);
    }
  };

  const changeTrack = (idx: number) => {
    setCurrentTrack(idx);
    try { localStorage.setItem("vocaband-music-track", String(idx)); } catch { /* best-effort */ }

    // Crossfade: fade the old loop out, start the new one.
    if (musicRef.current) {
      const old = musicRef.current;
      old.fade(musicVolume, 0, 500);
      setTimeout(() => { old.stop(); old.unload(); }, 500);
    }
    const newTrack = new Howl({
      src: [getMusicUrl(MUSIC_TRACKS[idx].file)],
      volume: 0,
      loop: true,
      onloaderror: () => console.warn(`[GameMusicPlayer] music load failed: ${MUSIC_TRACKS[idx].file}`),
    });
    musicRef.current = newTrack;
    if (musicPlaying) {
      newTrack.play();
      newTrack.fade(0, musicVolume, 500);
    }
  };

  // Live volume + persistence.
  useEffect(() => {
    if (musicRef.current) musicRef.current.volume(musicVolume);
    try { localStorage.setItem("vocaband-music-volume", String(musicVolume)); } catch { /* best-effort */ }
  }, [musicVolume]);

  // Stop + free the audio when the host screen unmounts.
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.stop();
        musicRef.current.unload();
      }
    };
  }, []);

  // Auto-shuffle to a different random track every 2 min while playing.
  useEffect(() => {
    if (!musicPlaying) return;
    const id = setInterval(() => {
      if (MUSIC_TRACKS.length < 2) return;
      let next = currentTrack;
      while (next === currentTrack) next = Math.floor(Math.random() * MUSIC_TRACKS.length);
      changeTrack(next);
    }, AUTO_SHUFFLE_MS);
    return () => clearInterval(id);
    // changeTrack is stable for our purposes (ref-driven) — gate only on
    // the shuffle conditions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicPlaying, currentTrack]);

  const handleVolumeWheel = (e: WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setMusicVolume(prev => Math.max(0, Math.min(1, prev + delta)));
  };

  const track = MUSIC_TRACKS[currentTrack];

  return (
    <div className="flex items-center gap-2 w-full rounded-xl px-3 py-2 mb-5 bg-[var(--vb-surface)] border border-[var(--vb-border)] shadow-sm">
      {/* Now playing */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg shrink-0">{track.icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold truncate text-[var(--vb-text-primary)]">{track.name}</p>
          <p className="text-[9px] opacity-50 text-[var(--vb-text-primary)]">{tr.label}</p>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => changeTrack((currentTrack - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length)}
          className="p-1.5 rounded-full text-[var(--vb-text-primary)] opacity-60 hover:opacity-100 transition-opacity"
          style={{ touchAction: "manipulation" }}
          title={tr.prev}
          aria-label={tr.prev}
        >
          <SkipBack size={14} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={toggleMusic}
          className={`p-2 rounded-full text-white transition-all active:scale-90 ${
            musicPlaying ? "bg-fuchsia-500/80 shadow-inner" : "bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-md"
          }`}
          style={{ touchAction: "manipulation" }}
          title={musicPlaying ? tr.pause : tr.play}
          aria-label={musicPlaying ? tr.pause : tr.play}
        >
          {musicPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={() => changeTrack((currentTrack + 1) % MUSIC_TRACKS.length)}
          className="p-1.5 rounded-full text-[var(--vb-text-primary)] opacity-60 hover:opacity-100 transition-opacity"
          style={{ touchAction: "manipulation" }}
          title={tr.next}
          aria-label={tr.next}
        >
          <SkipForward size={14} fill="currentColor" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setMusicVolume(v => (v === 0 ? 0.5 : 0))}
          className="text-[var(--vb-text-primary)] opacity-60 hover:opacity-100 transition-opacity"
          style={{ touchAction: "manipulation" }}
          aria-label={tr.volume}
        >
          {musicVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          name="gameMusicVolume"
          aria-label={tr.volume}
          min="0"
          max="1"
          step="0.05"
          value={musicVolume}
          onChange={e => setMusicVolume(parseFloat(e.target.value))}
          onWheel={handleVolumeWheel}
          className="w-14 sm:w-20 h-1.5 accent-fuchsia-500 cursor-pointer"
          title={`Volume: ${Math.round(musicVolume * 100)}% — scroll to adjust`}
        />
      </div>
    </div>
  );
}
