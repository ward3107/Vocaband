/**
 * Shared string-literal union types used across App.tsx and every
 * extracted view. Having them in one place avoids the
 * `Dispatch<SetStateAction<X>>` → `(x: string) => void` widening errors
 * that otherwise pile up when each view redeclares the type as `string`.
 */

export type View =
  | "public-landing"
  | "public-terms"
  | "public-privacy"
  | "public-security"
  | "public-free-resources"
  | "public-interactive-worksheet"
  | "public-status"
  | "accessibility-statement"
  | "teacher-login"
  | "student-account-login"
  | "student-pending-approval"
  | "landing"
  // School-manager (principal) read-only oversight dashboard.
  // See src/views/ManagerConsoleView.tsx + migrations
  // 20260623000000_school_manager.sql + 20260623000001_manager_console.sql.
  | "manager-dashboard"
  | "game"
  | "teacher-dashboard"
  | "teacher-approvals"
  | "worksheet-attempts"
  | "student-dashboard"
  | "create-assignment"
  | "gradebook"
  | "classroom"
  | "live-challenge"
  | "live-challenge-class-select"
  | "analytics"
  | "global-leaderboard"
  | "students"
  | "shop"
  | "privacy-settings"
  // Admin-only audit dashboard for authz-failure events
  // (security-audit-framework module 02, item #11).
  | "admin-security"
  | "quick-play-setup"
  | "quick-play-teacher-monitor"
  | "quick-play-student"
  | "hot-seat"
  | "wheel"
  | "class-show"
  | "worksheet"
  | "vocabagrut"
  // Vocabulary Library — teacher-owned persistent vocabulary storage.
  // Top: list of root Collections + unfiled Sets.
  // Detail variants navigate within nested folders / into a single Set.
  // See supabase/migrations/20260621000000_vocabulary_library.sql.
  | "vocabulary-library"
  | "vocabulary-collection"
  | "vocabulary-set-detail"
  | "vocabulary-set-builder"
  // VocaHebrew — shown when an admin picks Hebrew on the Voca Picker
  // post-login.  Teachers belong to a single Voca (users.subject) and
  // route straight to teacher-dashboard, skipping the picker entirely.
  | "voca-picker"
  | "vocahebrew-dashboard"
  | "vocahebrew-niqqud"
  | "vocahebrew-shoresh"
  | "vocahebrew-synonyms"
  | "vocahebrew-listening";

