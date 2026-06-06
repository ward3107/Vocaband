/**
 * Writes a teacher dashboard palette into CSS custom properties on
 * `document.documentElement`, so every teacher-side surface can read
 * `var(--vb-surface)`, `var(--vb-text-primary)`, etc. without prop
 * drilling.
 *
 * Variable names use a `--vb-` prefix (Vocaband) to avoid collisions
 * with any CSS the global stylesheet might define.
 *
 * Each palette entry is written to BOTH its --vb-* token AND the
 * equivalent --color-* token defined in the Tailwind 4 @theme block
 * in index.css.  Doing it twice keeps the two access patterns in
 * lockstep: files reading `var(--vb-surface)` directly and files
 * using the `bg-surface` utility class both see the active theme.
 */
import type { TeacherDashboardPalette } from '../constants/teacherDashboardThemes';

/** Map a palette key to every CSS variable it should drive.  The first
 *  entry in each list is the --vb-* canonical name (consumed by inline
 *  styles); the remaining entries are the matching @theme tokens that
 *  power Tailwind utilities (bg-surface, text-on-surface, etc.). */
const TOKEN_KEYS: Array<{ key: keyof TeacherDashboardPalette; cssVars: string[] }> = [
  {
    key: 'surface',
    // `--color-surface-container-lowest` MUST be driven here too: it defaults
    // to #ffffff in the @theme block and the global a11y-dark override skips
    // teacher themes (`:not([data-theme-dark])`), so without this it stays
    // white on Midnight/Graphite — popovers like the language dropdown
    // (bg-surface-container-lowest) rendered white with light text on top.
    cssVars: ['--vb-surface', '--color-surface', '--color-surface-container-low', '--color-surface-container-lowest', '--color-background'],
  },
  {
    key: 'surfaceAlt',
    cssVars: ['--vb-surface-alt', '--color-surface-container', '--color-surface-container-high'],
  },
  {
    key: 'border',
    cssVars: ['--vb-border', '--color-outline-variant', '--color-surface-container-highest'],
  },
  {
    key: 'textPrimary',
    cssVars: ['--vb-text-primary', '--color-on-surface', '--color-on-background'],
  },
  {
    key: 'textSecondary',
    cssVars: ['--vb-text-secondary', '--color-on-surface-variant'],
  },
  {
    key: 'textMuted',
    cssVars: ['--vb-text-muted'],
  },
  {
    key: 'accent',
    cssVars: ['--vb-accent', '--color-primary', '--color-surface-tint'],
  },
  {
    key: 'accentSoft',
    cssVars: ['--vb-accent-soft', '--color-primary-container'],
  },
  {
    key: 'accentText',
    cssVars: ['--vb-accent-text', '--color-on-primary'],
  },
  { key: 'success',     cssVars: ['--vb-success'] },
  { key: 'successSoft', cssVars: ['--vb-success-soft'] },
  { key: 'danger',      cssVars: ['--vb-danger'] },
  { key: 'dangerSoft',  cssVars: ['--vb-danger-soft'] },
  { key: 'warning',     cssVars: ['--vb-warning'] },
  { key: 'warningSoft', cssVars: ['--vb-warning-soft'] },
  { key: 'info',        cssVars: ['--vb-info'] },
  { key: 'infoSoft',    cssVars: ['--vb-info-soft'] },
];

export function applyThemePalette(palette: TeacherDashboardPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const { key, cssVars } of TOKEN_KEYS) {
    const value = palette[key];
    for (const cssVar of cssVars) {
      root.style.setProperty(cssVar, value);
    }
  }
}

export function clearThemePalette(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const { cssVars } of TOKEN_KEYS) {
    for (const cssVar of cssVars) {
      root.style.removeProperty(cssVar);
    }
  }
}
