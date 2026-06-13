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
 *   - Explicit light theme → do NOT set the flag.  Setting it to "false"
 *     would still create the attribute, and the accessibility dark toggle
 *     is gated on `:not([data-theme-dark])` — so a stray "false" would
 *     silently disable the a11y toggle.  We only ever ADD "true", and undo
 *     our own write when switching back to a light theme / signing out.
 *   - `'default'` (the Classic / unequipped theme) → AUTO: follow the
 *     device's `prefers-color-scheme`.  A student on a dark phone who
 *     hasn't picked a theme gets a dark app; flipping the OS setting
 *     mid-session updates live.  Picking any explicit theme overrides this.
 *   - `null` (teacher context, or no user) → no-op; never clobber a teacher
 *     palette, which owns the same flag via useApplyTeacherTheme.
 */
import { useEffect, useRef } from 'react';
import { THEMES } from '../constants/game';

// The Classic / unequipped theme is treated as "Auto" — follow the device
// preference rather than forcing light.  Any other id is an explicit pick.
const AUTO_THEME_ID = 'default';

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

    // Explicit theme → honour its own dark/light, fixed.
    if (studentThemeId !== AUTO_THEME_ID) {
      setDark(!!THEMES.find(t => t.id === studentThemeId)?.dark);
      return;
    }

    // Auto (default / unequipped) → follow the device, and keep following
    // it if the student flips their OS setting mid-session.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) {
      setDark(false);
      return;
    }
    const sync = () => setDark(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [studentThemeId]);
}
