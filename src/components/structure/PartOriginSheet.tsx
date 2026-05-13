/**
 * PartOriginSheet — bottom sheet the student sees when they tap a slot
 * on their structure.
 *
 *   * Earned slot  → shows the real origin ("Mastered 5 words on…").
 *   * Locked slot  → shows the unlock hint ("Master 2 more words…").
 *
 * Pure presentational — all copy comes from the StructurePart's
 * `label`, `emoji`, and `origin` fields defined in constants/game.ts.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { StructurePart } from '../../constants/game';
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

export interface PartOriginSheetProps {
  open: boolean;
  part: StructurePart | null;
  /** ISO timestamp when the piece was earned, or null if still locked. */
  earnedAt: string | null;
  onClose: () => void;
}

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const PartOriginSheet: React.FC<PartOriginSheetProps> = ({ open, part, earnedAt, onClose }) => {
  const { language, dir } = useLanguage();
  const t = structureT[language];
  const isEarned = earnedAt !== null;
  return (
    <AnimatePresence>
      {open && part && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 m-0 sm:m-4"
            dir={dir}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isEarned ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-stone-200'}`}>
                <span aria-hidden="true">{part.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-black uppercase tracking-widest ${isEarned ? 'text-emerald-600' : 'text-stone-500'}`}>
                  {isEarned ? t.partEarnedTag : t.partLockedTag}
                </p>
                <h3 className="text-xl font-black text-stone-900 leading-tight">{part.label}</h3>
                <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                  {isEarned
                    ? t.partEarnedBecause(part.origin.replace(/\.$/, ''), earnedAt ? formatDate(earnedAt) : null)
                    : t.partToUnlock(part.origin)}
                </p>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label={t.partCloseAria}
                className="shrink-0 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="mt-5 w-full py-3 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99] transition-all"
            >
              {t.partGotIt}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
