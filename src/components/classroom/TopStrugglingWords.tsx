/**
 * TopStrugglingWords — class-wide reteach radar.
 *
 * Aggregates `progress.mistakes[]` across every play in the class
 * into a per-word miss-count, ranks the top 10, and (when an
 * `onCreateReteachAssignment` callback is supplied) lets the
 * teacher one-tap create a fresh assignment scoped to those words.
 *
 * Formerly section 2 of `ReportsDashboard.tsx`.  Moved into the
 * Assignments tab (Classroom V2) on 2026-04-28 because that's where
 * a teacher acts on the "what should I reteach next?" question — the
 * one-click reteach CTA closes the loop instead of leaving them to
 * recreate the assignment by hand.
 *
 * Pure derivation from the props passed in.  No fetches.
 */
import { useMemo } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { ProgressData } from "../../core/supabase";
import { ALL_WORDS } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherClassroomT } from "../../locales/teacher/classroom";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
  studentUid?: string;
}

export interface TopStrugglingWordsProps {
  classCode: string | null;
  scores: ProgressData[];
  classStudents: ClassStudent[];
  /**
   * Optional callback invoked when the teacher taps "Reteach these".
   * Receives the word IDs of the currently-listed top struggling words.
   * Parent is expected to navigate to the Create-Assignment wizard
   * with those word IDs pre-filled.  When omitted, the CTA is hidden.
   */
  onCreateReteachAssignment?: (wordIds: number[]) => void;
}

export default function TopStrugglingWords({
  classCode, scores, classStudents, onCreateReteachAssignment,
}: TopStrugglingWordsProps) {
  const { language } = useLanguage();
  const t = teacherClassroomT[language];
  const classScores = useMemo(
    () => (classCode ? scores.filter(s => s.classCode === classCode) : scores),
    [scores, classCode],
  );

  const rows = useMemo(() => {
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
    return Array.from(wordMisses.entries())
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
  }, [classScores, classStudents]);

  return (
    <section
      className="rounded-2xl border-2 shadow-sm p-4 sm:p-5"
      style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
    >
      <header className="flex items-start gap-2 mb-3">
        <div className="mt-0.5"><AlertTriangle size={18} className="text-rose-600" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>What to reteach</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>
            Most-missed words across the class. Coverage % shows how widespread the confusion is.
          </p>
        </div>
        {/* One-click reteach: takes the current top-10 word IDs and
            kicks the parent into the Create-Assignment wizard with
            those words pre-selected.  Only visible when there's
            actually something to reteach AND a parent has wired the
            callback. */}
        {rows.length > 0 && onCreateReteachAssignment && (
          <button
            type="button"
            onClick={() => onCreateReteachAssignment(rows.map(r => r.wid))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm shrink-0"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            <Plus size={14} />
            {t.reteachCta}
          </button>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="text-center text-sm py-6" style={{ color: 'var(--vb-text-muted)' }}>
          No mistakes recorded yet — your class is doing great.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase tracking-wider border-b"
                style={{ color: 'var(--vb-text-muted)', borderColor: 'var(--vb-border)' }}
              >
                <th className="px-3 py-2 font-bold">Word</th>
                <th className="px-3 py-2 font-bold">Hebrew</th>
                <th className="px-3 py-2 font-bold">Arabic</th>
                <th className="px-3 py-2 font-bold text-right">Misses</th>
                <th className="px-3 py-2 font-bold text-right">% of class</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.wid} className="border-b last:border-b-0" style={{ borderColor: 'var(--vb-border)' }}>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--vb-text-primary)' }}>{row.english}</td>
                  <td className="px-3 py-2" dir="rtl" style={{ color: 'var(--vb-text-secondary)' }}>{row.hebrew}</td>
                  <td className="px-3 py-2" dir="rtl" style={{ color: 'var(--vb-text-secondary)' }}>{row.arabic}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        row.studentPct >= 60 ? "bg-rose-100 text-rose-700" :
                        row.studentPct >= 30 ? "bg-amber-100 text-amber-700" :
                        ""
                      }`}
                      style={
                        row.studentPct < 30
                          ? { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }
                          : undefined
                      }
                    >
                      {row.studentPct}%
                    </span>
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
