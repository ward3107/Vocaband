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
import { motion, useMotionValue, useDragControls } from "motion/react";
import { Howl } from "howler";
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Music, Minimize2, GripVertical } from "lucide-react";
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
  en: { label: "Background Music", prev: "Previous track", next: "Next track", play: "Play", pause: "Pause", volume: "Background music volume", collapse: "Minimize music", drag: "Drag to move" },
  he: { label: "מוזיקת רקע", prev: "רצועה קודמת", next: "רצועה הבאה", play: "נגן", pause: "השהה", volume: "עוצמת מוזיקת רקע", collapse: "מזער נגן", drag: "גרור כדי להזיז" },
  ar: { label: "موسيقى الخلفية", prev: "المقطع السابق", next: "المقطع التالي", play: "تشغيل", pause: "إيقاف مؤقت", volume: "مستوى صوت الموسيقى", collapse: "تصغير المشغل", drag: "اسحب للتحريك" },
} as const;

// Persisted drag offset for the floating dock (shared across all live games
// so the teacher's chosen corner sticks everywhere).
const num = (key: string, fallback: number): number => {
  try { const v = parseFloat(localStorage.getItem(key) ?? ""); return Number.isFinite(v) ? v : fallback; }
  catch { return fallback; }
};

// Accent theme. Category Race / Speed Round use the brand fuchsia; Word
// Hunt Arena asked for a calmer, grayer look — same bar, slate accents.
type MusicTheme = "fuchsia" | "slate";

const THEMES: Record<MusicTheme, { playIdle: string; playActive: string; slider: string }> = {
  fuchsia: {
    playIdle: "bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-md",
    playActive: "bg-fuchsia-500/80 shadow-inner",
    slider: "accent-fuchsia-500",
  },
  slate: {
    playIdle: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-md",
    playActive: "bg-slate-500/80 shadow-inner",
    slider: "accent-slate-500",
  },
};

interface GameMusicPlayerProps {
  language: Language;
  /** Accent color. Defaults to the brand fuchsia used by the other hosts. */
  theme?: MusicTheme;
  /** Presentation mode — instead of the inline bar, dock the player as a
   *  compact, collapsible pill in the top-end corner so the projector stays
   *  clean but the music keeps playing and the teacher keeps control. The
   *  component stays mounted across the lobby→present switch, so the audio
   *  never cuts out (the old `{!presenting && …}` gate unmounted it, which
   *  is exactly why music "stopped" when a game started). */
  floating?: boolean;
}

export default function GameMusicPlayer({ language, theme = "fuchsia", floating = false }: GameMusicPlayerProps) {
  const tr = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  const accent = THEMES[theme];

  // Floating dock starts EXPANDED so the teacher can see the music control the
  // moment a game enters presentation mode (a collapsed pill was too easy to
  // miss — teachers thought the player had disappeared). They can minimize it
  // to a corner button to keep the projected board clean.
  const [expanded, setExpanded] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(() => {
    try { return parseInt(localStorage.getItem("vocaband-music-track") || "0") || 0; } catch { return 0; }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("vocaband-music-volume") || "0.5") || 0.5; } catch { return 0.5; }
  });
  const musicRef = useRef<Howl | null>(null);

  // Draggable floating dock: teacher can grab it (by the grip when expanded,
  // or anywhere on the collapsed pill) and park it anywhere on screen. Offset
  // from the top-end anchor, persisted so it stays put across games/sessions.
  const dockX = useMotionValue(num("vocaband-music-dock-x", 0));
  const dockY = useMotionValue(num("vocaband-music-dock-y", 0));
  const dragControls = useDragControls();
  const persistDock = () => {
    try {
      localStorage.setItem("vocaband-music-dock-x", String(dockX.get()));
      localStorage.setItem("vocaband-music-dock-y", String(dockY.get()));
    } catch { /* storage blocked */ }
  };

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

  const bar = (
    <>
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
            musicPlaying ? accent.playActive : accent.playIdle
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
          className={`w-14 sm:w-20 h-1.5 cursor-pointer ${accent.slider}`}
          title={`Volume: ${Math.round(musicVolume * 100)}% — scroll to adjust`}
        />
      </div>
    </>
  );

  // Presentation mode: a corner dock. Collapsed = one round button (pulses
  // while playing); expanded = the full transport pill. Kept mounted either
  // way so the audio rides through the lobby→present switch.
  if (floating) {
    // One draggable container for both states. When expanded, only the grip
    // handle starts a drag (dragListener=false) so the volume slider and
    // transport buttons work normally; when collapsed, the whole pill is the
    // drag surface (a tap still toggles it open — motion separates tap/drag).
    return (
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={!expanded}
        dragMomentum={false}
        style={{ x: dockX, y: dockY }}
        onDragEnd={persistDock}
        className="fixed top-4 end-4 z-40 touch-none"
      >
        {expanded ? (
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2 w-[min(92vw,340px)] bg-[var(--vb-surface)] border border-[var(--vb-border)] shadow-xl">
            <div
              onPointerDown={e => dragControls.start(e)}
              className="cursor-grab active:cursor-grabbing text-[var(--vb-text-primary)] opacity-40 hover:opacity-80 transition-opacity shrink-0"
              style={{ touchAction: "none" }}
              title={tr.drag}
              aria-label={tr.drag}
            >
              <GripVertical size={16} />
            </div>
            {bar}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-full text-[var(--vb-text-primary)] opacity-60 hover:opacity-100 transition-opacity shrink-0"
              style={{ touchAction: "manipulation" }}
              title={tr.collapse}
              aria-label={tr.collapse}
            >
              <Minimize2 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-grab active:cursor-grabbing ${
              musicPlaying ? `${accent.playIdle} animate-pulse` : accent.playIdle
            }`}
            style={{ touchAction: "none" }}
            title={tr.label}
            aria-label={tr.label}
          >
            <Music size={20} fill={musicPlaying ? "currentColor" : "none"} />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full rounded-xl px-3 py-2 mb-5 bg-[var(--vb-surface)] border border-[var(--vb-border)] shadow-sm">
      {bar}
    </div>
  );
}
