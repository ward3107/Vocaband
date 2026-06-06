/**
 * Shared types + helpers for the admin Developer Dashboard panels.
 * Data shapes mirror the JSONB returned by the admin_* RPCs in
 * supabase/migrations/20260624000000_developer_dashboard_admin_rpcs.sql
 * and supabase/migrations/20260626000000_developer_dashboard_batch1_rpcs.sql.
 */
import { supabase } from "../../core/supabase";

export interface DevOverview {
  teachers: number;
  students: number;
  managers: number;
  admins: number;
  classes: number;
  schools: number;
  ai_cost_micro_today: number;
  ai_cost_micro_7d: number;
  ai_cost_micro_30d: number;
  ai_calls_30d: number;
}

export interface DevAiUsage {
  days: number;
  by_day: { day: string; calls: number; cost_micro: number }[];
  by_action: { action: string; calls: number; cost_micro: number }[];
  top_teachers: { teacher_uid: string; email: string | null; calls: number; cost_micro: number }[];
}

export interface DevEntitlement {
  email: string;
  uid: string | null;
  role: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  school_id: string | null;
  school_name: string | null;
  ai_enabled: boolean;
  /** Admin kill-switch: when true, all AI is denied for this teacher
   *  regardless of plan/trial. Toggled via admin_set_ai_disabled. */
  ai_disabled: boolean;
  allowlisted: boolean;
  signed_up: boolean;
}

export interface DevSchool {
  id: string;
  name: string;
  school_code: string | null;
  created_at: string;
  teachers: number;
  students: number;
  managers: string[];
}

/** One class returned by admin_bulk_seed_school for the printable handoff. */
export interface SeededClass {
  class_code: string;
  class_name: string;
  grade: number;
  branch: number;
  teacher_email: string | null;
  claimed: boolean;
  students: { code: string; pin: string }[];
}

export interface SeedSchoolResult {
  success: boolean;
  school_code: string;
  classes: SeededClass[];
}

export interface ProviderCost {
  configured: boolean;
  ok?: boolean;
  costUsd?: number;
  status?: number;
  message?: string;
  reason?: string;
}

export interface ProviderBilling {
  days: number;
  anthropic: ProviderCost;
  google: ProviderCost;
}

/** One row of the "Connected services" inventory (admin_integrations endpoint). */
export interface DevIntegration {
  id: string;
  name: string;
  category: string;
  role: string;
  status: "active" | "partial" | "degraded" | "off" | "not_configured";
  detail: string;
  consoleUrl: string;
}

export interface DevIntegrations {
  generatedAt: string;
  services: DevIntegration[];
}

export interface DevUserSearchResult {
  uid: string;
  email: string | null;
  display_name: string;
  role: string;
  plan: string | null;
  trial_ends_at: string | null;
  school_id: string | null;
  school_name: string | null;
  first_seen_at: string | null;
  consent_given_at: string | null;
  classes: { id: string; name: string; code: string; student_count: number }[];
  last_activity_at: string | null;
}

export interface DevAuditEntry {
  id: string;
  actor_uid: string;
  actor_email: string | null;
  action: string;
  data_category: string | null;
  target_uid: string | null;
  target_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DevTrialFunnel {
  days: number;
  trialing_now: number;
  expired: number;
  converted: number;
  conversion_rate: number;
  paid_total: { pro: number; school: number };
  trialing_buckets: { days_left: number; count: number }[];
  trialing_teachers: {
    uid: string;
    email: string | null;
    display_name: string;
    school_name: string | null;
    trial_ends_at: string;
    first_seen_at: string | null;
    days_left: number;
  }[];
}

export interface DevFeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_email: string | null;
}

export interface DevAnnouncement {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  audience: "teachers" | "students" | "all";
  starts_at: string;
  ends_at: string | null;
  dismissible: boolean;
  created_by: string;
  created_by_email: string | null;
  created_at: string;
  is_active: boolean;
  dismissed_count: number;
}

/** Subset of fields the user-facing banner needs (no admin-only stats). */
export interface ActiveAnnouncement {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  dismissible: boolean;
}

export interface DevSecurityCheck {
  key: string;
  title: string;
  description: string;
  cadence_days: number;
  cadence_label: string;
  last_performed_at: string | null;
  last_performed_by_email: string | null;
  last_notes: string | null;
  days_since_last: number | null;
  overdue_days: number | null;
}

