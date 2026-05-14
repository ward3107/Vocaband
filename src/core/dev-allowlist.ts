/**
 * dev-allowlist.ts — developer / operator email allowlist.
 *
 * Accounts whose email is in DEV_EMAILS are always treated as Pro,
 * regardless of `plan`, `trial_ends_at`, or `role`.  This is a
 * belt-and-suspenders defence: the `admin` role already grants Pro
 * via `is_admin()` in SQL and the parallel branch in plan.ts, but
 * if the role is ever flipped (manual DB edit, accidental reset)
 * the developer should still keep full access without re-issuing
 * a trial or paying themselves.
 *
 * Mirrored at three layers:
 *   - Client: isPro / isTrialing / getEffectivePlan (src/core/plan.ts)
 *   - Server: requireProTeacher (server.ts)
 *   - DB:     is_pro_or_trialing() SQL function (migration
 *             20260514_dev_email_pro_bypass.sql)
 *
 * Keep all three in sync.  Comparison is case-insensitive.
 */

export const DEV_EMAILS: readonly string[] = [
  "wasya92@gmail.com",
] as const;

export function isDevEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalised = email.trim().toLowerCase();
  return DEV_EMAILS.some((dev) => dev.toLowerCase() === normalised);
}
