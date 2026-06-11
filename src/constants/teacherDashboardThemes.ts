/**
 * Teacher dashboard themes.  Each theme is a fully cohesive palette —
 * not just a page-background gradient, but every surface, text tier,
 * border, badge, and accent that the teacher dashboard renders.
 *
 * Stored as a short string id on `public.users.teacher_dashboard_theme`
 * (default `'default'`).  The `useTeacherTheme` hook resolves the id
 * and writes every palette field to CSS custom properties on
 * `document.documentElement`, so any teacher-side component can read
 * `var(--vb-surface)`, `var(--vb-text-primary)`, etc. without prop
 * drilling.
 *
 * Comfort note (2026-05-01): card surfaces are intentionally NOT pure
 * `#ffffff`.  Pure-white cards on bright office lighting / phone screens
 * are tiring on the eyes, especially with the screen sizes Vocaband
 * runs on (classroom projectors, iPads, Chromebooks).  Each light
 * theme uses a barely-tinted off-white that matches its hue family —
 * still reads as "white", but ~5% warmer/cooler so the surface settles
 * onto the page background instead of glaring against it.
 *
 * Adding a new theme: append an entry below.  Keep `name` short,
 * `emoji` instantly recognisable, `bg` a Tailwind gradient string
 * (page root), `swatch` a Tailwind gradient (picker tile), and the
 * palette colors as plain CSS color strings (hex or hsl).
 */

export interface TeacherDashboardPalette {
  /** Card / modal / panel background. */
  surface: string;
  /** Subtle alt surface — hover backgrounds, soft badges, sub-cards. */
  surfaceAlt: string;
  /** 1px divider colour. */
  border: string;
  /** Headlines, primary copy. */
  textPrimary: string;
  /** Body copy, secondary labels. */
  textSecondary: string;
  /** Hint text, placeholders, disabled labels. */
  textMuted: string;
  /** Primary brand accent for the theme — used on CTAs, links, focus rings. */
  accent: string;
  /** Tinted background for active tabs, soft badges, gentle highlights. */
  accentSoft: string;
  /** Text colour that goes on top of `accent` (usually white). */
  accentText: string;

  /* ─── Semantic state tokens ───────────────────────────────────────
   * Pair each saturated colour with a `*Soft` counterpart tuned to
   * the surface tone — pale tints on light themes, deep desaturated
   * tints on dark themes.  Saturated variants take white text; soft
   * variants take the saturated colour as foreground text. */

  /** Approve, completed, online — sits on top with white text. */
  success: string;
  /** Soft success background — pair with `success` as text colour. */
  successSoft: string;
  /** Destructive actions, errors — sits on top with white text. */
  danger: string;
  /** Soft danger background — pair with `danger` as text colour. */
  dangerSoft: string;
  /** Warnings, "are you sure" callouts — sits on top with white text. */
  warning: string;
  /** Soft warning background — pair with `warning` as text colour. */
  warningSoft: string;
  /** Informational callouts, neutral highlights — sits on top with white text. */
  info: string;
  /** Soft info background — pair with `info` as text colour. */
  infoSoft: string;
}

export interface TeacherDashboardTheme {
  /** Stable id stored in the DB.  Don't rename without a backfill. */
  id: string;
  /** Display name in the picker. */
  name: string;
  /** Emoji shown on the picker swatch. */
  emoji: string;
  /** Page background — Tailwind classes applied to the dashboard root. */
  bg: string;
  /** Picker swatch background — used on the theme chooser tiles. */
  swatch: string;
  /** Whether the theme is dark; used for picker text contrast + scrollbar hint. */
  dark: boolean;
  /** Full palette applied to CSS custom properties when this theme is active. */
  palette: TeacherDashboardPalette;
}

