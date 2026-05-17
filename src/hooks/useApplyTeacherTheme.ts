/**
 * Apply the teacher's dashboard theme to the document root whenever
 * teacherThemeId changes.  Owns the CSS-variable writes + the
 * document.documentElement dataset toggle that drives dark-mode
 * scrollbar styles.
 *
 * Distinct from useTeacherTheme, which just *resolves* the theme
 * object for inline use; this one *applies* it as a side effect.
 *
 * Pass `null` to clear any previously-applied palette (e.g. when the
 * user signs out or switches to a non-teacher role).
 */
import { useEffect, useRef } from 'react';
import { getTeacherDashboardTheme } from '../constants/teacherDashboardThemes';
import { applyThemePalette, clearThemePalette } from '../utils/applyThemePalette';

export function useApplyTeacherTheme(teacherThemeId: string | null): void {
  const lastThemeRef = useRef<string | null>(null);

  useEffect(() => {
    // Only apply if theme actually changed (avoid unnecessary DOM writes)
    if (lastThemeRef.current === teacherThemeId) return;
    lastThemeRef.current = teacherThemeId;

    if (teacherThemeId) {
      const theme = getTeacherDashboardTheme(teacherThemeId);
      applyThemePalette(theme.palette);
      // Update data attribute for dark mode scrollbar styles
      document.documentElement.dataset.themeDark = theme.dark.toString();
    } else {
      clearThemePalette();
      delete document.documentElement.dataset.themeDark;
    }
  }, [teacherThemeId]);
}
