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
 * Phase-3a-deep matching redesign — drag-line with tap-tap fallback.
 *
 * The previous Phase-3f matching was just a bigger pair grid: same
 * tap-A-then-tap-B mechanic, just with bigger amber tiles.  Visually
 * better, mechanically still primitive.
 *
 * New layout:
 *   - English column on the LEFT, target-language column on the RIGHT.
 *     Pairs the kid has to match are obvious — same direction reading
 *     order as the textbook ("English -> Hebrew/Arabic translation").
 *   - The kid can either:
 *     (a) DRAG a finger from a left tile to a right tile.  An SVG
 *         line follows the pointer; on release over a right tile,
 *         the existing onMatchClick fires twice (left then right) to
 *         feed the parent's pair-validation logic without changing
 *         App.tsx's matching state machine.
 *     (b) TAP a left tile (highlights), then TAP a right tile (or
 *         vice-versa).  Same as the old behavior, kept as a fallback
 *         for kids who can't drag well or are using a desktop mouse.
 *   - Matched pairs render a permanent connecting LINE between the
 *     two tiles before fading out together — visual reward for the
 *     match instead of just the tiles vanishing.
 *
 * Implementation notes:
 *   - Pointer events (not touch/mouse separately) so the same code
 *     path handles fingers, mice, and styluses.  setPointerCapture
 *     keeps move/up events flowing on the originating tile even
 *     after the finger leaves it.
 *   - Drag detection threshold: 8px.  Below that, treat pointerup
 *     as a tap (selection toggle).
 *   - Hit-testing on pointerup: use document.elementFromPoint and
 *     walk up looking for a [data-match-tile] ancestor.  Avoids
 *     ref-array bookkeeping for hit boxes.
 *   - SVG layer is absolutely positioned over the column row,
 *     pointer-events: none so it never eats taps.  Lines are
 *     rendered in pixel coords relative to the SVG container.
 */
