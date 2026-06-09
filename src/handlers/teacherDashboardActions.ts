/**
 * Teacher-dashboard medium-sized inline handlers — the ones that
 * are too big to be one-liners but too coupled to App state to
 * be utility functions.  Pulled out so the dashboard view branch
 * in App.tsx reads as ~10 lines of prop-forwarding instead of 60+.
 */
import type React from 'react';
import type { Word } from '../data/vocabulary';
import type { ClassData, AssignmentData } from '../core/supabase';
import { ALL_GAME_MODES } from '../constants/game';
import type { SavedTask } from '../hooks/useSavedTasks';
import type { View } from '../core/views';
import { createCategoryRaceSession, createSpeedRoundSession } from './quickPlaySession';

export interface QuickPlayClickDeps {
  cleanupSessionData: () => void;
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
  setView: React.Dispatch<React.SetStateAction<View>>;
}

/**
 * Dashboard "Quick Play" tap.  Sets the skip-restore flag so the
 * onAuthStateChange listener doesn't auto-rehydrate a stale QP
 * session, clears local cached session, then routes to the setup
 * wizard.  We DON'T call history.replaceState here — letting the
 * view-change effect push the new entry naturally on top of the
 * dashboard keeps the back button able to return cleanly.
 */
export function startQuickPlayFromDashboard(deps: QuickPlayClickDeps): void {
  try { sessionStorage.setItem('vocaband_skip_restore', 'true'); } catch { /* ignore */ }
  try { localStorage.removeItem('vocaband_quick_play_session'); } catch { /* ignore */ }
  deps.cleanupSessionData();
  deps.setQuickPlayActiveSession(null);
  deps.setQuickPlaySessionCode(null);
  deps.setView('quick-play-setup');
}

