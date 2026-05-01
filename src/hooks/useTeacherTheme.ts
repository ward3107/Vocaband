/**
 * useTeacherTheme — resolves the active teacher dashboard theme and
 * applies its palette to CSS custom properties on document.documentElement.
 *
 * Mount this hook once at the top of every teacher-side route
 * (TeacherDashboardView, classroom drawers, the Class Show view).
 * Any descendant component can then consume the palette via
 * `var(--vb-surface)`, `var(--vb-accent)`, etc. — no prop drilling.
 *
 * On unmount the palette is cleared so non-teacher routes (student
 * dashboard, public landing, etc.) don't inherit teacher theming.
 */
import { useEffect } from 'react';
import {
  getTeacherDashboardTheme,
  type TeacherDashboardTheme,
} from '../constants/teacherDashboardThemes';
import { applyThemePalette, clearThemePalette } from '../utils/applyThemePalette';

export interface UseTeacherThemeResult {
  theme: TeacherDashboardTheme;
  isDark: boolean;
}

export function useTeacherTheme(themeId: string | null | undefined): UseTeacherThemeResult {
  const theme = getTeacherDashboardTheme(themeId);

  useEffect(() => {
    applyThemePalette(theme.palette);
    return () => {
      clearThemePalette();
    };
  }, [theme]);

  return { theme, isDark: theme.dark };
}
