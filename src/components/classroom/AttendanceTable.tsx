/**
 * AttendanceTable — who needs help radar.
 *
 * Last 14 days, one row per student, ✓ if the student played at
 * least once that day.  Sorted by most-active so students at the
 * BOTTOM of the table are the ones drifting away.
 *
 * Formerly section 4 of `ReportsDashboard.tsx`.  Moved into the
 * Students tab (Classroom V2) on 2026-04-28 because that's where a
 * teacher acts on the "who needs my help right now?" question — the
 * answer is "the students at the bottom of this table" and the
 * Students tab is where they go to follow up.
 *
 * Pure derivation from the props.  No fetches.
 */
import { useMemo } from "react";
import { CalendarCheck } from "lucide-react";
import type { ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherClassroomT } from "../../locales/teacher/classroom";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
  studentUid?: string;
}

export interface AttendanceTableProps {
  classCode: string | null;
  scores: ProgressData[];
  classStudents: ClassStudent[];
}

function startOfDayDaysAgo(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AttendanceTable({
  classCode, scores, classStudents,
}: AttendanceTableProps) {
  const { language } = useLanguage();
  const t = teacherClassroomT[language];
  const classScores = useMemo(
    () => (classCode ? scores.filter(s => s.classCode === classCode) : scores),
    [scores, classCode],
  );

  const attendance = useMemo(() => {
    const days: { iso: string; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = startOfDayDaysAgo(i);
      days.push({ iso: isoDate(d), label: shortDay(d) });
    }
    const studentDays: Record<string, Set<string>> = {};
    for (const s of classScores) {
      const key = s.studentUid || s.studentName;
      if (!studentDays[key]) studentDays[key] = new Set();
      studentDays[key].add(isoDate(new Date(s.completedAt)));
    }
    const rows = classStudents.map(stu => {
      const key = stu.studentUid || stu.name;
      const presence = days.map(d => studentDays[key]?.has(d.iso) ?? false);
      return {
        name: stu.name,
        presence,
        presentDays: presence.filter(Boolean).length,
      };
    });
    rows.sort((a, b) => b.presentDays - a.presentDays);
    return { days, rows };
  }, [classScores, classStudents]);

  return (
    <section
      className="rounded-2xl border-2 shadow-sm p-4 sm:p-5"
      style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
    >
      <header className="flex items-start gap-2 mb-3">
        <div className="mt-0.5"><CalendarCheck size={18} className="text-sky-600" /></div>
        <div>
          <h3 className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>Who needs help</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>
            Last 14 days · ✓ = played at least once that day · students at the bottom are drifting.
          </p>
        </div>
      </header>

      {attendance.rows.length === 0 ? (
        <div className="text-center text-sm py-6" style={{ color: 'var(--vb-text-muted)' }}>Add a class to see attendance.</div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-bold sticky left-0" style={{ color: 'var(--vb-text-secondary)', backgroundColor: 'var(--vb-surface)' }}>{t.attendanceColStudent}</th>
                {attendance.days.map(d => (
                  <th key={d.iso} className="px-2 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--vb-text-muted)' }}>{d.label}</th>
                ))}
                <th className="px-3 py-2 text-right font-bold whitespace-nowrap" style={{ color: 'var(--vb-text-secondary)' }}>{t.attendanceColDays}</th>
              </tr>
            </thead>
            <tbody>
              {attendance.rows.map(row => (
                <tr key={row.name} className="border-t" style={{ borderColor: 'var(--vb-border)' }}>
                  <td className="px-3 py-2 font-bold sticky left-0 whitespace-nowrap" style={{ color: 'var(--vb-text-primary)', backgroundColor: 'var(--vb-surface)' }}>{row.name}</td>
                  {row.presence.map((p, idx) => (
                    <td key={idx} className="px-2 py-2 text-center">
                      {p ? (
                        <span className="inline-block w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold leading-5">✓</span>
                      ) : (
                        <span
                          className="inline-block w-5 h-5 rounded-full text-[11px] leading-5"
                          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-muted)' }}
                        >·</span>
                      )}
                    </td>
                  ))}
                  <td className={`px-3 py-2 text-right font-bold tabular-nums ${
                    row.presentDays >= 10 ? "text-emerald-700" :
                    row.presentDays >= 5 ? "text-amber-700" :
                    "text-rose-700"
                  }`}>
                    {row.presentDays}/14
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
