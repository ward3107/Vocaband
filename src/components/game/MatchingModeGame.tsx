import { motion, AnimatePresence } from "framer-motion";
import { getThemeColors, type GameThemeColor } from "./GameShell";

type MatchItem = { id: number; text: string; type: 'english' | 'arabic' };
type MatchSelection = { id: number; type: 'english' | 'arabic' };

interface MatchingModeGameProps {
  matchingPairs: MatchItem[];
  matchedIds: number[];
  selectedMatch: MatchSelection | null;
  isMatchingProcessing: boolean;
  onMatchClick: (item: MatchSelection) => void;
  /** Phase-3f theme — drives the mode pill and the selected-tile ring.
   *  matching = amber. */
  themeColor?: GameThemeColor;
  /** Short uppercase label for the mode pill at the top
   *  (e.g. "Matching"). */
  modeLabel?: string;
}

/**
 * Phase-3f redesign (2026-04-30):
 *
 * Matching now has a real visual identity instead of generic
 * stone-100 / blue-600 tiles.  Two key shifts:
 *
 *   1. PAIR DIFFERENTIATION.  English tiles and target-language tiles
 *      now use sibling tints (amber for English, orange for target).
 *      Same family — both warm, both clearly part of the "matching"
 *      theme — but distinct enough that the kid can scan the grid and
 *      see "I tap one warm-yellow then one warm-orange and they pair".
 *      Without this, a 6-tile grid is a wall of identical white cards
 *      and kids tap blindly.
 *
 *   2. CELEBRATORY MATCH-OUT.  Old code shrank a matched tile to 0.4
 *      and faded it.  New code pops the tile (scale 1 → 1.18) then
 *      shrinks (1.18 → 0) with a small rotate, all in 0.4s.  Feels
 *      like a balloon popping, which is exactly the dopamine cue we
 *      want — kids hit the match, see the celebration, want to do it
 *      again.
 *
 * Tile sizing bumps: h-20 → h-24 mobile (96px tap), h-32 → h-36
 * desktop, p-3 → p-4 mobile, gap-1.5 → gap-2 mobile.  Selected state
 * uses a thick theme-coloured ring instead of the old stock blue.
 *
 * The mode-label pill ("MATCHING") renders inside this component so
 * the matching mode — which doesn't sit inside the standard answer
 * card in GameActiveView — still gets the consistent Phase-3 chrome.
 */
export default function MatchingModeGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
  themeColor, modeLabel,
}: MatchingModeGameProps) {
  const themed = themeColor ? getThemeColors(themeColor) : null;

  // English vs target-language tiles get sibling tints in the warm
  // family so the pairing direction reads at a glance.  Both are
  // resolved as literal Tailwind class strings so JIT picks them up.
  const tileFor = (type: 'english' | 'arabic', selected: boolean) => {
    if (selected) {
      return "bg-amber-500 text-white shadow-xl ring-4 ring-amber-200";
    }
    return type === 'english'
      ? "bg-amber-50 text-amber-900 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
      : "bg-orange-50 text-orange-900 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300";
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 sm:gap-5">
      {themed && modeLabel && (
        <span
          className={`inline-block ${themed.pillBg} ${themed.pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}
        >
          {modeLabel}
        </span>
      )}

      <motion.div
        key="matching"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3"
      >
        <AnimatePresence>
          {matchingPairs.filter(item => !matchedIds.includes(item.id)).map((item, idx) => {
            const key = `${item.id}-${item.type}-${idx}`;
            const selected = selectedMatch?.id === item.id && selectedMatch?.type === item.type;
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  // Pop-and-vanish — tile briefly grows past 1.0 then
                  // shrinks to nothing with a subtle rotate.  Three
                  // keyframes in 0.4s.
                  scale: [1, 1.18, 0],
                  rotate: [0, 6, 0],
                  opacity: [1, 1, 0],
                  transition: { duration: 0.4, times: [0, 0.4, 1] },
                }}
                whileHover={{ scale: isMatchingProcessing ? 1 : 1.05 }}
                whileTap={{ scale: isMatchingProcessing ? 1 : 0.95 }}
                onClick={() => onMatchClick(item)}
                onTouchStart={(e) => { if (!isMatchingProcessing && !matchedIds.includes(item.id)) e.currentTarget.click(); }}
                disabled={isMatchingProcessing}
                dir="auto"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md font-black text-lg sm:text-2xl h-24 sm:h-36 flex items-center justify-center transition-all duration-200 break-words ${tileFor(item.type, selected)} ${isMatchingProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {item.text}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
