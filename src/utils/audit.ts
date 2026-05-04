/**
 * audit.ts — best-effort write-only client for the public.audit_log
 * table.
 *
 * The table itself was created in supabase/migrations/010_privacy_compliance.sql
 * as part of the תיקון 13 / PPA accountability work — schema is
 * (actor_uid, action, data_category, target_uid, metadata, created_at).
 * The retention is 730 days (2 years) and the cleanup is run by the
 * cron job in 20260605_cleanup_expired_data_cron.sql.
 *
 * What it logs:
 *   - Actions that change another user's data (teacher viewing a
 *     student's gradebook, deleting a class, awarding a reward).
 *   - Account lifecycle events that aren't covered by the SQL RPCs
 *     directly (the export_my_data + delete_my_account RPCs already
 *     write their own entries).
 *
 * What it does NOT log:
 *   - Read-only navigation by the user themselves (visiting their own
 *     dashboard, looking at their own progress) — too noisy.
 *   - Anonymous Quick-Play guests doing things on their own ephemeral
 *     session — they have no identity to attribute.
 *
 * Design choices:
 *   - Best-effort: NEVER throws.  If the insert fails (network, RLS,
 *     missing auth), we swallow silently and keep the user moving.
 *     Audit logging is a compliance signal, not a hot-path dependency.
 *   - Async fire-and-forget: callers don't `await` it.  We deliberately
 *     return a Promise<void> so a caller CAN await if they need to
 *     guarantee the entry hits before the next action (rare).
 *   - No PII in `metadata`: callers should pass identifiers (class_id,
 *     assignment_id) — never names, emails, or scores.  The `target_uid`
 *     column is the formal place to attribute "this action affected
 *     user X".
 */
import { supabase } from "../core/supabase";

export type AuditAction =
  | "view_gradebook"
  | "delete_class"
  | "delete_assignment"
  | "award_reward"
  | "create_class"
  | "create_assignment"
  | "approve_student"
  | "reject_student"
  | "remove_student"
  | "edit_class"
  | "edit_assignment";

export type AuditDataCategory =
  | "progress"
  | "classes"
  | "assignments"
  | "users"
  | "rewards";

export interface LogAuditOptions {
  /** Affected user, if any.  E.g. the student whose gradebook was
   *  viewed, or the student receiving the reward.  Omit for actions
   *  on the actor's own data. */
  targetUid?: string;
  /** Extra context — class_id, assignment_id, etc.  NEVER PII. */
  metadata?: Record<string, unknown>;
}

export async function logAudit(
  action: AuditAction,
  dataCategory: AuditDataCategory,
  options: LogAuditOptions = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // anonymous / guest — nothing to attribute

    await supabase.from("audit_log").insert({
      actor_uid: user.id,
      action,
      data_category: dataCategory,
      target_uid: options.targetUid ?? null,
      metadata: options.metadata ?? null,
    });
  } catch {
    // Swallow.  Audit logging is best-effort — never block the user.
  }
}
