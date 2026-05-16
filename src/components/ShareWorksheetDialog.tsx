/**
 * ShareWorksheetDialog — mint an interactive worksheet link from any
 * surface in the app (Free Resources, WorksheetView, Create Assignment).
 *
 * The dialog assembles an ordered list of exercises and posts it to
 * the `create_interactive_worksheet_v2` RPC.  Each toggled exercise
 * carries its own type-specific config (translation direction,
 * synonym vs. antonym, etc.) and shares the worksheet's full word
 * pool — per-exercise word subsets are a phase-2 polish item.
 *
 * Anonymous mints (no auth.uid()) stay invisible to teacher
 * dashboards by design — the RPC stamps `teacher_uid` only when the
 * caller is signed in.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Share2, X, Loader2, Check, CheckCircle2, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { supabase } from "../core/supabase";
import { FILLBLANK_SENTENCES } from "../data/sentence-bank-fillblank";
import { useLanguage } from "../hooks/useLanguage";
import { shareWorksheetT } from "../locales/teacher/share-worksheet";
import type { Exercise, ExerciseType, TranslationDirection } from "../worksheet/types";
import { WorksheetShareCard } from "./WorksheetShareCard";

// Exercise types that need a context sentence for each word. When the
// teacher picks any of these, the dialog also calls /api/generate-sentences
// for any words missing from the static FILLBLANK_SENTENCES bank so the
// kid actually has questions to play instead of an empty auto-skip card.
const SENTENCE_DEPENDENT_TYPES = new Set<ExerciseType>([
  "fill_blank",
  "sentence_building",
  "cloze",
  "word_in_context",
]);

export type WorksheetLang = "en" | "he" | "ar";

export interface ShareSource {
  topicName: string;
  wordIds: number[];
}

interface Props {
  source: ShareSource;
  defaultLang: WorksheetLang;
  onClose: () => void;
}

// Order shown in the picker.  Matching + Quiz lead because they're the
// established formats; the typed-input exercises follow; the
// content-heavy types (cloze, definition match) sit at the bottom
// since they may render empty for vocabulary that has no associated
// content yet.
const EXERCISE_ORDER: ExerciseType[] = [
  "matching",
  "quiz",
  "translation_typing",
  "letter_scramble",
  "listening_dictation",
  "fill_blank",
  "true_false",
  "synonym_antonym",
  "definition_match",
  "sentence_building",
  "word_in_context",
  "cloze",
];

// Per-exercise default config — used when a type is first toggled on.
// Translation typing and synonym/antonym are the only ones with knobs
// today; everything else just rides the worksheet's word pool.
const defaultConfig = (
  type: ExerciseType,
  wordIds: number[],
  defaultLang: WorksheetLang,
): Exercise => {
  if (type === "translation_typing") {
    const direction: TranslationDirection =
      defaultLang === "ar" ? "en_to_ar" : "en_to_he";
    return { type, word_ids: wordIds, direction };
  }
  if (type === "synonym_antonym") {
    return { type, word_ids: wordIds, mode: "synonym" };
  }
  return { type, word_ids: wordIds } as Exercise;
};

export const ShareWorksheetDialog: React.FC<Props> = ({ source, defaultLang, onClose }) => {
  const { language, dir } = useLanguage();
  const t = shareWorksheetT[language];
  const uniqueIds = useMemo(
    () => Array.from(new Set(source.wordIds)),
    [source.wordIds],
  );

  // Mixed-type plan: ordered list of exercises the teacher has toggled
  // on.  Default seeds with Matching so the dialog opens in a usable
  // state — most teachers leave the default and just hit Generate.
  const [plan, setPlan] = useState<Exercise[]>(() => [
    defaultConfig("matching", uniqueIds, defaultLang === "en" ? "he" : defaultLang),
  ]);
  const [lang, setLang] = useState<WorksheetLang>(
    defaultLang === "en" ? "he" : defaultLang,
  );
  const [slug, setSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI sentence generation state — shared across all sentence-dependent
  // exercises because they all draw from the same word pool. Phase is
  // a small state machine: idle → generating → ready (or failed).
  type AiPhase = "idle" | "generating" | "ready" | "failed";
  const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
  const [aiSentences, setAiSentences] = useState<Record<string, string>>({});
  // Inline confirm shown on the card the teacher just toggled. Tapping
  // the card again, or hitting Skip, clears it without adding the
  // exercise. Yes adds the exercise AND kicks off generation if it
  // hasn't run yet.
  const [pendingConfirm, setPendingConfirm] = useState<ExerciseType | null>(null);

  const hasMissingFromBank = useMemo(
    () => uniqueIds.some((id) => !FILLBLANK_SENTENCES.has(id)),
    [uniqueIds],
  );

  const toggle = (type: ExerciseType) => {
    // Tap the same card that's currently asking for confirmation =
    // cancel (Skip). The exercise was never added; nothing to remove.
    if (pendingConfirm === type) {
      setPendingConfirm(null);
      return;
    }
    // Toggle OFF an active exercise.
    if (plan.some((e) => e.type === type)) {
      setPlan((prev) => prev.filter((e) => e.type !== type));
      return;
    }
    // Toggle ON a sentence-dependent exercise whose word pool has gaps
    // the static bank can't fill — show the inline confirm so the
    // teacher decides up front rather than getting silent skip cards.
    if (
      SENTENCE_DEPENDENT_TYPES.has(type) &&
      hasMissingFromBank &&
      aiPhase !== "ready" &&
      aiPhase !== "generating"
    ) {
      setPendingConfirm(type);
      return;
    }
    // Normal add.
    setPlan((prev) => [...prev, defaultConfig(type, uniqueIds, lang)]);
  };

  const updateExercise = <T extends ExerciseType>(
    type: T,
    patch: Partial<Extract<Exercise, { type: T }>>,
  ) => {
    setPlan((prev) =>
      prev.map((e) =>
        e.type === type
          ? ({ ...(e as Extract<Exercise, { type: T }>), ...patch } as Exercise)
          : e,
      ),
    );
  };

  // Best-effort AI sentence fetch for words missing from the static
  // FILLBLANK_SENTENCES bank. Anonymous mints (no auth token) and
  // network/server errors all resolve to phase: 'failed' so the UI
  // can show "couldn't generate" instead of hanging — the kid's
  // solver then falls back to the visible skip card for that word.
  const runAiGeneration = async () => {
    if (aiPhase === "generating" || aiPhase === "ready") return;
    const missingIds = uniqueIds.filter((id) => !FILLBLANK_SENTENCES.has(id));
    if (missingIds.length === 0) {
      // Static bank already covers every word — nothing to fetch.
      setAiPhase("ready");
      return;
    }
    setAiPhase("generating");
    // Dynamic import keeps the 6482-word vocabulary chunk out of the
    // teacher-flow bundle — only fetched when the teacher actually opts
    // into AI sentence generation for a sentence-dependent exercise.
    const { ALL_WORDS } = await import("../data/vocabulary");
    const wordById = new Map(ALL_WORDS.map((w) => [w.id, w]));
    const CHUNK = 40;
    const out: Record<string, string> = {};
    const apiUrl =
      (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "";
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setAiPhase("failed");
      return;
    }
    try {
      for (let i = 0; i < missingIds.length; i += CHUNK) {
        const slice = missingIds.slice(i, i + CHUNK);
        const englishWords = slice
          .map((id) => wordById.get(id)?.english)
          .filter((w): w is string => !!w && w.trim().length > 0);
        if (englishWords.length === 0) continue;
        const res = await fetch(`${apiUrl}/api/generate-sentences`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ words: englishWords, difficulty: 2 }),
        });
        if (!res.ok) continue;
        const { sentences } = (await res.json()) as { sentences: string[] };
        slice.forEach((id, idx) => {
          const s = sentences?.[idx];
          if (s) out[String(id)] = s;
        });
      }
    } catch {
      // network / auth — fall back to failed; keep any partial results.
    }
    setAiSentences(out);
    setAiPhase(Object.keys(out).length > 0 ? "ready" : "failed");
  };

  const handleConfirmGenerate = () => {
    if (!pendingConfirm) return;
    const type = pendingConfirm;
    setPlan((prev) =>
      prev.some((e) => e.type === type)
        ? prev
        : [...prev, defaultConfig(type, uniqueIds, lang)],
    );
    setPendingConfirm(null);
    // Fire and forget — the picker shows a "Generating sentences…"
    // badge while this resolves and the Generate share link button is
    // disabled until it completes.
    void runAiGeneration();
  };

  const handleSkipGenerate = () => {
    setPendingConfirm(null);
  };

  const handleGenerate = async () => {
    if (plan.length === 0) {
      setError(t.pickAtLeastOne);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      // Stamp every exercise's word_ids with the current pool so a
      // teacher who toggled Matching first, narrowed the pool, then
      // added Quiz still gets the latest list in both.
      const exercises = plan.map((e) => ({ ...e, word_ids: uniqueIds }));
      const settings: Record<string, unknown> = { language: lang };
      if (Object.keys(aiSentences).length > 0) {
        settings.sentences = aiSentences;
      }
      const { data, error: rpcErr } = await supabase.rpc(
        "create_interactive_worksheet_v2",
        {
          p_topic_name: source.topicName,
          p_exercises: exercises,
          p_settings: settings,
        },
      );
      if (rpcErr || !data) {
        setError(rpcErr?.message ?? t.generateError);
        return;
      }
      setSlug(String(data));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.dialogAria}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        dir={dir}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 flex items-center gap-3">
          <Share2 size={20} className="text-white" />
          <h3 className="text-lg font-bold text-white flex-1 truncate">{t.heading}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-stone-400">
              {t.topicLabel}
            </p>
            <p className="font-bold text-stone-900 text-lg">{source.topicName}</p>
            <p className="text-xs text-stone-500">{t.wordsCount(uniqueIds.length)}</p>
          </div>

          {!slug && (
            <>
              <ExercisePicker
                t={t}
                plan={plan}
                onToggle={toggle}
                onUpdate={updateExercise}
                pendingConfirm={pendingConfirm}
                onConfirmGenerate={handleConfirmGenerate}
                onSkipGenerate={handleSkipGenerate}
                aiPhase={aiPhase}
                wordCount={uniqueIds.length}
              />

              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
                  {t.translationLabel}
                </p>
                <div className="inline-flex rounded-lg bg-stone-100 p-1 w-full">
                  {([
                    { v: "he", l: "עברית" },
                    { v: "ar", l: "العربية" },
                  ] as { v: WorksheetLang; l: string }[]).map((opt) => {
                    const active = lang === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setLang(opt.v)}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-bold transition-all ${
                          active ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"
                        }`}
                      >
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  creating ||
                  plan.length === 0 ||
                  aiPhase === "generating" ||
                  pendingConfirm !== null
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {creating || aiPhase === "generating" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
                {creating
                  ? t.generating
                  : aiPhase === "generating"
                    ? t.aiStatusGenerating
                    : t.generateBtn}
              </button>
            </>
          )}

          {slug && (
            <WorksheetShareCard
              slug={slug}
              topicName={source.topicName}
              t={t}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

const ExercisePicker: React.FC<{
  t: ReturnType<typeof getTranslator>;
  plan: Exercise[];
  onToggle: (type: ExerciseType) => void;
  onUpdate: <T extends ExerciseType>(
    type: T,
    patch: Partial<Extract<Exercise, { type: T }>>,
  ) => void;
  pendingConfirm: ExerciseType | null;
  onConfirmGenerate: () => void;
  onSkipGenerate: () => void;
  aiPhase: "idle" | "generating" | "ready" | "failed";
  wordCount: number;
}> = ({
  t,
  plan,
  onToggle,
  onUpdate,
  pendingConfirm,
  onConfirmGenerate,
  onSkipGenerate,
  aiPhase,
  wordCount,
}) => {
  const planByType = useMemo(() => {
    const m = new Map<ExerciseType, Exercise>();
    for (const e of plan) m.set(e.type, e);
    return m;
  }, [plan]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest font-bold text-stone-400">
          {t.exerciseLabel}
        </p>
        <p className="text-xs font-bold text-emerald-700">{plan.length} picked</p>
      </div>
      <div className="grid gap-2">
        {EXERCISE_ORDER.map((type) => {
          const inPlan = planByType.has(type);
          const isPending = pendingConfirm === type;
          // The card visually reads as active while the confirm panel
          // is showing so the toggle feels immediate — Skip restores
          // the unchecked state.
          const active = inPlan || isPending;
          const meta = t.exercises[type];
          const exercise = planByType.get(type);
          const showStatus =
            inPlan && SENTENCE_DEPENDENT_TYPES.has(type) && aiPhase !== "idle";
          return (
            <div
              key={type}
              className={`rounded-xl border-2 transition-all ${
                active ? "bg-emerald-50 border-emerald-500" : "bg-white border-stone-200"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(type)}
                className="w-full text-start px-4 py-3 flex items-center gap-3"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <div className="flex-1 min-w-0">
                  <div className={`font-bold ${active ? "text-emerald-900" : "text-stone-700"}`}>
                    {meta?.label ?? type}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{meta?.desc ?? ""}</div>
                  {showStatus && (
                    <AiStatusPill phase={aiPhase} t={t} />
                  )}
                </div>
                <div
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    active ? "bg-emerald-500 border-emerald-500" : "border-stone-300"
                  }`}
                  aria-hidden
                >
                  {active ? (
                    <Check size={14} className="text-white" />
                  ) : (
                    <Plus size={14} className="text-stone-300" />
                  )}
                </div>
              </button>
              {isPending && (
                <AiConfirmPanel
                  t={t}
                  wordCount={wordCount}
                  onConfirm={onConfirmGenerate}
                  onSkip={onSkipGenerate}
                />
              )}
              {inPlan && exercise && !isPending && (
                <ExerciseConfigRow exercise={exercise} t={t} onUpdate={onUpdate} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AiConfirmPanel: React.FC<{
  t: ReturnType<typeof getTranslator>;
  wordCount: number;
  onConfirm: () => void;
  onSkip: () => void;
}> = ({ t, wordCount, onConfirm, onSkip }) => (
  <div className="px-4 pb-4 pt-1 border-t border-emerald-200 bg-emerald-50">
    <div className="flex items-start gap-2 mb-2">
      <Sparkles size={16} className="text-violet-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold text-stone-900">{t.aiConfirmTitle(wordCount)}</p>
        <p className="text-xs text-stone-600 mt-1">{t.aiConfirmBody}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mt-3">
      <button
        type="button"
        onClick={onSkip}
        className="py-2 rounded-lg bg-white text-stone-700 border border-stone-200 font-bold text-sm hover:bg-stone-50 transition-all"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        {t.aiConfirmSkip}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <Sparkles size={14} />
        {t.aiConfirmYes}
      </button>
    </div>
  </div>
);

const AiStatusPill: React.FC<{
  phase: "idle" | "generating" | "ready" | "failed";
  t: ReturnType<typeof getTranslator>;
}> = ({ phase, t }) => {
  if (phase === "generating") {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-violet-700">
        <Loader2 size={11} className="animate-spin" />
        {t.aiStatusGenerating}
      </span>
    );
  }
  if (phase === "ready") {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 size={11} />
        {t.aiStatusReady}
      </span>
    );
  }
  if (phase === "failed") {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-700">
        <TriangleAlert size={11} />
        {t.aiStatusFailed}
      </span>
    );
  }
  return null;
};

const ExerciseConfigRow: React.FC<{
  exercise: Exercise;
  t: ReturnType<typeof getTranslator>;
  onUpdate: <T extends ExerciseType>(
    type: T,
    patch: Partial<Extract<Exercise, { type: T }>>,
  ) => void;
}> = ({ exercise, t, onUpdate }) => {
  if (exercise.type === "translation_typing") {
    const dirs: Array<{ v: TranslationDirection; l: string }> = [
      { v: "en_to_he", l: "EN → HE" },
      { v: "he_to_en", l: "HE → EN" },
      { v: "en_to_ar", l: "EN → AR" },
      { v: "ar_to_en", l: "AR → EN" },
    ];
    return (
      <div className="px-4 pb-3 -mt-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">
          {t.translationDirectionLabel}
        </p>
        <div className="grid grid-cols-4 gap-1">
          {dirs.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => onUpdate("translation_typing", { direction: d.v })}
              className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                exercise.direction === d.v
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (exercise.type === "synonym_antonym") {
    return (
      <div className="px-4 pb-3 -mt-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">
          {t.synonymModeLabel}
        </p>
        <div className="inline-flex rounded-lg bg-white border border-stone-200 p-0.5 w-full">
          {(["synonym", "antonym"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onUpdate("synonym_antonym", { mode })}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                exercise.mode === mode
                  ? "bg-emerald-600 text-white"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {mode === "synonym" ? t.synonymOption : t.antonymOption}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Convenience type-extractor so the helper components don't repeat the
// long `(typeof shareWorksheetT)[Language]` shape in their props.
const getTranslator = (): typeof shareWorksheetT["en"] => shareWorksheetT.en;

export default ShareWorksheetDialog;
