/**
 * gameThemes — selectable "skins" (wrappers) for the live-game host board.
 *
 * The CONTENT is identical across themes (big, high-contrast student names +
 * scores); a theme only changes the wrapper: the page background, the
 * leaderboard/lobby card surface, the name/score colours and the race-lane
 * track. Teachers pick one in the host controls; the choice persists in
 * localStorage (see useGameTheme) and applies to every live game.
 *
 * Keep the student name BIG and legible in every theme — that's the whole
 * point (teachers read it from the back of the room).
 */
import type { CSSProperties } from "react";

export type GameThemeId = "dark" | "glass" | "toy";

export interface GameTheme {
  id: GameThemeId;
  /** Short label shown in the picker. */
  label: string;
  emoji: string;
  /** Root host-page background (inline style — gradients). */
  page: CSSProperties;
  /** Leaderboard / lobby card surface (Tailwind classes). */
  card: string;
  /** Big student-name text colour. */
  name: string;
  /** Score / accent text colour. */
  score: string;
  /** Secondary / muted text (counts, labels, empty states). */
  muted: string;
  /** Race-lane track background (Category Race / Speed Round lanes). */
  track: string;
}

export const GAME_THEMES: Record<GameThemeId, GameTheme> = {
  dark: {
    id: "dark",
    label: "Dark Clean",
    emoji: "🌑",
    // A magenta "stage spotlight" glows from the top over a deep purple-navy
    // base — game-show energy while names stay white-on-dark.
    page: { backgroundImage: "radial-gradient(130% 90% at 50% -15%, #7c2d92 0%, rgba(124,45,146,0) 55%), linear-gradient(135deg,#0b1020,#2e1065 60%,#1e1b4b)" },
    card: "bg-[#111a30]/90 border border-white/10 shadow-lg",
    name: "text-white",
    score: "text-amber-300",
    muted: "text-slate-400",
    track: "bg-white/10",
  },
  glass: {
    id: "glass",
    label: "Glass / Aurora",
    emoji: "❄️",
    // Hot-pink spotlight over the teal→violet→pink aurora — bolder, still glassy.
    page: { backgroundImage: "radial-gradient(130% 90% at 50% -15%, rgba(244,63,94,0.55) 0%, rgba(244,63,94,0) 55%), linear-gradient(135deg,#0d9488,#6d28d9 52%,#db2777)" },
    card: "bg-white/15 backdrop-blur-xl border border-white/30 shadow-xl",
    name: "text-white",
    score: "text-white",
    muted: "text-white/70",
    track: "bg-white/20",
  },
  toy: {
    id: "toy",
    label: "Toy World",
    emoji: "🧸",
    // Sunny spotlight over a punchier candy gradient — brighter pop, names stay dark.
    page: { backgroundImage: "radial-gradient(120% 85% at 50% -10%, #fde047 0%, rgba(253,224,71,0) 48%), linear-gradient(180deg,#a5b4fc,#f9a8d4)" },
    card: "bg-white/85 border border-white shadow-lg",
    name: "text-violet-900",
    score: "text-orange-600",
    muted: "text-violet-400",
    track: "bg-violet-200",
  },
};

export const GAME_THEME_LIST: GameTheme[] = Object.values(GAME_THEMES);
