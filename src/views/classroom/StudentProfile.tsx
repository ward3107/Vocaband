/**
 * StudentProfile — the deep-dive drill for the v2 Classroom Students tab.
 *
 * Shown as an AdaptiveDrawer (right-side drawer on desktop, fullscreen
 * page on mobile) when the teacher taps a student row.
 *
 * 2026-05 redesign ("Player Card"):
 *   - Hero strip at the top: a horizontal 4-metric row (avg · plays ·
 *     XP · last active) with hairline dividers, no card chrome. Drops
 *     the previous 2×2 grid of bordered tiles so the eye lands on one
 *     row of big numbers instead of four boxes.
 *   - Two-column body (lg+): left = Performance (Per mode + Word
 *     mastery), right = Activity (Struggled with + Recent plays). On
 *     mobile / tablet the two columns stack.
 *   - Sticky bottom action bar with "Reteach these words" — closes the
 *     loop teachers couldn't close before (see top misses → one-tap
 *     reteach, mirrors the class-level CTA on TopStrugglingWords).
 *
 * Data is fed in as props. The component does no fetching — keeps it
 * pure and easy to render from multiple entry points.
 */
import { useCallback, useMemo, type ReactNode } from "react";
import { Gift, ChartBar, AlertTriangle, Trophy, History, Sparkles } from "lucide-react";
import AdaptiveDrawer from "../../components/classroom/AdaptiveDrawer";
import MasteryHeatmap, { type MasteryRow } from "../gradebook/MasteryHeatmap";
import {
  buildWordIdSubjectMap,
  getDisplayLabel,
  lookupDisplayWord,
  type DisplayWord,
} from "../../data/wordLookup";
import type { ProgressData, AssignmentData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherDrilldownsT } from "../../locales/teacher/drilldowns";

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
  /** Called when the teacher taps "Reteach these words" in the sticky
   *  bottom bar.  Receives the IDs of the student's most-missed words.
   *  Parent is expected to navigate to the Create-Assignment wizard
   *  with those word IDs pre-filled (mirrors TopStrugglingWords). */
  onReteach?: (wordIds: number[]) => void;
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
  open, onClose, student, scores, masteryRows, teacherAssignments, onReward, onReteach,
}: StudentProfileProps) {
  const { language } = useLanguage();
  const t = teacherDrilldownsT[language];
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

  // Aggregate wrong-attempts across every play of this student.  Game
  // modes give unlimited retries until correct, so without this list the
  // teacher only ever sees the final mastery state and never the words
  // the student struggled with on first try.
  const wordIdSubjectMap = useMemo(
    () => buildWordIdSubjectMap(teacherAssignments),
    [teacherAssignments],
  );
  const getMasteryLabel = useCallback(
    (wordId: number) =>
      getDisplayLabel(wordId, wordIdSubjectMap.get(wordId) ?? "english"),
    [wordIdSubjectMap],
  );

  const topMisses = useMemo<Array<{ display: DisplayWord; count: number }>>(() => {
    const byWord = new Map<number, number>();
    scores.forEach(s => {
      (s.mistakes || []).forEach(wid => {
        byWord.set(wid, (byWord.get(wid) ?? 0) + 1);
      });
    });
    return Array.from(byWord.entries())
      .map(([wordId, count]) => {
        const display = lookupDisplayWord(
          wordId,
          wordIdSubjectMap.get(wordId) ?? "english",
        );
        return display ? { display, count } : null;
      })
      .filter((x): x is { display: DisplayWord; count: number } => x !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [scores, wordIdSubjectMap]);

  const assignmentTitle = (id: string) =>
    teacherAssignments.find(a => a.id === id)?.title ?? t.fallbackAssignmentLabel;

  const lastActiveLabel = stats.lastActive
    ? stats.lastActive.toLocaleDateString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar' : undefined, { month: "short", day: "numeric" })
    : t.noLastActive;

  const headerSubtitle = student
    ? t.studentHeaderSubtitle(stats.plays, lastActiveLabel)
    : "";

  // Reteach CTA copy — short, action-first.  Falls back to a generic
  // label in non-English locales since the locale file doesn't yet have
  // a per-student reteach string.  Safe default; reads cleanly in HE/AR
  // beside the rose accent button.
  const reteachLabel =
    language === "he"
      ? `למד שוב את ${topMisses.length} המילים`
      : language === "ar"
        ? `أعد تدريس ${topMisses.length} كلمات`
        : `Reteach ${topMisses.length} ${topMisses.length === 1 ? "word" : "words"}`;
  const reteachHint =
    language === "he"
      ? "המילים שהוא הכי טועה בהן"
      : language === "ar"
        ? "الكلمات التي يخطئ فيها أكثر"
        : "Words this student keeps missing";

  const showReteachBar = !!onReteach && topMisses.length > 0;

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
            aria-label={t.rewardAria(student.name)}
          >
            <Gift size={16} />
            {t.rewardBtn}
          </button>
        ) : null
      }
    >
      {!student ? null : scores.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-5xl mb-3" aria-hidden>🌱</div>
          <p className="font-bold" style={{ color: 'var(--vb-text-secondary)' }}>{t.noPlaysTitle}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--vb-text-muted)' }}>
            {t.noPlaysBody(student.name)}
          </p>
        </div>
      ) : (
        <>
          {/* ─── Hero stat strip ───────────────────────────────────────
              Horizontal row of four big numbers, hairline dividers
              between them, no card chrome.  Replaces the previous 2×2
              grid of bordered tiles — gives the teacher a single line
              to read across instead of four boxes to scan. */}
          <div
            className="px-5 sm:px-7 pt-5 pb-5 border-b"
            style={{ borderColor: 'var(--vb-border)' }}
          >
            <div className="flex items-stretch gap-4 sm:gap-6">
              <HeroStat
                value={`${stats.avg}%`}
                label={t.statAvgScoreLabel}
                tone={stats.avg >= 80 ? "emerald" : stats.avg >= 70 ? "amber" : "rose"}
                tooltip={t.statAvgScoreTooltip}
              />
              <HeroDivider />
              <HeroStat
                value={String(stats.plays)}
                label={stats.plays === 1 ? t.statPlayCountSingular : t.statPlayCountPlural}
                tone="indigo"
                tooltip={t.statPlaysTooltip}
              />
              <HeroDivider />
              <HeroStat
                value={String(stats.totalXp)}
                label={t.statXpLabel}
                tone="violet"
                tooltip={t.statXpTooltip}
              />
              <HeroDivider />
              <HeroStat
                value={lastActiveLabel}
                label={t.statLastActiveLabel}
                tone="stone"
                tooltip={t.statLastActiveTooltip}
              />
            </div>
          </div>

          {/* ─── Two-column body ───────────────────────────────────────
              Left = Performance (per-mode + word mastery).
              Right = Activity (struggled-with chips + recent plays).
              Drops the rounded-2xl border chrome on each section so the
              eye doesn't have to re-anchor four times — section titles
              with a small coloured icon do the job instead.  Bottom
              padding leaves room for the sticky action bar. */}
          <div
            className={`px-5 sm:px-7 pt-6 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-7 ${
              showReteachBar ? "pb-24" : ""
            }`}
          >
            {/* ── Left column: Performance ─────────────────────────── */}
            <div className="space-y-7 min-w-0">
              <section>
                <SectionHeader
                  icon={<ChartBar size={16} className="text-violet-500" />}
                  title={t.perModeTitle}
                  subtitle={t.perModeSubtitle}
                />
                <div className="space-y-2">
                  {modeBreakdown.map(m => (
                    <div key={m.mode} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-base shrink-0" aria-hidden>
                        {MODE_EMOJI[m.mode] ?? "🎯"}
                      </span>
                      <span
                        className="w-24 font-bold capitalize truncate"
                        style={{ color: 'var(--vb-text-secondary)' }}
                      >
                        {m.mode.replace(/-/g, " ")}
                      </span>
                      <div
                        className="flex-1 h-3 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--vb-surface-alt)' }}
                      >
                        <div
                          className={`h-full bg-gradient-to-r ${scoreColor(m.avg)}`}
                          style={{ width: `${Math.min(100, m.avg)}%` }}
                        />
                      </div>
                      <span className={`w-10 text-right font-black ${textColor(m.avg)}`}>
                        {m.avg}
                      </span>
                      <span
                        className="w-10 text-right tabular-nums"
                        style={{ color: 'var(--vb-text-muted)' }}
                      >
                        ×{m.attempts}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <SectionHeader
                  icon={<Trophy size={16} className="text-emerald-500" />}
                  title={t.wordMasteryTitle}
                  subtitle={t.wordMasterySubtitle}
                />
                <MasteryHeatmap rows={masteryRows} getLabel={getMasteryLabel} />
              </section>
            </div>

            {/* ── Right column: Activity ───────────────────────────── */}
            <div className="space-y-7 min-w-0">
              {topMisses.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<AlertTriangle size={16} className="text-rose-500" />}
                    title={t.struggledWithTitle}
                    subtitle={t.struggledWithSubtitle}
                  />
                  <div className="flex flex-wrap gap-2">
                    {topMisses.map(({ display, count }) => (
                      <span
                        key={display.id}
                        title={t.struggledChipTitle(display.primary, count, display.secondary)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs"
                      >
                        {display.primary}
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-200 text-rose-800 tabular-nums text-[10px]">
                          ×{count}
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <SectionHeader
                  icon={<History size={16} className="text-sky-500" />}
                  title={t.recentPlaysTitle}
                  subtitle={t.lastNSuffix(recentAttempts.length).replace(/^·\s*/, "")}
                />
                <div className="space-y-1.5">
                  {recentAttempts.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--vb-surface-alt)' }}
                    >
                      <span className="text-lg shrink-0" aria-hidden>
                        {MODE_EMOJI[s.mode] ?? "🎯"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: 'var(--vb-text-primary)' }}
                        >
                          {assignmentTitle(s.assignmentId)}
                        </p>
                        <p
                          className="text-[11px] capitalize"
                          style={{ color: 'var(--vb-text-muted)' }}
                        >
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
          </div>

          {/* ─── Sticky action bar ─────────────────────────────────────
              Primary next-step for the teacher: take this student's
              top-missed word IDs and kick off a fresh assignment.
              Only renders when there's something to reteach AND the
              parent has wired the callback. */}
          {showReteachBar && (
            <div
              className="sticky bottom-0 left-0 right-0 px-5 sm:px-7 py-3 border-t flex items-center justify-between gap-3 backdrop-blur"
              style={{
                borderColor: 'var(--vb-border)',
                backgroundColor: 'color-mix(in srgb, var(--vb-surface) 92%, transparent)',
              }}
            >
              <div className="min-w-0">
                <p
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: 'var(--vb-text-muted)' }}
                >
                  {reteachHint}
                </p>
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--vb-text-primary)' }}
                >
                  {topMisses.slice(0, 3).map(m => m.display.primary).join(" · ")}
                  {topMisses.length > 3 && "…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onReteach!(topMisses.map(m => m.display.id))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm shrink-0"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                <Sparkles size={14} />
                {reteachLabel}
              </button>
            </div>
          )}
        </>
      )}
    </AdaptiveDrawer>
  );
}

// ── Hero stat (horizontal, no chrome) ────────────────────────────────────
function HeroStat({
  value, label, tone, tooltip,
}: {
  value: string;
  label: string;
  tone: "emerald" | "amber" | "rose" | "indigo" | "violet" | "stone";
  /** Plain-English explanation shown on hover so the teacher knows
   *  what the number actually means. */
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
    <div className="flex-1 min-w-0" title={tooltip}>
      <div className={`text-2xl sm:text-3xl font-black leading-none ${toneClass[tone]} truncate`}>
        {value}
      </div>
      <div
        className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-1.5 truncate"
        style={{ color: 'var(--vb-text-muted)' }}
      >
        {label}
      </div>
    </div>
  );
}

function HeroDivider() {
  return (
    <div
      className="w-px self-stretch"
      style={{ backgroundColor: 'var(--vb-border)' }}
      aria-hidden
    />
  );
}

// ── Section header (icon + title + muted subtitle, no card chrome) ───────
function SectionHeader({
  icon, title, subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <h3
      className="text-sm font-black mb-3 flex items-baseline gap-2 flex-wrap"
      style={{ color: 'var(--vb-text-primary)' }}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {title}
      </span>
      <span
        className="text-xs font-bold"
        style={{ color: 'var(--vb-text-muted)' }}
      >
        · {subtitle}
      </span>
    </h3>
  );
}
