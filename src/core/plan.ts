/**
 * plan.ts — runtime evaluation of a teacher's effective plan.
 *
 * The DB stores `plan` (paid state: 'free' | 'pro' | 'school') and
 * `trial_ends_at` (when the 30-day Pro trial expires).  This module
 * resolves the EFFECTIVE plan a teacher should experience right now
 * and exposes the limits that gate Free-tier teachers in the UI.
 *
 * Doing this at runtime (rather than via a daily cron that flips
 * trialing → free) keeps the DB declarative: the trial naturally
 * "expires" at midnight without any background job touching rows.
 *
 * Server-side enforcement of these gates is a follow-up — see
 * docs/PRICING-MODEL.md Status section.  Client gates are the first
 * line of defense + the UX layer (toasts, paywall hints).
 */

import type { AppUser } from "./supabase";

export type EffectivePlan = "free" | "pro" | "school";

/**
 * What plan should this teacher experience RIGHT NOW?
 *
 * - `school` if the school explicitly bought a license for them
 * - `pro` if they paid OR they're inside the 30-day trial window
 * - `free` otherwise
 *
 * Students always read as `free` — plan only applies to teachers,
 * but rather than throw when a student is passed in, we just return
 * a safe default so callers don't need a separate guard.
 */
export function getEffectivePlan(user: AppUser | null | undefined): EffectivePlan {
  if (!user || user.role !== "teacher") return "free";
  if (user.plan === "school") return "school";
  if (user.plan === "pro") return "pro";
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

/** Is the teacher inside their 30-day trial window? (Used for the "X
 *  days of Pro left" banner.  Returns false for paid Pro/School users
 *  even though they have Pro features — the banner only makes sense
 *  for trialing free users.) */
export function isTrialing(user: AppUser | null | undefined): boolean {
  if (!user || user.role !== "teacher") return false;
  if (user.plan !== "free") return false;
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
// sync with src/locales/student/landing-page.ts pricingFreeFeature*.

export const FREE_TIER_LIMITS = {
  /** Max classes a Free teacher can own.  Pro/School are unlimited. */
  MAX_CLASSES: 1,
  /** Max approved students per class for a Free teacher.  Pro/School
   *  are unlimited.  The cap is per-class, not total — sharing across
   *  multiple classes isn't possible on Free anyway since MAX_CLASSES
   *  is 1, but the gate is per-class for forward compatibility. */
  MAX_STUDENTS_PER_CLASS: 30,
} as const;

/** A new teacher's trial window: 30 days from signup. */
export const TRIAL_DURATION_DAYS = 30;

/** Helper to compute a fresh trial-end timestamp at signup. */
export function freshTrialEndsAt(): string {
  return new Date(Date.now() + TRIAL_DURATION_DAYS * 86_400_000).toISOString();
}
