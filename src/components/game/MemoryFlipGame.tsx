import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";
import { getThemeColors, type GameThemeColor } from "./GameShell";

type MatchItem = { id: number; text: string; type: 'english' | 'arabic' };
type MatchSelection = { id: number; type: 'english' | 'arabic' };

interface MemoryFlipGameProps {
  matchingPairs: MatchItem[];
  matchedIds: number[];
  selectedMatch: MatchSelection | null;
  isMatchingProcessing: boolean;
  onMatchClick: (item: MatchSelection) => void;
  /** memory-flip = pink. */
  themeColor?: GameThemeColor;
  /** "Memory Flip" pill at the top. */
  modeLabel?: string;
}

/**
 * Memory Flip — a new mode (Phase 3b extension).
 *
 * Same data + state machine as Matching: 12 cards (6 pairs of
 * english + target translation) generated from a 6-word slice of
 * the round's word pool.  Same parent-side validation: tap one,
 * tap another, parent's onMatchClick fires the select-then-validate
 * dance.  matchedIds tracks pairs that have landed.
 *
 * Difference from Matching: cards START FACE-DOWN.  The kid taps a
 * card to flip it face-up, sees the text, then taps another to test
 * the pair.  If they match, both stay face-up.  If they don't match,
 * both flip back after a short delay so the kid sees what they
 * tapped and can update their mental map.
 *
 * UX:
 *   - 4-column grid on mobile (3 rows of 4 = 12 cards), 6-column on
 *     wider screens.
 *   - Face-down design: pink gradient with a Brain icon.  Same on
 *     every card so the kid can't peek.
 *   - Face-up design: theme-tinted card with the text (English or
 *     target language).
 *   - Spring rotateY flip animation (perspective + transform-style:
 *     preserve-3d) — same technique as Flashcards.
 *
 * State plumbing:
 *   - revealedKeys: Set<string> — local state of which cards are
 *     currently flipped face-up by player taps (NOT yet matched).
 *   - When matchedIds grows, clear revealedKeys (the matched cards
 *     stay face-up via the matchedIds check; the local set is just
 *     for the in-flight attempt).
 *   - When isMatchingProcessing transitions false AND no new match,
 *     after a 200ms grace period clear revealedKeys so the failed
 *     pair flips back together.
 */
export default function MemoryFlipGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
  themeColor, modeLabel,
}: MemoryFlipGameProps) {
  const themed = themeColor ? getThemeColors(themeColor) : null;

  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Watch the processing flag.  When it transitions from true to
  // false, the parent's "wrong pair" animation just finished — flip
  // any non-matched revealed cards back face-down.  Adds a 100ms
  // grace so the kid sees a beat of "wrong" feedback.
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    if (wasProcessingRef.current && !isMatchingProcessing) {
      const t = setTimeout(() => setRevealedKeys(new Set()), 100);
      wasProcessingRef.current = isMatchingProcessing;
      return () => clearTimeout(t);
    }
    wasProcessingRef.current = isMatchingProcessing;
    return undefined;
  }, [isMatchingProcessing]);

  // When matchedIds grows, the just-revealed pair is now matched —
  // clear local revealed since matchedIds takes over the face-up
  // bookkeeping for those cards.
  useEffect(() => {
    setRevealedKeys(new Set());
  }, [matchedIds.length]);

  const isFaceUp = (item: MatchItem) => {
    const key = `${item.id}-${item.type}`;
    if (matchedIds.includes(item.id)) return true;
    if (selectedMatch?.id === item.id && selectedMatch?.type === item.type) return true;
    return revealedKeys.has(key);
  };

  const handleTap = (item: MatchItem) => {
    if (isMatchingProcessing) return;
    if (matchedIds.includes(item.id)) return;
    const key = `${item.id}-${item.type}`;
    if (revealedKeys.has(key)) return; // already face-up this turn
    setRevealedKeys(prev => new Set([...prev, key]));
    onMatchClick({ id: item.id, type: item.type });
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

      <p className="text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest text-center">
        Find all the pairs
      </p>

      <motion.div
        key="memory-flip"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3"
      >
        <AnimatePresence>
          {matchingPairs.map((item) => {
            const key = `${item.id}-${item.type}`;
            const faceUp = isFaceUp(item);
            const isMatched = matchedIds.includes(item.id);
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  // Matched pairs pop briefly then shrink away.  Same
                  // celebratory exit as Matching's pop-and-vanish.
                  scale: [1, 1.18, 0],
                  opacity: [1, 1, 0],
                  transition: { duration: 0.4, times: [0, 0.4, 1] },
                }}
                className="[perspective:1000px]"
              >
                <button
                  type="button"
                  onClick={() => handleTap(item)}
                  disabled={isMatchingProcessing || isMatched}
                  dir="auto"
                  aria-label={faceUp ? `Card showing ${item.text}` : "Face-down card, tap to reveal"}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="relative w-full aspect-[3/4] cursor-pointer disabled:cursor-default"
                >
                  <motion.div
                    animate={{ rotateY: faceUp ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className="relative w-full h-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* FACE DOWN — pink gradient + Brain icon. */}
                    <div
                      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-md flex items-center justify-center text-white"
                      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                    >
                      <Brain size={28} className="opacity-90" />
                    </div>

                    {/* FACE UP — theme-tinted card with the text.
                        English vs target tints differ slightly so the
                        kid sees which side they're matching at a
                        glance once flipped. */}
                    <div
                      className={`absolute inset-0 rounded-2xl shadow-md p-2 flex items-center justify-center text-center break-words font-black text-sm sm:text-lg border-2 ${
                        item.type === 'english'
                          ? 'bg-pink-50 text-pink-900 border-pink-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      } ${isMatched ? 'ring-4 ring-emerald-400' : ''}`}
                      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      {item.text}
                    </div>
                  </motion.div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
