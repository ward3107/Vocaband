/**
 * InteractiveWorksheetView — the public solver mounted at `/w/:slug`.
 *
 * Fetches the worksheet row, gates the student behind a name-entry
 * card, hands off to WorksheetRunner to play through the exercises,
 * and submits the aggregated result once everything is done.  The
 * runner owns all per-exercise UI; this view owns load/submit/results.
 */
import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import WorksheetRunner from "../worksheet/WorksheetRunner";
import { EXERCISE_REGISTRY } from "../worksheet/exercises/registry";
import type {
  Answer,
  Exercise,
  ExerciseResult,
  Language,
  WorksheetSettings,
} from "../worksheet/types";
import { computeWorksheetScore, extractMisses } from "../worksheet/types";

// Phase-1 worksheets stored a single `format` whose values ("fillblank",
// "listening") differ from the Phase-2 registry keys ("fill_blank",
// "listening_dictation"). The backfill migration copied `format` verbatim
// into exercises[].type, so legacy rows carry a type the registry doesn't
// know — which would render <undefined/> and white-screen the student.
// Remap those aliases to the canonical keys so legacy worksheets play.
const LEGACY_TYPE_ALIASES: Record<string, string> = {
  fillblank: "fill_blank",
  listening: "listening_dictation",
};

const canonicalizeExercise = (ex: Exercise): Exercise => {
  const alias = ex && typeof ex.type === "string" ? LEGACY_TYPE_ALIASES[ex.type] : undefined;
  return alias ? ({ ...ex, type: alias } as Exercise) : ex;
};

interface WorksheetRow {
  slug: string;
  topic_name: string;
  exercises: Exercise[];
  // Kept for the rare legacy row that didn't get backfilled by the
  // 20260609 migration — we synthesise an exercises array from it.
  format: string | null;
  word_ids: number[] | null;
  settings: WorksheetSettings & Record<string, unknown>;
  // Set when this worksheet is a practice worksheet a teacher sent the
  // student after they got some words wrong on another sheet. The
  // student's results screen fetches the parent attempt (matched on
  // browser fingerprint) so the kid sees their improvement.
  parent_slug: string | null;
}

interface ParentAttempt {
  topic_name: string;
  score: number;
  total: number;
}

type Stage = "name-entry" | "in-progress" | "submitting" | "done" | "submit-error";

// Per-browser fingerprint reused across every worksheet so a student
// who solves two different worksheets shows up as the same person to
// the teacher (when they type the same name).
const FINGERPRINT_KEY = "vocaband:worksheet:fingerprint";

// Mirrors the server-side check in submit_worksheet_attempt() so the
// student sees an inline error before round-tripping. Trimmed length
// 1..40, must contain at least one letter (any script), no C0 control
// chars. Keep the regex in sync with the migration.
const MAX_NAME_LEN = 40;
const HAS_LETTER = /\p{L}/u;
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

const sanitiseStudentName = (raw: string): string =>
  raw.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();

const validateStudentName = (
  raw: string,
): { ok: true; clean: string } | { ok: false; reason: "empty" | "long" | "no-letter" } => {
  const clean = sanitiseStudentName(raw);
  if (clean.length === 0) return { ok: false, reason: "empty" };
  if (clean.length > MAX_NAME_LEN) return { ok: false, reason: "long" };
  if (!HAS_LETTER.test(clean)) return { ok: false, reason: "no-letter" };
  return { ok: true, clean };
};

