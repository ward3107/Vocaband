/**
 * CompetitionLeaderboardModal — live (or final) standings dialog.
 *
 * Used by both teacher and student surfaces.  The data flow is identical
 * (`useCompetitionLeaderboard` → `competition_leaderboard` RPC); the
 * only role-specific bit is the "End competition now" affordance, which
 * is gated on the `canEnd` prop the caller passes in.  Keeping that flag
 * external keeps this component dumb-render and easy to drop into any
 * view.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Flag } from 'lucide-react';
import type { CompetitionData } from '../core/supabase';
import { useCompetitionLeaderboard, endCompetition } from '../hooks/useCompetitions';
import { useLanguage } from '../hooks/useLanguage';
import { competitionsT } from '../locales/competitions';

interface Props {
  competition: CompetitionData;
  /** Highlight the row matching this uid so the student spots themselves. */
  currentUid?: string | null;
  /** When true and the competition is live, show "End now" affordance. */
  canEnd?: boolean;
  onClose: () => void;
  /** Fired after a successful end-now so the parent can refetch. */
  onEnded?: () => void;
}

export default function CompetitionLeaderboardModal({
  competition,
  currentUid,
  canEnd = false,
  onClose,
  onEnded,
}: Props) {
  const { language, dir, isRTL } = useLanguage();
  const t = competitionsT[language];
  const { entries, loading } = useCompetitionLeaderboard(competition.id);
  const [ending, setEnding] = useState(false);

  const isLive = competition.status === 'live';

  const formattedEnd = new Date(competition.closesAt).toLocaleString(
    language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' },
  );

  const handleEndNow = async () => {
    if (!window.confirm(t.endNowConfirm)) return;
    setEnding(true);
    const ok = await endCompetition(competition.id);
    setEnding(false);
    if (ok) {
      onEnded?.();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
        dir={dir}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`px-5 py-4 ${
              isLive
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                : 'bg-gradient-to-r from-stone-500 to-stone-700'
            } text-white`}
          >
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                {isLive ? <Crown size={20} /> : <Flag size={20} />}
                <h2 className="text-lg font-black">
                  {isLive ? t.modalTitleLive : t.modalTitleEnded}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.modalCloseButton}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs font-bold mt-1 text-white/90">
              {isLive ? t.endsAt(formattedEnd) : t.endedAt(formattedEnd)}
            </p>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {loading && entries.length === 0 ? (
              <div className="py-10 text-center text-stone-500 text-sm">…</div>
            ) : entries.length === 0 ? (
              <div className="py-10 text-center text-stone-500 text-sm font-medium">
                {t.modalEmpty}
              </div>
            ) : (
              <ol className="space-y-2">
                {entries.map((entry, idx) => {
                  const isYou = !!currentUid && entry.studentUid === currentUid;
                  const rankIcon =
                    idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                  const rankClass =
                    idx === 0
                      ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-stone-900'
                      : idx === 1
                      ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-stone-900'
                      : idx === 2
                      ? 'bg-gradient-to-r from-orange-300 to-orange-500 text-white'
                      : 'bg-stone-100 text-stone-700';
                  return (
                    <li
                      key={entry.studentUid}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border-2 ${
                        isYou
                          ? 'border-amber-400 bg-amber-50 shadow-sm'
                          : 'border-stone-100 bg-white'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <span
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${rankClass}`}
                      >
                        {rankIcon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {entry.avatar && <span className="text-lg">{entry.avatar}</span>}
                          <span
                            className={`font-bold text-sm truncate ${
                              isYou ? 'text-amber-900' : 'text-stone-900'
                            }`}
                          >
                            {entry.studentName}
                          </span>
                          {isYou && (
                            <span className="ml-1 text-[10px] font-black text-amber-700 bg-amber-200/70 rounded-full px-1.5 py-0.5">
                              {t.youLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-black tabular-nums text-stone-900">
                        {Math.round(entry.totalScore)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-2 border-t border-stone-100 space-y-2">
            <p className="text-[11px] text-stone-500 italic">{t.finishedFirstNote}</p>
            {canEnd && isLive && (
              <button
                type="button"
                onClick={handleEndNow}
                disabled={ending}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {t.endNow}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition-colors"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.modalCloseButton}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
