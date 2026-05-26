import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Sparkles } from "lucide-react";
import { callAdminRpc, type DevEntitlement } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const PLANS = ["free", "pro", "school"] as const;

const PLAN_BADGE: Record<string, string> = {
  pro: "bg-violet-500/20 text-violet-200",
  school: "bg-amber-500/20 text-amber-200",
  free: "bg-white/10 text-white/50",
};

export default function DevEntitlementsSection({ showToast }: Props) {
  const [items, setItems] = useState<DevEntitlement[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await callAdminRpc<DevEntitlement[]>("admin_list_entitlements", {}, showToast);
    if (res) setItems(res);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    void reload();
  }, [reload]);

  const run = useCallback(
    async (fn: string, args: Record<string, unknown>, ok: string) => {
      setBusy(true);
      const res = await callAdminRpc<{ success?: boolean }>(fn, args, showToast);
      setBusy(false);
      if (res) {
        showToast(ok, "success");
        await reload();
      }
    },
    [reload, showToast],
  );

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newEmail.trim()) void run("admin_add_teacher", { p_email: newEmail.trim() }, "Teacher added").then(() => setNewEmail(""));
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="teacher@school.edu"
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={busy}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add teacher
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {items.length === 0 && <p className="px-5 py-4 text-white/40 text-sm">No teachers yet.</p>}
        {items.map((it) => (
          <div key={it.email} className="px-5 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="text-white font-bold text-sm truncate">{it.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${PLAN_BADGE[it.plan ?? "free"]}`}>
                  {it.plan ?? "free"}
                </span>
                {it.role && it.role !== "teacher" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-200">{it.role}</span>
                )}
                {it.school_name && <span className="text-white/40 text-[11px]">{it.school_name}</span>}
                {!it.signed_up && <span className="text-white/30 text-[11px] italic">not signed up</span>}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void run("admin_set_ai_access", { p_email: it.email, p_enabled: !it.ai_enabled }, it.ai_enabled ? "AI revoked" : "AI granted")}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                it.ai_enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI {it.ai_enabled ? "on" : "off"}
            </button>

            <select
              value={it.plan ?? "free"}
              disabled={busy || !it.uid}
              onChange={(e) => void run("admin_set_plan", { p_uid: it.uid, p_plan: e.target.value, p_trial_ends_at: null }, "Plan updated")}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold disabled:opacity-40"
            >
              {PLANS.map((p) => (
                <option key={p} value={p} className="bg-slate-800">{p}</option>
              ))}
            </select>

            {it.role !== "admin" && it.role !== "manager" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Remove ${it.email} as a teacher? They lose teacher access and drop off the roster — their classes/data are kept.`)) return;
                  void run("admin_remove_teacher", { p_email: it.email }, "Teacher removed");
                }}
                title="Remove teacher (revoke access)"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
