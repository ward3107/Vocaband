/**
 * The class-show and worksheet view branches share the same shape:
 *   - Hebrew variant (different component, simpler prop set)
 *   - English variant with a constructed sources list + pickerWiring
 *     bag + an onExit that honours activityNavOrigin.
 *
 * Both are rendered through this section.  Returns JSX or null based
 * on which view is active.
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import type { Word } from '../data/vocabulary';
import type { AppUser, ClassData } from '../core/supabase';
import type { VocaId } from '../core/subject';
import type { View } from '../core/views';
import type { TranslationEntry } from '../hooks/useTranslate';

const ClassShowView = lazyWithRetry(() => import('./ClassShowView'));
const WorksheetView = lazyWithRetry(() => import('./WorksheetView'));
const HebrewClassShowView = lazyWithRetry(() => import('./HebrewClassShowView'));
const HebrewWorksheetView = lazyWithRetry(() => import('./HebrewWorksheetView'));

export interface ClassShowAndWorksheetSectionDeps {
  view: View;
  user: AppUser | null;
  selectedClass: ClassData | null;
  activeVoca: VocaId | null;
  activityNavOrigin: 'create-assignment' | null;

  classShowAssignment: { title: string; wordIds: number[]; customWords?: Word[] } | null;
  worksheetAssignment: {
    title: string;
    wordIds: number[];
    customWords?: Word[];
    className?: string | null;
  } | null;
  setClassShowAssignment: React.Dispatch<
    React.SetStateAction<{ title: string; wordIds: number[]; customWords?: Word[] } | null>
  >;
  setWorksheetAssignment: React.Dispatch<
    React.SetStateAction<{
      title: string;
      wordIds: number[];
      customWords?: Word[];
      className?: string | null;
    } | null>
  >;
  setView: React.Dispatch<React.SetStateAction<View>>;

  allWords: Word[];
  topicPacks: { name: string; icon: string; ids: number[] }[];
  translateWord: (word: string) => Promise<TranslationEntry | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateWordsBatch: any;
  onPickerOcrUpload: (file: File) => Promise<{ words: string[]; success?: boolean }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function buildSourcesFromAssignment(
  assignment: { title: string; wordIds: number[]; customWords?: Word[] } | null,
  allWords: Word[],
): { label: string; description?: string; words: Word[] }[] {
  if (!assignment) return [];
  const knownWords = allWords.filter((w) => assignment.wordIds.includes(w.id));
  const customs = assignment.customWords ?? [];
  const merged = [
    ...knownWords,
    ...customs.filter((c) => !knownWords.some((k) => k.id === c.id)),
  ];
  if (merged.length === 0) return [];
  return [{ label: assignment.title || 'Assignment', description: 'From assignment', words: merged }];
}

export function renderClassShowOrWorksheet(deps: ClassShowAndWorksheetSectionDeps): ReactNode {
  const {
    view, user, selectedClass, activeVoca, activityNavOrigin,
    classShowAssignment, worksheetAssignment,
    setClassShowAssignment, setWorksheetAssignment, setView,
    allWords, topicPacks, translateWord, translateWordsBatch,
    onPickerOcrUpload, showToast,
  } = deps;

  // Shared onExit semantics: if the teacher entered via the wizard's
  // activity tab strip, return there; otherwise go to the dashboard.
  const backDestination = () =>
    activityNavOrigin === 'create-assignment' && selectedClass ? 'create-assignment' : 'teacher-dashboard';

  if (view === 'class-show') {
    // Hebrew classes get a focused 2-mode projector view.  Two paths land
    // here: a teacher-selected class OR the dashboard tile (selectedClass
    // may be stale) — gate on activeVoca too so a Hebrew-tab teacher
    // can't fall through to the English picker.
    if (selectedClass?.subject === 'hebrew' || activeVoca === 'hebrew') {
      return (
        <LazyWrapper loadingMessage="טוען מצב הקרנה…">
          <HebrewClassShowView
            initialLemmaIds={classShowAssignment?.wordIds}
            className={selectedClass?.name ?? null}
            onExit={() => {
              setClassShowAssignment(null);
              setView(backDestination());
            }}
          />
        </LazyWrapper>
      );
    }

    return (
      <LazyWrapper loadingMessage="Loading class show…">
        <ClassShowView
          user={user}
          initialSources={buildSourcesFromAssignment(classShowAssignment, allWords)}
          initialSourceIndex={0}
          pickerWiring={{
            allWords,
            onTranslateWord: translateWord,
            onTranslateBatch: translateWordsBatch,
            onOcrUpload: onPickerOcrUpload,
            topicPacks,
            // savedGroups: pass [] for now — wiring useSavedWordGroups
            // through App-level state is a future PR.
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setClassShowAssignment(null);
            setView(backDestination());
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === 'worksheet') {
    // Hebrew classes get a focused single-template worksheet view.
    if (selectedClass?.subject === 'hebrew' || activeVoca === 'hebrew') {
      return (
        <LazyWrapper loadingMessage="טוען בונה דפי עבודה…">
          <HebrewWorksheetView
            initialLemmaIds={worksheetAssignment?.wordIds}
            initialTitle={worksheetAssignment?.title}
            className={worksheetAssignment?.className ?? selectedClass?.name ?? null}
            onBack={() => {
              setWorksheetAssignment(null);
              setView(backDestination());
            }}
          />
        </LazyWrapper>
      );
    }

    return (
      <LazyWrapper loadingMessage="Loading worksheet builder…">
        <WorksheetView
          user={user}
          initialSources={buildSourcesFromAssignment(worksheetAssignment, allWords)}
          initialSourceIndex={0}
          initialTitle={worksheetAssignment?.title}
          className={worksheetAssignment?.className ?? null}
          pickerWiring={{
            allWords,
            onTranslateWord: translateWord,
            onTranslateBatch: translateWordsBatch,
            onOcrUpload: onPickerOcrUpload,
            topicPacks,
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setWorksheetAssignment(null);
            setView(backDestination());
          }}
        />
      </LazyWrapper>
    );
  }

  return null;
}
