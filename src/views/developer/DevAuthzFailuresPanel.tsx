import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCw, Activity } from "lucide-react";
import { supabase } from "../../core/supabase";

/**
 * Authorization-failure log, folded into the dashboard's Security ops tab so
 * the admin has one command center instead of a separate light-themed page.
 * Reads `public.authz_failures` (admin-only via RLS — a non-admin gets an empty
 * set, which correctly renders "no events" without leaking that any exist).
 */
interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Row = {
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

type Range = "24h" | "7d" | "30d" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "30d", label: "30d" }, { id: "all", label: "All" },
];

function rangeStart(r: Range): string | null {
  const now = Date.now();
  const day = 86_400_000;
  if (r === "24h") return new Date(now - day).toISOString();
  if (r === "7d") return new Date(now - 7 * day).toISOString();
  if (r === "30d") return new Date(now - 30 * day).toISOString();
  return null;
}

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function DevAuthzFailuresPanel({ showToast }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("24h");
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("authz_failures")
      .select("id, occurred_at, actor_uid, actor_role, ip_address, endpoint, table_name, operation, reason, metadata")
      .order("occurred_at", { ascending: false })
      .limit(500);
    const start = rangeStart(range);
    if (start) q = q.gte("occurred_at", start);
    if (reasonFilter) q = q.eq("reason", reasonFilter);
    const { data, error } = await q;
    if (error) showToast(error.message || "Failed to load authz failures", "error");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [range, reasonFilter, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    void load();
  }, [load]);

  const reasonCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.reason, (m.get(r.reason) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-white/80 font-black text-base uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-300" /> Authorization failures
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm font-bold text-white/70 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`px-3 py-1 rounded-full text-sm font-bold ${range === r.id ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
          >
            {r.label}
          </button>
        ))}
        {reasonCounts.length > 0 && <span className="mx-1 w-px h-4 bg-white/10" />}
        {reasonFilter && (
          <button type="button" onClick={() => setReasonFilter(null)} className="px-3 py-1 rounded-full text-sm font-bold bg-white/15 text-white">
            {reasonFilter} ✕
          </button>
        )}
        {!reasonFilter && reasonCounts.slice(0, 6).map(([reason, count]) => (
          <button
            key={reason}
            type="button"
            onClick={() => setReasonFilter(reason)}
            className="px-3 py-1 rounded-full text-sm font-bold bg-white/5 text-white/50 hover:bg-white/10"
          >
            {reason} ({count})
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white/70 font-bold text-base">No authorization failures in this window.</p>
            <p className="text-white/40 text-sm mt-1">No probing observed, or the instrumentation hasn't logged any yet.</p>
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-start gap-3 text-sm">
              <span className="text-white/40 text-xs whitespace-nowrap w-16 shrink-0" title={r.occurred_at}>{formatWhen(r.occurred_at)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-200">{r.reason}</span>
                  <span className="text-white/70 font-mono text-xs truncate">{r.endpoint}</span>
                </div>
                <div className="text-white/40 text-xs mt-1 font-mono truncate">
                  {r.actor_uid ? `${r.actor_uid.slice(0, 8)}…` : "anon"}
                  {r.actor_role ? ` · ${r.actor_role}` : ""}
                  {r.ip_address ? ` · ${r.ip_address}` : ""}
                  {r.table_name ? ` · ${r.table_name}` : ""}
                  {r.operation ? ` · ${r.operation}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
