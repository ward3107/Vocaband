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
import { Gift, Flame, Calendar, Trophy, ChartBar, AlertTriangle } from "lucide-react";
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

  // Aggregate wrong-attempts across every play of this student.
  // `progress.mistakes[]` is the array of word IDs the student missed
  // (game modes give the student unlimited retries until correct, so the
  // teacher otherwise never sees what they STRUGGLED with — only the
  // final mastery state).  This gives the teacher visibility into the
  // top words this student gets wrong on first try, regardless of
  // whether they eventually got there.
  const topMisses = useMemo(() => {
    const byWord = new Map<number, number>();
    scores.forEach(s => {
      (s.mistakes || []).forEach(wid => {
        byWord.set(wid, (byWord.get(wid) ?? 0) + 1);
      });
    });
    return Array.from(byWord.entries())
      .map(([wordId, count]) => {
        const w = ALL_WORDS.find(x => x.id === wordId);
        return w ? { word: w, count } : null;
      })
      .filter((x): x is { word: typeof ALL_WORDS[number]; count: number } => x !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
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
          <p className="text-[var(--vb-text-secondary)] font-bold">No plays yet</p>
          <p className="text-[var(--vb-text-muted)] text-sm mt-1">
            {student.name} hasn't played any assignments yet. Their stats
            will appear here as soon as they start.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-5">
          {/* ── Headline stats ─────────────────────────────────────────
              Each tile has a `title` attribute giving the teacher a
              plain-English explanation on hover — useful since the
              numbers (e.g. "XP earned" being a sum of scores) aren't
              self-evident.  Drawer is wider on desktop now (max-w-3xl)
              so the four tiles can breathe in a 2-col grid. */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              value={`${stats.avg}%`}
              label="avg score"
              caption="across every game"
              tone={stats.avg >= 80 ? "emerald" : stats.avg >= 70 ? "amber" : "rose"}
              tooltip="The student's average score (out of 100) across every game they've finished. 80+ = solid, 70-79 = okay, below 70 = needs help."
            />
            <StatTile
              value={String(stats.plays)}
              label={stats.plays === 1 ? "play" : "plays"}
              caption="total attempts"
              tone="indigo"
              tooltip="Total number of game-rounds completed by this student across all assignments and modes."
            />
            <StatTile
              value={String(stats.totalXp)}
              label="XP earned"
              caption="sum of all scores"
              tone="violet"
              icon={<Flame size={14} />}
              tooltip="Cumulative XP — the sum of every score the student has earned in every game. Drives shop unlocks + their level title."
            />
            <StatTile
              value={lastActiveLabel}
              label="last active"
              caption="most recent play"
              tone="stone"
              icon={<Calendar size={14} />}
              tooltip="The date of this student's most recent game. Useful for spotting students who've gone quiet."
            />
          </div>

          {/* ── Per-mode breakdown ─────────────────────────────────── */}
          <section className="bg-[var(--vb-surface)] rounded-2xl p-4 border border-[var(--vb-border)]">
            <h3 className="text-sm font-black text-[var(--vb-text-primary)] mb-3 flex items-center gap-2">
              <ChartBar size={16} className="text-violet-500" />
              Per mode
              <span className="text-xs font-bold text-[var(--vb-text-muted)]">
                · where they're strong vs. weak
              </span>
            </h3>
            <div className="space-y-2">
              {modeBreakdown.map(m => (
                <div key={m.mode} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-base shrink-0" aria-hidden>
                    {MODE_EMOJI[m.mode] ?? "🎯"}
                  </span>
                  <span className="w-24 font-bold text-[var(--vb-text-secondary)] capitalize truncate">
                    {m.mode.replace(/-/g, " ")}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--vb-surface-alt)] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${scoreColor(m.avg)}`}
                      style={{ width: `${Math.min(100, m.avg)}%` }}
                    />
                  </div>
                  <span className={`w-10 text-right font-black ${textColor(m.avg)}`}>
                    {m.avg}
                  </span>
                  <span className="w-10 text-right text-[var(--vb-text-muted)] tabular-nums">
                    ×{m.attempts}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Word mastery heatmap ───────────────────────────────── */}
          <section className="bg-[var(--vb-surface)] rounded-2xl p-4 border border-[var(--vb-border)]">
            <h3 className="text-sm font-black text-[var(--vb-text-primary)] mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-emerald-500" />
              Word mastery
              <span className="text-xs font-bold text-[var(--vb-text-muted)]">
                · green = solid, amber = shaky, rose = struggling
              </span>
            </h3>
            <MasteryHeatmap rows={masteryRows} words={ALL_WORDS} />
          </section>

          {/* ── Struggled with ──────────────────────────────────────────
              The 10 words this student got wrong most often (across all
              their plays).  Surfaces the per-student equivalent of the
              Reports tab's class-wide "Top Struggling Words" section —
              gives the teacher a focused reteach list per kid.

              IMPORTANT: game modes don't end on a wrong answer; the
              student keeps trying until correct.  So mastery looks
              fine for these words, but their FIRST-attempt accuracy
              is what this list reflects. */}
          {topMisses.length > 0 && (
            <section className="bg-[var(--vb-surface)] rounded-2xl p-4 border border-[var(--vb-border)]">
              <h3 className="text-sm font-black text-[var(--vb-text-primary)] mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500" />
                Struggled with
                <span className="text-xs font-bold text-[var(--vb-text-muted)]">
                  · words missed on first try (any game)
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {topMisses.map(({ word, count }) => (
                  <span
                    key={word.id}
                    title={`Got "${word.english}" wrong on first try ${count} time${count === 1 ? '' : 's'}. Hebrew: ${word.hebrew}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs"
                  >
                    {word.english}
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-200 text-rose-800 tabular-nums text-[10px]">
                      ×{count}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent attempts ────────────────────────────────────── */}
          <section className="bg-[var(--vb-surface)] rounded-2xl p-4 border border-[var(--vb-border)]">
            <h3 className="text-sm font-black text-[var(--vb-text-primary)] mb-3">
              Recent plays
              <span className="text-xs font-bold text-[var(--vb-text-muted)] ml-2">
                · last {recentAttempts.length}
              </span>
            </h3>
            <div className="space-y-1.5">
              {recentAttempts.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60"
                >
                  <span className="text-lg shrink-0" aria-hidden>
                    {MODE_EMOJI[s.mode] ?? "🎯"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--vb-text-primary)] truncate">
                      {assignmentTitle(s.assignmentId)}
                    </p>
                    <p className="text-[11px] text-[var(--vb-text-muted)] capitalize">
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
  value, label, caption, tone, icon, tooltip,
}: {
  value: string;
  label: string;
  caption: string;
  tone: "emerald" | "amber" | "rose" | "indigo" | "violet" | "stone";
  icon?: React.ReactNode;
  /** Plain-English explanation shown on hover so the teacher knows
   *  what the number actually means.  Native browser tooltip — no
   *  extra component, works on every device. */
  tooltip?: string;
}) {
  const toneClass: Record<string, string> = {
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    rose:    "text-rose-600",
    indigo:  "text-indigo-600",
    violet:  "text-violet-600",
    stone:   "text-[var(--vb-text-secondary)]",
  };
  return (
    <div
      className="bg-[var(--vb-surface)] rounded-2xl p-3 border border-[var(--vb-border)]"
      title={tooltip}
    >
      <div className={`text-2xl font-black leading-none ${toneClass[tone]} flex items-center gap-1`}>
        {icon}
        {value}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--vb-text-muted)] mt-1.5">
        {label}
      </div>
      <div className="text-[10px] text-[var(--vb-text-muted)] mt-0.5">{caption}</div>
    </div>
  );
}
