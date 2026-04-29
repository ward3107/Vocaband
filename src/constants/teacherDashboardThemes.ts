/**
 * Teacher dashboard themes.  Five tasteful predefined looks for the
 * teacher's main dashboard chrome (page background gradient + a
 * couple of accent colours used by the theme picker swatches).
 *
 * Stored as a short string id on `public.users.teacher_dashboard_theme`
 * (default `'default'`).  Resolution is read-side only — the
 * TeacherDashboardView looks up the theme by id on render; no other
 * surface (assignment wizard, modals, student-facing screens) reads
 * this.  See §X in CLAUDE.md if/when that scope expands.
 *
 * Adding a new theme: append an entry below.  Keep `name` short
 * (fits in a 12-char picker tile), `emoji` instantly recognisable,
 * and `bg` a Tailwind gradient string — anything else is overkill
 * for the current visual surface.
 */

export interface TeacherDashboardTheme {
  /** Stable id stored in the DB.  Don't rename without a backfill. */
  id: string;
  /** Display name in the picker. */
  name: string;
  /** Emoji shown on the picker swatch — recognisable at a glance. */
  emoji: string;
  /** Page background — Tailwind classes applied to the dashboard root. */
  bg: string;
  /** Picker swatch background — used on the theme chooser tiles. */
  swatch: string;
  /** Whether the theme is dark; the picker uses this to flip its own contrast. */
  dark: boolean;
}

export const TEACHER_DASHBOARD_THEMES: TeacherDashboardTheme[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '🌿',
    bg: 'bg-gradient-to-b from-stone-50 to-white',
    swatch: 'bg-gradient-to-br from-stone-50 to-stone-200',
    dark: false,
  },
  {
    id: 'spring',
    name: 'Spring',
    emoji: '🌸',
    bg: 'bg-gradient-to-b from-emerald-50 via-cyan-50 to-white',
    swatch: 'bg-gradient-to-br from-emerald-200 to-cyan-200',
    dark: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    bg: 'bg-gradient-to-b from-amber-50 via-rose-50 to-pink-50',
    swatch: 'bg-gradient-to-br from-amber-300 to-rose-400',
    dark: false,
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    bg: 'bg-gradient-to-b from-emerald-100 via-green-50 to-stone-50',
    swatch: 'bg-gradient-to-br from-emerald-700 to-green-500',
    dark: false,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    bg: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-stone-900',
    swatch: 'bg-gradient-to-br from-slate-800 to-indigo-900',
    dark: true,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    bg: 'bg-gradient-to-b from-sky-50 via-cyan-50 to-blue-50',
    swatch: 'bg-gradient-to-br from-sky-300 to-blue-500',
    dark: false,
  },
  {
    id: 'berry',
    name: 'Berry',
    emoji: '🍇',
    bg: 'bg-gradient-to-b from-violet-50 via-fuchsia-50 to-purple-50',
    swatch: 'bg-gradient-to-br from-violet-400 to-fuchsia-500',
    dark: false,
  },
  {
    id: 'autumn',
    name: 'Autumn',
    emoji: '🍂',
    bg: 'bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50',
    swatch: 'bg-gradient-to-br from-orange-400 to-red-500',
    dark: false,
  },
];

/** Look up a theme by id, falling back to 'default' if the id is
 *  unknown — covers the case where a theme is removed from this list
 *  while a teacher still has its id stored in their row. */
export function getTeacherDashboardTheme(id: string | null | undefined): TeacherDashboardTheme {
  if (!id) return TEACHER_DASHBOARD_THEMES[0];
  return TEACHER_DASHBOARD_THEMES.find(t => t.id === id) ?? TEACHER_DASHBOARD_THEMES[0];
}
