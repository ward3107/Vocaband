import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import type { RetentionState } from "../../hooks/useRetention";
import { WEEKLY_CHALLENGE_PLAYS } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface RetentionStripProps {
  retention: RetentionState;
  /** How to apply XP rewards — caller owns setXp so we stay honest about state. */
  onGrantXp: (amount: number, reason: string) => void;
}

/**
 * Compact row of retention cards that sits on the student dashboard.
 * Each card only renders when its reward is actually actionable, so an
 * inactive retention system stays invisible (no dead UI).  Everything
 * is kept under 200 lines on purpose — this is surface, not logic.
 */
export default function RetentionStrip({ retention, onGrantXp }: RetentionStripProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  const {
    dailyChestAvailable, weeklyPlays, weeklyChallengeClaimable, comebackAvailable,
    claimDailyChest, claimWeeklyChallenge, claimComebackBonus,
  } = retention;

  // If absolutely nothing is actionable AND no weekly progress exists,
  // skip rendering entirely so the dashboard stays clean for active users.
  const anyActionable = dailyChestAvailable || weeklyChallengeClaimable || comebackAvailable || weeklyPlays > 0;
  if (!anyActionable) return null;

  const handleDaily = () => {
    const r = claimDailyChest();
    if (r?.xp) onGrantXp(r.xp, t.dailyChestXpToast(r.xp));
  };
  const handleWeekly = () => {
    const r = claimWeeklyChallenge();
    if (r?.xp) onGrantXp(r.xp, t.weeklyChallengeXpToast(r.xp));
  };
  const handleComeback = () => {
    const r = claimComebackBonus();
    if (r) onGrantXp(75, t.welcomeBackXpBonus(75));
  };

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Daily chest — priority card, first to catch the eye */}
      {dailyChestAvailable && (
        <motion.button
          onClick={handleDaily}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-left text-white"
          style={{
            touchAction: 'manipulation',
            boxShadow:
              "0 14px 30px -14px rgba(240,141,135,0.55), 0 1px 0 rgba(255,255,255,0.45) inset",
          }}
        >
          <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 bg-yellow-200/40 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl"
            >
              🎁
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/85">{t.dailyChest}</p>
              <p className="font-black text-sm">{t.claimTodaysReward}</p>
              <p className="text-xs text-white/90">{t.bonusXpStreakKeeper}</p>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 font-black text-sm border border-white/30">{t.openButton}</div>
          </div>
        </motion.button>
      )}

      {/* Welcome-back bonus */}
      {comebackAvailable && (
        <motion.button
          onClick={handleComeback}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 p-4 text-left text-white"
          style={{
            touchAction: 'manipulation',
            boxShadow:
              "0 14px 30px -14px rgba(99,102,241,0.55), 0 1px 0 rgba(255,255,255,0.45) inset",
          }}
        >
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl">👋</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/85">{t.welcomeBack}</p>
              <p className="font-black text-sm">{t.weMissedYou}</p>
              <p className="text-xs text-white/90">{t.claimBonusForReturning}</p>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 font-black text-sm border border-white/30">{t.claimButton}</div>
          </div>
        </motion.button>
      )}

      {/* Weekly challenge — progress card, vibrant emerald only when
          ready to claim; v1 chrome white card with brand-gradient
          progress fill while in-progress. */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 border"
        style={
          weeklyChallengeClaimable
            ? {
                background:
                  "linear-gradient(110deg, #2E8E60 0%, #3FA689 50%, #5EC9A6 100%)",
                borderColor: "transparent",
                color: "#fff",
                boxShadow:
                  "0 14px 30px -14px rgba(63,166,137,0.55), 0 1px 0 rgba(255,255,255,0.45) inset",
              }
            : {
                background: "#FFFFFF",
                borderColor: "rgba(99,102,241,0.10)",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
              }
        }
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
            style={
              weeklyChallengeClaimable
                ? {
                    background: "rgba(255,255,255,0.22)",
                    border: "1px solid rgba(255,255,255,0.30)",
                    backdropFilter: "blur(8px)",
                  }
                : { background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)" }
            }
          >
            <Trophy size={20} className={weeklyChallengeClaimable ? 'text-white' : 'text-[#8B5CF6]'} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
              style={{ color: weeklyChallengeClaimable ? 'rgba(255,255,255,0.85)' : '#8B5CF6' }}
            >
              {t.weeklyChallenge}
            </p>
            <p
              className="font-black text-sm mt-0.5"
              style={{ color: weeklyChallengeClaimable ? '#fff' : '#1F1147' }}
            >
              {weeklyChallengeClaimable ? t.weeklyReadyToClaim : t.weeklyProgressText(weeklyPlays, WEEKLY_CHALLENGE_PLAYS)}
            </p>
            <div
              className="mt-1.5 h-1.5 rounded-full overflow-hidden"
              style={{
                background: weeklyChallengeClaimable
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(99,102,241,0.10)",
              }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (weeklyPlays / WEEKLY_CHALLENGE_PLAYS) * 100)}%`,
                  background: weeklyChallengeClaimable
                    ? "#fff"
                    : "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
                  boxShadow: weeklyChallengeClaimable
                    ? "none"
                    : "0 0 12px rgba(139,92,246,0.45)",
                }}
              />
            </div>
          </div>
          {weeklyChallengeClaimable && (
            <button
              onClick={handleWeekly}
              type="button"
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent' as never,
                background: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.30)",
                backdropFilter: "blur(8px)",
              }}
              className="shrink-0 hover:bg-white/35 rounded-full px-3.5 py-2 font-bold text-[13px] transition-transform active:scale-95"
            >
              {t.claimButton}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
