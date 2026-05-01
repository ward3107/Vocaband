/**
 * Writes a teacher dashboard palette into CSS custom properties on
 * `document.documentElement`, so every teacher-side surface can read
 * `var(--vb-surface)`, `var(--vb-text-primary)`, etc. without prop
 * drilling.
 *
 * Variable names use a `--vb-` prefix (Vocaband) to avoid collisions
 * with any CSS the global stylesheet might define.
 */
import type { TeacherDashboardPalette } from '../constants/teacherDashboardThemes';

const TOKEN_KEYS: Array<{ key: keyof TeacherDashboardPalette; cssVar: string }> = [
  { key: 'surface', cssVar: '--vb-surface' },
  { key: 'surfaceAlt', cssVar: '--vb-surface-alt' },
  { key: 'border', cssVar: '--vb-border' },
  { key: 'textPrimary', cssVar: '--vb-text-primary' },
  { key: 'textSecondary', cssVar: '--vb-text-secondary' },
  { key: 'textMuted', cssVar: '--vb-text-muted' },
  { key: 'accent', cssVar: '--vb-accent' },
  { key: 'accentSoft', cssVar: '--vb-accent-soft' },
  { key: 'accentText', cssVar: '--vb-accent-text' },
];

export function applyThemePalette(palette: TeacherDashboardPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const { key, cssVar } of TOKEN_KEYS) {
    root.style.setProperty(cssVar, palette[key]);
  }
}

export function clearThemePalette(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const { cssVar } of TOKEN_KEYS) {
    root.style.removeProperty(cssVar);
  }
}
