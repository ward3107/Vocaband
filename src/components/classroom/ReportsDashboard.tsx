/**
 * ReportsDashboard — analytics widgets for the Classroom V2 → Reports
 * tab.  Four panels that answer the questions teachers actually ask
 * after a week of teaching:
 *
 *   1. Per-week trend       — "is the class improving?"
 *   2. Top struggling words — "what should I reteach next?"
 *   3. Plays/day histogram  — "are they actually using it?"
 *   4. Attendance table     — "who's missing this week?"
 *
 * Renders read-only — no DB writes.  Pure derivations from the props
 * already passed into ClassroomView (allScores + teacherAssignments
 * + classStudents).  Adding more class-level analytics later means a
 * new <section> inside this file, not a new view.
 */
import { useMemo } from "react";
import { TrendingUp, AlertTriangle, BarChart3, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { ProgressData, AssignmentData } from "../../core/supabase";
import { ALL_WORDS } from "../../data/vocabulary";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
  studentUid?: string;
}

export interface ReportsDashboardProps {
  classCode: string | null;
  scores: ProgressData[];
  assignments: AssignmentData[];
  classStudents: ClassStudent[];
}

// Returns midnight of the date `daysAgo` days ago, in the local TZ.
function startOfDayDaysAgo(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekKey(d: Date): string {
  // ISO-ish week: anchor to Monday.
  const monday = new Date(d);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day; // pull Sunday back to previous Monday
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return isoDate(monday);
}

export default function ReportsDashboard({
  classCode,
  scores,
  assignments,
  classStudents,
}: ReportsDashboardProps) {
  // Filter scores to the selected class (or all if no class chosen)
  const classScores = useMemo(
    () => (classCode ? scores.filter(s => s.classCode === classCode) : scores),
    [scores, classCode],
  );

  // ── 1. Per-week trend ────────────────────────────────────────────────
  // Last 8 weeks, average score per week.  Empty weeks render as gaps so
  // the line doesn't dishonestly connect over weeks with zero data.
  const weeklyTrend = useMemo(() => {
    const buckets: Record<string, { sum: number; count: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const d = startOfDayDaysAgo(i * 7);
      buckets[weekKey(d)] = { sum: 0, count: 0 };
    }
    for (const s of classScores) {
      const k = weekKey(new Date(s.completedAt));
      if (buckets[k]) {
        buckets[k].sum += s.score;
        buckets[k].count += 1;
      }
    }
    return Object.entries(buckets).map(([k, b]) => ({
      week: shortDay(new Date(k)),
      avg: b.count > 0 ? Math.round(b.sum / b.count) : null,
      plays: b.count,
    }));
  }, [classScores]);

  // ── 2. Top struggling words ──────────────────────────────────────────
  // Aggregate `mistakes` arrays across every play into a per-word
  // miss-count.  Show top 10 with student-coverage % so the teacher
  // sees both 'how many wrong' and 'how widespread'.
  const topStrugglingWords = useMemo(() => {
    const wordMisses = new Map<number, { total: number; students: Set<string> }>();
    for (const s of classScores) {
      const ms = s.mistakes;
      if (!Array.isArray(ms)) continue;
      const studentKey = s.studentUid || s.studentName;
      for (const wid of ms) {
        const cur = wordMisses.get(wid) ?? { total: 0, students: new Set<string>() };
        cur.total += 1;
        cur.students.add(studentKey);
        wordMisses.set(wid, cur);
      }
    }
    const totalStudents = classStudents.length || 1;
    const rows = Array.from(wordMisses.entries())
      .map(([wid, agg]) => {
        const word = ALL_WORDS.find(w => w.id === wid);
        return {
          wid,
          english: word?.english ?? `#${wid}`,
          hebrew: word?.hebrew ?? "",
          arabic: word?.arabic ?? "",
          total: agg.total,
          studentPct: Math.round((agg.students.size / totalStudents) * 100),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    return rows;
  }, [classScores, classStudents]);

  // ── 3. Plays/day histogram ───────────────────────────────────────────
  // Last 30 days, one bar per day.  Lets the teacher spot 'long
  // weekend gaps' and 'spike when an assignment was due'.
  const playsPerDay = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = startOfDayDaysAgo(i);
      buckets[isoDate(d)] = 0;
    }
    for (const s of classScores) {
      const k = isoDate(new Date(s.completedAt));
      if (buckets[k] !== undefined) buckets[k] += 1;
    }
    return Object.entries(buckets).map(([k, count]) => ({
      day: shortDay(new Date(k)),
      iso: k,
      plays: count,
    }));
  }, [classScores]);

  // ── 4. Attendance table ──────────────────────────────────────────────
  // Last 14 days, one row per student, ✓ if the student played at
  // least once that day.  Identifies absent / disengaged students at
  // a glance.
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
    // Most-present first, so teachers see at-risk students at the bottom.
    rows.sort((a, b) => b.presentDays - a.presentDays);
    return { days, rows };
  }, [classScores, classStudents]);

  // ── Headline counts for the section labels ───────────────────────────
  const totalPlays = classScores.length;
  const totalAssignments = classCode
    ? assignments.filter(a => a.classId).length // class-scoped count
    : assignments.length;

  return (
    <div className="space-y-6">
      {/* Header chip row — quick gut feel before charts. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiChip label="Plays (all-time)" value={totalPlays} />
        <KpiChip label="Students on roster" value={classStudents.length} />
        <KpiChip label="Assignments" value={totalAssignments} />
        <KpiChip label="Plays this week" value={weeklyTrend[weeklyTrend.length - 1]?.plays ?? 0} />
      </div>

      {/* ── Per-week trend ─────────────────────────────────────────── */}
      <Section
        icon={<TrendingUp size={18} className="text-emerald-600" />}
        title="Class average — last 8 weeks"
        sub="Average score across every play, week by week. Gaps mean no plays that week."
      >
        <div className="h-56 sm:h-64">
          <ResponsiveContainer>
            <LineChart data={weeklyTrend} margin={{ top: 6, right: 12, bottom: 6, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#78716c" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#78716c" unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
                formatter={((value: unknown) => [value == null ? "—" : `${value}%`, "Avg score"]) as never}
              />
              <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Top struggling words ────────────────────────────────────── */}
      <Section
        icon={<AlertTriangle size={18} className="text-rose-600" />}
        title="Top 10 struggling words"
        sub="Most-missed words across the class.  Coverage % shows how widespread the confusion is."
      >
        {topStrugglingWords.length === 0 ? (
          <EmptyState text="No mistakes recorded yet — your class is doing great." />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <th className="px-3 py-2 font-bold">Word</th>
                  <th className="px-3 py-2 font-bold">Hebrew</th>
                  <th className="px-3 py-2 font-bold">Arabic</th>
                  <th className="px-3 py-2 font-bold text-right">Misses</th>
                  <th className="px-3 py-2 font-bold text-right">% of class</th>
                </tr>
              </thead>
              <tbody>
                {topStrugglingWords.map(row => (
                  <tr key={row.wid} className="border-b border-stone-100 last:border-b-0">
                    <td className="px-3 py-2 font-bold text-stone-900">{row.english}</td>
                    <td className="px-3 py-2 text-stone-700" dir="rtl">{row.hebrew}</td>
                    <td className="px-3 py-2 text-stone-700" dir="rtl">{row.arabic}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        row.studentPct >= 60 ? "bg-rose-100 text-rose-700" :
                        row.studentPct >= 30 ? "bg-amber-100 text-amber-700" :
                        "bg-stone-100 text-stone-700"
                      }`}>
                        {row.studentPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Plays per day histogram ─────────────────────────────────── */}
      <Section
        icon={<BarChart3 size={18} className="text-indigo-600" />}
        title="Plays per day — last 30 days"
        sub="One bar per day.  Spikes around assignment due dates; flat days = nobody played."
      >
        <div className="h-56 sm:h-64">
          <ResponsiveContainer>
            <BarChart data={playsPerDay} margin={{ top: 6, right: 12, bottom: 6, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={3} stroke="#78716c" />
              <YAxis tick={{ fontSize: 11 }} stroke="#78716c" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
                formatter={((value: unknown) => [value, "Plays"]) as never}
              />
              <Bar dataKey="plays" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Attendance table ────────────────────────────────────────── */}
      <Section
        icon={<CalendarCheck size={18} className="text-sky-600" />}
        title="Attendance — last 14 days"
        sub="✓ = student played at least once that day.  Sorted by most active."
      >
        {attendance.rows.length === 0 ? (
          <EmptyState text="Add a class to see attendance." />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-stone-700 sticky left-0 bg-white">Student</th>
                  {attendance.days.map(d => (
                    <th key={d.iso} className="px-2 py-2 text-stone-500 font-semibold whitespace-nowrap">{d.label}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-bold text-stone-700 whitespace-nowrap">Days</th>
                </tr>
              </thead>
              <tbody>
                {attendance.rows.map(row => (
                  <tr key={row.name} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-bold text-stone-900 sticky left-0 bg-white whitespace-nowrap">{row.name}</td>
                    {row.presence.map((p, idx) => (
                      <td key={idx} className="px-2 py-2 text-center">
                        {p ? (
                          <span className="inline-block w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold leading-5">✓</span>
                        ) : (
                          <span className="inline-block w-5 h-5 rounded-full bg-stone-100 text-stone-300 text-[11px] leading-5">·</span>
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
      </Section>
    </div>
  );
}

// ── Tiny presentational helpers (kept inline to avoid a new file) ────
function KpiChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-3 border-2 border-stone-200 shadow-sm">
      <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-black text-stone-900 mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  icon, title, sub, children,
}: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border-2 border-stone-200 shadow-sm p-4 sm:p-5">
      <header className="flex items-start gap-2 mb-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h3 className="font-bold text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{sub}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm text-stone-500 py-6">{text}</div>
  );
}
