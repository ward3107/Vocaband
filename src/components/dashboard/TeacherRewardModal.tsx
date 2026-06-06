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
import { Sparkles, Wand2 } from "lucide-react";
import { supabase } from "../../core/supabase";
import { logAudit } from "../../utils/audit";
import { TEACHER_XP_PRESETS } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherModalsT } from "../../locales/teacher/modals";
import ModalShell, {
  ModalFootSpacer,
  ModalPrimaryButton,
  ModalQuietButton,
} from "../ui/ModalShell";

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

      // Central audit_log row in addition to the reward-specific
      // teacher_rewards table — so a privacy reviewer can pull one
      // table for "everything this teacher did".  XP amount is logged
      // as metadata; the reason field is intentionally NOT included
      // because teachers occasionally type student names there.
      void logAudit('award_reward', 'rewards', {
        targetUid: student.uid,
        metadata: { xp: selectedXp },
      });

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
    <ModalShell
      open={!!student}
      onClose={onClose}
      variant="success"
      icon="🎁"
      title="Send XP Boost"
      subtitle={student ? `Reward ${student.name} for their hard work` : undefined}
      dir={dir}
      zIndex={60}
      closeAriaLabel={t.closeAria}
      footer={
        <>
          <ModalQuietButton onClick={onClose} disabled={giving}>
            {t.cancel}
          </ModalQuietButton>
          <ModalFootSpacer />
          <ModalPrimaryButton
            onClick={handleGiveReward}
            disabled={!hasSelection || giving}
            style={{
              background: "linear-gradient(110deg, #F0CC78, #D89B3F)",
              boxShadow: "0 12px 26px -10px rgba(216,155,63,0.55)",
            }}
          >
            {giving ? (
              <>{t.sendingShort}</>
            ) : (
              <>
                <Wand2 size={16} />
                {t.sendXp}
              </>
            )}
          </ModalPrimaryButton>
        </>
      }
    >
      {student && (
        <>
          {/* XP amount picker */}
          <div className="mb-5">
            <p className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--vb-text-secondary)' }}>
              <Sparkles size={16} className="text-amber-500" />
              {t.selectXpAmount}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {TEACHER_XP_PRESETS.map((xp) => (
                <button
                  key={xp}
                  onClick={() => setSelectedXp(xp)}
                  type="button"
                  style={{
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent" as never,
                    ...(selectedXp === xp
                      ? {}
                      : { backgroundColor: "var(--vb-surface)", color: "var(--vb-text-secondary)", borderColor: "var(--vb-border)" }),
                  }}
                  className={`py-4 px-2 rounded-2xl font-black text-lg transition-all border ${
                    selectedXp === xp
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30"
                      : "hover:border-amber-300"
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
          <div>
            <label
              htmlFor="reward-reason"
              className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: 'var(--vb-text-muted)' }}
            >
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
              style={{ backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-primary)', borderColor: 'var(--vb-border)' }}
              className="block w-full rounded-2xl border-[1.5px] px-[18px] py-3 text-[14px] outline-none transition-shadow focus:border-[#8B5CF6] focus:[box-shadow:0_0_0_4px_rgba(139,92,246,0.15)]"
            />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--vb-text-muted)' }}>
              Shows up in the student's dashboard next to the XP boost.
            </p>
          </div>
        </>
      )}
    </ModalShell>
  );
}

export default TeacherRewardModal;
