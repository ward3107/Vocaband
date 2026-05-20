import React, { useState, useMemo, useRef, useCallback } from "react";
import type { View } from "./core/views";
import { getEntitledVocas } from "./core/subject";
import type { Word } from "./data/vocabulary";
import { useVocabularyLazyWithDefaults } from "./hooks/useVocabularyLazy";
import SvgSpinner from "./components/svg/SvgSpinner";
// motion is no longer imported eagerly here. Its three eager consumers
// (CookieBanner, QuickPlayResumeBanner, ImageCropModal — all defined
// further down as React.lazy) carry it in their own chunks now, so the
// ~43 kB gz motion bundle drops out of the App.tsx modulepreload chain
// on cold first-paint.
import { hasTeacherAccess, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { useAudio } from "./hooks/useAudio";
import { useLanguage } from "./hooks/useLanguage";
import { appToastsT } from "./locales/app-toasts";
import { useRetention } from "./hooks/useRetention";
import { useSavedTasks } from "./hooks/useSavedTasks";
import { useStructure } from "./hooks/useStructure";
import { useBoosters } from "./hooks/useBoosters";
import { shuffle } from './utils';
import { renderPublicView } from "./views/PublicViews";
import { createGuestUser } from "./utils/createGuestUser";
import { readQpResumeScore } from "./utils/qpResumeHint";
import { clearIntendedClassCode } from "./utils/oauthIntent";
import { useTeacherGuidesSync } from "./hooks/useTeacherGuidesSync";
import { useVocaRouting } from "./hooks/useVocaRouting";
import { useApplyTeacherTheme } from "./hooks/useApplyTeacherTheme";
import { useAuthRestore } from "./hooks/useAuthRestore";
import { useDeepLinkConsumers } from "./hooks/useDeepLinkConsumers";
import { useAppMiscEffects } from "./hooks/useAppMiscEffects";
import { useAppPreOverlays } from "./hooks/useAppPreOverlays";
import { renderHebrewRoute } from "./views/HebrewRoutes";
import { renderQuickPlayExitScreens } from "./views/QuickPlayExitScreens";
import { useAppOverlays } from "./hooks/useAppOverlays";
import { TeacherDashboardSection } from "./views/TeacherDashboardSection";
import { CreateAssignmentSection } from "./views/CreateAssignmentSection";
import { QuickPlaySetupSection } from "./views/QuickPlaySetupSection";
import { renderClassShowOrWorksheet } from "./views/ClassShowAndWorksheetSection";
import { renderTeacherLiveScreens } from "./views/TeacherLiveScreens";
import { StudentDashboardSection } from "./views/StudentDashboardSection";
import { renderMiscViews } from "./views/MiscViewSections";
import { renderGameRoute } from "./views/GameRoutes";
import { renderStudentAuthRoute } from "./views/StudentAuthRoutes";
import { renderPrivacySettingsSection } from "./views/PrivacySettingsSection";
import { getGameDebugger } from "./utils/gameDebug";
import { type GameMode } from "./constants/game";
import { useSpeechVoiceManager } from "./hooks/useSpeechVoiceManager";
import { useBeforeUnloadWhileSaving } from "./hooks/useBeforeUnloadWhileSaving";
import { useQuickPlaySocket } from "./hooks/useQuickPlaySocket";
import { useTeacherActions } from "./hooks/useTeacherActions";
import { useGameModeActions } from "./hooks/useGameModeActions";
import { useGameFinish } from "./hooks/useGameFinish";
import { useTranslate } from "./hooks/useTranslate";
import { useSaveQueue } from "./hooks/useSaveQueue";
import { useTeacherData } from "./hooks/useTeacherData";
import { useQuickPlayUrlBootstrap } from "./hooks/useQuickPlayUrlBootstrap";
import { useTeacherNotifications } from "./hooks/useTeacherNotifications";
import { useLiveChallengeSocket } from "./hooks/useLiveChallengeSocket";
import { useLiveChallengeEvents } from "./hooks/useLiveChallengeEvents";
import { useQuickPlayEvents } from "./hooks/useQuickPlayEvents";
import { useFeedbackTracking } from "./hooks/useFeedbackTracking";
import { useGameModeSetup } from "./hooks/useGameModeSetup";
import QpReactionBar from "./components/QpReactionBar";
import QuickPlayHelpButton from "./components/QuickPlayHelpButton";
import { useDashboardPolling } from "./hooks/useDashboardPolling";
import { useAssignmentAutoPopulate } from "./hooks/useAssignmentAutoPopulate";
import { useSaveQueueResilience } from "./hooks/useSaveQueueResilience";
import { useAssignmentPrecache } from "./hooks/useAssignmentPrecache";
import { useBackButtonTrap } from "./hooks/useBackButtonTrap";
import { useViewGuards } from "./hooks/useViewGuards";
import { useGameRoundOptions } from "./hooks/useGameRoundOptions";
import { useStudentLogin } from "./hooks/useStudentLogin";
import { useClassSwitch } from "./hooks/useClassSwitch";
import { useConsent } from "./hooks/useConsent";
import { useOcrUpload } from "./hooks/useOcrUpload";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { useAwardBadge } from "./hooks/useAwardBadge";
import { useToasts } from "./hooks/useToasts";
import { useOAuthState } from "./hooks/useOAuthState";
import { useActiveVocaState } from "./hooks/useActiveVocaState";
import { useOnboardingFlags } from "./hooks/useOnboardingFlags";
import { useQuickPlayGuestState } from "./hooks/useQuickPlayGuestState";
import { useQuickPlaySessionState } from "./hooks/useQuickPlaySessionState";
import { useTeacherUiModalsState } from "./hooks/useTeacherUiModalsState";
import { useAuthFlowRefs } from "./hooks/useAuthFlowRefs";
import { useNavigationRefs } from "./hooks/useNavigationRefs";
import { useRenderLoopRefs } from "./hooks/useRenderLoopRefs";
import { useGameModeMechanicsState } from "./hooks/useGameModeMechanicsState";
import { useDeepLinkUrlParams } from "./hooks/useDeepLinkUrlParams";
import { useTargetLanguageState } from "./hooks/useTargetLanguageState";
import { resolveInitialView } from "./utils/resolveInitialView";
import { PUBLIC_PAGE_VIEW, type PublicPage } from "./utils/publicNavigation";
import { pickClassMinuteWords } from "./utils/classMinuteWords";
import { isPublicView, shouldPreserveView } from "./utils/authViews";
import { buildEmitScoreUpdate } from "./handlers/emitScoreUpdate";
import { navigateToTeacherLogin, navigateToStudentLogin } from "./handlers/landingNav";
import { buildCleanupSessionData, buildCleanupQuickPlayGuest } from "./handlers/sessionCleanups";

type ConfirmDialog = { show: boolean; message: string; onConfirm: () => void };

export default function App() {
  // Initialize game debugger
  const gameDebug = getGameDebugger();
  // Language-aware toast text — picked up at render time so a teacher
  // who flips EN/HE/AR before firing a callback sees the localised
  // version on the next render.
  const { language: appLanguage } = useLanguage();
  const appToasts = appToastsT[appLanguage];

  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentDataLoading] = useState(false);
  // Detect Quick Play session from URL synchronously so it takes
  // priority over auth redirects.
  const quickPlaySessionParam = new URLSearchParams(window.location.search).get('session');

  const [view, setView] = useState<View>(resolveInitialView);
  const [activeVoca, setActiveVoca] = useActiveVocaState();

  // First-time-guide persistence (teacher-only) wired through a hook
  // so the optimistic-update + rollback dance lives next to the store.
  useTeacherGuidesSync(user, setUser);

  // Voca routing — auto-pick the teacher's only Voca, or send admins
  // with 2+ Vocas to the picker if they hit the dashboard without
  // having chosen one this session.  See useVocaRouting for details.
  useVocaRouting(user, activeVoca, view, setActiveVoca, setView);

  // Navigation refs — previousViewRef / currentViewRef / lastUserRoleRef.
  // See useNavigationRefs.
  const { previousViewRef, currentViewRef, lastUserRoleRef } = useNavigationRefs(view);

  const goBack = () => setView(previousViewRef.current as View);

  // Cookie consent banner — state + accept/customize handlers live
  // in a dedicated hook so the banner's persistence + quirky React-
  // event guard aren't in the orchestrator.
  const {
    showCookieBanner,
    handleCookieAccept,
    handleCookieCustomize,
  } = useCookieConsent();

  const handlePublicNavigate = (page: PublicPage) => setView(PUBLIC_PAGE_VIEW[page]);
  const [showDemo, setShowDemo] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  // Lazy-load vocabulary out of the initial bundle (gated off public
  // views).  Returns the four populated arrays with `[]` defaults so
  // consumers don't need a null-gate.  See useVocabularyLazy.
  const { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS } =
    useVocabularyLazyWithDefaults(!isPublicView(view));
  // Auth-restore + manual-login control flow refs.  See useAuthFlowRefs.
  const { manualLoginInProgress, restoreInProgress, restoreRetried, fromShareLinkRef } = useAuthFlowRefs();
  const [, setLandingTab] = useState<"student" | "teacher">("student");
  const [studentLoginClassCode, setStudentLoginClassCode] = useState("");
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string, displayName: string, classCode: string, className: string, joinedAt: string }>>([]);
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<{ name: string; classCode: string; profileId?: string } | null>(null);
  // Teacher dashboard modal/UI state. See useTeacherUiModalsState.
  const {
    showCreateClassModal, setShowCreateClassModal,
    newClassName, setNewClassName,
    createdClassCode, setCreatedClassCode,
    createdClassName, setCreatedClassName,
    editingClass, setEditingClass,
    rosterModalClass, setRosterModalClass,
    deleteConfirmModal, setDeleteConfirmModal,
    rejectStudentModal, setRejectStudentModal,
    showExitConfirmModal, setShowExitConfirmModal,
    copiedCode, setCopiedCode,
    openDropdownClassId, setOpenDropdownClassId,
  } = useTeacherUiModalsState();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);

  // Retention state (daily chest, weekly challenge, comeback, limited
  // rotating item, pet evolution milestones).  Scoped per-user via uid.
  const retention = useRetention(user?.uid, xp);

  // Saved task templates — teacher-side localStorage of full assignment /
  // quick-play snapshots so a teacher can rebuild the same task in one
  // tap.  Hook returns sorted list (pinned → most-used → most-recent).
  const savedTasks = useSavedTasks(user?.uid);

  // Structure progression (Phase 1 of "build something meaningful").
  // Tracks a per-user persisted creation (garden/city/rocket/castle)
  // that grows as the student learns.  Gated behind the
  // VITE_STRUCTURE_UX feature flag at the dashboard render level —
  // this hook runs either way so the localStorage state is always
  // consistent if the flag flips mid-session.
  const structure = useStructure(user?.uid);
  // Keys of parts that were just unlocked — used to bounce-animate them
  // on the next render.  Currently never populated (the bounce trigger
  // was never wired up); kept here as a stable [] reference so the
  // dashboard section's prop contract stays unchanged.
  const celebrateStructureKeys: string[] = [];

  // Active boosters (xp_booster, weekend_warrior, streak_freeze,
  // lucky_charm, focus_mode).  Scoped per-user via uid; persists in
  // localStorage so boosters survive page refresh.
  const boosters = useBoosters(user?.uid);

  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // OAuth callback state + class-switch confirmation state. See
  // useOAuthState for the (classNotFoundIntent / pendingClassSwitch) docs.
  const {
    isOAuthCallback, setIsOAuthCallback,
    oauthEmail, setOauthEmail,
    oauthAuthUid, setOauthAuthUid,
    showOAuthClassCode, setShowOAuthClassCode,
    classNotFoundIntent, setClassNotFoundIntent,
    pendingClassSwitch, setPendingClassSwitch,
  } = useOAuthState();

  // AVATAR_CATEGORIES + selectedAvatarCategory moved into StudentAccountLoginView
  // (see src/views/StudentAccountLoginView.tsx; constants live in src/constants/avatars.ts)

  // --- LIVE CHALLENGE STATE ---
  // `isLiveChallenge` stays local — views set it imperatively.  The
  // socket + leaderboard are owned by useLiveChallengeSocket.
  const [isLiveChallenge, setIsLiveChallenge] = useState(false);
  const { socket, socketConnected, leaderboard } = useLiveChallengeSocket({
    user,
    isLiveChallenge,
  });

  // Teacher-side QP session + activity-launch state.  See
  // useQuickPlaySessionState for per-field semantics.
  const {
    setQuickPlaySessionCode,
    quickPlayInitialWords, setQuickPlaySelectedWords,
    quickPlayInitialModes, setQuickPlayInitialModes,
    quickPlayActiveSession, setQuickPlayActiveSession,
    classShowAssignment, setClassShowAssignment,
    worksheetAssignment, setWorksheetAssignment,
    activityNavOrigin, setActivityNavOrigin,
  } = useQuickPlaySessionState();
  // Guest-side QP state (identity, kicked/ended flags, completed
  // modes, cumulative score ref).  See useQuickPlayGuestState.
  const {
    qpCumulativeScoreRef,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    quickPlayKicked, setQuickPlayKicked,
    quickPlaySessionEnded, setQuickPlaySessionEnded,
    quickPlayCompletedModes, setQuickPlayCompletedModes,
  } = useQuickPlayGuestState();
  // Teacher-monitor QP state — the live podium feed comes from the
  // /quick-play socket inside QuickPlayMonitor; only the custom-word
  // setters remain here so the teacher-monitor reset path can clear
  // them on session end.
  const [, setQuickPlayCustomWords] = useState<Map<string, {hebrew: string, arabic: string}>>(new Map());
  const [, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [, setQuickPlayTranslating] = useState<Set<string>>(new Set());

  // Game music player state (previously defined here) was dead code —
  // the track/volume setters were never called from anywhere, so the
  // player sat in its default "not playing" branch forever. The music
  // player the teacher actually sees on the Quick Play monitor lives
  // inside src/components/QuickPlayMonitor.tsx with its own independent
  // Howler.js-based player. Removed to drop ~55 lines of no-op state.

  // --- TEACHER DATA STATE ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"Set 1" | "Set 2" | "Custom">("Set 1");
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrPendingFile, setOcrPendingFile] = useState<{ file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null>(null);
  const [allScores, setAllScores] = useState<ProgressData[]>([]);
  const [classStudents, setClassStudents] = useState<{name: string, classCode: string, lastActive: string}[]>([]);
  const [globalLeaderboard] = useState<{name: string, score: number, avatar: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentModes, setAssignmentModes] = useState<string[]>([]);
  const [assignmentSentences, setAssignmentSentences] = useState<string[]>([]);
  const [sentenceDifficulty, setSentenceDifficulty] = useState<1 | 2 | 3 | 4>(2);
  const [sentencesAutoGenerated, setSentencesAutoGenerated] = useState(false);
  const [, setAssignmentStep] = useState(1);

  // --- SMART PASTE STATE ---
  const [pastedText, setPastedText] = useState("");
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteMatchedCount, setPasteMatchedCount] = useState(0);
  const [pasteUnmatched, setPasteUnmatched] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTopicPacks, setShowTopicPacks] = useState(false);

  // --- QUICK SEARCH & FILTERS STATE ---
  const [, setWordSearchQuery] = useState("");
  const [, setSelectedCore] = useState<"Core I" | "Core II" | "">("");
  const [, setSelectedPos] = useState<string>("");
  const [, setSelectedRecProd] = useState<"Rec" | "Prod" | "">("");

  // Toast notifications — state + showToast (stable identity for dep
  // arrays) + paywall-toast helper. See useToasts.
  const { toasts, setToasts, showToast, showPaywallToast } = useToasts();

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    show: false, message: '', onConfirm: () => {},
  });

  // Three "first-time" flags driving the onboarding overlays.
  const {
    showAssignmentWelcome, setShowAssignmentWelcome,
    showOnboarding, setShowOnboarding,
    showStudentOnboarding, setShowStudentOnboarding,
  } = useOnboardingFlags();
  // --- PERFORMANCE OPTIMIZATIONS ---
  // Use Set for O(1) lookup instead of array.includes() which is O(n)
  const selectedWordsSet = useMemo(() => new Set(selectedWords), [selectedWords]);

  // QuickPlay word-search was never wired to UI — the consumer hook
  // expects a terms array; pass empty so the auto-populate logic
  // simply skips the search-driven branch.
  const searchTerms: string[] = [];

  // Assignment / Quick Play authoring auto-populate:
  //   1. Sentence Builder sentences regenerate on word/mode/
  //      difficulty change (unless teacher has edited manually).
  //   2. Exact-match search terms in Quick Play setup auto-add
  //      to the selection (partials just display).
  useAssignmentAutoPopulate({
    view,
    assignmentModes, selectedWords, selectedWordsSet, customWords,
    sentenceDifficulty, sentencesAutoGenerated, assignmentSentences,
    searchTerms,
    setAssignmentSentences, setSentencesAutoGenerated, setQuickPlaySelectedWords,
  });



  // Translation helpers — server-proxied EN → HE/AR with an in-session
  // cache. Two callable shapes: batch (paste/OCR/imports) and single-
  // word (Auto-translate button). Hook owns the cache + fetch plumbing.
  const { translateWord, translateWordsBatch } = useTranslate();


  // --- STUDENT DATA STATE ---
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);
  // Warm the audio cache for the active assignment so a student who loses
  // Wi-Fi mid-lesson can still hear the words. Idle-scheduled, skipped on
  // 2G / data-saver. See useAssignmentPrecache for the why.
  useAssignmentPrecache(assignmentWords);
  // ?assignment=<id> and ?play=<mode> deep-link URL params captured at
  // boot.  See useDeepLinkUrlParams.
  const {
    pendingAssignmentId, setPendingAssignmentId,
    pendingPlayMode, setPendingPlayMode,
  } = useDeepLinkUrlParams();

  const { speak: speakWordRaw, preloadMany, playWrong, playMotivational, stopAll: stopAllAudio } = useAudio();
  const speakWord = speakWordRaw;

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);

  // Handle Quick Play session from URL parameter — extracted to a
  // dedicated hook because the load logic plus the page-refresh
  // recovery branch was ~250 lines of detail.
  useQuickPlayUrlBootstrap({
    setView,
    setUser,
    setQuickPlayActiveSession,
    setQuickPlayStudentName,
    setQuickPlayAvatar,
    setActiveAssignment,
    setAssignmentWords,
    setShowModeSelection,
    createGuestUser,
    showToast,
  });
  const [showModeIntro, setShowModeIntro] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  // Score state; for QP resume kids we seed from the localStorage
  // hint so the visible score doesn't snap back to 0 on rescan.
  // (Server already preserves the cumulative — see qpCumulativeScoreRef
  // initializer above.)
  const [score, setScore] = useState(() => readQpResumeScore());
  const [mistakes, setMistakes] = useState<number[]>([]);
  // Per-word attempts accumulated during the current game.  Flushed to the
  // word_attempts table via save_student_progress when the student finishes.
  // Reset on game start so each session is independent.
  const [wordAttemptBatch, setWordAttemptBatch] = useState<Array<{ word_id: number; is_correct: boolean }>>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "show-answer" | null>(null);
  const {
    targetLanguage, setTargetLanguage,
    hasChosenLanguage, setHasChosenLanguage,
  } = useTargetLanguageState();
  const [isFinished, setIsFinished] = useState(false);
  const [wordAttempts, setWordAttempts] = useState<Record<number, number>>({});

  // --- NEW MODES STATE ---
  // tfOption is derived (useMemo below) so it's populated SYNCHRONOUSLY on
  // the first render of True/False. Previously it was useState+useEffect,
  // which left tfOption null for one render cycle after entering the mode
  // — the first tap was swallowed (handleTFAnswer guards against null) and
  // the buttons felt dead until the student backed out and re-entered.
  const [isFlipped, setIsFlipped] = useState(false);

  // Per-mode mechanics state (matching / letter sounds / sentence
  // builder). See useGameModeMechanicsState.
  const {
    matchingPairs, setMatchingPairs,
    selectedMatch, setSelectedMatch,
    matchedIds, setMatchedIds,
    isMatchingProcessing, setIsMatchingProcessing,
    revealedLetters, setRevealedLetters,
    sentenceIndex, setSentenceIndex,
    availableWords, setAvailableWords,
    builtSentence, setBuiltSentence,
    sentenceFeedback, setSentenceFeedback,
  } = useGameModeMechanicsState();
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentData[]>([]);
  const [, setTeacherAssignmentsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentData | null>(null);

  // Subject-scoped slices of the teacher's classes + assignments.
  // The dashboard, classroom, live-challenge picker, and Vocabagrut all
  // consume these so a teacher on the Hebrew tab never sees English
  // classes (and vice-versa).  Rows without a `subject` (legacy data
  // before the migration ran) read as 'english' via mapClass — keeps
  // the English view a superset for un-migrated DBs.
  const visibleClasses = useMemo(() => {
    if (!activeVoca) return classes;
    return classes.filter((c) => (c.subject ?? "english") === activeVoca);
  }, [classes, activeVoca]);

  const visibleAssignments = useMemo(() => {
    if (!activeVoca) return teacherAssignments;
    // Filter by assignment.subject directly so a teacher who somehow
    // created an English assignment under a Hebrew class still gets it
    // routed to the right tab (denormalized field is the source of truth).
    return teacherAssignments.filter(
      (a) => (a.subject ?? "english") === activeVoca,
    );
  }, [teacherAssignments, activeVoca]);


  // --- RELIABILITY STATE ---
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- QUERY DEDUPLICATION ---
  // Track when data was last fetched to avoid redundant Supabase calls
  const lastFetchRef = useRef<Record<string, number>>({});

  // Teacher-side action handlers — class/assignment/word-import logic.
  // handleOcrUpload stays inline below to preserve its richer status
  // UI + Neural2 audio generation + vocabulary cross-check.
  const {
    handleCreateClass,
    handlePasteSubmit,
    handleAddUnmatchedAsCustom,
    handleSkipUnmatched,
    handleTagInputKeyDown,
    handleDocxUpload,
    handleSaveAssignment,
    handleDeleteClass,
    fetchScores,
    fetchTeacherAssignments,
  } = useTeacherActions({
    user, activeVoca, classes, setClasses,
    newClassName, setNewClassName,
    setCreatedClassCode, setCreatedClassName, setShowCreateClassModal,
    selectedClass, setSelectedClass,
    editingAssignment, setEditingAssignment,
    selectedWords, setSelectedWords,
    customWords, setCustomWords,
    selectedLevel,
    // App.tsx narrows level to a 3-value union; hook signature is the wider
    // string. Casts here keep the bivariance edge cases out of the hook.
    setSelectedLevel: setSelectedLevel as (v: string) => void,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    setAssignmentStep,
    pastedText, setPastedText,
    setPasteMatchedCount, pasteUnmatched, setPasteUnmatched, setShowPasteDialog,
    tagInput, setTagInput,
    setIsOcrProcessing,
    setOcrProgress: setOcrProgress as (v: string | number) => void,
    setWordSearchQuery,
    setSelectedCore,
    setSelectedRecProd: setSelectedRecProd as (v: string) => void,
    setSelectedPos,
    teacherAssignments, setTeacherAssignments, setTeacherAssignmentsLoading,
    pendingStudents, setPendingStudents,
    allScores, setAllScores,
    setClassStudents,
    // Global leaderboard isn't wired into App.tsx (unused state); hook's
    // fetchGlobalLeaderboard isn't called from here, so a no-op is safe.
    setGlobalLeaderboard: () => {},
    setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setConfirmDialog, showToast,
    setView: (v: string) => setView(v as View),
    lastFetchRef,
  });

  // Read-only data fetchers + approval-queue actions extracted into a
  // dedicated hook. Same shapes and behaviours as the inline closures
  // they replace.
  const {
    fetchTeacherData,
    loadAssignmentsForClass,
    loadPendingStudents,
    handleApproveStudent,
    handleRejectStudent,
    confirmRejectStudent,
  } = useTeacherData({
    user,
    classes, setClasses,
    setStudentAssignments, setStudentProgress,
    setPendingStudents,
    setError, showToast,
    setRejectStudentModal,
  });

  // Save queue — batched DB writes (10 ops / 300ms debounce).  See useSaveQueue.
  const {
    queueSaveOperation,
    clearQueue: clearSaveQueue,
    processSaveQueue,
    hasPending: saveQueueHasPending,
  } = useSaveQueue();

  // Render-loop refs (user/feedback/processing/scoreEmit).
  // See useRenderLoopRefs.
  const { userRef, feedbackTimeoutRef, isProcessingRef, lastScoreEmitRef } = useRenderLoopRefs(user);

  // Clear pending save-queue work + feedback timeout. Called from
  // logout / session-end paths.  See handlers/sessionCleanups.
  const cleanupSessionData = buildCleanupSessionData(clearSaveQueue, feedbackTimeoutRef);

  // Quick Play socket — active whenever a session is live.  Forwards
  // in-game score changes to the teacher's monitor.
  const quickPlaySocket = useQuickPlaySocket({
    sessionCode: quickPlayActiveSession?.sessionCode ?? null,
    enabled: true,
  });

  // Translate KICKED / SESSION_ENDED events into the existing UI
  // state.  Hook guards on isGuest so the teacher ending the session
  // doesn't land on the student exit screen.
  useQuickPlayEvents({
    enabled: true,
    isGuest: user?.isGuest ?? false,
    onKicked: quickPlaySocket.onKicked,
    onSessionEnded: quickPlaySocket.onSessionEnded,
    handleGuestKicked: () => { setQuickPlayKicked(true); setActiveAssignment(null); },
    handleGuestSessionEnded: () => { setQuickPlaySessionEnded(true); setActiveAssignment(null); },
  });

  // Throttled Socket.IO score emit — routes to the live-challenge `/`
  // namespace or the Quick Play `/quick-play` namespace depending on
  // context. See handlers/emitScoreUpdate.
  const emitScoreUpdate = buildEmitScoreUpdate({
    user, socket, isFinished,
    quickPlayActiveSession,
    qpCumulativeScoreRef, lastScoreEmitRef,
    quickPlaySocketUpdateScore: quickPlaySocket.updateScore,
  });


  // Emits JOIN_CHALLENGE / OBSERVE_CHALLENGE and listens for
  // challenge_error on the Live Challenge socket.  Pairs with
  // useLiveChallengeSocket (which owns the connection) — this hook
  // owns the per-role emit behaviour that triggers off view +
  // class state.
  useLiveChallengeEvents({
    user, socket, socketConnected, selectedClass, isLiveChallenge,
  });



  // Helper: set pending approval info and persist to sessionStorage
  const showPendingApproval = (info: { name: string; classCode: string; profileId?: string }) => {
    setPendingApprovalInfo(info);
    setView("student-pending-approval");
    try { sessionStorage.setItem('vocaband_pending_approval', JSON.stringify(info)); } catch {}
  };
  // Student-account login flow (PendingApprovalScreen + OAuth approved branch).
  const { handleLoginAsStudent, renameStudentDisplayName } = useStudentLogin({
    user, setUser, setError, setLoading, setView,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    showPendingApproval,
    loadAssignmentsForClass,
  });

  // Google-OAuth post-callback handlers were removed in the 2026-05-18
  // privacy review along with student-side OAuth.  Teacher OAuth now
  // restores its session entirely through useAuthRestore's
  // onAuthStateChange listener (which auto-creates the public.users row
  // for allowed Google sign-ins).  Stale OAuth student sessions are
  // rejected in the same hook so existing users get routed back to PIN.

  // Class-switch modal confirm/cancel — both branches hydrate after.
  const { handleConfirmClassSwitch, handleCancelClassSwitch } = useClassSwitch({
    pendingClassSwitch, setPendingClassSwitch,
    setUser, setView, setLoading,
    setStudentAssignments, setStudentProgress,
    showToast,
  });

  // Privacy-policy consent — banner gate + audit-log persistence.
  const { checkConsent, recordConsent } = useConsent({
    user, setNeedsConsent, setConsentChecked,
  });

  // OCR pipeline — photo → /api/ocr → translate → custom-word tab.
  const { handleOcrUpload, processOcrFile } = useOcrUpload({
    classes, setSelectedClass,
    setCustomWords, setSelectedWords,
    setSelectedLevel: setSelectedLevel as (v: string) => void,
    setView: setView as (v: string) => void,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, showPaywallToast, translateWordsBatch,
  });

  // Adapter for the picker's `onOcrUpload` contract — the OCR pipeline
  // routes extracted words through its preview modal, not the return
  // value, so we honour the contract with an empty result.
  const onPickerOcrUpload = useCallback(async (file: File) => {
    await processOcrFile(file);
    return { words: [], success: true };
  }, [processOcrFile]);

  // restoreSession + onAuthStateChange wiring + safety timeout.  See useAuthRestore.
  useAuthRestore({
    restoreInProgress, restoreRetried, manualLoginInProgress,
    fromShareLinkRef, currentViewRef, lastUserRoleRef, qpCumulativeScoreRef,
    quickPlaySessionParam,
    cleanupSessionData, showPendingApproval, showToast, appToasts,
    checkConsent, fetchTeacherData, fetchTeacherAssignments, stopAllAudio,
    shouldPreserveView,
    setLoading, setError, setLandingTab, setView, setUser,
    setBadges, setXp, setStreak,
    setClasses, setStudentAssignments, setStudentProgress,
    setActiveAssignment, setAssignmentWords,
    setQuickPlayActiveSession, setQuickPlaySessionCode,
    setQuickPlayKicked, setQuickPlaySessionEnded,
    setClassNotFoundIntent, setPendingClassSwitch, setPendingApprovalInfo,
    setOauthAuthUid, setOauthEmail, setShowOAuthClassCode,
    setCurrentIndex, setScore, setMistakes, setIsFinished, setFeedback,
    setSpellingInput, setMatchedIds, setSelectedMatch, setIsFlipped,
    setRevealedLetters, setSentenceIndex, setAvailableWords,
    setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    setWordAttemptBatch, setShowModeSelection,
  });

  // Mobile back-button + History API trap.  Pins logged-in users to
  // the dashboard floor and routes Back between real in-app views.
  const { beginExitFlow } = useBackButtonTrap({
    view, setView, user,
    showExitConfirmModal, setShowExitConfirmModal,
    restoreInProgressRef: restoreInProgress,
  });

  // Apply teacher dashboard theme to document root.  Extract theme ID
  // separately so the effect doesn't re-run on unrelated user updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherThemeId = hasTeacherAccess(user) ? (user as any).teacherDashboardTheme : null;
  useApplyTeacherTheme(teacherThemeId);

  // View-state guards — redirect out of orphaned/broken views.
  useViewGuards({
    view, setView, user, loading,
    activeAssignment, quickPlayActiveSession,
  });

  // Warn before leaving while a score save is in flight.
  useBeforeUnloadWhileSaving(isSaving);

  // Teacher-side toasts on new approvals + new scores.
  useTeacherNotifications({ user, view, pendingStudents, allScores, showToast });

  // Save-queue resilience: periodic flush + offline retry + QP queue flusher.
  useSaveQueueResilience({
    user, isSaving, saveQueueHasPending, processSaveQueue,
  });

  // Save-queue depth ref — drives the "Saved locally" / "All synced"
  // toast transitions fired by useAppMiscEffects.
  const queueDepthRef = useRef<number>(0);

  // Background dashboard auto-refresh (student assignments 30s /
  // pending approvals 10s / class scores 20s).
  useDashboardPolling({
    user, view, classes, allScores,
    pendingStudentsCount: pendingStudents.length,
    setStudentAssignments,
    loadPendingStudents,
    fetchScores,
  });

  // Class Minute entry point — dashboard widget + ?play=class-minute
  // deep link.  Pulls SRS-due words → assignments → SET_2_WORDS.
  const startClassMinute = useCallback(async () => {
    const seedWords = await pickClassMinuteWords({
      allWords: ALL_WORDS,
      set2Words: SET_2_WORDS,
      studentAssignments,
    });
    setAssignmentWords(seedWords);
    setGameMode("class-minute");
    setIsFinished(false);
    setShowModeSelection(false);
    setView("game");
  }, [ALL_WORDS, SET_2_WORDS, studentAssignments]);

  // Deep-link consumers: ?assignment=<id> + ?play=class-minute.
  useDeepLinkConsumers({
    user, view,
    pendingAssignmentId, pendingPlayMode,
    studentAssignments, allWordsCount: ALL_WORDS.length, pendingClassSwitch,
    startClassMinute,
    setActiveAssignment, setAssignmentWords, setShowModeSelection, setView,
    setPendingAssignmentId, setPendingPlayMode,
  });


  // Idempotent badge grant — includes-guard + celebrate + DB upsert.
  const awardBadge = useAwardBadge({ user, badges, setBadges, setSaveError });


  // --- GAME LOGIC ---
  const gameWords = view === "game" && assignmentWords.length > 0 ? assignmentWords : SET_2_WORDS;
  const currentWord = gameWords[currentIndex];

  // Bundle of small side-effects (userRef sync, Sentry pipe, feedback
  // cleanup, legacy view redirect, round-finish audio, welcome popup
  // gate, view-change dispatch, lastUserRoleRef sync, queue-depth
  // toasts, QP audio preload, isFlipped reset).
  useAppMiscEffects({
    user, view, userRef, currentViewRef, lastUserRoleRef,
    feedbackTimeoutRef,
    isFinished, score, socket, playMotivational,
    setShowAssignmentWelcome,
    setView, fetchScores,
    showToast, appToasts, queueDepthRef,
    quickPlayActiveSession, preloadMany,
    gameWords,
    currentWord, currentIndex, setIsFlipped,
  });

  // Per-round derived data: 4-way options, T/F option, scrambled letters.
  const { options, tfOption, scrambledWord } = useGameRoundOptions({
    currentWord, gameWords, currentIndex,
  });

  // Feedback instrumentation: 5 s failsafe, processing-ref mirror,
  // and gameDebug logs for feedback + word-change transitions.
  useFeedbackTracking({
    feedback, setFeedback,
    currentIndex, view, gameMode,
    showModeSelection, showModeIntro, isFinished,
    gameWords, isProcessingRef,
  });



  // Voice selection + caching + voiceschanged listener are bundled in
  // a hook so this component doesn't hold browser-API plumbing.
  // speak() is provided by the voice manager — same wrapper as before
  // (cancel-then-speak with parenthetical cleanup), just owned by the
  // hook so this file doesn't carry browser-API plumbing.
  const { speak } = useSpeechVoiceManager();

  // Per-game-mode setup effects: auto-speak on word advance,
  // matching-mode pairs build, letter-sounds reveal animation,
  // sentence-builder first-sentence load.  All share the same
  // `view === "game" && !showModeSelection` guard pattern.
  useGameModeSetup({
    view, gameMode, currentWord, currentIndex, gameWords,
    showModeSelection, showModeIntro, isFinished,
    targetLanguage, activeAssignment,
    speakWord, speak,
    setMatchingPairs, setMatchedIds, setSelectedMatch,
    setRevealedLetters,
    setSentenceIndex, setAvailableWords, setBuiltSentence, setSentenceFeedback,
  });


  // Guest exit cleanup — sign out anon auth, drop the resume hint,
  // reset completedModes.  See handlers/sessionCleanups.
  const cleanupQuickPlayGuest = buildCleanupQuickPlayGuest(
    () => user,
    () => quickPlayActiveSession,
    setQuickPlayCompletedModes,
  );

  // Game-finish handlers (saveScore + handleExitGame), extracted into a
  // dedicated hook. saveScore in particular is large — anti-farm cap,
  // booster math, streak handling, badge checks, optimistic save with
  // retry queue — and was crowding App.tsx. Behaviour unchanged.
  const { saveScore, handleExitGame } = useGameFinish({
    user,
    score, gameMode, gameWords, mistakes, wordAttemptBatch, activeAssignment,
    quickPlayActiveSession,
    // On mode-finish: accumulate this mode's finalScore into the
    // Accumulate mode score into the session-wide cumulative BEFORE
    // emitting, so the QP socket sees a monotonically-increasing
    // total across modes (server rejects regresses).
    quickPlaySocketUpdateScore: (finalScore: number, extras?: {
      streak?: number;
      roundProgress?: { done: number; total: number };
      perfectRound?: boolean;
    }) => {
      qpCumulativeScoreRef.current += Math.max(0, finalScore);
      quickPlaySocket.updateScore(qpCumulativeScoreRef.current, extras);
    },
    xp, setXp, streak, setStreak, badges, studentProgress, setStudentProgress,
    setIsSaving, setSaveError, setQuickPlayCompletedModes,
    retention, boosters,
    showToast, awardBadge, queueSaveOperation,
    setView, setUser, setIsFinished, setCurrentIndex, setScore, setMistakes,
    setWordAttemptBatch, setFeedback, setSpellingInput, setMatchedIds,
    setSelectedMatch, setIsFlipped, setRevealedLetters, setSentenceIndex,
    setAvailableWords, setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    showModeSelection, setShowModeSelection,
    // App's quickPlayActiveSession is wider than the hook needs; the
    // hook only sets it to null on exit, so the cast is sound.
    setQuickPlayActiveSession: setQuickPlayActiveSession as React.Dispatch<React.SetStateAction<{ id: string; sessionCode: string; [k: string]: unknown } | null>>,
    setQuickPlayStudentName,
    cleanupSessionData, cleanupQuickPlayGuest,
  });

  // Game-mode handlers, extracted so App.tsx doesn't carry the full
  // weight of the per-mode answer logic. Same behavior as the inline
  // versions; the hook just owns the implementation now.
  //
  // Must be called AFTER `saveScore` and `emitScoreUpdate` are defined
  // (the hook closes over them as callbacks), and BEFORE any JSX that
  // wires the destructured handlers as props.
  const {
    handleSentenceWordTap,
    handleSentenceCheck,
    handleMatchClick,
    handleAnswer,
    handleTFAnswer,
    handleFlashcardAnswer,
    handleSpellingSubmit,
  } = useGameModeActions({
    score, setScore, currentIndex, setCurrentIndex, setIsFinished,
    gameWords, currentWord, gameMode,
    feedback, setFeedback, mistakes, setMistakes, setHiddenOptions,
    wordAttempts, setWordAttempts, setWordAttemptBatch,
    tfOption,
    spellingInput, setSpellingInput,
    setIsFlipped,
    selectedMatch, setSelectedMatch,
    matchedIds, setMatchedIds,
    isMatchingProcessing, setIsMatchingProcessing,
    matchingPairs,
    activeAssignment, sentenceIndex, setSentenceIndex,
    availableWords, setAvailableWords, builtSentence, setBuiltSentence,
    setSentenceFeedback,
    feedbackTimeoutRef, isProcessingRef,
    emitScoreUpdate, saveScore,
    speak, speakWord, playWrong,
  });

  // Global cookie banner — renders on top of ANY view until accepted
  // Only show to non-authenticated users (logged-in users have already accepted via privacy consent)
  // Suppress the QP resume banner when:
  //   - the student is already on a QP URL (resume-in-progress)
  //   - the student is actively in a game / mode-selection / dashboard
  //     of a QP session (don't nag during play)
  // Otherwise it surfaces on landing / login / public pages whenever
  // there's a valid <90-min resume hint in localStorage.
  const qpResumeSuppress =
    !!quickPlaySessionParam ||
    !!quickPlayActiveSession ||
    view === "quick-play-student";
  // Pre-auth overlays (cookie banner / QP resume banner / offline
  // pill / OCR crop modal / config-error banner).  See useAppPreOverlays.
  const { cookieBannerOverlay, ocrCropModal, configErrorBanner } = useAppPreOverlays({
    user, showCookieBanner, handleCookieAccept, handleCookieCustomize,
    qpResumeSuppress, ocrPendingFile, setOcrPendingFile, processOcrFile,
  });

  if (loading && !quickPlaySessionParam) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
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

  // Student auth / Quick Play join screens (pending-approval, account
  // login, quick-play-student) bundled into renderStudentAuthRoute.
  const studentAuthRoute = renderStudentAuthRoute({
    view, user, setView, setUser, showToast, cookieBannerOverlay,
    pendingApprovalInfo, setPendingApprovalInfo, handleLoginAsStudent,
    error, setError,
    studentLoginClassCode, setStudentLoginClassCode,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    setAssignmentWords, setActiveAssignment, setCurrentIndex,
    setScore, setFeedback, setIsFinished, setMistakes, setShowModeSelection,
    cleanupSessionData,
    setQuickPlayKicked,
  });
  if (studentAuthRoute) return studentAuthRoute;

  // ── Student Pending Approval Screen ────────────────────────────────────────



  // Re-consent, exit-confirm, class-not-found, class-switch overlays —
  // markup lives in useAppOverlays.
  const { consentModal, exitConfirmModal, classNotFoundBanner, classSwitchModal } = useAppOverlays({
    user, needsConsent, showOnboarding,
    consentChecked, setConsentChecked, recordConsent,
    showExitConfirmModal, setShowExitConfirmModal, beginExitFlow,
    classNotFoundIntent, setClassNotFoundIntent, setView,
    pendingClassSwitch, handleConfirmClassSwitch, handleCancelClassSwitch,
  });

  if (user?.role === "student" && view === "student-dashboard") {
    return StudentDashboardSection({
      user, xp, streak, badges, setXp, setBadges, setUser,
      copiedCode, setCopiedCode,
      studentAssignments, studentProgress, studentDataLoading,
      showStudentOnboarding, setShowStudentOnboarding,
      consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
      setView, setActiveAssignment, setAssignmentWords, setShowModeSelection,
      setGameMode, setIsFinished,
      startClassMinute, retention, boosters,
      showToast, renameStudentDisplayName, structure, celebrateStructureKeys,
      // Top-bar logout routes through the same soft-landing modal the
      // hardware back button uses, so a stray tap doesn't drop the kid
      // straight out of their session.
      onRequestLogout: () => setShowExitConfirmModal(true),
    });
  }

  // Privacy-settings view (lazy-loaded). See PrivacySettingsSection.
  const privacySettings = renderPrivacySettingsSection({
    view, user, consentModal, exitConfirmModal,
    setView, setUser, setConfirmDialog, showToast,
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
  if (hasTeacherAccess(user) && view === "teacher-dashboard") {
    return TeacherDashboardSection({
      user, activeVoca, showVocaSwitcher: getEntitledVocas(user).length >= 2,
      setActiveVoca, setView, setUser,
      consentModal, exitConfirmModal, ocrCropModal,
      showOnboarding, setShowOnboarding,
      visibleClasses, visibleAssignments,
      pendingStudentsCount: pendingStudents.length,
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
      allWords: ALL_WORDS, set1Words: SET_1_WORDS, setCustomWords,
      setSentenceDifficulty, setSentencesAutoGenerated, setSelectedLevel,
      setRosterModalClass, rosterModalClass,
      savedTasks, setQuickPlaySelectedWords, setQuickPlayInitialModes,
    });
  }

  if (view === "create-assignment" && selectedClass) {
    return CreateAssignmentSection({
      user, selectedClass,
      allWords: ALL_WORDS, set1Words: SET_1_WORDS, set2Words: SET_2_WORDS, topicPacks: TOPIC_PACKS,
      customWords, setCustomWords,
      assignmentTitle, setAssignmentTitle,
      assignmentDeadline, setAssignmentDeadline,
      assignmentModes, setAssignmentModes,
      selectedWords, setSelectedWords,
      selectedLevel, setSelectedLevel,
      tagInput, setTagInput,
      pastedText, setPastedText,
      showPasteDialog, setShowPasteDialog,
      pasteMatchedCount, pasteUnmatched,
      handlePasteSubmit, handleAddUnmatchedAsCustom, handleSkipUnmatched,
      handleTagInputKeyDown, handleDocxUpload, handleOcrUpload, handleSaveAssignment,
      assignmentSentences, setAssignmentSentences,
      sentenceDifficulty, setSentenceDifficulty,
      isOcrProcessing, ocrProgress, ocrStatus,
      showTopicPacks, setShowTopicPacks,
      showAssignmentWelcome, setShowAssignmentWelcome,
      editingAssignment, setEditingAssignment,
      setActivityNavOrigin, setClassShowAssignment,
      setView, onSaveTemplate: savedTasks.save, showToast, showPaywallToast, speakWord,
    });
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
    xp, setXp, setUser, showToast,
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
  return (
    <>
      {renderGameRoute({
        view, user, setUser,
        showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
        setGameMode, setShowModeIntro, setView, handleExitGame, quickPlayCompletedModes,
        showModeIntro, hasChosenLanguage, setHasChosenLanguage, setTargetLanguage,
        gameDebug, gameMode, currentIndex, isFinished, feedback, isProcessingRef, currentWord,
        score, xp, streak, badges, mistakes, gameWords, quickPlayActiveSession,
        isSaving, saveError, toasts, confirmDialog, setConfirmDialog,
        setIsFinished, setScore, setCurrentIndex, setMistakes, setFeedback,
        setWordAttempts, setHiddenOptions, setSpellingInput, setAssignmentWords,
        cleanupSessionData, cleanupQuickPlayGuest,
        setQuickPlayActiveSession, setQuickPlayStudentName,
        setSaveError, targetLanguage, options, hiddenOptions,
        isMatchingProcessing, matchingPairs, matchedIds, selectedMatch, tfOption,
        isFlipped, setIsFlipped, scrambledWord, revealedLetters, spellingInput,
        sentenceIndex, sentenceFeedback, builtSentence, setBuiltSentence,
        availableWords, setAvailableWords, leaderboard,
        saveScore, handleAnswer, handleMatchClick, handleTFAnswer,
        handleFlashcardAnswer, handleSpellingSubmit, handleSentenceWordTap, handleSentenceCheck,
        speakWord, speak, shuffle,
      })}
      {showQpReactionBar && <QpReactionBar sendReaction={quickPlaySocket.sendReaction} />}
      {showQpHelpButton && (
        <QuickPlayHelpButton
          onAlertTeacher={() => quickPlaySocket.sendReaction('🙋')}
          onLeave={() => {
            cleanupQuickPlayGuest();
            setView('public-landing');
          }}
        />
      )}
    </>
  );
};
