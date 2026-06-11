/**
 * CreateAssignmentContext — carries App.tsx's create-assignment prop bag
 * (the ~30 wizard fields that used to be passed to CreateAssignmentSection)
 * down to the create-assignment branch without manual prop forwarding.
 *
 * WHY a context: the create-assignment wizard is a deep, single-owner
 * subtree.  App.tsx owns all the state + handlers; CreateAssignmentSection
 * is the only consumer.  Passing ~30 fields through a single call was pure
 * plumbing — context removes the explicit hand-off.
 *
 * The interface lives here (single source of truth) and is re-exported
 * from CreateAssignmentSection.tsx so existing importers don't break.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type React from 'react';
import type { Word } from '../data/vocabulary';
import type { AppUser, ClassData, AssignmentData } from '../core/supabase';
import type { SavedTaskInput } from '../hooks/useSavedTasks';
import type { View } from '../core/views';

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

const CreateAssignmentContext = createContext<CreateAssignmentSectionDeps | null>(null);

/**
 * Provider for the create-assignment prop bag.  App.tsx wraps the
 * create-assignment branch with this and passes its existing object
 * literal as `value`.
 *
 * WHY the value is NOT memoized at the call site: App passes the same
 * inline object literal it used to pass to CreateAssignmentSection(), so
 * the context value's per-render identity is byte-for-byte identical to
 * the old prop object.  Memoizing here (or in App) would change consumer
 * re-render timing — every render currently produces a fresh bag, and the
 * wizard depends on that to pick up new state each render.  Preserving the
 * un-memoized identity keeps behavior identical.
 */
export function CreateAssignmentProvider({
  value,
  children,
}: {
  value: CreateAssignmentSectionDeps;
  children: ReactNode;
}) {
  return <CreateAssignmentContext.Provider value={value}>{children}</CreateAssignmentContext.Provider>;
}

/** Read the create-assignment prop bag.  Throws if used outside the provider. */
export function useCreateAssignment(): CreateAssignmentSectionDeps {
  const ctx = useContext(CreateAssignmentContext);
  if (ctx === null) {
    throw new Error('useCreateAssignment must be used within a CreateAssignmentProvider');
  }
  return ctx;
}
