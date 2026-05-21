/**
 * LibrarySetsPanel — modal that lists the teacher's saved Vocabulary
 * Sets and adds one's words to the caller's selection on tap.
 *
 * Mounted from WordInputStep2026 (and therefore reachable in the
 * Assignment SetupWizard, Class Show setup, and Worksheet builder).
 * Phase 5: this is the loop-closer that lets saved sets flow back
 * into the surfaces that consume them.
 *
 * Behaviour:
 *   - Lazy-loads the teacher's full set list on first open.
 *   - Two-stage UI: list of sets → tap a set → preview of its words
 *     with an "Add N to selection" button.
 *   - Curriculum-matched words (`curriculum_word_id` non-null) are
 *     mapped to their existing ALL_WORDS entry so audio + level
 *     metadata come along for free. Custom words get a synthesized
 *     numeric id matching the Word interface contract.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowLeft, BookMarked, Plus, Loader2, FileText } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Word } from "../../data/vocabulary";
import {
  listAllSets,
  listSetWords,
  touchSetUsed,
  type VocabularySet,
  type VocabularySetWord,
} from "../../core/vocabularyLibrary";

interface LibrarySetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Words already in the caller's selection — used to compute the
   *  "N new" badge per set and skip duplicates on add. */
  selectedWords: Word[];
  /** Full ALL_WORDS bundle so curriculum-matched library words can be
   *  resolved back to their canonical Word entries (audio, level). */
  allWords: Word[];
  /** Called with the de-duped list of Word objects to merge into the
   *  caller's selection. The picker has already removed duplicates
   *  against `selectedWords`. */
  onAddWords: (words: Word[]) => void;
}

// Stable numeric-id mint for custom library words so they satisfy the
// `Word.id: number` contract without colliding with ALL_WORDS ids
// (which are 0..~6500). 1e8 + hash keeps us well above the curriculum
// range and deterministic per word, so re-picking the same set doesn't
// produce ghost duplicates.
function hashEnglishToId(s: string): number {
  let h = 0;
  const norm = s.toLowerCase().trim();
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) - h + norm.charCodeAt(i)) | 0;
  }
  return 100_000_000 + Math.abs(h);
}

/** Convert a library word row to the Word shape the picker expects. */
function toPickerWord(row: VocabularySetWord, allWordsById: Map<number, Word>): Word {
  if (row.curriculumWordId != null) {
    const canonical = allWordsById.get(row.curriculumWordId);
    if (canonical) return canonical;
  }
  return {
    id: hashEnglishToId(row.english),
    english: row.english,
    hebrew: row.hebrew ?? "",
    arabic: row.arabic ?? "",
    level: "Custom",
    recProd: "Prod",
  };
}

