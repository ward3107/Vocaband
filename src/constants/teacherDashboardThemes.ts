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
  {
    id: 'default',
    name: 'Default',
    emoji: '🌿',
    bg: 'bg-gradient-to-b from-stone-100 to-stone-50',
    swatch: 'bg-gradient-to-br from-stone-100 to-stone-300',
    dark: false,
    palette: {
      surface: '#fafaf9',
      surfaceAlt: '#f5f5f4',
      border: '#e7e5e4',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#a8a29e',
      accent: '#6366f1',
      accentSoft: '#eef2ff',
      accentText: '#ffffff',
    },
  },
  {
    id: 'spring',
    name: 'Spring',
    emoji: '🌸',
    bg: 'bg-gradient-to-b from-emerald-50 via-cyan-50 to-stone-50',
    swatch: 'bg-gradient-to-br from-emerald-200 to-cyan-200',
    dark: false,
    palette: {
      surface: '#f7fbf9',
      surfaceAlt: '#ecfdf5',
      border: '#a7f3d0',
      textPrimary: '#064e3b',
      textSecondary: '#065f46',
      textMuted: '#6b7280',
      accent: '#10b981',
      accentSoft: '#d1fae5',
      accentText: '#ffffff',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    bg: 'bg-gradient-to-b from-amber-50 via-rose-50 to-pink-50',
    swatch: 'bg-gradient-to-br from-amber-300 to-rose-400',
    dark: false,
    palette: {
      surface: '#fffbf5',
      surfaceAlt: '#fff7ed',
      border: '#fed7aa',
      textPrimary: '#7c2d12',
      textSecondary: '#9a3412',
      textMuted: '#a8a29e',
      accent: '#f97316',
      accentSoft: '#ffedd5',
      accentText: '#ffffff',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    bg: 'bg-gradient-to-b from-emerald-100 via-green-50 to-stone-100',
    swatch: 'bg-gradient-to-br from-emerald-700 to-green-500',
    dark: false,
    palette: {
      surface: '#f8faf7',
      surfaceAlt: '#f0fdf4',
      border: '#bbf7d0',
      textPrimary: '#14532d',
      textSecondary: '#166534',
      textMuted: '#6b7280',
      accent: '#16a34a',
      accentSoft: '#dcfce7',
      accentText: '#ffffff',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    bg: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-stone-900',
    swatch: 'bg-gradient-to-br from-slate-800 to-indigo-900',
    dark: true,
    palette: {
      surface: '#1e1b4b',
      surfaceAlt: '#312e81',
      border: '#3730a3',
      textPrimary: '#f5f5f4',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      accent: '#818cf8',
      accentSoft: '#3730a3',
      accentText: '#ffffff',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    bg: 'bg-gradient-to-b from-sky-100 via-cyan-50 to-blue-50',
    swatch: 'bg-gradient-to-br from-sky-300 to-blue-500',
    dark: false,
    palette: {
      surface: '#f7fbfd',
      surfaceAlt: '#f0f9ff',
      border: '#bae6fd',
      textPrimary: '#0c4a6e',
      textSecondary: '#075985',
      textMuted: '#64748b',
      accent: '#0ea5e9',
      accentSoft: '#e0f2fe',
      accentText: '#ffffff',
    },
  },
  {
    id: 'berry',
    name: 'Berry',
    emoji: '🍇',
    bg: 'bg-gradient-to-b from-violet-50 via-fuchsia-50 to-purple-50',
    swatch: 'bg-gradient-to-br from-violet-400 to-fuchsia-500',
    dark: false,
    palette: {
      surface: '#fbf8fc',
      surfaceAlt: '#faf5ff',
      border: '#e9d5ff',
      textPrimary: '#581c87',
      textSecondary: '#6b21a8',
      textMuted: '#71717a',
      accent: '#a855f7',
      accentSoft: '#f3e8ff',
      accentText: '#ffffff',
    },
  },
  {
    id: 'autumn',
    name: 'Autumn',
    emoji: '🍂',
    bg: 'bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50',
    swatch: 'bg-gradient-to-br from-orange-400 to-red-500',
    dark: false,
    palette: {
      surface: '#fffbf3',
      surfaceAlt: '#fffbeb',
      border: '#fcd34d',
      textPrimary: '#7c2d12',
      textSecondary: '#92400e',
      textMuted: '#78716c',
      accent: '#ea580c',
      accentSoft: '#ffedd5',
      accentText: '#ffffff',
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    emoji: '🌱',
    bg: 'bg-gradient-to-b from-teal-50 via-green-50 to-emerald-50',
    swatch: 'bg-gradient-to-br from-teal-300 to-emerald-400',
    dark: false,
    palette: {
      surface: '#f7fbfa',
      surfaceAlt: '#f0fdfa',
      border: '#99f6e4',
      textPrimary: '#134e4a',
      textSecondary: '#115e59',
      textMuted: '#64748b',
      accent: '#14b8a6',
      accentSoft: '#ccfbf1',
      accentText: '#ffffff',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    emoji: '🪸',
    bg: 'bg-gradient-to-b from-rose-50 via-orange-50 to-pink-50',
    swatch: 'bg-gradient-to-br from-rose-300 to-orange-400',
    dark: false,
    palette: {
      surface: '#fdf8f8',
      surfaceAlt: '#fff1f2',
      border: '#fecdd3',
      textPrimary: '#881337',
      textSecondary: '#9f1239',
      textMuted: '#78716c',
      accent: '#f43f5e',
      accentSoft: '#ffe4e6',
      accentText: '#ffffff',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    emoji: '🪨',
    bg: 'bg-gradient-to-b from-slate-200 via-gray-100 to-zinc-100',
    swatch: 'bg-gradient-to-br from-slate-400 to-gray-600',
    dark: false,
    palette: {
      surface: '#f9fafb',
      surfaceAlt: '#f1f5f9',
      border: '#cbd5e1',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      accent: '#3b82f6',
      accentSoft: '#dbeafe',
      accentText: '#ffffff',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    bg: 'bg-gradient-to-b from-purple-50 via-indigo-50 to-violet-50',
    swatch: 'bg-gradient-to-br from-purple-300 to-indigo-400',
    dark: false,
    palette: {
      surface: '#fbf9fc',
      surfaceAlt: '#f5f3ff',
      border: '#ddd6fe',
      textPrimary: '#4c1d95',
      textSecondary: '#5b21b6',
      textMuted: '#71717a',
      accent: '#8b5cf6',
      accentSoft: '#ede9fe',
      accentText: '#ffffff',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    emoji: '🌹',
    bg: 'bg-gradient-to-b from-red-50 via-rose-50 to-pink-50',
    swatch: 'bg-gradient-to-br from-red-500 to-rose-600',
    dark: false,
    palette: {
      surface: '#fdf8f8',
      surfaceAlt: '#fef2f2',
      border: '#fecaca',
      textPrimary: '#7f1d1d',
      textSecondary: '#991b1b',
      textMuted: '#78716c',
      accent: '#dc2626',
      accentSoft: '#fee2e2',
      accentText: '#ffffff',
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    emoji: '🌟',
    bg: 'bg-gradient-to-b from-yellow-50 via-amber-50 to-orange-50',
    swatch: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    dark: false,
    palette: {
      surface: '#fffcf2',
      surfaceAlt: '#fffbeb',
      border: '#fde68a',
      textPrimary: '#713f12',
      textSecondary: '#854d0e',
      textMuted: '#78716c',
      accent: '#d97706',
      accentSoft: '#fef3c7',
      accentText: '#ffffff',
    },
  },

  // ─── Dark variants ──────────────────────────────────────────────
  // Same character as the light themes above, but with deep tinted
  // surfaces and lighter text — for evening teaching, dim rooms, or
  // teachers who simply prefer dark UIs.  Surfaces are NOT pure black:
  // every dark theme uses a tinted near-black (#1a-#1f range) so cards
  // separate visually from a slightly darker page background.

  {
    id: 'forest-dark',
    name: 'Forest Dark',
    emoji: '🌲',
    bg: 'bg-gradient-to-b from-emerald-950 via-green-950 to-stone-950',
    swatch: 'bg-gradient-to-br from-emerald-800 to-green-900',
    dark: true,
    palette: {
      surface: '#0f1f1a',
      surfaceAlt: '#15291f',
      border: '#1f3a2c',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      textMuted: '#6ee7b7',
      accent: '#34d399',
      accentSoft: '#14532d',
      accentText: '#ffffff',
    },
  },
  {
    id: 'ocean-dark',
    name: 'Ocean Dark',
    emoji: '🌊',
    bg: 'bg-gradient-to-b from-slate-950 via-blue-950 to-sky-950',
    swatch: 'bg-gradient-to-br from-sky-800 to-blue-900',
    dark: true,
    palette: {
      surface: '#0c1929',
      surfaceAlt: '#11243b',
      border: '#1e3a5f',
      textPrimary: '#f0f9ff',
      textSecondary: '#bae6fd',
      textMuted: '#7dd3fc',
      accent: '#38bdf8',
      accentSoft: '#0c4a6e',
      accentText: '#ffffff',
    },
  },
  {
    id: 'slate-dark',
    name: 'Slate Dark',
    emoji: '🪨',
    bg: 'bg-gradient-to-b from-slate-950 via-gray-950 to-zinc-950',
    swatch: 'bg-gradient-to-br from-slate-700 to-gray-800',
    dark: true,
    palette: {
      surface: '#1c1f26',
      surfaceAlt: '#25282f',
      border: '#3a3f4a',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      accent: '#60a5fa',
      accentSoft: '#1e3a5f',
      accentText: '#ffffff',
    },
  },
  {
    id: 'berry-dark',
    name: 'Berry Dark',
    emoji: '🍇',
    bg: 'bg-gradient-to-b from-violet-950 via-fuchsia-950 to-purple-950',
    swatch: 'bg-gradient-to-br from-violet-700 to-fuchsia-800',
    dark: true,
    palette: {
      surface: '#1f1530',
      surfaceAlt: '#2a1d3f',
      border: '#3d2a55',
      textPrimary: '#faf5ff',
      textSecondary: '#e9d5ff',
      textMuted: '#c084fc',
      accent: '#c084fc',
      accentSoft: '#4c1d95',
      accentText: '#ffffff',
    },
  },
];

/** Look up a theme by id, falling back to 'default' if the id is unknown. */
export function getTeacherDashboardTheme(id: string | null | undefined): TeacherDashboardTheme {
  if (!id) return TEACHER_DASHBOARD_THEMES[0];
  return TEACHER_DASHBOARD_THEMES.find(t => t.id === id) ?? TEACHER_DASHBOARD_THEMES[0];
}
