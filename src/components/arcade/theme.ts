/**
 * Arcade theme tokens — the student hub's palette, used by every
 * component under `src/components/arcade/`.  Tokens here are plain
 * Tailwind class strings (no new tailwind.config entry) so the rest of
 * the codebase keeps its existing build pipeline unchanged.
 *
 * NOTE (iOS flatten, in progress): the STUDENT HOME hub (ArcadeHubLayout +
 * OrbitalHub + the pet centre) has moved to the iOS grouped-light look and
 * styles that surface directly, NOT through ARCADE_BG/ARCADE_CARD below.
 * These shared dark tokens are still consumed by the mode picker
 * (GameModeSelectionView), the shop, StudentHubSubView, and the Tasks
 * sheet — all still on the dark treatment until their own flatten wave —
 * so they are DELIBERATELY left dark here. Flipping them would invert those
 * un-migrated screens too and leave white text on a white card. When the
 * last consumer migrates, retire these.
 */

/** Deep gradient background for the full-bleed hub canvas. */
export const ARCADE_BG = "bg-gradient-to-b from-violet-900 via-indigo-900 to-fuchsia-900";

/** Hero gradient (PLAY button, level-up headline). */
export const ARCADE_HERO_GRADIENT = "bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500";

/** XP / trophy gradient — amber-to-gold for reward chips. */
export const ARCADE_REWARD_GRADIENT = "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500";

/** Streak / fire gradient. */
export const ARCADE_STREAK_GRADIENT = "bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400";

/** Combo / mega-combo gradient. */
export const ARCADE_COMBO_GRADIENT = "bg-gradient-to-br from-yellow-300 via-amber-400 to-rose-500";

/** Frosted-glass card surface used on every arcade panel. */
export const ARCADE_CARD =
  "rounded-3xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-xl shadow-violet-900/30";

/** Frosted-glass + ring used on selected/active tiles. */
export const ARCADE_CARD_ACTIVE =
  "rounded-3xl bg-white/15 backdrop-blur-md ring-2 ring-cyan-300/70 shadow-xl shadow-cyan-500/30";

/** Outer glow ring for the hero PLAY button. */
export const ARCADE_PLAY_RING = "ring-4 ring-amber-300/60 shadow-2xl shadow-cyan-500/40";

/** Standard touch-target affordance for arcade buttons (matches
 *  CLAUDE.md mobile rule). */
export const ARCADE_BUTTON_TOUCH = "select-none touch-manipulation [-webkit-tap-highlight-color:transparent]";
