/**
 * useTeacherTheme — resolves the active teacher dashboard theme.
 *
 * CSS custom properties are now applied globally in App.tsx, so this
 * hook only returns the theme object for components that need direct
 * access to theme properties (bg class, dark mode flag, etc.).
 *
 * Previously this hook managed CSS variables and cleared them on unmount,
 * which caused theme flashes when navigating between teacher pages.
 * The global App.tsx effect eliminated that issue.
 */
import {
  getTeacherDashboardTheme,
  type TeacherDashboardTheme,
} from '../constants/teacherDashboardThemes';

export interface UseTeacherThemeResult {
  theme: TeacherDashboardTheme;
  isDark: boolean;
}

export function useTeacherTheme(themeId: string | null | undefined): UseTeacherThemeResult {
  const theme = getTeacherDashboardTheme(themeId);
  return { theme, isDark: theme.dark };
}
