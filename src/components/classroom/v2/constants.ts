import type { ClassroomChartPoint, PulseBucket } from "./types";

/**
 * Gradient + glow per pulse bucket. Each colour sits OUTSIDE the
 * indigo→fuchsia brand range on purpose — the three triage buckets
 * (on track / needs attention / not playing) need to be instantly
 * distinguishable at a glance and a brand-aligned palette would
 * lose that.
 */
export const PULSE_STYLES: Record<
  PulseBucket,
  { background: string; glow: string }
> = {
  ontrack: {
    background: "linear-gradient(150deg, #5EC9A6 0%, #3FA689 100%)",
    glow: "0 14px 30px -16px rgba(63,166,137,0.55)",
  },
  attn: {
    background: "linear-gradient(150deg, #F0B96C 0%, #DE9542 100%)",
    glow: "0 14px 30px -16px rgba(222,149,66,0.55)",
  },
  idle: {
    background: "linear-gradient(150deg, #6B6388 0%, #4A3B7A 100%)",
    glow: "0 14px 30px -16px rgba(60,40,120,0.45)",
  },
};

/** How many avatars to show in a pulse roster before collapsing to "+N". */
export const PULSE_AVATAR_LIMIT = 4;

/**
 * Build a smooth Catmull-Rom-as-Bezier path through a series of
 * chart points. Returns `{ line, area, coords }` SVG `d` strings
 * sized to the given viewport.
 */
export function buildChartPath(
  points: ClassroomChartPoint[],
  width: number,
  height: number,
  tension = 0.5,
): { line: string; area: string; coords: Array<{ x: number; y: number }> } {
  if (points.length === 0) {
    return { line: "", area: "", coords: [] };
  }

  const coords = points.map((p, i) => ({
    x: (i / Math.max(points.length - 1, 1)) * width,
    y: (1 - p.avgScore / 100) * height,
  }));

  if (coords.length === 1) {
    const p = coords[0];
    return {
      line: `M ${p.x} ${p.y}`,
      area: `M ${p.x} ${p.y} L ${p.x} ${height} Z`,
      coords,
    };
  }

  let line = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;

    line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = `${line} L ${last.x} ${height} L ${first.x} ${height} Z`;

  return { line, area, coords };
}
