/**
 * WCAG colour helpers.  Today this backs `readableTextOn` — picking a
 * text-colour tier (dark or light) that reads well on a given background,
 * used by the class-card tinted bands.
 *
 * Spec source: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
 */

/**
 * Convert a 6-digit hex string (e.g. "#1c1917") into [r, g, b] in
 * 0-255 space.  Throws on malformed input — caller is responsible
 * for passing canonical hex.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (clean.length !== 6) throw new Error(`hexToRgb: expected 6-digit hex, got "${hex}"`);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Per-channel relative luminance helper from the WCAG formula.  Each
 * channel is normalised to 0-1, then linearised via the sRGB transfer
 * curve.
 */
function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of an [r, g, b] triple — the L value used in
 * the WCAG contrast formula.
 */
export function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * Pick a 3-tier text-colour set that reads well on top of `bgHex`.
 * Returns concrete hex values (not CSS vars) so the result survives
 * theme switches — a class card with a yellow tint should keep dark
 * text in BOTH light and dark mode, otherwise the tinted band ends
 * up with white text on pale yellow (the bug this fixes).
 *
 * Threshold 0.55 biases slightly toward dark text on pastels, which
 * are the common "class colour" picks (lavender, mint, peach, etc.).
 */
export function readableTextOn(bgHex: string): {
  primary: string;
  secondary: string;
  muted: string;
} {
  let lum: number;
  try {
    lum = luminance(hexToRgb(bgHex));
  } catch {
    return { primary: "#0f172a", secondary: "#475569", muted: "#64748b" };
  }
  return lum > 0.55
    ? { primary: "#0f172a", secondary: "#475569", muted: "#64748b" }
    : { primary: "#ffffff", secondary: "#e2e8f0", muted: "#cbd5e1" };
}
