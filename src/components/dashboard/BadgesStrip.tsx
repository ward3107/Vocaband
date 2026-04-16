import { motion } from "motion/react";
import { Trophy, Lock } from "lucide-react";

interface BadgesStripProps {
  /** IDs (or display names) of badges the student has earned. */
  earned: string[];
}

// Canonical badge catalogue — the student earns these when the backend
// awards them. This list lets us show locked placeholders alongside the
// earned ones so students see what they can still collect.
const ALL_BADGES: Array<{ id: string; emoji: string; name: string; desc: string }> = [
  { id: 'first_win',   emoji: '🎯', name: 'First Win',      desc: 'Complete your first assignment' },
  { id: 'streak_3',    emoji: '🔥', name: '3-Day Streak',    desc: 'Play 3 days in a row' },
  { id: 'streak_7',    emoji: '🌟', name: 'Week Warrior',    desc: '7-day streak' },
  { id: 'streak_30',   emoji: '💎', name: 'Diamond Streak',  desc: '30-day streak' },
  { id: 'perfect',     emoji: '💯', name: 'Perfect Round',   desc: '100% on any mode' },
  { id: 'speedster',   emoji: '⚡', name: 'Speedster',       desc: 'Finish a game in record time' },
  { id: 'scholar',     emoji: '📚', name: 'Scholar',         desc: '50 words mastered' },
  { id: 'legend',      emoji: '👑', name: 'Legend',          desc: '500 XP earned' },
  { id: 'night_owl',   emoji: '🦉', name: 'Night Owl',       desc: 'Play after 9 PM' },
  { id: 'early_bird',  emoji: '🌅', name: 'Early Bird',      desc: 'Play before 8 AM' },
];

export default function BadgesStrip({ earned }: BadgesStripProps) {
  // Match earned badges by either canonical id OR loose name match
  // (existing badges might be stored as free text).
  const isEarned = (b: { id: string; name: string }) =>
    earned.some(e => e === b.id || e.toLowerCase() === b.name.toLowerCase());

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500 fill-amber-200" />
          <h3 className="text-sm sm:text-base font-bold text-stone-900">Badges</h3>
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
