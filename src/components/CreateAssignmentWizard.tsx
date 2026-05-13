/**
 * CreateAssignmentWizard — Thin wrapper around SetupWizard for assignments.
 *
 * Maintains backward compatibility with existing App.tsx integration while
 * delegating all wizard logic to the shared SetupWizard component.
 *
 * Key differences from SetupWizard:
 * - Uses number[] for selectedWords (legacy format)
 * - Has success screen with confetti, class code copy, WhatsApp share
 * - Instructions field is local state (not persisted to DB)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Share2, Check, BookOpen, Target, ArrowLeft } from 'lucide-react';
import { Word } from '../data/vocabulary';
import { SentenceDifficulty } from '../constants/game';
import { supabase } from '../core/supabase';
import SetupWizard, { SetupWizardProps } from './setup/SetupWizard';
import { AssignmentData } from './setup/types';
import { useTranslate } from '../hooks/useTranslate';
import { useSavedWordGroups } from '../hooks/useSavedWordGroups';
import { saveCorrection } from '../utils/translationCorrections';
import { useLanguage } from '../hooks/useLanguage';
import { teacherWizardsT } from '../locales/teacher/wizards';

// Keep the existing AssignmentData interface for backward compatibility
export interface AssignmentDataCompat extends AssignmentData {
  // Extended if needed for compatibility
}

export interface CreateAssignmentWizardProps {
  selectedClass: { name: string; code: string; studentCount?: number; id?: string };
  allWords: Word[];
  set1Words: Word[];
  set2Words: Word[];
  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  assignmentTitle: string;
  setAssignmentTitle: (title: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (date: string) => void;
  assignmentModes: string[];
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  selectedLevel: string;
  setSelectedLevel: (level: "Set 1" | "Set 2" | "Custom") => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  pastedText: string;
  setPastedText: (text: string) => void;
  showPasteDialog: boolean;
  setShowPasteDialog: (show: boolean) => void;
  pasteMatchedCount: number;
  pasteUnmatched: string[];
  handlePasteSubmit: () => void;
  handleAddUnmatchedAsCustom: () => void;
  handleSkipUnmatched: () => void;
  handleTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleDocxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOcrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Optional overrides match the real signature in useTeacherActions —
  // the call site at line 225 passes (wordIds, modes) explicitly to
  // avoid the async-state timing issue noted there.  The prop type
  // was declared as `() => void` and silently accepted any args at
  // the JS level, but TypeScript caught the discrepancy.
  handleSaveAssignment: (wordsOverride?: number[], modesOverride?: string[]) => void | Promise<void>;
  assignmentSentences: string[];
  setAssignmentSentences: (sentences: string[]) => void;
  sentenceDifficulty: SentenceDifficulty;
  setSentenceDifficulty: (level: SentenceDifficulty) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  ocrStatus?: string;
  showTopicPacks: boolean;
  setShowTopicPacks: (show: boolean) => void;
  showAssignmentWelcome: boolean;
  setShowAssignmentWelcome: (show: boolean) => void;
  TOPIC_PACKS: Array<{ name: string; icon: string; ids: number[] }>;
  onBack: () => void;
  editingAssignment: AssignmentData | null;
  setEditingAssignment: (assignment: AssignmentData | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
  /** Effective Pro plan flag — gates AI sentence generation in
   *  ConfigureStep.  Forwarded straight through to SetupWizard. */
  isProUser?: boolean;
  /** AI lesson generator — generates reading text + questions from selected words. */
  onGenerateLesson?: (params: {
    words: Array<{ english: string; hebrew: string; arabic: string }>;
    config: {
      textDifficulty: string;
      textType: string;
      wordCount: number;
      questionTypes: {
        yesNo: number;
        wh: number;
        literal: number;
        inferential: number;
        fillBlank: number;
        trueFalse: number;
        matching: number;
        multipleChoice: number;
        sentenceComplete: number;
      };
      includeAnswers: boolean;
    };
  }) => Promise<{
    text: string;
    wordCount: number;
    questions: Array<{
      type: string;
      question: string;
      answer: string;
      options?: string[];
    }>;
  }>;
  /** Save the current wizard state as a reusable template.  Forwarded
   *  to SetupWizard, which renders a "Save as template" toggle in the
   *  Review step. */
  onSaveTemplate?: (input: {
    title: string;
    mode: 'quick-play' | 'assignment';
    wordIds: number[];
    modes: string[];
    instructions?: string;
    sentenceDifficulty?: SentenceDifficulty;
    sentences?: string[];
  }) => void;

  /** Wires the ActivityTypeTabs strip inside SetupWizard.  When the
   *  teacher picks a non-Assignment tab, the parent (App.tsx) closes
   *  the wizard and opens the chosen tool with this class preselected. */
  onSwitchActivity?: (type: 'class-show' | 'worksheet' | 'hot-seat' | 'vocabagrut') => void;
}