const getOrCreateFingerprint = (): string | null => {
  try {
    let fp = localStorage.getItem(FINGERPRINT_KEY);
    if (!fp) {
      fp =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `fp-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(FINGERPRINT_KEY, fp);
    }
    return fp;
  } catch {
    return null;
  }
};

// Cached student name, scoped per slug so a shared family device
// doesn't autofill one kid's name on another's worksheet.
const nameKey = (slug: string) => `vocaband:worksheet:${slug}:name`;

// In-progress save so a student who closes the tab mid-worksheet can
// pick up where they left off.  Saved after every completed exercise
// (not every keystroke — losing the in-flight exercise on a crash is
// acceptable, losing 4 of 5 completed exercises is not).
const progressKey = (slug: string) => `vocaband:worksheet:${slug}:progress`;

interface SavedProgress {
  studentName: string;
  startedAt: number;
  // The next index to play — results.length should equal exerciseIdx
  // when saved.  Stored explicitly anyway for robustness if the
  // schema evolves.
  exerciseIdx: number;
  results: ExerciseResult[];
}

const loadProgress = (slug: string): SavedProgress | null => {
  try {
    const raw = localStorage.getItem(progressKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (
      !parsed.studentName ||
      typeof parsed.exerciseIdx !== "number" ||
      !Array.isArray(parsed.results)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveProgress = (slug: string, state: SavedProgress) => {
  try {
    localStorage.setItem(progressKey(slug), JSON.stringify(state));
  } catch {
    /* storage blocked / quota — non-fatal */
  }
};

const clearProgress = (slug: string) => {
  try {
    localStorage.removeItem(progressKey(slug));
  } catch {
    /* non-fatal */
  }
};

// Best-effort lookup of the student's earlier attempt on the parent
// worksheet for the same browser. Backed by a SECURITY DEFINER RPC
// because RLS on worksheet_attempts only opens reads to the worksheet
// owner — the student needs a narrow path to their own row. Failures
// resolve to null so the results card just hides the comparison
// instead of breaking the submit-success screen.
const fetchParentAttempt = async (
  parentSlug: string,
  fingerprint: string,
): Promise<ParentAttempt | null> => {
  try {
    const { data, error } = await supabase.rpc("get_my_attempt_for_slug", {
      p_slug: parentSlug,
      p_fingerprint: fingerprint,
    });
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      topic_name: String(row.topic_name ?? ""),
      score: Number(row.score ?? 0),
      total: Number(row.total ?? 0),
    };
  } catch {
    return null;
  }
};

interface Props {
  slug: string;
  onBack: () => void;
}

export default function InteractiveWorksheetView({ slug, onBack }: Props) {
  const { language: iwvLang, isRTL } = useLanguage();
  const [row, setRow] = useState<WorksheetRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("name-entry");
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem(nameKey(slug)) ?? "";
    } catch {
      return "";
    }
  });
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(() =>
    loadProgress(slug),
  );
  // Resume-fed start index for the runner.  Only honoured on the
  // first mount (the runner reads it via initialIdx) — clearing it
  // afterwards has no effect on already-mounted runners.
  const [resumeIdx, setResumeIdx] = useState(0);
  // Set after a practice worksheet is submitted and the parent's
  // attempt for this same browser is found — drives the "first attempt
  // → now" comparison on the results card. Null on parent worksheets
  // and on practice worksheets where the student played the parent on
  // a different device (no fingerprint match).
  const [parentAttempt, setParentAttempt] = useState<ParentAttempt | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("interactive_worksheets")
        .select("slug, topic_name, word_ids, format, exercises, settings, parent_slug")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoadError("This worksheet link is invalid or has expired.");
        return;
      }
      setRow(data as WorksheetRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Prefer the new `exercises` array; fall back to synthesising it from
  // the legacy single-format columns so any row that escaped the
  // backfill (or any client that mints with the old RPC) still plays.
  const exercises: Exercise[] = useMemo(() => {
    if (!row) return [];
    if (Array.isArray(row.exercises) && row.exercises.length > 0) {
      // Map any legacy type alias to its canonical registry key, then
      // drop types that have since been retired (e.g. synonym_antonym)
      // so a worksheet saved before the rename/removal doesn't crash the
      // runner on a now-missing registry entry. Empty after filtering →
      // fall through to the legacy single-format path below.
      const playable = (row.exercises as Exercise[])
        .map(canonicalizeExercise)
        .filter((ex) => ex && ex.type in EXERCISE_REGISTRY);
      if (playable.length > 0) return playable;
    }
    if (row.format && Array.isArray(row.word_ids) && row.word_ids.length > 0) {
      return [canonicalizeExercise({ type: row.format, word_ids: row.word_ids } as Exercise)];
    }
    return [];
  }, [row]);

  const targetLang: Language = (row?.settings?.language as Language) ?? "he";

  const handleStart = (name: string) => {
    const v = validateStudentName(name);
    if (!v.ok) return;
    setStudentName(v.clean);
    try {
      localStorage.setItem(nameKey(slug), v.clean);
    } catch {
      /* storage blocked — non-fatal */
    }
    // Starting fresh — discard any prior in-progress run.
    clearProgress(slug);
    setResults([]);
    setResumeIdx(0);
    setSavedProgress(null);
    setStartedAt(Date.now());
    setStage("in-progress");
  };

  const handleProgress = (currentResults: ExerciseResult[]) => {
    setResults(currentResults);
    if (currentResults.length < exercises.length) {
      saveProgress(slug, {
        studentName,
        startedAt: startedAt ?? Date.now(),
        exerciseIdx: currentResults.length,
        results: currentResults,
      });
    }
  };

  const submitResults = async (allResults: ExerciseResult[]) => {
    setResults(allResults);
    setStage("submitting");
    setSubmitError(null);

    // Persist the finished state to localStorage BEFORE hitting the
    // server. If the RPC fails, the tab is closed mid-flight, or the
    // network drops, the student can reopen the link and resend
    // without redoing the final exercise. We only clear after a
    // confirmed successful submit below.
    const startTs = startedAt ?? Date.now();
    saveProgress(slug, {
      studentName,
      startedAt: startTs,
      exerciseIdx: exercises.length,
      results: allResults,
    });

    const aggregateAnswers: Answer[] = allResults.flatMap((r) => r.answers);
    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = allResults.reduce((sum, r) => sum + r.total, 0);
    const duration_ms = Date.now() - startTs;
    const fingerprint = getOrCreateFingerprint();

    try {
      const { error } = await supabase.rpc("submit_worksheet_attempt", {
        p_slug: slug,
        p_student_name: studentName,
        p_answers: aggregateAnswers,
        p_score: totalScore,
        p_total: totalQuestions,
        p_duration_ms: duration_ms,
        p_fingerprint: fingerprint,
      });
      if (error) {
        setSubmitError(error.message);
        setStage("submit-error");
        return;
      }
      // Successfully submitted — clear the in-progress save so a
      // refresh of the results screen doesn't offer to "resume"
      // a finished worksheet.
      clearProgress(slug);

      // Practice worksheet? Try to surface the student's first-attempt
      // score on the parent for the same browser so they see the
      // improvement. Best-effort: anonymous reads can hit the parent
      // row (RLS allows anyone with the slug) and the same RLS lets the
      // student's own attempt row through via fingerprint match.
      if (row?.parent_slug && fingerprint) {
        void fetchParentAttempt(row.parent_slug, fingerprint).then((p) => {
          if (p) setParentAttempt(p);
        });
      }

      setStage("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Network error");
      setStage("submit-error");
    }
  };

  const handleFinish = (allResults: ExerciseResult[]) => {
    void submitResults(allResults);
  };

  const handleResume = () => {
    if (!savedProgress) return;
    setStudentName(savedProgress.studentName);
    setResults(savedProgress.results);
    setStartedAt(savedProgress.startedAt);
    // exerciseIdx === exercises.length means the student finished the
    // worksheet but the submit failed (or the tab was closed before it
    // returned). Skip the runner and retry the RPC straight away.
    if (
      savedProgress.exerciseIdx >= exercises.length &&
      savedProgress.results.length >= exercises.length
    ) {
      void submitResults(savedProgress.results);
      return;
    }
    setResumeIdx(savedProgress.exerciseIdx);
    setStage("in-progress");
  };

  const handleRestart = () => {
    clearProgress(slug);
    setResults([]);
    setResumeIdx(0);
    setSavedProgress(null);
    setSubmitError(null);
    setParentAttempt(null);
    setStartedAt(Date.now());
    setStage("in-progress");
  };

  if (loadError) {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <div className="text-center max-w-md mx-auto p-8 rounded-2xl bg-white/10 border border-white/15 text-white">
          <XCircle size={40} className="mx-auto mb-4 text-rose-300" />
          <p className="font-bold text-lg mb-2">Worksheet not found</p>
          <p className="text-white/70 text-sm">{loadError}</p>
        </div>
      </Shell>
    );
  }

  if (!row) {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <div className="flex items-center justify-center gap-3 text-white">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-semibold">Loading worksheet…</span>
        </div>
      </Shell>
    );
  }

  if (stage === "name-entry") {
    // Two valid resume states:
    //   * mid-worksheet: 0 < exerciseIdx < exercises.length — replay the
    //     remaining exercises.
    //   * finished but unsent: exerciseIdx === exercises.length — last
    //     submit failed or the tab was closed mid-RPC; just resend.
    const canResume =
      savedProgress !== null &&
      savedProgress.exerciseIdx > 0 &&
      savedProgress.exerciseIdx <= exercises.length;
    const pendingResubmit =
      savedProgress !== null && savedProgress.exerciseIdx >= exercises.length;
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <NameEntryCard
          topicName={row.topic_name}
          exerciseCount={exercises.length}
          firstType={exercises[0]?.type ?? "matching"}
          initialName={studentName}
          onStart={handleStart}
          resume={
            canResume
              ? {
                  studentName: savedProgress.studentName,
                  exerciseIdx: savedProgress.exerciseIdx,
                  total: exercises.length,
                  pendingResubmit,
                  onResume: handleResume,
                }
              : null
          }
        />
      </Shell>
    );
  }

  if (stage === "submitting") {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-2xl text-center max-w-md mx-auto">
          <Loader2 size={40} className="mx-auto mb-4 animate-spin text-violet-500" />
          <p className="text-stone-700 font-bold text-lg">Submitting your answers…</p>
          <p className="text-stone-500 text-sm mt-1">Your teacher will see this in a moment.</p>
        </div>
      </Shell>
    );
  }

  if (stage === "done" || stage === "submit-error") {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <ResultsCard
          exercises={exercises}
          results={results}
          topicName={row.topic_name}
          slug={row.slug}
          studentName={studentName}
          submitError={stage === "submit-error" ? submitError : null}
          parentAttempt={parentAttempt}
          onRestart={handleRestart}
          onRetrySubmit={() => submitResults(results)}
        />
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest font-bold text-violet-300/80">
          {exercises.length === 1 ? formatLabel(exercises[0].type) : `${exercises.length} exercises`}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{row.topic_name}</h1>
        <p className="text-white/60 text-sm mt-1">
          Playing as <span className="font-bold text-white">{studentName}</span>
        </p>
      </div>
      <WorksheetRunner
        exercises={exercises}
        targetLang={targetLang}
        onFinish={handleFinish}
        initialIdx={resumeIdx}
        initialResults={results}
        onProgress={handleProgress}
        aiSentences={row.settings?.sentences}
        customWords={row.settings?.customWords}
      />
    </Shell>
  );
}

const FORMAT_LABEL: Record<string, string> = {
  matching: "Matching exercise",
  quiz: "Multiple-choice quiz",
  letter_scramble: "Letter scramble",
  listening_dictation: "Listening dictation",
  fill_blank: "Fill in the blank",
  definition_match: "Definition match",
  cloze: "Cloze paragraph",
  sentence_building: "Sentence building",
  translation_typing: "Translation typing",
  word_in_context: "Word in context",
  true_false: "True or false",
};

const formatLabel = (type: string) => FORMAT_LABEL[type] ?? "Worksheet";

const NameEntryCard: FC<{
  topicName: string;
  exerciseCount: number;
  firstType: string;
  initialName: string;
  onStart: (name: string) => void;
  resume: {
    studentName: string;
    exerciseIdx: number;
    total: number;
    // True when the worksheet was finished but the submit failed —
    // clicking Resume retries the RPC instead of replaying exercises.
    pendingResubmit: boolean;
    onResume: () => void;
  } | null;
}> = ({ topicName, exerciseCount, firstType, initialName, onStart, resume }) => {
  const { language: iwvLang } = useLanguage();
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const validation = validateStudentName(name);
  const showError = touched && !validation.ok;
  const errorMessage = !validation.ok
    ? validation.reason === "long"
      ? iwvLang === "he"
        ? `שם ארוך מדי (עד ${MAX_NAME_LEN} תווים)`
        : iwvLang === "ar"
          ? `الاسم طويل جداً (حتى ${MAX_NAME_LEN} حرفاً)`
          : `Name too long (max ${MAX_NAME_LEN} characters)`
      : validation.reason === "no-letter"
        ? iwvLang === "he"
          ? "השם חייב לכלול לפחות אות אחת"
          : iwvLang === "ar"
            ? "يجب أن يحتوي الاسم على حرف واحد على الأقل"
            : "Please use a real name (at least one letter)"
        : iwvLang === "he"
          ? "אנא הקלידו את שמכם"
          : iwvLang === "ar"
            ? "الرجاء كتابة اسمك"
            : "Please type your name"
    : "";
  const subtitle =
    exerciseCount === 1
      ? formatLabel(firstType)
      : `${exerciseCount} exercises`;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md mx-auto">
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-6 text-center text-white">
        <p className="text-xs uppercase tracking-widest font-bold opacity-90">{subtitle}</p>
        <h1 className="text-2xl sm:text-3xl font-black mt-1">{topicName}</h1>
      </div>
      <div className="p-6 sm:p-8">
        {resume && (
          <div className="mb-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-widest font-bold text-emerald-700 mb-1">
              {resume.pendingResubmit
                ? iwvLang === "he"
                  ? "התשובות שלך מוכנות לשליחה"
                  : iwvLang === "ar"
                    ? "إجاباتك جاهزة للإرسال"
                    : "Your answers are ready to send"
                : iwvLang === "he"
                  ? "המשך מאיפה שעצרת"
                  : iwvLang === "ar"
                    ? "تابع من حيث توقفت"
                    : "Continue where you left off"}
            </p>
            <p className="text-sm text-emerald-900 mb-3">
              <span className="font-bold">{resume.studentName}</span>
              {resume.pendingResubmit
                ? iwvLang === "he"
                  ? " · השליחה האחרונה לא הצליחה"
                  : iwvLang === "ar"
                    ? " · لم يصل الإرسال السابق"
                    : " · last submit didn't reach the teacher"
                : ` · exercise ${resume.exerciseIdx + 1} of ${resume.total}`}
            </p>
            <button
              type="button"
              onClick={resume.onResume}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {resume.pendingResubmit
                ? iwvLang === "he"
                  ? "שלח למורה"
                  : iwvLang === "ar"
                    ? "أرسل إلى المعلم"
                    : "Send to teacher"
                : iwvLang === "he"
                  ? "המשך"
                  : iwvLang === "ar"
                    ? "تابع"
                    : "Resume"}
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (validation.ok) onStart(validation.clean);
          }}
        >
          <label htmlFor="student-name" className="block text-sm font-bold text-stone-700 mb-2">
            {resume ? "Or start over — what's your name?" : "What's your name?"}
          </label>
          <input
            id="student-name"
            type="text"
            autoFocus={!resume}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={iwvLang === 'he' ? 'הקלידו את שמכם' : iwvLang === 'ar' ? 'اكتب اسمك' : 'Type your name'}
            maxLength={MAX_NAME_LEN}
            aria-invalid={showError}
            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none font-bold text-stone-900 text-lg ${
              showError
                ? "border-rose-400 focus:border-rose-500"
                : "border-stone-200 focus:border-violet-500"
            }`}
          />
          {showError ? (
            <p className="text-xs text-rose-600 mt-2 font-bold">{errorMessage}</p>
          ) : (
            <p className="text-xs text-stone-500 mt-2">
              Your teacher will see your name and your score.
            </p>
          )}
          <button
            type="submit"
            disabled={!validation.ok}
            className="mt-6 w-full py-3 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all flex items-center justify-center gap-2"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {resume ? "Start over" : "Start worksheet"}
          </button>
        </form>
      </div>
    </div>
  );
};

