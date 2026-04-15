import DashboardOnboarding from "../components/DashboardOnboarding";
import TopAppBar from "../components/TopAppBar";
import { ErrorTrackingPanel } from "../components/ErrorTrackingPanel";
import { supabase } from "../core/supabase";
import TeacherQuickActions from "../components/dashboard/TeacherQuickActions";
import TeacherClassesSection from "../components/dashboard/TeacherClassesSection";
import CreateClassModal from "../components/dashboard/CreateClassModal";
import ClassCreatedModal from "../components/dashboard/ClassCreatedModal";
import DeleteAssignmentModal from "../components/dashboard/DeleteAssignmentModal";
import RejectStudentModal from "../components/dashboard/RejectStudentModal";
import ToastList, { type Toast } from "../components/dashboard/ToastList";
import ConfirmDialog, { type ConfirmDialogState } from "../components/dashboard/ConfirmDialog";
import type { AppUser, ClassData, AssignmentData } from "../core/supabase";

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
  onAnalyticsClick: () => void;
  onGradebookClick: () => void;
  onApprovalsClick: () => void;

  // Classes section handlers
  onNewClass: () => void;
  onAssignClass: (c: ClassData) => void;
  onDeleteClass: (classId: string) => void;
  onEditAssignment: (a: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (a: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (a: AssignmentData) => void;
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
  onQuickPlayClick, onLiveChallengeClick, onAnalyticsClick, onGradebookClick, onApprovalsClick,
  onNewClass, onAssignClass, onDeleteClass,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
}: TeacherDashboardViewProps) {
  return (
    <>
      <div
        className="min-h-screen bg-surface pt-24 pb-8"
        style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}
      >
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
          subtitle="ISRAELI ENGLISH CURRICULUM • BANDS VOCABULARY"
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <div className="" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>
          <TeacherQuickActions
            pendingStudentsCount={pendingStudentsCount}
            onQuickPlayClick={onQuickPlayClick}
            onLiveChallengeClick={onLiveChallengeClick}
            onAnalyticsClick={onAnalyticsClick}
            onGradebookClick={onGradebookClick}
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
            onEditAssignment={onEditAssignment}
            onDuplicateAssignment={onDuplicateAssignment}
            onDeleteAssignment={onDeleteAssignment}
          />
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
