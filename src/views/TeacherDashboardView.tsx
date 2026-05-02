import { useMemo, useState } from "react";
import { Palette, Tv2 } from "lucide-react";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
import TeacherOnboardingWizard from "../components/onboarding/TeacherOnboardingWizard";
import DashboardOnboarding from "../components/DashboardOnboarding";
import TopAppBar from "../components/TopAppBar";
import { ErrorTrackingPanel } from "../components/ErrorTrackingPanel";
import RatingPrompt from "../components/RatingPrompt";
import { supabase } from "../core/supabase";
import TeacherThemeMenu from "../components/dashboard/TeacherThemeMenu";
import { useTeacherTheme } from "../hooks/useTeacherTheme";
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
  /** Needed for the dashboard theme picker to optimistically update
   *  the theme locally after the DB write succeeds. */
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
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
  /** Single entry point that opens the merged Classroom view. */
  onClassroomClick: () => void;
  onApprovalsClick: () => void;
  /** Impromptu Class Show — projector mode for phone-less classrooms. */
  onClassShowClick: () => void;
  /** Project a specific assignment to the class via Class Show. */
  onProjectAssignmentToClass: (a: AssignmentData) => void;
  /** Impromptu Worksheet builder — print word lists / scrambles / etc. */
  onWorksheetClick: () => void;
  /** Print a specific assignment as a worksheet. */
  onPrintAssignmentWorksheet: (a: AssignmentData) => void;

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

  /** First-class onboarding wizard handler.  When provided, the
   *  dashboard renders the wizard if the teacher has never onboarded
   *  AND has zero classes.  Returns the new class code for the
   *  wizard's success step. */
  onWizardComplete?: (result: import('../components/onboarding/TeacherOnboardingWizard').WizardResult) => Promise<{ classCode: string } | null>;
  /** Mark the wizard skipped/dismissed so it doesn't reappear. */
  onWizardSkip?: () => void;
}

