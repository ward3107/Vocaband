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
  /** matching = amber. */
  themeColor?: GameThemeColor;
  /** "Matching" pill at the top. */
  modeLabel?: string;
}

/**
 * Click-to-match: tap an English tile, then tap its translation
 * (or the other way around). No drag-line — kids on chromebooks
 * and shaky-finger tablets kept missing the drop zone, so the
 * mechanic is now strictly tap-tap.
 *
 * Layout: two columns (English left, target language right) that
 * stay vertically and horizontally centered as pairs disappear,
 * so the remaining tiles don't drift to the top of the screen.
 *
 * When a pair matches, the two tiles simply vanish via the exit
 * animation — no connecting line, no extra celebration overlay.
 */
export default function MatchingModeGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
  themeColor, modeLabel,
}: MatchingModeGameProps) {
  const themed = themeColor ? getThemeColors(themeColor) : null;

  const englishItems = matchingPairs.filter(p => p.type === 'english');
  const otherItems = matchingPairs.filter(p => p.type === 'arabic');

  const handleClick = (item: MatchItem) => {
    if (isMatchingProcessing) return;
    if (matchedIds.includes(item.id)) return;
    onMatchClick({ id: item.id, type: item.type });
  };

  const renderTile = (item: MatchItem) => {
    const key = `${item.id}-${item.type}`;
    const isMatched = matchedIds.includes(item.id);
    const isSelected = selectedMatch?.id === item.id && selectedMatch?.type === item.type;

    const bgClass = isSelected
      ? "bg-amber-500 text-white shadow-xl ring-4 ring-amber-200"
      : item.type === 'english'
        ? "bg-amber-50 text-amber-900 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
        : "bg-orange-50 text-orange-900 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300";

    return (
      <motion.button
        key={key}
        type="button"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{
          scale: [1, 1.18, 0],
          rotate: [0, 6, 0],
          opacity: [1, 1, 0],
          transition: { duration: 0.4, times: [0, 0.4, 1] },
        }}
        whileTap={{ scale: isMatchingProcessing || isMatched ? 1 : 0.96 }}
        onClick={() => handleClick(item)}
        disabled={isMatchingProcessing || isMatched}
        dir="auto"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className={`relative w-full p-3 sm:p-5 rounded-2xl shadow-md font-black text-base sm:text-xl h-16 sm:h-20 flex items-center justify-center text-center transition-colors duration-200 break-words ${bgClass} ${isMatchingProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {item.text}
      </motion.button>
    );
  };

  const visibleEnglish = englishItems.filter(item => !matchedIds.includes(item.id));
  const visibleOther = otherItems.filter(item => !matchedIds.includes(item.id));

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-5">
      {themed && modeLabel && (
        <span
          className={`inline-block ${themed.pillBg} ${themed.pillText} font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm`}
        >
          {modeLabel}
        </span>
      )}

      <p className="text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest text-center">
        Tap a card, then tap its match
      </p>

      {/* Two-column layout, horizontally centered with mx-auto on
          the wrapper and items-center inside each column so the
          remaining tiles stay centered as pairs vanish. */}
      <div className="w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 items-center">
          <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
            <AnimatePresence>
              {visibleEnglish.map(item => renderTile(item))}
            </AnimatePresence>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
            <AnimatePresence>
              {visibleOther.map(item => renderTile(item))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
