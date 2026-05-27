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
  // Admin-only Developer Dashboard — AI cost, entitlements (teacher/AI/plan/
  // school), system health, and infra in one place. Backed by the admin RPCs
  // in supabase/migrations/20260624000000_developer_dashboard_admin_rpcs.sql.
  | "developer-dashboard"
  | "quick-play-setup"
  | "quick-play-teacher-monitor"
  | "quick-play-student"
  // Category Race (live, teacher-driven Eretz-Ir / Scattergories).
  // Built on the Quick Play socket rails — a race session is a
  // quick_play_sessions row whose allowed_modes is [QP_CATEGORY_RACE_MODE]
  // and whose word list is empty. The teacher hosts + runs rounds; each
  // student joins via code/QR and answers in a full-screen focus card.
  | "category-race-host"
  | "category-race-student"
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

