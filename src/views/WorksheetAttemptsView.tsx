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
import { useEffect, useMemo, useState, type FC } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Inbox,
  Loader2,
  QrCode,
  Send,
  Target,
  Trash2,
} from "lucide-react";
import { supabase } from "../core/supabase";
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useIsMobile } from "../hooks/useIsMobile";
import { shareWorksheetT } from "../locales/teacher/share-worksheet";
import { WorksheetShareCard } from "../components/WorksheetShareCard";
import {
  ShareWorksheetDialog,
  type WorksheetLang,
} from "../components/ShareWorksheetDialog";
import { extractMisses, type Answer } from "../worksheet/types";
import PageHero from "../components/PageHero";
import WorksheetRowV2 from "../components/worksheet-results/v2/WorksheetRowV2";
import { tagColorForFormat } from "../components/worksheet-results/v2/constants";

type WorksheetFormat = "matching" | "quiz" | "fillblank" | "listening";

interface Worksheet {
  slug: string;
  topic_name: string;
  format: WorksheetFormat;
  word_ids: number[];
  expires_at: string;
  created_at: string;
  settings: { language?: WorksheetLang } | null;
  // Set when this worksheet was minted as a follow-up practice for a
  // student's missed words on another worksheet. The dashboard hides
  // children from the top-level list and surfaces them under the
  // parent's per-student row instead.
  parent_slug: string | null;
  // Archive timestamp. NULL = active. Archived rows are hidden from
  // students (link returns "expired") but the teacher can still browse
  // their submissions here.
  archived_at: string | null;
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
  // Fingerprint links the same browser's attempts across the parent
  // worksheet and any practice rounds the teacher sent afterwards.
  // Null in private-mode / fingerprint-blocked browsers — those
  // attempts can't be tied to a practice round.
  fingerprint: string | null;
}

interface Props {
  user: AppUser;
  onBack: () => void;
}

