// DraggableMusicPlayer — a floating, teacher-grabbable background-music
// widget for the live games that previously had no looping music
// (Speed Round, Hot Seat, Live Challenge, Wheel, Class Show).
//
// Why a shared widget: each live game used to roll its own (or no) music.
// This is the single control teachers learn once and use everywhere — full
// 12-track shuffle pool, play/pause, prev/next, volume, 2-minute auto-shuffle,
// and it can be dragged anywhere on screen so it never covers the action.
//
// Design notes:
//  • Plays on THIS device only (the teacher's projector/screen) — it never
//    touches student phones, same contract as the old QuickPlayMonitor player.
//  • Howl is loop:true with crossfades between tracks, mirroring the proven
//    QuickPlayMonitor behaviour.
//  • Position, chosen track and volume persist per-game via `storageKey` so a
//    teacher's layout sticks across sessions and games don't fight over the
//    same slot.
//  • Autoplay policies need a user gesture, so we never auto-start — the first
//    play is always the teacher tapping ▶.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue } from 'motion/react';
import { Howl } from 'howler';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, GripVertical, ChevronDown } from 'lucide-react';
import { MUSIC_TRACKS, getMusicUrl } from './musicTracks';

interface DraggableMusicPlayerProps {
  /** Namespace for persisted position/volume/track. Pass a per-game value
   *  (e.g. "speed-round") so each game keeps its own layout. */
  storageKey: string;
}

const AUTO_SHUFFLE_MS = 2 * 60 * 1000; // swap track every 2 min while playing

const num = (key: string, fallback: number): number => {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    return Number.isFinite(v) ? v : fallback;
  } catch { return fallback; }
};

export default function DraggableMusicPlayer({ storageKey }: DraggableMusicPlayerProps) {
  const ns = `vb-music-${storageKey}`;
  const [track, setTrack] = useState(() => {
    const i = Math.round(num(`${ns}-track`, 0));
    return i >= 0 && i < MUSIC_TRACKS.length ? i : 0;
  });
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(1, num(`${ns}-volume`, 0.5))));
  const [playing, setPlaying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const howlRef = useRef<Howl | null>(null);

  // Drag offset from the bottom-right anchor. Persisted on drag end.
  const x = useMotionValue(num(`${ns}-x`, 0));
  const y = useMotionValue(num(`${ns}-y`, 0));

  const persist = useCallback((key: string, val: number) => {
    try { localStorage.setItem(`${ns}-${key}`, String(val)); } catch { /* storage blocked */ }
  }, [ns]);

  // ── Transport ──────────────────────────────────────────────────────────────
  const toggle = () => {
    const h = howlRef.current;
    if (playing && h) {
      h.fade(volume, 0, 300);
      setTimeout(() => { h.pause(); h.volume(volume); }, 300);
      setPlaying(false);
      return;
    }
    if (!howlRef.current) {
      howlRef.current = new Howl({
        src: [getMusicUrl(MUSIC_TRACKS[track].file)],
        volume: 0, loop: true,
        onloaderror: () => console.warn(`[music] load failed: ${MUSIC_TRACKS[track].file}`),
      });
    }
    howlRef.current.play();
    howlRef.current.fade(0, volume, 500);
    setPlaying(true);
  };

  const changeTrack = useCallback((idx: number) => {
    const next = ((idx % MUSIC_TRACKS.length) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    setTrack(next);
    persist('track', next);
    const old = howlRef.current;
    if (old) { old.fade(volume, 0, 500); setTimeout(() => { old.stop(); old.unload(); }, 500); }
    const fresh = new Howl({
      src: [getMusicUrl(MUSIC_TRACKS[next].file)],
      volume: 0, loop: true,
      onloaderror: () => console.warn(`[music] load failed: ${MUSIC_TRACKS[next].file}`),
    });
    howlRef.current = fresh;
    if (playing) { fresh.play(); fresh.fade(0, volume, 500); }
  }, [playing, volume, persist]);

  // Live volume + persistence.
  useEffect(() => { howlRef.current?.volume(volume); persist('volume', volume); }, [volume, persist]);

  // Auto-shuffle while playing so the loop doesn't fade into background noise.
  useEffect(() => {
    if (!playing || MUSIC_TRACKS.length < 2) return;
    const id = setInterval(() => {
      let next = track;
      while (next === track) next = Math.floor(Math.random() * MUSIC_TRACKS.length);
      changeTrack(next);
    }, AUTO_SHUFFLE_MS);
    return () => clearInterval(id);
  }, [playing, track, changeTrack]);

  // Stop + free the Howl on unmount (leaving the game).
  useEffect(() => () => { howlRef.current?.stop(); howlRef.current?.unload(); }, []);

  const meta = MUSIC_TRACKS[track];

  // Portal to <body>: host views wrap themselves in motion.div transforms,
  // which would otherwise re-anchor our position:fixed to the transformed
  // ancestor instead of the viewport.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{ left: -window.innerWidth + 80, right: 24, top: -window.innerHeight + 120, bottom: 24 }}
      style={{ x, y }}
      onDragEnd={() => { persist('x', x.get()); persist('y', y.get()); }}
      className="fixed bottom-4 right-4 z-[60] select-none touch-none"
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Open music player"
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg shadow-indigo-500/30 text-white transition active:scale-90 ${
            playing ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 animate-pulse' : 'bg-stone-700'
          }`}
        >
          <Music size={20} />
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur shadow-xl shadow-indigo-500/20 border border-indigo-100 px-2.5 py-2">
          {/* Drag handle */}
          <div className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600" title="Drag to move">
            <GripVertical size={16} />
          </div>

          {/* Now playing */}
          <div className="flex items-center gap-1.5 min-w-0 w-28">
            <span className="text-lg shrink-0">{meta.icon}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-stone-800 truncate leading-tight">{meta.name}</p>
              <p className="text-[9px] text-stone-400 leading-tight">Background music</p>
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => changeTrack(track - 1)} title="Previous track"
              className="p-1.5 rounded-full text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 transition" style={{ touchAction: 'manipulation' }}>
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button type="button" onClick={toggle} title={playing ? 'Pause' : 'Play'}
              className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md transition active:scale-90" style={{ touchAction: 'manipulation' }}>
              {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
            <button type="button" onClick={() => changeTrack(track + 1)} title="Next track"
              className="p-1.5 rounded-full text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 transition" style={{ touchAction: 'manipulation' }}>
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-stone-400">{volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}</span>
            <input
              type="range" min={0} max={1} step={0.05} value={volume}
              aria-label="Music volume"
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-14 h-1.5 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Collapse */}
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse player"
            className="p-1 rounded-full text-stone-300 hover:text-stone-500 transition" style={{ touchAction: 'manipulation' }}>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}
