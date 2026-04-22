/**
 * StructurePreviewTile — compact card that shows a small peek of
 * the student's garden/city/rocket/castle alongside the shop tile.
 * Tapping opens the StructureDetailModal (fullscreen / large popup
 * with the real detailed scene + origin sheets).
 *
 * Previously the full scene was always on-page, taking half the
 * dashboard.  Shrinking it to a preview + making the detail view a
 * modal frees vertical space for the Identity Hero + Today strip +
 * Assignments list to breathe.
 */
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MetaphorScene } from './MetaphorScene';
import { STRUCTURE_PARTS, STRUCTURE_KINDS, type StructureKind, type StructurePart } from '../../constants/game';

interface Slot {
  part: StructurePart;
  earned: boolean;
  earnedAt: string | null;
}

export interface StructurePreviewTileProps {
  kind: StructureKind;
  slots: Slot[];
  onOpen: () => void;
}

export const StructurePreviewTile: React.FC<StructurePreviewTileProps> = ({ kind, slots, onOpen }) => {
  const meta = STRUCTURE_KINDS.find(k => k.kind === kind) ?? STRUCTURE_KINDS[0];
  const earned = slots.filter(s => s.earned).length;
  const total = STRUCTURE_PARTS[kind].length;
  const progress = Math.round((earned / total) * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ touchAction: 'manipulation' }}
      aria-label={`Open your ${kind} — ${earned} of ${total} pieces earned`}
      className="group relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-stone-900/10 bg-stone-900 text-white hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] transition-all text-left w-full"
    >
      {/* Embed the real scene at small size so the student sees a
          genuine peek of their progress — not a stock illustration.
          Wrapped in a pointer-events-none overlay so individual slot
          taps don't interfere with the tile's own tap handler. */}
      <div className="pointer-events-none">
        <MetaphorScene
          kind={kind}
          slots={slots}
          onTapSlot={() => { /* ignored — tile opens the modal */ }}
        />
      </div>

      {/* Bottom panel — counter + CTA overlay.  Floats on top of the
          scene to keep the preview artful rather than cramming text
          into the scene area. */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/70 via-black/50 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
              {meta.emoji} Your {kind}
            </p>
            <p className="mt-1 text-sm sm:text-base font-black">
              {earned} / {total} pieces
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1.5 text-[11px] font-black opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            Open
            <ArrowRight size={12} />
          </span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-300 to-teal-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </button>
  );
};
