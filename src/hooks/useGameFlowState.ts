import { useState } from "react";
import { type GameMode } from "../constants/game";

/**
 * The three flags that steer the game-flow surface: which mode is
 * selected, whether the mode picker is showing, and whether the
 * pre-game intro overlay is up. They gate which game screen renders
 * and flip together as the student moves picker → intro → play, so
 * they belong in one small flow-control hook.
 */
export function useGameFlowState() {
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [showModeIntro, setShowModeIntro] = useState(false);
  return {
    gameMode, setGameMode,
    showModeSelection, setShowModeSelection,
    showModeIntro, setShowModeIntro,
  };
}
