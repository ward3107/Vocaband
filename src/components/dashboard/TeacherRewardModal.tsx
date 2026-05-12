/**
 * TeacherRewardModal — Modal for teachers to award bonus XP to a student.
 *
 * Originally supported four reward types (XP / badge / title / avatar)
 * but only XP landed correctly on the student side — badge/title/avatar
 * writes touched the users table but never surfaced in the student's
 * cosmetic state on the client, leaving teachers wondering why their
 * reward "didn't appear". Rather than debug three partially-working
 * paths, the modal was scoped down to XP-only: it's the one reward
 * that has an end-to-end feedback loop (DB → inbox card with
 * confetti → in-memory XP bump).
 *
 * If we want to bring back badge/title/avatar later, restore the tab
 * UI + wire each into user-state updates on the student dashboard
 * first. Until then, keeping the surface area narrow avoids teacher
 * confusion.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, X, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "../../core/supabase";
import { TEACHER_XP_PRESETS } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";

export interface StudentInfo {
  uid: string;
  name: string;
  avatar: string;
  xp?: number;
}

interface TeacherRewardModalProps {
  student: StudentInfo | null;
  onClose: () => void;
  onRewardGiven?: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

export function TeacherRewardModal({ student, onClose, onRewardGiven, showToast }: TeacherRewardModalProps) {
  const { language, dir } = useLanguage();
  const t = teacherModalsT[language];
  const [selectedXp, setSelectedXp] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [giving, setGiving] = useState(false);

  const hasSelection = selectedXp !== null;

  const handleGiveReward = async () => {
    if (selectedXp === null || !student) return;

    setGiving(true);
    try {
      const { error } = await supabase.rpc('award_reward', {
        p_student_uid: student.uid,
        p_reward_type: 'xp',
        p_reward_value: String(selectedXp),
        p_reason: reason || null,
      });

      if (error) throw error;

      showToast?.(t.sentXpToast(selectedXp, student.name), 'success');
      onRewardGiven?.();
      onClose();
    } catch (err) {
      // Surface the real PostgREST error text so "Only teachers can
      // award rewards" / "Student not found" / "XP value exceeds cap"
      // are distinguishable from each other in one toast.
      const e = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const reasonText =
        (e?.message && !e.message.includes('JWT')) ? e.message :
        e?.details ? e.details :
        t.rewardUnknownError;
      console.error('Failed to give reward:', err);
      showToast?.(t.rewardErrorToast(reasonText), 'error');
    } finally {
      setGiving(false);
    }
  };

  return (
    <AnimatePresence>
      {student && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            dir={dir}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[var(--vb-surface)] rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gift size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--vb-text-primary)]">Send XP Boost</h2>
                  <p className="text-sm text-[var(--vb-text-muted)] mt-0.5">
                    Reward <span className="font-semibold text-amber-600">{student.name}</span> for their hard work
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full hover:bg-[var(--vb-surface-alt)] flex items-center justify-center transition-colors"
                aria-label={t.closeAria}
              >
                <X size={18} className="text-[var(--vb-text-muted)]" />
              </button>
            </div>

            {/* XP amount picker */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-[var(--vb-text-secondary)] mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                {t.selectXpAmount}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {TEACHER_XP_PRESETS.map((xp) => (
                  <button
                    key={xp}
                    onClick={() => setSelectedXp(xp)}
                    type="button"
                    className={`py-4 px-2 rounded-2xl font-black text-lg transition-all border-2 ${
                      selectedXp === xp
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30'
                        : 'bg-[var(--vb-surface)] text-[var(--vb-text-secondary)] border-[var(--vb-border)] hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    +{xp}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason — shown to the student in their dashboard inbox
                card, so the prompt asks for an encouraging note rather
                than a private teacher memo. */}
            <div className="mb-6">
              <label htmlFor="reward-reason" className="text-sm font-semibold text-[var(--vb-text-secondary)] mb-2 block">
                Short message to the student (optional)
              </label>
              <input
                id="reward-reason"
                name="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.shortMsgPlaceholder}
                maxLength={120}
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--vb-border)] focus:border-amber-400 focus:outline-none transition-colors text-sm"
              />
              <p className="text-xs text-[var(--vb-text-muted)] mt-1">
                Shows up in the student's dashboard next to the XP boost.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[var(--vb-border)]">
              <button
                onClick={onClose}
                type="button"
                disabled={giving}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-[var(--vb-text-secondary)] bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleGiveReward}
                disabled={!hasSelection || giving}
                type="button"
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  giving ? 'bg-[var(--vb-text-muted)]' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30'
                }`}
              >
                {giving ? (
                  <>{t.sendingShort}</>
                ) : (
                  <>
                    <Wand2 size={18} />
                    {t.sendXp}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default TeacherRewardModal;
