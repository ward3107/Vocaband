/**
 * GameThemePicker — three theme cards in the host controls. Tapping one
 * re-skins the live board instantly (and persists via useGameTheme). Lives
 * in the Controls sidebar, so it never shows on the projected board.
 */
import { GAME_THEME_LIST, type GameThemeId } from "../../constants/gameThemes";
import type { Language } from "../../hooks/useLanguage";

const STRINGS = {
  en: "Board theme",
  he: "ערכת נושא ללוח",
  ar: "نمط اللوحة",
} as const;

interface GameThemePickerProps {
  themeId: GameThemeId;
  onSelect: (id: GameThemeId) => void;
  language: Language;
}

export default function GameThemePicker({ themeId, onSelect, language }: GameThemePickerProps) {
  const label = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  return (
    <section className="rounded-3xl shadow-lg border p-5 bg-surface border-outline-variant">
      <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-3">{label}</h2>
      <div className="grid grid-cols-3 gap-2">
        {GAME_THEME_LIST.map((t) => {
          const active = t.id === themeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={active}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`rounded-xl p-2.5 border-2 text-center transition-all ${
                active
                  ? "border-fuchsia-500 bg-fuchsia-50 shadow-md"
                  : "border-outline-variant text-on-surface-variant hover:border-outline"
              }`}
            >
              {/* Tiny swatch so the teacher previews the skin, not just a word. */}
              <span
                className="block h-8 w-full rounded-lg mb-1.5 border border-black/10"
                style={t.page}
                aria-hidden
              />
              <span className="text-base">{t.emoji}</span>
              <span className={`block text-[10px] font-black leading-tight mt-0.5 ${active ? "text-fuchsia-700" : ""}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