export interface DevOnboardingFunnel {
  days: number;
  signed_up: number;
  made_class: number;
  made_assignment: number;
  got_student: number;
  rates: { class_pct: number; assignment_pct: number; student_pct: number };
}

export interface DevTopModes {
  days: number;
  modes: { mode: string; plays: number; players: number; avg_score: number }[];
  assignments: { assignment_id: string; title: string; class_name: string; plays: number; players: number }[];
}

export interface DevActiveUsers {
  students: { dau: number; wau: number; mau: number };
  teachers: { dau: number; wau: number; mau: number };
}

export interface DevDbHealth {
  table_sizes: { table: string; total_bytes: number; rows_estimate: number }[];
  rls_coverage: { table: string; rls_enabled: boolean; policy_count: number }[];
  slow_queries_available: boolean;
  slow_queries: { query: string; calls: number; mean_ms: number; total_ms: number }[];
}

export interface DevRecentExports {
  hours: number;
  total: number;
  by_actor: { actor_uid: string; actor_email: string | null; count: number; last_at: string }[];
}

/** micro-USD (1 = $0.000001) → "$1.23". */
export function fmtUsd(micro: number | null | undefined): string {
  return `$${((micro ?? 0) / 1_000_000).toFixed(2)}`;
}

/** GET an admin API endpoint with the current session's bearer token.
 *  Returns null on any non-OK / network error (callers render a fallback). */
export async function adminApiGet<T>(path: string): Promise<T | null> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function fmtNum(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString();
}

type ToastFn = (msg: string, type?: "success" | "error" | "info") => void;

/**
 * Calls an admin RPC and returns its JSONB payload (or null on error).
 * Errors are surfaced via the provided toast so a denied/admin-only call
 * doesn't silently no-op.
 */
export async function callAdminRpc<T>(
  fn: string,
  args: Record<string, unknown>,
  showToast: ToastFn,
): Promise<T | null> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    showToast(error.message || "Admin action failed", "error");
    return null;
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Module-level TTL cache for admin RPC reads.
//
// Reason: the developer dashboard mounts as a top-level View. Navigating away
// (to /teacher-dashboard, /voca-picker, …) unmounts it; coming back remounts
// and refires every read RPC. For an admin power-user that's wasteful — the
// overview KPIs especially are expensive joins. A 60s TTL cache keeps returns
// instant within a session while still being fresh enough for support work.
//
// Mutations use the un-cached `callAdminRpc` and should invoke
// `invalidateAdminRpcCache(fn)` after success so subsequent reads see the
// new state immediately.
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  freshUntil: number;
}

const RPC_CACHE = new Map<string, CacheEntry<unknown>>();
const RPC_CACHE_TTL_MS = 60_000;

const cacheKey = (fn: string, args: Record<string, unknown>): string =>
  `${fn}::${JSON.stringify(args)}`;

/**
 * Cached variant of `callAdminRpc`. Returns the cached value if it's still
 * within TTL, otherwise fetches and stores. Pass `force: true` to bypass
 * the cache (e.g. for an explicit "Refresh" button).
 */
export async function callAdminRpcCached<T>(
  fn: string,
  args: Record<string, unknown>,
  showToast: ToastFn,
  opts: { force?: boolean } = {},
): Promise<T | null> {
  const key = cacheKey(fn, args);
  if (!opts.force) {
    const hit = RPC_CACHE.get(key) as CacheEntry<T> | undefined;
    if (hit && hit.freshUntil > Date.now()) return hit.value;
  }
  const fresh = await callAdminRpc<T>(fn, args, showToast);
  if (fresh !== null) {
    RPC_CACHE.set(key, { value: fresh, freshUntil: Date.now() + RPC_CACHE_TTL_MS });
  }
  return fresh;
}

/** Clear cached entries — all when fn is omitted, or just one RPC's entries. */
export function invalidateAdminRpcCache(fn?: string): void {
  if (!fn) {
    RPC_CACHE.clear();
    return;
  }
  const prefix = `${fn}::`;
  for (const key of RPC_CACHE.keys()) {
    if (key.startsWith(prefix)) RPC_CACHE.delete(key);
  }
}
