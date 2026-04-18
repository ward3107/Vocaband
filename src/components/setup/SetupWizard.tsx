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
import { WordInputStep2026 } from './WordInputStep2026';
import { ConfigureStep } from './ConfigureStep';
import { ReviewStep } from './ReviewStep';

// Memoized Stepper component (defined outside to prevent re-creation)
interface StepperProps {
  currentStep: 1 | 2 | 3;
  mode: WizardMode;
}

const Stepper = memo(({ currentStep, mode }: StepperProps) => {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-7 sm:mb-8">
      {[1, 2, 3].map((step) => {
        const stepNum = step as 1 | 2 | 3;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isOptional = mode === 'quick-play' && stepNum === 2;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-100'
                    : 'bg-white text-stone-400 border border-stone-200'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              {isOptional && !isCompleted && !isCurrent && (
                <span className="text-[10px] font-semibold text-stone-400 mt-1.5">Optional</span>
              )}
            </div>
            {step < 3 && (
              <div
                className={`w-8 sm:w-14 h-0.5 rounded-full ${
                  step < currentStep ? 'bg-emerald-500' : 'bg-stone-200'
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
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string; match: number } | null>;

  // Feature flags
  use2026WordInput?: boolean; // Use new 2026 word input design
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Custom words
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;

  // Initial selected words (for pre-filling from analytics, etc.)
  initialSelectedWords?: Word[];

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
  use2026WordInput = false,
  topicPacks = [],
  onOcrUpload,
  isOcrProcessing = false,
  ocrProgress = 0,
  onDocxUpload,
  customWords = [],
  onCustomWordsChange,
  initialSelectedWords,
  user,
  onLogout,
}) => {
  // ── Step State ─────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Scroll the viewport to the top whenever the step changes. The old
  // AnimatePresence transition just swapped the content underneath,
  // which often left the teacher looking at the bottom of step 1 when
  // step 2 rendered — they had to scroll up to see "Configure assignment"
  // or "Review" heading. Using window.scrollTo on currentStep change
  // keeps the next step's heading aligned with the top of the viewport.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [currentStep]);

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

  // ── Pre-populate from initial selected words (analytics flow, etc.) ────────────
  useEffect(() => {
    if (initialSelectedWords && initialSelectedWords.length > 0) {
      setSelectedWords(initialSelectedWords);
    }
  }, [initialSelectedWords]);

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
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pt-28 sm:pt-32 pb-20 sm:pb-12 px-3 sm:px-4 md:px-6">
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
        <Stepper currentStep={currentStep} mode={mode} />

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <>
              {use2026WordInput ? (
                <WordInputStep2026
                  key="step1-2026"
                  allWords={allWords}
                  selectedWords={selectedWords}
                  onSelectedWordsChange={setSelectedWords}
                  onNext={handleNext}
                  onBack={handleBack}
                  onTranslateWord={onTranslateWord}
                  onOcrUpload={async (file) => {
                    // Use the existing /api/ocr endpoint with FormData
                    const token = localStorage.getItem('vocaband-token') || localStorage.getItem('sb-access-token');
                    if (!token) {
                      showToast?.('Authentication required', 'error');
                      throw new Error('No auth token');
                    }

                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('https://api.vocaband.com/api/ocr', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                      body: formData,
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || error.message || 'OCR failed');
                    }

                    const result = await response.json();
                    return {
                      words: result.words || [],
                      success: result.success,
                    };
                  }}
                  showToast={showToast}
                  topicPacks={topicPacks}
                  savedGroups={[]} // TODO: pass from props
                  customWords={customWords}
                  onCustomWordsChange={onCustomWordsChange}
                />
              ) : (
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
                  classId={selectedClass?.id}
                  showSuggestedWords={mode === 'assignment' && !!selectedClass?.id}
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
            </>
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
