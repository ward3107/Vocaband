import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import type { RetentionState } from "../../hooks/useRetention";
import { WEEKLY_CHALLENGE_PLAYS } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { ARCADE_CARD, ARCADE_REWARD_GRADIENT } from "../arcade/theme";
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
  // Arcade theme: frosted panel wrapping frosted item cards with white
  // text + gold claim buttons. Falls back to the existing styling off.
  const arcade = useFeatureFlag('arcade_hub', false);
  const {
    dailyChestAvailable, weeklyPlays, weeklyChallengeClaimable, comebackAvailable,
    claimDailyChest, claimWeeklyChallenge, claimComebackBonus,
  } = retention;

  // Shared arcade tokens reused across the three item cards.
  const arcadeItemCard = "bg-white/10 rounded-2xl ring-1 ring-white/15 text-white";
  const arcadeClaimBtn = `${ARCADE_REWARD_GRADIENT} text-amber-950 font-extrabold rounded-full ring-2 ring-white/40`;

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
    <div className={arcade ? `mb-4 ${ARCADE_CARD} p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3` : "mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3"}>
      {/* Daily chest — priority card, first to catch the eye.  Darker
          gradient stops (amber-500 → orange-600 → rose-600) so white
          text clears the WCAG AA contrast bar against the lightest
          (amber) end of the gradient.  The original amber-400 start
          had ~1.5:1 contrast with white. */}
      {dailyChestAvailable && (
        <motion.button
          onClick={handleDaily}
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={arcade ? `relative overflow-hidden p-4 text-start ${arcadeItemCard}` : "relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-4 text-start text-white"}
          style={{
            touchAction: 'manipulation',
            ...(arcade
              ? {}
              : {
                  boxShadow:
                    "0 14px 30px -14px rgba(220,90,80,0.55), 0 1px 0 rgba(255,255,255,0.45) inset",
                }),
          }}
        >
          <div aria-hidden className="pointer-events-none absolute -top-6 -end-6 w-24 h-24 bg-amber-300/25 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30"
            >
              🎁
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white">{t.dailyChest}</p>
              <p className="font-black text-sm text-white">{t.claimTodaysReward}</p>
              <p className={`text-xs ${arcade ? "text-cyan-200" : "text-white/95"}`}>{t.bonusXpStreakKeeper}</p>
            </div>
            <div className={arcade ? `shrink-0 ${arcadeClaimBtn} px-3 py-2 text-sm` : "shrink-0 bg-white/25 backdrop-blur-sm rounded-lg px-3 py-2 font-black text-sm text-white border border-white/40"}>{t.openButton}</div>
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
          className={arcade ? `relative overflow-hidden p-4 text-start ${arcadeItemCard}` : "relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 p-4 text-start text-white"}
          style={{
            touchAction: 'manipulation',
            ...(arcade
              ? {}
              : {
                  boxShadow:
                    "0 14px 30px -14px rgba(99,102,241,0.55), 0 1px 0 rgba(255,255,255,0.45) inset",
                }),
          }}
        >
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl">👋</div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest ${arcade ? "text-white" : "text-white/85"}`}>{t.welcomeBack}</p>
              <p className="font-black text-sm">{t.weMissedYou}</p>
              <p className={`text-xs ${arcade ? "text-cyan-200" : "text-white/90"}`}>{t.claimBonusForReturning}</p>
            </div>
            <div className={arcade ? `shrink-0 ${arcadeClaimBtn} px-3 py-2 text-sm` : "shrink-0 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 font-black text-sm border border-white/30"}>{t.claimButton}</div>
          </div>
        </motion.button>
      )}

      {/* Weekly challenge — progress card, vibrant emerald only when
          ready to claim; v1 chrome white card with brand-gradient
          progress fill while in-progress. */}
      <div
        className={
          arcade
            ? `relative overflow-hidden p-4 ${arcadeItemCard} ${weeklyChallengeClaimable ? '' : 'opacity-60'}`
            : "relative overflow-hidden rounded-2xl p-4 border"
        }
        style={
          arcade
            ? undefined
            : weeklyChallengeClaimable
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
              arcade
                ? { background: "rgba(255,255,255,0.15)" }
                : weeklyChallengeClaimable
                ? {
                    background: "rgba(255,255,255,0.22)",
                    border: "1px solid rgba(255,255,255,0.30)",
                    backdropFilter: "blur(8px)",
                  }
                : { background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)" }
            }
          >
            <Trophy size={20} className={arcade ? 'text-white' : weeklyChallengeClaimable ? 'text-white' : 'text-[#8B5CF6]'} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${arcade ? 'text-cyan-200' : ''}`}
              style={arcade ? undefined : { color: weeklyChallengeClaimable ? 'rgba(255,255,255,0.85)' : '#8B5CF6' }}
            >
              {t.weeklyChallenge}
            </p>
            <p
              className={`font-black text-sm mt-0.5 ${arcade ? 'text-white' : ''}`}
              style={arcade ? undefined : { color: weeklyChallengeClaimable ? '#fff' : '#1F1147' }}
            >
              {weeklyChallengeClaimable ? t.weeklyReadyToClaim : t.weeklyProgressText(weeklyPlays, WEEKLY_CHALLENGE_PLAYS)}
            </p>
            <div
              className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${arcade ? 'bg-white/15' : ''}`}
              style={
                arcade
                  ? undefined
                  : {
                      background: weeklyChallengeClaimable
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(99,102,241,0.10)",
                    }
              }
            >
              <div
                className={`h-full rounded-full transition-all ${arcade ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-400' : ''}`}
                style={{
                  width: `${Math.min(100, (weeklyPlays / WEEKLY_CHALLENGE_PLAYS) * 100)}%`,
                  ...(arcade
                    ? {}
                    : {
                        background: weeklyChallengeClaimable
                          ? "#fff"
                          : "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
                        boxShadow: weeklyChallengeClaimable
                          ? "none"
                          : "0 0 12px rgba(139,92,246,0.45)",
                      }),
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
                ...(arcade
                  ? {}
                  : {
                      background: "rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.30)",
                      backdropFilter: "blur(8px)",
                    }),
              }}
              className={
                arcade
                  ? `shrink-0 ${arcadeClaimBtn} px-3.5 py-2 text-[13px] transition-transform active:scale-95`
                  : "shrink-0 hover:bg-white/35 rounded-full px-3.5 py-2 font-bold text-[13px] transition-transform active:scale-95"
              }
            >
              {t.claimButton}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
