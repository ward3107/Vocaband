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
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

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
  const { language } = useLanguage();
  const t = structureT[language];
  const meta = STRUCTURE_KINDS.find(k => k.kind === kind) ?? STRUCTURE_KINDS[0];
  const earned = slots.filter(s => s.earned).length;
  const total = STRUCTURE_PARTS[kind].length;
  const progress = Math.round((earned / total) * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        touchAction: 'manipulation',
        background:
          "radial-gradient(120% 100% at 0% 0%, #2A1B5C 0%, #1A0E3D 60%, #0E0828 100%)",
        boxShadow:
          "0 20px 50px -22px rgba(60,40,120,0.50), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
      aria-label={t.previewTileAria(kind, earned, total)}
      className="group relative overflow-hidden rounded-2xl text-white hover:-translate-y-0.5 active:scale-[0.99] transition-transform text-left w-full"
      // Live v1 dark stack — same deep purple radial used by the
      // student joining screen + end-of-session celebration, so the
      // structure tile reads as part of the dark-themed-when-vibrant
      // surface family.
      data-v1-dark="true"
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
              {t.previewTileYourKind(meta.emoji, kind)}
            </p>
            <p className="mt-1 text-sm sm:text-base font-black">
              {t.previewTilePieces(earned, total)}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1.5 text-[11px] font-black opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            {t.previewTileOpen}
            <ArrowRight size={12} />
          </span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
              boxShadow: "0 0 12px rgba(139,92,246,0.65)",
            }}
          />
        </div>
      </div>
    </button>
  );
};
