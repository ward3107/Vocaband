/**
 * Pastel accent palette used by the English teacher dashboard.
 *
 * Each accent is a brand-aligned tint that sits in the
 * indigo→violet→fuchsia family so the dashboard reads as one
 * product instead of a sticker book. `bg` is the gradient on the
 * class card; `ink` is a hard-coded foreground that stays readable
 * on top of `bg` (we skip readableTextOn here because the accent
 * authors already picked colours that pair correctly).  `border` is
 * the slightly darker tonal shade used as a 1.5px frame around the
 * card so it reads as a real surface against the page bg.
 */
export type AccentName =
  | "lavender"
  | "periwinkle"
  | "lilac"
  | "rose"
  | "blush";

export const ACCENTS: Record<AccentName, { bg: string; ink: string; border: string }> = {
  lavender:   { bg: "linear-gradient(135deg,#E6E3FF 0%,#D5CFFF 100%)", ink: "#3D2D8A", border: "#B5ACFF" },
  periwinkle: { bg: "linear-gradient(135deg,#DCE4FF 0%,#C2CFFF 100%)", ink: "#2B3784", border: "#A8B8FF" },
  lilac:      { bg: "linear-gradient(135deg,#F0DDFF 0%,#E2C2FF 100%)", ink: "#4A1F7A", border: "#C99CFF" },
  rose:       { bg: "linear-gradient(135deg,#FFDDF0 0%,#FFC2E5 100%)", ink: "#7A1F5C", border: "#FF9DD0" },
  blush:      { bg: "linear-gradient(135deg,#FFE1EC 0%,#FFCFE0 100%)", ink: "#7A1F4A", border: "#FFA1C0" },
};

export const ACCENT_ORDER: AccentName[] = [
  "lavender",
  "periwinkle",
  "lilac",
  "rose",
  "blush",
];

export const BRAND_GRADIENT =
  "linear-gradient(110deg, #6366F1 0%, #8B5CF6 60%, #D946EF 100%)";

export const HERO_AURORA =
  "radial-gradient(120% 140% at 0% 0%, #6366F1 0%, #8B5CF6 38%, #D946EF 72%, #F472B6 100%)";

// Shared brand-purple used as the "Recent" highlight ring on the
// most-recently-active class card.  Constant across all accents so
// the highlight reads as a single, recognisable brand signal rather
// than blending into whatever tint the recent card happens to have.
export const RECENT_RING_COLOR = "#8B5CF6";

/**
 * Deterministic accent picker keyed by class id so the same class
 * always gets the same tint across renders and devices, but two
 * adjacent classes don't always look like the first colour in the
 * list.  Stable, no DB write needed.
 */
export function accentForClass(id: string): AccentName {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % ACCENT_ORDER.length;
  return ACCENT_ORDER[idx];
}
