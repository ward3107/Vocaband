import DashboardOnboarding from "../components/DashboardOnboarding";
import TopAppBar from "../components/TopAppBar";
import { ErrorTrackingPanel } from "../components/ErrorTrackingPanel";
import { supabase } from "../core/supabase";
import TeacherQuickActions from "../components/dashboard/TeacherQuickActions";
import TeacherClassesSection from "../components/dashboard/TeacherClassesSection";
import SavedTasksSection from "../components/dashboard/SavedTasksSection";
import CreateClassModal from "../components/dashboard/CreateClassModal";
import EditClassModal from "../components/dashboard/EditClassModal";
import ClassCreatedModal from "../components/dashboard/ClassCreatedModal";
import DeleteAssignmentModal from "../components/dashboard/DeleteAssignmentModal";
import RejectStudentModal from "../components/dashboard/RejectStudentModal";
import ToastList, { type Toast } from "../components/dashboard/ToastList";
import ConfirmDialog, { type ConfirmDialogState } from "../components/dashboard/ConfirmDialog";
import type { AppUser, ClassData, AssignmentData } from "../core/supabase";
import type { SavedTask } from "../hooks/useSavedTasks";

interface TeacherDashboardViewProps {
  user: AppUser;
  consentModal: React.ReactNode;
  exitConfirmModal: React.ReactNode;
  ocrCropModal: React.ReactNode;
  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;

  // Classes + assignments
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  pendingStudentsCount: number;

  // Clipboard / dropdown state
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  openDropdownClassId: string | null;
  setOpenDropdownClassId: React.Dispatch<React.SetStateAction<string | null>>;

  // Modals
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
  onConfirmDeleteAssignment: (id: string, title: string) => void;

  rejectStudentModal: { id: string; displayName: string } | null;
  setRejectStudentModal: React.Dispatch<React.SetStateAction<{ id: string; displayName: string } | null>>;
  confirmRejectStudent: (id: string) => Promise<void>;

  toasts: Toast[];
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // Quick actions
  onQuickPlayClick: () => void;
  onLiveChallengeClick: () => void;
  /** Single entry point that opens the merged Classroom view. */
  onClassroomClick: () => void;
  onApprovalsClick: () => void;

  // Classes section handlers
  onNewClass: () => void;
  onAssignClass: (c: ClassData) => void;
  onDeleteClass: (classId: string) => void;
  /** Open the rename + change-avatar modal for the given class. */
  editingClass: ClassData | null;
  onEditClass: (c: ClassData) => void;
  onCloseEditClass: () => void;
  onSaveClassEdit: (next: { name: string; avatar: string | null }) => Promise<void>;
  /** Quick inline name change. */
  onNameChange?: (classId: string, newName: string) => Promise<void>;
  /** Quick inline avatar change. */
  onAvatarChange?: (classId: string, newAvatar: string | null) => Promise<void>;
  onEditAssignment: (a: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (a: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (a: AssignmentData) => void;

  // Saved-task templates (localStorage-backed, see useSavedTasks).
  savedTasks?: SavedTask[];
  onUseSavedTask?: (task: SavedTask) => void;
  onTogglePinSavedTask?: (id: string) => void;
  onRemoveSavedTask?: (id: string) => void;
}

export default function TeacherDashboardView({
  user, consentModal, exitConfirmModal, ocrCropModal,
  showOnboarding, setShowOnboarding,
  classes, teacherAssignments, pendingStudentsCount,
  copiedCode, setCopiedCode,
  openDropdownClassId, setOpenDropdownClassId,
  showCreateClassModal, setShowCreateClassModal,
  newClassName, setNewClassName, handleCreateClass,
  createdClassCode, createdClassName, setCreatedClassCode,
  deleteConfirmModal, setDeleteConfirmModal, onConfirmDeleteAssignment,
  rejectStudentModal, setRejectStudentModal, confirmRejectStudent,
  toasts, confirmDialog, setConfirmDialog,
  onQuickPlayClick, onLiveChallengeClick, onClassroomClick, onApprovalsClick,
  onNewClass, onAssignClass, onDeleteClass,
  editingClass, onEditClass, onCloseEditClass, onSaveClassEdit,
  onNameChange, onAvatarChange,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
  savedTasks, onUseSavedTask, onTogglePinSavedTask, onRemoveSavedTask,
}: TeacherDashboardViewProps) {
  // Time-of-day greeting — small but friendly touch so the teacher feels the
  // app is responsive to them and not a generic admin panel.
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user?.displayName || "").split(" ")[0] || "Teacher";

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pt-20 sm:pt-24 pb-12">
        {consentModal}
        {exitConfirmModal}

        {/* First-time onboarding tour */}
        {showOnboarding && (
          <DashboardOnboarding onComplete={() => {
            try { localStorage.setItem('vocaband_onboarding_done', 'true'); } catch { /* ignore */ }
            setShowOnboarding(false);
          }} />
        )}

        <TopAppBar
          title="Vocaband"
          subtitle="CEFR A1–B2 • ESL VOCABULARY"
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome hero — sets a calm, personal tone */}
          <div className="mb-8 sm:mb-10 pt-2 sm:pt-4">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-indigo-500 mb-2">
              {greeting}
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              {firstName}, here's your classroom.
            </h1>
            <p className="text-sm sm:text-base text-stone-500 mt-2">
              Manage your classes, review student progress, and create new assignments in a few taps.
            </p>
          </div>