export default function WorksheetAttemptsView({ user, onBack }: Props) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  // Bumped by archive/delete actions to force a refetch without making
  // useEffect depend on the worksheets array (which would loop).
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: wData, error: wErr } = await supabase
        .from("interactive_worksheets")
        .select(
          "slug, topic_name, format, word_ids, expires_at, created_at, settings, parent_slug, archived_at",
        )
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
        .select(
          "id, slug, student_name, answers, score, total, duration_ms, completed_at, fingerprint",
        )
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
  }, [user.uid, refreshTick]);

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

  // Map a parent slug → its child worksheets, oldest-first so the
  // teacher reads practice rounds in the order they were sent.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Worksheet[]>();
    for (const w of worksheets) {
      if (!w.parent_slug) continue;
      const arr = map.get(w.parent_slug);
      if (arr) arr.push(w);
      else map.set(w.parent_slug, [w]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    return map;
  }, [worksheets]);

  // Top-level cards only — children appear nested inside the parent's
  // detail view so the dashboard doesn't double-count practice rounds
  // as standalone worksheets. Filter respects the active/archived toggle.
  const topLevelWorksheets = useMemo(
    () =>
      worksheets.filter(
        (w) =>
          !w.parent_slug &&
          (filter === "active" ? !w.archived_at : !!w.archived_at),
      ),
    [worksheets, filter],
  );

  const activeCount = useMemo(
    () => worksheets.filter((w) => !w.parent_slug && !w.archived_at).length,
    [worksheets],
  );
  const archivedCount = useMemo(
    () => worksheets.filter((w) => !w.parent_slug && !!w.archived_at).length,
    [worksheets],
  );

  const selectedWorksheet = useMemo(
    () => worksheets.find((w) => w.slug === selectedSlug) ?? null,
    [worksheets, selectedSlug]
  );
  const selectedAttempts = useMemo(
    () => (selectedSlug ? attemptsBySlug.get(selectedSlug) ?? [] : []),
    [selectedSlug, attemptsBySlug]
  );
  const selectedChildren = useMemo(
    () => (selectedSlug ? childrenByParent.get(selectedSlug) ?? [] : []),
    [selectedSlug, childrenByParent],
  );

  // Track in-flight mutation so the action buttons can disable themselves
  // and not double-fire on impatient taps.
  const [mutatingSlug, setMutatingSlug] = useState<string | null>(null);

  const handleArchive = async (slug: string, archived: boolean) => {
    setMutatingSlug(slug);
    const { data, error: rpcErr } = await supabase.rpc("set_worksheet_archived", {
      p_slug: slug,
      p_archived: archived,
    });
    setMutatingSlug(null);
    if (rpcErr || data === false) {
      setError(rpcErr?.message ?? "Couldn't update worksheet.");
      return;
    }
    if (selectedSlug === slug) setSelectedSlug(null);
    refresh();
  };

  const handleDelete = async (slug: string) => {
    const ok = window.confirm(
      "Delete this worksheet forever? All submitted attempts will be removed and the link will stop working. This can't be undone.",
    );
    if (!ok) return;
    setMutatingSlug(slug);
    const { data, error: rpcErr } = await supabase.rpc("revoke_my_worksheet", {
      p_slug: slug,
      p_fingerprint: null,
    });
    setMutatingSlug(null);
    if (rpcErr || data === false) {
      setError(rpcErr?.message ?? "Couldn't delete worksheet.");
      return;
    }
    if (selectedSlug === slug) setSelectedSlug(null);
    refresh();
  };

  // --vb-surface-alt (not --vb-bg, which is never defined) so the page
  // chrome actually follows the active teacher theme.
  return (
    <div className="min-h-screen bg-[var(--vb-surface-alt)]">
      <PageHero
        icon={<ClipboardList size={32} className="text-white" />}
        title="Worksheet Results"
        subtitle="See who completed each shared worksheet."
        onBack={() => (selectedSlug ? setSelectedSlug(null) : onBack())}
        backLabel={selectedSlug ? "All worksheets" : "Back"}
      />

      <div className="max-w-4xl mx-auto px-4 pt-6 sm:pt-10 pb-10">
        {loading ? (
          <div className="flex items-center justify-center gap-3 text-[var(--vb-text-muted)] py-20">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-semibold">Loading results…</span>
          </div>
        ) : error && worksheets.length === 0 ? (
          <ErrorCard message={error} />
        ) : !selectedWorksheet ? (
          <WorksheetList
            worksheets={topLevelWorksheets}
            attemptsBySlug={attemptsBySlug}
            childrenByParent={childrenByParent}
            onSelect={setSelectedSlug}
            filter={filter}
            onFilterChange={setFilter}
            activeCount={activeCount}
            archivedCount={archivedCount}
          />
        ) : (
          <WorksheetDetail
            worksheet={selectedWorksheet}
            attempts={selectedAttempts}
            childWorksheets={selectedChildren}
            attemptsBySlug={attemptsBySlug}
            onArchive={(archived) => handleArchive(selectedWorksheet.slug, archived)}
            onDelete={() => handleDelete(selectedWorksheet.slug)}
            mutating={mutatingSlug === selectedWorksheet.slug}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Screen 1: list of every worksheet this teacher owns.
// ─────────────────────────────────────────────────────────────────────
const WorksheetList: FC<{
  worksheets: Worksheet[];
  attemptsBySlug: Map<string, Attempt[]>;
  childrenByParent: Map<string, Worksheet[]>;
  onSelect: (slug: string) => void;
  filter: "active" | "archived";
  onFilterChange: (f: "active" | "archived") => void;
  activeCount: number;
  archivedCount: number;
}> = ({
  worksheets,
  attemptsBySlug,
  childrenByParent,
  onSelect,
  filter,
  onFilterChange,
  activeCount,
  archivedCount,
}) => {
  const isMobile = useIsMobile();
  // Filter chips render whenever the teacher has at least one archived
  // worksheet — until then there's nothing to switch between.
  const showFilter = archivedCount > 0 || filter === "archived";
  const isArchivedTab = filter === "archived";

  return (
    <>
      {showFilter && (
        <div className="mb-4 flex items-center gap-2">
          <FilterChip
            label={`Active · ${activeCount}`}
            active={filter === "active"}
            onClick={() => onFilterChange("active")}
          />
          <FilterChip
            label={`Archived · ${archivedCount}`}
            active={filter === "archived"}
            onClick={() => onFilterChange("archived")}
          />
        </div>
      )}

      {worksheets.length === 0 ? (
        <div className="text-center max-w-md mx-auto p-10 rounded-2xl bg-[var(--vb-surface)] border border-[var(--vb-border)]">
          <Inbox size={40} className="mx-auto mb-4 text-[var(--vb-text-muted)]" />
          <h2 className="text-xl font-black text-[var(--vb-text-primary)] mb-2">
            {isArchivedTab ? "No archived worksheets" : "No shared worksheets yet"}
          </h2>
          <p className="text-sm text-[var(--vb-text-secondary)]">
            {isArchivedTab
              ? "Archive a worksheet from its results page and it'll show up here. Student attempts are kept so you can still review them."
              : "Share a worksheet from the Free Resources page or from a custom word list, and student results will show up here."}
          </p>
        </div>
      ) : (
      <div className="space-y-1.5">
        {worksheets.map((w) => {
          const att = attemptsBySlug.get(w.slug) ?? [];
          const children = childrenByParent.get(w.slug) ?? [];
          // "Most recent activity" rolls in practice attempts so the
          // teacher's sort by recency still surfaces worksheets where
          // students are actively practicing, not just initially solving.
          const childAttempts = children.flatMap((c) => attemptsBySlug.get(c.slug) ?? []);
          const completedAttempts = att.filter((a) => a.completed_at);
          const completedCount = completedAttempts.length;
          const latest =
            [...att, ...childAttempts]
              .filter((a) => a.completed_at)
              .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))[0]
              ?.completed_at ?? null;
          // Ring shows the average score percentage across completed
          // attempts so the visual cue is "how well did the class do"
          // rather than just "how many took it" (which the title row
          // already says).  Falls back to 0 when nobody completed yet.
          const avgPct =
            completedAttempts.length > 0
              ? Math.round(
                  completedAttempts.reduce(
                    (sum, a) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0),
                    0,
                  ) / completedAttempts.length,
                )
              : 0;
          return (
            <WorksheetRowV2
              key={w.slug}
              mobile={isMobile}
              record={{
                id: w.slug,
                title: w.topic_name,
                modeLabel: w.format,
                modeTagColor: tagColorForFormat(w.format),
                completedCount,
                timeLabel: latest ? formatRelative(latest) : "—",
                completionPercent: avgPct,
                archived: !!w.archived_at,
                archivedLabel: "Archived",
              }}
              studentsCount={(done) => String(done)}
              onClick={() => onSelect(w.slug)}
            />
          );
        })}
      </div>
      )}
    </>
  );
};