export default function TeacherDashboardView({
  user, setUser, consentModal, exitConfirmModal, ocrCropModal,
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
  onQuickPlayClick, onClassroomClick, onApprovalsClick,
  onClassShowClick, onProjectAssignmentToClass,
  onWorksheetClick, onPrintAssignmentWorksheet,
  onNewClass, onAssignClass, onDeleteClass,
  editingClass, onEditClass, onCloseEditClass, onSaveClassEdit,
  onNameChange, onAvatarChange,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
  savedTasks, onUseSavedTask, onTogglePinSavedTask, onRemoveSavedTask,
  onWizardComplete, onWizardSkip,
}: TeacherDashboardViewProps) {
  // Time-of-day greeting — small but friendly touch so the teacher feels the
  // app is responsive to them and not a generic admin panel.
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user?.displayName || "").split(" ")[0] || "Teacher";

  // Per-teacher dashboard theme.  Resolved from the stored id with a
  // safety fallback so an unknown / removed theme doesn't break render.
  // The hook also writes the palette to CSS custom properties on
  // document.documentElement so descendants can read var(--vb-*).
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme: dashboardTheme } = useTeacherTheme(user?.teacherDashboardTheme);

  // Adaptive theme — Presentation Mode toggle.  Behind a feature flag
  // (VITE_ADAPTIVE_THEME=true at build time, or `?adaptive=1` in URL).
  // When the flag is OFF, `adaptiveEnabled` is false and the toggle
  // button is hidden so existing teachers see no UI change.
  const adaptiveTheme = useAdaptiveTheme();

  // ─── First-rating prompt gate ─────────────────────────────────────
  // Show the rating modal when the teacher has meaningfully USED the
  // product (≥1 class + ≥1 assignment created), hasn't rated yet, and
  // hasn't dismissed within the last 7 days.  A one-shot per session;
  // dismissed/rated state is the parent's source of truth.
  const [ratingDismissedThisSession, setRatingDismissedThisSession] = useState(false);
  const showRatingPrompt = useMemo(() => {
    if (ratingDismissedThisSession) return false;
    if (user?.firstRating != null) return false;
    if (user?.ratingDismissedAt) {
      const dismissedMs = new Date(user.ratingDismissedAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedMs < sevenDaysMs) return false;
    }
    return classes.length >= 1 && teacherAssignments.length >= 1;
  }, [user?.firstRating, user?.ratingDismissedAt, classes.length, teacherAssignments.length, ratingDismissedThisSession]);

  return (
    <>
      <div className={`min-h-screen ${dashboardTheme.bg} pt-20 sm:pt-24 pb-12`}>
        {consentModal}
        {exitConfirmModal}

        {/* First-time onboarding tour */}
        {showOnboarding && (
          <DashboardOnboarding onComplete={() => {
            try { localStorage.setItem('vocaband_onboarding_done', 'true'); } catch { /* ignore */ }
            setShowOnboarding(false);
          }} />
        )}

        {/* First-class onboarding wizard — opens for brand-new
            teachers (server-side flag + zero classes).  Server-backed
            so it doesn't re-fire on a different device.  Skipping
            also flips the flag so the wizard never re-appears for
            this teacher; "Open my dashboard" on step 4 also dismisses. */}
        {onWizardComplete && onWizardSkip && (
          <TeacherOnboardingWizard
            open={user?.onboardedAt == null && classes.length === 0}
            onComplete={onWizardComplete}
            onSkip={onWizardSkip}
          />
        )}

        <TopAppBar
          title="Vocaband"
          subtitle="CEFR A1–B2 • ESL VOCABULARY"
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
          showScaleControl
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome hero — sets a calm, personal tone.
              Text colours flip with `dashboardTheme.dark` so the
              "Midnight" theme (slate-900 background) doesn't hide
              the headline behind near-black text. */}
          <div className="mb-8 sm:mb-10 pt-2 sm:pt-4">
            <p
              className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--vb-accent)' }}
            >
              {greeting}
            </p>
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight"
              style={{ color: 'var(--vb-text-primary)' }}
            >
              {firstName}, here's your classroom.
            </h1>
            <p
              className="text-sm sm:text-base mt-2"
              style={{ color: 'var(--vb-text-secondary)' }}
            >
              Manage your classes, review student progress, and create new assignments in a few taps.
            </p>
          </div>

          <TeacherQuickActions
            pendingStudentsCount={pendingStudentsCount}
            onQuickPlayClick={onQuickPlayClick}
            onClassroomClick={onClassroomClick}
            onApprovalsClick={onApprovalsClick}
            onClassShowClick={onClassShowClick}
            onWorksheetClick={onWorksheetClick}
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
            onProjectAssignmentToClass={onProjectAssignmentToClass}
            onPrintAssignmentWorksheet={onPrintAssignmentWorksheet}
            isDark={dashboardTheme.dark}
          />

          {savedTasks && onUseSavedTask && onTogglePinSavedTask && onRemoveSavedTask && (
            <SavedTasksSection
              tasks={savedTasks}
              onUse={onUseSavedTask}
              onTogglePin={onTogglePinSavedTask}
              onRemove={onRemoveSavedTask}
              isDark={dashboardTheme.dark}
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

      {/* Theme picker — fixed-position floating trigger so it doesn't
          fight with the teacher's classes / assignments layout, and
          modal that mounts on demand.  Both pieces are scoped to this
          view; no other surface (game screens, student dashboards)
          renders them. */}
      <button
        type="button"
        onClick={() => setShowThemeMenu(true)}
        title="Change dashboard theme"
        aria-label="Change dashboard theme"
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: 'var(--vb-surface)',
          color: 'var(--vb-text-primary)',
          borderColor: 'var(--vb-border)',
        }}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Palette size={20} />
      </button>

      {/* Presentation Mode toggle — feature-flagged.  Sits just left
          of the theme picker button so the teacher can flip the
          screen into projector-friendly typography (1.4× font scale,
          stronger weight, no decorative shadows) before walking to
          the projector and back.  Hidden entirely when the
          `adaptiveTheme` feature flag is OFF — existing teachers see
          no UI change. */}
      {adaptiveTheme.adaptiveEnabled && (
        <button
          type="button"
          onClick={adaptiveTheme.togglePresentationMode}
          title={adaptiveTheme.presentationMode ? 'Exit presentation mode' : 'Presentation mode (bigger text for projecting)'}
          aria-label="Toggle presentation mode"
          aria-pressed={adaptiveTheme.presentationMode}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            backgroundColor: adaptiveTheme.presentationMode ? 'var(--vb-accent)' : 'var(--vb-surface)',
            color: adaptiveTheme.presentationMode ? 'var(--vb-accent-text)' : 'var(--vb-text-primary)',
            borderColor: adaptiveTheme.presentationMode ? 'var(--vb-accent)' : 'var(--vb-border)',
          }}
          className="fixed bottom-5 right-20 sm:bottom-6 sm:right-[5.5rem] z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Tv2 size={20} />
        </button>
      )}
      {showThemeMenu && (
        <TeacherThemeMenu user={user} setUser={setUser} onClose={() => setShowThemeMenu(false)} />
      )}

      {/* First-rating prompt — fires when the teacher has meaningfully
          USED the product (≥1 class + ≥1 assignment), hasn't already
          rated, and hasn't dismissed within the last 7 days.  See gate
          logic above. */}
      {showRatingPrompt && user && (
        <RatingPrompt
          user={user}
          kind="teacher"
          onDone={() => {
            setRatingDismissedThisSession(true);
            // Optimistically reflect the write so the gate flips off
            // even before the next users-row refetch.
            setUser(prev => prev ? {
              ...prev,
              firstRatingAt: new Date().toISOString(),
              ratingDismissedAt: prev.firstRating == null ? new Date().toISOString() : prev.ratingDismissedAt,
            } : prev);
          }}
        />
      )}
    </>
  );
}
