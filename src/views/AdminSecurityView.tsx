import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { motion } from "motion/react";
import { ArrowLeft, RefreshCw, ShieldAlert, Filter, Activity } from "lucide-react";
import { supabase } from "../core/supabase";
import type { View } from "../core/views";

/**
 * Admin-only audit dashboard for authz-failure events
 * (security-audit-framework module 02, item #11).
 *
 * Reads `public.authz_failures`, which is admin-only via RLS — a non-admin
 * teacher landing here by URL trick gets back an empty result and the
 * dashboard renders "no events", which is the correct visible behaviour
 * (we don't leak that there ARE events they can't see).
 */

type AuthzFailureRow = {
  id: string;
  occurred_at: string;
  actor_uid: string | null;
  actor_role: string | null;
  ip_address: string | null;
  endpoint: string;
  table_name: string | null;
  operation: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
};

type RangeFilter = "24h" | "7d" | "30d" | "all";

const RANGE_LABELS: Record<RangeFilter, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time (cap 500)",
};

function rangeStart(range: RangeFilter): string | null {
  const now = Date.now();
  switch (range) {
    case "24h":
      return new Date(now - 24 * 3600 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    case "all":
      return null;
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
}

interface AdminSecurityViewProps {
  setView: Dispatch<SetStateAction<View>>;
}

export default function AdminSecurityView({ setView }: AdminSecurityViewProps) {
  const [rows, setRows] = useState<AuthzFailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>("24h");
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = rangeStart(range);
    let q = supabase
      .from("authz_failures")
      .select("id, occurred_at, actor_uid, actor_role, ip_address, endpoint, table_name, operation, reason, metadata")
      .order("occurred_at", { ascending: false })
      .limit(500);
    if (start) q = q.gte("occurred_at", start);
    if (reasonFilter) q = q.eq("reason", reasonFilter);
    const { data, error } = await q;
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AuthzFailureRow[]);
    }
    setLoading(false);
  }, [range, reasonFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reason-breakdown derived from the loaded rows so the chip row stays
  // honest with what's actually visible in the table below.
  const reasonCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.reason, (map.get(r.reason) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("teacher-dashboard")}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-white"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-8 text-white shadow-lg shadow-rose-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Security audit log</h1>
              <p className="mt-1 text-sm text-white/85">
                Authorization-failure events logged by the API + socket layer. Admin-only view.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-stone-500" />
          {(Object.keys(RANGE_LABELS) as RangeFilter[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                range === r
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-stone-700 hover:bg-stone-100"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {reasonCounts.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Reasons</span>
            <button
              type="button"
              onClick={() => setReasonFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                reasonFilter === null
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-100"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              All ({rows.length})
            </button>
            {reasonCounts.map(([reason, count]) => (
              <button
                key={reason}
                type="button"
                onClick={() => setReasonFilter(reason)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  reasonFilter === reason
                    ? "bg-stone-800 text-white"
                    : "bg-white text-stone-700 hover:bg-stone-100"
                }`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {reason} ({count})
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-rose-600">
              <p className="font-medium">Failed to load.</p>
              <p className="mt-1 text-sm text-stone-500">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Activity className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-base font-medium text-stone-800">No authz failures in this window.</p>
              <p className="mt-1 text-sm text-stone-500">
                Either no probing is happening, or the instrumentation hasn't observed any yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">When</th>
                    <th className="px-4 py-3 text-left font-medium">Actor</th>
                    <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map(r => (
                    <tr key={r.id} className="text-stone-700">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-500" title={r.occurred_at}>
                        {formatWhen(r.occurred_at)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono text-xs">
                          {r.actor_uid ? r.actor_uid.slice(0, 8) + "…" : <span className="text-stone-400">anon</span>}
                        </div>
                        <div className="text-xs text-stone-500">
                          {r.actor_role ?? "—"}
                          {r.ip_address ? ` · ${r.ip_address}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.endpoint}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          {r.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {r.table_name && <div>table: <span className="font-mono">{r.table_name}</span></div>}
                        {r.operation && <div>op: <span className="font-mono">{r.operation}</span></div>}
                        {r.metadata && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-stone-400">metadata</summary>
                            <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-stone-50 p-2 text-[10px] text-stone-600">
                              {JSON.stringify(r.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
