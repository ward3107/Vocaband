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
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500 fill-amber-200" />
          <h3 className="text-sm sm:text-base font-bold text-stone-900">{t.badges}</h3>
        </div>
        <span className="text-xs font-bold text-stone-500">
          {earned.length} / {ALL_BADGES.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
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
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl ${
                unlocked
                  ? 'bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 shadow-sm'
                  : 'bg-stone-50 border border-stone-200'
              }`}>
                {unlocked ? badge.emoji : <Lock size={18} className="text-stone-400" />}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight truncate w-full ${
                unlocked ? 'text-stone-700' : 'text-stone-400'
              }`}>
                {badge.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
