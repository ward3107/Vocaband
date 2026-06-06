import { useCallback, useEffect, useState } from "react";
import { School, Plus, UserCog, Trash2, X } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevSchool } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function DevSchoolsSection({ showToast }: Props) {
  const [schools, setSchools] = useState<DevSchool[]>([]);
  const [newName, setNewName] = useState("");
  const [mgrEmail, setMgrEmail] = useState("");
  const [mgrSchool, setMgrSchool] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await callAdminRpcCached<DevSchool[]>("admin_list_schools", {}, showToast);
    if (res) setSchools(res);
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
        invalidateAdminRpcCache("admin_list_schools");
        invalidateAdminRpcCache("admin_dashboard_overview");
        await reload();
      }
      return !!res;
    },
    [reload, showToast],
  );

  const deleteSchool = (s: DevSchool) => {
    // Safe delete: the RPC refuses if the school still has members/classes, so
    // a confirm here is enough — no destructive cascade to warn about.
    if (!window.confirm(`Delete school "${s.name}"? This only works if it has no staff, students or classes.`)) return;
    void run("admin_delete_school", { p_school_id: s.id }, "School deleted");
  };

  const removeManager = (email: string) => {
    if (!window.confirm(`Remove ${email} as a manager? They go back to a regular teacher account.`)) return;
    void run("admin_remove_manager", { p_email: email }, "Manager removed");
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) void run("admin_create_school", { p_name: newName.trim() }, "School created").then((ok) => ok && setNewName(""));
        }}
        className="flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New school name"
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={busy}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {schools.length === 0 && <p className="px-5 py-4 text-white/40 text-base">No schools yet.</p>}
        {schools.map((s) => {
          // admin_delete_school refuses (409) while a school still has members
          // or classes. Disable the button up front and name what's blocking it,
          // rather than letting the operator discover it through a failed call.
          const blockers: string[] = [];
          if (s.teachers > 0) blockers.push(`${s.teachers} staff`);
          if (s.students > 0) blockers.push(`${s.students} students`);
          if (s.classes > 0) blockers.push(`${s.classes} classes`);
          const deletable = blockers.length === 0;
          return (
            <div key={s.id} className="px-5 py-3 flex items-center gap-3">
              <School className="w-5 h-5 text-indigo-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-base truncate">{s.name}</div>
                <div className="text-white/40 text-xs">
                  {s.teachers} staff · {s.students} students · {s.classes} classes
                </div>
                {/* Managers each get a remove (×) chip so a mis-assignment can be undone. */}
                {s.managers.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.managers.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">
                        {m}
                        <button
                          type="button"
                          onClick={() => removeManager(m)}
                          disabled={busy}
                          aria-label={`Remove manager ${m}`}
                          className="p-0.5 rounded-full hover:bg-rose-500/30 hover:text-rose-200 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteSchool(s)}
                disabled={busy || !deletable}
                aria-label={deletable ? `Delete school ${s.name}` : `Cannot delete ${s.name} — clear ${blockers.join(", ")} first`}
                title={deletable ? undefined : `Clear ${blockers.join(", ")} first`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="p-2 rounded-lg text-white/40 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-white/40 disabled:hover:bg-transparent shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mgrEmail.trim() && mgrSchool) {
            void run("admin_assign_manager", { p_email: mgrEmail.trim(), p_school_id: mgrSchool }, "Manager assigned").then((ok) => {
              if (ok) setMgrEmail("");
            });
          }
        }}
        className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-white/70 font-black text-sm uppercase tracking-widest">
          <UserCog className="w-4 h-4" /> Assign a manager
        </div>
        <input
          type="email"
          value={mgrEmail}
          onChange={(e) => setMgrEmail(e.target.value)}
          placeholder="manager@school.edu (must have signed in once)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          <select
            value={mgrSchool}
            onChange={(e) => setMgrSchool(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base"
          >
            <option value="" className="bg-slate-800">Select school…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !mgrEmail.trim() || !mgrSchool}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base"
          >
            Assign
          </button>
        </div>
      </form>
    </div>
  );
}
