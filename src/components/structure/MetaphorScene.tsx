/**
 * MetaphorScene — the canvas that renders a student's structure.
 *
 * Phase 1.5 art direction: **atmospheric, not childish.**  Each metaphor
 * gets a real landscape — multi-layered SVG scenery with sky, horizon,
 * ground, and signature props (sun, stars, mountains, launchpad) —
 * instead of a flat pastel gradient.  Earned slots render as designed
 * "cards" with tone-paper backgrounds, drop shadows, and a caption
 * underneath — NOT as stickered emoji floating on pastel.  Locked slots
 * get a quiet dashed marker, no padlock icon (which reads as kid app).
 *
 * Swap a metaphor's look in one place: edit `BACKDROPS` (the SVG
 * scenery per kind) + `POSITIONS` (slot XY).  The parts array in
 * constants/game.ts is untouched.
 */
import React from 'react';
import { STRUCTURE_PARTS, type StructureKind, type StructurePart } from '../../constants/game';

interface Slot {
  part: StructurePart;
  earned: boolean;
  earnedAt: string | null;
}

interface MetaphorSceneProps {
  kind: StructureKind;
  slots: Slot[];
  onTapSlot: (part: StructurePart, earned: boolean) => void;
  /** Optional list of slot keys to animate-in with a pop effect (newly unlocked). */
  celebrateKeys?: string[];
}

/**
 * 10 XY positions (0-100 %) per metaphor.  Order matches
 * STRUCTURE_PARTS[kind] so slot N in the data = slot N on the scene.
 * Hand-tuned on a 3:2 aspect canvas.
 */
const POSITIONS: Record<StructureKind, Array<{ x: number; y: number }>> = {
  garden: [
    { x: 15, y: 76 }, { x: 32, y: 68 }, { x: 50, y: 74 }, { x: 75, y: 54 }, { x: 20, y: 56 },
    { x: 62, y: 72 }, { x: 40, y: 56 }, { x: 85, y: 70 }, { x: 50, y: 40 }, { x: 80, y: 44 },
  ],
  city: [
    { x: 10, y: 72 }, { x: 28, y: 56 }, { x: 48, y: 72 }, { x: 68, y: 66 }, { x: 88, y: 56 },
    { x: 38, y: 40 }, { x: 18, y: 40 }, { x: 60, y: 76 }, { x: 80, y: 74 }, { x: 50, y: 26 },
  ],
  rocket: [
    { x: 50, y: 60 }, { x: 50, y: 18 }, { x: 50, y: 42 }, { x: 50, y: 86 }, { x: 30, y: 70 },
    { x: 50, y: 78 }, { x: 70, y: 70 }, { x: 75, y: 90 }, { x: 50, y: 30 }, { x: 82, y: 22 },
  ],
  castle: [
    { x: 20, y: 72 }, { x: 32, y: 46 }, { x: 42, y: 72 }, { x: 58, y: 30 }, { x: 68, y: 72 },
    { x: 58, y: 50 }, { x: 50, y: 88 }, { x: 80, y: 58 }, { x: 50, y: 80 }, { x: 82, y: 32 },
  ],
};

// ── Scenery backdrops (inline SVG) ─────────────────────────────────────
// Each metaphor gets a bespoke illustration: sky gradient + signature
// props + a ground plane.  All viewBox-based so they scale with the
// outer aspect-ratio container.  No external images.

const GardenBackdrop: React.FC = () => (
  <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fcd5b5" />
        <stop offset="55%" stopColor="#f4e2c8" />
        <stop offset="100%" stopColor="#dfe8c7" />
      </linearGradient>
      <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7a8c52" />
        <stop offset="100%" stopColor="#4b5a31" />
      </linearGradient>
    </defs>
    {/* Sky */}
    <rect width="300" height="200" fill="url(#gSky)" />
    {/* Warm low sun */}
    <circle cx="235" cy="55" r="18" fill="#fff4cc" opacity="0.9" />
    <circle cx="235" cy="55" r="32" fill="#fff4cc" opacity="0.15" />
    {/* Distant hills */}
    <path d="M 0 130 Q 60 100 110 120 T 220 115 T 300 125 L 300 150 L 0 150 Z" fill="#9fb07e" opacity="0.6" />
    <path d="M 0 142 Q 80 120 160 138 T 300 140 L 300 160 L 0 160 Z" fill="#7e9063" opacity="0.7" />
    {/* Ground band */}
    <rect y="155" width="300" height="45" fill="url(#gGround)" />
    {/* Planting rows — subtle arcs for depth */}
    <path d="M 0 172 Q 150 164 300 172" stroke="#3d4a26" strokeWidth="1.3" fill="none" opacity="0.35" />
    <path d="M 0 183 Q 150 176 300 183" stroke="#3d4a26" strokeWidth="1.3" fill="none" opacity="0.35" />
    <path d="M 0 194 Q 150 188 300 194" stroke="#3d4a26" strokeWidth="1.3" fill="none" opacity="0.35" />
  </svg>
);