          <TeacherQuickActions
            pendingStudentsCount={pendingStudentsCount}
            onQuickPlayClick={onQuickPlayClick}
            onLiveChallengeClick={onLiveChallengeClick}
            onClassroomClick={onClassroomClick}
            onApprovalsClick={onApprovalsClick}
          />

          <TeacherClassesSection
            classes={classes}
            teacherAssignments={teacherAssignments}
            copiedCode={copiedCode}
            setCopiedCode={setCopiedCode}
            openDropdownClassId={openDropdownClassId}
            setOpenDropdownClassId={setOpenDropdownClassId}
            onNewClass={onNewClass}
            onAssign={onAssignClass}
            onDeleteClass={onDeleteClass}
            onEditClass={onEditClass}
            onNameChange={onNameChange}
            onAvatarChange={onAvatarChange}
            onEditAssignment={onEditAssignment}
            onDuplicateAssignment={onDuplicateAssignment}
            onDeleteAssignment={onDeleteAssignment}
          />

          {savedTasks && onUseSavedTask && onTogglePinSavedTask && onRemoveSavedTask && (
            <SavedTasksSection
              tasks={savedTasks}
              onUse={onUseSavedTask}
              onTogglePin={onTogglePinSavedTask}
              onRemove={onRemoveSavedTask}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateClassModal
        show={showCreateClassModal}
        newClassName={newClassName}
        setNewClassName={setNewClassName}
        onCancel={() => setShowCreateClassModal(false)}
        onCreate={handleCreateClass}
      />

      <EditClassModal
        klass={editingClass}
        onClose={onCloseEditClass}
        onSave={onSaveClassEdit}
      />

      <ClassCreatedModal
        createdClassCode={createdClassCode}
        createdClassName={createdClassName}
        copiedCode={copiedCode}
        setCopiedCode={setCopiedCode}
        onDone={() => setCreatedClassCode(null)}
      />

      <DeleteAssignmentModal
        modal={deleteConfirmModal}
        onCancel={() => setDeleteConfirmModal(null)}
        onConfirm={onConfirmDeleteAssignment}
      />

      <RejectStudentModal
        modal={rejectStudentModal}
        onCancel={() => setRejectStudentModal(null)}
        onConfirm={async (id) => {
          await confirmRejectStudent(id);
          setRejectStudentModal(null);
        }}
      />

      {/* OCR Image Crop Modal */}
      {ocrCropModal}

      {/* Toast Notifications */}
      <ToastList toasts={toasts} />

      {/* Error Tracking Panel (Debug Mode) */}
      <ErrorTrackingPanel />

      {/* Confirmation Dialog */}
      <ConfirmDialog confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} />
    </>
  );
}
