/**
 * WorksheetAttemptsView — teacher-facing dashboard of attempts at
 * interactive worksheets the teacher shared (via the Free Resources
 * page or, soon, from inside the app).
 *
 * Two screens within one view:
 *   1. Worksheet list — every worksheet this teacher owns, with the
 *      attempt count + most recent submission timestamp.
 *   2. Worksheet detail — per-student attempts for one worksheet, with
 *      an expandable per-question breakdown.
 *
 * RLS does the privacy work: worksheet_attempts SELECT is restricted to
 * rows whose parent worksheet has teacher_uid = auth.uid().  Anonymous
 * shares (no owner) never appear here.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Inbox,
  Loader2,
  QrCode,
  Users,
} from "lucide-react";
import { supabase } from "../core/supabase";
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { shareWorksheetT } from "../locales/teacher/share-worksheet";
import { WorksheetShareCard } from "../components/WorksheetShareCard";

type WorksheetFormat = "matching" | "quiz" | "fillblank" | "listening";

interface Worksheet {
  slug: string;
  topic_name: string;
  format: WorksheetFormat;
  word_ids: number[];
  expires_at: string;
  created_at: string;
}

// One row in worksheet_attempts.answers — discriminated union mirrors
// the shape the solver writes.  Quiz and matching are rendered with
// type-specific layouts; everything else falls through to a generic
// renderer that reads `is_correct` and any "word"/"english"-shaped
// label field.  The generic branch keeps the dashboard from crashing
// when a new exercise type ships before its dedicated renderer does.
type QuizAnswer = {
  kind: "quiz";
  word_id: number;
  prompt: string;
  given: string;
  correct: string;
  is_correct: boolean;
};
type MatchingAnswer = {
  kind: "matching";
  word_id: number;
  english: string;
  translation: string;
  mistakes_count: number;
};
type GenericAnswer = {
  kind: string;
  word_id?: number;
  word?: string;
  prompt?: string;
  english?: string;
  statement?: string;
  given?: unknown;
  correct?: unknown;
  typed?: string;
  is_correct?: boolean;
  solved?: boolean;
  attempts?: number;
  mistakes_count?: number;
  sentence?: string;
  given_sentence?: string;
  target?: string;
};
type AnswerRow = QuizAnswer | MatchingAnswer | GenericAnswer;

interface Attempt {
  id: string;
  slug: string;
  student_name: string;
  answers: AnswerRow[];
  score: number;
  total: number;
  duration_ms: number | null;
  completed_at: string | null;
}

interface Props {
  user: AppUser;
  onBack: () => void;
}

export default function WorksheetAttemptsView({ user, onBack }: Props) {
  const { isRTL } = useLanguage();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: wData, error: wErr } = await supabase
        .from("interactive_worksheets")
        .select("slug, topic_name, format, word_ids, expires_at, created_at")
        .eq("teacher_uid", user.uid)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (wErr) {
        setError(wErr.message);
        setLoading(false);
        return;
      }
      const list = (wData ?? []) as Worksheet[];
      setWorksheets(list);

      if (list.length === 0) {
        setAttempts([]);
        setLoading(false);
        return;
      }

      const slugs = list.map((w) => w.slug);
      const { data: aData, error: aErr } = await supabase
        .from("worksheet_attempts")
        .select("id, slug, student_name, answers, score, total, duration_ms, completed_at")
        .in("slug", slugs)
        .order("completed_at", { ascending: false });
      if (cancelled) return;
      if (aErr) {
        // Worksheets still render even if attempts fail — the user can
        // see what they shared, just not the results.
        setError(aErr.message);
      }
      setAttempts((aData ?? []) as Attempt[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  // Group attempts by slug + count.  Memoised so flipping selectedSlug
  // doesn't re-walk the whole array.
  const attemptsBySlug = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const a of attempts) {
      const arr = map.get(a.slug);
      if (arr) arr.push(a);
      else map.set(a.slug, [a]);
    }
    return map;
  }, [attempts]);

  const selectedWorksheet = useMemo(
    () => worksheets.find((w) => w.slug === selectedSlug) ?? null,
    [worksheets, selectedSlug]
  );
  const selectedAttempts = useMemo(
    () => (selectedSlug ? attemptsBySlug.get(selectedSlug) ?? [] : []),
    [selectedSlug, attemptsBySlug]
  );

  return (
    <div className="min-h-screen bg-[var(--vb-bg)] px-4 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => (selectedSlug ? setSelectedSlug(null) : onBack())}
          className="flex items-center gap-2 text-violet-600 font-bold hover:text-violet-700 transition-all mb-6"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
          <span>{selectedSlug ? "All worksheets" : "Back"}</span>
        </button>

        {loading ? (
          <div className="flex items-center justify-center gap-3 text-[var(--vb-text-muted)] py-20">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-semibold">Loading results…</span>
          </div>
        ) : error && worksheets.length === 0 ? (
          <ErrorCard message={error} />
        ) : !selectedWorksheet ? (
          <WorksheetList
            worksheets={worksheets}
            attemptsBySlug={attemptsBySlug}
            onSelect={setSelectedSlug}
          />
        ) : (
          <WorksheetDetail worksheet={selectedWorksheet} attempts={selectedAttempts} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Screen 1: list of every worksheet this teacher owns.
// ─────────────────────────────────────────────────────────────────────
const WorksheetList: React.FC<{
  worksheets: Worksheet[];
  attemptsBySlug: Map<string, Attempt[]>;
  onSelect: (slug: string) => void;
}> = ({ worksheets, attemptsBySlug, onSelect }) => {
  if (worksheets.length === 0) {
    return (
      <div className="text-center max-w-md mx-auto p-10 rounded-3xl bg-[var(--vb-surface)] border border-[var(--vb-border)]">
        <Inbox size={40} className="mx-auto mb-4 text-[var(--vb-text-muted)]" />
        <h2 className="text-xl font-black text-[var(--vb-text-primary)] mb-2">
          No shared worksheets yet
        </h2>
        <p className="text-sm text-[var(--vb-text-secondary)]">
          Share a worksheet from the Free Resources page or from a custom word list, and student
          results will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
            <ClipboardList size={20} className="text-violet-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--vb-text-primary)]">
            Worksheet Results
          </h1>
        </div>
        <p className="text-sm text-[var(--vb-text-secondary)]">
          Tap a worksheet to see who completed it.
        </p>
      </div>

      <div className="space-y-3">
        {worksheets.map((w) => {
          const att = attemptsBySlug.get(w.slug) ?? [];
          const completedCount = att.filter((a) => a.completed_at).length;
          const latest = att[0]?.completed_at ?? null;
          return (
            <motion.button
              key={w.slug}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(w.slug)}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                backgroundColor: "var(--vb-surface)",
                borderColor: "var(--vb-border)",
              }}
              className="w-full text-left rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest font-bold text-violet-500 mb-1">
                    {w.format}
                  </p>
                  <h3 className="text-lg font-black text-[var(--vb-text-primary)] truncate mb-1">
                    {w.topic_name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[var(--vb-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {completedCount} {completedCount === 1 ? "submission" : "submissions"}
                    </span>
                    {latest && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Last: {formatRelative(latest)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-3xl font-black text-violet-600 tabular-nums">
                    {completedCount}
                  </span>
                  <ChevronRight size={18} className="text-[var(--vb-text-muted)]" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Screen 2: per-worksheet attempts list with expandable rows.
// ─────────────────────────────────────────────────────────────────────
const WorksheetDetail: React.FC<{ worksheet: Worksheet; attempts: Attempt[] }> = ({
  worksheet,
  attempts,
}) => {
  const { language } = useLanguage();
  const shareT = shareWorksheetT[language];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Default the share panel open when there are no submissions yet —
  // that's exactly when a teacher needs the QR back. Once results come
  // in the panel is collapsed by default so the results are above the
  // fold; tapping the chip re-opens it.
  const [shareOpen, setShareOpen] = useState<boolean>(() =>
    attempts.filter((a) => a.completed_at).length === 0,
  );
  const completed = attempts.filter((a) => a.completed_at);
  const avgPct =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, a) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) /
            completed.length
        )
      : 0;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest font-bold text-violet-500 mb-1">
          {worksheet.format}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--vb-text-primary)] mb-3">
          {worksheet.topic_name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--vb-text-secondary)]">
          <span>{worksheet.word_ids.length} words</span>
          <span>•</span>
          <span>
            {completed.length} {completed.length === 1 ? "submission" : "submissions"}
          </span>
          {completed.length > 0 && (
            <>
              <span>•</span>
              <span>Avg {avgPct}%</span>
            </>
          )}
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--vb-text-muted)] mt-2">
          /w/{worksheet.slug}
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--vb-border)] bg-[var(--vb-surface)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShareOpen((v) => !v)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--vb-surface-alt)] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <QrCode size={18} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-[var(--vb-text-primary)]">
              Share again
            </p>
            <p className="text-xs text-[var(--vb-text-muted)]">
              QR + link + save as image / PDF
            </p>
          </div>
          {shareOpen ? (
            <ChevronUp size={18} className="text-[var(--vb-text-muted)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--vb-text-muted)]" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {shareOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="border-t border-[var(--vb-border)]"
            >
              <div className="p-4">
                <WorksheetShareCard
                  slug={worksheet.slug}
                  topicName={worksheet.topic_name}
                  t={shareT}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {completed.length === 0 ? (
        <div className="text-center p-10 rounded-3xl bg-[var(--vb-surface)] border border-[var(--vb-border)]">
          <Inbox size={36} className="mx-auto mb-3 text-[var(--vb-text-muted)]" />
          <p className="text-sm text-[var(--vb-text-secondary)]">
            No submissions yet. Share the QR or link above with your students.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {completed.map((a) => {
            const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
            const isOpen = expandedId === a.id;
            // Score colour bands match the gradebook — green ≥ 80, amber
            // 60-79, rose < 60.  Keeps a teacher's mental colour map
            // consistent across the product.
            const scoreColor =
              pct >= 80
                ? "text-emerald-600"
                : pct >= 60
                  ? "text-amber-600"
                  : "text-rose-600";
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-[var(--vb-border)] bg-[var(--vb-surface)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : a.id)}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-[var(--vb-surface-alt)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--vb-text-primary)] truncate">
                      {a.student_name}
                    </p>
                    <p className="text-xs text-[var(--vb-text-muted)]">
                      {a.completed_at ? formatRelative(a.completed_at) : "—"}
                      {a.duration_ms != null && ` · ${formatDuration(a.duration_ms)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-black tabular-nums ${scoreColor}`}>{pct}%</p>
                    <p className="text-xs text-[var(--vb-text-muted)] tabular-nums">
                      {a.score} / {a.total}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-[var(--vb-text-muted)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="border-t border-[var(--vb-border)]"
                    >
                      <AnswerBreakdown answers={a.answers} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Per-question detail — format-aware because matching emits
// mistakes_count and quiz emits given/correct.
// ─────────────────────────────────────────────────────────────────────
const AnswerBreakdown: React.FC<{ answers: AnswerRow[] }> = ({ answers }) => {
  if (!answers || answers.length === 0) {
    return (
      <div className="p-4 text-sm text-[var(--vb-text-muted)]">
        No per-question detail recorded for this attempt.
      </div>
    );
  }
  return (
    <div className="p-3 sm:p-4 space-y-2">
      {answers.map((ans, idx) => {
        if (ans.kind === "quiz") {
          const a = ans as QuizAnswer;
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                a.is_correct
                  ? "bg-emerald-50 border border-emerald-100"
                  : "bg-rose-50 border border-rose-100"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--vb-text-primary)]" dir="ltr">
                  {a.prompt}
                </p>
                <p className="text-xs text-[var(--vb-text-secondary)] mt-0.5" dir="auto">
                  {a.is_correct ? (
                    <>Picked: {a.given}</>
                  ) : (
                    <>
                      Picked: <span className="text-rose-700 font-bold">{a.given}</span> ·
                      Correct: <span className="text-emerald-700 font-bold">{a.correct}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        }
        if (ans.kind === "matching") {
          const a = ans as MatchingAnswer;
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                a.mistakes_count === 0
                  ? "bg-emerald-50 border border-emerald-100"
                  : a.mistakes_count <= 2
                    ? "bg-amber-50 border border-amber-100"
                    : "bg-rose-50 border border-rose-100"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--vb-text-primary)]" dir="auto">
                  <span dir="ltr">{a.english}</span> · {a.translation}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-[var(--vb-text-muted)] tabular-nums">
                  {a.mistakes_count === 0
                    ? "First try"
                    : `${a.mistakes_count} ${a.mistakes_count === 1 ? "miss" : "misses"}`}
                </p>
              </div>
            </div>
          );
        }
        return <GenericAnswerRow key={idx} answer={ans as GenericAnswer} />;
      })}
    </div>
  );
};

// Fallback renderer for any answer kind that doesn't have a dedicated
// branch above.  Reads whatever label-shaped field is present so the
// dashboard shows *something* meaningful per question instead of
// dropping the answer or crashing.
const GenericAnswerRow: React.FC<{ answer: GenericAnswer }> = ({ answer }) => {
  const correct = answer.is_correct ?? (answer.solved !== undefined ? answer.solved : undefined);
  const label =
    answer.prompt ??
    answer.word ??
    answer.english ??
    answer.statement ??
    answer.sentence ??
    answer.given_sentence ??
    answer.target ??
    `Question`;

  // Build the detail line from whatever the kind happens to expose.
  const detailParts: string[] = [];
  if (typeof answer.typed === "string" && answer.typed.length > 0) {
    detailParts.push(`Typed: ${answer.typed}`);
  }
  if (
    typeof answer.given === "string" &&
    answer.given.length > 0 &&
    typeof answer.typed !== "string"
  ) {
    detailParts.push(`Picked: ${answer.given}`);
  }
  if (typeof answer.correct === "string" && correct === false) {
    detailParts.push(`Correct: ${answer.correct}`);
  }
  if (typeof answer.attempts === "number" && answer.attempts > 1) {
    detailParts.push(`${answer.attempts} tries`);
  }

  const bg =
    correct === true
      ? "bg-emerald-50 border-emerald-100"
      : correct === false
        ? "bg-rose-50 border-rose-100"
        : "bg-stone-50 border-stone-100";

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${bg}`}>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[var(--vb-text-primary)]" dir="auto">
          {label}
        </p>
        {detailParts.length > 0 && (
          <p className="text-xs text-[var(--vb-text-secondary)] mt-0.5" dir="auto">
            {detailParts.join(" · ")}
          </p>
        )}
        <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--vb-text-muted)] mt-1">
          {answer.kind}
        </p>
      </div>
    </div>
  );
};

const ErrorCard: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center max-w-md mx-auto p-8 rounded-3xl bg-rose-50 border border-rose-200">
    <p className="font-bold text-rose-900 mb-1">Couldn't load worksheet results</p>
    <p className="text-rose-700 text-sm">{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Tiny formatters — kept inline (no new utility module) since they're
// only used here and the shapes are trivial.
// ─────────────────────────────────────────────────────────────────────
const formatDuration = (ms: number): string => {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};
