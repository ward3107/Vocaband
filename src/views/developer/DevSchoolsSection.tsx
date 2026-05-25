import { useCallback, useEffect, useState } from "react";
import { School, Plus, UserCog } from "lucide-react";
import { callAdminRpc, type DevSchool } from "./devShared";

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
    const res = await callAdminRpc<DevSchool[]>("admin_list_schools", {}, showToast);
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
        await reload();
      }
      return !!res;
    },
    [reload, showToast],
  );

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
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={busy}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </form>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {schools.length === 0 && <p className="px-5 py-4 text-white/40 text-sm">No schools yet.</p>}
        {schools.map((s) => (
          <div key={s.id} className="px-5 py-3 flex items-center gap-3">
            <School className="w-5 h-5 text-indigo-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{s.name}</div>
              <div className="text-white/40 text-[11px]">
                {s.teachers} staff · {s.students} students
                {s.managers.length > 0 && ` · manager: ${s.managers.join(", ")}`}
              </div>
            </div>
          </div>
        ))}
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
        <div className="flex items-center gap-2 text-white/70 font-black text-xs uppercase tracking-widest">
          <UserCog className="w-4 h-4" /> Assign a manager
        </div>
        <input
          type="email"
          value={mgrEmail}
          onChange={(e) => setMgrEmail(e.target.value)}
          placeholder="manager@school.edu (must have signed in once)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          <select
            value={mgrSchool}
            onChange={(e) => setMgrSchool(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
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
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            Assign
          </button>
        </div>
      </form>
    </div>
  );
}
