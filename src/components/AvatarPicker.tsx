/**
 * AvatarPicker — the single source of truth for "pick an avatar" UI.
 *
 * Used by:
 *  - StudentAccountLoginView (new-student signup, no XP yet)
 *  - DemoMode (prospective-teacher demo — pretend XP from the sandbox)
 *  - anywhere else that needs the same design in the future
 *
 * Behaviour:
 *  - Unlocked categories shown as tabs, locked categories in dropdown
 *  - Avatars shown as BIG cards (not small buttons)
 */
import { useState } from "react";
import { Lock, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AVATAR_CATEGORIES, type AvatarCategory } from "../constants/avatars";
import { AVATAR_CATEGORY_UNLOCKS } from "../constants/game";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  /** If provided, categories above this XP show as locked. */
  xp?: number;
  /** Optional label above the picker. */
  label?: string;
  className?: string;
}

const categoryKeys = Object.keys(AVATAR_CATEGORIES) as AvatarCategory[];

export function AvatarPicker({ value, onChange, xp, label, className = "" }: AvatarPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>("Animals");
  const [lockedDropdownOpen, setLockedDropdownOpen] = useState(false);

  const isLocked = (cat: AvatarCategory): boolean => {
    if (xp === undefined) return false;
    const unlock = AVATAR_CATEGORY_UNLOCKS[cat];
    return !!unlock && xp < unlock.xpRequired;
  };

  const unlockedCategories = categoryKeys.filter(cat => !isLocked(cat));
  const lockedCategories = categoryKeys.filter(cat => isLocked(cat));

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-bold mb-3 text-on-surface-variant uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Category tabs - only unlocked */}
      <div className="mb-3 flex flex-wrap gap-1 items-center">
        {unlockedCategories.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                active
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-on-surface border-2 border-surface-container-highest hover:bg-surface-container-low"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {category}
            </button>
          );
        })}

        {/* Locked categories dropdown */}
        {lockedCategories.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setLockedDropdownOpen(!lockedDropdownOpen)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-low text-on-surface-variant/60 border-2 border-surface-container-highest hover:bg-surface-container-low flex items-center gap-1 transition-all"
              style={{ touchAction: "manipulation" }}
            >
              <Lock size={10} />
              {lockedCategories.length} locked
              <ChevronDown size={12} className={`transition-transform ${lockedDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {lockedDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setLockedDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-2xl border-2 border-surface-container-highest overflow-hidden min-w-[140px]"
                  >
                    {lockedCategories.map((category) => {
                      const unlock = AVATAR_CATEGORY_UNLOCKS[category];
                      return (
                        <div
                          key={category}
                          className="px-3 py-2 border-b border-surface-container-highest last:border-b-0 flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-bold text-on-surface-variant/70">{category}</span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 flex items-center gap-1 whitespace-nowrap">
                            <Lock size={8} />
                            {unlock?.label}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* BIG Avatar Cards Grid. Inner max-height only kicks in on sm+ —
          on mobile the grid grows naturally so the page is the single
          scroll container. Without this users couldn't find an
          outside-the-grid gutter on their phone to swipe down past
          the picker toward the Continue button. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:max-h-64 sm:overflow-y-auto p-3 bg-white rounded-2xl border-2 border-surface-container-highest">
        {AVATAR_CATEGORIES[selectedCategory].map((avatar) => (
          <motion.button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center text-5xl sm:text-6xl shadow-md ${
              value === avatar
                ? "bg-gradient-to-br from-primary/30 to-violet-30 border-primary ring-2 ring-primary shadow-lg shadow-primary/30"
                : "bg-gradient-to-br from-surface-container-low to-surface-container border-surface-container-highest hover:border-primary/50 hover:shadow-lg"
            }`}
            style={{ touchAction: "manipulation" }}
            aria-label={`Choose ${avatar} avatar`}
          >
            {avatar}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
