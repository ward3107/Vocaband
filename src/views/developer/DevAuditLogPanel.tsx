import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, UserCog, KeyRound, Trash2, Sparkles, AlertCircle } from "lucide-react";
import { callAdminRpcCached, invalidateAdminRpcCache, type DevAuditEntry } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const SINCE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "All", hours: null },
];

const ACTION_ICONS: Record<string, { icon: typeof ShieldCheck; cls: string }> = {
  role_change:        { icon: UserCog,    cls: "text-rose-300" },
  plan_change:        { icon: KeyRound,   cls: "text-amber-300" },
  allowlist_add:      { icon: Sparkles,   cls: "text-emerald-300" },
  allowlist_remove:   { icon: Trash2,     cls: "text-rose-300" },
  allowlist_update:   { icon: UserCog,    cls: "text-amber-300" },
  admin_delete_user:  { icon: Trash2,     cls: "text-rose-400" },
  admin_export_user:  { icon: ShieldCheck, cls: "text-sky-300" },
  delete_account:     { icon: Trash2,     cls: "text-rose-300" },
  export_data:        { icon: ShieldCheck, cls: "text-sky-300" },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderMetadata(meta: Record<string, unknown> | null): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default function DevAuditLogPanel({ showToast }: Props) {
  const [entries, setEntries] = useState<DevAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinceIdx, setSinceIdx] = useState<number>(1); // default 7d
  const [actionFilter, setActionFilter] = useState<string>("");

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    const hours = SINCE_OPTIONS[sinceIdx].hours;
    const sinceIso = hours !== null
      ? new Date(Date.now() - hours * 3_600_000).toISOString()
      : null;
    const args = {
      p_limit: 250,
      p_action: actionFilter || null,
      p_actor: null,
      p_since: sinceIso,
    };
    if (force) invalidateAdminRpcCache("admin_list_audit_log");
    const res = await callAdminRpcCached<DevAuditEntry[]>("admin_list_audit_log", args, showToast);
    setEntries(res ?? []);
    setLoading(false);
  }, [sinceIdx, actionFilter, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void reload();
  }, [reload]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {SINCE_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSinceIdx(i)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-4 py-2 rounded-xl font-bold text-base transition-all ${
                sinceIdx === i ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base font-bold"
        >
          <option value="" className="bg-slate-800">All actions</option>
          <option value="role_change" className="bg-slate-800">Role change</option>
          <option value="plan_change" className="bg-slate-800">Plan change</option>
          <option value="allowlist_add" className="bg-slate-800">Allowlist add</option>
          <option value="allowlist_remove" className="bg-slate-800">Allowlist remove</option>
          <option value="admin_delete_user" className="bg-slate-800">Admin delete</option>
          <option value="admin_export_user" className="bg-slate-800">Admin export</option>
        </select>

        <button
          type="button"
          onClick={() => void reload(true)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-base font-bold flex items-center gap-2 ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-5 py-6 text-white/40 text-base">No audit entries in this window.</p>
        ) : (
          <ul className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {entries.map((e) => {
              const { icon: Icon, cls } = ACTION_ICONS[e.action] ?? { icon: AlertCircle, cls: "text-white/40" };
              return (
                <li key={e.id} className="px-5 py-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-1 shrink-0 ${cls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-base">{e.action}</span>
                      {e.data_category && (
                        <span className="text-white/40 text-sm">· {e.data_category}</span>
                      )}
                    </div>
                    <div className="text-white/60 text-sm mt-0.5">
                      <span className="font-bold text-white/80">{e.actor_email ?? e.actor_uid}</span>
                      {e.target_email && (
                        <> → <span className="font-bold text-white/80">{e.target_email}</span></>
                      )}
                      {!e.target_email && e.target_uid && (
                        <> → <span className="font-mono text-sm">{e.target_uid}</span></>
                      )}
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="text-white/40 text-sm mt-0.5 font-mono break-all">
                        {renderMetadata(e.metadata)}
                      </div>
                    )}
                  </div>
                  <span className="text-white/40 text-sm shrink-0 mt-1">{fmtTime(e.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
