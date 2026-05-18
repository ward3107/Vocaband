import type { View } from "../core/views";

/**
 * Navigate to the new self-contained TeacherLoginView, which renders
 * both Google OAuth and the email-OTP code login.  The intended-role
 * stamp + OAuth call moved into TeacherLoginCard so all teacher-auth
 * concerns live in one place outside App.tsx.
 */
export const navigateToTeacherLogin = (setView: (v: View) => void) => {
  setView("teacher-login");
};

/**
 * Push `/student` so the URL is bookmarkable/shareable — matches the
 * initial-view detection that maps `/student` → student-account-login.
 *
 * Important: push the state AND the URL in a single history entry,
 * carrying the destination view in the state payload. Previously this
 * pushed `{}` as state and let the useBackButtonTrap view-change
 * effect push a second entry on top. That left an empty-state entry
 * sandwiched between the landing and login views — when the user
 * pressed back the trap landed on it, couldn't identify a previous
 * view (state.view was undefined), re-trapped, and eventually
 * bounced the user out of the app to Google. Stamping the view into
 * the state here gives the trap a valid CASE C target on back, and
 * the view-change effect notices the state already matches the new
 * view and skips its redundant push.
 */
export const navigateToStudentLogin = (setView: (v: View) => void) => {
  try {
    if (window.location.pathname !== "/student") {
      window.history.pushState({ view: "student-account-login" }, "", "/student");
    }
  } catch { /* ignore — fall back to view-only nav */ }
  setView("student-account-login");
};
