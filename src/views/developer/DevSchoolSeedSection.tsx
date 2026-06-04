import { useCallback, useEffect, useState } from "react";
import { Plus, Printer, Trash2, Wand2 } from "lucide-react";
import {
  callAdminRpc,
  callAdminRpcCached,
  invalidateAdminRpcCache,
  type DevSchool,
  type SeedSchoolResult,
} from "./devShared";
import { printRosterSheet } from "../../components/roster/v2/printRosterSheet";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface Row {
  grade: string;
  branch: string;
  count: string;
  teacher_email: string;
}

const blankRow = (): Row => ({ grade: "", branch: "", count: "", teacher_email: "" });
const onlyDigits = (s: string, max = 2) => s.replace(/\D/g, "").slice(0, max);

/**
 * Admin: bulk-seed a school's classes + anonymous coded students. No names
 * are entered — each student gets a structured code (school-grade-branch-seq)
 * + PIN. After seeding, each class's code↔PIN sheet can be printed for handoff.
 */
export default function DevSchoolSeedSection({ showToast }: Props) {
  const [schools, setSchools] = useState<DevSchool[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SeedSchoolResult | null>(null);

  const reload = useCallback(async () => {
    const res = await callAdminRpcCached<DevSchool[]>("admin_list_schools", {}, showToast);
    if (res) setSchools(res);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect
    void reload();
  }, [reload]);

  // Pre-fill the code input from the chosen school (selection only happens
  // after the list has loaded, so this never races the fetch).
  const pickSchool = (id: string) => {
    setSchoolId(id);
    setCode(schools.find((x) => x.id === id)?.school_code ?? "");
  };

  const saveCode = async () => {
    if (!schoolId || !/^[0-9]{1,4}$/.test(code)) return;
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_set_school_code",
      { p_school_id: schoolId, p_code: code },
      showToast,
    );
    setBusy(false);
    if (res) {
      showToast("School code saved", "success");
      invalidateAdminRpcCache("admin_list_schools");
      await reload();
    }
  };

  const seed = async () => {
    const payload = rows
      .map((r) => ({
        grade: parseInt(r.grade, 10),
        branch: parseInt(r.branch, 10),
        count: parseInt(r.count, 10),
        teacher_email: r.teacher_email.trim() || undefined,
      }))
      .filter((r) => r.grade >= 1 && r.branch >= 1 && r.count >= 1 && r.count <= 60);
    if (!schoolId || payload.length === 0) {
      showToast("Pick a school and add at least one valid row (count 1–60).", "error");
      return;
    }
    setBusy(true);
    const res = await callAdminRpc<SeedSchoolResult>(
      "admin_bulk_seed_school",
      { p_school_id: schoolId, p_rows: payload },
      showToast,
    );
    setBusy(false);
    if (res) {
      setResult(res);
      const n = res.classes.reduce((sum, c) => sum + c.students.length, 0);
      showToast(`Seeded ${res.classes.length} classes · ${n} students`, "success");
      invalidateAdminRpcCache("admin_dashboard_overview");
    }
  };

  const printClass = (c: SeedSchoolResult["classes"][number]) => {
    const ok = printRosterSheet({
      title: `${c.class_name} — Vocaband codes`,
      classCode: c.class_code,
      rows: c.students.map((s) => ({ label: s.code, pin: s.pin })),
      dir: "ltr",
      language: "en",
      labels: {
        labelHeader: "Student code",
        pinHeader: "PIN",
        classCodeLabel: "Class code",
        instructions:
          "Each student logs in at vocaband.com with the class code, picks their code, and types their PIN. Keep the name↔code list separate and private.",
      },
    });
    if (!ok) showToast("Pop-up blocked — allow pop-ups to print.", "error");
  };

  const input =
    "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-400";

  return (
    <div className="space-y-5">
      {/* School + code */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="flex gap-2">
          <select
            value={schoolId}
            onChange={(e) => pickSchool(e.target.value)}
            className={`flex-1 ${input}`}
          >
            <option value="" className="bg-slate-800">Select school…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-800">
                {s.name}{s.school_code ? ` (${s.school_code})` : ""}
              </option>
            ))}
          </select>
          <input
            value={code}
            onChange={(e) => setCode(onlyDigits(e.target.value, 4))}
            placeholder="Code e.g. 07"
            className={`w-28 ${input}`}
          />
          <button
            type="button"
            onClick={() => void saveCode()}
            disabled={busy || !schoolId || !/^[0-9]{1,4}$/.test(code)}
            style={{ touchAction: "manipulation" }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            Save code
          </button>
        </div>
        <p className="text-white/40 text-xs">
          The school code is the first part of every student code (e.g. 07-5-2-14 = school 07, grade 5, branch 2, student 14).
        </p>
      </div>

      {/* Rows */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={r.grade} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, grade: onlyDigits(e.target.value) } : x))} placeholder="Grade" className={`w-20 ${input}`} inputMode="numeric" />
            <input value={r.branch} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, branch: onlyDigits(e.target.value) } : x))} placeholder="Branch" className={`w-20 ${input}`} inputMode="numeric" />
            <input value={r.count} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, count: onlyDigits(e.target.value) } : x))} placeholder="Students" className={`w-24 ${input}`} inputMode="numeric" />
            <input value={r.teacher_email} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, teacher_email: e.target.value } : x))} placeholder="teacher@school.edu (optional)" className={`flex-1 ${input}`} type="email" />
            <button type="button" onClick={() => setRows((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p)} className="p-2 text-white/40 hover:text-rose-300" aria-label="Remove row">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((p) => [...p, blankRow()])} className="flex items-center gap-2 text-indigo-300 hover:text-indigo-200 text-sm font-bold pt-1">
          <Plus className="w-4 h-4" /> Add row
        </button>
      </div>

      <button
        type="button"
        onClick={() => void seed()}
        disabled={busy || !schoolId}
        style={{ touchAction: "manipulation" }}
        className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2"
      >
        <Wand2 className="w-4 h-4" /> {busy ? "Generating…" : "Generate & seed"}
      </button>

      {/* Handoff */}
      {result && (
        <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
          {result.classes.map((c) => (
            <div key={c.class_code} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-base">{c.class_name} · {c.class_code}</div>
                <div className="text-white/40 text-xs">
                  {c.students.length} students
                  {c.teacher_email ? ` · ${c.teacher_email}${c.claimed ? " (claimed)" : " (claims on first login)"}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => printClass(c)} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