export interface CategoryRaceClickDeps {
  cleanupSessionData: () => void;
  setQuickPlayActiveSession: QuickPlayClickDeps['setQuickPlayActiveSession'];
  setQuickPlaySessionCode: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Dashboard "Category Race" tap. Unlike Quick Play there's no word
 * picker — it creates a wordless race session immediately and drops the
 * teacher into the live host control room. Clears any stale QP state
 * first so we don't carry a previous session's words/code over.
 */
export async function startCategoryRaceFromDashboard(deps: CategoryRaceClickDeps): Promise<void> {
  try { sessionStorage.setItem('vocaband_skip_restore', 'true'); } catch { /* ignore */ }
  try { localStorage.removeItem('vocaband_quick_play_session'); } catch { /* ignore */ }
  deps.cleanupSessionData();
  deps.setQuickPlayActiveSession(null);
  deps.setQuickPlaySessionCode(null);
  try {
    await createCategoryRaceSession({
      showToast: deps.showToast,
      failedCreateSessionMsg: (err) => `Couldn't start the race: ${err}`,
      setSessionCode: (code) => deps.setQuickPlaySessionCode(code),
      setActiveSession: (s) => deps.setQuickPlayActiveSession({
        id: s.id,
        sessionCode: s.sessionCode,
        wordIds: s.wordIds,
        words: s.words,
        allowedModes: s.allowedModes,
      }),
    });
    deps.setView('category-race-host');
  } catch {
    /* createCategoryRaceSession already surfaced a toast */
  }
}

/**
 * Dashboard "Speed Round" tap. Like Category Race there's no word picker —
 * it creates a wordless speed session immediately and drops the teacher into
 * the live host control room (where they pick the set + mode + timer per
 * word). Clears any stale QP state first.
 */
export async function startSpeedRoundFromDashboard(deps: CategoryRaceClickDeps): Promise<void> {
  try { sessionStorage.setItem('vocaband_skip_restore', 'true'); } catch { /* ignore */ }
  try { localStorage.removeItem('vocaband_quick_play_session'); } catch { /* ignore */ }
  deps.cleanupSessionData();
  deps.setQuickPlayActiveSession(null);
  deps.setQuickPlaySessionCode(null);
  try {
    await createSpeedRoundSession({
      showToast: deps.showToast,
      failedCreateSessionMsg: (err) => `Couldn't start Speed Round: ${err}`,
      setSessionCode: (code) => deps.setQuickPlaySessionCode(code),
      setActiveSession: (s) => deps.setQuickPlayActiveSession({
        id: s.id,
        sessionCode: s.sessionCode,
        wordIds: s.wordIds,
        words: s.words,
        allowedModes: s.allowedModes,
      }),
    });
    deps.setView('speed-round-host');
  } catch {
    /* createSpeedRoundSession already surfaced a toast */
  }
}

export interface AssignClassDeps {
  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setAssignmentStep: React.Dispatch<React.SetStateAction<number>>;
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  setAssignmentTitle: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentDeadline: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
}

/**
 * "Assign work to this class" tap on a class card.  Resets the wizard
 * to step 1 with empty fields under the chosen class context.
 */
export function startAssignClassFlow(c: ClassData, deps: AssignClassDeps): void {
  deps.setSelectedClass(c);
  deps.setView('create-assignment');
  deps.setAssignmentStep(1);
  deps.setSelectedWords([]);
  deps.setAssignmentTitle('');
  deps.setAssignmentDeadline('');
  deps.setAssignmentModes([]);
  deps.setAssignmentSentences([]);
  deps.setEditingAssignment(null);
}

export interface LoadAssignmentIntoFormDeps {
  allWords: Word[];
  set1Words: Word[];
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setAssignmentTitle: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentDeadline: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  setSentenceDifficulty: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
  setSentencesAutoGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedLevel: React.Dispatch<React.SetStateAction<'Set 1' | 'Set 2' | 'Custom'>>;
  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

/**
 * Shared between onEditAssignment and onDuplicateAssignment — the two
 * paths only diverge on the title (duplicate appends " (copy)").
 */
export function loadAssignmentIntoCreateForm(
  assignment: AssignmentData,
  c: ClassData,
  asDuplicate: boolean,
  deps: LoadAssignmentIntoFormDeps,
): void {
  const { allWords, set1Words } = deps;
  deps.setEditingAssignment(assignment);
  const knownIds = assignment.wordIds.filter((id) => allWords.some((w) => w.id === id));
  const unknownWords: Word[] = (assignment.words ?? []).filter(
    (w: Word) => !allWords.some((aw) => aw.id === w.id),
  );
  const customIds = unknownWords.map((w) => w.id);
  deps.setSelectedWords([...assignment.wordIds, ...customIds]);
  deps.setCustomWords(unknownWords);
  deps.setAssignmentTitle(asDuplicate ? assignment.title + ' (copy)' : assignment.title);
  deps.setAssignmentDeadline(assignment.deadline || '');
  deps.setAssignmentModes(assignment.allowedModes ?? ALL_GAME_MODES);
  deps.setAssignmentSentences(assignment.sentences ?? []);
  deps.setSentenceDifficulty((assignment.sentenceDifficulty ?? 2) as 1 | 2 | 3 | 4);
  deps.setSentencesAutoGenerated(true);
  if (knownIds.some((id) => set1Words.some((w) => w.id === id))) deps.setSelectedLevel('Set 1');
  else if (unknownWords.length > 0) deps.setSelectedLevel('Custom');
  else deps.setSelectedLevel('Set 2');
  deps.setSelectedClass(c);
  deps.setView('create-assignment');
}

export interface UseSavedTaskDeps {
  allWords: Word[];
  classes: ClassData[];
  selectedClass: ClassData | null;
  savedTasksBumpUse: (id: string) => void;
  setQuickPlaySelectedWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setQuickPlayInitialModes: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  setAssignmentTitle: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentDeadline: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  setSentenceDifficulty: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setAssignmentStep: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Re-launch a saved task (Quick Play or Assignment template).  Resolves
 * word IDs back to full Word objects; IDs that no longer exist in
 * allWords are silently skipped — that happens if the teacher deleted
 * a custom word after saving the template.
 */
export function applySavedTask(task: SavedTask, deps: UseSavedTaskDeps): void {
  const { allWords, classes, selectedClass, savedTasksBumpUse, showToast } = deps;
  const resolvedWords = task.wordIds
    .map((id) => allWords.find((w) => w.id === id))
    .filter((w): w is Word => Boolean(w));
  const resolvedIds = resolvedWords.map((w) => w.id);

  savedTasksBumpUse(task.id);

  if (task.mode === 'quick-play') {
    deps.setQuickPlaySelectedWords(resolvedWords);
    deps.setQuickPlayInitialModes(task.modes);
    deps.setView('quick-play-setup');
    return;
  }

  // Assignment template — needs a class context.  Default to the
  // teacher's first class so the wizard can render; the teacher can
  // change class via the Back button if needed.
  const targetClass = selectedClass ?? classes[0];
  if (!targetClass) {
    showToast('Create a class first to use this template.', 'info');
    return;
  }

  deps.setSelectedClass(targetClass);
  deps.setSelectedWords(resolvedIds);
  deps.setAssignmentTitle(task.title);
  deps.setAssignmentDeadline('');
  deps.setAssignmentModes(task.modes);
  deps.setAssignmentSentences(task.sentences ?? []);
  if (task.sentenceDifficulty !== undefined) {
    deps.setSentenceDifficulty(task.sentenceDifficulty);
  }
  deps.setEditingAssignment(null);
  deps.setView('create-assignment');
  deps.setAssignmentStep(1);
}
