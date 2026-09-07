/**
 * Per-game brand accent for the three sibling live-game host screens —
 * Category Race, Speed Round and Word Hunt Arena. This is the single
 * source of truth that makes each game's colour IDENTITY carry from its
 * launcher tile (EnglishDashboardLayout) straight through its host
 * screen: a magenta tile opens a magenta room, an amber tile an amber
 * room, an emerald tile an emerald room. Before this, Speed Round's
 * amber tile opened a fuchsia host and the Arena's emerald tile opened
 * an indigo host — the identity broke the moment a teacher launched.
 *
 * Each value is a Tailwind class FRAGMENT written as a plain string
 * literal so the Tailwind scanner still generates it (classes assembled
 * only at runtime never reach the compiler). The global dark-mode remap
 * in `index.css` already covers every family used here — amber,
 * emerald/teal, fuchsia/pink — for bg-{50,100,200} / text-{600..900} /
 * border-{100,200,300} / hover:bg-{50,100,200}, so these accents adapt
 * to dark teacher themes with no extra CSS.
 *
 * SCOPE — brand-PRIMARY only. These are NOT themed per game and stay as
 * literal classes in the host components:
 *   • rose / red          → destructive (End / End round) + low-time urgency
 *   • emerald (success)   → "Copied", "Round done", "Play again"
 *                            (the Arena's brand IS emerald, so those simply
 *                             harmonise there rather than clash)
 *   • indigo              → the shared "Present / projector" secondary action,
 *                            deliberately kept distinct from every game's brand
 *
 * Tile hues these mirror (see EnglishDashboardLayout `*_HERO` configs):
 *   race  → #D946EF → #EC4899  (fuchsia → pink)
 *   speed → #F59E0B → #F97316  (amber → orange)
 *   arena → #10B981 → #14B8A6  (emerald → teal)
 *
 * Shade note: warm hues need a darker text shade than fuchsia to stay
 * legible on white, so `label`/`text600` land on -600 for speed/arena
 * (amber-500/emerald-500 text is too faint on a light card); the -600
 * shades are also the ones the dark remap lightens, so both modes read.
 */

export interface LiveGameAccent {
  /** Small uppercase section-label text (legible on white; remapped in dark). */
  label: string;
  /** Primary gradient stops — used as `bg-gradient-to-r ${grad}` (or -to-br). */
  grad: string;
  /** Coloured drop-shadows for primary buttons. */
  shadow30: string;
  shadow40: string;
  /** Soft tinted surfaces. */
  soft50: string;
  softHover100: string;
  /** Accent text tints. */
  text700: string;
  text600: string;
  /** Active-toggle border + "on" track. */
  borderActive: string;
  switchOn: string;
  /** Header pill button (e.g. "New race" / present-mode controls). */
  chip: string;
  /** Non-interactive present-mode code chip. */
  chipStatic: string;
  /** Step indicator active state. */
  stepText: string;
  stepBg: string;
  /** Gradient handed to LobbyRoster / GameResults `accent` props. */
  rosterGrad: string;
}

export const LIVE_GAME_ACCENTS = {
  race: {
    label: 'text-fuchsia-500',
    grad: 'from-fuchsia-500 to-pink-600',
    shadow30: 'shadow-fuchsia-500/30',
    shadow40: 'shadow-fuchsia-500/40',
    soft50: 'bg-fuchsia-50',
    softHover100: 'hover:bg-fuchsia-100',
    text700: 'text-fuchsia-700',
    text600: 'text-fuchsia-600',
    borderActive: 'border-fuchsia-300',
    switchOn: 'bg-fuchsia-500',
    chip: 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200',
    chipStatic: 'bg-fuchsia-50 text-fuchsia-700',
    stepText: 'text-fuchsia-600',
    stepBg: 'bg-fuchsia-500',
    rosterGrad: 'from-fuchsia-500 to-pink-600',
  },
  speed: {
    label: 'text-amber-600',
    grad: 'from-amber-500 to-orange-600',
    shadow30: 'shadow-amber-500/30',
    shadow40: 'shadow-amber-500/40',
    soft50: 'bg-amber-50',
    softHover100: 'hover:bg-amber-100',
    text700: 'text-amber-700',
    text600: 'text-amber-600',
    borderActive: 'border-amber-300',
    switchOn: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    chipStatic: 'bg-amber-50 text-amber-700',
    stepText: 'text-amber-600',
    stepBg: 'bg-amber-500',
    rosterGrad: 'from-amber-400 to-orange-500',
  },
  arena: {
    label: 'text-emerald-600',
    grad: 'from-emerald-500 to-teal-600',
    shadow30: 'shadow-emerald-500/30',
    shadow40: 'shadow-emerald-500/40',
    soft50: 'bg-emerald-50',
    softHover100: 'hover:bg-emerald-100',
    text700: 'text-emerald-700',
    text600: 'text-emerald-600',
    borderActive: 'border-emerald-300',
    switchOn: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    chipStatic: 'bg-emerald-50 text-emerald-700',
    stepText: 'text-emerald-600',
    stepBg: 'bg-emerald-500',
    rosterGrad: 'from-emerald-500 to-teal-600',
  },
} as const satisfies Record<'race' | 'speed' | 'arena', LiveGameAccent>;

export type LiveGameKey = keyof typeof LIVE_GAME_ACCENTS;
