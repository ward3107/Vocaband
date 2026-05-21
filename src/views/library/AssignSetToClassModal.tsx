/**
 * AssignSetToClassModal — turns a saved Vocabulary Set into an
 * Assignment for a chosen class.
 *
 * Opened from VocabularySetDetailModal's Send button (was disabled
 * "Coming next" placeholder in the previous PR).
 *
 * Conversion: library words → assignments.word_ids + assignments.words.
 * Curriculum-matched library words (`curriculum_word_id` non-null) get
 * mapped back to their canonical ALL_WORDS Word entry so shared audio +
 * level metadata flow into the assignment. Custom library words get a
 * synthesized numeric id (stable hash, above the ALL_WORDS range) and
 * are written as level: 'Custom' rows.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Loader2, Check, Users, Languages } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { supabase, type ClassData } from "../../core/supabase";
import {
  listSetWords,
  touchSetUsed,
  type VocabularySet,
  type VocabularySetWord,
} from "../../core/vocabularyLibrary";
import type { Word } from "../../data/vocabulary";
import { getCachedVocabulary } from "../../hooks/useVocabularyLazy";
import { assignSetT } from "../../locales/teacher/vocabulary-library-assign";

interface AssignSetToClassModalProps {
  set: VocabularySet;
  classes: ClassData[];
  onClose: () => void;
  onAssigned: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

/** Stable, deterministic numeric id for custom library words. Lives
 *  above the ALL_WORDS curriculum range (~6,500) so it never collides
 *  with built-in ids. Same scheme used in LibrarySetsPanel. */
function hashEnglishToId(s: string): number {
  let h = 0;
  const norm = s.toLowerCase().trim();
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) - h + norm.charCodeAt(i)) | 0;
  }
  return 100_000_000 + Math.abs(h);
}

function libraryWordToAssignmentWord(
  row: VocabularySetWord,
  allWordsById: Map<number, Word>,
): Word {
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

export default function AssignSetToClassModal({
  set,
  classes,
  onClose,
  onAssigned,
  showToast,
}: AssignSetToClassModalProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = useMemo(() => assignSetT[language], [language]);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    classes.length === 1 ? classes[0].id : null,
  );
  const [title, setTitle] = useState(set.name);
  const [deadline, setDeadline] = useState<string>("");
  // Which translation(s) the assignment will carry. Defaults to "both" so
  // existing teacher muscle memory (today everything ships with both)
  // stays unchanged.
  const [translations, setTranslations] = useState<"hebrew" | "arabic" | "both">("both");
  const [busy, setBusy] = useState(false);
  const [words, setWords] = useState<VocabularySetWord[] | null>(null);

  // Lazy-load the set's words on open so we can snapshot them into the
  // assignment row. Cached locally; we don't refetch on retries.
  useEffect(() => {
    let cancelled = false;
    listSetWords(set.id)
      .then((rows) => { if (!cancelled) setWords(rows); })
      .catch((err) => {
        console.warn("[AssignSetToClassModal] words fetch failed:", err);
        if (!cancelled) setWords([]);
      });
    return () => { cancelled = true; };
  }, [set.id]);

  const handleSubmit = useCallback(async () => {
    if (!selectedClassId) {
      showToast(t.errorNoClass, "error");
      return;
    }
    if (!title.trim()) {
      showToast(t.errorNoTitle, "error");
      return;
    }
    if (!words) return; // still loading
    const klass = classes.find((c) => c.id === selectedClassId);
    if (!klass) return;

    setBusy(true);
    try {
      const cached = getCachedVocabulary();
      const allWordsById = new Map<number, Word>();
      for (const w of cached?.ALL_WORDS ?? []) allWordsById.set(w.id, w);

      const rawAssignmentWords = words.map((w) => libraryWordToAssignmentWord(w, allWordsById));
      // Strip the un-selected translation so students only see the one
      // the teacher picked. Curriculum-canonical words get a shallow
      // clone first — they're shared singletons in the ALL_WORDS cache
      // and mutating them would poison every other view.
      const assignmentWords = rawAssignmentWords.map((w) => {
        if (translations === "both") return w;
        return {
          ...w,
          hebrew: translations === "hebrew" ? w.hebrew : "",
          arabic: translations === "arabic" ? w.arabic : "",
        };
      });
      // word_ids only carries IDs that resolve in ALL_WORDS — keeps the
      // gradebook + analytics RPCs (which join against ALL_WORDS) clean.
      const wordIds = assignmentWords
        .filter((w) => w.level !== "Custom")
        .map((w) => w.id);

      const { error } = await supabase
        .from("assignments")
        .insert({
          class_id: klass.id,
          word_ids: wordIds,
          words: assignmentWords,
          title: title.trim(),
          deadline: deadline || null,
          allowed_modes: null,
          subject: klass.subject ?? "english",
        });

      if (error) {
        console.warn("[AssignSetToClassModal] insert failed:", error.message);
        showToast(t.errorCreate, "error");
        return;
      }

      // Mark the set as recently used so it surfaces in the library's
      // Recent tab next time. Fire-and-forget.
      touchSetUsed(set.id);

      showToast(t.toastAssigned(klass.name), "success");
      onAssigned();
    } catch (err) {
      console.warn("[AssignSetToClassModal] insert threw:", err);
      showToast(t.errorCreate, "error");
    } finally {
      setBusy(false);
    }
  }, [selectedClassId, title, deadline, translations, words, classes, set.id, showToast, t, onAssigned]);

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
        aria-label={t.modalTitle(set.name)}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-4 flex items-center justify-between gap-3 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Send className="w-5 h-5 shrink-0" />
              <span className="font-bold truncate">{t.modalTitle(set.name)}</span>
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
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
            {/* Class picker */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                {t.pickClassHeading}
              </h3>
              {classes.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">{t.pickClassEmpty}</p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {classes.map((c) => {
                    const isActive = selectedClassId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedClassId(c.id)}
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          className={`w-full ${isRTL ? "text-right" : "text-left"} rounded-xl border p-3 flex items-center gap-3 transition-all ${
                            isActive
                              ? "border-violet-500 bg-violet-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isActive ? "border-violet-600 bg-violet-600" : "border-slate-300"
                            }`}
                          >
                            {isActive && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-xl shrink-0" aria-hidden>
                            {c.avatar ?? "🎓"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{t.classMetaRow(c.code)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Title */}
            <section>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.titleLabel}
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  maxLength={100}
                />
              </label>
            </section>

            {/* Translation language */}
            <section>
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.translationsHeading}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.translationsHint}</p>
              <div
                role="radiogroup"
                aria-label={t.translationsHeading}
                className={`mt-2 flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {(
                  [
                    { id: "hebrew", label: t.translationHebrew },
                    { id: "arabic", label: t.translationArabic },
                    { id: "both", label: t.translationBoth },
                  ] as const
                ).map((opt) => {
                  const active = translations === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTranslations(opt.id)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        active
                          ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Deadline */}
            <section>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.deadlineLabel}
                </span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">{t.deadlineHint}</p>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-5 sm:px-6 py-3 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-sm font-semibold text-slate-600 hover:underline disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || classes.length === 0 || !selectedClassId || !title.trim() || words === null}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {busy ? t.assigning : t.assign}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
