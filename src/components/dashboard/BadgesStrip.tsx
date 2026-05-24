import { motion } from "motion/react";
import { Trophy, Lock } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface BadgesStripProps {
  /** IDs (or display names) of badges the student has earned. */
  earned: string[];
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

export default function BadgesStrip({ earned }: BadgesStripProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  const isEarned = (b: { id: string; name: string }) => {
    const targetId = normalize(b.id);
    const targetName = normalize(b.name);
    return earned.some(e => {
      const ne = normalize(e);
      return ne === targetId || ne === targetName;
    });
  };

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
