/** Find the largest balanced cards that fit the measured projector area. */
export function quickPlayBoardLayout(width: number, height: number, count: number) {
  const safeWidth = Math.max(1, width), safeHeight = Math.max(1, height);
  const total = Math.max(1, count), gap = 8;
  if (width < 768) {
    const columns = width < 360 ? 1 : 2;
    return { columns, rows: Math.ceil(total / columns), cardHeight: 100, fontSize: 18, scroll: true };
  }
  let best = { columns: 1, rows: total, cardHeight: 0, fontSize: 12, scroll: false };
  let bestScale = -1;
  for (let columns = 1; columns <= Math.min(12, total); columns++) {
    const rows = Math.ceil(total / columns);
    const cardWidth = (safeWidth - gap * (columns - 1)) / columns;
    const cardHeight = (safeHeight - gap * (rows - 1)) / rows;
    const scale = Math.min(cardWidth / 180, cardHeight / 108);
    if (scale > bestScale) {
      bestScale = scale;
      best = { columns, rows, cardHeight, fontSize: Math.max(12, Math.min(26, Math.floor(19 * scale))), scroll: false };
    }
  }
  return best;
}
