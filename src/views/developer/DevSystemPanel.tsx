import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Trash2, Database, Lock, Unlock } from "lucide-react";
import { getTrackedErrors, clearTrackedErrors, type TrackedError } from "../../errorTracking";
import { callAdminRpcCached, type DevDbHealth } from "./devShared";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface ServiceStatus {
  label: string;
  status: string;
  ok: boolean;
}

async function probe(label: string, path: string): Promise<ServiceStatus> {
  try {
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    const body = (await res.json().catch(() => ({}))) as { status?: string };
    const status = body.status ?? (res.ok ? "ok" : `http ${res.status}`);
    return { label, status, ok: res.ok && status !== "error" && status !== "broken" };
  } catch {
    return { label, status: "unreachable", ok: false };
  }
}

const SEV_COLOR: Record<string, string> = {
  high: "text-rose-300",
  medium: "text-amber-300",
  low: "text-white/40",
};

interface Props {
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

const noopToast: NonNullable<Props["showToast"]> = () => {};

export default function DevSystemPanel({ showToast }: Props = {}) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [errors, setErrors] = useState<TrackedError[]>([]);
  const [dbHealth, setDbHealth] = useState<DevDbHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = showToast ?? noopToast;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [serviceResults, db] = await Promise.all([
      Promise.all([
        probe("API (Fly.io)", "/api/health"),
        probe("Redis", "/api/health/redis"),
        probe("Audit triggers", "/api/health/audit-log"),
      ]),
      callAdminRpcCached<DevDbHealth>("admin_db_health", {}, toast),
    ]);
    setServices(serviceResults);
    setDbHealth(db);
    setErrors([...getTrackedErrors()].reverse());
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refresh()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-base font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {services.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
            {s.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            <div>
              <div className="text-white font-bold text-base">{s.label}</div>
              <div className="text-white/40 text-sm">{s.status}</div>
            </div>
          </div>
        ))}
      </div>

      {dbHealth && (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2 border-b border-white/5">
              <Database className="w-4 h-4 text-indigo-300" />
              <span className="font-black text-white/80 text-base">Table sizes</span>
              <span className="text-white/40 text-sm ml-auto">top {dbHealth.table_sizes.length}</span>
            </div>
            <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {dbHealth.table_sizes.map((t) => (
                <li key={t.table} className="px-5 py-2 flex items-center gap-3">
                  <span className="text-white font-mono text-sm flex-1 truncate">{t.table}</span>
                  <span className="text-white/40 text-sm shrink-0">{t.rows_estimate.toLocaleString()} rows</span>
                  <span className="text-emerald-300 font-bold text-sm shrink-0 w-20 text-right">{fmtBytes(t.total_bytes)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2 border-b border-white/5">
              <Lock className="w-4 h-4 text-indigo-300" />
              <span className="font-black text-white/80 text-base">RLS coverage</span>
              <span className="text-white/40 text-sm ml-auto">
                {dbHealth.rls_coverage.filter((r) => r.rls_enabled).length} / {dbHealth.rls_coverage.length} enabled
              </span>
            </div>
            <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {dbHealth.rls_coverage.map((r) => (
                <li key={r.table} className="px-5 py-2 flex items-center gap-3">
                  {r.rls_enabled
                    ? <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <Unlock className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className="text-white font-mono text-sm flex-1 truncate">{r.table}</span>
                  <span className={`text-sm shrink-0 ${r.rls_enabled ? "text-white/40" : "text-rose-300 font-bold"}`}>
                    {r.policy_count} polic{r.policy_count === 1 ? "y" : "ies"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {dbHealth.slow_queries_available && dbHealth.slow_queries.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <span className="font-black text-white/80 text-base">Top slow queries (cumulative)</span>
              </div>
              <ul className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                {dbHealth.slow_queries.map((q, i) => (
                  <li key={i} className="px-5 py-2">
                    <div className="text-white/80 font-mono text-sm truncate">{q.query}</div>
                    <div className="text-white/40 text-sm mt-1">
                      {q.calls.toLocaleString()} calls · avg {q.mean_ms} ms · total {q.total_ms.toLocaleString()} ms
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!dbHealth.slow_queries_available && (
            <p className="text-white/30 text-sm">
              pg_stat_statements extension not enabled — slow-query telemetry unavailable. Enable in Supabase dashboard → Database → Extensions.
            </p>
          )}
        </>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="font-black text-white/80 text-base">Client errors (this session)</span>
          {errors.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearTrackedErrors();
                setErrors([]);
              }}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="text-white/40 hover:text-rose-300 flex items-center gap-1 text-sm font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {errors.length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-base">No tracked errors. 🎉</p>
        ) : (
          <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {errors.map((e, i) => (
              <li key={`${e.timestamp}-${i}`} className="px-5 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-3.5 h-3.5 ${SEV_COLOR[e.severity] ?? "text-white/40"}`} />
                  <span className="text-white/80 font-bold">{e.message}</span>
                </div>
                <div className="text-white/30 mt-0.5">
                  {e.category} · {new Date(e.timestamp).toLocaleTimeString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
