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
 */
export const navigateToStudentLogin = (setView: (v: View) => void) => {
  try {
    if (window.location.pathname !== "/student") {
      window.history.pushState({}, "", "/student");
    }
  } catch { /* ignore — fall back to view-only nav */ }
  setView("student-account-login");
};