export const TEACHER_DASHBOARD_THEMES: TeacherDashboardTheme[] = [
  // ─── Light theme ────────────────────────────────────────────────
  // Soft warm-white with an indigo accent.  Reads as classic
  // education-app light mode — clean, professional, low eye strain.
  // Surface is not pure white (#fbfaf7) to avoid the glare problem
  // documented in the comment block above.
  {
    id: 'default',
    name: 'Daylight',
    emoji: '☀️',
    bg: 'bg-gradient-to-b from-stone-100 to-stone-50',
    swatch: 'bg-gradient-to-br from-amber-50 via-stone-100 to-indigo-100',
    dark: false,
    palette: {
      surface: '#fbfaf7',
      surfaceAlt: '#f5f4ee',
      border: '#e7e5e0',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#a8a29e',
      accent: '#6366f1',
      accentSoft: '#eef2ff',
      accentText: '#ffffff',
      // Saturated mid-tones that take white text; soft variants are
      // the matching Tailwind-50 tints, harmonised against the warm
      // off-white surface.
      success: '#059669',
      successSoft: '#ecfdf5',
      danger: '#e11d48',
      dangerSoft: '#fff1f2',
      warning: '#d97706',
      warningSoft: '#fffbeb',
      info: '#4f46e5',
      infoSoft: '#eef2ff',
    },
  },

  // ─── Calm light theme ───────────────────────────────────────────
  // Flat cool-grey "paper" for teachers who find Daylight's warm
  // brightness glaring.  No gradient and a slightly deeper page tone
  // than Daylight, so the page recedes and the colourful game cards
  // carry the personality instead of competing with the background.
  {
    id: 'paper',
    name: 'Cool Paper',
    emoji: '📄',
    bg: 'bg-[#eceef1]',
    swatch: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300',
    dark: false,
    palette: {
      surface: '#f8fafc',
      surfaceAlt: '#eef1f5',
      border: '#dde2e9',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accent: '#4f46e5',
      accentSoft: '#e7e9fb',
      accentText: '#ffffff',
      // Cool-leaning soft tints (slate undertone, not warm cream) so
      // badges settle into the grey page instead of glowing against it.
      success: '#059669',
      successSoft: '#e6f4ee',
      danger: '#e11d48',
      dangerSoft: '#fceef1',
      warning: '#d97706',
      warningSoft: '#faf1e2',
      info: '#4f46e5',
      infoSoft: '#e7e9fb',
    },
  },

  // ─── Dark themes ────────────────────────────────────────────────
  // Dark variants — neutral slate/indigo for classic dark-mode users,
  // warm graphite/amber for evening teaching, and a dimmer low-contrast
  // slate/teal for long sessions.  Surfaces are tinted near-black so
  // cards separate from the slightly darker page background instead of
  // merging into it.

  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    // Page bg lifted off pure slate-950 (was muddy/flat) to a navy with a
    // faint indigo middle, so surfaces have something to sit ON instead of
    // merging into a black void.
    bg: 'bg-gradient-to-b from-[#0e1322] via-[#141a30] to-[#0e1322]',
    swatch: 'bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-950',
    dark: true,
    palette: {
      // Surfaces clearly ELEVATED above the bg (was #161b2c, barely above
      // slate-900) so cards read as distinct panels.  Border bumped to a
      // visible indigo-tinted line so card edges are crisp, not implied.
      surface: '#1d2440',
      surfaceAlt: '#28304e',
      border: '#3f497a',
      textPrimary: '#f8fafc',
      textSecondary: '#c7d2e4',
      textMuted: '#8b95ad',
      accent: '#8b93f9',
      accentSoft: '#2c3563',
      accentText: '#ffffff',
      // Brighter Tailwind-400 saturates for foreground readability on
      // dark slate.  Soft variants are darkened tints tuned ONE notch
      // above the new lighter surface so badges still pop without glowing.
      success: '#34d399',
      successSoft: '#123127',
      danger: '#fb7185',
      dangerSoft: '#3a1620',
      warning: '#fbbf24',
      warningSoft: '#352608',
      info: '#a5b4fc',
      infoSoft: '#232a52',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    emoji: '🌑',
    // Warm near-black with a faint graphite lift (was pure stone/zinc-950
    // which read as a dead flat black) so the amber accent and surfaces
    // have warmth to sit against.
    bg: 'bg-gradient-to-b from-[#17140f] via-[#1d1a14] to-[#15120e]',
    swatch: 'bg-gradient-to-br from-stone-800 via-zinc-900 to-neutral-950',
    dark: true,
    palette: {
      // Surfaces lifted well clear of the bg (was #1c1b1a, almost the same
      // as the page) and a warmer, more visible border so cards define
      // themselves on the dark graphite ground.
      surface: '#2a2722',
      surfaceAlt: '#353129',
      border: '#4d473e',
      textPrimary: '#fafaf9',
      textSecondary: '#d9d5cf',
      textMuted: '#a39c92',
      accent: '#fbac1c',
      accentSoft: '#3f2f12',
      accentText: '#1c1917',
      // Brighter saturates for dark-on-dark readability, soft variants
      // carry a warm undertone so they harmonise with the graphite
      // neutrals.  Warning is bumped slightly brighter than the accent
      // amber so warning callouts stay visually distinct from
      // primary-accent UI in this theme.
      success: '#34d399',
      successSoft: '#14241d',
      danger: '#fb7185',
      dangerSoft: '#311619',
      warning: '#fbbf24',
      warningSoft: '#3a2a0c',
      info: '#a5b4fc',
      infoSoft: '#20223e',
    },
  },
  {
    id: 'dimslate',
    name: 'Dim Slate',
    emoji: '🌒',
    // Softer than Midnight: a lifted blue-grey rather than near-black
    // navy, tuned for "the bright cards are tiring me" rather than
    // "I want true dark mode".  Cards keep their colour; the page and
    // chrome drop back so nothing glares.
    bg: 'bg-gradient-to-b from-[#1e2230] to-[#14171f]',
    swatch: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
    dark: true,
    palette: {
      surface: '#262b3a',
      surfaceAlt: '#2f3547',
      border: '#414a61',
      textPrimary: '#f1f5f9',
      textSecondary: '#b7c1d4',
      textMuted: '#8591a8',
      // Teal accent (vs Midnight's indigo) so the two dark themes read
      // as distinct choices in the picker; dark accentText because
      // teal-300 fails contrast under white text.
      accent: '#5eead4',
      accentSoft: '#1d3a3a',
      accentText: '#042f2e',
      success: '#34d399',
      successSoft: '#143129',
      danger: '#fb7185',
      dangerSoft: '#3a1b23',
      warning: '#fbbf24',
      warningSoft: '#36290e',
      info: '#7dd3fc',
      infoSoft: '#16304a',
    },
  },
];

/** Look up a theme by id, falling back to 'default' if the id is unknown. */
export function getTeacherDashboardTheme(id: string | null | undefined): TeacherDashboardTheme {
  if (!id) return TEACHER_DASHBOARD_THEMES[0];
  return TEACHER_DASHBOARD_THEMES.find(t => t.id === id) ?? TEACHER_DASHBOARD_THEMES[0];
}
