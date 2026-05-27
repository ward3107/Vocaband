import { Suspense, useEffect, useMemo, useState } from "react";
import { Palette, Tv2 } from "lucide-react";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";
// usePresentationPrompt removed — the heuristic prompt was noisy and
// fired false positives on regular desktop monitors.  Replaced by
// fullscreen-auto-enable (see useEffect below) + the persistent Tv2
// toggle in the bottom-right corner.
// Lazy — pulls in motion/react and only opens for brand-new teachers.
const TeacherOnboardingWizard = lazyWithRetry(() => import("../components/onboarding/TeacherOnboardingWizard"));
import DashboardOnboarding from "../components/DashboardOnboarding";
import TopAppBar from "../components/TopAppBar";
import PageHero from "../components/PageHero";
import { ErrorTrackingPanel } from "../components/ErrorTrackingPanel";
import RatingPrompt from "../components/RatingPrompt";
import { performUserLogout } from "../core/supabase";
import TeacherThemeMenu from "../components/dashboard/TeacherThemeMenu";
import { useTeacherTheme } from "../hooks/useTeacherTheme";
import TeacherQuickActions from "../components/dashboard/TeacherQuickActions";
import NetworkDiagnosticButton from "../components/dashboard/NetworkDiagnosticButton";
import TeacherClassesSection from "../components/dashboard/TeacherClassesSection";
import EnglishDashboardLayout from "../components/dashboard/EnglishDashboardLayout";
import { useCompetitionsForClassIds } from "../hooks/useCompetitions";
import SavedTasksSection from "../components/dashboard/SavedTasksSection";
import CreateClassModal from "../components/dashboard/CreateClassModal";
import EditClassModal from "../components/dashboard/EditClassModal";
import ClassCreatedModal from "../components/dashboard/ClassCreatedModal";
import DeleteAssignmentModal from "../components/dashboard/DeleteAssignmentModal";
import RejectStudentModal from "../components/dashboard/RejectStudentModal";
import ToastList, { type Toast } from "../components/dashboard/ToastList";
import ConfirmDialog, { type ConfirmDialogState } from "../components/dashboard/ConfirmDialog";
import { useLanguage } from "../hooks/useLanguage";
import { teacherDashboardT } from "../locales/teacher/dashboard";
import { useFirstTimeGuide } from "../hooks/useFirstTimeGuide";
import FirstTimeGuide from "../components/onboarding/FirstTimeGuide";
import { teacherGuidesT } from "../locales/teacher/guides";
import type { AppUser, ClassData, AssignmentData } from "../core/supabase";
import type { VocaId } from "../core/subject";
import { Sparkles } from "lucide-react";
import type { SavedTask } from "../hooks/useSavedTasks";
import { isTrialing, getTrialDaysLeft, getEffectivePlan } from "../core/plan";

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
  /** Worksheet Results — teacher-facing dashboard of attempts at
   *  shared interactive worksheets.  Optional because Hebrew teachers
   *  don't get this tile (the feature is English-Set only for now). */
  onWorksheetResultsClick?: () => void;
  /** Open the Vocabulary Library — teacher-owned persistent word
   *  storage. Optional today so the tile is hidden until the caller
   *  wires it. */
  onLibraryClick?: () => void;
  /** Project a specific assignment to the class via Class Show.
   *  The standalone "Class Show" entry point lives in the New Activity
   *  wizard's tab strip now, not as a dashboard tile. */
  onProjectAssignmentToClass: (a: AssignmentData) => void;
  /** Print a specific assignment as a worksheet.  The standalone
   *  "Worksheet" entry point lives in the New Activity wizard's tab
   *  strip now, not as a dashboard tile. */
  onPrintAssignmentWorksheet: (a: AssignmentData) => void;

  // Classes section handlers
  onNewClass: () => void;
  onAssignClass: (c: ClassData) => void;
  onDeleteClass: (classId: string) => void;
  /** Open the rename + change-avatar modal for the given class. */
  editingClass: ClassData | null;
  onEditClass: (c: ClassData) => void;
  onCloseEditClass: () => void;
  onSaveClassEdit: (next: { name: string; avatar: string | null; schoolName: string | null; schoolLogoUrl: string | null; backgroundColor: string | null }) => Promise<void>;
  /** Quick inline name change. */
  onNameChange?: (classId: string, newName: string) => Promise<void>;
  /** Quick inline avatar change. */
  onAvatarChange?: (classId: string, newAvatar: string | null) => Promise<void>;
  onEditAssignment: (a: AssignmentData, c: ClassData) => void;
  onDuplicateAssignment: (a: AssignmentData, c: ClassData) => void;
  onDeleteAssignment: (a: AssignmentData) => void;
  /** Open the roster modal for a given class. */
  onOpenRoster?: (c: ClassData) => void;

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

  /** Active Voca for this teacher's session.  Drives subject-specific
   *  copy (TopAppBar subtitle, classes section title, etc.) and which
   *  quick actions are visible.  Defaults to 'english' so the existing
   *  English-only experience is preserved when the prop is omitted. */
  subject?: VocaId;
  /** Optional ReactNode rendered inside the TopAppBar's right-side
   *  controls (before Exit / scale / language / user chip).  Used by
   *  App.tsx to host the Voca switcher button so it lives in the
   *  header instead of floating over the page. */
  headerExtra?: React.ReactNode;
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
  onWorksheetResultsClick,
  onLibraryClick,
  onProjectAssignmentToClass,
  onPrintAssignmentWorksheet,
  onNewClass, onAssignClass, onDeleteClass,
  editingClass, onEditClass, onCloseEditClass, onSaveClassEdit,
  onNameChange, onAvatarChange,
  onEditAssignment, onDuplicateAssignment, onDeleteAssignment,
  onOpenRoster,
  savedTasks, onUseSavedTask, onTogglePinSavedTask, onRemoveSavedTask,
  onWizardComplete, onWizardSkip,
  subject = "english",
  headerExtra,
}: TeacherDashboardViewProps) {
  const { language, dir: uiDir } = useLanguage();
  // VocaHebrew is intrinsically a Hebrew-language product surface — its
  // dashboard renders in Hebrew (and RTL) regardless of which UI language
  // the teacher chose at the public-nav level.  When subject is 'english'
  // we honour the teacher's UI language as before.
  const isHebrew = subject === "hebrew";
  const effectiveLanguage = isHebrew ? "he" : language;
  const dir = isHebrew ? "rtl" : uiDir;
  const t = teacherDashboardT[effectiveLanguage];

  // One-time "what's new" intro for the Vocabulary Library. Surfaces
  // once per teacher account (tracked via users.guides_seen), suppressed
  // while the brand-new-teacher onboarding wizard is on screen so the
  // two modals never stack.
  const libraryIntroGuide = useFirstTimeGuide("library-intro");
  const libraryIntroStrings = teacherGuidesT[effectiveLanguage].libraryIntro;

  // Time-of-day greeting — small but friendly touch so the teacher feels the
  // app is responsive to them and not a generic admin panel.
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greetingMorning : hour < 18 ? t.greetingAfternoon : t.greetingEvening;
  const firstName = (user?.displayName || "").split(" ")[0] || t.defaultFirstName;

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

  // Auto-enable Presentation Mode the moment the teacher actually
  // enters fullscreen (F11 right before class is the clearest "I'm
  // about to project this" signal we can detect from the browser).
  // Auto-disables on exit so the regular dashboard returns to its
  // normal typography afterwards.  The persistent Tv2 button in the
  // bottom-right corner remains the manual control for cases where
  // a teacher wants Presentation Mode without going fullscreen.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFullscreen = () => {
      adaptiveTheme.setPresentationMode(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, [adaptiveTheme]);

  // ─── First-rating prompt gate ─────────────────────────────────────
  // Show the rating modal when the teacher has meaningfully USED the
  // product (≥1 class + ≥1 assignment created), hasn't rated yet, and
  // hasn't dismissed within the last 7 days.  A one-shot per session;
  // dismissed/rated state is the parent's source of truth.
  //
  // Delay (`ratingDelayElapsed`) — added 2026-05 in response to teacher
  // feedback "the rating modal pops up immediately when I land on the
  // dashboard and contrasts other things at the start".  We wait 45
  // seconds after dashboard mount before allowing the prompt to render,
  // so the teacher has time to settle in (look at classes, kick off an
  // action) before being interrupted.
  const [ratingDismissedThisSession, setRatingDismissedThisSession] = useState(false);
  const [ratingDelayElapsed, setRatingDelayElapsed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setRatingDelayElapsed(true), 45_000);
    return () => window.clearTimeout(id);
  }, []);

  // Prefetch the Worksheet Results chunk on idle so teachers who tap
  // the tile don't pay a cold-load round-trip.  Vite dedups the dynamic
  // import with MiscViewSections' lazyWithRetry mount.  Gated on the
  // click handler being wired so Hebrew teachers (no tile) don't pull
  // bytes they won't use.
  useEffect(() => {
    if (!onWorksheetResultsClick) return;
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const warm = () => { void import('./WorksheetAttemptsView'); };
    if (typeof ric === 'function') ric(warm, { timeout: 3000 });
    else window.setTimeout(warm, 1500);
  }, [onWorksheetResultsClick]);
  const showRatingPrompt = useMemo(() => {
    if (!ratingDelayElapsed) return false;
    if (ratingDismissedThisSession) return false;
    if (user?.firstRating != null) return false;
    if (user?.ratingDismissedAt) {
      const dismissedMs = new Date(user.ratingDismissedAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedMs < sevenDaysMs) return false;
    }
    return classes.length >= 1 && teacherAssignments.length >= 1;
  }, [user?.firstRating, user?.ratingDismissedAt, classes.length, teacherAssignments.length, ratingDismissedThisSession, ratingDelayElapsed]);

  // Active + recently-ended competitions across all of the teacher's
  // classes.  Realtime-pushed; cheap to compute since competitions are
  // a small table.  Indexed Map for O(1) lookup by assignment id when
  // ClassCard renders its assignment list.
  const teacherClassIds = useMemo(() => classes.map(c => c.id), [classes]);
  const { competitions: teacherCompetitions } = useCompetitionsForClassIds(teacherClassIds);
  const competitionsByAssignment = useMemo(
    () => new Map(teacherCompetitions.map(c => [c.assignmentId, c] as const)),
    [teacherCompetitions],
  );

  return (
    <>
      <div dir={dir} className={`min-h-screen ${dashboardTheme.bg} pt-20 sm:pt-24 pb-36 sm:pb-20`}>
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
        {onWizardComplete && onWizardSkip && user?.onboardedAt == null && classes.length === 0 && (
          // Gate the lazy mount on the open condition so established
          // teachers never fetch the wizard chunk; local null-fallback
          // Suspense avoids flashing a spinner while it loads.
          <Suspense fallback={null}>
            <TeacherOnboardingWizard
              open
              teacherDisplayName={user?.displayName}
              onComplete={onWizardComplete}
              onSkip={onWizardSkip}
            />
          </Suspense>
        )}

        {/* Plan pill rendered in the TopAppBar next to the teacher
            name so every teacher sees their plan at a glance.
              trialing → amber "Trial · Nd" pill
              free     → amber "Free" pill
              pro      → emerald "Pro" pill
              school   → indigo "School" pill
            Trialing is checked first because getEffectivePlan collapses
            trialing into "pro" — we split them back out for the day
            counter. */}
        <TopAppBar
          title="Vocaband"
          subtitle={subject === "hebrew" ? "כיתות ד–ט · אוצר מילים בעברית" : "CEFR A1–B2 • ESL VOCABULARY"}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => performUserLogout()}
          showScaleControl
          extraTrailing={headerExtra}
          planBadge={(() => {
            const trialing = isTrialing(user);
            const daysLeft = trialing ? getTrialDaysLeft(user) : null;
            if (trialing && daysLeft !== null) {
              return { label: t.planPillTrial(daysLeft), tone: "trial" as const };
            }
            const effective = getEffectivePlan(user);
            if (effective === "school") return { label: t.planPillSchool, tone: "school" as const };
            if (effective === "pro") return { label: t.planPillPro, tone: "pro" as const };
            return { label: t.planPillFree, tone: "free" as const };
          })()}
        />

        {/* Greeting hero — kept for VocaHebrew (its dashboard hasn't
            been redesigned yet).  English path skips it because the
            redesigned EnglishDashboardLayout below already opens with
            its own violet Aurora hero; stacking two big gradient
            bands felt redundant. */}
        {subject !== "english" && (
          <PageHero
            icon={<Sparkles size={32} className="text-white" />}
            eyebrow={greeting}
            title={t.heroLine(firstName)}
            subtitle={t.heroSubtitle}
            gradient="from-emerald-500 via-teal-500 to-cyan-500"
          />
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">

          {/* Plan / trial state lives in the Management grid card now
              (see TeacherQuickActions `plan` prop).  The previous
              top-of-page chip was loud + duplicated by the Management
              card; removed to keep a single upgrade surface. */}

          {/* One-tap network status panel — opens a modal that probes
              the four paths the app depends on (online, Vocaband API,
              Supabase, live-game WebSocket).  Helps a teacher on flaky
              school Wi-Fi tell us which leg is actually broken instead
              of guessing. */}
          <div className="mb-4 flex justify-end">
            <NetworkDiagnosticButton />
          </div>

          {/* English dashboard gets the redesigned layout (Aurora hero
              + pastel class cards).  VocaHebrew keeps its existing
              TeacherQuickActions + TeacherClassesSection untouched.
              Plan state lives in the TopAppBar pill — no card on the
              page itself. */}
          {subject === "english" ? (
            <EnglishDashboardLayout
              language={effectiveLanguage}
              isRTL={dir === "rtl"}
              classes={classes}
              teacherAssignments={teacherAssignments}
              competitionsByAssignment={competitionsByAssignment}
              pendingStudentsCount={pendingStudentsCount}
              copiedCode={copiedCode}
              setCopiedCode={setCopiedCode}
              openDropdownClassId={openDropdownClassId}
              setOpenDropdownClassId={setOpenDropdownClassId}
              onQuickPlayClick={onQuickPlayClick}
              onClassroomClick={onClassroomClick}
              onApprovalsClick={onApprovalsClick}
              onWorksheetResultsClick={onWorksheetResultsClick}
              onLibraryClick={onLibraryClick}
              onNewClass={onNewClass}
              onAssignClass={onAssignClass}
              onDeleteClass={onDeleteClass}
              onEditClass={onEditClass}
              onOpenRoster={onOpenRoster}
              onNameChange={onNameChange}
              onAvatarChange={onAvatarChange}
              onEditAssignment={onEditAssignment}
              onDuplicateAssignment={onDuplicateAssignment}
              onDeleteAssignment={onDeleteAssignment}
              onProjectAssignmentToClass={onProjectAssignmentToClass}
              onPrintAssignmentWorksheet={onPrintAssignmentWorksheet}
            />
          ) : (
            <>
              <TeacherQuickActions
                subject={subject}
                pendingStudentsCount={pendingStudentsCount}
                onQuickPlayClick={onQuickPlayClick}
                onClassroomClick={onClassroomClick}
                onApprovalsClick={onApprovalsClick}
                onWorksheetResultsClick={onWorksheetResultsClick}
                onLibraryClick={onLibraryClick}
              />

              <TeacherClassesSection
                subject={subject}
                classes={classes}
                teacherAssignments={teacherAssignments}
                competitionsByAssignment={competitionsByAssignment}
                copiedCode={copiedCode}
                setCopiedCode={setCopiedCode}
                openDropdownClassId={openDropdownClassId}
                setOpenDropdownClassId={setOpenDropdownClassId}
                onNewClass={onNewClass}
                onAssign={onAssignClass}
                onDeleteClass={onDeleteClass}
                onEditClass={onEditClass}
                onOpenRoster={onOpenRoster}
                onNameChange={onNameChange}
                onAvatarChange={onAvatarChange}
                onEditAssignment={onEditAssignment}
                onDuplicateAssignment={onDuplicateAssignment}
                onDeleteAssignment={onDeleteAssignment}
                onProjectAssignmentToClass={onProjectAssignmentToClass}
                onPrintAssignmentWorksheet={onPrintAssignmentWorksheet}
                isDark={dashboardTheme.dark}
              />
            </>
          )}

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
        title={t.changeThemeTitle}
        aria-label={t.changeThemeTitle}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: 'var(--vb-surface)',
          color: 'var(--vb-text-primary)',
          borderColor: 'var(--vb-border)',
        }}
        className="fixed bottom-5 end-5 sm:bottom-6 sm:end-6 z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Palette size={20} />
      </button>

      {/* Presentation Mode toggle — persistent control so a teacher can
          flip the screen into projector-friendly typography (1.4× font
          scale, higher contrast, no decorative shadows) and back at any
          time, independent of the projector nudge above. */}
      <button
          type="button"
          onClick={adaptiveTheme.togglePresentationMode}
          title={adaptiveTheme.presentationMode
            ? (language === 'he' ? 'יציאה ממצב הצגה' : language === 'ar' ? 'الخروج من وضع العرض' : 'Exit presentation mode')
            : (language === 'he' ? 'מצב הצגה (טקסט גדול יותר להקרנה)' : language === 'ar' ? 'وضع العرض (نص أكبر للعرض)' : 'Presentation mode (bigger text for projecting)')}
          aria-label={language === 'he' ? 'החלף מצב הצגה' : language === 'ar' ? 'تبديل وضع العرض' : 'Toggle presentation mode'}
          aria-pressed={adaptiveTheme.presentationMode}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            backgroundColor: adaptiveTheme.presentationMode ? 'var(--vb-accent)' : 'var(--vb-surface)',
            color: adaptiveTheme.presentationMode ? 'var(--vb-accent-text)' : 'var(--vb-text-primary)',
            borderColor: adaptiveTheme.presentationMode ? 'var(--vb-accent)' : 'var(--vb-border)',
          }}
          className="fixed bottom-20 end-5 sm:bottom-6 sm:end-[5.5rem] z-30 w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Tv2 size={20} />
        </button>
      {showThemeMenu && (
        <TeacherThemeMenu user={user} setUser={setUser} onClose={() => setShowThemeMenu(false)} />
      )}

      {/* One-time "what's new" intro for the Vocabulary Library.
          Suppressed while the brand-new-teacher onboarding wizard is
          up so the two modals never stack. After dismissal, the next
          mount sees seen=true and skips render entirely. */}
      {!showOnboarding && (
        <FirstTimeGuide
          isOpen={libraryIntroGuide.isOpen}
          onDone={libraryIntroGuide.dismiss}
          heading={libraryIntroStrings.heading}
          subheading={libraryIntroStrings.subheading}
          steps={libraryIntroStrings.steps}
        />
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

