/**
 * Arcade theme tokens — the student hub's palette, used by every
 * component under `src/components/arcade/`.  Tokens here are plain
 * Tailwind class strings (no new tailwind.config entry) so the rest of
 * the codebase keeps its existing build pipeline unchanged.
 *
 * NOTE (iOS flatten): every full-bleed student surface — the home hub,
 * the mode picker, the daily/practice pages, the Tasks sheet, and the
 * shop — now uses the iOS grouped-light look and styles its surface
 * directly. The old dark canvas/card tokens (ARCADE_BG, ARCADE_CARD,
 * ARCADE_CARD_ACTIVE) have been retired now that nothing consumes them.
 * What remains below are the COLOURFUL accent gradients (hero / reward /
 * streak / combo / play-ring) that still read correctly on light, plus
 * the touch-target helper — these are intentionally kept.
 */

/** Hero gradient (PLAY button, level-up headline). */
export const ARCADE_HERO_GRADIENT = "bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500";

/** XP / trophy gradient — amber-to-gold for reward chips. */
export const ARCADE_REWARD_GRADIENT = "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500";

/** Streak / fire gradient. */
export const ARCADE_STREAK_GRADIENT = "bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400";

/** Combo / mega-combo gradient. */
export const ARCADE_COMBO_GRADIENT = "bg-gradient-to-br from-yellow-300 via-amber-400 to-rose-500";

/** Outer glow ring for the hero PLAY button. */
export const ARCADE_PLAY_RING = "ring-4 ring-amber-300/60 shadow-2xl shadow-cyan-500/40";

/** Standard touch-target affordance for arcade buttons (matches
 *  CLAUDE.md mobile rule). */
export const ARCADE_BUTTON_TOUCH = "select-none touch-manipulation [-webkit-tap-highlight-color:transparent]";
