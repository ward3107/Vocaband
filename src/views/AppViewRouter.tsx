/**
 * AppViewRouter — the entire view-dispatch render chain extracted from
 * App.tsx (stage 9).  Every early return, condition, and inline prop bag
 * moved verbatim; App assembles the props object fresh per render (NOT
 * memoized) so each bag built below keeps the same per-render identity
 * semantics as the old inline chain.
 *
 * No hooks are called here (the lazy components below are module-scope,
 * exactly as they were in App.tsx), so App's hook order is untouched and
 * the early-return cascade is hook-safe by construction.
 */
import { Suspense } from "react";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import SvgSpinner from "../components/svg/SvgSpinner";
import AnnouncementBanner from "../components/AnnouncementBanner";
import { AppCelebrations, type AppCelebrationsProps } from "../components/app/AppCelebrations";
import { StudentSectionRoute } from "../components/app/StudentSectionRoute";
import { renderPublicView, type PublicViewsProps } from "./PublicViews";
import { renderHebrewRoute, type RenderHebrewRouteDeps } from "./HebrewRoutes";
import { renderQuickPlayExitScreens, type RenderQpExitScreensDeps } from "./QuickPlayExitScreens";
import { TeacherDashboardSection } from "./TeacherDashboardSection";
import { TeacherDashboardProvider, type TeacherDashboardSectionDeps } from "./TeacherDashboardContext";
import { CreateAssignmentSection } from "./CreateAssignmentSection";
import { CreateAssignmentProvider, type CreateAssignmentSectionDeps } from "./CreateAssignmentContext";
import { QuickPlaySetupSection, type QuickPlaySetupSectionDeps } from "./QuickPlaySetupSection";
import { renderClassShowOrWorksheet, type ClassShowAndWorksheetSectionDeps } from "./ClassShowAndWorksheetSection";
import { renderTeacherLiveScreens, type RenderTeacherLiveScreensDeps } from "./TeacherLiveScreens";
import { isStudentHubView, type StudentDashboardSectionDeps } from "./StudentDashboardSection";
import { renderMiscViews, type RenderMiscViewsDeps } from "./MiscViewSections";
import { GameRoute } from "./GameRoutes";
import { GameRouteProvider, type GameRoutesDeps } from "./GameRouteContext";
import { renderStudentAuthRoute, type StudentAuthRoutesDeps } from "./StudentAuthRoutes";
import { renderPrivacySettingsSection } from "./PrivacySettingsSection";
import { navigateToTeacherLogin, navigateToStudentLogin } from "../handlers/landingNav";
import type { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";

// Lazy — these render only mid-Quick-Play, and they pull in motion/react.
// Keeping them off App's eager import graph drops the ~42 kB gz motion
// bundle from the cold first-paint (landing) critical path.
const QpReactionBar = lazyWithRetry(() => import("../components/QpReactionBar"));
const QuickPlayHelpButton = lazyWithRetry(() => import("../components/QuickPlayHelpButton"));

type PrivacySettingsArgs = Parameters<typeof renderPrivacySettingsSection>[0];

/**
 * Everything the chain references that App must own — the stage-8 deps
 * bags, loose state values/setters, handlers, and render-helper inputs.
 * Composed from the helpers' own exported deps interfaces (with renamed
 * fields Omit-ed and re-declared under their App-side names) so the
 * types stay exactly as wide as what each helper accepts.
 */
export type AppViewRouterProps =
  Omit<PublicViewsProps, "onPublicNavigate" | "onTeacherOAuth" | "onStudentLogin"> &
  RenderQpExitScreensDeps &
  Omit<StudentAuthRoutesDeps, "onTier2Login"> &
  Omit<PrivacySettingsArgs, "onReopenPrivacyReminder"> &
  Omit<RenderHebrewRouteDeps, "quickPlaySocketUpdateScore"> &
  Omit<QuickPlaySetupSectionDeps, "allWords" | "topicPacks" | "onSaveTemplate"> &
  Omit<ClassShowAndWorksheetSectionDeps, "allWords" | "topicPacks"> &
  RenderTeacherLiveScreensDeps &
  Omit<RenderMiscViewsDeps, "boostersActivate" | "topicPacks"> & {
    loading: boolean;
    quickPlaySessionParam: string | null;
    handlePublicNavigate: PublicViewsProps["onPublicNavigate"];
    tier2LoginEnabled: boolean;
    handleTier2StudentLogin: NonNullable<StudentAuthRoutesDeps["onTier2Login"]>;
    reopenReminder: PrivacySettingsArgs["onReopenPrivacyReminder"];
    studentSectionDeps: StudentDashboardSectionDeps | null;
    levelUp: {
      pending: AppCelebrationsProps["levelUpTier"];
      dismiss: AppCelebrationsProps["onLevelUpClose"];
    };
    achievements: {
      toasts: AppCelebrationsProps["achievementToasts"];
      dismissToast: AppCelebrationsProps["onAchievementDismiss"];
    };
    quickPlaySocket: ReturnType<typeof useQuickPlaySocket>;
    teacherDashboardDeps: TeacherDashboardSectionDeps | null;
    createAssignmentDeps: CreateAssignmentSectionDeps | null;
    gameRouteDeps: GameRoutesDeps;
    ALL_WORDS: QuickPlaySetupSectionDeps["allWords"];
    TOPIC_PACKS: QuickPlaySetupSectionDeps["topicPacks"];
    savedTasks: { save: QuickPlaySetupSectionDeps["onSaveTemplate"] };
    boosters: { activate: RenderMiscViewsDeps["boostersActivate"] };
    isFinished: boolean;
    showModeSelection: boolean;
    showModeIntro: boolean;
  };

export function AppViewRouter(props: AppViewRouterProps) {
  const {
    loading, quickPlaySessionParam,
    view, setView, user, setUser,
    showDemo, setShowDemo, goBack, handlePublicNavigate,
    configErrorBanner, cookieBannerOverlay,
    quickPlayKicked, setQuickPlayKicked,
    quickPlaySessionEnded, setQuickPlaySessionEnded,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    score, setScore, cleanupSessionData,
    setActiveAssignment, activeAssignment,
    showToast, showPaywallToast, appToasts,
    error, setError,
    studentLoginClassCode, setStudentLoginClassCode,
    setAssignmentWords, setCurrentIndex, setFeedback, setIsFinished, setMistakes,
    setShowModeSelection,
    tier2LoginEnabled, handleTier2StudentLogin,
    studentSectionDeps, levelUp, achievements,
    consentModal, exitConfirmModal,
    setConfirmDialog, setNeedsConsent, reopenReminder,
    qpCumulativeScoreRef, quickPlaySocket,
    setActiveVoca, activeVoca,
    teacherDashboardDeps, createAssignmentDeps, gameRouteDeps,
    ALL_WORDS, TOPIC_PACKS,
    customWords, setCustomWords,
    quickPlayInitialWords, quickPlayInitialModes,
    isOcrProcessing, ocrProgress,
    handleOcrUpload, handleDocxUpload,
    speakWord, translateWord, translateWordsBatch,
    setQuickPlaySessionCode, savedTasks,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    selectedClass, setSelectedClass, activityNavOrigin,
    classShowAssignment, setClassShowAssignment,
    worksheetAssignment, setWorksheetAssignment,
    onPickerOcrUpload,
    setIsLiveChallenge, leaderboard, socketConnected,
    setQuickPlaySelectedWords,
    setQuickPlayCustomWords, setQuickPlayAddingCustom, setQuickPlayTranslating,
    xp, setXp, coins, setCoins, boosters,
    visibleClasses, visibleAssignments, globalLeaderboard,
    pendingStudents, toasts,
    loadPendingStudents, handleApproveStudent, handleRejectStudent,
    allScores, classStudents,
    selectedWords, setSelectedWords,
    expandedStudent, setExpandedStudent, socket,
    isFinished, showModeSelection, showModeIntro,
  } = props;

  if (loading && !quickPlaySessionParam) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--vb-surface-alt)]">
      <SvgSpinner className="animate-spin text-blue-700" size={48} />
    </div>;
  }

  // --- PUBLIC VIEWS (No authentication required) ---
  // The four public view blocks (landing / terms / privacy /
  // accessibility) moved to src/views/PublicViews.tsx. Helper returns
  // the right JSX or null; keeping the early-return pattern means no
  // downstream hooks/effects run when a public view is showing.
  const publicView = renderPublicView({
    view,
    user,
    showDemo,
    setShowDemo,
    goBack,
    onPublicNavigate: handlePublicNavigate,
    onTeacherOAuth: () => navigateToTeacherLogin(setView),
    onStudentLogin: () => navigateToStudentLogin(setView),
    configErrorBanner,
    cookieBannerOverlay,
  });
  if (publicView) return publicView;

  // Quick Play exit screens (Kicked + SessionEnded) — check BEFORE the
  // student auth route so a kick that arrives while the student is on
  // the join form (or the resume card) actually surfaces the proper
  // "You've been removed" screen with the Rejoin-with-different-name
  // option.  Render order previously had studentAuthRoute first, which
  // meant view==='quick-play-student' + quickPlayKicked=true silently
  // rendered the join form again and hid the kicked screen entirely.
  const qpExit = renderQuickPlayExitScreens({
    quickPlayKicked, quickPlaySessionEnded, quickPlayActiveSession,
    user, quickPlayStudentName, score,
    cleanupSessionData,
    setQuickPlayKicked, setQuickPlaySessionEnded, setQuickPlayActiveSession,
    setActiveAssignment, setUser, setQuickPlayStudentName, setView,
  });
  if (qpExit) return qpExit;

  // Student auth / Quick Play join screens (account login, Category Race,
  // quick-play-student) bundled into renderStudentAuthRoute.
  const studentAuthRoute = renderStudentAuthRoute({
    view, user, setView, setUser, showToast, cookieBannerOverlay,
    error, setError,
    studentLoginClassCode, setStudentLoginClassCode,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    setAssignmentWords, setActiveAssignment, setCurrentIndex,
    setScore, setFeedback, setIsFinished, setMistakes, setShowModeSelection,
    cleanupSessionData,
    setQuickPlayKicked,
    onTier2Login: tier2LoginEnabled ? handleTier2StudentLogin : undefined,
  });
  if (studentAuthRoute) return studentAuthRoute;

  if (studentSectionDeps && (view === "student-dashboard" || isStudentHubView(view))) {
    return (
      <StudentSectionRoute
        deps={studentSectionDeps}
        view={view}
        celebrations={{
          levelUpTier: levelUp.pending,
          onLevelUpClose: levelUp.dismiss,
          achievementToasts: achievements.toasts,
          onAchievementDismiss: achievements.dismissToast,
        }}
      />
    );
  }

  // Privacy-settings view (lazy-loaded). See PrivacySettingsSection.
  const privacySettings = renderPrivacySettingsSection({
    view, user, consentModal, exitConfirmModal,
    setView, setUser, setConfirmDialog, showToast,
    setNeedsConsent,
    onReopenPrivacyReminder: reopenReminder,
  });
  if (privacySettings) return privacySettings;

  // --- SHOP VIEW (single-screen marketplace, lazy-loaded) ---
  // All Hebrew-side routing (vocahebrew-dashboard + the four mode
  // views) lives in renderHebrewRoute.  Returns JSX or null.
  const hebrewRoute = renderHebrewRoute({
    view, user, activeAssignment,
    quickPlayActiveSession, qpCumulativeScoreRef,
    quickPlaySocketUpdateScore: quickPlaySocket.updateScore,
    setActiveVoca, setShowModeSelection, setView,
  });
  if (hebrewRoute) return hebrewRoute;
  if (view === "teacher-dashboard" && teacherDashboardDeps) {
    return (
      <TeacherDashboardProvider value={teacherDashboardDeps}>
        <TeacherDashboardSection />
      </TeacherDashboardProvider>
    );
  }

  if (view === "create-assignment" && createAssignmentDeps) {
    return (
      <CreateAssignmentProvider value={createAssignmentDeps}>
        <CreateAssignmentSection />
      </CreateAssignmentProvider>
    );
  }



  // Fallback: view === "live-challenge" but selectedClass was cleared (can
  // happen after a hardware-back + state reset, or if a student lands on
  // this teacher-only view directly).  Previously this rendered NOTHING
  // (white page), then popstate kicked the user to the landing page
  // without the teacher-login tab visible.  Redirect to the right home
  // view instead so students get their dashboard back and teachers can
  // re-select a class.

  if (view === "quick-play-setup") {
    return QuickPlaySetupSection({
      activeVoca, user, setView,
      allWords: ALL_WORDS, topicPacks: TOPIC_PACKS,
      customWords, setCustomWords,
      quickPlayInitialWords, quickPlayInitialModes,
      isOcrProcessing, ocrProgress, handleOcrUpload, handleDocxUpload,
      showToast, showPaywallToast, speakWord, translateWord,
      setQuickPlayActiveSession, setQuickPlaySessionCode,
      onSaveTemplate: savedTasks.save, appToasts,
      assignmentSentences, setAssignmentSentences,
      sentenceDifficulty, setSentenceDifficulty,
    });
  }


  const classShowOrWorksheet = renderClassShowOrWorksheet({
    view, user, selectedClass, activeVoca, activityNavOrigin,
    classShowAssignment, worksheetAssignment,
    setClassShowAssignment, setWorksheetAssignment, setView,
    allWords: ALL_WORDS, topicPacks: TOPIC_PACKS,
    translateWord, translateWordsBatch,
    onPickerOcrUpload, showToast,
  });
  if (classShowOrWorksheet) return classShowOrWorksheet;

  const teacherLiveScreen = renderTeacherLiveScreens({
    view, user, selectedClass, setView, setIsLiveChallenge,
    leaderboard, socketConnected,
    quickPlayActiveSession,
    setQuickPlayActiveSession, setQuickPlaySelectedWords, setQuickPlaySessionCode,
    setQuickPlayCustomWords, setQuickPlayAddingCustom, setQuickPlayTranslating,
    cleanupSessionData, showToast,
  });
  if (teacherLiveScreen) return teacherLiveScreen;

  // Remaining smaller view branches (shop / voca-picker / hot-seat /
  // vocabagrut / global-leaderboard / teacher-approvals / worksheet-
  // attempts / classroom / live-challenge-class-select / students /
  // live-challenge fallback) bundled in renderMiscViews.
  const miscView = renderMiscViews({
    view, user, activeVoca, selectedClass, activityNavOrigin,
    setView, setSelectedClass, setIsLiveChallenge, setActiveVoca,
    xp, setXp, coins, setCoins, setUser, showToast,
    boostersActivate: boosters.activate,
    visibleClasses, visibleAssignments, speakWord, topicPacks: TOPIC_PACKS,
    globalLeaderboard,
    pendingStudents, toasts, consentModal, exitConfirmModal,
    loadPendingStudents, handleApproveStudent, handleRejectStudent,
    allScores, classStudents, selectedWords, setSelectedWords,
    expandedStudent, setExpandedStudent, socket,
  });
  if (miscView) return miscView;

  // Single "Classroom" entry point now wraps Analytics + Gradebook under
  // a tabbed UI (Pulse / Mastery / Records). Legacy /analytics and
  // /gradebook view strings still resolve here so existing dashboard
  // buttons + history-stack entries keep working — they just land on
  // the matching tab inside the merged view.

  // Game-flow views (mode selection, intro, finished, active) — see
  // views/GameRoutes for the four branches.  The active view is the
  // default if no other game-flow gate matches.
  //
  // Tier C: when a student is mid-mode inside a v2 QP session, mount
  // the floating reaction bar as a sibling overlay so tapping an emoji
  // broadcasts to the teacher's projector without leaving the game.
  // The bar is `fixed` + `pointer-events-auto` only on the pill itself,
  // so it never blocks the game UI underneath.
  // Reaction bar lives only on the in-game canvas — not the mode
  // selection / mode intro screens. On those screens it floated above
  // the mode-grid CTAs and the difficulty legend, hiding the buttons
  // and text under it for everyone who didn't think to scroll past.
  // Once the student is actually answering questions, the prompt
  // sits high on the screen with comfortable space underneath, so
  // the bar can dock at the bottom without colliding.
  const showQpReactionBar = !!quickPlayActiveSession
    && view === "game"
    && !isFinished
    && !showModeSelection
    && !showModeIntro;

  // Floating help button mirrors the reaction bar's gating: visible
  // only mid-Quick-Play game so unauthenticated kids who are stuck
  // have a one-tap escape hatch without being able to invoke it from
  // unrelated views. Same overlap concern — hide it on mode selection
  // / intro so it doesn't sit on top of the mode tiles.
  const showQpHelpButton = !!quickPlayActiveSession
    && view === "game"
    && !isFinished
    && !showModeSelection
    && !showModeIntro;

  // ── Legacy default-screen safety net ────────────────────────────────
  // The original app rendered the word game as its root screen, and this
  // tail still falls back to it.  But the view branches above can be
  // skipped when a preserved view loses its transient context on a
  // refresh (e.g. a teacher on `create-assignment` once `selectedClass`
  // resets to null).  Rendering the game there stranded teachers on the
  // student SET-2 word list — the "1 / 809 CLASSIC" screen.  Only the
  // game view should reach the game flow; anything else that falls
  // through shows the spinner for the frame it takes useViewGuards to
  // route the user back to a real home.
  if (view !== "game") {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--vb-surface-alt)]">
      <SvgSpinner className="animate-spin text-blue-700" size={48} />
    </div>;
  }

  return (
    <>
      <AnnouncementBanner user={user} />
      {/* Bag assembled by useGameRouteDeps — fresh object every render
          (NOT memoized), so the context value's per-render identity is
          unchanged from the old inline literal. */}
      <GameRouteProvider value={gameRouteDeps}>
        <GameRoute />
      </GameRouteProvider>
      {showQpReactionBar && (
        <Suspense fallback={null}>
          <QpReactionBar sendReaction={quickPlaySocket.sendReaction} />
        </Suspense>
      )}
      {showQpHelpButton && (
        <Suspense fallback={null}>
          <QuickPlayHelpButton
            onAlertTeacher={() => quickPlaySocket.sendReaction('🙋')}
            onLeave={() => {
              gameRouteDeps.cleanupQuickPlayGuest();
              setView('public-landing');
            }}
          />
        </Suspense>
      )}
      <AppCelebrations
        levelUpTier={levelUp.pending}
        onLevelUpClose={levelUp.dismiss}
        achievementToasts={achievements.toasts}
        onAchievementDismiss={achievements.dismissToast}
      />
    </>
  );
}
