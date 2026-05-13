/**
 * InteractiveWorksheetView — the public solver mounted at `/w/:slug`.
 *
 * Phase 1 reuses the presentational MatchingModeGame component and rolls
 * its own tiny state machine for the quiz format. No score persistence
 * yet — students see their result on a final card and screenshot it for
 * the teacher.
 *
 * The view is intentionally self-contained: it fetches the worksheet,
 * looks up the words from ALL_WORDS, runs the chosen exercise, and
 * shows a results screen. It does not depend on the larger App.tsx
 * game state machine — that machine is wired into the authenticated
 * student flow (assignments, XP, streaks) and is overkill here.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Volume2, XCircle } from "lucide-react";
import { supabase } from "../core/supabase";
import { ALL_WORDS } from "../data/vocabulary";
import MatchingModeGame from "../components/game/MatchingModeGame";
import { useLanguage } from "../hooks/useLanguage";
import { getWordAudioUrl } from "../utils/audioUrl";

type WorksheetFormat = "matching" | "quiz" | "fillblank" | "listening";

// One row in the per-question answers JSONB.  Shape varies by format:
// - quiz emits a `given` + `correct` pair for each question
// - matching emits a `mistakes_count` instead (no single "given" since
//   pairing requires matching tiles together, not picking one of N)
// The teacher dashboard renders these format-specifically.
type Answer =
  | { kind: "quiz"; word_id: number; prompt: string; given: string; correct: string; is_correct: boolean }
  | { kind: "matching"; word_id: number; english: string; translation: string; mistakes_count: number };

interface FinishPayload {
  score: number;
  total: number;
  answers: Answer[];
}

interface WorksheetRow {
  slug: string;
  topic_name: string;
  word_ids: number[];
  format: WorksheetFormat;
  settings: { language?: "en" | "he" | "ar" } & Record<string, unknown>;
}

type Word = (typeof ALL_WORDS)[number];

interface Props {
  slug: string;
  onBack: () => void;
}

// Reusable Fisher-Yates so the order of options/cards is randomised per
// session — otherwise every student gets the same sequence and the
// answers can be memorised from a friend's screen.
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const translationFor = (w: Word, lang: "en" | "he" | "ar"): string => {
  if (lang === "he") return w.hebrew || w.english;
  if (lang === "ar") return w.arabic || w.english;
  return w.english;
};

// Stage machine for the solver UI.  Keeps the render switch in one
// place — adding a "review answers" step later is one new state.
type Stage = "name-entry" | "in-progress" | "submitting" | "done" | "submit-error";

// localStorage key for the per-browser fingerprint.  Re-used across
// every worksheet on this browser so a student who solves two different
// worksheets shows up as the same person to the teacher (when they
// type the same name).
const FINGERPRINT_KEY = "vocaband:worksheet:fingerprint";

const getOrCreateFingerprint = (): string | null => {
  try {
    let fp = localStorage.getItem(FINGERPRINT_KEY);
    if (!fp) {
      // crypto.randomUUID is widely available; fall back to a longer
      // Math.random string for the rare browser that lacks it.
      fp =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `fp-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(FINGERPRINT_KEY, fp);
    }
    return fp;
  } catch {
    // Private mode or storage blocked — submission still works, just
    // without duplicate-collapse on retries.
    return null;
  }
};

// localStorage key for the cached student name, scoped per slug so a
// shared family device doesn't autofill one kid's name on another's
// worksheet.
const nameKey = (slug: string) => `vocaband:worksheet:${slug}:name`;

export default function InteractiveWorksheetView({ slug, onBack }: Props) {
  const { isRTL } = useLanguage();
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
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Wall-clock start, captured when the exercise begins so the teacher
  // can see how long each student took.  Not used for time-pressure UI;
  // students aren't graded on speed here.
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Phase-1 worksheets are < 30 words, so a single SELECT is fine — no
  // pagination, no realtime subscription. The slug is the credential and
  // RLS already filters expired rows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("interactive_worksheets")
        .select("slug, topic_name, word_ids, format, settings")
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

  // Words may load before vocabulary on slow networks, but vocabulary.ts is
  // already imported statically by this module so ALL_WORDS is populated
  // synchronously. No loading gate needed.
  const words: Word[] = useMemo(() => {
    if (!row) return [];
    const idSet = new Set(row.word_ids);
    return ALL_WORDS.filter((w) => idSet.has(w.id));
  }, [row]);

  const targetLang: "en" | "he" | "ar" = (row?.settings.language as "en" | "he" | "ar") ?? "he";

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

  const handleFinish = async (payload: FinishPayload) => {
    setScore(payload.score);
    setTotal(payload.total);
    setStage("submitting");
    setSubmitError(null);

    const duration_ms = startedAt ? Date.now() - startedAt : null;
    const fingerprint = getOrCreateFingerprint();
    try {
      const { error } = await supabase.rpc("submit_worksheet_attempt", {
        p_slug: slug,
        p_student_name: studentName,
        p_answers: payload.answers,
        p_score: payload.score,
        p_total: payload.total,
        p_duration_ms: duration_ms,
        p_fingerprint: fingerprint,
      });
      if (error) {
        // We still mark `done` — the student saw their score, the
        // submission just didn't reach the teacher.  Better than
        // pretending the worksheet wasn't completed.
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
    setScore(0);
    setTotal(0);
    setSubmitError(null);
    setStartedAt(Date.now());
    setStage("in-progress");
  };

  if (loadError) {
    return (
      <Shell onBack={onBack} isRTL={isRTL}>
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
      <Shell onBack={onBack} isRTL={isRTL}>
        <div className="flex items-center justify-center gap-3 text-white">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-semibold">Loading worksheet…</span>
        </div>
      </Shell>
    );
  }

  if (stage === "name-entry") {
    return (
      <Shell onBack={onBack} isRTL={isRTL}>
        <NameEntryCard
          topicName={row.topic_name}
          wordCount={words.length}
          format={row.format}
          initialName={studentName}
          onStart={handleStart}
        />
      </Shell>
    );
  }

  if (stage === "submitting") {
    return (
      <Shell onBack={onBack} isRTL={isRTL}>
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
      <Shell onBack={onBack} isRTL={isRTL}>
        <ResultsCard
          score={score}
          total={total}
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
    <Shell onBack={onBack} isRTL={isRTL}>
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest font-bold text-violet-300/80">{row.format}</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{row.topic_name}</h1>
        <p className="text-white/60 text-sm mt-1">Playing as <span className="font-bold text-white">{studentName}</span></p>
      </div>
      {row.format === "matching" && (
        <MatchingExercise words={words} targetLang={targetLang} onFinish={handleFinish} />
      )}
      {row.format === "quiz" && (
        <QuizExercise words={words} targetLang={targetLang} onFinish={handleFinish} />
      )}
      {(row.format === "fillblank" || row.format === "listening") && (
        <div className="text-center max-w-md mx-auto p-8 rounded-3xl bg-white/10 border border-white/15 text-white">
          <p className="font-bold text-lg mb-2">Coming soon</p>
          <p className="text-white/70 text-sm">
            This format isn't available in the online solver yet — try Matching or Quiz from the share page.
          </p>
        </div>
      )}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Name-entry gate.  Required step so the teacher dashboard has a label
// for each attempt.  We pre-fill from localStorage so a "Try again" on
// the same browser doesn't make the student re-type their name.
// ─────────────────────────────────────────────────────────────────────────
const NameEntryCard: React.FC<{
  topicName: string;
  wordCount: number;
  format: WorksheetFormat;
  initialName: string;
  onStart: (name: string) => void;
}> = ({ topicName, wordCount, format, initialName, onStart }) => {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const formatLabel: Record<WorksheetFormat, string> = {
    matching: "Matching exercise",
    quiz: "Multiple-choice quiz",
    fillblank: "Fill-in-the-blank",
    listening: "Listening",
  };
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto">
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-6 text-center text-white">
        <p className="text-xs uppercase tracking-widest font-bold opacity-90">{formatLabel[format]}</p>
        <h1 className="text-2xl sm:text-3xl font-black mt-1">{topicName}</h1>
        <p className="opacity-90 text-sm mt-1">{wordCount} words</p>
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
          placeholder="Type your name"
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

const Shell: React.FC<{ children: React.ReactNode; onBack: () => void; isRTL: boolean }> = ({
  children,
  onBack,
  isRTL,
}) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-4 py-6 sm:py-10">
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all mb-6"
      >
        <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
        <span>Back</span>
      </button>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Matching exercise — wraps the existing presentational component with a
// minimal state machine.  Pairs are batched into rounds of 6 so a 25-word
// pack doesn't try to render 50 tiles on a small phone screen.
// ─────────────────────────────────────────────────────────────────────────
const ROUND_SIZE = 6;

type MatchItem = { id: number; text: string; type: "english" | "arabic" };
type MatchSelection = { id: number; type: "english" | "arabic" };

const MatchingExercise: React.FC<{
  words: Word[];
  targetLang: "en" | "he" | "ar";
  onFinish: (payload: FinishPayload) => void;
}> = ({ words, targetLang, onFinish }) => {
  // Pre-shuffle word order once at mount so the same student doesn't see
  // the same sequence after a page reload (mount-time randomisation, not
  // every render — that would re-shuffle on each tap and break matching).
  const [rounds] = useState(() => {
    const shuffled = shuffle(words);
    const out: Word[][] = [];
    for (let i = 0; i < shuffled.length; i += ROUND_SIZE) {
      out.push(shuffled.slice(i, i + ROUND_SIZE));
    }
    return out;
  });
  const [roundIdx, setRoundIdx] = useState(0);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<MatchSelection | null>(null);
  const [processing, setProcessing] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  // Per-word mistake count for the teacher dashboard.  Indexed by
  // word_id, lazily populated when the student first attempts that pair.
  const [mistakesByWord, setMistakesByWord] = useState<Record<number, number>>({});

  const roundWords = rounds[roundIdx] ?? [];
  const pairs: MatchItem[] = useMemo(() => {
    const englishTiles: MatchItem[] = roundWords.map((w) => ({
      id: w.id,
      text: w.english,
      type: "english",
    }));
    const translationTiles: MatchItem[] = roundWords.map((w) => ({
      id: w.id,
      text: translationFor(w, targetLang),
      // Reuse the "arabic" type slot for any non-English target — the
      // presentational component only cares about left vs. right columns,
      // not the actual language.
      type: "arabic",
    }));
    return [...shuffle(englishTiles), ...shuffle(translationTiles)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, targetLang]);

  const handleClick = (item: MatchSelection) => {
    if (processing) return;
    if (!selected) {
      setSelected(item);
      return;
    }
    // Second tap of the same tile cancels selection.
    if (selected.id === item.id && selected.type === item.type) {
      setSelected(null);
      return;
    }
    // Must be one of each side — two English or two translation tiles
    // can't form a pair.
    if (selected.type === item.type) {
      setSelected(item);
      return;
    }
    setProcessing(true);
    setAttempts((a) => a + 1);
    if (selected.id === item.id) {
      setMatchedIds((m) => [...m, item.id]);
      setCorrect((c) => c + 1);
      // Short delay so the connection-line animation plays before the
      // tiles exit and the next round potentially loads.
      setTimeout(() => {
        setSelected(null);
        setProcessing(false);
      }, 420);
    } else {
      // Wrong pair — bump the mistakes_count for BOTH sides of the
      // attempted pair so the teacher can see which words tripped the
      // student up.  Same key gets incremented on each wrong tap.
      setMistakesByWord((prev) => ({
        ...prev,
        [selected.id]: (prev[selected.id] ?? 0) + 1,
        [item.id]: (prev[item.id] ?? 0) + 1,
      }));
      setTimeout(() => {
        setSelected(null);
        setProcessing(false);
      }, 350);
    }
  };

  // Advance rounds + finish when all matched.  Done inside an effect so
  // we react to the matchedIds state update rather than chaining onto
  // the setTimeout above (which would run before React commits state).
  useEffect(() => {
    if (roundWords.length === 0) return;
    const allMatched = roundWords.every((w) => matchedIds.includes(w.id));
    if (!allMatched) return;
    if (roundIdx + 1 < rounds.length) {
      const next = roundIdx + 1;
      // Brief pause so the celebration finishes before the new tiles fade in.
      const t = setTimeout(() => {
        setRoundIdx(next);
        setMatchedIds([]);
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      // Build the per-question detail.  In matching every word is
      // eventually "correct" (you can't progress otherwise), so the
      // teacher's signal is the mistakes count per word, not a
      // correct/incorrect boolean.
      const answers: Answer[] = words.map((w) => ({
        kind: "matching" as const,
        word_id: w.id,
        english: w.english,
        translation: translationFor(w, targetLang),
        mistakes_count: mistakesByWord[w.id] ?? 0,
      }));
      onFinish({ score: correct, total: attempts, answers });
    }, 700);
    return () => clearTimeout(t);
  }, [matchedIds, roundWords, roundIdx, rounds.length, correct, attempts, mistakesByWord, words, targetLang, onFinish]);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-stone-500">
          Round {roundIdx + 1} / {rounds.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>
      <MatchingModeGame
        matchingPairs={pairs}
        matchedIds={matchedIds}
        selectedMatch={selected}
        isMatchingProcessing={processing}
        onMatchClick={handleClick}
        themeColor="amber"
        modeLabel="Matching"
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Quiz exercise — one word at a time, 4 translation options. Pure local
// state, no external component dependency, because the existing
// ClassicModeGame is tangled with App-level XP/feedback state we don't
// want here.
// ─────────────────────────────────────────────────────────────────────────
const QuizExercise: React.FC<{
  words: Word[];
  targetLang: "en" | "he" | "ar";
  onFinish: (payload: FinishPayload) => void;
}> = ({ words, targetLang, onFinish }) => {
  const [order] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  // Append-only log of each question's answer for the teacher dashboard.
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = order[idx];
  // Distractors are sampled from the same word list so the difficulty is
  // self-calibrating — students with a short pack get a small set of
  // distractors, which is fine because the words they're learning are
  // the only ones they need to disambiguate.
  const options: Word[] = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(order.filter((w) => w.id !== current.id)).slice(0, 3);
    return shuffle([current, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handlePick = (w: Word) => {
    if (pickedId !== null) return;
    setPickedId(w.id);
    const isRight = w.id === current.id;
    if (isRight) setCorrect((c) => c + 1);
    const answer: Answer = {
      kind: "quiz",
      word_id: current.id,
      prompt: current.english,
      given: translationFor(w, targetLang),
      correct: translationFor(current, targetLang),
      is_correct: isRight,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setTimeout(() => {
      if (idx + 1 < order.length) {
        setIdx(idx + 1);
        setPickedId(null);
      } else {
        // Use the post-pick score, not stale `correct` — increment
        // mirrors what setCorrect just queued.
        const finalScore = correct + (isRight ? 1 : 0);
        onFinish({ score: finalScore, total: order.length, answers: nextAnswers });
      }
    }, 800);
  };

  const playAudio = () => {
    try {
      const url = getWordAudioUrl(current.id);
      if (!url) return;
      const audio = new Audio(url);
      audio.play().catch(() => undefined);
    } catch {
      // best-effort audio; ignore unavailable hosts.
    }
  };

  if (!current) return null;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-stone-500">
          {idx + 1} / {order.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{correct} correct</span>
      </div>

      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-3">
          Choose the translation
        </p>
        <div className="inline-flex items-center gap-3">
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900" dir="ltr">
            {current.english}
          </h2>
          <button
            type="button"
            onClick={playAudio}
            aria-label="Play pronunciation"
            className="p-2 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 transition-all"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isPicked = pickedId === opt.id;
          const isAnswer = opt.id === current.id;
          const reveal = pickedId !== null;
          const style = !reveal
            ? "bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100"
            : isAnswer
              ? "bg-emerald-500 text-white border-emerald-500"
              : isPicked
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-stone-100 text-stone-400 border-stone-200";
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileTap={{ scale: pickedId !== null ? 1 : 0.96 }}
              disabled={pickedId !== null}
              onClick={() => handlePick(opt)}
              className={`p-4 rounded-2xl border-2 font-bold text-lg sm:text-xl transition-colors ${style}`}
              dir="auto"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {translationFor(opt, targetLang)}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Results screen — minimal celebration card so the student can screenshot
// it and send back to their teacher.  No persistence in Phase 1.
// ─────────────────────────────────────────────────────────────────────────
const ResultsCard: React.FC<{
  score: number;
  total: number;
  topicName: string;
  slug: string;
  studentName: string;
  submitError: string | null;
  onRestart: () => void;
}> = ({ score, total, topicName, slug, studentName, submitError, onRestart }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
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

      <div className="inline-flex items-baseline gap-1 mb-6">
        <span className="text-6xl sm:text-7xl font-black text-violet-700">{score}</span>
        <span className="text-3xl sm:text-4xl font-bold text-stone-400">/ {total}</span>
      </div>
      <div className="text-lg font-bold text-stone-700 mb-6">{pct}%</div>

      {submitError ? (
        // The student saw their score — the submission just didn't reach
        // the teacher.  Tell them honestly so they can show the screen.
        <div className="mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm text-left">
          <p className="font-bold mb-1">Couldn't reach your teacher's dashboard</p>
          <p className="text-amber-800/80 text-xs">
            Your score is shown above — show this screen to your teacher.
          </p>
        </div>
      ) : (
        <p className="text-xs font-bold text-emerald-600 mb-6">
          ✓ Sent to your teacher
        </p>
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
