import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { QUICK_PLAY_AVATAR_GROUPS } from "../constants/avatars";
import QPAvatar from "./QPAvatar";
import { useLanguage } from "../hooks/useLanguage";
import { gameAriasT } from "../locales/student/game-arias";

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: string) => void;
}

const LABEL: Record<string, string> = {
  en: "Choose your avatar",
  he: "בחרו אווטאר",
  ar: "اختر صورتك الرمزية",
  ru: "Выбери аватар",
};

const SCROLL_HINT: Record<string, string> = {
  en: "Scroll for more",
  he: "גללו לעוד",
  ar: "مرّر لمزيد",
  ru: "Прокрути для большего",
};

// Localized tab labels — the underlying group key stays English so the
// constants file is the single source of truth, but the visible label
// matches the student's UI language.
const GROUP_LABEL: Record<string, Record<string, string>> = {
  Animals:   { en: "Animals",   he: "חיות",      ar: "حيوانات", ru: "Животные" },
  Faces:     { en: "Faces",     he: "פרצופים",   ar: "وجوه",    ru: "Лица" },
  Food:      { en: "Food",      he: "אוכל",      ar: "طعام",    ru: "Еда" },
  Sports:    { en: "Sports",    he: "ספורט",     ar: "رياضة",   ru: "Спорт" },
  Space:     { en: "Space",     he: "חלל",       ar: "فضاء",    ru: "Космос" },
  Vehicles:  { en: "Vehicles",  he: "כלי רכב",   ar: "مركبات",  ru: "Транспорт" },
  Geometric: { en: "Shapes",    he: "צורות",     ar: "أشكال",   ru: "Фигуры" },
};

/**
 * Tabbed avatar picker for the Quick Play join screen.
 *
 * Top row: horizontally scrollable group tabs (Animals / Faces /
 * Food / Sports / Space / Vehicles / Geometric).  Selected tab is
 * underlined and bolded.
 *
 * Below: a constrained-height grid of avatar buttons for the active
 * group. The grid scrolls inside its container (max-h-44) so the
 * overall page doesn't grow unbounded — the bottom fade + scroll
 * hint chip telegraph that there's more below the fold. Before this
 * gate kids saw the first 12 avatars and concluded "that's all" —
 * even though every group has 30.
 *
 * Selected avatar gets a thick emerald ring + checkmark badge +
 * spring scale so the choice is obvious from a metre away (kids on
 * a phone in a noisy classroom).
 */
export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const { language } = useLanguage();
  const groups = Object.keys(QUICK_PLAY_AVATAR_GROUPS);
  const initialGroup =
    groups.find(g => (QUICK_PLAY_AVATAR_GROUPS[g] as readonly string[]).includes(selected)) || "Animals";
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup);
  const avatars = QUICK_PLAY_AVATAR_GROUPS[activeGroup] || [];

  // Track whether the grid is scrolled to the bottom so we can fade
  // the "more below" hint out once the kid has seen everything.
  const gridRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const check = () => {
      // 2px slack for sub-pixel rounding.
      setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [activeGroup]);

  const label = LABEL[language] ?? LABEL.en;
  const scrollHint = SCROLL_HINT[language] ?? SCROLL_HINT.en;
  const tAria = gameAriasT[language];

  return (
    <div>
      <label className="block text-sm font-bold text-on-surface-variant mb-2 text-center">
        {label}
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
              {GROUP_LABEL[g]?.[language] ?? GROUP_LABEL[g]?.en ?? g}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar grid for active group — internally scrollable so the
          rest of the join form stays above the fold. Bottom fade +
          scroll hint chip surface the affordance to a 9-year-old. */}
      <div className="relative">
        <div
          ref={gridRef}
          className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-44 sm:max-h-52 overflow-y-auto pr-1 scroll-smooth"
        >
          {avatars.map(av => {
            const isSelected = selected === av;
            return (
              <motion.button
                key={av}
                type="button"
                onClick={() => onSelect(av)}
                animate={isSelected ? { scale: 1.15 } : { scale: 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-emerald-100 ring-4 ring-emerald-500 shadow-md shadow-emerald-500/30"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                }`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
                aria-label={tAria.selectAvatar(av)}
                aria-pressed={isSelected}
              >
                <QPAvatar value={av} iconSize={22} className="text-xl sm:text-2xl" />
                {/* Checkmark badge — paired with the ring so the
                    selection reads even for kids who don't notice
                    subtle colour shifts. */}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Bottom fade + "scroll for more" chip — only visible when
            there's still content below. Pointer-events-none so the
            chip never blocks taps on the grid underneath. */}
        {!atBottom && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface to-transparent rounded-b-lg" />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900/80 text-white text-[10px] font-bold shadow"
            >
              ↓ {scrollHint}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
