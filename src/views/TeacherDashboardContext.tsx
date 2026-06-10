/**
 * TeacherDashboardContext — carries App.tsx's teacher-dashboard prop bag
 * (the ~50 fields that used to be passed to TeacherDashboardSection) down
 * to the dashboard branch without manual prop forwarding.
 *
 * WHY a context: the teacher dashboard is a deep, single-owner subtree.
 * App.tsx owns all the state + handlers; TeacherDashboardSection is the
 * only consumer.  Passing ~50 fields through a single call was pure
 * plumbing — context removes the explicit hand-off.
 *
 * The interface lives here (single source of truth) and is re-exported
 * from TeacherDashboardSection.tsx so existing importers don't break.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type React from 'react';
import type { Word } from '../data/vocabulary';
import type { AppUser, ClassData, AssignmentData } from '../core/supabase';
import type { VocaId } from '../core/subject';
import type { SavedTask } from '../hooks/useSavedTasks';
import type { View } from '../core/views';

type AppToasts = {
  failedDeleteFromDb: (m: string) => string;
  assignmentRestored: string;
  failedDeleteAssignment: (m: string) => string;
  assignmentDeleted: string;
  couldNotSetupClass: string;
};

type Toast = { id: string; message: string; type: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void } };
type ConfirmDialog = { show: boolean; message: string; onConfirm: () => void };

export interface TeacherDashboardSectionDeps {
  user: AppUser;
  activeVoca: VocaId | null;
  showVocaSwitcher: boolean;
  setActiveVoca: React.Dispatch<React.SetStateAction<VocaId | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;

  consentModal: ReactNode;
  exitConfirmModal: ReactNode;
  ocrCropModal: ReactNode;

  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;

  visibleClasses: ClassData[];
  visibleAssignments: AssignmentData[];
  pendingStudentsCount: number;

  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  openDropdownClassId: string | null;
  setOpenDropdownClassId: React.Dispatch<React.SetStateAction<string | null>>;

  showCreateClassModal: boolean;
  setShowCreateClassModal: React.Dispatch<React.SetStateAction<boolean>>;
  newClassName: string;
  setNewClassName: React.Dispatch<React.SetStateAction<string>>;
  handleCreateClass: () => void;
  createdClassCode: string | null;
  createdClassName: string;
  setCreatedClassCode: React.Dispatch<React.SetStateAction<string | null>>;

  deleteConfirmModal: { id: string; title: string } | null;
  setDeleteConfirmModal: React.Dispatch<React.SetStateAction<{ id: string; title: string } | null>>;
  setTeacherAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  appToasts: AppToasts;

  rejectStudentModal: { id: string; displayName: string } | null;
  setRejectStudentModal: React.Dispatch<React.SetStateAction<{ id: string; displayName: string } | null>>;
  confirmRejectStudent: (id: string) => Promise<void>;
  toasts: Toast[];
  confirmDialog: ConfirmDialog;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialog>>;

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

  fetchScores: () => void;
  fetchTeacherAssignments: (classIdsOverride?: string[]) => Promise<void> | void;
  loadPendingStudents: () => void;
  setActivityNavOrigin: React.Dispatch<React.SetStateAction<'create-assignment' | null>>;
  setClassShowAssignment: React.Dispatch<
    React.SetStateAction<{ title: string; wordIds: number[]; customWords?: Word[] } | null>
  >;
  setWorksheetAssignment: React.Dispatch<
    React.SetStateAction<{ title: string; wordIds: number[]; customWords?: Word[]; className?: string | null } | null>
  >;

  setSelectedClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  selectedClass: ClassData | null;
  classes: ClassData[];
  setAssignmentStep: React.Dispatch<React.SetStateAction<number>>;
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  setAssignmentTitle: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentDeadline: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  setAssignmentSentences: React.Dispatch<React.SetStateAction<string[]>>;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  handleDeleteClass: (classId: string) => void;

  editingClass: ClassData | null;
  setEditingClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  setClasses: React.Dispatch<React.SetStateAction<ClassData[]>>;

  allWords: Word[];
  set1Words: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setSentenceDifficulty: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
  setSentencesAutoGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedLevel: React.Dispatch<React.SetStateAction<'Set 1' | 'Set 2' | 'Custom'>>;

  setRosterModalClass: React.Dispatch<React.SetStateAction<ClassData | null>>;
  rosterModalClass: ClassData | null;

  savedTasks: {
    tasks: SavedTask[];
    togglePin: (id: string) => void;
    remove: (id: string) => void;
    bumpUse: (id: string) => void;
  };
  setQuickPlaySelectedWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setQuickPlayInitialModes: React.Dispatch<React.SetStateAction<string[] | undefined>>;
}

const TeacherDashboardContext = createContext<TeacherDashboardSectionDeps | null>(null);

/**
 * Provider for the teacher-dashboard prop bag.  App.tsx wraps the
 * dashboard branch with this and passes its existing object literal as
 * `value`.
 *
 * WHY the value is NOT memoized at the call site: App passes the same
 * inline object literal it used to pass to TeacherDashboardSection(), so
 * the context value's per-render identity is byte-for-byte identical to
 * the old prop object.  Memoizing here (or in App) would change consumer
 * re-render timing — every render currently produces a fresh bag, and the
 * dashboard depends on that to pick up new state each render.  Preserving
 * the un-memoized identity keeps behavior identical.
 */
export function TeacherDashboardProvider({
  value,
  children,
}: {
  value: TeacherDashboardSectionDeps;
  children: ReactNode;
}) {
  return <TeacherDashboardContext.Provider value={value}>{children}</TeacherDashboardContext.Provider>;
}

/** Read the teacher-dashboard prop bag.  Throws if used outside the provider. */
export function useTeacherDashboard(): TeacherDashboardSectionDeps {
  const ctx = useContext(TeacherDashboardContext);
  if (ctx === null) {
    throw new Error('useTeacherDashboard must be used within a TeacherDashboardProvider');
  }
  return ctx;
}
