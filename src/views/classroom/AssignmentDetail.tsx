/**
 * AssignmentDetail — the drill for the v2 Classroom Assignments tab.
 *
 * Shown as an AdaptiveDrawer (right drawer on desktop, fullscreen on
 * mobile) when the teacher taps an assignment row. Answers the core
 * question "how did my class do on this one?" with three visible
 * buckets:
 *
 *   ✅ Done        — students with at least one play, listed with their
 *                   best / avg score.
 *   ⏳ Stuck       — students who played but averaged < 70%, the
 *                   candidates for a re-assign nudge.
 *   ⚫ Not started — students in the class who have zero plays on this
 *                   assignment yet.
 *
 * Primary action: "Reassign to the N students who haven't finished" —
 * the button is the plan's headline feature for this drill; it lets
 * the teacher skip the bury-at-bottom-of-Pulse path from today's UI.
 * Wiring the one-click reassign is Phase 3; for now the CTA emits an
 * `onReassign` callback so the parent can decide what to do (and today
 * just surfaces a toast).
 *
 * All data is passed in as props — pure component, no RPC of its own.
 */
import { useMemo } from "react";
import { CheckCircle2, Clock, Moon, Users, Send } from "lucide-react";
import AdaptiveDrawer from "../../components/classroom/AdaptiveDrawer";
import type { ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherDrilldownsT } from "../../locales/teacher/drilldowns";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface StudentScore {
  name: string;
  avatar: string;
  attempts: number;
  bestScore: number;
  avgScore: number;
  lastDate: string;
}

interface AssignmentDetailProps {
  open: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    title: string;
    classCode: string;
  } | null;
  /** All ProgressData rows scoped to this assignment, already filtered. */
  scores: ProgressData[];
  /** Roster of the class this assignment belongs to, so we can flag
   *  students who haven't started. */
  classStudents: ClassStudent[];
  /** Fires when the teacher taps the reassign CTA. Receives the names
   *  of students who haven't finished (zero plays OR avg < 70). Parent
   *  decides what to do (open a flow, show a toast, …). Phase 3 will
   *  wire this to a real one-click reassign RPC. */
  onReassign?: (strugglerNames: string[]) => void;
}

const scoreColor = (s: number): string => {
  if (s >= 90) return "from-emerald-400 to-emerald-600";
  if (s >= 70) return "from-sky-400 to-blue-600";
  if (s >= 50) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-rose-600";
};

