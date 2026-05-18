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
    },
  },

  // ─── Dark themes ────────────────────────────────────────────────
  // Two carefully picked dark variants — one neutral slate/indigo for
  // classic dark-mode users, one warm graphite/amber for evening
  // teaching.  Surfaces are tinted near-black so cards separate from
  // the slightly darker page background instead of merging into it.

  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    bg: 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900',
    swatch: 'bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-950',
    dark: true,
    palette: {
      surface: '#161b2c',
      surfaceAlt: '#1e243a',
      border: '#2d3450',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      accent: '#818cf8',
      accentSoft: '#2a3257',
      accentText: '#ffffff',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    emoji: '🌑',
    bg: 'bg-gradient-to-b from-stone-950 via-zinc-950 to-neutral-950',
    swatch: 'bg-gradient-to-br from-stone-800 via-zinc-900 to-neutral-950',
    dark: true,
    palette: {
      surface: '#1c1b1a',
      surfaceAlt: '#262524',
      border: '#3a3835',
      textPrimary: '#fafaf9',
      textSecondary: '#d6d3d1',
      textMuted: '#a8a29e',
      accent: '#f59e0b',
      accentSoft: '#3d2e0e',
      accentText: '#1c1917',
    },
  },
];

/** Look up a theme by id, falling back to 'default' if the id is unknown. */
export function getTeacherDashboardTheme(id: string | null | undefined): TeacherDashboardTheme {
  if (!id) return TEACHER_DASHBOARD_THEMES[0];
  return TEACHER_DASHBOARD_THEMES.find(t => t.id === id) ?? TEACHER_DASHBOARD_THEMES[0];
}
