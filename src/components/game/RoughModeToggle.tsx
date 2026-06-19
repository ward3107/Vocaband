/**
 * RoughModeToggle — the Word Hunt Arena "Gentle / Rough" switch. Rough mode
 * turns on dash-tackle PvP (students get a Dash button and can bump opponents
 * to stun them). Self-contained copy (en/he/ar) so the host view drops it in
 * without growing its own strings — same shape as TeamModeToggle.
 */
import { useLanguage } from "../../hooks/useLanguage";

interface RoughModeToggleProps {
  roughMode: boolean;
  onToggle: (enabled: boolean) => void;
  /** Heading tint, to match the host's palette (defaults to indigo). */
  headingClass?: string;
  /** Idle-button class from the host (matches its other pill buttons). */
  idleClass?: string;
  /** Card wrapper class from the host (matches its other sidebar cards). */
  cardClass?: string;
  /** Disabled until a hunt is live — rough mode only means something on a live
   *  arena (the server ignores the toggle otherwise). */
  disabled?: boolean;
}

const STRINGS = {
  en: { rough: "Rough mode", gentle: "Gentle", rowdy: "Dash & tackle", hint: "Start a hunt to enable" },
  he: { rough: "מצב מחוספס", gentle: "עדין", rowdy: "זינוק וחבטות", hint: "התחילו ציד כדי להפעיל" },
  ar: { rough: "الوضع الخشن", gentle: "لطيف", rowdy: "اندفاع وعرقلة", hint: "ابدأ صيدًا للتفعيل" },
} as const;

export default function RoughModeToggle({
  roughMode,
  onToggle,
  headingClass = "text-indigo-500",
  idleClass = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline",
  cardClass = "",
  disabled = false,
}: RoughModeToggleProps) {
  const { language } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  return (
    <section className={`rounded-3xl shadow-lg border p-5 ${cardClass} ${disabled ? "opacity-60" : ""}`}>
      <h2 className={`text-xs font-black uppercase tracking-widest mb-3 ${headingClass}`}>{t.rough}</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(false)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition disabled:cursor-not-allowed ${!roughMode ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-md" : idleClass}`}
        >
          {t.gentle}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(true)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition disabled:cursor-not-allowed ${roughMode ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white border-transparent shadow-md" : idleClass}`}
        >
          💨 {t.rowdy}
        </button>
      </div>
      {disabled && <p className="mt-2 text-xs font-bold text-stone-400">{t.hint}</p>}
    </section>
  );
}