const Shell: FC<{ children: ReactNode; onBack: () => void; isRTL: boolean; language: Language }> = ({
  children,
  onBack,
  isRTL,
  language,
}) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-4 py-6 sm:py-10">
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all mb-6"
      >
        <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
        <span>{language === 'he' ? 'חזרה' : language === 'ar' ? 'رجوع' : 'Back'}</span>
      </button>
      {children}
    </div>
  </div>
);

const ResultsCard: FC<{
  exercises: Exercise[];
  results: ExerciseResult[];
  topicName: string;
  slug: string;
  studentName: string;
  submitError: string | null;
  parentAttempt: ParentAttempt | null;
  onRestart: () => void;
  onRetrySubmit: () => void;
}> = ({ exercises, results, topicName, slug, studentName, submitError, parentAttempt, onRestart, onRetrySubmit }) => {
  const { language: iwvLang } = useLanguage();
  const score = computeWorksheetScore(exercises, results);
  const allAnswers = results.flatMap((r) => r.answers);
  const misses = extractMisses(allAnswers);
  const tier =
    score.outOf100 >= 90
      ? "gold"
      : score.outOf100 >= 75
        ? "silver"
        : score.outOf100 >= 50
          ? "bronze"
          : "try-again";

  const tierColor: Record<typeof tier, string> = {
    gold: "from-amber-400 to-orange-500",
    silver: "from-slate-300 to-slate-500",
    bronze: "from-amber-600 to-rose-600",
    "try-again": "from-stone-400 to-stone-600",
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-2xl text-center">
      <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500" />
      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
        Worksheet complete
      </p>
      <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-1">{topicName}</h2>
      <p className="text-stone-500 mb-6">
        Nice work, <span className="font-bold text-stone-700">{studentName}</span>!
      </p>

      <div
        className={`inline-flex items-baseline gap-1 mb-2 bg-gradient-to-r ${tierColor[tier]} bg-clip-text text-transparent`}
      >
        <span className="text-6xl sm:text-7xl font-black">{score.outOf100}</span>
        <span className="text-3xl sm:text-4xl font-bold">/ 100</span>
      </div>
      <div className="text-sm font-bold text-stone-500 mb-6">
        {score.totalCorrect} / {score.totalQuestions} correct
      </div>

      {parentAttempt && parentAttempt.total > 0 && (
        <ProgressFromParent
          parent={parentAttempt}
          nowScore={score.totalCorrect}
          nowTotal={score.totalQuestions}
        />
      )}

      {score.perExercise.length > 1 && (
        <div className="text-start max-w-sm mx-auto rounded-xl border border-stone-200 bg-stone-50 p-4 mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
            Section breakdown
          </p>
          <ul className="space-y-2">
            {score.perExercise.map((row, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-bold text-stone-700">{formatLabel(row.type)}</span>
                <span className="font-mono text-stone-500">
                  {row.score}/{row.total}
                  <span className="ms-2 text-emerald-600 font-bold">{row.percent}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {misses.length > 0 && (
        <details className="text-start max-w-sm mx-auto rounded-xl border border-rose-200 bg-rose-50 p-4 mb-6">
          <summary className="text-xs uppercase tracking-widest font-bold text-rose-700 cursor-pointer">
            Words to study ({misses.length})
          </summary>
          <ul className="space-y-1.5 mt-3">
            {misses.slice(0, 10).map((m) => (
              <li key={m.word_id} className="flex items-start justify-between gap-2 text-sm">
                <span className="font-bold text-stone-800 truncate" dir="ltr">
                  {m.english}
                </span>
                <span className="text-stone-600 text-end shrink-0 max-w-[50%]" dir="auto">
                  {m.translation}
                  {m.note && (
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-rose-500">
                      {m.note}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {misses.length > 10 && (
              <li className="text-xs italic text-stone-500 pt-1 border-t border-rose-200">
                …and {misses.length - 10} more
              </li>
            )}
          </ul>
        </details>
      )}

      {submitError ? (
        <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm text-start">
          <p className="font-bold mb-1">
            {iwvLang === "he"
              ? "השליחה למורה לא הצליחה"
              : iwvLang === "ar"
                ? "تعذّر إرسال النتيجة إلى المعلم"
                : "Couldn't reach your teacher's dashboard"}
          </p>
          <p className="text-amber-800/80 text-xs mb-3">
            {iwvLang === "he"
              ? "התשובות שלך נשמרו במכשיר — נסה לשלוח שוב."
              : iwvLang === "ar"
                ? "إجاباتك محفوظة على الجهاز — حاول الإرسال مرة أخرى."
                : "Your answers are saved on this device — try sending again."}
          </p>
          <button
            type="button"
            onClick={onRetrySubmit}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {iwvLang === "he"
              ? "שלח למורה שוב"
              : iwvLang === "ar"
                ? "أرسل إلى المعلم مرة أخرى"
                : "Send to teacher again"}
          </button>
        </div>
      ) : (
        <p className="text-xs font-bold text-emerald-600 mb-6">✓ Sent to your teacher</p>
      )}

      <div className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-6">
        Code: {slug}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-bold transition-all"
      >
        <RotateCcw size={16} />
        Try again
      </button>
    </div>
  );
};

// Side-by-side "first attempt → now" pill, shown only on practice
// worksheets when we found a matching parent attempt for this browser.
// Same fuchsia palette as the teacher dashboard's practice strip so the
// student and teacher views are visually linked.
const ProgressFromParent: FC<{
  parent: ParentAttempt;
  nowScore: number;
  nowTotal: number;
}> = ({ parent, nowScore, nowTotal }) => {
  const parentPct = Math.round((parent.score / parent.total) * 100);
  const nowPct = nowTotal > 0 ? Math.round((nowScore / nowTotal) * 100) : 0;
  const delta = nowPct - parentPct;
  return (
    <div className="max-w-sm mx-auto rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 mb-6">
      <p className="text-xs uppercase tracking-widest font-bold text-fuchsia-700 mb-3 text-center">
        Your progress
      </p>
      <div className="flex items-center justify-center gap-2">
        <div className="text-center min-w-[80px] rounded-lg bg-white border border-fuchsia-200 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
            First time
          </p>
          <p className="text-xl font-black tabular-nums text-stone-700">{parentPct}%</p>
          <p className="text-[10px] font-bold tabular-nums text-stone-500">
            {parent.score}/{parent.total}
          </p>
        </div>
        <span className="text-fuchsia-400 text-lg font-black">→</span>
        <div className="text-center min-w-[80px] rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700">
            Now
          </p>
          <p className="text-xl font-black tabular-nums text-emerald-700">{nowPct}%</p>
          <p className="text-[10px] font-bold tabular-nums text-emerald-600">
            {nowScore}/{nowTotal}
          </p>
        </div>
      </div>
      {delta !== 0 && (
        <p
          className={`text-center text-xs font-black mt-3 ${
            delta > 0 ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {delta > 0 ? `+${delta} points stronger` : `${delta} points`}
        </p>
      )}
    </div>
  );
};
