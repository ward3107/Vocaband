import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { adminApiGet, type DevIntegration, type DevIntegrations } from "./devShared";

const STATUS: Record<DevIntegration["status"], { dot: string; label: string }> = {
  active: { dot: "bg-emerald-400", label: "Active" },
  partial: { dot: "bg-amber-400", label: "Partial" },
  degraded: { dot: "bg-amber-400", label: "Degraded" },
  off: { dot: "bg-white/30", label: "Off" },
  not_configured: { dot: "bg-rose-400", label: "Not set" },
};

/** Live inventory of every external service the project wires — replaces the
 *  old static console-link grid so admins can SEE everything that's connected. */
export default function DevIntegrationsSection() {
  const [data, setData] = useState<DevIntegrations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (DevInfraPanel etc.)
    setLoading(true);
    void adminApiGet<DevIntegrations>("/api/admin/integrations").then((d) => {
      if (cancelled) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between">
        <span className="font-black text-white/80 text-sm">Connected services</span>
        {loading && <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />}
      </div>
      {!data ? (
        <p className="px-5 pb-4 text-white/40 text-sm">Inventory unavailable.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {data.services.map((s) => {
            const st = STATUS[s.status];
            return (
              <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{s.name}</span>
                    <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">{s.category}</span>
                  </div>
                  <div className="text-white/50 text-xs truncate">{s.role}</div>
                  <div className="text-white/30 text-[11px] mt-0.5">
                    {st.label} · {s.detail}
                  </div>
                </div>
                <a
                  href={s.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 shrink-0"
                  aria-label={`Open ${s.name} console`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
