/**
 * SetupWizard — Unified shell orchestrating the 3-step setup flow.
 *
 * Manages step state (1,2,3), renders stepper UI, handles transitions.
 * Both Quick Play and Assignment use this shell with different props.
 */

import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import TopAppBar from '../TopAppBar';
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty } from '../../constants/game';
import { WizardMode, AssignmentData, DEFAULT_ASSIGNMENT_MODE_IDS } from './types';
import { WordInputStep } from './WordInputStep';
import { WordInputStep2026 } from './WordInputStep2026';
import { ConfigureStep } from './ConfigureStep';
import { ReviewStep } from './ReviewStep';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherWizardsT } from '../../locales/teacher/wizards';
import { useFirstTimeGuide } from '../../hooks/useFirstTimeGuide';
import FirstTimeGuide from '../onboarding/FirstTimeGuide';
import GuideTriggerButton from '../onboarding/GuideTriggerButton';
import { teacherGuidesT } from '../../locales/teacher/guides';

// Memoized Stepper component (defined outside to prevent re-creation)
interface StepperProps {
  currentStep: 1 | 2 | 3;
  mode: WizardMode;
}

const Stepper = memo(({ currentStep, mode }: StepperProps) => {
  const { language } = useLanguage();
  const t = teacherWizardsT[language];
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
                style={
                  isCompleted
                    ? undefined
                    : isCurrent
                    ? undefined
                    : { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)', borderColor: 'var(--vb-border)' }
                }
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-100'
                    : 'border'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              {isOptional && !isCompleted && !isCurrent && (
                <span className="text-[10px] font-semibold mt-1.5" style={{ color: 'var(--vb-text-muted)' }}>Optional</span>
              )}
            </div>
            {step < 3 && (
              <div
                style={step < currentStep ? undefined : { backgroundColor: 'var(--vb-border)' }}
                className={`w-8 sm:w-14 h-0.5 rounded-full ${
                  step < currentStep ? 'bg-emerald-500' : ''
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
  selectedClass?: { id?: string; name: string; code: string; studentCount?: number };
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
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string; russian?: string; match: number } | null>;
  /** Batch translate — used by WordInputStep2026 to auto-translate
   *  Custom-tier words after OCR/paste, and to power the "Translate
   *  N missing" button in the wizard header.  Curriculum words are
   *  never sent through this — only synthesized customs that lack
   *  hebrew/arabic. */
  onTranslateBatch?: (words: string[]) => Promise<Map<string, { hebrew: string; arabic: string; match: number }>>;
  /** AI vocabulary generation — used by WordInputStep2026's AI Lesson Builder. */
  onAiGenerateWords?: (params: {
    topic: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    examplesToAnchor?: string;
    skipCurriculumDuplicates: boolean;
  }) => Promise<Array<{
    english: string;
    hebrew: string;
    arabic: string;
    example?: string;
    isFromCurriculum?: boolean;
    curriculumId?: number;
  }>>;
  /** AI lesson generator — generates reading text + questions from selected words. Used by ReviewStep. */
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

  // Feature flags
  use2026WordInput?: boolean; // Use new 2026 word input design
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  ocrStatus?: string;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Custom words
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;

  // Initial selected words (for pre-filling from analytics, etc.)
  initialSelectedWords?: Word[];
  /** Pre-fill the game-mode selection (e.g. when reusing a saved
   *  template).  Defaults to DEFAULT_ASSIGNMENT_MODE_IDS when absent. */
  initialSelectedModes?: string[];

  /** Save the current wizard state as a reusable template.  When set,
   *  ReviewStep shows a "Save as template" toggle next to the launch
   *  button.  The wizard builds the snapshot from its own state. */
  onSaveTemplate?: (input: {
    title: string;
    mode: WizardMode;
    wordIds: number[];
    modes: string[];
    instructions?: string;
    sentenceDifficulty?: SentenceDifficulty;
    sentences?: string[];
  }) => void;
  /** Called alongside onSaveTemplate to also persist the word list as
   *  a "Saved Group" the teacher can re-pick next time.  Backed by
   *  the public.saved_word_groups table (replaces the previous
   *  localStorage path that disappeared on logout / device change). */
  onSaveSavedGroup?: (name: string, wordIds: number[]) => Promise<unknown>;
  /** Saved groups owned by this teacher — passed through to the
   *  WordInputStep2026 SavedGroupsPanel. */
  savedGroups?: Array<{ id: string; name: string; words: number[] }>;
  /** Rename a saved group from inside the picker. */
  onRenameSavedGroup?: (id: string, newName: string) => Promise<boolean>;
  /** Delete a saved group from inside the picker. */
  onDeleteSavedGroup?: (id: string) => Promise<boolean>;

  // TopAppBar props
  user?: { displayName?: string; avatar?: string } | null;
  onLogout?: () => void;

  /** Effective Pro plan flag, plumbed down to ConfigureStep so the AI
   *  sentence-generation button is hidden for Free teachers.  Optional
   *  so existing call sites continue to work — defaults to false. */
  isProUser?: boolean;
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
  onTranslateBatch,
  onAiGenerateWords,
  onGenerateLesson,
  use2026WordInput = false,
  topicPacks = [],
  onOcrUpload,
  isOcrProcessing = false,
  ocrProgress = 0,
  ocrStatus = "",
  onDocxUpload,
  customWords = [],
  onCustomWordsChange,
  initialSelectedWords,
  initialSelectedModes,
  onSaveTemplate,
  onSaveSavedGroup,
  savedGroups: savedGroupsProp,
  onRenameSavedGroup,
  onDeleteSavedGroup,
  user,
  onLogout,
  isProUser = false,
}) => {
  const { language, dir } = useLanguage();
  const t = teacherWizardsT[language];
  // First-time guide — only relevant for the Assignment flow.  Quick
  // Play has its own micro-flow on the dashboard tile, so we don't
  // pop a second walkthrough at teachers who already saw that one.
  const isAssignmentMode = mode === 'assignment';
  const guide = useFirstTimeGuide('create-assignment');
  const guideStrings = teacherGuidesT[language].createAssignment;
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
  // Both flows default to "everything except Sentence Builder" — the
  // assignment flow already does this; aligning Quick Play closes the
  // teacher feedback "the default in the online game should match what
  // I see on regular assignments".  Sentence Builder stays opt-in for
  // the same reason as on assignments: enabling it requires extra
  // setup (sentence difficulty + bank), and teachers don't want to
  // land in that UI by accident every time.
  const [selectedModes, setSelectedModes] = useState<string[]>(
    initialSelectedModes && initialSelectedModes.length > 0
      ? [...initialSelectedModes]
      : [...DEFAULT_ASSIGNMENT_MODE_IDS]
  );

  // AI-generated lesson state (when teacher uses AI Lesson Builder)
  const [aiGeneratedLesson, setAiGeneratedLesson] = useState<any>(null);

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
  // ONE-SHOT: only run on first mount when initialSelectedWords is
  // non-empty.  Earlier this effect re-fired on every parent re-render
  // because the parent's useMemo'd initialSelectedWords array got a
  // fresh reference each render — wiping the user's in-wizard
  // selection (e.g. words just added via OCR).  Latch with a ref so
  // we only seed once.
  const seededInitialRef = useRef(false);
  useEffect(() => {
    if (seededInitialRef.current) return;
    if (initialSelectedWords && initialSelectedWords.length > 0) {
      setSelectedWords(initialSelectedWords);
      seededInitialRef.current = true;
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
    onComplete({ words: selectedWords, modes: selectedModes });
  };

  const handleQuickStart = () => {
    if (mode === 'quick-play' && onGenerateQR) {
      onGenerateQR(selectedWords, selectedModes);
    }
  };

  // Save the current wizard state as a reusable template.  The title
  // falls back to a date-stamped placeholder when the teacher hasn't
  // typed one yet — the dashboard's Saved-Templates section uses
  // "Untitled template" as the visible label in that case so they can
  // still find it.
  const handleSaveTemplate = onSaveTemplate
    ? () => {
        const fallbackTitle = mode === 'quick-play'
          ? `Quick Play · ${new Date().toLocaleDateString()}`
          : `Template · ${new Date().toLocaleDateString()}`;
        const title = assignmentTitle?.trim() || fallbackTitle;
        onSaveTemplate({
          title,
          mode,
          wordIds: selectedWords.map(w => w.id),
          modes: selectedModes,
          instructions: assignmentInstructions || undefined,
          sentenceDifficulty,
          sentences: assignmentSentences.length > 0 ? assignmentSentences : undefined,
        });

        // Also surface this word list in the "Saved Groups" picker so
        // the teacher can re-pick it in one tap next time — now backed
        // by the public.saved_word_groups Supabase table (per-teacher,
        // RLS-gated) instead of localStorage so the saved group
        // survives logout / device change / browser cache clear.
        // The onSaveSavedGroup callback is supplied by
        // CreateAssignmentWizard / QuickPlaySetupView, which both
        // mount useSavedWordGroups and pass through addGroup.
        const ids = selectedWords.map(w => w.id);
        if (ids.length > 0 && onSaveSavedGroup) {
          void onSaveSavedGroup(title, ids);
        }
      }
    : undefined;

  // Memoize step labels to prevent re-creation
  const stepLabels = useMemo<Record<1 | 2 | 3, string>>(() => ({
    1: t.stepLabelWords,
    2: mode === 'quick-play' ? t.stepLabelChooseModesOptional : t.stepLabelConfigure,
    3: t.stepLabelReview,
  }), [mode, t]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isQuickPlay = mode === 'quick-play';
  const isAssignment = mode === 'assignment';

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-stone-50 to-white pt-36 sm:pt-32 pb-20 sm:pb-12 px-3 sm:px-4 md:px-6">
      <TopAppBar
        title={isQuickPlay ? t.qpSetupTitle : editingAssignment ? t.editAssignmentTitle : t.createAssignmentTitle}
        subtitle={isQuickPlay ? t.qpSetupSubtitle : t.assignmentSubtitle}
        showBack
        onBack={handleBack}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={onLogout}
      />

      <div className={`mx-auto ${currentStep === 3 && isQuickPlay ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <Stepper currentStep={currentStep} mode={mode} />

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <>
              {use2026WordInput ? (
                <WordInputStep2026
                  key="step1-2026"
                  allWords={allWords}
                  selectedWords={selectedWords}
                  onSelectedWordsChange={(words) => {
                    setSelectedWords(words);
                  }}
                  onNext={handleNext}
                  onBack={handleBack}
                  onTranslateWord={onTranslateWord}
                  onTranslateBatch={onTranslateBatch}
                  onOcrUpload={async (file) => {
                    // The OCR handler used to read localStorage keys that
                    // never existed ('vocaband-token' / 'sb-access-token'),
                    // which made `token` null, threw "No auth token", and
                    // aborted before the fetch ever fired. That's why no
                    // /api/ocr request showed up in DevTools Network tab.
                    // Fix: use the live Supabase session directly — that's
                    // the only reliable source of the current access_token
                    // regardless of how Supabase stores it locally.
                    const { supabase: sb } = await import('../../core/supabase');
                    const { data: { session } } = await sb.auth.getSession();
                    const token = session?.access_token;
                    if (!token) {
                      showToast?.(t.authRequired, 'error');
                      throw new Error('No auth token');
                    }

                    const formData = new FormData();
                    formData.append('file', file);

                    // Same-origin /api/ocr — Cloudflare Worker proxies
                    // to Fly (post Render→Fly migration).  Was hardcoded
                    // to api.vocaband.com but Render is gone, so the
                    // direct call returned ERR_CONNECTION_CLOSED.
                    const response = await fetch('/api/ocr', {
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
                  savedGroups={savedGroupsProp ?? []}
                  onRenameSavedGroup={onRenameSavedGroup}
                  onDeleteSavedGroup={onDeleteSavedGroup}
                  customWords={customWords}
                  onCustomWordsChange={onCustomWordsChange}
                  onAiGenerateWords={onAiGenerateWords}
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
              onGenerateLesson={onGenerateLesson}
              onAiLessonChange={setAiGeneratedLesson}
              showToast={showToast}
              isProUser={isProUser}
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
              onSaveTemplate={handleSaveTemplate}
              assignmentTitle={assignmentTitle}
              assignmentDeadline={assignmentDeadline}
              assignmentInstructions={assignmentInstructions}
              selectedClassName={selectedClass?.name}
              editingAssignment={editingAssignment}
              aiGeneratedLesson={aiGeneratedLesson}
            />
          )}
        </AnimatePresence>

        {/* Bottom-of-page Cancel — single-click escape from any
            step.  Back is still step-by-step; Cancel always returns
            to the dashboard so a teacher on step 3 doesn't have to
            tap Back three times.  Lives at the bottom (not the
            TopAppBar) per teacher feedback "the cancel button
            should be at the bottom not at the top of the pages".
            Margin-top pushes it below the in-step sticky action
            bars; safe-area padding keeps it above the iOS home
            indicator. */}
        <div
          className="mt-10 mb-6 flex justify-center items-center gap-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-bold text-stone-500 hover:text-stone-700 underline-offset-4 hover:underline transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
          >
            {t.cancel}
          </button>
          {isAssignmentMode && (
            <GuideTriggerButton onClick={guide.open} />
          )}
        </div>
      </div>

      {isAssignmentMode && (
        <FirstTimeGuide
          isOpen={guide.isOpen}
          onDone={guide.dismiss}
          heading={guideStrings.heading}
          subheading={guideStrings.subheading}
          steps={guideStrings.steps}
        />
      )}
    </div>
  );
};

export default SetupWizard;
