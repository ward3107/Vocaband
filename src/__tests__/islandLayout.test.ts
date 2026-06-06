import { describe, it, expect } from "vitest";
import { computeIslandPositions, mapHeight } from "../components/arcade/islandLayout";

describe("computeIslandPositions", () => {
  it("returns one position per island", () => {
    expect(computeIslandPositions(6)).toHaveLength(6);
    expect(computeIslandPositions(0)).toHaveLength(0);
  });

  it("is deterministic — same count gives identical positions", () => {
    expect(computeIslandPositions(13)).toEqual(computeIslandPositions(13));
  });

  it("keeps x within the 0–100% band", () => {
    for (const p of computeIslandPositions(13)) {
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
    }
  });

  it("places each island strictly below the previous (no vertical overlap)", () => {
    const ys = computeIslandPositions(13).map((p) => p.y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("mapHeight clears the last island", () => {
    const pos = computeIslandPositions(5);
    expect(mapHeight(5)).toBeGreaterThan(pos[4].y);
    expect(mapHeight(0)).toBe(0);
  });
});
