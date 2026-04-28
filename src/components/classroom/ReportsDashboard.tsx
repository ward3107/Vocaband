/**
 * ReportsDashboard — class-level trend analytics.
 *
 * Two panels left after the 2026-04-28 split:
 *
 *   1. Per-week trend       — "is the class improving?"
 *   2. Plays/day histogram  — "are they actually using it?"
 *
 * The "what to reteach" (top struggling words) and "who needs help"
 * (attendance) sections moved to the Assignments and Students tabs
 * respectively — they're action-oriented and belong next to the
 * controls a teacher uses to act on them.  See:
 *   - components/classroom/TopStrugglingWords.tsx
 *   - components/classroom/AttendanceTable.tsx
 *
 * Renders read-only.  Pure derivation from props.  No fetches.
 */
import { useMemo } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
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

  // ── 2. Plays/day histogram ───────────────────────────────────────────
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
