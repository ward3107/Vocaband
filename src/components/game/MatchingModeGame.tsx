import { useEffect, useRef, useState } from "react";
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

interface XY { x: number; y: number }

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
 * A brief green line still flashes between a matched pair for
 * ~400ms before they exit-animate out — pure celebration, no
 * interaction.
 */
export default function MatchingModeGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
  themeColor, modeLabel,
}: MatchingModeGameProps) {
  const themed = themeColor ? getThemeColors(themeColor) : null;

  const englishItems = matchingPairs.filter(p => p.type === 'english');
  const otherItems = matchingPairs.filter(p => p.type === 'arabic');

  const tileRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setTileRef = (key: string) => (el: HTMLElement | null) => {
    if (el) tileRefs.current.set(key, el);
    else tileRefs.current.delete(key);
  };

  const svgWrapRef = useRef<HTMLDivElement | null>(null);

  const [pairLines, setPairLines] = useState<Array<{ id: number; from: XY; to: XY }>>([]);

  const toLocal = (xy: XY): XY => {
    const wrap = svgWrapRef.current;
    if (!wrap) return xy;
    const r = wrap.getBoundingClientRect();
    return { x: xy.x - r.left, y: xy.y - r.top };
  };

  const tileCenter = (key: string): XY | null => {
    const el = tileRefs.current.get(key);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const prevMatchedRef = useRef<number[]>([]);
  useEffect(() => {
    const prev = prevMatchedRef.current;
    const newIds = matchedIds.filter(id => !prev.includes(id));
    if (newIds.length > 0) {
      const additions = newIds
        .map(id => {
          const from = tileCenter(`${id}-english`);
          const to = tileCenter(`${id}-arabic`);
          if (!from || !to) return null;
          return { id, from: toLocal(from), to: toLocal(to) };
        })
        .filter(Boolean) as Array<{ id: number; from: XY; to: XY }>;
      if (additions.length > 0) {
        setPairLines(prevLines => [...prevLines, ...additions]);
        setTimeout(() => {
          setPairLines(prevLines => prevLines.filter(l => !newIds.includes(l.id)));
        }, 400);
      }
    }
    prevMatchedRef.current = matchedIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIds]);

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
        ref={setTileRef(key) as any}
        data-match-tile=""
        data-match-id={item.id}
        data-match-type={item.type}
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
      <div ref={svgWrapRef} className="relative w-full max-w-2xl mx-auto">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {pairLines.map(pl => (
            <line
              key={pl.id}
              x1={pl.from.x}
              y1={pl.from.y}
              x2={pl.to.x}
              y2={pl.to.y}
              stroke="#10b981"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 relative items-center" style={{ zIndex: 10 }}>
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
