/**
 * TeamSwitcher — the student-side team widget for the live games (the
 * hybrid "Switch team" button). Shows which team the student is on and a
 * one-tap switch to the other side. The server only honours the switch if
 * it keeps the teams balanced, and the displayed team comes from the
 * leaderboard (server truth), so a rejected switch simply doesn't change.
 *
 * Render only when team mode is on (the caller gates on `teamMode`).
 * Owns its own en/he/ar copy.
 */
import { useLanguage } from "../../hooks/useLanguage";
import type { QpTeam } from "../../core/quickPlayProtocol";

interface TeamSwitcherProps {
  /** The student's current team (from the leaderboard). */
  team?: QpTeam;
  onSwitch: (team: QpTeam) => void;
  className?: string;
}

const STRINGS = {
  en: { onTeam: "You're on", red: "Red", blue: "Blue", team: "team", switchTo: (t: string) => `Switch to ${t}` },
  he: { onTeam: "אתם בקבוצה", red: "האדומה", blue: "הכחולה", team: "", switchTo: (t: string) => `עברו ל${t}` },
  ar: { onTeam: "أنت في الفريق", red: "الأحمر", blue: "الأزرق", team: "", switchTo: (t: string) => `انتقل إلى ${t}` },
} as const;

const TEAM_STYLE: Record<QpTeam, { chip: string; dot: string }> = {
  red: { chip: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  blue: { chip: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
};

export default function TeamSwitcher({ team, onSwitch, className = "" }: TeamSwitcherProps) {
  const { language } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  if (!team) return null;

  const other: QpTeam = team === "red" ? "blue" : "red";
  const teamLabel = team === "red" ? t.red : t.blue;
  const otherLabel = other === "red" ? t.red : t.blue;
  const style = TEAM_STYLE[team];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-black ${style.chip}`}>
        <span className={`inline-block w-3 h-3 rounded-full ${style.dot}`} />
        {t.onTeam} {teamLabel} {t.team}
      </span>
      <button
        type="button"
        onClick={() => onSwitch(other)}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        className="inline-flex items-center justify-center rounded-full border-2 border-stone-200 bg-white px-4 py-1.5 text-sm font-black text-stone-600 active:scale-95 transition"
      >
        {t.switchTo(otherLabel)}
      </button>
    </div>
  );
}
