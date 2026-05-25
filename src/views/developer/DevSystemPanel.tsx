import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { getTrackedErrors, clearTrackedErrors, type TrackedError } from "../../errorTracking";

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

export default function DevSystemPanel() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [errors, setErrors] = useState<TrackedError[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      probe("API (Fly.io)", "/api/health"),
      probe("Redis", "/api/health/redis"),
      probe("Audit triggers", "/api/health/audit-log"),
    ]);
    setServices(results);
    setErrors([...getTrackedErrors()].reverse());
    setLoading(false);
  }, []);

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
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {services.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
            {s.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            <div>
              <div className="text-white font-bold text-sm">{s.label}</div>
              <div className="text-white/40 text-xs">{s.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="font-black text-white/80 text-sm">Client errors (this session)</span>
          {errors.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearTrackedErrors();
                setErrors([]);
              }}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="text-white/40 hover:text-rose-300 flex items-center gap-1 text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {errors.length === 0 ? (
          <p className="px-5 pb-4 text-white/40 text-sm">No tracked errors. 🎉</p>
        ) : (
          <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {errors.map((e, i) => (
              <li key={`${e.timestamp}-${i}`} className="px-5 py-2 text-xs">
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
