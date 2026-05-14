/**
 * InteractiveWorksheetView — the public solver mounted at `/w/:slug`.
 *
 * Fetches the worksheet row, gates the student behind a name-entry
 * card, hands off to WorksheetRunner to play through the exercises,
 * and submits the aggregated result once everything is done.  The
 * runner owns all per-exercise UI; this view owns load/submit/results.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import WorksheetRunner from "../worksheet/WorksheetRunner";
import type {
  Answer,
  Exercise,
  ExerciseResult,
  Language,
  WorksheetSettings,
} from "../worksheet/types";
import { computeWorksheetScore } from "../worksheet/types";

interface WorksheetRow {
  slug: string;
  topic_name: string;
  exercises: Exercise[];
  // Kept for the rare legacy row that didn't get backfilled by the
  // 20260609 migration — we synthesise an exercises array from it.
  format: string | null;
  word_ids: number[] | null;
  settings: WorksheetSettings & Record<string, unknown>;
}

type Stage = "name-entry" | "in-progress" | "submitting" | "done" | "submit-error";

// Per-browser fingerprint reused across every worksheet so a student
// who solves two different worksheets shows up as the same person to
// the teacher (when they type the same name).
const FINGERPRINT_KEY = "vocaband:worksheet:fingerprint";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("interactive_worksheets")
        .select("slug, topic_name, word_ids, format, exercises, settings")
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
    if (Array.isArray(row.exercises) && row.exercises.length > 0) return row.exercises;
    if (row.format && Array.isArray(row.word_ids) && row.word_ids.length > 0) {
      return [{ type: row.format as Exercise["type"], word_ids: row.word_ids }];
    }
    return [];
  }, [row]);

  const targetLang: Language = (row?.settings?.language as Language) ?? "he";

  const handleStart = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStudentName(trimmed);
    try {
      localStorage.setItem(nameKey(slug), trimmed);
    } catch {
      /* storage blocked — non-fatal */
    }
    setStartedAt(Date.now());
    setStage("in-progress");
  };

  const handleFinish = async (allResults: ExerciseResult[]) => {
    setResults(allResults);
    setStage("submitting");
    setSubmitError(null);

    const aggregateAnswers: Answer[] = allResults.flatMap((r) => r.answers);
    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = allResults.reduce((sum, r) => sum + r.total, 0);
    const duration_ms = startedAt ? Date.now() - startedAt : null;
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
      setStage("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Network error");
      setStage("submit-error");
    }
  };

  const handleRestart = () => {
    setResults([]);
    setSubmitError(null);
    setStartedAt(Date.now());
    setStage("in-progress");
  };

  if (loadError) {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <div className="text-center max-w-md mx-auto p-8 rounded-3xl bg-white/10 border border-white/15 text-white">
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
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <NameEntryCard
          topicName={row.topic_name}
          exerciseCount={exercises.length}
          firstType={exercises[0]?.type ?? "matching"}
          initialName={studentName}
          onStart={handleStart}
        />
      </Shell>
    );
  }

  if (stage === "submitting") {
    return (
      <Shell onBack={onBack} isRTL={isRTL} language={iwvLang}>
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl text-center max-w-md mx-auto">
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
          onRestart={handleRestart}
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
  synonym_antonym: "Synonyms & antonyms",
  cloze: "Cloze paragraph",
  sentence_building: "Sentence building",
  translation_typing: "Translation typing",
  word_in_context: "Word in context",
  true_false: "True or false",
};

const formatLabel = (type: string) => FORMAT_LABEL[type] ?? "Worksheet";

const NameEntryCard: React.FC<{
  topicName: string;
  exerciseCount: number;
  firstType: string;
  initialName: string;
  onStart: (name: string) => void;
}> = ({ topicName, exerciseCount, firstType, initialName, onStart }) => {
  const { language: iwvLang } = useLanguage();
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const subtitle =
    exerciseCount === 1
      ? formatLabel(firstType)
      : `${exerciseCount} exercises`;

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto">
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-6 text-center text-white">
        <p className="text-xs uppercase tracking-widest font-bold opacity-90">{subtitle}</p>
        <h1 className="text-2xl sm:text-3xl font-black mt-1">{topicName}</h1>
      </div>
      <form
        className="p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onStart(trimmed);
        }}
      >
        <label htmlFor="student-name" className="block text-sm font-bold text-stone-700 mb-2">
          What's your name?
        </label>
        <input
          id="student-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={iwvLang === 'he' ? 'הקלידו את שמכם' : iwvLang === 'ar' ? 'اكتب اسمك' : 'Type your name'}
          maxLength={60}
          className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-violet-500 focus:outline-none font-bold text-stone-900 text-lg"
        />
        <p className="text-xs text-stone-500 mt-2">
          Your teacher will see your name and your score.
        </p>
        <button
          type="submit"
          disabled={!trimmed}
          className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all flex items-center justify-center gap-2"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          Start worksheet
        </button>
      </form>
    </div>
  );
};

const Shell: React.FC<{ children: React.ReactNode; onBack: () => void; isRTL: boolean; language: "en" | "he" | "ar" }> = ({
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

const ResultsCard: React.FC<{
  exercises: Exercise[];
  results: ExerciseResult[];
  topicName: string;
  slug: string;
  studentName: string;
  submitError: string | null;
  onRestart: () => void;
}> = ({ exercises, results, topicName, slug, studentName, submitError, onRestart }) => {
  const score = computeWorksheetScore(exercises, results);
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
    <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
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

      {score.perExercise.length > 1 && (
        <div className="text-start max-w-sm mx-auto rounded-2xl border border-stone-200 bg-stone-50 p-4 mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
            Section breakdown
          </p>
          <ul className="space-y-2">
            {score.perExercise.map((row, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-bold text-stone-700">{formatLabel(row.type)}</span>
                <span className="font-mono text-stone-500">
                  {row.score}/{row.total}
                  <span className="ml-2 text-emerald-600 font-bold">{row.percent}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitError ? (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm text-left">
          <p className="font-bold mb-1">Couldn't reach your teacher's dashboard</p>
          <p className="text-amber-800/80 text-xs">
            Your score is shown above — show this screen to your teacher.
          </p>
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
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold transition-all"
      >
        <RotateCcw size={16} />
        Try again
      </button>
    </div>
  );
};
