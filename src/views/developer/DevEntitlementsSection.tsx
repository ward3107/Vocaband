import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Sparkles, UserCog } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevEntitlement } from "./devShared";

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
    const res = await callAdminRpcCached<DevEntitlement[]>("admin_list_entitlements", {}, showToast);
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
        // Bust the entitlements list (this panel), the overview KPIs (top of
        // dashboard), and search results in case the User Lookup panel is
        // also showing this user.
        invalidateAdminRpcCache("admin_list_entitlements");
        invalidateAdminRpcCache("admin_dashboard_overview");
        invalidateAdminRpcCache("admin_search_users");
        await reload();
      }
    },
    [reload, showToast],
  );

  return (
    <div className="space-y-5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          // Split on any whitespace, comma, or semicolon so a CSV / pasted
          // column / newline-separated list all work.
          const emails = newEmail
            .split(/[\s,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s.length > 0 && s.includes("@"));
          if (emails.length === 0) return;
          let added = 0;
          let failed = 0;
          for (const email of emails) {
            const res = await callAdminRpc<{ success?: boolean }>(
              "admin_add_teacher",
              { p_email: email },
              showToast,
            );
            if (res?.success) added += 1; else failed += 1;
          }
          if (added > 0) {
            invalidateAdminRpcCache("admin_list_entitlements");
            invalidateAdminRpcCache("admin_dashboard_overview");
            await reload();
            showToast(
              failed > 0 ? `Added ${added}, ${failed} failed` : `Added ${added} teacher${added === 1 ? "" : "s"}`,
              "success",
            );
            setNewEmail("");
          }
        }}
        className="space-y-2"
      >
        <textarea
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={"teacher@school.edu\nanother@school.edu\n(one per line — or paste a comma-separated list)"}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400 font-mono"
        />
        <button
          type="submit"
          disabled={busy || !newEmail.trim()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add teacher(s)
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {items.length === 0 && <p className="px-5 py-4 text-white/40 text-base">No teachers yet.</p>}
        {items.map((it) => (
          <div key={it.email} className="px-5 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="text-white font-bold text-base truncate">{it.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${PLAN_BADGE[it.plan ?? "free"]}`}>
                  {it.plan ?? "free"}
                </span>
                {it.role && it.role !== "teacher" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-sky-500/20 text-sky-200">{it.role}</span>
                )}
                {it.school_name && <span className="text-white/40 text-xs">{it.school_name}</span>}
                {!it.signed_up && <span className="text-white/30 text-xs italic">not signed up</span>}
              </div>
            </div>

            {it.signed_up && it.role === "student" && (
              <button
                type="button"
                disabled={busy || !it.uid}
                onClick={() => void run("admin_set_role", { p_uid: it.uid, p_role: "teacher" }, "Promoted to teacher")}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                title="This email belongs to an existing student. Click to flip role to teacher."
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-black flex items-center gap-1.5"
              >
                <UserCog className="w-3.5 h-3.5" /> Promote
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => void run("admin_set_ai_access", { p_email: it.email, p_enabled: !it.ai_enabled }, it.ai_enabled ? "AI revoked" : "AI granted")}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-3 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 ${
                it.ai_enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI {it.ai_enabled ? "on" : "off"}
            </button>

            <select
              value={it.plan ?? "free"}
              disabled={busy || !it.uid}
              onChange={(e) => void run("admin_set_plan", { p_uid: it.uid, p_plan: e.target.value, p_trial_ends_at: null }, "Plan updated")}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold disabled:opacity-40"
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
