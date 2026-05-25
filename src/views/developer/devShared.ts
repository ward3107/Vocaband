/**
 * Shared types + helpers for the admin Developer Dashboard panels.
 * Data shapes mirror the JSONB returned by the admin_* RPCs in
 * supabase/migrations/20260525000000_developer_dashboard_admin_rpcs.sql.
 */
import { supabase } from "../../core/supabase";

export interface DevOverview {
  teachers: number;
  students: number;
  managers: number;
  admins: number;
  classes: number;
  schools: number;
  signups_7d: number;
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
  allowlisted: boolean;
  signed_up: boolean;
}

export interface DevSchool {
  id: string;
  name: string;
  created_at: string;
  teachers: number;
  students: number;
  managers: string[];
}

/** micro-USD (1 = $0.000001) → "$1.23". */
export function fmtUsd(micro: number | null | undefined): string {
  return `$${((micro ?? 0) / 1_000_000).toFixed(2)}`;
}

export function fmtNum(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString();
}

/**
 * Calls an admin RPC and returns its JSONB payload (or null on error).
 * Errors are surfaced via the provided toast so a denied/admin-only call
 * doesn't silently no-op.
 */
export async function callAdminRpc<T>(
  fn: string,
  args: Record<string, unknown>,
  showToast: (msg: string, type?: "success" | "error" | "info") => void,
): Promise<T | null> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    showToast(error.message || "Admin action failed", "error");
    return null;
  }
  return data as T;
}