const CityBackdrop: React.FC = () => (
  <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2e3b5e" />
        <stop offset="60%" stopColor="#c96a5a" />
        <stop offset="100%" stopColor="#f2c98b" />
      </linearGradient>
    </defs>
    <rect width="300" height="200" fill="url(#cSky)" />
    {/* Moon/sun */}
    <circle cx="60" cy="38" r="14" fill="#fff7e0" opacity="0.85" />
    {/* Distant skyline silhouette */}
    <path
      d="M 0 140 L 15 125 L 25 132 L 40 110 L 55 128 L 70 115 L 85 130 L 100 108 L 115 125 L 130 120 L 145 105 L 160 128 L 175 115 L 190 122 L 205 98 L 222 125 L 240 110 L 255 130 L 272 118 L 290 125 L 300 120 L 300 200 L 0 200 Z"
      fill="#1f2540" opacity="0.75"
    />
    {/* Foreground street line */}
    <rect y="180" width="300" height="20" fill="#11152a" />
    <line x1="0" y1="190" x2="300" y2="190" stroke="#f4c34c" strokeWidth="1" strokeDasharray="8 6" opacity="0.7" />
  </svg>
);

const RocketBackdrop: React.FC = () => (
  <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
    <defs>
      <radialGradient id="rSpace" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stopColor="#3a2a6a" />
        <stop offset="60%" stopColor="#1b1540" />
        <stop offset="100%" stopColor="#0a0820" />
      </radialGradient>
    </defs>
    <rect width="300" height="200" fill="url(#rSpace)" />
    {/* Stars — scattered circles of varying sizes & opacity */}
    {[
      [22, 18, 0.9, 1.0], [58, 32, 0.6, 0.8], [94, 22, 0.7, 1.2], [142, 16, 0.9, 0.6], [188, 28, 0.5, 0.9],
      [226, 14, 0.8, 1.1], [268, 36, 0.7, 0.7], [44, 66, 0.5, 0.6], [118, 62, 0.6, 0.5], [206, 58, 0.5, 0.8],
      [262, 72, 0.6, 1.0], [18, 94, 0.5, 0.6], [80, 108, 0.4, 0.5], [168, 96, 0.5, 0.7], [284, 118, 0.6, 0.9],
    ].map(([x, y, op, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={op} />)}
    {/* Rocket silhouette down the middle — just a hint */}
    <ellipse cx="150" cy="130" rx="22" ry="48" fill="#252050" opacity="0.5" />
    {/* Launchpad */}
    <rect y="180" width="300" height="20" fill="#141026" />
    <rect x="120" y="174" width="60" height="8" fill="#2e2550" />
    <line x1="0" y1="180" x2="300" y2="180" stroke="#f0b13a" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

const CastleBackdrop: React.FC = () => (
  <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a2550" />
        <stop offset="50%" stopColor="#b5506a" />
        <stop offset="100%" stopColor="#f3b76a" />
      </linearGradient>
      <linearGradient id="kHill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4a6038" />
        <stop offset="100%" stopColor="#2f3e23" />
      </linearGradient>
    </defs>
    <rect width="300" height="200" fill="url(#kSky)" />
    {/* Sun low on the horizon */}
    <circle cx="235" cy="120" r="16" fill="#fff0c0" opacity="0.85" />
    <circle cx="235" cy="120" r="30" fill="#ffd68a" opacity="0.25" />
    {/* Distant mountains */}
    <path d="M 0 130 L 40 95 L 75 115 L 115 80 L 160 115 L 210 90 L 250 120 L 300 100 L 300 150 L 0 150 Z" fill="#3f3560" opacity="0.6" />
    {/* Rolling hills foreground */}
    <path d="M 0 160 Q 80 140 160 160 T 300 160 L 300 200 L 0 200 Z" fill="url(#kHill)" />
    {/* Winding path */}
    <path d="M 150 200 Q 145 180 155 170 Q 165 160 150 145" stroke="#a07a4a" strokeWidth="3" fill="none" opacity="0.5" />
  </svg>
);

const BACKDROPS: Record<StructureKind, React.FC> = {
  garden: GardenBackdrop,
  city: CityBackdrop,
  rocket: RocketBackdrop,
  castle: CastleBackdrop,
};

const SCENE_META: Record<StructureKind, { heading: string; subheading: string; isDark: boolean; chipBg: string }> = {
  garden: { heading: 'Your Garden',        subheading: 'A quiet field that fills as you learn',     isDark: false, chipBg: 'bg-stone-900/40 text-white' },
  city:   { heading: 'Your City',          subheading: 'A skyline you build, block by block',       isDark: true,  chipBg: 'bg-black/40 text-white' },
  rocket: { heading: 'Your Rocket',        subheading: 'Every part assembles toward launch',        isDark: true,  chipBg: 'bg-black/50 text-white' },
  castle: { heading: 'Your Castle',        subheading: 'Stone by stone, raise your keep',           isDark: true,  chipBg: 'bg-black/40 text-white' },
};

export const MetaphorScene: React.FC<MetaphorSceneProps> = ({ kind, slots, onTapSlot, celebrateKeys }) => {
  const positions = POSITIONS[kind];
  const Backdrop = BACKDROPS[kind];
  const meta = SCENE_META[kind];

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-stone-900/10"
      style={{ aspectRatio: '3 / 2' }}
      aria-label={`Your ${kind}`}
    >
      <Backdrop />

      {/* Subtle vignette — keeps the eye on the pieces */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.25)',
      }} />

      {slots.map((slot, i) => {
        const pos = positions[i] ?? { x: 50, y: 50 };
        const celebrate = celebrateKeys?.includes(slot.part.key);
        return (
          <button
            key={slot.part.key}
            onClick={() => onTapSlot(slot.part, slot.earned)}
            type="button"
            aria-label={slot.earned ? `${slot.part.label} — earned` : `${slot.part.label} — locked`}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all hover:scale-110 active:scale-95"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: 'manipulation' }}
          >
            {slot.earned ? (
              <>
                {/* Earned slot: designed card, not a sticker */}
                <div
                  className={`w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] rounded-xl bg-gradient-to-br from-white to-stone-100
                              flex items-center justify-center
                              shadow-[0_6px_14px_-4px_rgba(0,0,0,0.55)]
                              ring-1 ring-stone-900/10
                              ${celebrate ? 'animate-bounce' : ''}`}
                >
                  <span className="text-2xl sm:text-[28px] drop-shadow-sm" aria-hidden="true">{slot.part.emoji}</span>
                </div>
                {/* Tiny caption below — gives the scene a "labelled diorama" feel */}
                <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap ${meta.chipBg} shadow-sm`}>
                  {slot.part.label}
                </span>
              </>
            ) : (
              <>
                {/* Locked slot: quiet dashed outline, no padlock (reads as kid app) */}
                <div
                  className={`w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] rounded-full border-2 border-dashed flex items-center justify-center
                              ${meta.isDark ? 'border-white/40 bg-black/20' : 'border-stone-700/40 bg-white/10'}
                              backdrop-blur-[2px]`}
                >
                  <span className={`text-lg font-black ${meta.isDark ? 'text-white/60' : 'text-stone-700/60'}`}>?</span>
                </div>
              </>
            )}
          </button>
        );
      })}

      {/* Scene caption + piece counter — rendered on a real panel, not floating text */}
      <div className="absolute top-3 left-3 max-w-[70%]">
        <div className={`px-2.5 py-1.5 rounded-lg ${meta.chipBg} backdrop-blur-sm shadow-sm`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">{meta.heading}</p>
          <p className="text-[10px] opacity-80 leading-tight mt-0.5">{meta.subheading}</p>
        </div>
      </div>
      <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[11px] font-bold ${meta.chipBg} backdrop-blur-sm shadow-sm`}>
        {slots.filter(s => s.earned).length} / {STRUCTURE_PARTS[kind].length}
      </div>
    </div>
  );
};
