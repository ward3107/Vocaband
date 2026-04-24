/**
 * TodayActionList — derives 3 canonical "you should do X" items from
 * the data the teacher already has in-memory, so opening Classroom in
 * the morning gives an actual to-do list, not a dashboard to interpret.
 *
 * Rules (all purely derived — no extra fetch):
 *
 *   1. Inactive students: anyone in the selected class with zero
 *      plays in the last 7 days. Action → go to Students tab.
 *   2. Most-missed word this week: top entry in mistakes[] across
 *      the last 7 days. Action → go to Reports tab.
 *   3. Straggler assignment: the most-played assignment in the class
 *      where completion < 100%. Action → open the assignment's detail
 *      (via callback so the parent can switch tabs + prime the drill).
 *
 * Each rule only fires when there's a real data signal — if everyone
 * played this week, no card shows for rule 1, etc. The whole list
 * collapses to nothing on empty classes, which is the right signal
 * for the teacher ("nothing needs doing right now").
 */
import { useMemo } from "react";
import { ArrowRight, BellRing, AlertTriangle, Send } from "lucide-react";
import { ALL_WORDS } from "../../data/vocabulary";
import type { ProgressData, AssignmentData } from "../../core/supabase";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface TodayActionListProps {
  classCode: string;
  scores: ProgressData[];                // pre-filtered to this class
  classStudents: ClassStudent[];
  teacherAssignments: AssignmentData[];
  /** Teacher taps "nudge inactive students" — parent routes to
   *  Students tab (future: with the relevant filter applied). */
  onGoToStudents: () => void;
  /** Teacher taps "reteach word X" — parent routes to Reports tab
   *  where the What-to-Reteach picker lives. */
  onGoToReports: () => void;
  /** Teacher taps "reassign X" — parent routes to Assignments tab and
   *  opens the named assignment's drill detail. */
  onOpenAssignment: (assignmentId: string) => void;
}

const DAYS_AGO_MS = (n: number) => Date.now() - n * 24 * 60 * 60 * 1000;

export default function TodayActionList({
  classCode,
  scores,
  classStudents,
  teacherAssignments,
  onGoToStudents,
  onGoToReports,
  onOpenAssignment,
}: TodayActionListProps) {
  const items = useMemo(() => {
    const actions: Array<{
      key: string;
      icon: React.ReactNode;
      tone: "amber" | "rose" | "indigo";
      title: string;
      cta: string;
      onClick: () => void;
    }> = [];

    const sevenDaysAgo = DAYS_AGO_MS(7);

    // Rule 1 — inactive students
    const activeNames = new Set<string>();
    scores.forEach(s => {
      if (new Date(s.completedAt).getTime() >= sevenDaysAgo) {
        activeNames.add(s.studentName.trim().toLowerCase());
      }
    });
    const inactive = classStudents
      .filter(cs => cs.classCode === classCode)
      .filter(cs => !activeNames.has(cs.name.trim().toLowerCase()));
    if (inactive.length > 0) {
      actions.push({
        key: "inactive",
        icon: <BellRing size={18} />,
        tone: "amber",
        title: `${inactive.length} student${inactive.length === 1 ? " hasn't" : "s haven't"} played in a week`,
        cta: "Open Students",
        onClick: onGoToStudents,
      });
    }

    // Rule 2 — most-missed word this week
    const missCounts: Record<number, number> = {};
    scores.forEach(s => {
      if (new Date(s.completedAt).getTime() < sevenDaysAgo) return;
      s.mistakes?.forEach(wid => {
        missCounts[wid] = (missCounts[wid] ?? 0) + 1;
      });
    });
    const topWordEntry = Object.entries(missCounts).sort((a, b) => b[1] - a[1])[0];
    if (topWordEntry) {
      const [wordId, count] = topWordEntry;
      const word = ALL_WORDS.find(w => w.id === parseInt(wordId));
      if (word && count >= 3) {
        actions.push({
          key: "reteach",
          icon: <AlertTriangle size={18} />,
          tone: "rose",
          title: `Most-missed word this week: "${word.english}" (${count} errors)`,
          cta: "Plan reteach",
          onClick: onGoToReports,
        });
      }
    }

    // Rule 3 — straggler assignment
    const perAssignment = new Map<string, { attempts: number; students: Set<string> }>();
    scores.forEach(s => {
      if (!perAssignment.has(s.assignmentId)) {
        perAssignment.set(s.assignmentId, { attempts: 0, students: new Set() });
      }
      const r = perAssignment.get(s.assignmentId)!;
      r.attempts += 1;
      r.students.add(s.studentName.trim().toLowerCase());
    });
    const rosterSize = classStudents.filter(cs => cs.classCode === classCode).length;
    let stragglerId: string | null = null;
    let stragglerDone = 0;
    let stragglerAttempts = 0;
    perAssignment.forEach((v, id) => {
      // Only consider assignments owned by this teacher so we skip
      // Quick-Play rows which don't have a reassign target.
      if (!teacherAssignments.some(a => a.id === id)) return;
      if (rosterSize > 0 && v.students.size < rosterSize && v.attempts > stragglerAttempts) {
        stragglerId = id;
        stragglerDone = v.students.size;
        stragglerAttempts = v.attempts;
      }
    });
    if (stragglerId && rosterSize > 0) {
      const a = teacherAssignments.find(x => x.id === stragglerId);
      if (a) {
        const remaining = rosterSize - stragglerDone;
        actions.push({
          key: "straggler",
          icon: <Send size={18} />,
          tone: "indigo",
          title: `${a.title}: ${stragglerDone} / ${rosterSize} done — reassign to the ${remaining}?`,
          cta: "Open assignment",
          onClick: () => onOpenAssignment(stragglerId!),
        });
      }
    }

    return actions;
  }, [classCode, scores, classStudents, teacherAssignments, onGoToStudents, onGoToReports, onOpenAssignment]);

  if (items.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl p-4 border border-stone-100">
      <header className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-black text-stone-800">Suggestions for today</h3>
        <span className="text-[11px] text-stone-400 font-bold">
          · {items.length} thing{items.length === 1 ? "" : "s"} worth a minute
        </span>
      </header>
      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`group w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
              item.tone === "amber"
                ? "border-amber-100 hover:bg-amber-50/40"
                : item.tone === "rose"
                  ? "border-rose-100 hover:bg-rose-50/40"
                  : "border-indigo-100 hover:bg-indigo-50/40"
            }`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              item.tone === "amber"
                ? "bg-amber-100 text-amber-700"
                : item.tone === "rose"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-indigo-100 text-indigo-700"
            }`}>
              {item.icon}
            </div>
            <p className="flex-1 text-sm font-bold text-stone-800 leading-snug">
              {item.title}
            </p>
            <div className={`hidden sm:flex items-center gap-1 text-xs font-black shrink-0 ${
              item.tone === "amber"
                ? "text-amber-700"
                : item.tone === "rose"
                  ? "text-rose-700"
                  : "text-indigo-700"
            }`}>
              {item.cta}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </div>
            <ArrowRight size={16} className="sm:hidden text-stone-300 shrink-0" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
