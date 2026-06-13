import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { View } from "../core/views";
import { useVocabularyLazyWithDefaults } from "./useVocabularyLazy";
import { hasTeacherAccess, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "../core/supabase";
import { useAudio } from "./useAudio";
import { primeAudio } from "../utils/primeAudio";
import { useLanguage } from "./useLanguage";
import { appToastsT } from "../locales/app-toasts";
import { useRetention } from "./useRetention";
import { useSavedTasks } from "./useSavedTasks";
import { useBoosters } from "./useBoosters";
import { useFeatureFlag } from "./useFeatureFlag";
import { useLevelUp } from "./useLevelUp";
import { useAchievements } from "./useAchievements";
import { grantRetentionXp } from "../handlers/retentionGrants";
import { createGuestUser } from "../utils/createGuestUser";
import { useTeacherGuidesSync } from "./useTeacherGuidesSync";
import { useVocaRouting } from "./useVocaRouting";
import { useApplyTeacherTheme } from "./useApplyTeacherTheme";
import { useApplyStudentTheme } from "./useApplyStudentTheme";
import { useAuthRestore } from "./useAuthRestore";
import { useDeepLinkConsumers } from "./useDeepLinkConsumers";
import { useAppMiscEffects } from "./useAppMiscEffects";
import { useAppPreOverlays } from "./useAppPreOverlays";
import { useAppOverlays } from "./useAppOverlays";
import { type AppViewRouterProps } from "../views/AppViewRouter";
import { useBeforeUnloadWhileSaving } from "./useBeforeUnloadWhileSaving";
import { useQuickPlaySocket } from "./useQuickPlaySocket";
import { useTeacherActions } from "./useTeacherActions";
import { useGameRouteDeps } from "./useGameRouteDeps";
import { useTeacherDashboardDeps } from "./useTeacherDashboardDeps";
import { useCreateAssignmentDeps } from "./useCreateAssignmentDeps";
import { useStudentSectionDeps } from "./useStudentSectionDeps";
import { useTranslate } from "./useTranslate";
import { useSaveQueue } from "./useSaveQueue";
import { useTeacherData } from "./useTeacherData";
import { useQuickPlayUrlBootstrap } from "./useQuickPlayUrlBootstrap";
import { useTeacherNotifications } from "./useTeacherNotifications";
import { useLiveChallengeSocket } from "./useLiveChallengeSocket";
import { useLiveChallengeEvents } from "./useLiveChallengeEvents";
import { useQuickPlayEvents } from "./useQuickPlayEvents";
import { useGameStats } from "./useGameStats";
import { useStudentAssignmentData } from "./useStudentAssignmentData";
import { useGameSession } from "./useGameSession";
import { useTier2StudentLogin } from "./useTier2StudentLogin";
import { useGameFlowState } from "./useGameFlowState";
import { useAssignmentEditorState } from "./useAssignmentEditorState";
import { useAssignmentBuilderState } from "./useAssignmentBuilderState";
import { useDashboardPolling } from "./useDashboardPolling";
import { useAssignmentAutoPopulate } from "./useAssignmentAutoPopulate";
import { useSaveQueueResilience } from "./useSaveQueueResilience";
import { useAssignmentPrecache } from "./useAssignmentPrecache";
import { useBackButtonTrap } from "./useBackButtonTrap";
import { useViewGuards } from "./useViewGuards";
import { useStudentLogin } from "./useStudentLogin";
import { useClassSwitch } from "./useClassSwitch";
import { useConsent } from "./useConsent";
import { useOcrUpload } from "./useOcrUpload";
import { useCookieConsent } from "./useCookieConsent";
import { useAwardBadge } from "./useAwardBadge";
import { useToasts } from "./useToasts";
import { useOAuthState } from "./useOAuthState";
import { useActiveVocaState } from "./useActiveVocaState";
import { useOnboardingFlags } from "./useOnboardingFlags";
import { useQuickPlayGuestState } from "./useQuickPlayGuestState";
import { useQuickPlaySessionState } from "./useQuickPlaySessionState";
import { useTeacherUiModalsState } from "./useTeacherUiModalsState";
import { useAuthFlowRefs } from "./useAuthFlowRefs";
import { useNavigationRefs } from "./useNavigationRefs";
import { useRenderLoopRefs } from "./useRenderLoopRefs";
import { useGameModeMechanicsState } from "./useGameModeMechanicsState";
import { useDeepLinkUrlParams } from "./useDeepLinkUrlParams";
import { useTargetLanguageState } from "./useTargetLanguageState";
import { resolveInitialView } from "../utils/resolveInitialView";
import { hasRestorableSession } from "../utils/hasRestorableSession";
import { PUBLIC_PAGE_VIEW, type PublicPage } from "../utils/publicNavigation";
import { pathForView } from "../utils/routes";
import { pickClassMinuteWords } from "../utils/classMinuteWords";
import { isPublicView, shouldPreserveView } from "../utils/authViews";
import { buildCleanupSessionData } from "../handlers/sessionCleanups";

type ConfirmDialog = { show: boolean; message: string; onConfirm: () => void };

export function useAppController(initialView?: View): AppViewRouterProps {
  // Language-aware toast text — picked up at render time so a teacher
  // who flips EN/HE/AR before firing a callback sees the localised
  // version on the next render.
  const { language: appLanguage } = useLanguage();
  const appToasts = appToastsT[appLanguage];

  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  // Start the loading spinner ONLY when a session might actually be
  // restorable. A fresh visitor (no token, no OAuth handoff, no saved
  // login) skips it so the public landing paints on the first frame
  // instead of blocking on supabase.auth.getSession(). useAuthRestore
  // still runs either way; it just no-ops setLoading(false) here.
  const [loading, setLoading] = useState(hasRestorableSession);
  const [studentDataLoading] = useState(false);
  // Detect Quick Play session from URL synchronously so it takes
  // priority over auth redirects.
  const quickPlaySessionParam = new URLSearchParams(window.location.search).get('session');

  // `initialView` is supplied when PublicShell hands off (e.g. a login
  // click) so App opens directly on that view; otherwise resolve from URL.
  const [view, setView] = useState<View>(() => initialView ?? resolveInitialView());
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
    handleCookieReject,
  } = useCookieConsent();

  // Public-page nav also pushes the page's real URL so the address bar
  // reflects the page and a refresh/share re-resolves to it (mirrors
  // navigateToStudentLogin). Stamping the destination view into history
  // state lets useBackButtonTrap's view-change effect skip its own
  // redundant push — it early-returns when state.view already matches.
  const handlePublicNavigate = (page: PublicPage) => {
    const view = PUBLIC_PAGE_VIEW[page];
    const path = pathForView(view);
    try {
      if (path && window.location.pathname !== path) {
        window.history.pushState({ view }, "", path);
      }
    } catch { /* history API blocked — fall back to view-only nav */ }
    setView(view);
  };
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
  const { xp, setXp, coins, setCoins, streak, setStreak, badges, setBadges } = useGameStats();

  // Retention state (daily chest, weekly challenge, comeback, limited
  // rotating item, pet evolution milestones).  Scoped per-user via uid.
  const retention = useRetention(user?.uid, xp);

  // Arcade flag — drives both the level-up modal and the achievement
  // system below.  Resolved early because several effects gate on it.
  const arcadeHubEnabled = useFeatureFlag("arcade_hub", false);
  const arcadeActive = arcadeHubEnabled && user?.role === "student" && !user?.isGuest;

  // Saved task templates — teacher-side localStorage of full assignment /
  // quick-play snapshots so a teacher can rebuild the same task in one
  // tap.  Hook returns sorted list (pinned → most-used → most-recent).
  const savedTasks = useSavedTasks(user?.uid);

  // Active boosters (xp_booster, weekend_warrior, streak_freeze,
  // lucky_charm, focus_mode).  Scoped per-user via uid; persists in
  // localStorage so boosters survive page refresh.
  const boosters = useBoosters(user?.uid);

  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentMode, setConsentMode] = useState<'consent' | 'reminder'>('consent');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // OAuth callback state + class-switch confirmation state. See
  // useOAuthState for the (classNotFoundIntent / pendingClassSwitch) docs.
  const {
    setOauthEmail,
    setOauthAuthUid,
    setShowOAuthClassCode,
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
  // Word-selection core of the assignment editor. See useAssignmentEditorState.
  const {
    selectedWords, setSelectedWords,
    selectedLevel, setSelectedLevel,
    customWords, setCustomWords,
  } = useAssignmentEditorState();
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrPendingFile, setOcrPendingFile] = useState<{ file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null>(null);
  const [allScores, setAllScores] = useState<ProgressData[]>([]);
  const [classStudents, setClassStudents] = useState<{name: string, classCode: string, lastActive: string}[]>([]);
  const [globalLeaderboard] = useState<{name: string, score: number, avatar: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Assignment-builder form fields + Smart Paste dialog state.
  // See useAssignmentBuilderState.
  const {
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    sentencesAutoGenerated, setSentencesAutoGenerated,
    setAssignmentStep,
    pastedText, setPastedText,
    showPasteDialog, setShowPasteDialog,
    pasteMatchedCount, setPasteMatchedCount,
    pasteUnmatched, setPasteUnmatched,
    tagInput, setTagInput,
    showTopicPacks, setShowTopicPacks,
  } = useAssignmentBuilderState();

  // --- QUICK SEARCH & FILTERS STATE ---
  const [, setWordSearchQuery] = useState("");
  const [, setSelectedCore] = useState<"Core I" | "Core II" | "">("");
  const [, setSelectedPos] = useState<string>("");
  const [, setSelectedRecProd] = useState<"Rec" | "Prod" | "">("");

  // Toast notifications — state + showToast (stable identity for dep
  // arrays) + paywall-toast helper. See useToasts.
  const { toasts, setToasts, showToast, showPaywallToast } = useToasts();

  // Arcade level-up modal — fires once per XP_TITLES tier crossing.
  const levelUp = useLevelUp({
    uid: user?.uid ?? null,
    xp,
    enabled: arcadeActive,
  });
  // Arcade achievement system — append-only Supabase table + slide-in
  // toasts.  Grants are routed through grantRetentionXp so the XP
  // economy lives in one RPC.  On first run per device the hook
  // silently seeds any currently-met achievements without toasting,
  // so a long-time student doesn't get back-fill spam.
  const achievements = useAchievements({
    uid: user?.uid ?? null,
    enabled: arcadeActive,
    onGrantXp: (amount, reason) =>
      grantRetentionXp(amount, reason, { user, setXp, showToast }),
  });

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
  const {
    activeAssignment, setActiveAssignment,
    studentAssignments, setStudentAssignments,
    studentProgress, setStudentProgress,
    assignmentWords, setAssignmentWords,
  } = useStudentAssignmentData();
  // Warm the audio cache for the active assignment so a student who loses
  // Wi-Fi mid-lesson can still hear the words. Idle-scheduled, skipped on
  // 2G / data-saver. See useAssignmentPrecache for the why.
  useAssignmentPrecache(assignmentWords);

  // Achievement snapshot — rebuilt whenever xp / streak / progress
  // changes and handed to `recordEvent` to re-evaluate locked
  // achievements. MUST stay above the early returns further down so
  // the hook order never changes between renders (Rules of Hooks);
  // the `arcadeActive` guard lives inside the effect body, not around
  // the hook call.
  useEffect(() => {
    if (!arcadeActive) return;
    const perfectScores = studentProgress.filter((p) => p.score >= 100).length;
    const modesPlayed = new Set(studentProgress.map((p) => p.mode));
    // Coarse mastery proxy — distinct assignments fully played at 80+
    // is a decent stand-in until the word-mastery hook surfaces here.
    const wordsMastered = studentProgress.filter((p) => p.score >= 80).length * 5;
    void achievements.recordEvent({
      xp,
      streak,
      gamesPlayed: studentProgress.length,
      perfectScores,
      wordsMastered,
      modesPlayed,
    });
  }, [arcadeActive, xp, streak, studentProgress, achievements]);

  // ?assignment=<id> and ?play=<mode> deep-link URL params captured at
  // boot.  See useDeepLinkUrlParams.
  const {
    pendingAssignmentId, setPendingAssignmentId,
    pendingPlayMode, setPendingPlayMode,
  } = useDeepLinkUrlParams();

  const { speak: speakWordRaw, preloadMany, playWrong, playMotivational, stopAll: stopAllAudio } = useAudio();
  const speakWord = speakWordRaw;

  // --- GAME STATE ---
  const {
    gameMode, setGameMode,
    showModeSelection, setShowModeSelection,
    showModeIntro, setShowModeIntro,
  } = useGameFlowState();

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
  const {
    spellingInput, setSpellingInput,
    currentIndex, setCurrentIndex,
    score, setScore,
    mistakes, setMistakes,
    wordAttemptBatch, setWordAttemptBatch,
    feedback, setFeedback,
  } = useGameSession();
  const {
    targetLanguage, setTargetLanguage,
    hasChosenLanguage, setHasChosenLanguage,
  } = useTargetLanguageState();

  // Lock the translation target to the chosen UI language: a student who
  // picks Hebrew sees Hebrew translations everywhere, Arabic → Arabic.
  // The in-game language toggle was removed, so this is the single source
  // of truth. (English UI — teachers/demo — keeps the existing target.)
  useEffect(() => {
    if (appLanguage === 'he') setTargetLanguage('hebrew');
    else if (appLanguage === 'ar') setTargetLanguage('arabic');
  }, [appLanguage, setTargetLanguage]);

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

  // Emits JOIN_CHALLENGE / OBSERVE_CHALLENGE and listens for
  // challenge_error on the Live Challenge socket.  Pairs with
  // useLiveChallengeSocket (which owns the connection) — this hook
  // owns the per-role emit behaviour that triggers off view +
  // class state.
  useLiveChallengeEvents({
    user, socket, socketConnected, selectedClass, isLiveChallenge,
  });



  // Student-account login flow (roster PIN sign-in + rename helper).
  const { renameStudentDisplayName } = useStudentLogin({
    user, setUser, setError, setView,
    setBadges, setXp, setCoins, setStreak,
    setStudentAssignments, setStudentProgress,
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
  const { checkConsent, recordConsent, reopenReminder } = useConsent({
    user, setNeedsConsent, setConsentChecked, setConsentMode, setDontShowAgain,
  });

  // OCR pipeline — photo → /api/ocr → translate → custom-word tab.
  // Phase 2: teacherUid is also threaded so each extraction is persisted
  // to the Vocabulary Library as a new Set. Undefined for anonymous
  // flows (Quick Play guests etc.) — the library save short-circuits.
  const { handleOcrUpload, processOcrFile } = useOcrUpload({
    classes, setSelectedClass,
    setCustomWords, setSelectedWords,
    setSelectedLevel: setSelectedLevel as (v: string) => void,
    setView: setView as (v: string) => void,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, showPaywallToast, translateWordsBatch,
    teacherUid: hasTeacherAccess(user) ? user.uid : undefined,
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
    cleanupSessionData, showToast, appToasts,
    checkConsent, fetchTeacherData, fetchTeacherAssignments, stopAllAudio,
    shouldPreserveView,
    setLoading, setError, setLandingTab, setView, setUser,
    setBadges, setXp, setCoins, setStreak,
    setClasses, setStudentAssignments, setStudentProgress,
    setActiveAssignment, setAssignmentWords,
    setQuickPlayActiveSession, setQuickPlaySessionCode,
    setQuickPlayKicked, setQuickPlaySessionEnded,
    setClassNotFoundIntent, setPendingClassSwitch,
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

  // Re-consent, exit-confirm, class-not-found, class-switch overlay markup.
  // MUST stay here with the other top-level hooks — above every early
  // return below. It was previously called further down (after the public /
  // quick-play-exit / student-auth early returns), so a student
  // transitioning from the join form (early-returned) into the dashboard or
  // live-challenge game (not early-returned) ran this hook on one render but
  // not the previous one — React #310 ("Rendered more hooks than during the
  // previous render"), which crashed the live-challenge join. The returned
  // overlay nodes are only consumed by the authenticated branches further
  // down, so hoisting the call changes nothing visible.
  const { consentModal, exitConfirmModal, classNotFoundBanner, classSwitchModal } = useAppOverlays({
    user, needsConsent, showOnboarding,
    consentChecked, setConsentChecked,
    consentMode, dontShowAgain, setDontShowAgain,
    recordConsent,
    showExitConfirmModal, setShowExitConfirmModal, beginExitFlow,
    classNotFoundIntent, setClassNotFoundIntent, setView,
    pendingClassSwitch, handleConfirmClassSwitch, handleCancelClassSwitch,
  });

  // Apply teacher dashboard theme to document root.  Extract theme ID
  // separately so the effect doesn't re-run on unrelated user updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherThemeId = hasTeacherAccess(user) ? (user as any).teacherDashboardTheme : null;
  useApplyTeacherTheme(teacherThemeId);

  // Apply a student's equipped shop theme's dark intent the same way: a
  // dark theme (Dark Mode / Neon / Galaxy / Esports) sets data-theme-dark
  // so the index.css remap darkens every hardcoded light surface app-wide.
  // Gated behind `!teacherThemeId` so the two hooks never write the same
  // flag — a teacher's palette always owns it.
  const studentThemeId = teacherThemeId ? null : (user?.activeTheme ?? null);
  useApplyStudentTheme(studentThemeId);

  // View-state guards — redirect out of orphaned/broken views.
  useViewGuards({
    view, setView, user, loading,
    activeAssignment, quickPlayActiveSession,
    selectedClass,
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
    // Prime iOS audio synchronously inside the dashboard-tap gesture,
    // BEFORE the await below — once we yield to the async word-pick the
    // gesture context is gone and SpeedRoundGame's auto-speak would be
    // muted on iOS. Idempotent. (Deep-link launches have no gesture, but
    // those are rare and already-primed sessions stay primed.)
    primeAudio();
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

  // ─── Tier-2 fast student login (build-flag gated) ───────────────────────
  // Collapses PIN login's 3-4 serial client→Frankfurt hops into ONE edge
  // round-trip via /api/student/login (see docs/login-latency-tier2-proposal.md).
  // Returns:
  //   'ok'       — session set + dashboard hydrated here, nothing else to do
  //   'invalid'  — wrong PIN; the card shows its own error
  //   'fallback' — endpoint disabled / unavailable / bootstrap missing; the
  //                card runs the existing direct signInWithPassword path
  // Gated behind VITE_ENABLE_TIER2_LOGIN so it ships dark until the operator
  // sets SUPABASE_ANON_KEY on Fly and flips the build flag.
  const tier2LoginEnabled =
    (import.meta as { env?: { VITE_ENABLE_TIER2_LOGIN?: string } }).env?.VITE_ENABLE_TIER2_LOGIN === 'true';
  // Tier-2 fast student login — see useTier2StudentLogin (extracted verbatim).
  const handleTier2StudentLogin = useTier2StudentLogin({
    manualLoginInProgressRef: manualLoginInProgress, setUser, checkConsent, setStudentAssignments,
    setStudentProgress, setBadges, setXp, setCoins, setStreak, setLoading, setView,
  });

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

  // GameRouteProvider value bag + the game-tail hooks that feed only it
  // (round options, feedback tracking, voice manager, mode setup, game
  // finish, mode actions).  Called at the exact position the first of
  // those hooks (useGameRoundOptions) used to occupy, so the global hook
  // order is unchanged.  Returns a fresh (un-memoized) bag every render —
  // same identity semantics as the old inline literal.
  const gameRouteDeps = useGameRouteDeps({
    view, user, setUser, language: appLanguage,
    showModeSelection, setShowModeSelection, activeAssignment, studentProgress,
    setGameMode, setShowModeIntro, setView, quickPlayCompletedModes,
    showModeIntro, hasChosenLanguage, setHasChosenLanguage, setTargetLanguage,
    gameMode, currentIndex, isFinished, feedback, isProcessingRef, currentWord,
    score, xp, streak, badges, mistakes, gameWords, quickPlayActiveSession,
    qpLeaderboard: quickPlaySocket.leaderboard,
    isSaving, saveError, toasts, confirmDialog, setConfirmDialog,
    setIsFinished, setScore, setCurrentIndex, setMistakes, setFeedback,
    setWordAttempts, setHiddenOptions, setSpellingInput, setAssignmentWords,
    cleanupSessionData, setQuickPlayActiveSession, setQuickPlayStudentName,
    setSaveError, targetLanguage, hiddenOptions,
    isMatchingProcessing, matchingPairs, matchedIds, selectedMatch,
    isFlipped, setIsFlipped, revealedLetters, spellingInput,
    sentenceIndex, sentenceFeedback, builtSentence, setBuiltSentence,
    availableWords, setAvailableWords, leaderboard, speakWord,
    setXp, coins, setCoins, setStreak, setStudentProgress,
    setIsSaving, setQuickPlayCompletedModes,
    wordAttempts, wordAttemptBatch, setWordAttemptBatch,
    retention, boosters, showToast, awardBadge, queueSaveOperation,
    socket, qpCumulativeScoreRef, lastScoreEmitRef,
    quickPlaySocketUpdateScore: quickPlaySocket.updateScore,
    feedbackTimeoutRef,
    setMatchingPairs, setSelectedMatch, setMatchedIds, setIsMatchingProcessing,
    setRevealedLetters, setSentenceIndex, setSentenceFeedback,
    playWrong,
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
    user, showCookieBanner, handleCookieAccept, handleCookieCustomize, handleCookieReject,
    qpResumeSuppress, ocrPendingFile, setOcrPendingFile, processOcrFile,
  });

  // TeacherDashboardProvider value bag — null for non-teachers, so the
  // render branch below stays equivalent to the old
  // `hasTeacherAccess(user) && view === "teacher-dashboard"` gate.
  // Hook-free assembly; returns a fresh (un-memoized) bag every render.
  const teacherDashboardDeps = useTeacherDashboardDeps({
    user, activeVoca,
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

  // CreateAssignmentProvider value bag — null until a class is selected,
  // so the render branch below stays equivalent to the old
  // `view === "create-assignment" && selectedClass` gate.  Hook-free
  // assembly; returns a fresh (un-memoized) bag every render.
  const createAssignmentDeps = useCreateAssignmentDeps({
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

  // StudentSectionRoute prop bag — null for non-students, so the render
  // branch below stays equivalent to the old `user?.role === "student"`
  // gate.  Hook-free assembly; fresh (un-memoized) bag every render.
  const studentSectionDeps = useStudentSectionDeps({
    user, xp, coins, streak, badges, setXp, setCoins, setBadges, setUser,
    copiedCode, setCopiedCode,
    studentAssignments, studentProgress, studentDataLoading,
    showStudentOnboarding, setShowStudentOnboarding,
    consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
    setView, setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setGameMode, setIsFinished,
    startClassMinute, retention, boosters,
    showToast, renameStudentDisplayName,
    levelUpPending: levelUp.pending, setShowExitConfirmModal,
  });

  // The entire view-dispatch render chain (the early-return cascade that
  // used to live here) moved verbatim to views/AppViewRouter.tsx.  The
  // props object is assembled fresh per render (NOT memoized) so every
  // bag the chain builds keeps the same per-render identity semantics as
  // the old inline chain.
  const routerDeps: AppViewRouterProps = {
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
  };
  return routerDeps;
}