export const CreateAssignmentWizard: React.FC<CreateAssignmentWizardProps> = ({
  selectedClass,
  allWords,
  set1Words,
  set2Words,
  customWords,
  setCustomWords,
  assignmentTitle,
  setAssignmentTitle,
  assignmentDeadline,
  setAssignmentDeadline,
  assignmentModes,
  setAssignmentModes,
  selectedWords: selectedWordsIds,
  setSelectedWords,
  selectedLevel,
  setSelectedLevel,
  tagInput,
  setTagInput,
  pastedText,
  setPastedText,
  showPasteDialog,
  setShowPasteDialog,
  pasteMatchedCount,
  pasteUnmatched,
  handlePasteSubmit,
  handleAddUnmatchedAsCustom,
  handleSkipUnmatched,
  handleTagInputKeyDown,
  handleDocxUpload,
  handleOcrUpload,
  handleSaveAssignment,
  assignmentSentences,
  setAssignmentSentences,
  sentenceDifficulty,
  setSentenceDifficulty,
  isOcrProcessing = false,
  ocrProgress = 0,
  ocrStatus = "",
  showTopicPacks,
  setShowTopicPacks,
  showAssignmentWelcome,
  setShowAssignmentWelcome,
  TOPIC_PACKS,
  onBack,
  editingAssignment,
  setEditingAssignment,
  showToast,
  onPlayWord,
  isProUser = false,
  onGenerateLesson,
  onSaveTemplate,
  onSwitchActivity,
}) => {
  const { language, dir } = useLanguage();
  const t = teacherWizardsT[language];
  // ── Local State ─────────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');

  // Gemini-backed translator shared across the whole wizard — replaces
  // the older mymemory.translated.net path which gave worse results
  // for idioms/phrases (e.g. "a shame" → machine-literal).  /api/translate
  // is the same endpoint the Quick Play flow already uses.
  const { translateWord: geminiTranslate, translateWordsBatch } = useTranslate();
  // Per-teacher saved-groups picker — persists across logins/devices
  // via the public.saved_word_groups Supabase table (replaces the old
  // localStorage-only path).
  const savedGroupsHook = useSavedWordGroups();

  // ── Convert number[] to Word[] for SetupWizard ───────────────────────────────
  const selectedWords = useMemo(() => {
    const words = allWords.filter(w => selectedWordsIds.includes(w.id));
    // Include custom words
    const customSelected = customWords.filter(w => selectedWordsIds.includes(w.id));
    return [...words, ...customSelected];
  }, [allWords, customWords, selectedWordsIds]);

  // ── Handle SetupWizard completion ───────────────────────────────────────────
  const handleWizardComplete = async (result: { words: Word[]; modes: string[] }) => {
    // Update parent state with the final selections
    const wordIds = result.words.map(w => w.id);
    setSelectedWords(wordIds);
    setAssignmentModes(result.modes);

    // Pass words and modes directly to avoid timing issues with async state updates
    await handleSaveAssignment(wordIds, result.modes);

    // Show success screen
    setShowSuccess(true);
  };

  // ── Handle wizard back (return to teacher dashboard) ───────────────────────
  const handleWizardBack = () => {
    onBack();
  };

  // ── Copy class code ─────────────────────────────────────────────────────────
  const copyClassCode = () => {
    if (selectedClass?.code) {
      navigator.clipboard.writeText(selectedClass.code);
      setCopiedCode(selectedClass.code);
      setTimeout(() => setCopiedCode(null), 2000);
      if (showToast) showToast(t.classCodeCopied, 'success');
    }
  };

  // ── Share via WhatsApp ─────────────────────────────────────────────────────
  const shareViaWhatsApp = () => {
    const message = t.joinMessage(selectedClass?.code ?? '');
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // ── Handle success screen "Create another" ──────────────────────────────────
  const handleCreateAnother = () => {
    setShowSuccess(false);
    setAssignmentTitle('');
    setInstructions('');
    setSelectedWords([]);
    setAssignmentModes(['flashcards']);
    setEditingAssignment(null);
  };

  // ── Success Screen ───────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <motion.div
        dir={dir}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center"
      >
        <div className="max-w-md w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-primary/20 text-center space-y-6"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              <Check size={40} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                {editingAssignment ? t.assignmentUpdatedTitle : t.assignmentCreatedTitle}
              </h2>
              <p className="text-on-surface-variant">
                {editingAssignment ? t.assignmentUpdatedSubtitle : t.assignmentCreatedSubtitle}
              </p>
            </motion.div>

            {/* Assignment Details */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-surface-container rounded-2xl p-4 space-y-3"
            >
              <div>
                <div className="text-sm font-bold text-on-surface">{assignmentTitle}</div>
                <div className="flex items-center gap-3 text-sm text-on-surface-variant mt-1">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>{t.successWordsCount(selectedWordsIds.length)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} />
                    <span>{t.successModesCount(assignmentModes.length)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Class Code Section */}
            {selectedClass?.code && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-100"
              >
                <div className="text-sm text-blue-700 mb-2 font-bold">{t.shareWithStudents}</div>
                <div className="text-3xl font-black text-blue-900 mb-4 tracking-wider">
                  {selectedClass.code}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyClassCode}
                    className="flex-1 py-3 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-xl font-bold hover:bg-[var(--vb-surface-alt)] transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    {copiedCode === selectedClass.code ? t.copiedShort : t.copyCode}
                  </button>
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    {t.whatsAppLabel}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={handleCreateAnother}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
              >
                {t.createAnother}
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-4 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-2xl font-bold hover:bg-[var(--vb-surface-alt)] transition-all"
              >
                {t.backToDashboard}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Render SetupWizard ───────────────────────────────────────────────────────
  return (
    <SetupWizard
      mode="assignment"
      allWords={allWords}
      set1Words={set1Words}
      set2Words={set2Words}
      onComplete={handleWizardComplete}
      onBack={handleWizardBack}
      onSaveTemplate={onSaveTemplate}
      onSaveSavedGroup={async (name, wordIds) => { await savedGroupsHook.addGroup({ name, wordIds }); }}
      savedGroups={savedGroupsHook.groups}
      onRenameSavedGroup={savedGroupsHook.renameGroup}
      onDeleteSavedGroup={savedGroupsHook.deleteGroup}
      autoMatchPartial={true}
      showLevelFilter={true}
      selectedClass={selectedClass}
      initialSelectedWords={selectedWords}
      initialSelectedModes={assignmentModes}
      assignmentTitle={assignmentTitle}
      onTitleChange={setAssignmentTitle}
      assignmentDeadline={assignmentDeadline}
      onDeadlineChange={setAssignmentDeadline}
      assignmentInstructions={instructions}
      onInstructionsChange={setInstructions}
      assignmentSentences={assignmentSentences}
      onSentencesChange={setAssignmentSentences}
      sentenceDifficulty={sentenceDifficulty}
      onSentenceDifficultyChange={setSentenceDifficulty}
      editingAssignment={editingAssignment}
      setEditingAssignment={setEditingAssignment}
      showToast={showToast}
      onPlayWord={onPlayWord}
      isProUser={isProUser}
      onTranslateWord={async (word) => {
        // Route through our Gemini-backed /api/translate.  Also persist
        // the result to `word_corrections` for real Set-1/2/3 words so
        // the next assignment that picks this word lands with the
        // translation already filled in — teachers no longer have to
        // re-translate the same word twice.  Russian is included in
        // the correction row when /api/translate returns one.
        const result = await geminiTranslate(word);
        if (!result) return null;
        const lower = word.toLowerCase().trim();
        const match = allWords.find(w => w.english.toLowerCase().trim() === lower);
        if (match && match.id > 0 && (result.hebrew || result.arabic || result.russian)) {
          try {
            await saveCorrection({
              wordId: match.id,
              english: match.english,
              hebrew: result.hebrew || match.hebrew || undefined,
              arabic: result.arabic || match.arabic || undefined,
              russian: result.russian || match.russian || undefined,
            });
          } catch {
            /* non-fatal — translation still flows into the form. */
          }
        }
        return result;
      }}
      onTranslateBatch={translateWordsBatch}
      onGenerateLesson={onGenerateLesson}
      topicPacks={TOPIC_PACKS}
      onOcrUpload={handleOcrUpload}
      isOcrProcessing={isOcrProcessing}
      ocrProgress={ocrProgress}
      ocrStatus={ocrStatus}
      onDocxUpload={handleDocxUpload}
      customWords={customWords}
      onCustomWordsChange={setCustomWords}
      onSwitchActivity={onSwitchActivity}
    />
  );
};

export default CreateAssignmentWizard;
