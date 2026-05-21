/**
 * SetBuildWizard — unified "create a vocabulary set" modal flow.
 *
 * Phase 4d simplification: two source modes only.
 *   - 📋 Type or paste — one textarea, teacher types or pastes a list
 *   - 📷 Photo or image — file picker (camera, gallery, screenshot…)
 *                          → /api/ocr → auto-translate
 *
 * Phases 3's Manual mode was removed (paste already covers typing).
 * Phase 3's "Soon" tiles (Upload, AI from topic, From curriculum) were
 * removed too — Photo + paste already cover every realistic teacher
 * workflow, so the wizard no longer promises features we won't build.
 */
import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ArrowLeft, Clipboard, Camera, Sparkles, Trash2, Loader2,
} from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useTranslate } from "../../hooks/useTranslate";
import { setBuildWizardT } from "../../locales/teacher/vocabulary-library-build";
import { vocabularyLibraryT } from "../../locales/teacher/vocabulary-library";
import { postOcrImage, isPostOcrImageError } from "../../utils/postOcrImage";
import { createSet, addWordsToSet } from "../../core/vocabularyLibrary";
import { type AppUser } from "../../core/supabase";

type Step = "pick-source" | "paste" | "photo";
type ActiveMode = "paste" | "ocr_image";

/** A row in the words-review table. Local-only — gets mapped to the
 *  DB row shape at save time. */
interface WordRow {
  english: string;
  hebrew: string;
  arabic: string;
}

