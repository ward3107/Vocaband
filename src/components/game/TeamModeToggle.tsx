/**
 * TeamModeToggle — the lobby "Solo / Red vs Blue" switch for the live
 * games. Self-contained (owns its en/he/ar copy) so each host view can
 * drop it in without growing its own strings. Calls back with the chosen
 * mode; the host passes its teacher token through to setTeamMode.
 */
import { useLanguage } from "../../hooks/useLanguage";

interface TeamModeToggleProps {
  teamMode: boolean;
  onToggle: (enabled: boolean) => void;
  /** Heading tint, to match the host's palette (defaults to fuchsia). */
  headingClass?: string;
  /** Idle-button class from the host (matches its other pill buttons). */
  idleClass?: string;
  /** Card wrapper class from the host (matches its other sidebar cards). */
  cardClass?: string;
}

const STRINGS = {
  en: { teams: "Teams", solo: "Solo", redBlue: "Red vs Blue" },
  he: { teams: "קבוצות", solo: "יחידני", redBlue: "אדום נגד כחול" },
  ar: { teams: "فرق", solo: "فردي", redBlue: "أحمر ضد أزرق" },
} as const;

export default function TeamModeToggle({
  teamMode,
  onToggle,
  headingClass = "text-fuchsia-500",
  idleClass = "bg-surface border-outline-variant text-on-surface-variant hover:border-outline",
  cardClass = "",
}: TeamModeToggleProps) {
  const { language } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  return (
    <section className={`rounded-3xl shadow-lg border p-5 ${cardClass}`}>
      <h2 className={`text-xs font-black uppercase tracking-widest mb-3 ${headingClass}`}>{t.teams}</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onToggle(false)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition ${!teamMode ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-md" : idleClass}`}
        >
          {t.solo}
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className={`px-3 py-2.5 rounded-xl font-black text-sm border-2 transition ${teamMode ? "bg-gradient-to-r from-rose-500 to-sky-600 text-white border-transparent shadow-md" : idleClass}`}
        >
          🟥🟦 {t.redBlue}
        </button>
      </div>
    </section>
  );
}
