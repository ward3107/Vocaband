/**
 * SentenceGenerationModal — generates AI sentences for a saved Set.
 *
 * Two-step flow:
 *   1. Pick level (A1/A2/B1/B2) + output types (fill-blank / full).
 *   2. Review the 3 candidates per word, pick one, edit inline if
 *      needed, save the selected candidates to the DB.
 *
 * Backend: POST /api/library/generate-sentences (Phase 4d endpoint).
 * Storage: vocabulary_set_word_sentences via saveGeneratedSentences.
 *
 * Regenerate-per-word is capped at 3 attempts per session — beyond
 * that the icon greys out with a "try editing manually" hint. The
 * client-side cap complements the server's per-teacher daily quota.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowLeft, Sparkles, Loader2, Check, RefreshCcw, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { supabase } from "../../core/supabase";
import {
  saveGeneratedSentences,
  type VocabularySet,
} from "../../core/vocabularyLibrary";
import {
  sentenceGenerationT,
  type SentenceGenerationStrings,
  type SentenceLevelKey,
} from "../../locales/teacher/vocabulary-library-sentences";

interface CandidatePair {
  sentence: string;
  fillBlank: string;
  wasEdited: boolean;
}

interface WordResult {
  wordId: string;
  english: string;
  candidates: CandidatePair[];
  /** Index of the candidate the teacher has chosen, or null for "skip". */
  selectedIdx: number | null;
  /** How many times this word has been regenerated this session. */
  regenCount: number;
  regenerating: boolean;
}

interface ApiWordResult {
  wordId: string;
  english: string;
  candidates: Array<{ sentence: string; fillBlank: string }>;
}

interface SentenceGenerationModalProps {
  set: VocabularySet;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

const MAX_REGEN_PER_WORD = 3;
const LEVEL_OPTIONS: Array<{ key: SentenceLevelKey; emoji: string }> = [
  { key: "A1", emoji: "🌱" },
  { key: "A2", emoji: "🌿" },
  { key: "B1", emoji: "🌳" },
  { key: "B2", emoji: "🦋" },
];

async function callGenerate(
  setId: string,
  level: SentenceLevelKey,
  candidateCount: number,
  wordIds?: string[],
): Promise<{ wordResults: ApiWordResult[]; level: SentenceLevelKey } | { error: string; status: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: "Not authenticated", status: 401 };

  const res = await fetch("/api/library/generate-sentences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      setId,
      level,
      candidateCount,
      ...(wordIds ? { wordIds } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "" }));
    return { error: body?.error || `Request failed (${res.status})`, status: res.status };
  }
  return (await res.json()) as { wordResults: ApiWordResult[]; level: SentenceLevelKey };
}

