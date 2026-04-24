/**
 * StudentProfile — the deep-dive drill for the v2 Classroom Students tab.
 *
 * Shown as an AdaptiveDrawer (right-side drawer on desktop, fullscreen
 * page on mobile) when the teacher taps a student row. Contents:
 *
 *   1. Headline stats — avg score, plays, last active, total XP. Each
 *      is a big coloured number with a plain-English caption underneath
 *      so the teacher isn't left to infer meaning.
 *   2. Per-mode breakdown — one bar per mode the student has played,
 *      coloured by avg score. Answers "where is this kid strong / weak?".
 *   3. Word mastery — the existing MasteryHeatmap component, scoped to
 *      this student's word attempts. Green / amber / rose per word.
 *   4. Recent attempts — chronological list of the last 8 plays with
 *      mode, assignment, score, date.
 *
 * Actions in the header: 🎁 Reward (opens TeacherRewardModal via a
 * parent callback — this component doesn't own the modal state).
 *
 * Data is fed in as props. The component does no fetching — keeps it
 * pure and easy to render from multiple entry points (Students tab
 * today, deep-link in Phase 3).
 */
import { useMemo } from "react";
import { Gift, Flame, Calendar, Trophy, ChartBar } from "lucide-react";
import AdaptiveDrawer from "../../components/classroom/AdaptiveDrawer";
import MasteryHeatmap, { type MasteryRow } from "../gradebook/MasteryHeatmap";
import { ALL_WORDS } from "../../data/vocabulary";
import type { ProgressData, AssignmentData } from "../../core/supabase";

interface StudentProfileProps {
  open: boolean;
  onClose: () => void;
  student: {
    uid: string | null;
    name: string;
    avatar: string;
    classCode: string;
  } | null;
  /** All ProgressData rows for this student, already filtered. */
  scores: ProgressData[];
  /** Word-mastery rows for this student, already filtered. */
  masteryRows: MasteryRow[];
  teacherAssignments: AssignmentData[];
  /** Called when the teacher taps the 🎁 Reward button in the header.
   *  Parent opens its existing TeacherRewardModal with the right student. */
  onReward?: () => void;
}

const MODE_EMOJI: Record<string, string> = {
  classic: "📝", spelling: "✍️", flashcards: "🎴", listening: "🎧",
  matching: "🔗", scramble: "🔤", reverse: "🔄", "true-false": "✓",
  "letter-sounds": "🔡", "sentence-builder": "🧩",
};

const scoreColor = (s: number): string => {
  if (s >= 90) return "from-emerald-400 to-emerald-600";
  if (s >= 70) return "from-sky-400 to-blue-600";
  if (s >= 50) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-rose-600";
};

const textColor = (s: number): string => {
  if (s >= 80) return "text-emerald-600";
  if (s >= 70) return "text-amber-600";
  return "text-rose-600";
};

