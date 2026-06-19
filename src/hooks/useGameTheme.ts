/**
 * useGameTheme — the teacher's chosen live-game skin, persisted so it sticks
 * across sessions and is shared by every live-game host (they all read the
 * same localStorage key). See constants/gameThemes for the skins.
 */
import { useState } from "react";
import { GAME_THEMES, type GameThemeId, type GameTheme } from "../constants/gameThemes";

const KEY = "vocaband-game-theme";

export function useGameTheme(): {
  themeId: GameThemeId;
  theme: GameTheme;
  setThemeId: (id: GameThemeId) => void;
} {
  const [themeId, setState] = useState<GameThemeId>(() => {
    try {
      const v = localStorage.getItem(KEY) as GameThemeId | null;
      return v && v in GAME_THEMES ? v : "dark";
    } catch {
      return "dark";
    }
  });

  const setThemeId = (id: GameThemeId) => {
    setState(id);
    try { localStorage.setItem(KEY, id); } catch { /* best-effort */ }
  };

  return { themeId, theme: GAME_THEMES[themeId], setThemeId };
}
