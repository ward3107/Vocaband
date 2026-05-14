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
          style={{ touchAction: 'manipulation' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-left text-white shadow-lg shadow-orange-300/40"
        >
          <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 bg-yellow-200/40 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl"
            >
              🎁
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/85">{t.dailyChest}</p>
              <p className="font-black text-sm">{t.claimTodaysReward}</p>
              <p className="text-xs text-white/90">{t.bonusXpStreakKeeper}</p>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 font-black text-sm border border-white/30">{t.openButton}</div>
          </div>
        </motion.button>
      )}

      {/* Welcome-back bonus */}
      {comebackAvailable && (
        <motion.button
          onClick={handleComeback}
          type="button"
          style={{ touchAction: 'manipulation' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 p-4 text-left text-white shadow-lg shadow-blue-300/40"
        >
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl">👋</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/85">{t.welcomeBack}</p>
              <p className="font-black text-sm">{t.weMissedYou}</p>
              <p className="text-xs text-white/90">{t.claimBonusForReturning}</p>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 font-black text-sm border border-white/30">{t.claimButton}</div>
          </div>
        </motion.button>
      )}

      {/* Weekly challenge — progress card, claim state when full */}
      <div
        className={`relative overflow-hidden rounded-2xl p-4 border ${weeklyChallengeClaimable
          ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-600 text-white shadow-lg shadow-emerald-300/40'
          : 'bg-white border-stone-200'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${weeklyChallengeClaimable ? 'bg-white/25 backdrop-blur-sm' : 'bg-emerald-100'}`}>
            <Trophy size={20} className={weeklyChallengeClaimable ? 'text-white' : 'text-emerald-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${weeklyChallengeClaimable ? 'text-white/85' : 'text-stone-400'}`}>{t.weeklyChallenge}</p>
            <p className={`font-black text-sm ${weeklyChallengeClaimable ? 'text-white' : 'text-stone-900'}`}>
              {weeklyChallengeClaimable ? t.weeklyReadyToClaim : t.weeklyProgressText(weeklyPlays, WEEKLY_CHALLENGE_PLAYS)}
            </p>
            <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${weeklyChallengeClaimable ? 'bg-white/25' : 'bg-stone-100'}`}>
              <div
                className={`h-full rounded-full transition-all ${weeklyChallengeClaimable ? 'bg-white' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                style={{ width: `${Math.min(100, (weeklyPlays / WEEKLY_CHALLENGE_PLAYS) * 100)}%` }}
              />
            </div>
          </div>
          {weeklyChallengeClaimable && (
            <button
              onClick={handleWeekly}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="shrink-0 bg-white/25 hover:bg-white/35 backdrop-blur-sm rounded-xl px-3 py-2 font-black text-sm border border-white/30 transition-colors"
            >
              {t.claimButton}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
