/**
 * The create-assignment view branch — CreateAssignmentView with its
 * 30+ wizard props.  Lifted out of App.tsx so the prop-forwarding
 * doesn't crowd the orchestrator.
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { isPro } from '../core/plan';
import { generateAiLesson, type AiLessonParams } from '../utils/aiLesson';
import type { Word } from '../data/vocabulary';
import type { AppUser, ClassData, AssignmentData } from '../core/supabase';
import type { SavedTaskInput } from '../hooks/useSavedTasks';
import type { View } from '../core/views';

const CreateAssignmentView = lazyWithRetry(() => import('./CreateAssignmentView'));

export interface CreateAssignmentSectionDeps {
  user: AppUser | null;
  selectedClass: ClassData;
  allWords: Word[];
  set1Words: Word[];
  set2Words: Word[];
  topicPacks: { name: string; icon: string; ids: number[] }[];

  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  assignmentTitle: string;
  setAssignmentTitle: React.Dispatch<React.SetStateAction<string>>;
  assignmentDeadline: string;
  setAssignmentDeadline: React.Dispatch<React.SetStateAction<string>>;
  assignmentModes: string[];
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  selectedLevel: 'Set 1' | 'Set 2' | 'Custom';
  setSelectedLevel: React.Dispatch<React.SetStateAction<'Set 1' | 'Set 2' | 'Custom'>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  pastedText: string;
  setPastedText: React.Dispatch<React.SetStateAction<string>>;
  showPasteDialog: boolean;
  setShowPasteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  pasteMatchedCount: number;
  pasteUnmatched: string[];

  // Passing through to CreateAssignmentView's existing signatures —
  // these are too varied (event handlers, async with optional args) to
  // pin down here so the section types them as any pass-throughs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePasteSubmit: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleAddUnmatchedAsCustom: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSkipUnmatched: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleTagInputKeyDown: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDocxUpload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleOcrUpload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSaveAssignment: any;

  assignmentSentences: string[];
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  sentenceDifficulty: 1 | 2 | 3 | 4;
  setSentenceDifficulty: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;

  isOcrProcessing: boolean;
  ocrProgress: number;
  ocrStatus: string;

  showTopicPacks: boolean;
  setShowTopicPacks: React.Dispatch<React.SetStateAction<boolean>>;
  showAssignmentWelcome: boolean;
  setShowAssignmentWelcome: React.Dispatch<React.SetStateAction<boolean>>;

  editingAssignment: AssignmentData | null;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setActivityNavOrigin: React.Dispatch<React.SetStateAction<'create-assignment' | null>>;

  setClassShowAssignment: React.Dispatch<
    React.SetStateAction<{ title: string; wordIds: number[]; customWords?: Word[] } | null>
  >;
  setView: React.Dispatch<React.SetStateAction<View>>;

  onSaveTemplate: (input: SavedTaskInput) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showPaywallToast: (msg: string) => void;
  speakWord: (wordId: number, fallbackText: string) => void;
}

export function CreateAssignmentSection(deps: CreateAssignmentSectionDeps): ReactNode {
  const {
    user, selectedClass, allWords, set1Words, set2Words, topicPacks,
    customWords, setCustomWords,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    selectedWords, setSelectedWords,
    selectedLevel, setSelectedLevel,
    tagInput, setTagInput,
    pastedText, setPastedText,
    showPasteDialog, setShowPasteDialog,
    pasteMatchedCount, pasteUnmatched,
    handlePasteSubmit, handleAddUnmatchedAsCustom, handleSkipUnmatched,
    handleTagInputKeyDown, handleDocxUpload, handleOcrUpload, handleSaveAssignment,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    isOcrProcessing, ocrProgress, ocrStatus,
    showTopicPacks, setShowTopicPacks,
    showAssignmentWelcome, setShowAssignmentWelcome,
    editingAssignment, setEditingAssignment,
    setActivityNavOrigin, setClassShowAssignment,
    setView, onSaveTemplate, showToast, showPaywallToast, speakWord,
  } = deps;

  return (
    <LazyWrapper loadingMessage="Loading assignment wizard...">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CreateAssignmentView
        selectedClass={selectedClass}
        allWords={allWords}
        set1Words={set1Words}
        set2Words={set2Words}
        customWords={customWords}
        onSaveTemplate={onSaveTemplate}
        assignmentTitle={assignmentTitle}
        setCustomWords={setCustomWords}
        setAssignmentTitle={setAssignmentTitle}
        assignmentDeadline={assignmentDeadline}
        setAssignmentDeadline={setAssignmentDeadline}
        assignmentModes={assignmentModes}
        setAssignmentModes={setAssignmentModes}
        selectedWords={selectedWords}
        setSelectedWords={setSelectedWords}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        tagInput={tagInput}
        setTagInput={setTagInput}
        pastedText={pastedText}
        setPastedText={setPastedText}
        showPasteDialog={showPasteDialog}
        setShowPasteDialog={setShowPasteDialog}
        pasteMatchedCount={pasteMatchedCount}
        pasteUnmatched={pasteUnmatched}
        handlePasteSubmit={handlePasteSubmit}
        handleAddUnmatchedAsCustom={handleAddUnmatchedAsCustom}
        handleSkipUnmatched={handleSkipUnmatched}
        handleTagInputKeyDown={handleTagInputKeyDown}
        handleDocxUpload={handleDocxUpload}
        handleOcrUpload={handleOcrUpload}
        handleSaveAssignment={handleSaveAssignment}
        assignmentSentences={assignmentSentences}
        setAssignmentSentences={setAssignmentSentences}
        sentenceDifficulty={sentenceDifficulty}
        setSentenceDifficulty={setSentenceDifficulty}
        isOcrProcessing={isOcrProcessing}
        ocrProgress={ocrProgress}
        ocrStatus={ocrStatus}
        showTopicPacks={showTopicPacks}
        setShowTopicPacks={setShowTopicPacks}
        showAssignmentWelcome={showAssignmentWelcome}
        setShowAssignmentWelcome={setShowAssignmentWelcome}
        TOPIC_PACKS={topicPacks}
        onBack={() => {
          setEditingAssignment(null);
          setActivityNavOrigin(null);
          setView('teacher-dashboard');
        }}
        // The setup wizard's AssignmentData type narrows
        // sentenceDifficulty to `1|2|3|4`; the supabase mapper returns
        // it as `number` (DB is INT, no DB-level CHECK constraint).
        // The runtime value is always 1-4 by row-spec, so the cast is
        // correct at the value level.
        editingAssignment={editingAssignment as unknown as import('../components/setup/types').AssignmentData | null}
        setEditingAssignment={
          setEditingAssignment as unknown as React.Dispatch<
            React.SetStateAction<import('../components/setup/types').AssignmentData | null>
          >
        }
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText ?? '')}
        isProUser={isPro(user)}
        onGenerateLesson={(params: AiLessonParams) => generateAiLesson(params, { showToast, showPaywallToast })}
        // Activity-type tabs at the top of the wizard.  Picking a non-
        // Assignment tab closes the wizard and opens the chosen tool's
        // view with this class preselected.  null assignment = the tool
        // opens to its own picker UI with selectedClass pre-filled.
        onSwitchActivity={(type) => {
          // Remember that this tab view was opened from the wizard so
          // its back/exit returns here instead of jumping past to the
          // teacher dashboard.
          setActivityNavOrigin('create-assignment');
          if (type === 'class-show') {
            setClassShowAssignment(null);
            setView('class-show');
          } else if (type === 'hot-seat') {
            setView('hot-seat');
          } else if (type === 'vocabagrut') {
            setView('vocabagrut');
          }
        }}
      />
    </LazyWrapper>
  );
}
