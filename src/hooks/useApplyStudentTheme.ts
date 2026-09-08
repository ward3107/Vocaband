/**
 * Apply a student's shop theme's light/dark intent to the document root.
 *
 * Student themes (THEMES in constants/game.ts) only ever set a page
 * BACKGROUND colour via `colors.bg`.  The app's global dark-mode remap in
 * index.css — which rewrites hardcoded light surfaces (bg-white,
 * text-stone-900, borders, status tints…) to dark equivalents app-wide —
 * is gated on `html[data-theme-dark="true"]`.  Teachers get that flag from
 * useApplyTeacherTheme; students never did.  So equipping a dark theme
 * (Dark Mode / Neon / Galaxy / Esports) darkened only the background and
 * left every card + answer button stuck in light colours (white-on-dark,
 * invisible button text).  This hook closes that gap.
 *
 * Behaviour:
 *   - Explicit dark theme  → set `data-theme-dark="true"` so the remap fires.
 *   - Light / default theme → do NOT set the flag. The default 'Classic'
 *     theme is LIGHT (product decision 2026-09): the student app's default
 *     look is the light UI, regardless of the device's OS dark-mode setting.
 *     A student who wants dark equips a dark theme (Dark Mode / Neon / Galaxy
 *     / Esports) or uses the accessibility dark toggle. Setting the flag to
 *     "false" would still create the attribute, and the a11y toggle is gated
 *     on `:not([data-theme-dark])`, so we only ever ADD "true" and undo our
 *     own write when switching back to a light theme / signing out.
 *   - `null` (teacher context, or no user) → no-op; never clobber a teacher
 *     palette, which owns the same flag via useApplyTeacherTheme.
 */
import { useEffect, useRef } from 'react';
import { THEMES } from '../constants/game';

export function useApplyStudentTheme(studentThemeId: string | null): void {
  // Tracks whether WE set the dark flag, so we only ever undo our own
  // write and never delete a flag a teacher theme owns.
  const appliedDarkRef = useRef(false);

  useEffect(() => {
    const setDark = (on: boolean) => {
      if (on) {
        document.documentElement.dataset.themeDark = 'true';
        appliedDarkRef.current = true;
      } else if (appliedDarkRef.current) {
        // Only ever undo our OWN write — never delete a teacher's flag.
        delete document.documentElement.dataset.themeDark;
        appliedDarkRef.current = false;
      }
    };

    // No student theme context (teacher owns the flag, or signed out).
    if (!studentThemeId) {
      setDark(false);
      return;
    }

    // Every theme — including the default 'Classic' — honours its own `dark`
    // flag. 'Classic' is light, so the student app's default look is the
    // light UI regardless of the device's OS dark-mode setting; only an
    // explicitly-equipped dark theme (or the a11y dark toggle) goes dark.
    setDark(!!THEMES.find(t => t.id === studentThemeId)?.dark);
  }, [studentThemeId]);
}