export default function AssignmentDetail({
  open, onClose, assignment, scores, classStudents, onReassign,
}: AssignmentDetailProps) {
  const { language } = useLanguage();
  const t = teacherDrilldownsT[language];
  const { done, stuck, notStarted, classAvg } = useMemo(() => {
    const byStudent = new Map<string, StudentScore>();
    scores.forEach(s => {
      const key = (s.studentUid || s.studentName).toLowerCase();
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          name: s.studentName,
          avatar: s.avatar || "🦊",
          attempts: 0,
          bestScore: 0,
          avgScore: 0,
          lastDate: s.completedAt,
        });
      }
      const r = byStudent.get(key)!;
      r.avgScore = Math.round((r.avgScore * r.attempts + s.score) / (r.attempts + 1));
      r.attempts += 1;
      r.bestScore = Math.max(r.bestScore, s.score);
      if (new Date(s.completedAt) > new Date(r.lastDate)) {
        r.lastDate = s.completedAt;
        if (s.avatar) r.avatar = s.avatar;
      }
    });

    const allStudents = Array.from(byStudent.values()).sort(
      (a, b) => b.avgScore - a.avgScore
    );
    const done = allStudents.filter(s => s.avgScore >= 70);
    const stuck = allStudents.filter(s => s.avgScore < 70);

    const playedNames = new Set(
      Array.from(byStudent.values()).map(v => v.name.trim().toLowerCase())
    );
    const notStarted = (assignment
      ? classStudents.filter(cs =>
          cs.classCode === assignment.classCode &&
          !playedNames.has(cs.name.trim().toLowerCase())
        )
      : []
    ).map(cs => cs.name);

    const classAvg =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);

    return { done, stuck, notStarted, classAvg };
  }, [scores, classStudents, assignment]);

  const totalExpected = done.length + stuck.length + notStarted.length;
  const completionPct =
    totalExpected === 0 ? 0 : Math.round(((done.length + stuck.length) / totalExpected) * 100);

  const strugglerNames = useMemo(
    () => [...stuck.map(s => s.name), ...notStarted],
    [stuck, notStarted]
  );

  return (
    <AdaptiveDrawer
      open={open && !!assignment}
      onClose={onClose}
      title={assignment?.title ?? ""}
      subtitle={assignment ? t.assignmentSubtitle(classAvg, completionPct) : ""}
      avatar="📝"
    >
      {!assignment ? null : (
        <div className="p-4 sm:p-5 space-y-4 pb-24">
          {/* ── Headline completion ────────────────────────────────── */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[var(--vb-text-muted)]">
                  Completion
                </div>
                <div className="text-3xl font-black text-indigo-600 mt-1">
                  {done.length + stuck.length}
                  <span className="text-[var(--vb-text-muted)] text-xl"> / {totalExpected}</span>
                </div>
                <div className="text-[10px] text-[var(--vb-text-muted)] mt-1">
                  students who've played at least once
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-black uppercase tracking-wider text-[var(--vb-text-muted)]">
                  Class avg
                </div>
                <div className={`text-3xl font-black mt-1 ${
                  classAvg >= 80 ? "text-emerald-600" :
                  classAvg >= 70 ? "text-amber-600" : "text-rose-600"
                }`}>
                  {classAvg}%
                </div>
                <div className="text-[10px] text-[var(--vb-text-muted)] mt-1">
                  average across every play
                </div>
              </div>
            </div>
            <div className="h-2 bg-[var(--vb-surface)] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* ── Three buckets ──────────────────────────────────────── */}
          <Bucket
            icon={<CheckCircle2 size={18} className="text-emerald-600" />}
            title={t.doneTitle}
            subtitle={t.doneSubtitle}
            count={done.length}
            tone="emerald"
          >
            {done.length === 0 ? (
              <Empty text={t.doneEmpty} />
            ) : (
              done.slice(0, 20).map(s => (
                <StudentRow key={s.name} student={s} rowSummary={t.studentRowSummary} showScore />
              ))
            )}
          </Bucket>

          <Bucket
            icon={<Clock size={18} className="text-amber-600" />}
            title={t.stuckTitle}
            subtitle={t.stuckSubtitle}
            count={stuck.length}
            tone="amber"
          >
            {stuck.length === 0 ? (
              <Empty text={t.stuckEmpty} />
            ) : (
              stuck.slice(0, 20).map(s => (
                <StudentRow key={s.name} student={s} rowSummary={t.studentRowSummary} showScore />
              ))
            )}
          </Bucket>

          <Bucket
            icon={<Moon size={18} className="text-[var(--vb-text-secondary)]" />}
            title="Not started"
            subtitle="Zero plays on this assignment"
            count={notStarted.length}
            tone="stone"
          >
            {notStarted.length === 0 ? (
              <Empty text={t.notStartedEmpty} />
            ) : (
              notStarted.slice(0, 20).map(name => (
                <div
                  key={name}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60"
                >
                  <span className="text-lg" aria-hidden>🦊</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--vb-text-primary)] truncate">{name}</p>
                    <p className="text-[11px] text-[var(--vb-text-muted)]">Hasn't opened it</p>
                  </div>
                </div>
              ))
            )}
          </Bucket>
        </div>
      )}

      {/* Sticky footer CTA — the plan's headline action. Only shows
          when there's someone to nudge. */}
      {assignment && strugglerNames.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[var(--vb-border)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <button
            type="button"
            onClick={() => onReassign?.(strugglerNames)}
            className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-shadow"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            <Send size={16} />
            {t.reassignCta(strugglerNames.length)}
          </button>
        </div>
      )}
    </AdaptiveDrawer>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────

function Bucket({
  icon, title, subtitle, count, tone, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  tone: "emerald" | "amber" | "stone";
  children: React.ReactNode;
}) {
  const toneRing: Record<string, string> = {
    emerald: "border-emerald-100",
    amber:   "border-amber-100",
    stone:   "border-[var(--vb-border)]",
  };
  return (
    <section className={`bg-[var(--vb-surface)] rounded-2xl p-4 border ${toneRing[tone]}`}>
      <header className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-black text-[var(--vb-text-primary)]">{title}</h3>
        <span className="text-xs font-bold text-[var(--vb-text-muted)]">· {count}</span>
        <span className="text-[11px] text-[var(--vb-text-muted)] ml-auto truncate">{subtitle}</span>
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function StudentRow({ student, showScore, rowSummary }: { student: StudentScore; showScore?: boolean; rowSummary: (plays: number, best: number) => string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60">
      <span className="text-lg shrink-0" aria-hidden>{student.avatar}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--vb-text-primary)] truncate">{student.name}</p>
        <p className="text-[11px] text-[var(--vb-text-muted)]">
          {student.attempts} {student.attempts === 1 ? "play" : "plays"} · best {student.bestScore}
        </p>
      </div>
      {showScore && (
        <div className={`px-2.5 py-1 rounded-lg bg-gradient-to-br text-white font-black text-sm shrink-0 ${scoreColor(student.avgScore)}`}>
          {student.avgScore}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 text-[var(--vb-text-muted)] text-sm">
      <Users size={14} />
      <span>{text}</span>
    </div>
  );
}
