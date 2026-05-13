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
  | "quick-play-setup"
  | "quick-play-teacher-monitor"
  | "quick-play-student"
  | "hot-seat"
  | "class-show"
  | "worksheet"
  | "vocabagrut"
  // VocaHebrew — shown when an entitled teacher (subjects_taught
  // contains 'hebrew') picks Hebrew on the Voca Picker post-login.
  // The picker itself only renders when subjects_taught.length >= 2;
  // teachers with a single Voca route straight to teacher-dashboard.
  | "voca-picker"
  | "vocahebrew-dashboard"
  | "vocahebrew-niqqud"
  | "vocahebrew-shoresh"
  | "vocahebrew-synonyms"
  | "vocahebrew-listening";

export type ShopTab =
  // "hub" = the Arcade Lobby landing screen (portal tiles + hero +
  // daily deal + trending rail).  Other values are category-focused
  // sheets reached from the hub.
  | "hub"
  | "eggs"
  | "avatars"
  | "themes"
  | "powerups"
  | "titles"
  | "frames"
  | "boosters";
