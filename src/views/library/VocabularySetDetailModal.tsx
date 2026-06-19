/**
 * VocabularySetDetailModal — full-screen view of one saved Set.
 *
 * Shows:
 *   - Words list (English + HE + AR) with their saved primary
 *     fill-in-the-blank + full-sentence rows.
 *   - Inline edit / delete per sentence.
 *   - Header actions: Generate sentences (opens the sentence-gen
 *     modal), Print as worksheet (jsPDF), Assign to a class (placeholder
 *     in this PR — wired in the follow-up).
 *
 * Mounted from VocabularyLibraryView on SetCard tap. Replaces the
 * earlier "card → sentence-gen modal" shortcut so the teacher first
 * lands on a navigable detail page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Printer, Send, Pencil, Trash2, Loader2, ListChecks, RefreshCcw } from "lucide-react";
import { fetchPdfBlob } from "../../lib/pdf/requestWorksheetPdf";
import { useLanguage } from "../../hooks/useLanguage";
import { setDetailT, type SetDetailStrings } from "../../locales/teacher/vocabulary-library-detail";
import {
  listSetWords,
  listSentencesForSet,
  updateSentenceText,
  deleteSentence,
  getDistractorsFromMetadata,
  type VocabularySet,
  type VocabularySetWord,
  type VocabularySetWordSentence,
} from "../../core/vocabularyLibrary";
import { supabase, type ClassData } from "../../core/supabase";
import SentenceGenerationModal from "./SentenceGenerationModal";
import AssignSetToClassModal from "./AssignSetToClassModal";

interface McqApiWordResult {
  wordId: string;
  english: string;
  distractors: string[];
}

/** POST /api/library/generate-distractors. Server-side validates ownership,
 *  rate limits via ai_usage_counters, and writes distractors to each
 *  word's metadata.distractors. Returns the results so the client can
 *  show them without an extra refetch. */
async function callGenerateDistractors(
  setId: string,
  wordIds?: string[],
): Promise<{ wordResults: McqApiWordResult[] } | { error: string; status: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: "Not authenticated", status: 401 };
  const res = await fetch("/api/library/generate-distractors", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ setId, level: "A2", ...(wordIds ? { wordIds } : {}) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "" }));
    return { error: body?.error || `Request failed (${res.status})`, status: res.status };
  }
  return (await res.json()) as { wordResults: McqApiWordResult[] };
}