export default function SentenceGenerationModal({
  set,
  onClose,
  onSaved,
  showToast,
}: SentenceGenerationModalProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = useMemo(() => sentenceGenerationT[language], [language]);

  const [step, setStep] = useState<"pick" | "generating" | "review">("pick");
  const [level, setLevel] = useState<SentenceLevelKey>("A2");
  const [keepFullSentence, setKeepFullSentence] = useState(false);
  const [results, setResults] = useState<WordResult[]>([]);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-pick level from the Set's stored preset if present.
  useEffect(() => {
    const preset = set.sentencePreset as { level?: SentenceLevelKey } | null;
    if (preset?.level && (["A1", "A2", "B1", "B2"] as string[]).includes(preset.level)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync from props to local default; matches the codebase pattern (see useFirstTimeGuide)
      setLevel(preset.level);
    }
  }, [set.sentencePreset]);

  const handleGenerate = useCallback(async () => {
    setStep("generating");
    const out = await callGenerate(set.id, level, 3);
    if ("error" in out) {
      showToast(out.status === 429 ? t.errorQuota : t.errorGenerate, "error");
      setStep("pick");
      return;
    }
    setResults(
      out.wordResults.map((r) => ({
        wordId: r.wordId,
        english: r.english,
        candidates: r.candidates.map((c) => ({ ...c, wasEdited: false })),
        // Auto-pick the first candidate when available so the teacher
        // can save with one click if the AI nailed it; they can always
        // change the selection or skip.
        selectedIdx: r.candidates.length > 0 ? 0 : null,
        regenCount: 0,
        regenerating: false,
      })),
    );
    setStep("review");
  }, [set.id, level, showToast, t.errorGenerate, t.errorQuota]);

  const handleRegenerate = useCallback(async (wordId: string) => {
    setResults((prev) => prev.map((r) => (r.wordId === wordId ? { ...r, regenerating: true } : r)));
    const out = await callGenerate(set.id, level, 3, [wordId]);
    if ("error" in out) {
      showToast(out.status === 429 ? t.errorQuota : t.errorGenerate, "error");
      setResults((prev) => prev.map((r) => (r.wordId === wordId ? { ...r, regenerating: false } : r)));
      return;
    }
    const fresh = out.wordResults.find((r) => r.wordId === wordId);
    if (!fresh) {
      setResults((prev) => prev.map((r) => (r.wordId === wordId ? { ...r, regenerating: false } : r)));
      return;
    }
    setResults((prev) =>
      prev.map((r) =>
        r.wordId === wordId
          ? {
              ...r,
              candidates: fresh.candidates.map((c) => ({ ...c, wasEdited: false })),
              selectedIdx: fresh.candidates.length > 0 ? 0 : null,
              regenCount: r.regenCount + 1,
              regenerating: false,
            }
          : r,
      ),
    );
  }, [set.id, level, showToast, t.errorGenerate, t.errorQuota]);

  const handlePickCandidate = useCallback((wordId: string, idx: number | null) => {
    setResults((prev) => prev.map((r) => (r.wordId === wordId ? { ...r, selectedIdx: idx } : r)));
  }, []);

  const handleStartEdit = useCallback((wordId: string) => {
    setResults((prev) => {
      const word = prev.find((r) => r.wordId === wordId);
      if (!word || word.selectedIdx === null) return prev;
      const cand = word.candidates[word.selectedIdx];
      // Edit operates on the fill-blank rendering (it's the primary
      // output). The teacher can write ______ wherever they want a gap.
      setEditingText(cand.fillBlank);
      return prev;
    });
    setEditingWordId(wordId);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingWordId) return;
    const newText = editingText.trim();
    if (newText.length === 0) {
      setEditingWordId(null);
      return;
    }
    setResults((prev) =>
      prev.map((r) => {
        if (r.wordId !== editingWordId || r.selectedIdx === null) return r;
        const newCandidates = [...r.candidates];
        const existing = newCandidates[r.selectedIdx];
        // When the teacher edits, both the full-sentence and the fill-
        // blank get the new text. They're effectively writing the
        // fill-blank version; the "full sentence" view shows the same
        // string with ______ replaced by the target word.
        const reconstructedFull = newText.replace(/_+/g, r.english);
        newCandidates[r.selectedIdx] = {
          ...existing,
          fillBlank: newText,
          sentence: reconstructedFull,
          wasEdited: true,
        };
        return { ...r, candidates: newCandidates };
      }),
    );
    setEditingWordId(null);
  }, [editingWordId, editingText]);

  const handleCancelEdit = useCallback(() => setEditingWordId(null), []);

  const handleSave = useCallback(async () => {
    const toPersist: Array<{
      wordId: string;
      text: string;
      kind: "sentence" | "fill_blank";
      level: SentenceLevelKey;
      wasEdited?: boolean;
    }> = [];
    for (const r of results) {
      if (r.selectedIdx === null) continue;
      const cand = r.candidates[r.selectedIdx];
      if (!cand) continue;
      // Fill-blank is always saved (primary output).
      toPersist.push({ wordId: r.wordId, text: cand.fillBlank, kind: "fill_blank", level, wasEdited: cand.wasEdited });
      // Full sentence saved too if the teacher toggled it on.
      if (keepFullSentence) {
        toPersist.push({ wordId: r.wordId, text: cand.sentence, kind: "sentence", level, wasEdited: cand.wasEdited });
      }
    }
    if (toPersist.length === 0) {
      showToast(t.errorPickAtLeastOne, "error");
      return;
    }
    setSaving(true);
    try {
      await saveGeneratedSentences(toPersist);
      showToast(t.saved(toPersist.length), "success");
      onSaved();
    } catch (err) {
      console.warn("[SentenceGenerationModal] save failed:", err);
      showToast(t.errorSave, "error");
    } finally {
      setSaving(false);
    }
  }, [results, level, keepFullSentence, showToast, onSaved, t]);

  const backToPick = useCallback(() => {
    setStep("pick");
    setResults([]);
    setEditingWordId(null);
  }, []);

  const selectedCount = useMemo(
    () => results.filter((r) => r.selectedIdx !== null).length,
    [results],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={dir}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.modalTitle(set.name)}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 240 }}
        className="bg-white w-full sm:max-w-3xl rounded-none sm:rounded-3xl shadow-2xl max-h-screen sm:max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-4 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "review" && (
              <button
                type="button"
                onClick={backToPick}
                aria-label={t.back}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-white/15 shrink-0"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
              </button>
            )}
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="font-bold truncate">{t.modalTitle(set.name)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalCloseAria}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-white/15 shrink-0"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {step === "pick" && (
                <PickStep
                  t={t}
                  level={level}
                  setLevel={setLevel}
                  keepFullSentence={keepFullSentence}
                  setKeepFullSentence={setKeepFullSentence}
                  onGenerate={handleGenerate}
                />
              )}
              {step === "generating" && <GeneratingStep t={t} />}
              {step === "review" && (
                <ReviewStep
                  t={t}
                  level={level}
                  results={results}
                  editingWordId={editingWordId}
                  editingText={editingText}
                  onEditingTextChange={setEditingText}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onPickCandidate={handlePickCandidate}
                  onRegenerate={handleRegenerate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — only on review step */}
        {step === "review" && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-600">
              {selectedCount} / {results.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="text-sm font-semibold text-slate-600 hover:underline disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 inline-flex items-center gap-2"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? t.saving : t.saveSelected}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Step 1: pick ───────────────────────────────────────────────────────────

function PickStep({
  t,
  level,
  setLevel,
  keepFullSentence,
  setKeepFullSentence,
  onGenerate,
}: {
  t: SentenceGenerationStrings;
  level: SentenceLevelKey;
  setLevel: (l: SentenceLevelKey) => void;
  keepFullSentence: boolean;
  setKeepFullSentence: (v: boolean) => void;
  onGenerate: () => void;
}) {
  const labels: Record<SentenceLevelKey, { title: string; sub: string }> = {
    A1: { title: t.levelA1Title, sub: t.levelA1Sub },
    A2: { title: t.levelA2Title, sub: t.levelA2Sub },
    B1: { title: t.levelB1Title, sub: t.levelB1Sub },
    B2: { title: t.levelB2Title, sub: t.levelB2Sub },
  };
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-bold text-slate-900">{t.pickLevelHeading}</h3>
        <p className="text-sm text-slate-600 mt-1">{t.pickLevelSubtitle}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LEVEL_OPTIONS.map(({ key, emoji }) => {
            const isActive = level === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLevel(key)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`text-left rounded-2xl p-4 border transition-all ${
                  isActive
                    ? "border-violet-500 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{labels[key].title}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{key}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{labels[key].sub}</p>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-violet-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">{t.outputTypeHeading}</h3>
        <p className="text-sm text-slate-600 mt-1">{t.outputTypeSubtitle}</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
            <Check className="w-4 h-4 text-violet-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-900">{t.outputFillBlank}</span>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={keepFullSentence}
              onChange={(e) => setKeepFullSentence(e.target.checked)}
              className="w-4 h-4 text-violet-600 rounded"
            />
            <span className="text-sm font-medium text-slate-900">{t.outputSentence}</span>
          </label>
        </div>
      </section>

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onGenerate}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-base shadow-sm hover:shadow-md"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <Sparkles className="w-5 h-5" />
        {t.generate}
      </motion.button>
    </div>
  );
}

function GeneratingStep({ t }: { t: SentenceGenerationStrings }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
      <p className="mt-4 font-bold text-slate-900">{t.generating}</p>
    </div>
  );
}

// ─── Step 2: review ─────────────────────────────────────────────────────────

function ReviewStep({
  t,
  level,
  results,
  editingWordId,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onPickCandidate,
  onRegenerate,
}: {
  t: SentenceGenerationStrings;
  level: SentenceLevelKey;
  results: WordResult[];
  editingWordId: string | null;
  editingText: string;
  onEditingTextChange: (s: string) => void;
  onStartEdit: (wordId: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onPickCandidate: (wordId: string, idx: number | null) => void;
  onRegenerate: (wordId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-slate-900">{t.reviewHeading}</h3>
        <p className="text-sm text-slate-600 mt-1">{t.reviewSubtitle(results.length, level)}</p>
      </div>
      {results.map((r) => (
        <WordCard
          key={r.wordId}
          t={t}
          word={r}
          isEditing={editingWordId === r.wordId}
          editingText={editingText}
          onEditingTextChange={onEditingTextChange}
          onStartEdit={() => onStartEdit(r.wordId)}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onPickCandidate={(idx) => onPickCandidate(r.wordId, idx)}
          onSkip={() => onPickCandidate(r.wordId, null)}
          onRegenerate={() => onRegenerate(r.wordId)}
        />
      ))}
    </div>
  );
}

function WordCard({
  t,
  word,
  isEditing,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onPickCandidate,
  onSkip,
  onRegenerate,
}: {
  t: SentenceGenerationStrings;
  word: WordResult;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (s: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onPickCandidate: (idx: number) => void;
  onSkip: () => void;
  onRegenerate: () => void;
}) {
  const regenCapped = word.regenCount >= MAX_REGEN_PER_WORD;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Word header */}
      <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-slate-900 truncate">{word.english}</span>
          {word.candidates.length > 0 && (
            <span className="text-xs text-slate-500">· {t.candidatesLabel(word.candidates.length)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={word.regenerating || regenCapped}
            title={regenCapped ? t.regenerateCapReached : t.regenerateThisWord}
            aria-label={t.regenerateThisWord}
            className="p-1.5 rounded-md text-slate-500 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {word.regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onSkip}
            aria-label={t.removeAria}
            title={t.removeAria}
            className={`p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 ${
              word.selectedIdx === null ? "bg-rose-50 text-rose-600" : ""
            }`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidates */}
      {word.candidates.length === 0 ? (
        <div className="px-4 py-3 text-sm text-slate-500 italic">{t.noCandidates}</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {word.candidates.map((cand, idx) => {
            const isPicked = word.selectedIdx === idx;
            return (
              <li
                key={idx}
                className={`px-4 py-2.5 flex items-start gap-3 transition-colors ${
                  isPicked ? "bg-violet-50" : "hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onPickCandidate(idx)}
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isPicked ? "border-violet-600 bg-violet-600" : "border-slate-300"
                  }`}
                  aria-label="Pick candidate"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {isPicked && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="min-w-0 flex-1">
                  {isPicked && isEditing ? (
                    <InlineEditor
                      t={t}
                      value={editingText}
                      onChange={onEditingTextChange}
                      onSave={onSaveEdit}
                      onCancel={onCancelEdit}
                    />
                  ) : (
                    <p className="text-sm text-slate-900 leading-relaxed">
                      {cand.fillBlank}
                      {cand.wasEdited && (
                        <span className="ms-2 text-[10px] font-bold uppercase tracking-wider text-violet-600">edited</span>
                      )}
                    </p>
                  )}
                </div>
                {isPicked && !isEditing && (
                  <button
                    type="button"
                    onClick={onStartEdit}
                    aria-label={t.editAria}
                    title={t.editAria}
                    className="p-1.5 rounded-md text-slate-500 hover:text-violet-600 hover:bg-violet-50 shrink-0"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InlineEditor({
  t,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  t: SentenceGenerationStrings;
  value: string;
  onChange: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
}): ReactNode {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        autoFocus
        placeholder={t.editPlaceholder}
        className="w-full rounded-lg border border-violet-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="px-3 py-1 rounded-md bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
        >
          {t.editSave}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
        >
          {t.editCancel}
        </button>
      </div>
    </div>
  );
}
