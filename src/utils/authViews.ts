import type { View } from "../core/views";

const PUBLIC_VIEWS = new Set<View>([
  "public-landing", "public-terms", "public-privacy", "public-security",
  "public-free-resources", "public-interactive-worksheet", "public-status",
  "accessibility-statement",
]);

const TEACHER_VIEWS = new Set<View>([
  "worksheet", "classroom", "class-show", "teacher-approvals",
  "quick-play-teacher-monitor", "quick-play-setup", "create-assignment",
  "hot-seat", "wheel",
  // Authenticated teacher destinations that were previously NOT preserved
  // — so a token refresh on tab-refocus bounced the teacher back to the
  // dashboard, abandoning whatever they had open here.
  "analytics", "gradebook", "students", "worksheet-attempts",
  "live-challenge", "live-challenge-class-select",
  "vocabulary-library", "vocabulary-collection", "vocabulary-set-detail", "vocabulary-set-builder",
  "vocabagrut", "category-race-host", "speed-round-host", "word-hunt-arena-host",
  "developer-dashboard", "admin-security", "manager-dashboard",
  "voca-picker", "vocahebrew-dashboard",
  "vocahebrew-niqqud", "vocahebrew-shoresh", "vocahebrew-listening",
]);

const STUDENT_VIEWS = new Set<View>([
  "student-dashboard", "game", "live-challenge",
  "shop", "global-leaderboard", "privacy-settings",
  "category-race-student", "speed-round-student", "word-hunt-arena-student",
]);

export const isPublicView = (view: View): boolean => PUBLIC_VIEWS.has(view);

export const shouldPreserveView = (role: string, currentView: View): boolean => {
  if (PUBLIC_VIEWS.has(currentView)) return false;
  return (role === "teacher" || role === "admin")
    ? TEACHER_VIEWS.has(currentView)
    : STUDENT_VIEWS.has(currentView);
};
