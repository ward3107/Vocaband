import { describe, expect, it } from 'vitest';
import { quickPlayBoardLayout } from '../utils/quickPlayBoardLayout';
describe('projector participant layout', () => {
  it.each([[1024, 500], [1280, 500], [1920, 800]])('fits 1–60 participants into %sx%s without clipping', (width, height) => {
    for (let count = 1; count <= 60; count++) {
      const layout = quickPlayBoardLayout(width, height, count);
      expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(count);
      expect(layout.rows * layout.cardHeight + (layout.rows - 1) * 8).toBeLessThanOrEqual(height + 0.01);
      expect(layout.cardHeight).toBeGreaterThan(45);
      expect(layout.scroll).toBe(false);
    }
  });
  it('keeps phones scrollable with readable cards', () => {
    expect(quickPlayBoardLayout(390, 600, 60)).toMatchObject({ columns: 2, cardHeight: 100, scroll: true });
  });
});
