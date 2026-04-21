/**
 * MetaphorScene — the canvas that renders a student's structure.
 *
 * Phase 1 art direction: flat 2D, emoji-as-art, fixed 10-slot layout
 * per metaphor.  Each slot has a pre-set position (%); earned slots
 * show the part's emoji in full colour, locked slots show a faint
 * dashed circle with a lock hint underneath.
 *
 * Swapping a metaphor never touches the hook or the constants — only
 * this file's `POSITIONS` + `BACKDROPS` maps.
 */
import React from 'react';
import { Lock } from 'lucide-react';
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
 * These were hand-tuned on a 3:2 aspect canvas — feel free to edit.
 */
const POSITIONS: Record<StructureKind, Array<{ x: number; y: number }>> = {
  garden: [
    { x: 12, y: 78 }, { x: 30, y: 72 }, { x: 50, y: 75 }, { x: 70, y: 50 }, { x: 18, y: 55 },
    { x: 62, y: 78 }, { x: 40, y: 55 }, { x: 82, y: 68 }, { x: 48, y: 30 }, { x: 82, y: 40 },
  ],
  city: [
    { x: 10, y: 75 }, { x: 30, y: 55 }, { x: 50, y: 75 }, { x: 70, y: 68 }, { x: 88, y: 55 },
    { x: 40, y: 38 }, { x: 20, y: 38 }, { x: 62, y: 78 }, { x: 82, y: 78 }, { x: 50, y: 22 },
  ],
  rocket: [
    // Rocket slots cluster around a central vertical silhouette.
    { x: 50, y: 62 }, { x: 50, y: 16 }, { x: 50, y: 42 }, { x: 50, y: 90 }, { x: 28, y: 72 },
    { x: 50, y: 82 }, { x: 72, y: 72 }, { x: 50, y: 95 }, { x: 50, y: 28 }, { x: 82, y: 22 },
  ],
  castle: [
    { x: 18, y: 75 }, { x: 30, y: 45 }, { x: 40, y: 75 }, { x: 55, y: 28 }, { x: 65, y: 75 },
    { x: 55, y: 48 }, { x: 50, y: 90 }, { x: 80, y: 60 }, { x: 50, y: 82 }, { x: 82, y: 30 },
  ],
};

/**
 * Tailwind background classes per metaphor.  Chosen so the emoji slots
 * read clearly on top — warm earth for garden, cool sky for city, deep
 * space for rocket, stone + sunset for castle.
 */
const BACKDROPS: Record<StructureKind, string> = {
  garden: 'bg-gradient-to-b from-sky-200 via-emerald-100 to-yellow-100',
  city:   'bg-gradient-to-b from-indigo-200 via-sky-100 to-stone-200',
  rocket: 'bg-gradient-to-b from-slate-900 via-indigo-900 to-purple-900',
  castle: 'bg-gradient-to-b from-orange-200 via-rose-100 to-stone-200',
};

/** Foreground accent — a small decorative marker at the bottom of the scene. */
const FLOOR: Record<StructureKind, { emoji: string; label: string }> = {
  garden: { emoji: '🟫', label: 'Soil' },
  city:   { emoji: '🛣️', label: 'Road' },
  rocket: { emoji: '🚀', label: 'Launchpad' },
  castle: { emoji: '🏞️', label: 'Hill' },
};

export const MetaphorScene: React.FC<MetaphorSceneProps> = ({ kind, slots, onTapSlot, celebrateKeys }) => {
  const positions = POSITIONS[kind];
  // Gracefully handle fewer slots than positions — we render whatever
  // slots we were given at the first N positions.
  const backdrop = BACKDROPS[kind];
  const isDark = kind === 'rocket';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl shadow-inner ${backdrop}`}
      style={{ aspectRatio: '3 / 2' }}
      aria-label={`Your ${kind}`}
    >
      {/* Floor / ground strip */}
      <div className={`absolute inset-x-0 bottom-0 h-[6%] ${isDark ? 'bg-black/30' : 'bg-stone-400/30'}`} />

      {slots.map((slot, i) => {
        const pos = positions[i] ?? { x: 50, y: 50 };
        const celebrate = celebrateKeys?.includes(slot.part.key);
        return (
          <button
            key={slot.part.key}
            onClick={() => onTapSlot(slot.part, slot.earned)}
            type="button"
            aria-label={slot.earned ? `${slot.part.label} — earned` : `${slot.part.label} — locked`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
                        w-[14%] min-w-[44px] max-w-[56px] aspect-square rounded-2xl transition-all
                        ${slot.earned
                          ? `bg-white/80 shadow-md backdrop-blur-sm hover:scale-110 ${celebrate ? 'animate-bounce' : ''}`
                          : `bg-white/20 border-2 border-dashed ${isDark ? 'border-white/40' : 'border-stone-400/60'} hover:bg-white/30`}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: 'manipulation' }}
          >
            {slot.earned ? (
              <span className="text-2xl sm:text-3xl" aria-hidden="true">{slot.part.emoji}</span>
            ) : (
              <Lock size={18} className={isDark ? 'text-white/60' : 'text-stone-500/70'} aria-hidden="true" />
            )}
          </button>
        );
      })}

      {/* Meta label in the corner */}
      <div className={`absolute top-3 left-3 text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/80' : 'text-stone-700/80'}`}>
        <span aria-hidden="true" className="mr-1">{FLOOR[kind].emoji}</span>
        Your {kind}
      </div>
      <div className={`absolute top-3 right-3 text-xs font-bold ${isDark ? 'text-white/80' : 'text-stone-700/80'}`}>
        {slots.filter(s => s.earned).length} / {STRUCTURE_PARTS[kind].length} pieces
      </div>
    </div>
  );
};