export default function StudentProfile({
  open, onClose, student, scores, masteryRows, teacherAssignments, onReward,
}: StudentProfileProps) {
  const stats = useMemo(() => {
    if (scores.length === 0) {
      return { avg: 0, plays: 0, totalXp: 0, lastActive: null as Date | null };
    }
    const totalXp = scores.reduce((s, r) => s + r.score, 0);
    const avg = Math.round(totalXp / scores.length);
    const lastActive = new Date(
      Math.max(...scores.map(s => new Date(s.completedAt).getTime()))
    );
    return { avg, plays: scores.length, totalXp, lastActive };
  }, [scores]);

  const modeBreakdown = useMemo(() => {
    const byMode = new Map<string, { attempts: number; total: number }>();
    scores.forEach(s => {
      const prev = byMode.get(s.mode) ?? { attempts: 0, total: 0 };
      byMode.set(s.mode, {
        attempts: prev.attempts + 1,
        total: prev.total + s.score,
      });
    });
    return Array.from(byMode.entries())
      .map(([mode, v]) => ({
        mode,
        attempts: v.attempts,
        avg: Math.round(v.total / v.attempts),
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [scores]);

  const recentAttempts = useMemo(() => {
    return [...scores]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 8);
  }, [scores]);

  const assignmentTitle = (id: string) =>
    teacherAssignments.find(a => a.id === id)?.title ?? "Quick Play";

  const lastActiveLabel = stats.lastActive
    ? stats.lastActive.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";

  const headerSubtitle = student
    ? `${stats.plays} ${stats.plays === 1 ? "play" : "plays"} · last ${lastActiveLabel}`
    : "";

  return (
    <AdaptiveDrawer
      open={open && !!student}
      onClose={onClose}
      title={student?.name ?? ""}
      subtitle={headerSubtitle}
      avatar={student?.avatar}
      headerRight={
        onReward && student?.uid ? (
          <button
            type="button"
            onClick={onReward}
            className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm flex items-center gap-1.5 shrink-0"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            aria-label={`Reward ${student.name}`}
          >
            <Gift size={16} />
            Reward
          </button>
        ) : null
      }
    >
      {!student ? null : scores.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden>🌱</div>
          <p className="text-stone-700 font-bold">No plays yet</p>
          <p className="text-stone-500 text-sm mt-1">
            {student.name} hasn't played any assignments yet. Their stats
            will appear here as soon as they start.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-5">
          {/* ── Headline stats ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              value={`${stats.avg}%`}
              label="avg score"
              caption="across every game"
              tone={stats.avg >= 80 ? "emerald" : stats.avg >= 70 ? "amber" : "rose"}
            />
            <StatTile
              value={String(stats.plays)}
              label={stats.plays === 1 ? "play" : "plays"}
              caption="total attempts"
              tone="indigo"
            />
            <StatTile
              value={String(stats.totalXp)}
              label="XP earned"
              caption="sum of all scores"
              tone="violet"
              icon={<Flame size={14} />}
            />
            <StatTile
              value={lastActiveLabel}
              label="last active"
              caption="most recent play"
              tone="stone"
              icon={<Calendar size={14} />}
            />
          </div>

          {/* ── Per-mode breakdown ─────────────────────────────────── */}
          <section className="bg-white rounded-2xl p-4 border border-stone-100">
            <h3 className="text-sm font-black text-stone-800 mb-3 flex items-center gap-2">
              <ChartBar size={16} className="text-violet-500" />
              Per mode
              <span className="text-xs font-bold text-stone-400">
                · where they're strong vs. weak
              </span>
            </h3>
            <div className="space-y-2">
              {modeBreakdown.map(m => (
                <div key={m.mode} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-base shrink-0" aria-hidden>
                    {MODE_EMOJI[m.mode] ?? "🎯"}
                  </span>
                  <span className="w-24 font-bold text-stone-700 capitalize truncate">
                    {m.mode.replace(/-/g, " ")}
                  </span>
                  <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${scoreColor(m.avg)}`}
                      style={{ width: `${Math.min(100, m.avg)}%` }}
                    />
                  </div>
                  <span className={`w-10 text-right font-black ${textColor(m.avg)}`}>
                    {m.avg}
                  </span>
                  <span className="w-10 text-right text-stone-400 tabular-nums">
                    ×{m.attempts}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Word mastery heatmap ───────────────────────────────── */}
          <section className="bg-white rounded-2xl p-4 border border-stone-100">
            <h3 className="text-sm font-black text-stone-800 mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-emerald-500" />
              Word mastery
              <span className="text-xs font-bold text-stone-400">
                · green = solid, amber = shaky, rose = struggling
              </span>
            </h3>
            <MasteryHeatmap rows={masteryRows} words={ALL_WORDS} />
          </section>

          {/* ── Recent attempts ────────────────────────────────────── */}
          <section className="bg-white rounded-2xl p-4 border border-stone-100">
            <h3 className="text-sm font-black text-stone-800 mb-3">
              Recent plays
              <span className="text-xs font-bold text-stone-400 ml-2">
                · last {recentAttempts.length}
              </span>
            </h3>
            <div className="space-y-1.5">
              {recentAttempts.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-stone-50/60"
                >
                  <span className="text-lg shrink-0" aria-hidden>
                    {MODE_EMOJI[s.mode] ?? "🎯"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">
                      {assignmentTitle(s.assignmentId)}
                    </p>
                    <p className="text-[11px] text-stone-500 capitalize">
                      {s.mode.replace(/-/g, " ")} ·{" "}
                      {new Date(s.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg bg-gradient-to-br text-white font-black text-sm shrink-0 ${scoreColor(s.score)}`}>
                    {s.score}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdaptiveDrawer>
  );
}

// ── Stat tile (compact "big number + label" card) ──────────────────────
function StatTile({
  value, label, caption, tone, icon,
}: {
  value: string;
  label: string;
  caption: string;
  tone: "emerald" | "amber" | "rose" | "indigo" | "violet" | "stone";
  icon?: React.ReactNode;
}) {
  const toneClass: Record<string, string> = {
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    rose:    "text-rose-600",
    indigo:  "text-indigo-600",
    violet:  "text-violet-600",
    stone:   "text-stone-700",
  };
  return (
    <div className="bg-white rounded-2xl p-3 border border-stone-100">
      <div className={`text-2xl font-black leading-none ${toneClass[tone]} flex items-center gap-1`}>
        {icon}
        {value}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1.5">
        {label}
      </div>
      <div className="text-[10px] text-stone-400 mt-0.5">{caption}</div>
    </div>
  );
}
