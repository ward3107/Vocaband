/**
 * The teacher-dashboard view branch — TeacherDashboardView + the
 * Voca-switcher button + ClassRosterModal — pulled out of App.tsx
 * so the 186-line JSX block doesn't crowd the orchestrator.
 *
 * Behaviour preserved exactly.  Closure deps from App's render scope
 * (state, setters, sibling-hook helpers) come in via a deps bag.
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import ClassRosterModal from '../components/ClassRosterModal';
import SvgArrowLeftRight from '../components/svg/SvgArrowLeftRight';
import { logAudit } from '../utils/audit';
import {
  deleteAssignmentWithUndo,
  deleteAssignmentImmediate,
} from '../handlers/deleteAssignmentWithUndo';
import { saveClassEdit, renameClass, changeClassAvatar } from '../handlers/classEdits';
import {
  completeTeacherOnboarding,
  skipTeacherOnboarding,
} from '../handlers/teacherOnboarding';
import {
  startQuickPlayFromDashboard,
  startAssignClassFlow,
  loadAssignmentIntoCreateForm,
  applySavedTask,
} from '../handlers/teacherDashboardActions';
import type { Word } from '../data/vocabulary';
import type { AppUser, ClassData, AssignmentData } from '../core/supabase';
import type { VocaId } from '../core/subject';
import type { SavedTask } from '../hooks/useSavedTasks';
import type { View } from '../core/views';

const TeacherDashboardView = lazyWithRetry(() => import('./TeacherDashboardView'));

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

export function TeacherDashboardSection(deps: TeacherDashboardSectionDeps): ReactNode {
  const {
    user, activeVoca, showVocaSwitcher, setActiveVoca, setView, setUser,
    consentModal, exitConfirmModal, ocrCropModal,
    showOnboarding, setShowOnboarding,
    visibleClasses, visibleAssignments, pendingStudentsCount,
    copiedCode, setCopiedCode, openDropdownClassId, setOpenDropdownClassId,
    showCreateClassModal, setShowCreateClassModal,
    newClassName, setNewClassName, handleCreateClass,
    createdClassCode, createdClassName, setCreatedClassCode,
    deleteConfirmModal, setDeleteConfirmModal,
    setTeacherAssignments, setToasts, showToast, appToasts,
    rejectStudentModal, setRejectStudentModal, confirmRejectStudent,
    toasts, confirmDialog, setConfirmDialog,
    cleanupSessionData, setQuickPlayActiveSession, setQuickPlaySessionCode,
    fetchScores, fetchTeacherAssignments, loadPendingStudents,
    setActivityNavOrigin, setClassShowAssignment, setWorksheetAssignment,
    setSelectedClass, selectedClass, classes,
    setAssignmentStep, setSelectedWords, setAssignmentTitle,
    setAssignmentDeadline, setAssignmentModes, setAssignmentSentences,
    setEditingAssignment, handleDeleteClass,
    editingClass, setEditingClass, setClasses,
    allWords, set1Words, setCustomWords,
    setSentenceDifficulty, setSentencesAutoGenerated, setSelectedLevel,
    setRosterModalClass, rosterModalClass,
    savedTasks, setQuickPlaySelectedWords, setQuickPlayInitialModes,
  } = deps;

  // Voca switcher button — rendered inside TopAppBar's controls, sits
  // in the flex flow next to the language switcher (not floated).
  const vocaSwitcherButton = showVocaSwitcher ? (
    <button
      type="button"
      onClick={() => { setActiveVoca(null); setView('voca-picker'); }}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-600 text-white text-[10px] sm:text-xs font-black tracking-wider shadow-sm hover:bg-indigo-500 active:scale-95 transition"
      title={activeVoca === 'hebrew' ? 'החלף ל-Voca אחר' : 'Switch to another Voca'}
    >
      <SvgArrowLeftRight size={12} />
      <span className="hidden sm:inline">{activeVoca === 'hebrew' ? 'החלף Voca' : 'Switch Voca'}</span>
      <span className="sm:hidden">{activeVoca === 'hebrew' ? 'החלף' : 'Switch'}</span>
    </button>
  ) : null;

  // Deps bag shared by the dashboard's medium-sized inline handlers.
  const tdActionDeps = {
    allWords, set1Words,
    setEditingAssignment, setSelectedWords, setCustomWords,
    setAssignmentTitle, setAssignmentDeadline, setAssignmentModes,
    setAssignmentSentences, setSentenceDifficulty, setSentencesAutoGenerated,
    setSelectedLevel, setSelectedClass, setView,
  };

  return (
    <LazyWrapper loadingMessage="Loading dashboard...">
      <TeacherDashboardView
        user={user}
        setUser={setUser}
        subject={activeVoca ?? 'english'}
        headerExtra={vocaSwitcherButton}
        consentModal={consentModal}
        exitConfirmModal={exitConfirmModal}
        ocrCropModal={ocrCropModal}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        classes={visibleClasses}
        teacherAssignments={visibleAssignments}
        pendingStudentsCount={pendingStudentsCount}
        copiedCode={copiedCode}
        setCopiedCode={setCopiedCode}
        openDropdownClassId={openDropdownClassId}
        setOpenDropdownClassId={setOpenDropdownClassId}
        showCreateClassModal={showCreateClassModal}
        setShowCreateClassModal={setShowCreateClassModal}
        newClassName={newClassName}
        setNewClassName={setNewClassName}
        handleCreateClass={handleCreateClass}
        createdClassCode={createdClassCode}
        createdClassName={createdClassName}
        setCreatedClassCode={setCreatedClassCode}
        deleteConfirmModal={deleteConfirmModal}
        setDeleteConfirmModal={setDeleteConfirmModal}
        onConfirmDeleteAssignment={(deletedId, deletedTitle) =>
          deleteAssignmentWithUndo(deletedId, deletedTitle, {
            setTeacherAssignments, setDeleteConfirmModal, setToasts, showToast,
            failedDeleteMsg: appToasts.failedDeleteFromDb,
            restoredMsg: appToasts.assignmentRestored,
          })
        }
        rejectStudentModal={rejectStudentModal}
        setRejectStudentModal={setRejectStudentModal}
        confirmRejectStudent={confirmRejectStudent}
        toasts={toasts}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        onQuickPlayClick={() => startQuickPlayFromDashboard({
          cleanupSessionData, setQuickPlayActiveSession, setQuickPlaySessionCode, setView,
        })}
        onClassroomClick={() => {
          fetchScores();
          fetchTeacherAssignments();
          setView('classroom');
          // Audit-log the access ONCE per click, not per realtime push.
          // fetchScores re-fires on every progress INSERT, so logging there
          // caused a request storm — see 2026-05-04 audit fix.
          void logAudit('view_gradebook', 'progress');
        }}
        onApprovalsClick={() => { loadPendingStudents(); setView('teacher-approvals'); }}
        onWorksheetResultsClick={activeVoca === 'hebrew' ? undefined : () => setView('worksheet-attempts')}
        onLibraryClick={() => setView('vocabulary-library')}
        onProjectAssignmentToClass={(a) => {
          setActivityNavOrigin(null);
          setClassShowAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
          setView('class-show');
        }}
        onPrintAssignmentWorksheet={(a) => {
          setActivityNavOrigin(null);
          setWorksheetAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
          setView('worksheet');
        }}
        onNewClass={() => setShowCreateClassModal(true)}
        onAssignClass={(c) => startAssignClassFlow(c, {
          setSelectedClass, setView, setAssignmentStep, setSelectedWords,
          setAssignmentTitle, setAssignmentDeadline, setAssignmentModes,
          setAssignmentSentences, setEditingAssignment,
        })}
        onDeleteClass={(classId) => handleDeleteClass(classId)}
        editingClass={editingClass}
        onEditClass={(c) => setEditingClass(c)}
        onCloseEditClass={() => setEditingClass(null)}
        onSaveClassEdit={(next) =>
          editingClass
            ? saveClassEdit(editingClass.id, next, {
                setClasses, showToast,
                onSuccess: () => setEditingClass(null),
              })
            : Promise.resolve()
        }
        onNameChange={(classId, newName) => renameClass(classId, newName, { setClasses, showToast })}
        onAvatarChange={(classId, newAvatar) => changeClassAvatar(classId, newAvatar, { setClasses, showToast })}
        onEditAssignment={(assignment, c) => loadAssignmentIntoCreateForm(assignment, c, false, tdActionDeps)}
        onDuplicateAssignment={(assignment, c) => loadAssignmentIntoCreateForm(assignment, c, true, tdActionDeps)}
        onDeleteAssignment={(assignment) =>
          deleteAssignmentImmediate(assignment.id, {
            setTeacherAssignments, showToast,
            failedDeleteMsg: appToasts.failedDeleteAssignment,
            deletedMsg: appToasts.assignmentDeleted,
          })
        }
        onOpenRoster={(c) => setRosterModalClass(c)}
        savedTasks={savedTasks.tasks}
        onTogglePinSavedTask={savedTasks.togglePin}
        onRemoveSavedTask={savedTasks.remove}
        onUseSavedTask={(task: SavedTask) => applySavedTask(task, {
          allWords, classes, selectedClass,
          savedTasksBumpUse: savedTasks.bumpUse,
          setQuickPlaySelectedWords, setQuickPlayInitialModes,
          setSelectedClass, setSelectedWords,
          setAssignmentTitle, setAssignmentDeadline, setAssignmentModes,
          setAssignmentSentences, setSentenceDifficulty,
          setEditingAssignment, setView, setAssignmentStep,
          showToast,
        })}
        onWizardComplete={(result) =>
          completeTeacherOnboarding(result, {
            user, activeVoca, setClasses, setUser, showToast,
            couldNotSetupClassMsg: appToasts.couldNotSetupClass,
          })
        }
        onWizardSkip={() => skipTeacherOnboarding({ setUser })}
      />
      {rosterModalClass && (
        <ClassRosterModal
          open={!!rosterModalClass}
          onClose={() => setRosterModalClass(null)}
          classCode={rosterModalClass.code}
          className={rosterModalClass.name}
        />
      )}
    </LazyWrapper>
  );
}