const FilterChip: FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
      active
        ? "bg-violet-600 text-white shadow-sm"
        : "bg-[var(--vb-surface)] text-[var(--vb-text-secondary)] border border-[var(--vb-border)] hover:bg-[var(--vb-surface-alt)]"
    }`}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────
// Screen 2: per-worksheet attempts list with expandable rows.
// ─────────────────────────────────────────────────────────────────────
const WorksheetDetail: FC<{
  worksheet: Worksheet;
  attempts: Attempt[];
  childWorksheets: Worksheet[];
  attemptsBySlug: Map<string, Attempt[]>;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
  mutating: boolean;
}> = ({
  worksheet,
  attempts,
  childWorksheets,
  attemptsBySlug,
  onArchive,
  onDelete,
  mutating,
}) => {
  const isArchived = !!worksheet.archived_at;
  const { language } = useLanguage();
  const shareT = shareWorksheetT[language];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // When set, opens ShareWorksheetDialog pre-loaded with this student's
  // missed word IDs so the teacher can mint a follow-up practice
  // worksheet in one tap.
  const [retryFor, setRetryFor] = useState<Attempt | null>(null);
  // Default the share panel open when there are no submissions yet —
  // that's exactly when a teacher needs the QR back. Once results come
  // in the panel is collapsed by default so the results are above the
  // fold; tapping the chip re-opens it.
  const [shareOpen, setShareOpen] = useState<boolean>(() =>
    attempts.filter((a) => a.completed_at).length === 0,
  );

  // The original worksheet's language drives the retry default so the
  // teacher doesn't have to re-pick HE / AR every time. Falls back to
  // the teacher's UI language minus English (a retry "worksheet in
  // English" makes no sense for an EFL audience).
  const retryLang: WorksheetLang =
    worksheet.settings?.language ?? (language === "en" ? "he" : language);
  const completed = attempts.filter((a) => a.completed_at);

  // Per-student practice rounds — same browser fingerprint linking the
  // parent attempt to any completed child attempts. Sorted oldest-first
  // so the progression reads chronologically (Practice 1 → Practice 2 →…).
  const practiceByFingerprint = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const child of childWorksheets) {
      const childAttempts = attemptsBySlug.get(child.slug) ?? [];
      for (const a of childAttempts) {
        if (!a.completed_at || !a.fingerprint) continue;
        const arr = map.get(a.fingerprint);
        if (arr) arr.push(a);
        else map.set(a.fingerprint, [a]);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));
    }
    return map;
  }, [childWorksheets, attemptsBySlug]);
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
          {isArchived && (
            <span
              style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
              className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full normal-case tracking-normal"
            >
              <Archive size={10} /> Archived
            </span>
          )}
        </p>
      </div>

      {/* Archive / Delete row — always above the share panel so a teacher
          who's cleaning up doesn't have to scroll past results to find it.
          Archive is reversible (link dies, attempts kept); Delete is final
          and cascades to all attempts. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          onClick={() => onArchive(!isArchived)}
          disabled={mutating}
          whileHover={!mutating ? { scale: 1.02 } : undefined}
          whileTap={!mutating ? { scale: 0.97 } : undefined}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--vb-surface)] border border-[var(--vb-border)] text-[var(--vb-text-primary)] text-sm font-bold hover:bg-[var(--vb-surface-alt)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isArchived ? (
            <ArchiveRestore size={14} />
          ) : (
            <Archive size={14} />
          )}
          {isArchived ? "Unarchive" : "Archive"}
        </motion.button>
        <motion.button
          type="button"
          onClick={onDelete}
          disabled={mutating}
          whileHover={!mutating ? { scale: 1.02 } : undefined}
          whileTap={!mutating ? { scale: 0.97 } : undefined}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            backgroundColor: 'var(--vb-danger-soft)',
            color: 'var(--vb-danger)',
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete forever
        </motion.button>
      </div>

      {isArchived ? (
        <div
          style={{
            borderColor: 'var(--vb-border)',
            backgroundColor: 'var(--vb-surface-alt)',
            color: 'var(--vb-text-secondary)',
          }}
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
        >
          The share link is disabled while this worksheet is archived.
          Unarchive to let students open it again.
        </div>
      ) : (
      <div className="mb-6 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShareOpen((v) => !v)}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--vb-surface-alt)] transition-colors"
        >
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--vb-success), transparent 78%)',
              color: 'var(--vb-success)',
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          >
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
      )}

      {completed.length === 0 ? (
        <div className="text-center p-10 rounded-2xl bg-[var(--vb-surface)] border border-[var(--vb-border)]">
          <Inbox size={36} className="mx-auto mb-3 text-[var(--vb-text-muted)]" />
          <p className="text-sm text-[var(--vb-text-secondary)]">
            {isArchived
              ? "No submissions were recorded before this worksheet was archived."
              : "No submissions yet. Share the QR or link above with your students."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {completed.map((a) => {
            const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
            const isOpen = expandedId === a.id;
            const practiceRounds = a.fingerprint
              ? practiceByFingerprint.get(a.fingerprint) ?? []
              : [];
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
                className="rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] overflow-hidden"
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
                    {practiceRounds.length > 0 && (
                      <p
                        style={{ color: 'var(--vb-accent)' }}
                        className="text-[10px] uppercase tracking-widest font-bold mt-1"
                      >
                        + {practiceRounds.length}{" "}
                        {practiceRounds.length === 1 ? "practice round" : "practice rounds"}
                      </p>
                    )}
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
                      <AttemptSummary
                        attempt={a}
                        onSendRetry={() => setRetryFor(a)}
                      />
                      {practiceRounds.length > 0 && (
                        <PracticeRounds firstAttempt={a} rounds={practiceRounds} />
                      )}
                      <AnswerBreakdown answers={a.answers} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {retryFor && (
        <ShareWorksheetDialog
          source={{
            topicName: buildRetryTitle(worksheet.topic_name, retryFor.student_name),
            wordIds: extractMisses(retryFor.answers as unknown as Answer[]).map(
              (m) => m.word_id,
            ),
          }}
          defaultLang={retryLang}
          parentSlug={worksheet.slug}
          onClose={() => setRetryFor(null)}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Attempt analytics — sits above the per-question list when a row is
// expanded. Two pieces:
//   1. Per-mode accuracy bars so the teacher can see *where* a student
//      struggled (e.g. nailed Matching but bombed Fill-in-the-blank),
//      not just the rolled-up percentage.
//   2. A one-tap CTA that opens ShareWorksheetDialog seeded with this
//      student's missed word IDs, so the teacher can send a focused
//      practice worksheet instead of re-sending the whole pool.
// ─────────────────────────────────────────────────────────────────────
const AttemptSummary: FC<{
  attempt: Attempt;
  onSendRetry: () => void;
}> = ({ attempt, onSendRetry }) => {
  const summary = useMemo(
    () => summarizeByMode(attempt.answers),
    [attempt.answers],
  );
  const wrongWordCount = useMemo(
    () => extractMisses(attempt.answers as unknown as Answer[]).length,
    [attempt.answers],
  );

  return (
    <div className="p-3 sm:p-4 space-y-3 bg-[var(--vb-surface-alt)]">
      {summary.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--vb-text-muted)]">
            By exercise
          </p>
          <div className="space-y-1.5">
            {summary.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
              const barColor =
                pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={row.kind} className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-[var(--vb-text-primary)] w-32 sm:w-40 truncate">
                    {MODE_LABEL[row.kind] ?? row.kind}
                  </span>
                  <div className="flex-1 h-2 bg-[var(--vb-border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tabular-nums font-bold text-[var(--vb-text-secondary)] w-16 text-right shrink-0">
                    {row.correct}/{row.total} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--vb-border)]">
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          <Target size={16} className="text-rose-500 shrink-0" />
          <span className="font-bold text-[var(--vb-text-primary)]">
            {wrongWordCount} {wrongWordCount === 1 ? "wrong word" : "wrong words"}
          </span>
        </div>
        <motion.button
          type="button"
          onClick={onSendRetry}
          disabled={wrongWordCount === 0}
          whileHover={wrongWordCount > 0 ? { scale: 1.02 } : undefined}
          whileTap={wrongWordCount > 0 ? { scale: 0.97 } : undefined}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            ...(wrongWordCount === 0
              ? { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-muted)' }
              : {}),
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors ${
            wrongWordCount === 0
              ? "cursor-not-allowed"
              : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
          }`}
        >
          <Send size={14} />
          Send retry worksheet
        </motion.button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Practice rounds — strip beneath the per-mode summary that shows the