interface VocabularySetDetailModalProps {
  set: VocabularySet;
  /** Teacher's classes — passed down so the Assign action can render
   *  its class picker. Empty array is fine; the button stays enabled
   *  and the modal shows a "create a class first" empty state. */
  classes?: ClassData[];
  onClose: () => void;
  /** Fired when something changed (sentence edited/deleted, sentences
   *  generated). Parent uses it to refresh its list view. */
  onChanged: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

/** Sentence rows grouped by word id (primary fill_blank + primary
 *  sentence each, when present). Non-primary history rows are kept in
 *  the DB but hidden from this view. */
interface WordWithSentences {
  word: VocabularySetWord;
  fillBlank: VocabularySetWordSentence | null;
  sentence: VocabularySetWordSentence | null;
}

/** Filename safety: keep alphanum + dash + underscore. Prevents path
 *  traversal and weird OS rejections on download. */
function safeFilename(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9֐-׿؀-ۿЀ-ӿ -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "vocabulary-set";
}

export default function VocabularySetDetailModal({
  set,
  classes = [],
  onClose,
  onChanged,
  showToast,
}: VocabularySetDetailModalProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = useMemo(() => setDetailT[language], [language]);

  const [words, setWords] = useState<VocabularySetWord[]>([]);
  const [sentences, setSentences] = useState<VocabularySetWordSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSentenceGen, setShowSentenceGen] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [generatingMcq, setGeneratingMcq] = useState(false);
  /** wordId currently regenerating its MCQ row. */
  const [regeneratingMcqId, setRegeneratingMcqId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s] = await Promise.all([
        listSetWords(set.id),
        listSentencesForSet(set.id),
      ]);
      setWords(w);
      setSentences(s);
    } catch {
      showToast(t.errorLoad, "error");
    } finally {
      setLoading(false);
    }
  }, [set.id, showToast, t.errorLoad]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch effect; same pattern as VocabularyLibraryView
    void refresh();
  }, [refresh]);

  /** Group sentences by word, keeping only primary rows of each kind.
   *  The DB partial-unique index guarantees at most one primary per
   *  (word, kind) pair, so this is a safe assumption. */
  const grouped: WordWithSentences[] = useMemo(() => {
    const byWord = new Map<string, { fillBlank: VocabularySetWordSentence | null; sentence: VocabularySetWordSentence | null }>();
    for (const s of sentences) {
      if (!s.isPrimary) continue;
      const entry = byWord.get(s.wordId) ?? { fillBlank: null, sentence: null };
      if (s.kind === "fill_blank") entry.fillBlank = s;
      else entry.sentence = s;
      byWord.set(s.wordId, entry);
    }
    return words.map((w) => ({
      word: w,
      fillBlank: byWord.get(w.id)?.fillBlank ?? null,
      sentence: byWord.get(w.id)?.sentence ?? null,
    }));
  }, [words, sentences]);

  const handleStartEdit = useCallback((s: VocabularySetWordSentence) => {
    setEditingId(s.id);
    setEditingText(s.text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    const text = editingText.trim();
    if (text.length === 0) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await updateSentenceText(editingId, text);
      setSentences((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(t.toastSentenceUpdated, "success");
      setEditingId(null);
      onChanged();
    } catch {
      showToast(t.errorUpdate, "error");
    }
  }, [editingId, editingText, showToast, t.toastSentenceUpdated, t.errorUpdate, onChanged]);

  const handleDelete = useCallback(async (sentenceId: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteSentence(sentenceId);
      setSentences((prev) => prev.filter((s) => s.id !== sentenceId));
      showToast(t.toastSentenceDeleted, "success");
      onChanged();
    } catch {
      showToast(t.errorDelete, "error");
    }
  }, [t.confirmDelete, t.toastSentenceDeleted, t.errorDelete, showToast, onChanged]);

  const handleGenerateMcq = useCallback(async (wordId?: string) => {
    if (wordId) {
      setRegeneratingMcqId(wordId);
    } else {
      if (generatingMcq) return;
      setGeneratingMcq(true);
    }
    try {
      const out = await callGenerateDistractors(set.id, wordId ? [wordId] : undefined);
      if ("error" in out) {
        showToast(out.status === 429 ? t.errorMcq : t.errorMcq, "error");
        return;
      }
      // The server already persisted into each word's metadata. Refresh
      // the words list so the UI picks up distractors without a full
      // reload of sentences.
      try {
        const fresh = await listSetWords(set.id);
        setWords(fresh);
      } catch {
        // listSetWords failure is mostly cosmetic — the data is in the
        // DB, the UI just won't reflect it until next mount.
      }
      if (!wordId) {
        showToast(t.toastMcqGenerated(out.wordResults.filter((r) => r.distractors.length === 3).length), "success");
      }
      onChanged();
    } finally {
      if (wordId) {
        setRegeneratingMcqId(null);
      } else {
        setGeneratingMcq(false);
      }
    }
  }, [generatingMcq, set.id, showToast, t, onChanged]);

  const handlePrint = useCallback(async () => {
    if (printing || loading) return;
    setPrinting(true);
    try {
      await buildAndDownloadPdf({ set, grouped, t });
    } catch (err) {
      console.warn("[VocabularySetDetailModal] PDF gen failed:", err);
      showToast(t.errorPrint, "error");
    } finally {
      setPrinting(false);
    }
  }, [printing, loading, set, grouped, t, showToast]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={dir}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={set.name}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 240 }}
        style={{ backgroundColor: 'var(--vb-surface)' }}
        className="w-full sm:max-w-3xl rounded-none sm:rounded-3xl shadow-2xl max-h-screen sm:max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-4 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden>{set.emoji ?? "📄"}</span>
            <div className="min-w-0">
              <h2 className="font-bold text-lg truncate">{set.name}</h2>
              <p className="text-xs text-white/85">{t.wordsHeading(set.wordCount)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-white/15 shrink-0"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-2 shrink-0 ${isRTL ? "justify-end" : ""}`} style={{ borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface-alt)' }}>
          <button
            type="button"
            onClick={() => setShowSentenceGen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Sparkles className="w-4 h-4" /> {t.actionGenerate}
          </button>
          <button
            type="button"
            onClick={() => handleGenerateMcq()}
            disabled={generatingMcq || loading || words.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-secondary)' }}
          >
            {generatingMcq ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
            {generatingMcq ? t.generatingMcq : t.actionMcq}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing || loading || words.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-secondary)' }}
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? t.printingPdf : t.actionPrint}
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            disabled={loading || words.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-secondary)' }}
          >
            <Send className="w-4 h-4" /> {t.actionAssign}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--vb-surface-alt)' }} />
              ))}
            </div>
          ) : words.length === 0 ? (
            <EmptyWords t={t} />
          ) : (
            <ul className="space-y-3">
              {grouped.map((g) => (
                <WordRow
                  key={g.word.id}
                  t={t}
                  group={g}
                  editingId={editingId}
                  editingText={editingText}
                  onEditingTextChange={setEditingText}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onDelete={handleDelete}
                  regeneratingMcq={regeneratingMcqId === g.word.id}
                  onRegenerateMcq={() => handleGenerateMcq(g.word.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showSentenceGen && (
          <SentenceGenerationModal
            key="sgen-from-detail"
            set={set}
            onClose={() => setShowSentenceGen(false)}
            onSaved={() => { setShowSentenceGen(false); void refresh(); onChanged(); }}
            showToast={showToast}
          />
        )}
        {showAssignModal && (
          <AssignSetToClassModal
            key="assign-from-detail"
            set={set}
            classes={classes}
            onClose={() => setShowAssignModal(false)}
            onAssigned={() => { setShowAssignModal(false); onChanged(); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function EmptyWords({ t }: { t: SetDetailStrings }) {
  return (
    <div className="text-center py-10">
      <p className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>{t.emptyWordsTitle}</p>
      <p className="mt-1 text-sm max-w-sm mx-auto" style={{ color: 'var(--vb-text-secondary)' }}>{t.emptyWordsBody}</p>
    </div>
  );
}

function WordRow({
  t,
  group,
  editingId,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  regeneratingMcq,
  onRegenerateMcq,
}: {
  t: SetDetailStrings;
  group: WordWithSentences;
  editingId: string | null;
  editingText: string;
  onEditingTextChange: (s: string) => void;
  onStartEdit: (s: VocabularySetWordSentence) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  regeneratingMcq: boolean;
  onRegenerateMcq: () => void;
}) {
  const { word, fillBlank, sentence } = group;
  const hasAny = fillBlank || sentence;
  const distractors = getDistractorsFromMetadata(word.metadata);
  return (
    <li className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface)' }}>
      <div className="px-4 py-2.5 border-b flex items-center gap-3" style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}>
        <span className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>{word.english}</span>
        {(word.hebrew || word.arabic) && (
          <span className="text-xs" style={{ color: 'var(--vb-text-muted)' }} dir="auto">
            {[word.hebrew, word.arabic].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--vb-border)' }}>
        {fillBlank && (
          <SentenceRow
            t={t}
            sentence={fillBlank}
            label={t.fillBlankLabel}
            isEditing={editingId === fillBlank.id}
            editingText={editingText}
            onEditingTextChange={onEditingTextChange}
            onStartEdit={() => onStartEdit(fillBlank)}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(fillBlank.id)}
          />
        )}
        {sentence && (
          <SentenceRow
            t={t}
            sentence={sentence}
            label={t.fullSentenceLabel}
            isEditing={editingId === sentence.id}
            editingText={editingText}
            onEditingTextChange={onEditingTextChange}
            onStartEdit={() => onStartEdit(sentence)}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(sentence.id)}
          />
        )}
        {!hasAny && !distractors && (
          <div className="px-4 py-3 text-sm italic" style={{ color: 'var(--vb-text-muted)' }}>
            <span className="font-semibold not-italic">{t.noSentencesYet}.</span> {t.noSentencesYetHint}
          </div>
        )}
        {distractors && distractors.length > 0 && (
          <div className="px-4 py-2.5 flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 shrink-0 w-10" style={{ color: 'var(--vb-text-muted)' }}>
              {t.distractorsLabel}
            </span>
            <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
              {/* The target word is rendered as the "correct" chip
                  alongside the distractors so the teacher can
                  visualise the MCQ at a glance. */}
              <span className="inline-flex items-center text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1">
                {word.english}
              </span>
              {distractors.map((d, i) => (
                <span key={i} className="inline-flex items-center text-xs rounded-full px-2.5 py-1" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}>
                  {d}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={onRegenerateMcq}
              disabled={regeneratingMcq}
              aria-label={t.regenerateMcqAria}
              title={t.regenerateMcqAria}
              className="p-1.5 rounded-md hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 shrink-0"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: 'var(--vb-text-muted)' }}
            >
              {regeneratingMcq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function SentenceRow({
  t,
  sentence,
  label,
  isEditing,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  t: SetDetailStrings;
  sentence: VocabularySetWordSentence;
  label: string;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (s: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-4 py-2.5 flex items-start gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 w-10" style={{ color: 'var(--vb-text-muted)' }}>{label}</span>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              rows={2}
              autoFocus
              style={{ backgroundColor: 'var(--vb-surface)', color: 'var(--vb-text-primary)' }}
              className="w-full rounded-lg border border-violet-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSaveEdit}
                className="px-3 py-1 rounded-md bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
              >
                {t.saveEdit}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
                className="px-3 py-1 rounded-md text-xs font-semibold hover:opacity-90"
              >
                {t.cancelEdit}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--vb-text-primary)' }}>
            {sentence.text}
            {sentence.wasEdited && (
              <span className="ms-2 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                {t.editedBadge}
              </span>
            )}
          </p>
        )}
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={t.editAria}
            title={t.editAria}
            className="p-1.5 rounded-md hover:text-violet-600 hover:bg-violet-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: 'var(--vb-text-muted)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.deleteAria}
            title={t.deleteAria}
            className="p-1.5 rounded-md hover:text-rose-600 hover:bg-rose-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: 'var(--vb-text-muted)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PDF generation ─────────────────────────────────────────────────────────
// Built inline (instead of a separate util) because the PDF layout
// depends on the same locale + grouping shape used in render. Keeping
// the function next to the modal that owns it avoids an import dance
// for what's effectively view-layer code.

const escHtml = (s: string | null | undefined): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Build the worksheet as self-contained print HTML. Chromium (server-side)
// shapes Hebrew/Arabic natively — no jsPDF, no fixRtl/arabicShaper hacks.
function buildSetWorksheetHtml({
  set,
  grouped,
  t,
}: {
  set: VocabularySet;
  grouped: WordWithSentences[];
  t: SetDetailStrings;
}): string {
  const today = new Date().toLocaleDateString();
  const nameLine = `${escHtml(t.pdfNameLabel)} ________________________________`;

  const fillRows = grouped
    .map((g, idx) => ({ idx, g }))
    .filter((x) => x.g.fillBlank !== null);
  const mcqRows = fillRows
    .map((r) => {
      const d = getDistractorsFromMetadata(r.g.word.metadata);
      return d && d.length === 3 ? { ...r, distractors: d } : null;
    })
    .filter((x): x is typeof fillRows[number] & { distractors: string[] } => x !== null);

  const sheets: string[] = [];

  // Section 1: vocabulary table.
  sheets.push(`
    <h1>${escHtml(t.pdfTitle(set.name))}</h1>
    <div class="meta"><span>${escHtml(t.pdfDateLabel)} ${escHtml(today)}</span><span>${nameLine}</span></div>
    <div class="sec">${escHtml(t.pdfSectionVocabulary)}</div>
    <table>
      <thead><tr><th class="num">#</th><th>English</th><th>Hebrew</th><th>Arabic</th></tr></thead>
      <tbody>${grouped
        .map(
          (g, i) => `<tr><td class="num">${i + 1}</td><td class="b">${escHtml(g.word.english)}</td><td class="he" dir="rtl">${escHtml(g.word.hebrew)}</td><td class="ar" dir="rtl">${escHtml(g.word.arabic)}</td></tr>`,
        )
        .join("")}</tbody>
    </table>`);

  // Section 2: fill-in-the-blank.
  if (fillRows.length > 0) {
    sheets.push(`
      <div class="sec">${escHtml(t.pdfSectionFillBlank)}</div>
      <div class="meta"><span>${nameLine}</span></div>
      <table class="lined"><tbody>${fillRows
        .map(
          (r, i) => `<tr><td class="num">${i + 1}</td><td>${escHtml(r.g.fillBlank?.text)}</td></tr>`,
        )
        .join("")}</tbody></table>`);
  }

  // Section 3: multiple-choice (only when distractors exist).
  if (mcqRows.length > 0) {
    sheets.push(`
      <div class="sec">${escHtml(t.pdfSectionMcq)}</div>
      <div class="meta"><span>${escHtml(t.pdfMcqInstructions)}</span></div>
      <div class="meta"><span>${nameLine}</span></div>
      ${mcqRows
        .map((r, i) => {
          // Stable rotation so the same set always prints the same order.
          const seed = (r.g.word.english.charCodeAt(0) + i) % 4;
          const opts = [r.g.word.english, ...r.distractors];
          const rotated = [...opts.slice(seed), ...opts.slice(0, seed)];
          const labelled = rotated
            .map((w, j) => `(${"abcd"[j]}) ${escHtml(w)}`)
            .join("&nbsp;&nbsp;&nbsp;");
          return `<div class="mcq-q"><b>${i + 1}.</b> ${escHtml(r.g.fillBlank?.text)}</div><div class="mcq-o">${labelled}</div>`;
        })
        .join("")}`);
  }

  // Section 4: answer key.
  if (fillRows.length > 0) {
    sheets.push(`
      <div class="sec">${escHtml(t.pdfSectionAnswers)}</div>
      <table>
        <thead><tr><th class="num">#</th><th>Word</th><th>Sentence</th></tr></thead>
        <tbody>${fillRows
          .map((r, i) => {
            const sentence =
              r.g.sentence?.text ??
              r.g.fillBlank?.text.replace(/_+/g, r.g.word.english) ??
              "";
            return `<tr><td class="num">${i + 1}</td><td class="b">${escHtml(r.g.word.english)}</td><td>${escHtml(sentence)}</td></tr>`;
          })
          .join("")}</tbody>
      </table>`);
  }

  const total = sheets.length;
  const body = sheets
    .map(
      (inner, i) =>
        `<div class="sheet">${inner}<div class="foot"><span>${escHtml(t.pdfFooter)}</span><span>${i + 1} / ${total}</span></div></div>`,
    )
    .join("");

  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=Heebo:wght@400;700&family=Cairo:wght@400;700&display=swap">
<style>
  *{box-sizing:border-box}
  .sheet{width:210mm;min-height:297mm;padding:18mm;page-break-after:always;position:relative;font-family:'Inter',sans-serif;color:#1e293b}
  .sheet:last-child{page-break-after:auto}
  h1{font-size:20pt;margin:0 0 3mm;font-weight:800}
  .meta{display:flex;justify-content:space-between;gap:8mm;color:#6b7280;font-size:10pt;margin-bottom:4mm}
  .sec{font-size:13pt;font-weight:800;color:#283042;margin:6mm 0 3mm}
  table{width:100%;border-collapse:collapse;font-size:10pt}
  th{background:#6366f1;color:#fff;padding:2.4mm;text-align:left;font-weight:700}
  td{padding:2.2mm;border-bottom:1px solid #eef2f7;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .num{text-align:center;width:9mm;font-weight:700;color:#6b7280}
  .b{font-weight:700}
  .he{font-family:'Heebo',sans-serif;text-align:right;font-size:12pt;color:#5b21b6}
  .ar{font-family:'Cairo',sans-serif;text-align:right;font-size:12pt;color:#be185d}
  table.lined td{padding:5mm 2mm;border-bottom:1px solid #d6d9e0}
  .mcq-q{font-size:11pt;margin:4mm 0 1mm}
  .mcq-o{background:#f8fafc;color:#3c3c50;font-size:10pt;padding:1.5mm 4mm 4mm}
  .foot{position:absolute;bottom:8mm;left:18mm;right:18mm;display:flex;justify-content:space-between;color:#9ca3af;font-size:8pt}
</style>
${body}`;
}

async function buildAndDownloadPdf({
  set,
  grouped,
  t,
}: {
  set: VocabularySet;
  grouped: WordWithSentences[];
  t: SetDetailStrings;
}): Promise<void> {
  const html = buildSetWorksheetHtml({ set, grouped, t });
  const blob = await fetchPdfBlob({ kind: "html", html, orientation: "portrait" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(set.name)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
