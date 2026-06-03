import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Lock, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ARCADE_CARD, ARCADE_REWARD_GRADIENT } from "../arcade/theme";
import { BADGE_CLAIM_XP } from "../../constants/game";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface BadgesStripProps {
  /** IDs (or display names) of badges the student has earned. */
  earned: string[];
  /** Student uid — used to hydrate already-claimed badges from the
   *  server. Required for the arcade tap-to-claim flow; absent → no
   *  claim affordance. */
  userUid?: string;
  /** Server-authoritative badge XP claim (claim_badge_xp RPC). Dedups
   *  in the DB, so clearing client storage can't re-collect. Resolves
   *  to whether the badge was already claimed, or null on failure. */
  onClaimBadgeXp?: (badgeId: string, xp: number, reason: string) => Promise<{ alreadyClaimed: boolean } | null>;
}

// Canonical badge catalogue — must mirror the strings actually
// `awardBadge(...)` is called with elsewhere in the codebase.  The
// previous catalogue used neat ids (`first_win`, `perfect`, …) but the
// game-finish path awards emoji-prefixed display strings
// (`"🎯 Perfect Score"`), so the matcher returned false for every
// real-life earned badge — students saw "5/10" but every tile was
// locked.  Realigned to the awarded strings; loose matching below
// covers any teacher-given custom badges.
const ALL_BADGES: Array<{ id: string; emoji: string; name: string; desc: string }> = [
  { id: '🎯 Perfect Score',  emoji: '🎯', name: 'Perfect Score',  desc: '100% on any mode' },
  { id: '🔥 Streak Master',  emoji: '🔥', name: 'Streak Master',  desc: '5-day streak' },
  { id: '💎 XP Hunter',      emoji: '💎', name: 'XP Hunter',      desc: '500 XP earned' },
  { id: '🏆 XP Champion',    emoji: '🏆', name: 'XP Champion',    desc: '1,000 XP earned' },
  { id: '🌟 Week Warrior',   emoji: '🌟', name: 'Week Warrior',   desc: '7-day streak' },
  { id: '📚 Scholar',        emoji: '📚', name: 'Scholar',        desc: '50 words mastered' },
  { id: '⚡ Speedster',      emoji: '⚡', name: 'Speedster',      desc: 'Quick win' },
  { id: '👑 Legend',         emoji: '👑', name: 'Legend',         desc: 'Top of the class' },
  { id: '🦉 Night Owl',      emoji: '🦉', name: 'Night Owl',      desc: 'Play after 9 PM' },
  { id: '🌅 Early Bird',     emoji: '🌅', name: 'Early Bird',     desc: 'Play before 8 AM' },
];