export default function LibrarySetsPanel({
  isOpen,
  onClose,
  selectedWords,
  allWords,
  onAddWords,
}: LibrarySetsPanelProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = useMemo(() => copy[language] ?? copy.en, [language]);

  const [loading, setLoading] = useState(false);
  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);
  const [previewWords, setPreviewWords] = useState<VocabularySetWord[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const allWordsById = useMemo(() => {
    const m = new Map<number, Word>();
    for (const w of allWords) m.set(w.id, w);
    return m;
  }, [allWords]);

  const selectedIds = useMemo(() => new Set(selectedWords.map((w) => w.id)), [selectedWords]);

  // Lazy-load on first open. Re-load on subsequent opens so a set
  // created in another tab shows up too.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch effect; matches existing convention (AdminSecurityView etc.)
    setLoading(true);
    listAllSets()
      .then((rows) => { if (!cancelled) setSets(rows); })
      .catch((err) => { console.warn("[LibrarySetsPanel] listAllSets failed:", err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Reset detail when the panel closes / reopens.
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reset on close; not a render loop trigger
      setSelectedSet(null);
      setPreviewWords(null);
    }
  }, [isOpen]);

  const handleOpenSet = useCallback(async (set: VocabularySet) => {
    setSelectedSet(set);
    setPreviewWords(null);
    setPreviewLoading(true);
    try {
      const rows = await listSetWords(set.id);
      setPreviewWords(rows);
    } catch (err) {
      console.warn("[LibrarySetsPanel] listSetWords failed:", err);
      setPreviewWords([]);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleAddFromPreview = useCallback(() => {
    if (!selectedSet || !previewWords) return;
    setAdding(true);
    try {
      const candidates = previewWords.map((r) => toPickerWord(r, allWordsById));
      const fresh = candidates.filter((w) => !selectedIds.has(w.id));
      onAddWords(fresh);
      // Fire-and-forget — bumps last_used_at so the set surfaces in
      // the library's "Recent" tab next time the teacher visits.
      touchSetUsed(selectedSet.id);
      onClose();
    } finally {
      setAdding(false);
    }
  }, [selectedSet, previewWords, allWordsById, selectedIds, onAddWords, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        dir={dir}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="bg-[var(--vb-surface)] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-4 flex items-center justify-between shrink-0 text-white">
            <div className="flex items-center gap-2">
              {selectedSet && (
                <button
                  type="button"
                  onClick={() => { setSelectedSet(null); setPreviewWords(null); }}
                  aria-label={t.back}
                  className="p-1.5 -ml-1.5 rounded-full hover:bg-white/15"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
                </button>
              )}
              <BookMarked className="w-5 h-5" />
              <span className="font-bold">{selectedSet?.name ?? t.title}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeAria}
              className="p-1.5 -mr-1.5 rounded-full hover:bg-white/15"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* List of sets */}
            {!selectedSet && (
              <div className="p-4">
                {loading ? (
                  <ListSkeleton />
                ) : sets.length === 0 ? (
                  <EmptyState title={t.emptyTitle} blurb={t.emptyBlurb} />
                ) : (
                  <ul className="divide-y divide-[var(--vb-border)]">
                    {sets.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenSet(s)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className={`w-full ${isRTL ? "text-right" : "text-left"} px-3 py-3 hover:bg-[var(--vb-surface-alt)] transition-colors flex items-center gap-3`}
                        >
                          <span className="text-2xl shrink-0" aria-hidden>{s.emoji ?? "📄"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--vb-text-primary)] truncate">{s.name}</p>
                            <p className="text-xs text-[var(--vb-text-secondary)]">{t.setMeta(s.wordCount)}</p>
                          </div>
                          <span className="text-xs text-[var(--vb-text-muted)]">{">"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Detail — preview of one set's words */}
            {selectedSet && (
              <div className="p-4">
                {previewLoading ? (
                  <ListSkeleton />
                ) : previewWords && previewWords.length > 0 ? (
                  <ul className="divide-y divide-[var(--vb-border)]">
                    {previewWords.map((w) => (
                      <li key={w.id} className="px-3 py-2 flex items-center gap-3">
                        <span className="font-mono text-xs text-[var(--vb-text-muted)] w-8">
                          {w.position + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-[var(--vb-text-primary)] truncate">
                            {w.english}
                          </p>
                          {(w.hebrew || w.arabic) && (
                            <p className="text-xs text-[var(--vb-text-secondary)] truncate" dir="auto">
                              {[w.hebrew, w.arabic].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t.emptySetTitle} blurb={t.emptySetBlurb} />
                )}
              </div>
            )}
          </div>

          {/* Footer — Add button shows only on detail view with words */}
          {selectedSet && previewWords && previewWords.length > 0 && (
            <div className="border-t border-[var(--vb-border)] px-5 py-3 bg-[var(--vb-surface-alt)] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[var(--vb-text-secondary)]">
                {t.addCount(previewWords.filter((w) => {
                  const candidate = toPickerWord(w, allWordsById);
                  return !selectedIds.has(candidate.id);
                }).length, previewWords.length)}
              </span>
              <button
                type="button"
                onClick={handleAddFromPreview}
                disabled={adding}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t.addToSelection}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 rounded-lg bg-[var(--vb-surface-alt)] animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 flex items-center justify-center">
        <FileText className="w-7 h-7 text-violet-600" />
      </div>
      <h4 className="mt-3 font-bold text-[var(--vb-text-primary)]">{title}</h4>
      <p className="mt-1 text-sm text-[var(--vb-text-secondary)] max-w-sm mx-auto">{blurb}</p>
    </div>
  );
}

// ─── Locale (inline — small surface, not worth a separate file) ────────────────

const copy = {
  en: {
    title: "Pick from your Library",
    closeAria: "Close",
    back: "Back",
    setMeta: (n: number) => `${n} ${n === 1 ? "word" : "words"}`,
    emptyTitle: "No saved sets yet",
    emptyBlurb: "Build a Vocabulary Set in your Library — then come back here to drop it into this activity.",
    emptySetTitle: "This set is empty",
    emptySetBlurb: "Add words to this set from the Library and try again.",
    addToSelection: "Add to selection",
    addCount: (fresh: number, total: number) =>
      fresh === total
        ? `Adds ${total} ${total === 1 ? "word" : "words"}.`
        : `${fresh} new (${total - fresh} already in your list).`,
  },
  he: {
    title: "בחירה מהספרייה שלך",
    closeAria: "סגור",
    back: "חזרה",
    setMeta: (n: number) => `${n} ${n === 1 ? "מילה" : "מילים"}`,
    emptyTitle: "אין עדיין רשימות שמורות",
    emptyBlurb: "בנו רשימת מילים בספרייה — ואז חזרו לכאן כדי לשבץ אותה בפעילות הזו.",
    emptySetTitle: "הרשימה הזו ריקה",
    emptySetBlurb: "הוסיפו מילים לרשימה מהספרייה ונסו שוב.",
    addToSelection: "הוסף לבחירה",
    addCount: (fresh: number, total: number) =>
      fresh === total
        ? `מוסיף ${total} ${total === 1 ? "מילה" : "מילים"}.`
        : `${fresh} חדשות (${total - fresh} כבר ברשימה).`,
  },
  ar: {
    title: "اختر من مكتبتك",
    closeAria: "إغلاق",
    back: "رجوع",
    setMeta: (n: number) => `${n} ${n === 1 ? "كلمة" : "كلمات"}`,
    emptyTitle: "لا توجد قوائم محفوظة بعد",
    emptyBlurb: "أنشئ قائمة مفردات في مكتبتك — ثم عُد إلى هنا لإدراجها في هذا النشاط.",
    emptySetTitle: "هذه القائمة فارغة",
    emptySetBlurb: "أضف كلمات إلى القائمة من المكتبة وحاول مرة أخرى.",
    addToSelection: "أضف إلى الاختيار",
    addCount: (fresh: number, total: number) =>
      fresh === total
        ? `يُضاف ${total} ${total === 1 ? "كلمة" : "كلمات"}.`
        : `${fresh} جديدة (${total - fresh} موجودة بالفعل في قائمتك).`,
  },
  ru: {
    title: "Pick from your Library",
    closeAria: "Close",
    back: "Back",
    setMeta: (n: number) => `${n} ${n === 1 ? "word" : "words"}`,
    emptyTitle: "No saved sets yet",
    emptyBlurb: "Build a Vocabulary Set in your Library — then come back here to drop it into this activity.",
    emptySetTitle: "This set is empty",
    emptySetBlurb: "Add words to this set from the Library and try again.",
    addToSelection: "Add to selection",
    addCount: (fresh: number, total: number) =>
      fresh === total
        ? `Adds ${total} ${total === 1 ? "word" : "words"}.`
        : `${fresh} new (${total - fresh} already in your list).`,
  },
} as const;
