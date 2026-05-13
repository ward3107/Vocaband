/**
 * StructureDetailModal — the fullscreen (mobile) / large modal
 * (desktop) pop-up that opens when a student taps their garden
 * preview tile on the dashboard.  Renders the existing
 * StructureHero — same component, no duplication — inside a
 * scrollable overlay with a close button.
 *
 * Design intent: the dashboard shows a PREVIEW of the structure
 * so space is left for identity + shop + assignments; the student
 * opens this modal to see the full detailed scene, tap pieces for
 * their origin story, and track the "next piece" progress bar.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { StructureHero } from './StructureHero';
import type { StructureKind, StructurePart } from '../../constants/game';
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

interface Slot {
  part: StructurePart;
  earned: boolean;
  earnedAt: string | null;
}

export interface StructureDetailModalProps {
  open: boolean;
  onClose: () => void;
  kind: StructureKind;
  slots: Slot[];
  nextLocked: StructurePart | null;
  celebrateKeys?: string[];
  masteryProgress?: { played: number; needed: number };
}

export const StructureDetailModal: React.FC<StructureDetailModalProps> = ({
  open,
  onClose,
  kind,
  slots,
  nextLocked,
  celebrateKeys,
  masteryProgress,
}) => {
  const { language, dir } = useLanguage();
  const t = structureT[language];
  // Close on Escape for desktop keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="structure-detail-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-3xl bg-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden my-auto"
            dir={dir}
          >
            {/* Sticky header with title + close button.  The title here
                echoes the scene's caption so it's obvious what the
                modal is showing. */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-sm border-b border-stone-100 px-5 py-3">
              <h2 id="structure-detail-title" className="text-lg font-black text-stone-900 capitalize">
                {t.detailTitle(kind)}
              </h2>
              <button
                onClick={onClose}
                type="button"
                aria-label={t.detailClose}
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <StructureHero
                kind={kind}
                slots={slots}
                nextLocked={nextLocked}
                celebrateKeys={celebrateKeys}
                masteryProgress={masteryProgress}
              />

              {/* Gentle explainer at the bottom — tells the student how
                  pieces are earned without crowding the scene itself.
                  Complements the "Next piece" card which only shows
                  the next unlock. */}
              <div className="mt-4 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p className="font-black text-stone-900 mb-1.5">{t.howPiecesUnlockTitle}</p>
                <ul className="space-y-1 list-disc list-inside marker:text-indigo-500">
                  <li>{t.unlockBullet1}</li>
                  <li>{t.unlockBullet2}</li>
                  <li>{t.unlockBullet3}</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