// Strip emoji + diacritics + whitespace for case-insensitive
// fuzzy compare so "🎯 Perfect Score" matches "Perfect Score" and
// "perfect score".  Helps teacher-awarded freeform badges line up
// with the catalogue when the wording is close.
function normalize(s: string): string {
  return s
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export default function BadgesStrip({ earned, userUid, onClaimBadgeXp }: BadgesStripProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  // Arcade theme: frosted card with a grid of earned gold tiles the
  // student taps to collect a one-shot XP reward. Falls back to the
  // scroll strip when off.
  const arcade = useFeatureFlag('arcade_hub', false);
  // Strict rule-2 gate: also catches low-memory devices, which the
  // CSS `motion-safe:` prefix (OS reduce-motion only) misses.
  const reduced = useReducedMotion();
  // Claimed-badge set is server truth (public.claimed_badges), hydrated
  // on mount. localStorage is intentionally not used — the DB ledger is
  // authoritative so clearing client storage can't re-collect XP.
  const [claimed, setClaimed] = useState<Set<string>>(new Set<string>());
  const canClaim = !!userUid && !!onClaimBadgeXp;

  useEffect(() => {
    if (!arcade || !userUid) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('claimed_badges')
        .select('badge_id')
        .eq('uid', userUid);
      if (cancelled || error || !data) return;
      setClaimed(new Set(data.map((r: { badge_id: string }) => r.badge_id)));
    })();
    return () => { cancelled = true; };
  }, [arcade, userUid]);

  const handleClaim = async (badgeId: string) => {
    if (!onClaimBadgeXp || claimed.has(badgeId)) return;
    // Optimistically flip the tile; the RPC is the source of truth, so
    // revert if it fails (offline / not-yet-migrated).
    setClaimed((prev) => new Set(prev).add(badgeId));
    const result = await onClaimBadgeXp(badgeId, BADGE_CLAIM_XP, t.badgeClaimXpToast(BADGE_CLAIM_XP));
    if (!result) {
      setClaimed((prev) => {
        const next = new Set(prev);
        next.delete(badgeId);
        return next;
      });
    }
  };
  const isEarned = (b: { id: string; name: string }) => {
    const targetId = normalize(b.id);
    const targetName = normalize(b.name);
    return earned.some(e => {
      const ne = normalize(e);
      return ne === targetId || ne === targetName;
    });
  };

  if (arcade) {
    // Hide unearned badges — they "pop in" only once earned through
    // gameplay. Count of still-claimable tiles drives the header chip.
    const earnedBadges = ALL_BADGES.filter(isEarned);
    if (earnedBadges.length === 0) return null;
    const unclaimedCount = canClaim
      ? earnedBadges.filter((b) => !claimed.has(b.id)).length
      : 0;
    return (
      <div className={`mb-6 ${ARCADE_CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
            {t.badges}
          </div>
          {unclaimedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tabular-nums px-2.5 py-1 rounded-full bg-white/15 text-amber-200">
              <Zap size={11} className="fill-amber-300 text-amber-300" />
              +{unclaimedCount * BADGE_CLAIM_XP} XP
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {earnedBadges.map((badge) => {
            const isClaimed = claimed.has(badge.id);
            const tileBody = (
              <>
                <span className="text-2xl sm:text-3xl leading-none" aria-hidden>{badge.emoji}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-950 text-center leading-tight truncate w-full">
                  {badge.name}
                </span>
                {isClaimed ? (
                  <span className="absolute top-1 end-1 rounded-full bg-white/40 p-0.5">
                    <CheckCircle2 size={12} className="text-amber-950" />
                  </span>
                ) : (
                  <span className="absolute top-1 end-1 inline-flex items-center gap-0.5 rounded-full bg-amber-950/80 text-amber-100 text-[8px] font-black px-1 py-0.5">
                    <Zap size={8} className="fill-amber-200 text-amber-200" />
                    {BADGE_CLAIM_XP}
                  </span>
                )}
              </>
            );
            const tileClass = `relative aspect-square rounded-[14px] p-1.5 flex flex-col items-center justify-center gap-1 ${ARCADE_REWARD_GRADIENT} ring-2 ring-white/40 shadow-lg shadow-amber-900/30`;
            // Reduced motion (incl. low-memory devices) → no idle pulse,
            // no hover-scale. CSS keyframes/transforms only otherwise, so
            // there's no RAF at rest.
            const hoverPop = reduced ? "" : "hover:scale-105 transition-transform";
            const idlePulse = reduced ? "" : "animate-pulse";
            // Unclaimed + claimable → a button that collects the XP.
            // Claimed (or no claim wiring) → a static, calmer tile.
            return canClaim && !isClaimed ? (
              <button
                key={badge.id}
                type="button"
                onClick={() => handleClaim(badge.id)}
                title={`${badge.name} — ${badge.desc} · +${BADGE_CLAIM_XP} XP`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`${tileClass} ${hoverPop} ${idlePulse} active:scale-95`}
              >
                {tileBody}
              </button>
            ) : (
              <div
                key={badge.id}
                title={`${badge.name} — ${badge.desc}`}
                className={`${tileClass} ${isClaimed ? 'opacity-90' : hoverPop}`}
              >
                {tileBody}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-indigo-500/[0.10] bg-white p-4 sm:p-5 mb-6"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8B5CF6]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
            />
            {t.badges}
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-[#1F1147] flex items-center gap-2">
            <Trophy size={16} className="text-amber-500 fill-amber-200" />
            {t.badges}
          </h3>
        </div>
        <span
          className="text-[11px] font-extrabold tabular-nums px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(99,102,241,0.10)",
            color: "#4A3B7A",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          }}
        >
          {earned.length} / {ALL_BADGES.length}
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {ALL_BADGES.map((badge, i) => {
          const unlocked = isEarned(badge);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              title={`${badge.name} — ${badge.desc}`}
              style={{ scrollSnapAlign: 'start' }}
              className={`shrink-0 w-16 sm:w-20 flex flex-col items-center gap-1.5 ${
                unlocked ? '' : 'opacity-40'
              }`}
            >
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] flex items-center justify-center text-2xl sm:text-3xl"
                style={
                  unlocked
                    ? {
                        background: "linear-gradient(135deg, #F5C685, #F0B96C)",
                        border: "1px solid rgba(240,185,108,0.40)",
                        boxShadow: "0 6px 16px -8px rgba(240,185,108,0.55)",
                      }
                    : {
                        background: "linear-gradient(135deg, #EEF0FF, #F8E8FF)",
                        border: "1px solid rgba(99,102,241,0.10)",
                      }
                }
              >
                {unlocked ? badge.emoji : <Lock size={18} className="text-[#8B85AB]" />}
              </div>
              <span
                className="text-[10px] sm:text-xs font-bold text-center leading-tight truncate w-full"
                style={{ color: unlocked ? "#4A3B7A" : "#8B85AB" }}
              >
                {badge.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
