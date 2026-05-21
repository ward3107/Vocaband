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
import { X, Sparkles, Printer, Send, Pencil, Trash2, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useLanguage } from "../../hooks/useLanguage";
import { setDetailT, type SetDetailStrings } from "../../locales/teacher/vocabulary-library-detail";
import {
  listSetWords,
  listSentencesForSet,
  updateSentenceText,
  deleteSentence,
  type VocabularySet,
  type VocabularySetWord,
  type VocabularySetWordSentence,
} from "../../core/vocabularyLibrary";
import type { ClassData } from "../../core/supabase";
import SentenceGenerationModal from "./SentenceGenerationModal";
import AssignSetToClassModal from "./AssignSetToClassModal";

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

  const handlePrint = useCallback(async () => {
    if (printing || loading) return;
    setPrinting(true);
    try {
      buildAndDownloadPdf({ set, grouped, t });
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
        className="bg-white w-full sm:max-w-3xl rounded-none sm:rounded-3xl shadow-2xl max-h-screen sm:max-h-[92vh] flex flex-col overflow-hidden"
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
        <div className={`px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 shrink-0 ${isRTL ? "justify-end" : ""}`}>
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
            onClick={handlePrint}
            disabled={printing || loading || words.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? t.printingPdf : t.actionPrint}
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            disabled={loading || words.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Send className="w-4 h-4" /> {t.actionAssign}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
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
      <p className="font-bold text-slate-900">{t.emptyWordsTitle}</p>
      <p className="mt-1 text-sm text-slate-600 max-w-sm mx-auto">{t.emptyWordsBody}</p>
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
}) {
  const { word, fillBlank, sentence } = group;
  const hasAny = fillBlank || sentence;
  return (
    <li className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <span className="font-bold text-slate-900">{word.english}</span>
        {(word.hebrew || word.arabic) && (
          <span className="text-xs text-slate-500" dir="auto">
            {[word.hebrew, word.arabic].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-100">
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
        {!hasAny && (
          <div className="px-4 py-3 text-sm text-slate-500 italic">
            <span className="font-semibold not-italic">{t.noSentencesYet}.</span> {t.noSentencesYetHint}
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5 shrink-0 w-10">{label}</span>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              rows={2}
              autoFocus
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
                className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                {t.cancelEdit}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-900 leading-relaxed break-words">
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
            className="p-1.5 rounded-md text-slate-500 hover:text-violet-600 hover:bg-violet-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.deleteAria}
            title={t.deleteAria}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
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

function buildAndDownloadPdf({
  set,
  grouped,
  t,
}: {
  set: VocabularySet;
  grouped: WordWithSentences[];
  t: SetDetailStrings;
}): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 18;

  // ── Page 1 header ──────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(t.pdfTitle(set.name), margin, 22);

  const today = new Date().toLocaleDateString();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(110);
  pdf.text(`${t.pdfDateLabel} ${today}`, margin, 30);
  pdf.text(`${t.pdfNameLabel} ________________________________`, pageWidth - margin, 30, { align: "right" });

  // ── Section 1: Vocabulary table ────────────────────────────────────
  pdf.setFontSize(12);
  pdf.setTextColor(40);
  pdf.setFont("helvetica", "bold");
  pdf.text(t.pdfSectionVocabulary, margin, 42);

  autoTable(pdf, {
    startY: 46,
    margin: { left: margin, right: margin },
    head: [["#", "English", "Hebrew", "Arabic"]],
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    body: grouped.map((g, i) => [
      String(i + 1),
      g.word.english,
      g.word.hebrew ?? "",
      g.word.arabic ?? "",
    ]),
    styles: { fontSize: 10, cellPadding: 2.2 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ── Section 2: Fill-in-the-blank (new page if there are sentences) ─
  const fillRows = grouped
    .map((g, idx) => ({ idx, g }))
    .filter((x) => x.g.fillBlank !== null);

  if (fillRows.length > 0) {
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(40);
    pdf.text(t.pdfSectionFillBlank, margin, 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(110);
    pdf.text(`${t.pdfNameLabel} ________________________________`, margin, 30);

    autoTable(pdf, {
      startY: 38,
      margin: { left: margin, right: margin },
      body: fillRows.map((r, i) => [
        String(i + 1),
        r.g.fillBlank?.text ?? "",
      ]),
      styles: { fontSize: 11, cellPadding: 3, valign: "top" },
      columnStyles: {
        0: { halign: "center", cellWidth: 10, fontStyle: "bold", textColor: 80 },
      },
      didDrawCell: (data) => {
        // Light hairline under each row so students have a visual guide.
        if (data.column.index === 1 && data.section === "body") {
          const y = data.cell.y + data.cell.height;
          pdf.setDrawColor(220);
          pdf.line(data.cell.x, y, data.cell.x + data.cell.width, y);
        }
      },
    });

    // ── Section 3: Answer key on its own page ───────────────────────
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(40);
    pdf.text(t.pdfSectionAnswers, margin, 22);

    autoTable(pdf, {
      startY: 30,
      margin: { left: margin, right: margin },
      head: [["#", "Word", "Sentence"]],
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
      body: fillRows.map((r, i) => [
        String(i + 1),
        r.g.word.english,
        r.g.sentence?.text ?? r.g.fillBlank?.text.replace(/_+/g, r.g.word.english) ?? "",
      ]),
      styles: { fontSize: 10, cellPadding: 2.4 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { fontStyle: "bold", cellWidth: 35 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Footer on every page.
  const pageCount = pdf.getNumberOfPages();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(160);
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.text(t.pdfFooter, pageWidth / 2, pageHeight - 8, { align: "center" });
    pdf.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  pdf.save(`${safeFilename(set.name)}.pdf`);
}
