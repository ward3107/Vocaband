/**
 * AvatarPicker — the single source of truth for "pick an avatar" UI.
 *
 * Used by:
 *  - StudentAccountLoginView (new-student signup, no XP yet)
 *  - DemoMode (prospective-teacher demo — pretend XP from the sandbox)
 *  - anywhere else that needs the same design in the future
 *
 * Behaviour:
 *  - Pill-style category tabs at the top, 5-col scrollable emoji grid below.
 *  - If `xp` is provided, categories that require more XP show a small lock
 *    pill with the XP requirement, and clicking them does nothing (so the
 *    UX matches what a logged-in student sees).
 *  - Without `xp`, all categories are clickable (signup flow — user has no
 *    XP yet, and we still want them to be able to pick a premium-looking
 *    avatar so the app feels rewarding from the start).
 */
import { useState } from "react";
import { Lock } from "lucide-react";
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

  const isLocked = (cat: AvatarCategory): boolean => {
    if (xp === undefined) return false;
    const unlock = AVATAR_CATEGORY_UNLOCKS[cat];
    return !!unlock && xp < unlock.xpRequired;
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Category tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {categoryKeys.map((category) => {
          const locked = isLocked(category);
          const active = selectedCategory === category;
          const unlock = AVATAR_CATEGORY_UNLOCKS[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => {
                if (!locked) setSelectedCategory(category);
              }}
              disabled={locked}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                active
                  ? "bg-primary text-white"
                  : locked
                  ? "bg-surface-container-low text-on-surface-variant/40 cursor-not-allowed"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {locked && <Lock size={10} />}
              {category}
              {locked && unlock && (
                <span className="text-[10px] opacity-70">· {unlock.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest">
        {AVATAR_CATEGORIES[selectedCategory].map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
              value === avatar
                ? "bg-primary/20 ring-2 ring-primary"
                : "hover:bg-surface-container"
            }`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label={`Choose ${avatar} avatar`}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  );
}
