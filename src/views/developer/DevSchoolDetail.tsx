import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, RefreshCw, Crown, GraduationCap, Users, Printer,
  ChevronDown, ChevronRight, Eye, EyeOff, School,
} from "lucide-react";
import { callAdminRpcCached, type DevSchool, type DevSchoolDetail as SchoolDetailData, type DevSchoolClass } from "./devShared";
import { printRosterSheet } from "../../components/roster/v2/printRosterSheet";

interface Props {
  school: DevSchool;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/** Grade/Branch label for a class, read off its students (seeded classes are a
 *  single grade/branch; null for name-based classes that carry neither). */
function gradeLabel(c: DevSchoolClass): string | null {
  const g = c.students.find((s) => s.grade != null)?.grade ?? null;
  const b = c.students.find((s) => s.branch != null)?.branch ?? null;
  if (g == null && b == null) return null;
  return [g != null ? `Grade ${g}` : null, b != null ? `Branch ${b}` : null].filter(Boolean).join(" · ");
}

/**
 * Admin drill-down for ONE school: its principal(s), teaching staff (with the
 * grade/branch they teach), and every class's generated student roster — codes,
 * PINs and status — with a per-class reprint of the code↔PIN handoff sheet.
 */
export default function DevSchoolDetail({ school, onBack, showToast }: Props) {
  const [detail, setDetail] = useState<SchoolDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showPins, setShowPins] = useState(true);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      const res = await callAdminRpcCached<SchoolDetailData | { error: string }>(
        "admin_school_detail",
        { p_school_id: school.id },
        showToast,
        { force },
      );
      setLoading(false);
      if (res && "error" in res) {
        showToast(`Couldn't load school: ${res.error}`, "error");
        return;
      }
      if (res) setDetail(res);
    },
    [school.id, showToast],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention
    void load();
  }, [load]);

  const totalStudents = useMemo(
    () => detail?.classes.reduce((n, c) => n + c.student_count, 0) ?? 0,
    [detail],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const printClass = (c: DevSchoolClass) => {
    if (c.students.length === 0) {
      showToast("No students in this class to print.", "info");
      return;
    }
    const ok = printRosterSheet({
      title: `${c.name} — Vocaband codes`,
      classCode: c.code,
      rows: c.students.map((s) => ({ label: s.display_name, pin: s.roster_pin ?? "" })),
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

  const s = detail?.school;
  const plan = s?.plan ?? "free";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 shrink-0"
          aria-label="Back to schools"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <School className="w-6 h-6 text-indigo-300 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black truncate">{school.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {s?.school_code && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs font-mono font-bold">
                code {s.school_code}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                plan === "school" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/50"
              }`}
            >
              {plan === "school" ? "School plan" : "Free plan"}
            </span>
            {s?.created_at && (
              <span className="text-white/40 text-xs">
                since {new Date(s.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 shrink-0"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Teachers", value: detail?.teachers.length ?? 0, icon: GraduationCap },
          { label: "Classes", value: detail?.classes.length ?? 0, icon: School },
          { label: "Students", value: totalStudents, icon: Users },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <k.icon className="w-4 h-4 text-indigo-300 mb-2" />
            <div className="text-2xl font-black leading-none">{k.value}</div>
            <div className="text-white/40 text-xs font-bold mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {loading && !detail && <p className="text-white/40 text-base px-1">Loading…</p>}

      {detail && (
        <>
          {/* Principal(s) */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-white/80 font-black text-sm uppercase tracking-widest">
              <Crown className="w-4 h-4" /> Principal
            </h3>
            <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
              {detail.managers.length === 0 && (
                <p className="px-5 py-4 text-white/40 text-base">
                  No principal assigned yet — assign one from the Schools list.
                </p>
              )}
              {detail.managers.map((m) => (
                <div key={m.uid} className="px-5 py-3">
                  <div className="text-white font-bold text-base">{m.display_name || "—"}</div>
                  {m.email && <div className="text-white/40 text-xs">{m.email}</div>}
                </div>
              ))}
            </div>
          </section>

          {/* Teachers */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-white/80 font-black text-sm uppercase tracking-widest">
              <GraduationCap className="w-4 h-4" /> Teachers
            </h3>
            <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
              {detail.teachers.length === 0 && (
                <p className="px-5 py-4 text-white/40 text-base">
                  No teachers attached yet. Seeded classes show their pending teacher below until claimed on first login.
                </p>
              )}
              {detail.teachers.map((t) => (
                <div key={t.uid} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-base truncate">{t.display_name || t.email || "—"}</div>
                    <div className="text-white/40 text-xs truncate">
                      {t.email}
                      {t.subject ? ` · ${t.subject}` : ""}
                    </div>
                  </div>
                  <div className="text-white/50 text-xs text-right shrink-0">
                    {t.class_count} {t.class_count === 1 ? "class" : "classes"}
                    <br />
                    {t.student_count} students
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Classes + rosters */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-white/80 font-black text-sm uppercase tracking-widest">
                <School className="w-4 h-4" /> Classes &amp; students
              </h3>
              <button
                type="button"
                onClick={() => setShowPins((v) => !v)}
                style={{ touchAction: "manipulation" }}
                className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs font-bold"
              >
                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPins ? "Hide PINs" : "Show PINs"}
              </button>
            </div>

            <div className="space-y-2">
              {detail.classes.length === 0 && (
                <p className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-white/40 text-base">
                  No classes yet — seed some from the Schools tab.
                </p>
              )}
              {detail.classes.map((c) => {
                const open = expanded.has(c.id);
                const gl = gradeLabel(c);
                const teacher = c.teacher_name || c.teacher_email
                  ? (c.teacher_name ?? c.teacher_email)
                  : c.pending_teacher_email
                    ? `${c.pending_teacher_email} (claims on first login)`
                    : "Unclaimed";
                return (
                  <div key={c.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left"
                      >
                        {open ? <ChevronDown className="w-4 h-4 shrink-0 text-white/40" /> : <ChevronRight className="w-4 h-4 shrink-0 text-white/40" />}
                        <div className="min-w-0">
                          <div className="text-white font-bold text-base truncate">
                            {c.name}
                            <span className="ml-2 font-mono text-white/40 text-xs">{c.code}</span>
                          </div>
                          <div className="text-white/40 text-xs truncate">
                            {gl ? `${gl} · ` : ""}{c.student_count} students · {teacher}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => printClass(c)}
                        style={{ touchAction: "manipulation" }}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-bold flex items-center gap-2 shrink-0"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                    </div>

                    {open && (
                      <div className="border-t border-white/10 overflow-x-auto">
                        {c.students.length === 0 ? (
                          <p className="px-5 py-4 text-white/40 text-sm">No students in this class.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-white/40 text-xs uppercase tracking-wider">
                                <th className="text-left font-bold px-4 py-2">Code / name</th>
                                <th className="text-left font-bold px-4 py-2">PIN</th>
                                <th className="text-left font-bold px-4 py-2">Grade</th>
                                <th className="text-left font-bold px-4 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {c.students.map((st, i) => (
                                <tr key={`${c.id}-${st.display_name}-${i}`} className="text-white/80">
                                  <td className="px-4 py-2 font-mono whitespace-nowrap">
                                    {st.avatar ? `${st.avatar} ` : ""}{st.display_name}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-white/60 whitespace-nowrap">
                                    {st.roster_pin ? (showPins ? st.roster_pin : "••••••") : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-white/50 whitespace-nowrap">
                                    {st.grade != null ? `${st.grade}${st.branch != null ? `/${st.branch}` : ""}` : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-white/50 whitespace-nowrap">{st.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
