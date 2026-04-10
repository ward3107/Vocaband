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

// Keep the existing AssignmentData interface for backward compatibility
export interface AssignmentDataCompat extends AssignmentData {
  // Extended if needed for compatibility
}

interface CreateAssignmentWizardProps {
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
  handleSaveAssignment: () => void;
  assignmentSentences: string[];
  setAssignmentSentences: (sentences: string[]) => void;
  sentenceDifficulty: SentenceDifficulty;
  setSentenceDifficulty: (level: SentenceDifficulty) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
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
}) => {
  // ── Local State ─────────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');

  // ── Convert number[] to Word[] for SetupWizard ───────────────────────────────
  const selectedWords = useMemo(() => {
    const words = allWords.filter(w => selectedWordsIds.includes(w.id));
    // Include custom words
    const customSelected = customWords.filter(w => selectedWordsIds.includes(w.id));
    return [...words, ...customSelected];
  }, [allWords, customWords, selectedWordsIds]);

  // ── Handle SetupWizard completion ───────────────────────────────────────────
  const handleWizardComplete = async (result: { words: Word[]; modes: string[] }) => {
    console.log('[handleWizardComplete] START', {
      wordsCount: result.words.length,
      modesCount: result.modes.length,
      words: result.words.map(w => w.id),
      modes: result.modes,
    });

    // Update parent state with the final selections
    const wordIds = result.words.map(w => w.id);
    console.log('[handleWizardComplete] Updating state', { wordIds });
    setSelectedWords(wordIds);
    setAssignmentModes(result.modes);

    console.log('[handleWizardComplete] Calling handleSaveAssignment with data');
    // Pass words and modes directly to avoid timing issues with async state updates
    await handleSaveAssignment(wordIds, result.modes);

    console.log('[handleWizardComplete] Showing success screen');
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
      if (showToast) showToast('Class code copied!', 'success');
    }
  };

  // ── Share via WhatsApp ─────────────────────────────────────────────────────
  const shareViaWhatsApp = () => {
    const message = `Join my class on VocabAnd! Class code: ${selectedClass?.code}`;
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
              className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
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
                {editingAssignment ? 'Assignment Updated!' : 'Assignment Created!'}
              </h2>
              <p className="text-on-surface-variant">
                {editingAssignment
                  ? 'Your changes have been saved successfully'
                  : 'Your students can now access this assignment'}
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
                    <span>{selectedWordsIds.length} words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} />
                    <span>{assignmentModes.length} modes</span>
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
                <div className="text-sm text-blue-700 mb-2 font-bold">Share with students</div>
                <div className="text-3xl font-black text-blue-900 mb-4 tracking-wider">
                  {selectedClass.code}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyClassCode}
                    className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    {copiedCode === selectedClass.code ? 'Copied!' : 'Copy code'}
                  </button>
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    WhatsApp
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
                Create another
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all"
              >
                Back to dashboard
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
      autoMatchPartial={true}
      showLevelFilter={true}
      selectedClass={selectedClass}
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
      onTranslateWord={async (word) => {
        // Translation handler - using the same API as before
        try {
          const [hebrewRes, arabicRes] = await Promise.all([
            fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|he`),
            fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ar`)
          ]);
          const hebrewData = await hebrewRes.json();
          const arabicData = await arabicRes.json();
          if (hebrewData.responseStatus === 200 && arabicData.responseStatus === 200) {
            return {
              hebrew: hebrewData.responseData.translatedText,
              arabic: arabicData.responseData.translatedText
            };
          }
          return null;
        } catch {
          return null;
        }
      }}
      topicPacks={TOPIC_PACKS}
      onOcrUpload={handleOcrUpload}
      isOcrProcessing={isOcrProcessing}
      ocrProgress={ocrProgress}
      onDocxUpload={handleDocxUpload}
      customWords={customWords}
      onCustomWordsChange={setCustomWords}
    />
  );
};

export default CreateAssignmentWizard;