export default function MatchingModeGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
  themeColor, modeLabel,
}: MatchingModeGameProps) {
  const themed = themeColor ? getThemeColors(themeColor) : null;

  // Split pairs by type for the two-column layout.  Order is the
  // shuffled order from the parent (already pre-shuffled per round)
  // so the left list and right list don't trivially line up.
  const englishItems = matchingPairs.filter(p => p.type === 'english');
  const otherItems = matchingPairs.filter(p => p.type === 'arabic');

  // Refs to each tile's DOM, keyed by `${id}-${type}`.  Used both
  // for drag-line geometry (compute center) and for the matched-pair
  // permanent line.
  const tileRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setTileRef = (key: string) => (el: HTMLElement | null) => {
    if (el) tileRefs.current.set(key, el);
    else tileRefs.current.delete(key);
  };

  // SVG container ref used to convert global pointer XY to local SVG
  // coords for the drag line.
  const svgWrapRef = useRef<HTMLDivElement | null>(null);

  // Drag state
  const [dragFromKey, setDragFromKey] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<XY | null>(null);
  const [pointerXY, setPointerXY] = useState<XY | null>(null);

  // Track recent matched pairs so we can render a permanent line
  // between the two tiles for ~400ms before they exit-animate out.
  // Keyed by `${englishId}` (one entry per match).
  const [pairLines, setPairLines] = useState<Array<{ id: number; from: XY; to: XY }>>([]);

  /** Convert a viewport-coords point into the SVG container's local
   *  coords (so the SVG line draws relative to the layer, not the
   *  page). */
  const toLocal = (xy: XY): XY => {
    const wrap = svgWrapRef.current;
    if (!wrap) return xy;
    const r = wrap.getBoundingClientRect();
    return { x: xy.x - r.left, y: xy.y - r.top };
  };

  /** Center of a tile in viewport coords. */
  const tileCenter = (key: string): XY | null => {
    const el = tileRefs.current.get(key);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Compute an animated permanent line whenever a new match lands.
  // Runs when matchedIds grows.  The lines fade out alongside the
  // tile exit animation.
  const prevMatchedRef = useRef<number[]>([]);
  useEffect(() => {
    const prev = prevMatchedRef.current;
    const newIds = matchedIds.filter(id => !prev.includes(id));
    if (newIds.length > 0) {
      const additions = newIds
        .map(id => {
          const fromKey = `${id}-english`;
          const toKey = `${id}-arabic`;
          const from = tileCenter(fromKey);
          const to = tileCenter(toKey);
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
    // Tile centers depend on layout, which depends on which tiles
    // are still rendered.  matchedIds is the trigger; everything
    // else is read off refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIds]);

  /** Walk up from the pointerup target looking for a tile we own. */
  const findTileAtPoint = (clientX: number, clientY: number): { id: number; type: 'english' | 'arabic'; key: string } | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const tile = el.closest('[data-match-tile]') as HTMLElement | null;
    if (!tile) return null;
    const id = Number(tile.dataset.matchId);
    const type = tile.dataset.matchType as 'english' | 'arabic';
    if (Number.isNaN(id) || !type) return null;
    return { id, type, key: `${id}-${type}` };
  };

  const handlePointerDown = (item: MatchItem, e: React.PointerEvent<HTMLButtonElement>) => {
    if (isMatchingProcessing) return;
    if (matchedIds.includes(item.id)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const key = `${item.id}-${item.type}`;
    setDragFromKey(key);
    const center = tileCenter(key) ?? { x: e.clientX, y: e.clientY };
    setDragStart(center);
    setPointerXY({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragFromKey) return;
    setPointerXY({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (item: MatchItem, e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragFromKey || !dragStart || !pointerXY) {
      // Tap with no prior pointerdown captured -- shouldn't happen
      // but be safe.  Treat as a normal tap.
      onMatchClick({ id: item.id, type: item.type });
      return;
    }
    const dx = pointerXY.x - dragStart.x;
    const dy = pointerXY.y - dragStart.y;
    const moved = Math.hypot(dx, dy);
    const startKey = dragFromKey;

    // Reset drag state regardless of outcome.
    setDragFromKey(null);
    setDragStart(null);
    setPointerXY(null);

    if (moved < 8) {
      // Tap mode -- defer to existing select-then-confirm logic.
      onMatchClick({ id: item.id, type: item.type });
      return;
    }

    // Drag mode -- find what's under the finger on release.
    const target = findTileAtPoint(e.clientX, e.clientY);
    if (!target) return; // released into empty space; cancel silently

    // Pull the start item from the captured key.
    const [startIdStr, startType] = startKey.split('-');
    const startId = Number(startIdStr);
    if (Number.isNaN(startId)) return;

    // No-op if released back on the same tile.
    if (target.id === startId && target.type === startType) return;

    // Fire two onMatchClick calls in sequence.  The parent's match
    // state machine selects on first call, validates on second --
    // exactly what tap-tap does.
    onMatchClick({ id: startId, type: startType as 'english' | 'arabic' });
    onMatchClick({ id: target.id, type: target.type });
  };

  const handlePointerCancel = () => {
    setDragFromKey(null);
    setDragStart(null);
    setPointerXY(null);
  };

  /** Tile renderer.  type-specific tint (amber for English, orange
   *  for target language).  Selected state, dragging-from state,
   *  and matched/processing states all have distinct visuals. */
  const renderTile = (item: MatchItem) => {
    const key = `${item.id}-${item.type}`;
    const isMatched = matchedIds.includes(item.id);
    const isSelected = selectedMatch?.id === item.id && selectedMatch?.type === item.type;
    const isDragSource = dragFromKey === key;

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
          // Pop-and-vanish — same celebratory exit Phase 3f used.
          scale: [1, 1.18, 0],
          rotate: [0, 6, 0],
          opacity: [1, 1, 0],
          transition: { duration: 0.4, times: [0, 0.4, 1] },
        }}
        whileTap={{ scale: isMatchingProcessing || isMatched ? 1 : 0.96 }}
        onPointerDown={(e) => handlePointerDown(item, e)}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(item, e)}
        onPointerCancel={handlePointerCancel}
        disabled={isMatchingProcessing || isMatched}
        dir="auto"
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        className={`relative p-3 sm:p-5 rounded-2xl shadow-md font-black text-base sm:text-xl h-16 sm:h-20 flex items-center justify-center transition-colors duration-200 break-words ${bgClass} ${isDragSource ? 'ring-4 ring-amber-300' : ''} ${isMatchingProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {item.text}
      </motion.button>
    );
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
        Tap two cards or drag a line between them
      </p>

      {/* Two-column layout with SVG overlay for drag-line + matched
          pair lines.  The SVG sits BEHIND the columns (z-0) and the
          tiles are z-10 so taps never get intercepted. */}
      <div ref={svgWrapRef} className="relative w-full max-w-2xl">
        {/* SVG overlay — lives behind the tiles.  pointer-events: none
            so it never eats input.  Renders both the live drag line
            (during a drag) and any active matched-pair lines (the
            ~400ms after a match before tiles exit-animate out). */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {dragFromKey && dragStart && pointerXY && (() => {
            const startLocal = toLocal(dragStart);
            const endLocal = toLocal(pointerXY);
            return (
              <line
                x1={startLocal.x}
                y1={startLocal.y}
                x2={endLocal.x}
                y2={endLocal.y}
                stroke="#f59e0b"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="0"
                opacity={0.85}
              />
            );
          })()}
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

        <div className="grid grid-cols-2 gap-3 sm:gap-6 relative" style={{ zIndex: 10 }}>
          <div className="flex flex-col gap-2 sm:gap-3">
            <AnimatePresence>
              {englishItems.filter(item => !matchedIds.includes(item.id)).map(item => renderTile(item))}
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3">
            <AnimatePresence>
              {otherItems.filter(item => !matchedIds.includes(item.id)).map(item => renderTile(item))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
