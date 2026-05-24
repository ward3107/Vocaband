/**
 * Visual tokens for the v2 Worksheet Results row.  Tag colours are
 * outside the indigo→fuchsia brand palette on purpose so the format
 * pill stands out from the surrounding chrome.
 */
export type ModeTagColor = "match" | "def" | "violet";

export const TAG_STYLES: Record<ModeTagColor, { text: string; background: string }> = {
  match:  { text: "#3FA689", background: "rgba(94,201,166,0.15)" },
  def:    { text: "#DE9542", background: "rgba(240,185,108,0.18)" },
  violet: { text: "#8B5CF6", background: "#F3EBFF" },
};

/** Conic-gradient ring background string keyed by completion 0–100. */
export function completionRingBackground(percent: number): string {
  const p = Math.max(0, Math.min(100, percent));
  return `conic-gradient(#4DBA8A 0% ${p}%, #F3EBFF ${p}% 100%)`;
}

/** Heuristic colour assignment for a worksheet format string —
 *  caller still passes the override if it has stronger knowledge. */
export function tagColorForFormat(format: string): ModeTagColor {
  const f = format.toLowerCase();
  if (/match/.test(f)) return "match";
  if (/def|definition|fill/.test(f)) return "def";
  return "violet";
}
