/**
 * StructureHero — the centerpiece of the redesigned student dashboard.
 *
 * Owns:
 *   * The metaphor canvas (MetaphorScene).
 *   * The "next unlock" hint below the canvas.
 *   * Tap-for-origin bottom sheet.
 *
 * State comes from `useStructure` — the caller passes the slots +
 * nextLocked directly so this component stays pure presentational.
 */
import React, { useState } from 'react';
import { MetaphorScene } from './MetaphorScene';
import { PartOriginSheet } from './PartOriginSheet';
import type { StructureKind, StructurePart } from '../../constants/game';

interface Slot {
  part: StructurePart;
  earned: boolean;
  earnedAt: string | null;
}

interface StructureHeroProps {
  kind: StructureKind;
  slots: Slot[];
  nextLocked: StructurePart | null;
  /** Keys of parts newly unlocked this render cycle — for the bounce pop. */
  celebrateKeys?: string[];
}

export const StructureHero: React.FC<StructureHeroProps> = ({ kind, slots, nextLocked, celebrateKeys }) => {
  const [openSlot, setOpenSlot] = useState<{ part: StructurePart; earnedAt: string | null } | null>(null);

  const earnedCount = slots.filter(s => s.earned).length;

  return (
    <>
      <section className="mb-4" aria-label="Your structure">
        <MetaphorScene
          kind={kind}
          slots={slots}
          onTapSlot={(part, earned) => {
            const slot = slots.find(s => s.part.key === part.key);
            setOpenSlot({ part, earnedAt: earned ? slot?.earnedAt ?? null : null });
          }}
          celebrateKeys={celebrateKeys}
        />

        {/* "Next unlock" hint — tells the student exactly what to do next. */}
        <div className="mt-3 flex items-center justify-between gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-stone-200/60">
          {nextLocked ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-stone-500">Next piece</p>
                <p className="text-sm font-bold text-stone-900 truncate">
                  {nextLocked.label}{' '}
                  <span className="text-stone-500 font-normal">— {nextLocked.origin}</span>
                </p>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-lg shadow-sm">
                {nextLocked.emoji}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Complete!</p>
                <p className="text-sm font-bold text-stone-900">
                  You've earned every piece — {earnedCount} in total.
                </p>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-lg shadow-sm">
                🏆
              </div>
            </>
          )}
        </div>
      </section>

      <PartOriginSheet
        open={openSlot !== null}
        part={openSlot?.part ?? null}
        earnedAt={openSlot?.earnedAt ?? null}
        onClose={() => setOpenSlot(null)}
      />
    </>
  );
};
