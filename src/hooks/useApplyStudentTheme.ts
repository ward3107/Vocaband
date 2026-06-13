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
 *   - Dark student theme  → set `data-theme-dark="true"` so the remap fires.
 *   - Light student theme → do NOT set the flag.  Setting it to "false"
 *     would still create the attribute, and the accessibility dark toggle
 *     is gated on `:not([data-theme-dark])` — so a stray "false" would
 *     silently disable the a11y toggle.  We only ever ADD "true", and undo
 *     our own write when switching back to a light theme / signing out.
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
    const undoOwnFlag = () => {
      if (appliedDarkRef.current) {
        delete document.documentElement.dataset.themeDark;
        appliedDarkRef.current = false;
      }
    };

    // No student theme context (teacher owns the flag, or signed out).
    if (!studentThemeId) {
      undoOwnFlag();
      return;
    }

    const isDark = !!THEMES.find(t => t.id === studentThemeId)?.dark;
    if (isDark) {
      document.documentElement.dataset.themeDark = 'true';
      appliedDarkRef.current = true;
    } else {
      // Light theme — drop the flag if we'd previously set it (dark→light
      // switch) so the remap stops and the a11y toggle works again.
      undoOwnFlag();
    }

    return undoOwnFlag;
  }, [studentThemeId]);
}
