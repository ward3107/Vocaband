import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Sparkles, UserCog, Ban } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevEntitlement } from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const PLANS = ["free", "pro", "school"] as const;

const PLAN_BADGE: Record<string, string> = {
  pro: "bg-violet-500/20 text-violet-200",
  school: "bg-amber-500/20 text-amber-200",
  free: "bg-white/10 text-white/50",
};

/**
 * Trial countdown for a free teacher's 14-day Pro trial. Returns null when
 * there's nothing to count down — paid plans, no trial set, or already lapsed.
 * `label` is the badge text; `cls` colours it by urgency (red ≤1d → amber ≤3d
 * → emerald otherwise), matching the Trial-funnel panel's convention.
 */
function trialBadge(plan: string | null, trialEndsAt: string | null): { label: string; cls: string } | null {
  if (plan && plan !== "free") return null;
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return { label: "trial expired", cls: "bg-white/5 text-white/40" };
  const hours = Math.floor(ms / 3_600_000);
  const label = hours < 48 ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`;
  const daysLeft = ms / 86_400_000;
  const cls =
    daysLeft <= 1 ? "bg-rose-500/15 text-rose-300"
    : daysLeft <= 3 ? "bg-amber-500/15 text-amber-300"
    : "bg-emerald-500/10 text-emerald-300";
  return { label, cls };
}

export default function DevEntitlementsSection({ showToast }: Props) {
  const [items, setItems] = useState<DevEntitlement[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DevEntitlement | null>(null);
  // Bulk selection (keyed by email). Only non-admin/manager rows are selectable.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);

  const toggleSelect = (email: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(email)) next.delete(email); else next.add(email);
    return next;
  });

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

  // Apply one admin RPC across every selected row, then refresh once.
  const runBulk = useCallback(
    async (label: string, fn: (it: DevEntitlement) => Promise<boolean>) => {
      const targets = items.filter((it) => selected.has(it.email));
      if (targets.length === 0) return;
      setBusy(true);
      let ok = 0, fail = 0;
      for (const it of targets) { if (await fn(it)) ok += 1; else fail += 1; }
      setBusy(false);
      setBulkRemoveOpen(false);
      setSelected(new Set());
      invalidateAdminRpcCache("admin_list_entitlements");
      invalidateAdminRpcCache("admin_dashboard_overview");
      invalidateAdminRpcCache("admin_search_users");
      await reload();
      showToast(fail ? `${label}: ${ok} done, ${fail} skipped/failed` : `${label}: ${ok} done`, fail ? "error" : "success");
    },
    [items, selected, reload, showToast],
  );

  const bulkSetPlan = (plan: string) =>
    runBulk(`Plan → ${plan}`, async (it) => {
      if (!it.uid) return false; // not signed up → no uid to set a plan on
      const r = await callAdminRpc<{ success?: boolean }>("admin_set_plan", { p_uid: it.uid, p_plan: plan, p_trial_ends_at: null }, showToast);
      return !!r;
    });

  const bulkRemove = () =>
    runBulk("Removed", async (it) => {
      const r = await callAdminRpc<{ success?: boolean }>("admin_remove_teacher", { p_email: it.email }, showToast);
      return !!r;
    });

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
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-teal-400 font-mono"
        />
        <button
          type="submit"
          disabled={busy || !newEmail.trim()}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add teacher(s)
        </button>
      </form>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center gap-2 flex-wrap rounded-2xl bg-teal-600 shadow-lg shadow-teal-500/30 px-4 py-2.5">
          <span className="text-white font-black text-base">{selected.size} selected</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-white/80 hover:text-white text-sm font-bold">Clear</button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value=""
              disabled={busy}
              onChange={(e) => { if (e.target.value) void bulkSetPlan(e.target.value); }}
              className="px-3 py-2 rounded-xl bg-white/15 text-white text-sm font-bold disabled:opacity-50"
            >
              <option value="" className="bg-slate-800">Set plan…</option>
              {PLANS.map((p) => <option key={p} value={p} className="bg-slate-800">{p}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setBulkRemoveOpen(true)}
              disabled={busy}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-white font-black text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {items.length === 0 && <p className="px-5 py-4 text-white/40 text-base">No teachers yet.</p>}
        {items.map((it) => (
          <div key={it.email} className="px-5 py-3 flex items-center gap-3 flex-wrap">
            {it.role !== "admin" && it.role !== "manager" && (
              <input
                type="checkbox"
                checked={selected.has(it.email)}
                onChange={() => toggleSelect(it.email)}
                aria-label={`Select ${it.email}`}
                className="w-4 h-4 rounded border-white/20 bg-white/10 accent-teal-500 shrink-0"
              />
            )}
            <div className="flex-1 min-w-[160px]">
              <div className="text-white font-bold text-base truncate">{it.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${PLAN_BADGE[it.plan ?? "free"]}`}>
                  {it.plan ?? "free"}
                </span>
                {(() => {
                  const t = trialBadge(it.plan, it.trial_ends_at);
                  return t ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${t.cls}`}>{t.label}</span>
                  ) : null;
                })()}
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
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-black flex items-center gap-1.5"
              >
                <UserCog className="w-3.5 h-3.5" /> Promote
              </button>
            )}

            {/* Master AI kill-switch (users.ai_disabled). Wins over plan/trial —
                use this to turn AI off for a teacher who is mid-14-day-trial
                without ending their trial. Needs a signed-up uid. */}
            <button
              type="button"
              disabled={busy || !it.uid}
              onClick={() => void run("admin_set_ai_disabled", { p_uid: it.uid, p_disabled: !it.ai_disabled }, it.ai_disabled ? "AI re-enabled" : "AI disabled")}
              title={it.ai_disabled
                ? "AI is blocked for this teacher. Click to re-enable."
                : "Block all AI for this teacher (overrides their plan/trial)."}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-3 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 ${
                it.ai_disabled ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
              }`}
            >
              {it.ai_disabled ? <Ban className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI {it.ai_disabled ? "off" : "on"}
            </button>

            {/* Vocabagrut allowlist (ai_allowlist). Separate opt-in gate for the
                premium mock-exam generator only; the kill-switch above still
                overrides it when AI is off. */}
            <button
              type="button"
              disabled={busy || it.ai_disabled}
              onClick={() => void run("admin_set_ai_access", { p_email: it.email, p_enabled: !it.ai_enabled }, it.ai_enabled ? "Vocabagrut revoked" : "Vocabagrut granted")}
              title="Toggle access to the Vocabagrut mock-exam generator."
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`px-3 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 disabled:opacity-40 ${
                it.ai_enabled ? "bg-violet-500/20 text-violet-200" : "bg-white/5 text-white/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Bagrut {it.ai_enabled ? "on" : "off"}
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
                onClick={() => setRemoveTarget(it)}
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

      <ConfirmDialog
        open={!!removeTarget}
        tone="danger"
        title="Remove this teacher?"
        body={removeTarget && (
          <><strong className="text-white">{removeTarget.email}</strong> loses teacher access and drops off the roster.
          Their classes and student data are kept.</>
        )}
        confirmLabel="Remove teacher"
        busy={busy}
        onConfirm={async () => {
          if (!removeTarget) return;
          await run("admin_remove_teacher", { p_email: removeTarget.email }, "Teacher removed");
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={bulkRemoveOpen}
        tone="danger"
        title={`Remove ${selected.size} teachers?`}
        body={<>Each loses teacher access and drops off the roster — their classes and student data are kept. Admin/manager accounts can't be selected.</>}
        confirmLabel={`Remove ${selected.size}`}
        busy={busy}
        onConfirm={() => void bulkRemove()}
        onCancel={() => setBulkRemoveOpen(false)}
      />
    </div>
  );
}
