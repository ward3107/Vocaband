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
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

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
  /** Games played toward the NEXT mastery-event unlock + games needed. */
  /** Only used when the next locked piece's unlock event is mastery. */
  masteryProgress?: { played: number; needed: number };
}

export const StructureHero: React.FC<StructureHeroProps> = ({ kind, slots, nextLocked, celebrateKeys, masteryProgress }) => {
  const { language } = useLanguage();
  const t = structureT[language];
  const [openSlot, setOpenSlot] = useState<{ part: StructurePart; earnedAt: string | null } | null>(null);

  const earnedCount = slots.filter(s => s.earned).length;

  return (
    <>
      <section className="mb-4" aria-label={t.structureAria}>
        <MetaphorScene
          kind={kind}
          slots={slots}
          onTapSlot={(part, earned) => {
            const slot = slots.find(s => s.part.key === part.key);
            setOpenSlot({ part, earnedAt: earned ? slot?.earnedAt ?? null : null });
          }}
          celebrateKeys={celebrateKeys}
        />

        {/* "Next unlock" hint — tells the student exactly what to do next.
            When the next piece is a mastery unlock (game-count based),
            render a progress bar + "N / M great games" counter so the
            student SEES the counter move after every game, even if the
            piece hasn't unlocked yet.  Perfect-score and streak pieces
            don't have a progress bar — they fire on the exact event. */}
        <div className="mt-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-stone-200/60">
          {nextLocked ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-500">{t.nextPiece}</p>
                  <p className="text-sm font-bold text-stone-900 truncate">
                    {t.nextPieceLine(nextLocked.label, nextLocked.origin)}
                  </p>
                </div>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-lg shadow-sm">
                  {nextLocked.emoji}
                </div>
              </div>
              {nextLocked.unlockEvent === 'mastered_5_words' && masteryProgress && masteryProgress.needed > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">{t.progressLabel}</span>
                    <span className="text-xs font-bold text-stone-700">
                      {t.greatGamesProgress(masteryProgress.played, masteryProgress.needed)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
                      style={{ width: `${Math.min(100, (masteryProgress.played / masteryProgress.needed) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500">
                    {t.greatGameDefinition}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">{t.completeLabel}</p>
                <p className="text-sm font-bold text-stone-900">
                  {t.completeBody(earnedCount)}
                </p>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-lg shadow-sm">
                🏆
              </div>
            </div>
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
