/**
 * Deterministic layout for the mode-island map. Islands are placed down a
 * scrollable column in alternating lanes with a fixed per-index vertical
 * nudge, producing a "scattered archipelago" look that is identical on
 * every render (no randomness) so islands never jump between frames.
 */
export interface IslandPos {
  /** Horizontal centre as a % of the map width. */
  xPct: number;
  /** Vertical centre in px from the top of the scrollable map. */
  y: number;
}

// Lanes (% width) cycled per index to scatter the islands left/centre/right.
const LANES = [24, 70, 44, 78, 32, 60];
// Deterministic vertical nudge per index (range ±12, well under GAP so the
// strict top-to-bottom ordering is preserved).
const JITTER = [0, -12, 8, -8, 12, -4];
const TOP = 100; // px below the fixed header before the first island
const GAP = 118; // vertical spacing between consecutive islands
const BOTTOM_PAD = 150; // space below the last island (pet + label clearance)

export function computeIslandPositions(count: number): IslandPos[] {
  const out: IslandPos[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      xPct: LANES[i % LANES.length],
      y: TOP + i * GAP + JITTER[i % JITTER.length],
    });
  }
  return out;
}

export function mapHeight(count: number): number {
  if (count <= 0) return 0;
  const pos = computeIslandPositions(count);
  return pos[count - 1].y + BOTTOM_PAD;
}
