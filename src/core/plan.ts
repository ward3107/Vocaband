/* Resolve the signed-in teacher's access for display. The database controls
 * purchases, class capacity, assignments and premium operations. */
import type { AppUser } from "./supabase";

export type EffectivePlan = "free" | "teacher" | "pro" | "school";

/**
 * What plan should this teacher experience RIGHT NOW?
 *
 * - `pro` if they have the `admin` role (developer / operator)
 * - `school` if their own plan is a school license, OR they belong to a school
 *   whose license is active (a paid school or an unexpired school-wide trial) —
 *   "whole school = all Pro", mirrors is_pro_or_trialing() in the DB and
 *   requireProTeacher on the server
 * - `teacher` for the base paid plan
 * - `pro` for Pro and the 14-day trial
 * - `free` otherwise
 *
 * Students always read as `free` — plan only applies to teachers,
 * but rather than throw when a student is passed in, we just return
 * a safe default so callers don't need a separate guard.  Admin is
 * treated as a teacher superset (matches hasTeacherAccess() in
 * supabase.ts), so admins reach the teacher UI AND get Pro features.
 */
export function getEffectivePlan(user: AppUser | null | undefined): EffectivePlan {
  if (!user) return "free";
  // NOTE: the developer-email bypass deliberately does NOT run here.
  // Importing the allowlist shipped the operator's address inside every
  // JS bundle (it is plain text in the client chunk). The bypass still
  // exists where it is actually enforced — requireProTeacher in server.ts
  // and is_pro_or_trialing() in SQL — and the operator account carries
  // role=admin, which the very next line already resolves to Pro. So
  // dropping the client-side check costs nothing and stops publishing a
  // personal email to every visitor.
  if (user.role === "admin") return "pro";
  if (user.role !== "teacher") return "free";
  if (user.plan === "school") return "school";
  // Whole-school license: a teacher in a paid school (or one on a school-wide
  // trial) inherits Pro even when their own plan is free. schoolPlan /
  // schoolTrialEndsAt are attached at load time by fetchUserProfile.
  if (user.schoolPlan === "school") return "school";
  if (
    user.schoolTrialEndsAt &&
    new Date(user.schoolTrialEndsAt).getTime() > Date.now()
  ) {
    return "school";
  }
  const paid = user.billingEntitlement;
  if (paid && paid.tier !== "free" && paid.tier !== "trial" &&
      (paid.until == null || Date.parse(paid.until) > Date.now())) return paid.tier;
  if (user.plan === "pro" || (!paid && user.billingPaidUntil && Date.parse(user.billingPaidUntil) > Date.now())) return "pro";
  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) {
    return "pro";
  }
  return "free";
}

/** Convenience: is the teacher entitled to Pro features right now? */
export function isPro(user: AppUser | null | undefined): boolean {
  const p = getEffectivePlan(user);
  return p === "pro" || p === "school";
}

export function hasPaidClassroom(user: AppUser | null | undefined): boolean {
  return getEffectivePlan(user) !== "free";
}

/** Is the teacher inside their 14-day trial window? (Used for the "X
 *  days of Pro left" banner.  Returns false for paid Pro/School users
 *  even though they have Pro features — the banner only makes sense
 *  for trialing free users.  Also false for admins so they never see
 *  the trial countdown banner.) */
export function isTrialing(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  // Dev-email check intentionally omitted — see getEffectivePlan. The
  // operator account is role=admin, which the next line already covers.
  if (user.role === "admin") return false;
  if (user.role !== "teacher") return false;
  if (user.plan !== "free") return false;
  const effective = getEffectivePlan(user);
  if (effective === "teacher" || effective === "school" ||
      Date.parse(user.billingPaidUntil ?? "") > Date.now()) return false;
  if (!user.trialEndsAt) return false;
  return new Date(user.trialEndsAt).getTime() > Date.now();
}

/**
 * Whole days remaining in the trial (rounded UP so "0.4 days left"
 * still shows as "1 day left" — better UX than the banner flickering
 * to "0 days").  Returns null when the user isn't trialing.
 */
export function getTrialDaysLeft(user: AppUser | null | undefined): number | null {
  if (!isTrialing(user)) return null;
  const ms = new Date(user!.trialEndsAt!).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ─── Free-tier limits ───────────────────────────────────────────────
// These are the hard caps shown on the public pricing card.  Keep in
// sync with the public pricing cards and the database limits.

export const FREE_TIER_LIMITS = {
  /** Max classes a Free teacher can own.  Pro/School are unlimited. */
  MAX_CLASSES: 1,
  /** Max approved students per class for a Free teacher.  Pro/School
   *  are unlimited.  The cap is per-class, not total — sharing across
   *  multiple classes isn't possible on Free anyway since MAX_CLASSES
   *  is 1, but the gate is per-class for forward compatibility. */
  MAX_STUDENTS_PER_CLASS: 30,
} as const;

/** A new teacher's trial window: 14 days from signup. */
export const TRIAL_DURATION_DAYS = 14;

/** Helper to compute a fresh trial-end timestamp at signup. */
export function freshTrialEndsAt(): string {
  return new Date(Date.now() + TRIAL_DURATION_DAYS * 86_400_000).toISOString();
}
