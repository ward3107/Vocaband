import { useCallback, useEffect, useState } from "react";
import { Lock, Check, Clock, AlertTriangle, ChevronDown, Download } from "lucide-react";
import {
  callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache,
  type DevSecurityCheck, type DevRecentExports,
} from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type Status = "never" | "overdue" | "due_soon" | "ok";

function statusOf(c: DevSecurityCheck): Status {
  if (c.last_performed_at === null) return "never";
  if (c.overdue_days !== null && c.overdue_days > 0) return "overdue";
  // "due soon" = within 7 days of becoming overdue, or within 25% of cadence (whichever larger)
  const cushion = Math.max(7, Math.ceil(c.cadence_days * 0.25));
  if (c.days_since_last !== null && c.days_since_last >= c.cadence_days - cushion) return "due_soon";
  return "ok";
}

const STATUS_STYLE: Record<Status, { badge: string; label: string; icon: typeof Check }> = {
  never:    { badge: "bg-white/10 text-white/60",       label: "Never done",  icon: Clock },
  overdue:  { badge: "bg-rose-500/20 text-rose-200",    label: "Overdue",     icon: AlertTriangle },
  due_soon: { badge: "bg-amber-500/20 text-amber-200",  label: "Due soon",    icon: Clock },
  ok:       { badge: "bg-emerald-500/20 text-emerald-200", label: "On track", icon: Check },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function relativeAgo(days: number | null): string {
  if (days === null) return "never";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** Big countdown pill — "12d left", "3d overdue", or "Do now". */
function daysLeftDisplay(c: DevSecurityCheck): { text: string; sub: string; cls: string } {
  if (c.days_since_last === null) {
    return { text: "Do now", sub: "never done", cls: "bg-rose-500/20 text-rose-100 border-rose-500/40" };
  }
  const left = c.cadence_days - c.days_since_last;
  if (left < 0) {
    return {
      text: `${Math.abs(left)}d overdue`,
      sub: `was due ${Math.abs(left) === 1 ? "yesterday" : `${Math.abs(left)} days ago`}`,
      cls: "bg-rose-500/20 text-rose-100 border-rose-500/40",
    };
  }
  if (left === 0) {
    return { text: "Due today", sub: "do it now", cls: "bg-amber-500/20 text-amber-100 border-amber-500/40" };
  }
  // "due soon" cushion mirrors statusOf
  const cushion = Math.max(7, Math.ceil(c.cadence_days * 0.25));
  if (left <= cushion) {
    return {
      text: `${left}d left`,
      sub: `${c.cadence_days}d cadence`,
      cls: "bg-amber-500/20 text-amber-100 border-amber-500/40",
    };
  }
  return {
    text: `${left}d left`,
    sub: `${c.cadence_days}d cadence`,
    cls: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
  };
}

export default function DevSecurityChecklistPanel({ showToast }: Props) {
  const [checks, setChecks] = useState<DevSecurityCheck[]>([]);
  const [exports, setExports] = useState<DevRecentExports | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const [c, e] = await Promise.all([
      callAdminRpcCached<DevSecurityCheck[]>("admin_list_security_checks", {}, showToast),
      callAdminRpcCached<DevRecentExports>("admin_recent_exports", { p_hours: 24 }, showToast),
    ]);
    if (c) setChecks(c);
    if (e) setExports(e);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void reload();
  }, [reload]);

  const markDone = useCallback(async (key: string) => {
    setBusyKey(key);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_record_security_check",
      { p_key: key, p_notes: notesDraft[key]?.trim() || null },
      showToast,
    );
    setBusyKey(null);
    if (res?.success) {
      showToast("Marked done", "success");
      setNotesDraft((prev) => ({ ...prev, [key]: "" }));
      setOpenNotes(null);
      invalidateAdminRpcCache("admin_list_security_checks");
      invalidateAdminRpcCache("admin_list_audit_log");
      await reload();
    }
  }, [notesDraft, reload, showToast]);

  const overdueCount = checks.filter((c) => statusOf(c) === "overdue" || statusOf(c) === "never").length;
  const dueSoonCount = checks.filter((c) => statusOf(c) === "due_soon").length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-teal-500/15 via-cyan-500/15 to-sky-500/15 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-1">
          <Lock className="w-5 h-5 text-teal-300" /> Operational security checklist
        </div>
        <p className="text-white/60 text-sm">
          Recurring security tasks. Each "Mark done" stamps the time + actor in the DB and the audit log, so cadence is
          tracked across sessions and across admins.
        </p>
        {(overdueCount > 0 || dueSoonCount > 0) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {overdueCount > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-100 font-black text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {overdueCount} overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-100 font-black text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {dueSoonCount} due soon
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {checks.length === 0 && (
          <p className="text-white/40 text-base">Loading checks…</p>
        )}
        {checks.map((c) => {
          const status = statusOf(c);
          const { badge, label, icon: StatusIcon } = STATUS_STYLE[status];
          const isOpen = openNotes === c.key;
          return (
            <div
              key={c.key}
              className={`rounded-2xl border p-5 space-y-3 ${
                status === "overdue" || status === "never"
                  ? "bg-rose-500/5 border-rose-500/20"
                  : status === "due_soon"
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base">{c.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase flex items-center gap-1 ${badge}`}>
                      <StatusIcon className="w-3 h-3" /> {label}
                    </span>
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
                      {c.cadence_label}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mt-1">{c.description}</p>
                  <div className="text-white/40 text-sm mt-2">
                    Last done: {relativeAgo(c.days_since_last)}
                    {c.last_performed_at && <> · {fmtTime(c.last_performed_at)}</>}
                    {c.last_performed_by_email && <> · by {c.last_performed_by_email}</>}
                  </div>
                  {c.last_notes && (
                    <div className="text-white/50 text-sm mt-1 italic">"{c.last_notes}"</div>
                  )}
                </div>

                {(() => {
                  const d = daysLeftDisplay(c);
                  return (
                    <div className={`px-4 py-2 rounded-xl border text-center shrink-0 ${d.cls}`}>
                      <div className="font-black text-lg leading-none">{d.text}</div>
                      <div className="text-xs font-bold mt-1 opacity-80">{d.sub}</div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-2 flex-wrap items-start">
                <button
                  type="button"
                  disabled={busyKey === c.key}
                  onClick={() => void markDone(c.key)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Mark done
                </button>

                <button
                  type="button"
                  onClick={() => setOpenNotes(isOpen ? null : c.key)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-base font-bold flex items-center gap-2"
                >
                  Add notes <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isOpen && (
                <textarea
                  value={notesDraft[c.key] ?? ""}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [c.key]: e.target.value }))}
                  placeholder="Optional: what you found, ticket #, etc."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-teal-400"
                />
              )}
            </div>
          );
        })}
      </div>

      {exports && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-white/5">
            <Download className="w-4 h-4 text-sky-300" />
            <span className="text-white/80 font-black text-base">Recent admin exports · last 24h</span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-sm font-black ${
              exports.total === 0 ? "bg-white/10 text-white/50" :
              exports.total < 5   ? "bg-emerald-500/20 text-emerald-200" :
              exports.total < 20  ? "bg-amber-500/20 text-amber-200" :
                                    "bg-rose-500/20 text-rose-200"
            }`}>
              {exports.total} export{exports.total === 1 ? "" : "s"}
            </span>
          </div>
          {exports.by_actor.length === 0 ? (
            <p className="px-5 py-4 text-white/40 text-base">No admin exports in the last 24 hours.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {exports.by_actor.map((a) => (
                <li key={a.actor_uid} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-base truncate">{a.actor_email ?? a.actor_uid}</div>
                    <div className="text-white/40 text-sm">last at {fmtTime(a.last_at)}</div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-black text-base ${
                    a.count >= 20 ? "bg-rose-500/20 text-rose-200" :
                    a.count >= 5  ? "bg-amber-500/20 text-amber-200" :
                                    "bg-white/5 text-white/70"
                  }`}>
                    {a.count} exports
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="px-5 py-2 text-white/30 text-sm border-t border-white/5">
            Rate limit: 20 exports per admin per 24h. The 21st export call raises a hard error.
          </p>
        </div>
      )}
    </div>
  );
}
