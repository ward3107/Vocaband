/**
 * Quick Play setup view branch — picks Hebrew vs English variant on
 * activeVoca, threads the create-session handler through, then
 * forwards the wizard prop bag.
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { isPro } from '../core/plan';
import {
  createEnglishQuickPlaySession,
  createHebrewQuickPlaySession,
} from '../handlers/quickPlaySession';
import { generateAndStoreQuickPlayAiSentences } from '../utils/generateAndStoreQuickPlayAiSentences';
import { generateAiLesson, type AiLessonParams } from '../utils/aiLesson';
import { performUserLogout } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { AppUser } from '../core/supabase';
import type { VocaId } from '../core/subject';
import type { SavedTaskInput } from '../hooks/useSavedTasks';
import type { View } from '../core/views';

const HebrewQuickPlaySetupView = lazyWithRetry(() => import('./HebrewQuickPlaySetupView'));
const QuickPlaySetupView = lazyWithRetry(() => import('./QuickPlaySetupView'));

export interface QuickPlaySetupSectionDeps {
  activeVoca: VocaId | null;
  user: AppUser | null;
  setView: React.Dispatch<React.SetStateAction<View>>;

  allWords: Word[];
  topicPacks: { name: string; icon: string; ids: number[] }[];

  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  quickPlayInitialWords: Word[];
  quickPlayInitialModes: string[] | undefined;

  isOcrProcessing: boolean;
  ocrProgress: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleOcrUpload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDocxUpload: any;

  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showPaywallToast: (msg: string) => void;
  speakWord: (wordId: number, fallbackText: string) => void;
  translateWord: (word: string) => Promise<{
    hebrew: string;
    arabic: string;
    russian?: string;
    match: number;
  } | null>;

  setQuickPlayActiveSession: React.Dispatch<
    React.SetStateAction<{
      id: string;
      sessionCode: string;
      wordIds: number[];
      words: Word[];
      allowedModes?: string[];
      aiSentences?: string[];
    } | null>
  >;
  setQuickPlaySessionCode: React.Dispatch<React.SetStateAction<string | null>>;

  onSaveTemplate: (input: SavedTaskInput) => void;
  appToasts: { failedCreateSession: (m: string) => string };

  assignmentSentences: string[];
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  sentenceDifficulty: 1 | 2 | 3 | 4;
  setSentenceDifficulty: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
}

export function QuickPlaySetupSection(deps: QuickPlaySetupSectionDeps): ReactNode {
  const {
    activeVoca, user, setView,
    allWords, topicPacks,
    customWords, setCustomWords,
    quickPlayInitialWords, quickPlayInitialModes,
    isOcrProcessing, ocrProgress,
    handleOcrUpload, handleDocxUpload,
    showToast, showPaywallToast, speakWord, translateWord,
    setQuickPlayActiveSession, setQuickPlaySessionCode,
    onSaveTemplate, appToasts,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
  } = deps;

  // VocaHebrew gets a focused Hebrew-only setup that surfaces
  // HEBREW_LEMMAS via HEBREW_PACKS — never ALL_WORDS or TOPIC_PACKS.
  // Requires the 20260510_quick_play_subject migration; without it
  // the RPC call rejects p_subject and the teacher sees a "Failed
  // to create session" toast.
  if (activeVoca === 'hebrew') {
    return (
      <LazyWrapper loadingMessage="טוען…">
        <HebrewQuickPlaySetupView
          onBack={() => setView('teacher-dashboard')}
          onOpenMonitor={() => setView('quick-play-teacher-monitor')}
          onCreateSession={(lemmaIds, modes, hebrewTitle) =>
            createHebrewQuickPlaySession(lemmaIds, modes, hebrewTitle, {
              showToast,
              failedCreateSessionMsg: appToasts.failedCreateSession,
              setSessionCode: setQuickPlaySessionCode,
              setActiveSession: setQuickPlayActiveSession,
            })
          }
        />
      </LazyWrapper>
    );
  }

  return (
    <LazyWrapper loadingMessage="Loading quick play setup...">
      <QuickPlaySetupView
        allWords={allWords}
        onSaveTemplate={onSaveTemplate}
        initialSelectedWords={quickPlayInitialWords}
        initialSelectedModes={quickPlayInitialModes}
        onOcrUpload={handleOcrUpload}
        isOcrProcessing={isOcrProcessing}
        ocrProgress={ocrProgress}
        onDocxUpload={handleDocxUpload}
        customWords={customWords}
        onCustomWordsChange={setCustomWords}
        onCreateSession={(words, modes) =>
          createEnglishQuickPlaySession(
            words,
            modes,
            {
              showToast,
              failedCreateSessionMsg: appToasts.failedCreateSession,
              setSessionCode: setQuickPlaySessionCode,
              setActiveSession: setQuickPlayActiveSession,
            },
            (id, w, n) => { void generateAndStoreQuickPlayAiSentences(id, w, n); },
          )
        }
        onOpenMonitor={() => setView('quick-play-teacher-monitor')}
        onBack={() => setView('teacher-dashboard')}
        autoMatchPartial={true}
        showLevelFilter={false}
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText ?? '')}
        onTranslateWord={translateWord}
        onGenerateLesson={(params: AiLessonParams) =>
          generateAiLesson(params, { showToast, showPaywallToast })
        }
        topicPacks={topicPacks}
        user={user}
        onLogout={() => performUserLogout()}
        isProUser={isPro(user)}
        // Sentence Builder config — without these props the Sentence
        // Difficulty buttons in ConfigureStep no-op and the AI-sentences
        // button has nowhere to store output.  Forwarded here so they
        // reach ConfigureStep via the {...rest} spread in QuickPlaySetupView.
        assignmentSentences={assignmentSentences}
        onSentencesChange={setAssignmentSentences}
        sentenceDifficulty={sentenceDifficulty}
        onSentenceDifficultyChange={setSentenceDifficulty}
      />
    </LazyWrapper>
  );
}
