import { useState } from "react";
import { QUICK_PLAY_AVATAR_GROUPS } from "../constants/avatars";
import QPAvatar from "./QPAvatar";

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: string) => void;
}

/**
 * Tabbed avatar picker for the Quick Play join screen.
 *
 * Top row: horizontally scrollable group tabs (Animals / Faces /
 * Food / Sports / Space / Vehicles / Geometric).  Selected tab is
 * underlined and bolded.
 *
 * Below: a compact grid of avatar buttons for the active group.
 * The currently-selected avatar gets a primary ring + scale-up,
 * matching the previous flat picker's affordance.
 *
 * The "Geometric" group renders lucide-react vector icons via the
 * shared QPAvatar component; every other group renders emoji as
 * plain text.  Both produce strings stored on the student's
 * record (emoji literal or "lucide:Crown") so existing
 * persistence + socket payload paths don't change.
 *
 * Defaults to "Animals" tab on first mount or when the selected
 * avatar isn't found in any group (e.g. a legacy stored avatar
 * that's no longer in the pool).  Picks up the group containing
 * the current selection on subsequent mounts so the kid sees
 * their last choice highlighted.
 */
export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const groups = Object.keys(QUICK_PLAY_AVATAR_GROUPS);
  const initialGroup =
    groups.find(g => (QUICK_PLAY_AVATAR_GROUPS[g] as readonly string[]).includes(selected)) || "Animals";
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup);
  const avatars = QUICK_PLAY_AVATAR_GROUPS[activeGroup] || [];

  return (
    <div>
      <label className="block text-sm font-bold text-on-surface-variant mb-2 text-center">
        Choose your avatar
      </label>

      {/* Group tabs — horizontally scrollable on narrow phones. */}
      <div className="-mx-2 px-2 mb-3 overflow-x-auto">
        <div className="inline-flex gap-1 min-w-full">
          {groups.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                activeGroup === g
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar grid for active group.  6-col grid on narrow phones,
          8-col on wider screens to fit ~30 avatars in 4–5 rows
          without scrolling. */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {avatars.map(av => {
          const isSelected = selected === av;
          return (
            <button
              key={av}
              type="button"
              onClick={() => onSelect(av)}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-primary/20 ring-2 ring-primary scale-110"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
              aria-label={`Avatar ${av}`}
            >
              <QPAvatar value={av} iconSize={22} className="text-xl sm:text-2xl" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
