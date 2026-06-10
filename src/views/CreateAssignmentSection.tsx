/**
 * The create-assignment view branch — CreateAssignmentView with its
 * 30+ wizard props.  Lifted out of App.tsx so the prop-forwarding
 * doesn't crowd the orchestrator.
 *
 * Closure deps from App's render scope (state, setters, sibling-hook
 * helpers) come in via CreateAssignmentContext (App.tsx wraps this
 * branch in a CreateAssignmentProvider).
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { isPro } from '../core/plan';
import { generateAiLesson, type AiLessonParams } from '../utils/aiLesson';
import { useCreateAssignment, type CreateAssignmentSectionDeps } from './CreateAssignmentContext';

// Re-export so existing importers keep resolving the deps type from here.
export type { CreateAssignmentSectionDeps };

const CreateAssignmentView = lazyWithRetry(() => import('./CreateAssignmentView'));

export function CreateAssignmentSection(): ReactNode {
  const deps = useCreateAssignment();
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
          } else if (type === 'wheel') {
            setView('wheel');
          } else if (type === 'vocabagrut') {
            setView('vocabagrut');
          }
        }}
      />
    </LazyWrapper>
  );
}
