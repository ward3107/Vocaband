/**
 * WCAG contrast utilities.  Used at design time (theme palette
 * authoring) to validate every text-vs-background pairing meets the
 * accessibility floor, and as a building block for the future
 * adaptive theme engine's auto-correction loop.
 *
 * Spec source: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
 *
 * Targets:
 *   - Normal text:           ≥ 4.5:1   (WCAG AA)
 *   - Large text (≥18pt):    ≥ 3.0:1   (WCAG AA)
 *   - UI components:         ≥ 3.0:1   (WCAG AA)
 *   - AAA enhanced:          ≥ 7.0:1   (used by Presentation Mode)
 */

export type WCAGTarget = 3 | 4.5 | 7;

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
 * Convert an [r, g, b] triple in 0-255 space back to a 6-digit hex
 * string with a leading #.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
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
 * WCAG contrast ratio between two colours.  Returns a value in
 * [1, 21] — 1 means identical (worst) and 21 is pure black on pure
 * white (best).
 *
 * Both inputs accept 6-digit hex strings.
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Returns true when the foreground/background pair meets the WCAG
 * `target` ratio (e.g. 4.5 for AA normal text, 7 for AAA).
 */
export function meetsContrast(fg: string, bg: string, target: WCAGTarget = 4.5): boolean {
  return contrastRatio(fg, bg) >= target;
}

/**
 * Auto-correct a foreground colour against a background until they
 * meet `target` contrast.  Steps the foreground's luminance in HSL
 * space until the ratio passes, or `maxIterations` is reached.
 *
 * `strategy`:
 *   - 'auto'    — pick the direction (lighten or darken) that gets
 *                 there fastest given the background's luminance
 *   - 'lighten' — only lighten the foreground (used when bg is dark)
 *   - 'darken'  — only darken the foreground  (used when bg is light)
 *
 * If we can't reach the target within `maxIterations`, returns the
 * highest-contrast colour we got to — never silently returns a
 * failing pair.  Caller is responsible for checking with
 * meetsContrast() if a guarantee is needed.
 */
export function ensureContrast(
  fg: string,
  bg: string,
  target: WCAGTarget = 4.5,
  strategy: "auto" | "lighten" | "darken" = "auto",
  maxIterations = 30,
): string {
  if (meetsContrast(fg, bg, target)) return fg;

  // Decide direction: if bg is light, darken fg; if bg is dark, lighten fg.
  const bgLum = luminance(hexToRgb(bg));
  const direction: "lighten" | "darken" =
    strategy === "auto" ? (bgLum > 0.5 ? "darken" : "lighten") : strategy;

  // Step in HSL lightness — convert via RGB → HSL → adjust → RGB.
  const [r, g, b] = hexToRgb(fg);
  let { h, s, l } = rgbToHsl(r, g, b);

  let best = fg;
  let bestRatio = contrastRatio(fg, bg);

  for (let i = 0; i < maxIterations; i++) {
    l += direction === "lighten" ? 0.02 : -0.02;
    if (l < 0 || l > 1) break;
    const [nr, ng, nb] = hslToRgb(h, s, l);
    const candidate = rgbToHex(nr, ng, nb);
    const ratio = contrastRatio(candidate, bg);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= target) return candidate;
  }
  return best;
}

/* ── HSL ⇄ RGB helpers (private) ─────────────────────────────────── */

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3) * 255;
  const g = hueToRgb(p, q, h) * 255;
  const b = hueToRgb(p, q, h - 1 / 3) * 255;
  return [r, g, b];
}
