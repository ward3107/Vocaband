/**
 * SetBuildWizard — "create a vocabulary set" modal.
 *
 * Wraps the shared WordPicker so building a Set uses the exact same
 * word-adding experience as the assignment wizard + Class Show: paste /
 * type, My Library (other saved Sets), Topic Packs, Saved Groups, and
 * camera / OCR — with Custom words auto-translated to Hebrew + Arabic.
 *
 * The teacher names the Set, builds the list in the picker, and saves.
 * The picker hands back an in-memory Word[]; handleSave maps it to the
 * vocabulary_set_words row shape (curriculum words keep their id link
 * via curriculumWordId, custom words store null there) and persists it
 * through createSet + addWordsToSet.
 */
import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useTranslate } from "../../hooks/useTranslate";
import { useSavedWordGroups } from "../../hooks/useSavedWordGroups";
import { useVocabularyLazy } from "../../hooks/useVocabularyLazy";
import { setBuildWizardT } from "../../locales/teacher/vocabulary-library-build";
import { vocabularyLibraryT } from "../../locales/teacher/vocabulary-library";
import { postOcrImage } from "../../utils/postOcrImage";
import { createSet, addWordsToSet } from "../../core/vocabularyLibrary";
import { type AppUser } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import WordPicker from "../../components/setup/WordPicker";
import { mapPickerWordsToSetRows } from "./setBuildMapping";

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
  const { language, dir } = useLanguage();
  const t = useMemo(() => setBuildWizardT[language], [language]);
  const libT = useMemo(() => vocabularyLibraryT[language], [language]);
  const { translateWord, translateWordsBatch } = useTranslate();
  const { groups: savedGroups, renameGroup, deleteGroup } = useSavedWordGroups();
  // Load the vocabulary chunk so the picker has the full curriculum to
  // match paste / OCR against and to browse My Library / Topic Packs.
  const vocab = useVocabularyLazy(true);

  const [setName, setSetName] = useState("");
  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [saving, setSaving] = useState(false);

  // OCR bridge for the picker's built-in camera / upload flow - wraps the
  // shared endpoint into the { words } contract, swallowing errors so the
  // picker surfaces its own "couldn't read that" state.
  const handlePickerOcr = useCallback(async (file: File): Promise<{ words: string[]; success?: boolean }> => {
    try {
      const result = await postOcrImage(file, "en");
      return { words: result.words, success: true };
    } catch {
      return { words: [], success: false };
    }
  }, []);

  // --- Save --------------------------------------------------------------
  // Map the picker's in-memory Word[] to the vocabulary_set_words row
  // shape.  Curriculum words (positive id) keep their curriculum link;
  // custom words (negative synthesized id) store null there but still
  // carry their english/hebrew/arabic straight into the set.
  const handleSave = useCallback(async () => {
    const words = mapPickerWordsToSetRows(selectedWords);
    if (words.length === 0) {
      showToast(t.errorNoWords, "error");
      return;
    }
    setSaving(true);
    try {
      const set = await createSet({
        teacherUid: user.uid,
        name: setName.trim() || libT.unfiledLabel,
        collectionId,
        sourceType: "paste",
        languagePair: "en-he-ar",
        emoji: "📚",
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
  }, [selectedWords, setName, collectionId, user.uid, libT, t, showToast, onSaved]);

  // --- Render ------------------------------------------------------------
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
        style={{ backgroundColor: 'var(--vb-surface)' }}
        className="relative w-full sm:max-w-2xl rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b" style={{ borderColor: 'var(--vb-border)' }}>
          <h2 className="flex-1 font-bold text-lg" style={{ color: 'var(--vb-text-primary)' }}>{t.modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalCloseAria}
            className="p-2 -mr-2 rounded-full hover:opacity-80"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-5 h-5" style={{ color: 'var(--vb-text-secondary)' }} />
          </button>
        </div>

        {/* Body - the shared word picker (paste, My Library, Topic Packs,
            Saved Groups, OCR), the same experience as the assignment
            wizard + Class Show. */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          <SetNameField t={t} value={setName} onChange={setSetName} />
          {vocab ? (
            <WordPicker
              allWords={vocab.ALL_WORDS}
              selectedWords={selectedWords}
              onSelectedWordsChange={setSelectedWords}
              onTranslateWord={translateWord}
              onTranslateBatch={translateWordsBatch}
              onOcrUpload={handlePickerOcr}
              showToast={showToast}
              topicPacks={vocab.TOPIC_PACKS}
              savedGroups={savedGroups}
              onRenameSavedGroup={renameGroup}
              onDeleteSavedGroup={deleteGroup}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--vb-text-secondary)' }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface-alt)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm font-semibold hover:underline disabled:opacity-50"
            style={{ color: 'var(--vb-text-secondary)' }}
          >
            {t.cancel}
          </button>
          <SaveButton
            t={t}
            saving={saving}
            disabled={saving || selectedWords.length === 0}
            onClick={() => { void handleSave(); }}
          />
        </div>
      </motion.div>
    </motion.div>
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
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--vb-text-secondary)' }}>{t.setNameLabel}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.setNamePlaceholder}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        maxLength={120}
      />
    </label>
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
