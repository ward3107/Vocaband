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
  | "public-faq"
  | "public-free-resources"
  | "public-status"
  | "accessibility-statement"
  | "teacher-login"
  | "student-account-login"
  | "student-pending-approval"
  | "landing"
  | "game"
  | "teacher-dashboard"
  | "teacher-approvals"
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
  | "class-show"
  | "worksheet"
  | "vocabagrut";

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