// student's progression on follow-up worksheets the teacher minted from
// their missed words. Linked by browser fingerprint, oldest-first, so
// the teacher reads the storyline left-to-right: first attempt at the
// parent, then practice 1, then practice 2…
// ─────────────────────────────────────────────────────────────────────
const PracticeRounds: FC<{
  firstAttempt: Attempt;
  rounds: Attempt[];
}> = ({ firstAttempt, rounds }) => {
  const firstPct =
    firstAttempt.total > 0 ? Math.round((firstAttempt.score / firstAttempt.total) * 100) : 0;
  // The parent + every round laid out as a sequence so the rendered
  // chip strip reads as one timeline rather than "original score" +
  // separate "rounds" sections. Last round wins the "best so far" badge.
  const timeline = useMemo(
    () => [
      { label: "First attempt", pct: firstPct, score: firstAttempt.score, total: firstAttempt.total, isFirst: true },
      ...rounds.map((r, i) => ({
        label: `Practice ${i + 1}`,
        pct: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
        score: r.score,
        total: r.total,
        isFirst: false,
      })),
    ],
    [firstAttempt, firstPct, rounds],
  );
  const latest = timeline[timeline.length - 1];
  const delta = latest.pct - firstPct;

  return (
    <div
      style={{
        backgroundColor: 'var(--vb-accent-soft)',
        borderColor: 'color-mix(in srgb, var(--vb-accent), transparent 60%)',
      }}
      className="p-3 sm:p-4 border-t"
    >
      <div className="flex items-center gap-2 mb-2">
        <p
          style={{ color: 'var(--vb-accent)' }}
          className="text-[10px] uppercase tracking-widest font-bold"
        >
          Practice progression
        </p>
        {delta !== 0 && (
          <span
            style={
              delta > 0
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--vb-success), transparent 78%)',
                    color: 'var(--vb-success)',
                  }
                : {
                    backgroundColor: 'color-mix(in srgb, var(--vb-danger), transparent 78%)',
                    color: 'var(--vb-danger)',
                  }
            }
            className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full"
          >
            {delta > 0 ? "+" : ""}
            {delta} pts
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 pb-1">
        {timeline.map((step, i) => {
          // Score bands reuse the semantic soft tokens: pale on light,
          // deep desaturated on dark, with the saturated token for text.
          const semantic =
            step.pct >= 80 ? "success" : step.pct >= 60 ? "warning" : "danger";
          const chipStyle = {
            backgroundColor: `var(--vb-${semantic}-soft)`,
            borderColor: `color-mix(in srgb, var(--vb-${semantic}), transparent 60%)`,
            color: `var(--vb-${semantic})`,
          };
          return (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div
                style={chipStyle}
                className="min-w-[88px] rounded-lg border px-2.5 py-1.5 text-center"
              >
                <p className="text-[9px] uppercase tracking-widest font-bold opacity-80">
                  {step.label}
                </p>
                <p className="text-base font-black tabular-nums leading-tight">
                  {step.pct}%
                </p>
                <p className="text-[10px] font-bold tabular-nums opacity-80">
                  {step.score}/{step.total}
                </p>
              </div>
              {i < timeline.length - 1 && (
                <ChevronRight
                  size={14}
                  style={{ color: 'var(--vb-accent)' }}
                  className="shrink-0"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Friendly labels for the mode bars. Keys mirror Answer.kind values so
// lookup is direct; an unknown kind falls back to its raw key, which
// keeps the dashboard from going blank if a new exercise type ships
// before this map is updated.
const MODE_LABEL: Record<string, string> = {
  quiz: "Multiple choice",
  matching: "Matching",
  letter_scramble: "Letter scramble",
  listening_dictation: "Listening",
  fill_blank: "Fill in the blank",
  definition_match: "Definition match",
  cloze: "Cloze",
  sentence_building: "Sentence building",
  translation_typing: "Translation typing",
  word_in_context: "Word in context",
  true_false: "True / False",
};

// Per-row correctness — quiz/typing/etc use is_correct; matching's
// signal is mistakes_count===0 (every pair is eventually solved);
// letter_scramble counts a first-try solve as correct so partial
// brute-forcing isn't rewarded the same as a confident answer.
const isAnswerCorrect = (a: AnswerRow): boolean => {
  if (a.kind === "matching") {
    return (a as MatchingAnswer).mistakes_count === 0;
  }
  if (a.kind === "letter_scramble") {
    const g = a as GenericAnswer;
    return g.solved === true && (g.attempts ?? 1) === 1;
  }
  return (a as GenericAnswer).is_correct === true;
};

const summarizeByMode = (
  answers: AnswerRow[],
): Array<{ kind: string; correct: number; total: number }> => {
  const map = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = map.get(a.kind) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (isAnswerCorrect(a)) entry.correct += 1;
    map.set(a.kind, entry);
  }
  // Stable order: lowest accuracy first so the weakest mode lands at
  // the top where the teacher's eye lands first. Ties broken by name.
  return Array.from(map.entries())
    .map(([kind, v]) => ({ kind, ...v }))
    .sort((a, b) => {
      const aPct = a.total > 0 ? a.correct / a.total : 0;
      const bPct = b.total > 0 ? b.correct / b.total : 0;
      if (aPct !== bPct) return aPct - bPct;
      return a.kind.localeCompare(b.kind);
    });
};

// Title for the retry worksheet. Trimmed so the topic chip and the
// student tag still fit without wrapping in the share dialog header.
const buildRetryTitle = (topic: string, student: string): string => {
  const shortTopic = topic.length > 28 ? `${topic.slice(0, 27)}…` : topic;
  const shortStudent = student.length > 18 ? `${student.slice(0, 17)}…` : student;
  return `Retry: ${shortTopic} — ${shortStudent}`;
};

// ─────────────────────────────────────────────────────────────────────
// Per-question detail — format-aware because matching emits
// mistakes_count and quiz emits given/correct.
// ─────────────────────────────────────────────────────────────────────
const AnswerBreakdown: FC<{ answers: AnswerRow[] }> = ({ answers }) => {
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
              style={{
                backgroundColor: a.is_correct ? 'var(--vb-success-soft)' : 'var(--vb-danger-soft)',
                borderColor: a.is_correct ? 'var(--vb-success)' : 'var(--vb-danger)',
              }}
              className="flex items-center gap-3 p-3 rounded-lg text-sm border"
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
                      Picked: <span className="font-bold" style={{ color: 'var(--vb-danger)' }}>{a.given}</span> ·
                      Correct: <span className="font-bold" style={{ color: 'var(--vb-success)' }}>{a.correct}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        }
        if (ans.kind === "matching") {
          const a = ans as MatchingAnswer;
          const matchBg =
            a.mistakes_count === 0
              ? { bg: 'var(--vb-success-soft)', border: 'var(--vb-success)' }
              : a.mistakes_count <= 2
                ? { bg: 'var(--vb-warning-soft)', border: 'var(--vb-warning)' }
                : { bg: 'var(--vb-danger-soft)', border: 'var(--vb-danger)' };
          return (
            <div
              key={idx}
              style={{ backgroundColor: matchBg.bg, borderColor: matchBg.border }}
              className="flex items-center gap-3 p-3 rounded-lg text-sm border"
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
const GenericAnswerRow: FC<{ answer: GenericAnswer }> = ({ answer }) => {
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
      ? "bg-emerald-500/10 border-emerald-500/30"
      : correct === false
        ? "bg-rose-500/10 border-rose-500/30"
        : "";

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${bg}`}
      style={correct === null || correct === undefined
        ? { backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }
        : undefined}
    >
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

const ErrorCard: FC<{ message: string }> = ({ message }) => (
  <div
    style={{ backgroundColor: 'var(--vb-danger-soft)', borderColor: 'var(--vb-danger)' }}
    className="text-center max-w-md mx-auto p-8 rounded-2xl border"
  >
    <p className="font-bold mb-1" style={{ color: 'var(--vb-danger)' }}>Couldn't load worksheet results</p>
    <p className="text-sm" style={{ color: 'var(--vb-danger)' }}>{message}</p>
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
