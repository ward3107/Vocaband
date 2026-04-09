/**
 * SetupWizard — Unified shell orchestrating the 3-step setup flow.
 *
 * Manages step state (1,2,3), renders stepper UI, handles transitions.
 * Both Quick Play and Assignment use this shell with different props.
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TopAppBar from '../TopAppBar';
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty } from '../../constants/game';
import { WizardMode, AssignmentData, ALL_GAME_MODE_IDS } from './types';
import { WordInputStep } from './WordInputStep';
import { ConfigureStep } from './ConfigureStep';
import { ReviewStep } from './ReviewStep';

// Memoized Stepper component (defined outside to prevent re-creation)
interface StepperProps {
  currentStep: 1 | 2 | 3;
  mode: WizardMode;
}

const Stepper = memo(({ currentStep, mode }: StepperProps) => {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
      {[1, 2, 3].map((step) => {
        const stepNum = step as 1 | 2 | 3;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isOptional = mode === 'quick-play' && stepNum === 2;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg shadow-green-500/30'
                    : isCurrent
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                    : 'bg-stone-200 text-stone-600 border-2 border-stone-300/40'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              {isOptional && !isCompleted && !isCurrent && (
                <span className="text-[10px] text-stone-600 mt-1">(Optional)</span>
              )}
            </div>
            {step < 3 && (
              <div
                className={`w-8 sm:w-12 h-0.5 ${
                  step < currentStep ? 'bg-green-400' : 'bg-stone-300/40'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

Stepper.displayName = 'Stepper';

export interface SetupWizardProps {
  mode: WizardMode;
  allWords: Word[];
  set1Words?: Word[];
  set2Words?: Word[];
  onComplete: (result: { words: Word[]; modes: string[] }) => void;
  onBack: () => void;

  // Word input config
  autoMatchPartial: boolean;
  showLevelFilter: boolean;

  // Assignment-specific
  selectedClass?: { name: string; code: string; studentCount?: number };
  assignmentTitle?: string;
  onTitleChange?: (title: string) => void;
  assignmentDeadline?: string;
  onDeadlineChange?: (date: string) => void;
  assignmentInstructions?: string;
  onInstructionsChange?: (instructions: string) => void;
  assignmentSentences?: string[];
  onSentencesChange?: (sentences: string[]) => void;
  sentenceDifficulty?: SentenceDifficulty;
  onSentenceDifficultyChange?: (level: SentenceDifficulty) => void;
  editingAssignment?: AssignmentData | null;
  setEditingAssignment?: (a: AssignmentData | null) => void;

  // Quick Play-specific
  onGenerateQR?: (words: Word[], modes: string[]) => void;

  // External services
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string } | null>;
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Custom words
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;

  // TopAppBar props
  user?: { displayName?: string; avatar?: string } | null;
  onLogout?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  mode,
  allWords,
  set1Words,
  set2Words,
  onComplete,
  onBack,
  autoMatchPartial,
  showLevelFilter,
  selectedClass,
  assignmentTitle = '',
  onTitleChange,
  assignmentDeadline = '',
  onDeadlineChange,
  assignmentInstructions = '',
  onInstructionsChange,
  assignmentSentences = [],
  onSentencesChange,
  sentenceDifficulty = 1,
  onSentenceDifficultyChange,
  editingAssignment = null,
  setEditingAssignment,
  onGenerateQR,
  showToast,
  onPlayWord,
  onTranslateWord,
  topicPacks = [],
  onOcrUpload,
  isOcrProcessing = false,
  ocrProgress = 0,
  onDocxUpload,
  customWords = [],
  onCustomWordsChange,
  user,
  onLogout,
}) => {
  // ── Step State ─────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Core Shared State ───────────────────────────────────────────────────────
  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>(
    mode === 'quick-play' ? ALL_GAME_MODE_IDS : ['flashcards']
  );

  // ── Pre-populate from editing assignment ─────────────────────────────────────
  useEffect(() => {
    if (editingAssignment) {
      if (editingAssignment.words) {
        setSelectedWords(editingAssignment.words);
      }
      if (editingAssignment.allowedModes) {
        setSelectedModes(editingAssignment.allowedModes);
      }
    }
  }, [editingAssignment]);

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    } else {
      onBack();
    }
  };

  const handleLaunch = () => {
    console.log('[SetupWizard handleLaunch] START', {
      mode,
      selectedWordsCount: selectedWords.length,
      selectedModesCount: selectedModes.length,
      selectedWords: selectedWords.map(w => ({ id: w.id, english: w.english })),
      selectedModes,
    });
    onComplete({ words: selectedWords, modes: selectedModes });
    console.log('[SetupWizard handleLaunch] END - called onComplete');
  };

  const handleQuickStart = () => {
    if (mode === 'quick-play' && onGenerateQR) {
      onGenerateQR(selectedWords, selectedModes);
    }
  };

  // Memoize step labels to prevent re-creation
  const stepLabels = useMemo<Record<1 | 2 | 3, string>>(() => ({
    1: 'Select Words',
    2: mode === 'quick-play' ? 'Choose Modes (Optional)' : 'Configure',
    3: 'Review',
  }), [mode]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isQuickPlay = mode === 'quick-play';
  const isAssignment = mode === 'assignment';

  return (
    <div className="min-h-screen bg-stone-100 pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-4 md:px-6">
      <TopAppBar
        title={isQuickPlay ? 'Quick Play Setup' : editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
        subtitle={isQuickPlay ? 'SELECT WORDS • GENERATE QR CODE' : 'SELECT WORDS • ASSIGN TO CLASS'}
        showBack
        onBack={handleBack}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={onLogout}
      />

      <div className="max-w-2xl mx-auto">
        <Stepper />

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <WordInputStep
              key="step1"
              mode={mode}
              allWords={allWords}
              set1Words={set1Words}
              set2Words={set2Words}
              selectedWords={selectedWords}
              onSelectedWordsChange={setSelectedWords}
              onNext={handleNext}
              onBack={handleBack}
              autoMatchPartial={autoMatchPartial}
              showLevelFilter={showLevelFilter}
              onTranslateWord={onTranslateWord}
              onOcrUpload={onOcrUpload}
              isOcrProcessing={isOcrProcessing}
              ocrProgress={ocrProgress}
              onDocxUpload={onDocxUpload}
              onPlayWord={onPlayWord}
              showToast={showToast}
              topicPacks={topicPacks}
              customWords={customWords}
              onCustomWordsChange={onCustomWordsChange}
              editingAssignment={editingAssignment}
            />
          )}

          {currentStep === 2 && (
            <ConfigureStep
              key="step2"
              mode={mode}
              selectedModes={selectedModes}
              onModesChange={setSelectedModes}
              onNext={handleNext}
              onBack={handleBack}
              assignmentTitle={assignmentTitle}
              onTitleChange={onTitleChange}
              assignmentDeadline={assignmentDeadline}
              onDeadlineChange={onDeadlineChange}
              assignmentInstructions={assignmentInstructions}
              onInstructionsChange={onInstructionsChange}
              assignmentSentences={assignmentSentences}
              onSentencesChange={onSentencesChange}
              sentenceDifficulty={sentenceDifficulty}
              onSentenceDifficultyChange={onSentenceDifficultyChange}
              selectedWords={selectedWords}
              editingAssignment={editingAssignment}
            />
          )}

          {currentStep === 3 && (
            <ReviewStep
              key="step3"
              mode={mode}
              selectedWords={selectedWords}
              selectedModes={selectedModes}
              onBack={handleBack}
              onLaunch={handleLaunch}
              onQuickStart={handleQuickStart}
              onEditWords={() => setCurrentStep(1)}
              onEditModes={() => setCurrentStep(2)}
              assignmentTitle={assignmentTitle}
              assignmentDeadline={assignmentDeadline}
              assignmentInstructions={assignmentInstructions}
              selectedClassName={selectedClass?.name}
              editingAssignment={editingAssignment}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SetupWizard;
