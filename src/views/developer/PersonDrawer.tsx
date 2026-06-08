import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, UserCog, ArrowDown, Download, Trash2, GraduationCap, Building2,
  Calendar, Sparkles, ShieldCheck,
} from "lucide-react";
import { callAdminRpc, invalidateAdminRpcCache, type DevUserSearchResult } from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

/** Label/value row used throughout the drawer's detail card. */
function InfoRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/40 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</span>
      <span className="text-white font-bold truncate">{value}</span>
    </div>
  );
}

interface Props {
  person: DevUserSearchResult | null;
  onClose: () => void;
  /** Fired after a mutation so the shell can refresh KPIs + caches. */
  onChanged: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-200",
  manager: "bg-sky-500/20 text-sky-200",
  teacher: "bg-violet-500/20 text-violet-200",
  student: "bg-emerald-500/20 text-emerald-200",
};
const PLANS = ["free", "pro", "school"] as const;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

function downloadJson(filename: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Person 360 — one slide-over for a user's whole lifecycle: identity, school,
 * classes, activity, plus role / plan / export / delete in one place instead of
 * three tabs. AI kill-switches stay in Entitlements (teacher-specific flags).
 */
export default function PersonDrawer({ person, onClose, onChanged, showToast }: Props) {
  const [local, setLocal] = useState<DevUserSearchResult | null>(person);
  const [busy, setBusy] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Mirror the incoming person so optimistic role/plan edits show immediately.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local copy when the selected person changes
    setLocal(person);
  }, [person]);

  useEffect(() => {
    if (!person) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [person, busy, onClose]);

  if (!local) return null;
  const p = local;
  const canDelete = p.role !== "admin" && p.role !== "manager";

  const bustCaches = () => {
    invalidateAdminRpcCache("admin_search_users");
    invalidateAdminRpcCache("admin_list_entitlements");
    invalidateAdminRpcCache("admin_dashboard_overview");
    onChanged();
  };

  const setRole = async (role: "teacher" | "student") => {
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>("admin_set_role", { p_uid: p.uid, p_role: role }, showToast);
    setBusy(false);
    setConfirmDemote(false);
    if (res?.success) { showToast(`${p.email ?? p.uid} → ${role}`, "success"); setLocal({ ...p, role }); bustCaches(); }
  };

  const setPlan = async (plan: string) => {
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>("admin_set_plan", { p_uid: p.uid, p_plan: plan, p_trial_ends_at: null }, showToast);
    setBusy(false);
    if (res?.success) { showToast("Plan updated", "success"); setLocal({ ...p, plan }); bustCaches(); }
  };

  const exportData = async () => {
    setBusy(true);
    const res = await callAdminRpc<unknown>("admin_export_user_data", { p_uid: p.uid }, showToast);
    setBusy(false);
    if (res) {
      const safe = (p.email ?? p.uid).replace(/[^a-z0-9.@_-]/gi, "_");
      downloadJson(`vocaband-export-${safe}-${Date.now()}.json`, res);
      showToast("Export downloaded", "success");
    }
  };

  const del = async (reason: string) => {
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>("admin_delete_user_account", { p_uid: p.uid, p_reason: reason || null }, showToast);
    setBusy(false);
    setConfirmDelete(false);
    if (res) { showToast(`Deleted ${p.email ?? p.uid}`, "success"); bustCaches(); onClose(); }
  };

  return (
    <AnimatePresence>
      {person && (
        <motion.div className="fixed inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-white/10 overflow-y-auto"
          >
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur px-5 py-4 border-b border-white/10 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-white font-black text-lg truncate">{p.display_name || p.email || p.uid}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${ROLE_BADGE[p.role] ?? "bg-white/10"}`}>{p.role}</span>
                </div>
                <div className="text-white/50 text-sm truncate">{p.email ?? "—"}</div>
              </div>
              <button type="button" onClick={() => !busy && onClose()} aria-label="Close" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2.5">
                {p.school_name && <InfoRow icon={Building2} label="School" value={p.school_name} />}
                <InfoRow icon={Calendar} label="First seen" value={fmtDate(p.first_seen_at)} />
                <InfoRow icon={Sparkles} label="Last activity" value={fmtDate(p.last_activity_at)} />
                {p.consent_given_at && <InfoRow icon={ShieldCheck} label="Consent" value={fmtDate(p.consent_given_at)} />}
                <InfoRow icon={UserCog} label="UID" value={<span className="font-mono text-xs">{p.uid.slice(0, 12)}…</span>} />
              </div>

              {p.classes.length > 0 && (
                <div>
                  <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> Classes ({p.classes.length})
                  </div>
                  <div className="space-y-1.5">
                    {p.classes.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-3 py-2">
                        <span className="text-white font-bold truncate">{c.name}</span>
                        <span className="text-white/50 font-mono text-sm shrink-0">{c.code} · {c.student_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan (teachers) */}
              {p.role === "teacher" && (
                <div>
                  <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-2">Plan</div>
                  <select
                    value={p.plan ?? "free"}
                    disabled={busy}
                    onChange={(e) => void setPlan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base font-bold disabled:opacity-40"
                  >
                    {PLANS.map((pl) => <option key={pl} value={pl} className="bg-slate-800">{pl}</option>)}
                  </select>
                  <p className="text-white/30 text-xs mt-1.5">AI kill-switch + Vocabagrut access live in the Entitlements tab.</p>
                </div>
              )}

              {/* Role */}
              {(p.role === "student" || p.role === "teacher") && (
                <div className="flex flex-wrap gap-2">
                  {p.role === "student" && (
                    <button type="button" disabled={busy} onClick={() => void setRole("teacher")}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2">
                      <UserCog className="w-4 h-4" /> Promote to teacher
                    </button>
                  )}
                  {p.role === "teacher" && (
                    <button type="button" disabled={busy} onClick={() => setConfirmDemote(true)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/15 disabled:opacity-50 text-white/70 hover:text-rose-200 font-bold text-base flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" /> Demote to student
                    </button>
                  )}
                </div>
              )}

              {/* GDPR */}
              <div className="border-t border-white/10 pt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void exportData()}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export (JSON)
                </button>
                {canDelete && (
                  <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 font-bold text-base flex items-center gap-2 ml-auto">
                    <Trash2 className="w-4 h-4" /> Delete account
                  </button>
                )}
              </div>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmDemote}
            tone="warning"
            title="Demote to student?"
            body={<>Demotes <strong className="text-white">{p.email ?? p.uid}</strong> from teacher to student. They lose access to their {p.classes.length} class(es) — class data is kept.</>}
            confirmLabel="Demote"
            busy={busy}
            onConfirm={() => void setRole("student")}
            onCancel={() => setConfirmDemote(false)}
          />
          <ConfirmDialog
            open={confirmDelete}
            tone="danger"
            title="Delete this account?"
            body={<>Hard erasure of <strong className="text-white">{p.email ?? p.uid}</strong> — progress, classes, profile and auth identity. Irreversible. Audit log is retained 730 days.</>}
            confirmPhrase={p.email ?? undefined}
            reason={{ placeholder: "Reason (parent request ticket #…) — audit-logged", required: false }}
            confirmLabel="Delete account"
            busy={busy}
            onConfirm={(reason) => void del(reason)}
            onCancel={() => setConfirmDelete(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