interface SetBuildWizardProps {
  user: AppUser;
  /** Pre-select this collection so the new Set lands inside it. Null =
   *  unfiled (root of the library). */
  collectionId: string | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function SetBuildWizard({
  user,
  collectionId,
  onClose,
  onSaved,
  showToast,
}: SetBuildWizardProps) {
  const { language, isRTL, dir } = useLanguage();
  const t = useMemo(() => setBuildWizardT[language], [language]);
  const libT = useMemo(() => vocabularyLibraryT[language], [language]);
  const { translateWordsBatch } = useTranslate();

  const [step, setStep] = useState<Step>("pick-source");
  const [setName, setSetName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [extractedWords, setExtractedWords] = useState<WordRow[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-fill the set name with a sensible default once the teacher
  // commits to a mode, so saving without typing still produces a
  // descriptive name. Teacher edits override this.
  const handlePickMode = useCallback((next: Step) => {
    const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!setName.trim()) {
      if (next === "paste") setSetName(t.defaultSetNamePaste(today));
      else if (next === "photo") setSetName(t.defaultSetNamePhoto(today));
    }
    setStep(next);
  }, [setName, t]);

  // ─── Mode: Paste ─────────────────────────────────────────────────
  const handlePasteExtract = useCallback(async () => {
    if (!pasteText.trim()) return;
    setExtracting(true);
    try {
      const raw = pasteText
        .split(/[\n,;]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && w.length < 80);
      const dedup = Array.from(new Set(raw));
      if (dedup.length === 0) {
        showToast(t.errorExtract, "error");
        return;
      }
      const translations = await translateWordsBatch(dedup);
      const rows: WordRow[] = dedup.map((w) => {
        const tr = translations.get(w.toLowerCase());
        return { english: w, hebrew: tr?.hebrew || "", arabic: tr?.arabic || "" };
      });
      setExtractedWords(rows);
    } catch (err) {
      console.warn("[SetBuildWizard] paste extract failed:", err);
      showToast(t.errorExtract, "error");
    } finally {
      setExtracting(false);
    }
  }, [pasteText, translateWordsBatch, showToast, t.errorExtract]);

  // ─── Mode: Photo ─────────────────────────────────────────────────
  const handlePhotoFile = useCallback(async (file: File) => {
    setExtracting(true);
    setPhotoStatus(t.photoStatusCompressing);
    try {
      const result = await postOcrImage(file, "en", {
        onStatus: setPhotoStatus,
      });
      if (result.words.length === 0) {
        showToast(t.photoNoWords, "error");
        return;
      }
      setPhotoStatus(t.photoStatusTranslating);
      const translations = await translateWordsBatch(result.words);
      const rows: WordRow[] = result.words.map((w) => {
        const tr = translations.get(w.toLowerCase().trim());
        return { english: w, hebrew: tr?.hebrew || "", arabic: tr?.arabic || "" };
      });
      setExtractedWords(rows);
    } catch (err) {
      if (isPostOcrImageError(err)) {
        showToast(err.message, "error");
      } else {
        showToast(t.errorExtract, "error");
      }
    } finally {
      setExtracting(false);
      setPhotoStatus("");
    }
  }, [t, translateWordsBatch, showToast]);

  // Clear extracted words when user goes back to pick-source so they
  // don't bleed across modes.
  const backToSource = useCallback(() => {
    setStep("pick-source");
    setExtractedWords([]);
    setPasteText("");
    setPhotoStatus("");
  }, []);

  // ─── Save ────────────────────────────────────────────────────────
  const handleSave = useCallback(async (mode: ActiveMode) => {
    const words = extractedWords
      .filter((r) => r.english.trim().length > 0)
      .map((r, idx) => ({
        position: idx,
        english: r.english.trim(),
        hebrew: r.hebrew.trim() || null,
        arabic: r.arabic.trim() || null,
        partOfSpeech: null,
        difficulty: null,
        curriculumWordId: null,
        audioUrl: null,
        metadata: {},
      }));
    if (words.length === 0) {
      showToast(t.errorNoWords, "error");
      return;
    }
    setSaving(true);
    try {
      const emoji = mode === "ocr_image" ? "📷" : "📋";
      const set = await createSet({
        teacherUid: user.uid,
        name: setName.trim() || libT.unfiledLabel,
        collectionId,
        sourceType: mode,
        languagePair: "en-he-ar",
        emoji,
      });
      await addWordsToSet(set.id, words);
      showToast(t.toastSaved(set.name), "success");
      onSaved();
    } catch (err) {
      console.warn("[SetBuildWizard] save failed:", err);
      showToast(t.errorSave, "error");
    } finally {
      setSaving(false);
    }
  }, [extractedWords, setName, collectionId, user.uid, libT, t, showToast, onSaved]);

  // ─── Row helpers (review table) ──────────────────────────────────
  const removeExtractedRow = useCallback((idx: number) => {
    setExtractedWords((rows) => rows.filter((_, i) => i !== idx));
  }, []);
  const updateExtractedRow = useCallback((idx: number, field: keyof WordRow, value: string) => {
    setExtractedWords((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }, []);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={dir}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.modalTitle}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 240 }}
        className="relative w-full sm:max-w-2xl bg-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200">
          {step !== "pick-source" && (
            <button
              type="button"
              onClick={backToSource}
              aria-label={t.back}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <ArrowLeft className={`w-5 h-5 text-slate-700 ${isRTL ? "rotate-180" : ""}`} />
            </button>
          )}
          <h2 className="flex-1 font-bold text-lg text-slate-900">{t.modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalCloseAria}
            className="p-2 -mr-2 rounded-full hover:bg-slate-100"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
              transition={{ duration: 0.16 }}
            >
              {step === "pick-source" && (
                <PickSourceStep t={t} onPick={handlePickMode} />
              )}
              {step === "paste" && (
                <PasteStep
                  t={t}
                  setName={setName}
                  setSetName={setSetName}
                  pasteText={pasteText}
                  setPasteText={setPasteText}
                  extractedWords={extractedWords}
                  extracting={extracting}
                  onExtract={handlePasteExtract}
                  onUpdateRow={updateExtractedRow}
                  onRemoveRow={removeExtractedRow}
                />
              )}
              {step === "photo" && (
                <PhotoStep
                  t={t}
                  setName={setName}
                  setSetName={setSetName}
                  fileInputRef={fileInputRef}
                  onFile={handlePhotoFile}
                  extracting={extracting}
                  photoStatus={photoStatus}
                  extractedWords={extractedWords}
                  onUpdateRow={updateExtractedRow}
                  onRemoveRow={removeExtractedRow}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — save button when on a build step */}
        {step !== "pick-source" && (
          <div className="border-t border-slate-200 px-5 sm:px-6 py-3 flex items-center justify-between gap-3 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-sm font-semibold text-slate-600 hover:underline disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <SaveButton
              t={t}
              saving={saving}
              disabled={saving || extractedWords.length === 0}
              onClick={() => {
                const mode: ActiveMode = step === "paste" ? "paste" : "ocr_image";
                void handleSave(mode);
              }}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Step 1: pick source ─────────────────────────────────────────────

function PickSourceStep({ t, onPick }: { t: typeof setBuildWizardT.en; onPick: (s: Step) => void }) {
  const tiles = [
    {
      step: "paste" as const,
      icon: <Clipboard className="w-6 h-6" />,
      title: t.modePasteTitle,
      blurb: t.modePasteBlurb,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      step: "photo" as const,
      icon: <Camera className="w-6 h-6" />,
      title: t.modePhotoTitle,
      blurb: t.modePhotoBlurb,
      accent: "from-indigo-500 to-violet-600",
    },
  ];

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900">{t.pickSourceHeading}</h3>
      <p className="text-sm text-slate-600 mt-1">{t.pickSourceSubtitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        {tiles.map((tile) => (
          <motion.button
            key={tile.step}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(tile.step)}
            className="relative text-left rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md cursor-pointer bg-white"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <div className={`h-1.5 bg-gradient-to-r ${tile.accent}`} />
            <div className="p-4 flex gap-3">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tile.accent} text-white flex items-center justify-center shrink-0`}
              >
                {tile.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">{tile.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">{tile.blurb}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared: set-name input ──────────────────────────────────────────

function SetNameField({
  t,
  value,
  onChange,
}: {
  t: typeof setBuildWizardT.en;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t.setNameLabel}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.setNamePlaceholder}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        maxLength={120}
      />
    </label>
  );
}

// ─── Step 2A: Paste ──────────────────────────────────────────────────

function PasteStep({
  t,
  setName,
  setSetName,
  pasteText,
  setPasteText,
  extractedWords,
  extracting,
  onExtract,
  onUpdateRow,
  onRemoveRow,
}: {
  t: typeof setBuildWizardT.en;
  setName: string;
  setSetName: (s: string) => void;
  pasteText: string;
  setPasteText: (s: string) => void;
  extractedWords: WordRow[];
  extracting: boolean;
  onExtract: () => void;
  onUpdateRow: (i: number, field: keyof WordRow, value: string) => void;
  onRemoveRow: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{t.pasteHeading}</h3>
        <p className="text-sm text-slate-600 mt-1">{t.pasteSubtitle}</p>
      </div>
      <SetNameField t={t} value={setName} onChange={setSetName} />
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={t.pastePlaceholder}
        rows={6}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-mono"
        dir="ltr"
      />
      <button
        type="button"
        onClick={onExtract}
        disabled={extracting || !pasteText.trim()}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {extracting ? t.pasteExtracting : t.pasteExtract}
      </button>
      {extractedWords.length > 0 ? (
        <WordsReviewTable
          t={t}
          rows={extractedWords}
          onUpdate={onUpdateRow}
          onRemove={onRemoveRow}
          headingOverride={t.pasteExtractedCount(extractedWords.length)}
        />
      ) : (
        <p className="text-xs text-slate-500 italic">{t.pasteEmpty}</p>
      )}
    </div>
  );
}

// ─── Step 2C: Photo ──────────────────────────────────────────────────

function PhotoStep({
  t,
  setName,
  setSetName,
  fileInputRef,
  onFile,
  extracting,
  photoStatus,
  extractedWords,
  onUpdateRow,
  onRemoveRow,
}: {
  t: typeof setBuildWizardT.en;
  setName: string;
  setSetName: (s: string) => void;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  extracting: boolean;
  photoStatus: string;
  extractedWords: WordRow[];
  onUpdateRow: (i: number, field: keyof WordRow, value: string) => void;
  onRemoveRow: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{t.photoHeading}</h3>
        <p className="text-sm text-slate-600 mt-1">{t.photoSubtitle}</p>
      </div>
      <SetNameField t={t} value={setName} onChange={setSetName} />
      <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center bg-slate-50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          /* No `capture` attribute — Phase 4d: teachers want to attach
             gallery photos / screenshots / PDFs-as-image too, not just
             snap a fresh camera shot. Mobile browsers still offer the
             camera as one of the options when accept="image/*". */
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {extracting ? (photoStatus || t.photoProcessing) : t.photoTrigger}
        </button>
        <p className="mt-3 text-[11px] text-slate-500 italic max-w-sm mx-auto">{t.privacyNotice}</p>
      </div>
      {extractedWords.length > 0 && (
        <WordsReviewTable
          t={t}
          rows={extractedWords}
          onUpdate={onUpdateRow}
          onRemove={onRemoveRow}
          headingOverride={t.photoExtractedCount(extractedWords.length)}
        />
      )}
    </div>
  );
}

// ─── Shared: words-review table (used by paste + photo) ──────────────

function WordsReviewTable({
  t,
  rows,
  onUpdate,
  onRemove,
  headingOverride,
}: {
  t: typeof setBuildWizardT.en;
  rows: WordRow[];
  onUpdate: (i: number, field: keyof WordRow, value: string) => void;
  onRemove: (i: number) => void;
  headingOverride?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
        {headingOverride ?? t.reviewSubtitle(rows.length)}
      </p>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          <div>{t.manualHeaderEnglish}</div>
          <div>{t.manualHeaderHebrew}</div>
          <div>{t.manualHeaderArabic}</div>
          <div />
        </div>
        <div className="divide-y divide-slate-200 max-h-[40vh] overflow-y-auto">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
              <input
                type="text"
                value={row.english}
                onChange={(e) => onUpdate(idx, "english", e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <input
                type="text"
                value={row.hebrew}
                onChange={(e) => onUpdate(idx, "hebrew", e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <input
                type="text"
                value={row.arabic}
                onChange={(e) => onUpdate(idx, "arabic", e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label={t.reviewRemoveAria}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Save button ─────────────────────────────────────────────────────

function SaveButton({
  t,
  saving,
  disabled,
  onClick,
}: {
  t: typeof setBuildWizardT.en;
  saving: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 inline-flex items-center gap-2"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {saving ? t.saving : t.save}
    </button>
  );
}
