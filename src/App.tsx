import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import type { View } from "./core/views";
import { type VocaId, ACTIVE_VOCA_KEY, getEntitledVocas } from "./core/subject";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import type { Word } from "./data/vocabulary";
import { useVocabularyLazy } from "./hooks/useVocabularyLazy";
import { generateSentencesForAssignment } from "./data/sentence-bank";
// The three icons App.tsx renders eagerly (RefreshCw, AlertTriangle,
// ArrowLeftRight) used to be imported from lucide-react, which pulled
// the ~17 kB gz lucide chunk into the App.tsx modulepreload chain.
// Every visitor on cold first-paint paid for the whole icon bundle
// just so this file could render four small SVGs. Inlined below as
// plain <svg> elements using lucide's exact path data (v0.546.0, ISC
// licensed). Every other file in the codebase continues to import
// from lucide-react normally — the chunk still ships, just no longer
// on App.tsx's preload graph. Net cold-load win: one fewer module
// preload + ~17 kB gz saved on the critical path.
const SvgSpinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);
const SvgAlertTriangle: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);
// motion is no longer imported eagerly here. Its three eager consumers
// (CookieBanner, QuickPlayResumeBanner, ImageCropModal — all defined
// further down as React.lazy) carry it in their own chunks now, so the
// ~43 kB gz motion bundle drops out of the App.tsx modulepreload chain
// on cold first-paint. AnimatePresence / motion.div weren't used in
// this file anyway, so the original `import { motion, AnimatePresence }`
// was a dead import.
import { supabase, isSupabaseConfigured, OperationType, handleDbError, hasTeacherAccess, ASSIGNMENT_COLUMNS, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { isPro } from "./core/plan";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useAudio } from "./hooks/useAudio";
import { useLanguage } from "./hooks/useLanguage";
import { appToastsT } from "./locales/app-toasts";
import { useRetention } from "./hooks/useRetention";
import { useSavedTasks } from "./hooks/useSavedTasks";
import { useStructure } from "./hooks/useStructure";
import { useBoosters } from "./hooks/useBoosters";
import { shuffle, chunkArray, addUnique, removeKey, secureRandomInt } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
import { isAnswerCorrect } from './utils/answerMatch';
// SetupWizard is now lazy-loaded via QuickPlaySetupView
// CreateAssignmentWizard is now lazy-loaded via CreateAssignmentView
// CookieBanner, QuickPlayResumeBanner, ImageCropModal — eager-imported
// before; now React.lazy so motion (~43 kB gz) is removed from the
// App.tsx static-import graph and stops being preloaded on cold visit.
// All three render conditionally / with null Suspense fallback so the
// extra round-trip is invisible to the user.
const CookieBanner = lazy(() => import("./components/CookieBanner"));
const QuickPlayResumeBanner = lazy(() => import("./components/QuickPlayResumeBanner"));
const ImageCropModal = lazy(() => import("./components/ImageCropModal"));
import { renderPublicView } from "./views/PublicViews";
import { LazyWrapper} from "./components/SuspenseWrapper";

// Lazy-loaded views (code-split into separate chunks)
const PrivacySettingsView = lazy(() => import("./views/PrivacySettingsView"));
import { loadMammoth, loadSocketIO } from "./utils/lazyLoad";
import { createGuestUser } from "./utils/createGuestUser";
import { readQpResumeScore } from "./utils/qpResumeHint";
import {
  readIntendedClassCode,
  clearIntendedClassCode,
} from "./utils/oauthIntent";
import { celebrate } from "./utils/celebrate";
import { compressImageForUpload } from "./utils/compressImage";
// ImageCropModal moved to a React.lazy at the top of this file.
import { useTeacherGuidesSync } from "./hooks/useTeacherGuidesSync";
import { useVocaRouting } from "./hooks/useVocaRouting";
import { useApplyTeacherTheme } from "./hooks/useApplyTeacherTheme";
import { useAuthRestore } from "./hooks/useAuthRestore";
import { useDeepLinkConsumers } from "./hooks/useDeepLinkConsumers";
import { useAppMiscEffects } from "./hooks/useAppMiscEffects";
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
import {
  startQuickPlayFromDashboard,
  startAssignClassFlow,
  loadAssignmentIntoCreateForm,
  applySavedTask,
} from "./handlers/teacherDashboardActions";
import { getGameDebugger } from "./utils/gameDebug";
import {
  MAX_ATTEMPTS_PER_WORD, AUTO_SKIP_DELAY_MS, SHOW_ANSWER_DELAY_MS, WRONG_FEEDBACK_DELAY_MS,
  MAX_ASSIGNMENT_ROUNDS,
  STREAK_CELEBRATION_MILESTONES,
  ALL_GAME_MODES,
  type GameMode,
} from "./constants/game";
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
import { useQuickPlayRealtime, type QpRealtimeStatus } from "./hooks/useQuickPlayRealtime";
import { useTeacherNotifications } from "./hooks/useTeacherNotifications";
import { useLiveChallengeSocket } from "./hooks/useLiveChallengeSocket";
import { useLiveChallengeEvents } from "./hooks/useLiveChallengeEvents";
import { useQuickPlayEvents } from "./hooks/useQuickPlayEvents";
import { useFeedbackTracking } from "./hooks/useFeedbackTracking";
import { useGameModeSetup } from "./hooks/useGameModeSetup";
import { useDashboardPolling } from "./hooks/useDashboardPolling";
import { useAssignmentAutoPopulate } from "./hooks/useAssignmentAutoPopulate";
import { useSaveQueueResilience } from "./hooks/useSaveQueueResilience";
import { useBackButtonTrap } from "./hooks/useBackButtonTrap";
import { useViewGuards } from "./hooks/useViewGuards";
import { useGameRoundOptions } from "./hooks/useGameRoundOptions";
import { useStudentLogin } from "./hooks/useStudentLogin";
import { useOAuthFlow } from "./hooks/useOAuthFlow";
import { useClassSwitch } from "./hooks/useClassSwitch";
import { useConsent } from "./hooks/useConsent";
import { useOcrUpload } from "./hooks/useOcrUpload";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { useAwardBadge } from "./hooks/useAwardBadge";
import { requestCustomWordAudio } from "./utils/requestCustomWordAudio";
import { parseSearchTerms } from "./utils/parseSearchTerms";
import { resolveInitialView } from "./utils/resolveInitialView";
import { PUBLIC_PAGE_VIEW, type PublicPage } from "./utils/publicNavigation";
import { pickClassMinuteWords } from "./utils/classMinuteWords";
import { completeTeacherOnboarding, skipTeacherOnboarding } from "./handlers/teacherOnboarding";
import { saveClassEdit, renameClass, changeClassAvatar } from "./handlers/classEdits";
import { deleteAssignmentWithUndo, deleteAssignmentImmediate } from "./handlers/deleteAssignmentWithUndo";

// Match the flag used in QuickPlayStudentView + QuickPlayMonitor. When
// on, Quick Play runs entirely over the /quick-play socket namespace —
// no Supabase anon auth, no progress-table writes during a session.
const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === "true";

// ─── View constants for shouldPreserveView (O(1) lookup with Sets) ────────
// Defined at module level to avoid re-creating arrays on every auth restore.
const PUBLIC_VIEWS = new Set<View>([
  "public-landing", "public-terms", "public-privacy", "public-security", "public-free-resources", "public-interactive-worksheet", "public-status", "accessibility-statement"
]);
const TEACHER_VIEWS = new Set<View>([
  "worksheet", "classroom", "class-show", "teacher-approvals",
  "quick-play-teacher-monitor", "quick-play-setup", "create-assignment",
  "hot-seat",
  "voca-picker", "vocahebrew-dashboard",
  "vocahebrew-niqqud", "vocahebrew-shoresh", "vocahebrew-synonyms", "vocahebrew-listening",
]);

const STUDENT_VIEWS = new Set<View>([
  "student-dashboard", "game", "live-challenge",
  "shop", "global-leaderboard", "privacy-settings",
]);

/** Check if current view should be preserved during auth restore. */
const shouldPreserveView = (role: string, currentView: View): boolean => {
  if (PUBLIC_VIEWS.has(currentView)) return false;
  return (role === "teacher" || role === "admin")
    ? TEACHER_VIEWS.has(currentView)
    : STUDENT_VIEWS.has(currentView);
};

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase

// secureRandomInt moved to `src/utils.ts` for reuse.

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
  // Detect Quick Play session from URL synchronously so it takes priority over auth redirects
  const quickPlaySessionParam = new URLSearchParams(window.location.search).get('session');
  // Detect "share" param — set by the social-share buttons in
  // FloatingButtons so shared links always render the landing page even
  // for logged-in visitors (whose auth would otherwise redirect them to
  // their dashboard and make the preview useless).
  const fromShareLinkRef = useRef(new URLSearchParams(window.location.search).get('share') === '1');

  const [view, setView] = useState<View>(resolveInitialView);
  // Which Voca the teacher is currently working in.  null until they
  // pick (or are auto-picked into) one.  Persisted across same-tab
  // refreshes via sessionStorage so we don't pop the picker again.
  const [activeVoca, setActiveVoca] = useState<VocaId | null>(() => {
    try {
      const raw = sessionStorage.getItem(ACTIVE_VOCA_KEY);
      return raw === "english" || raw === "hebrew" ? raw : null;
    } catch { return null; }
  });
  useEffect(() => {
    try {
      if (activeVoca) sessionStorage.setItem(ACTIVE_VOCA_KEY, activeVoca);
      else sessionStorage.removeItem(ACTIVE_VOCA_KEY);
    } catch { /* sessionStorage may be blocked; non-fatal */ }
  }, [activeVoca]);

  // First-time-guide persistence (teacher-only) wired through a hook
  // so the optimistic-update + rollback dance lives next to the store.
  useTeacherGuidesSync(user, setUser);

  // Voca routing — auto-pick the teacher's only Voca, or send admins
  // with 2+ Vocas to the picker if they hit the dashboard without
  // having chosen one this session.  See useVocaRouting for details.
  useVocaRouting(user, activeVoca, view, setActiveVoca, setView);

  const previousViewRef = useRef<string>("public-landing");
  // Track current view for auth state changes — using a ref so restoreSession
  // can read the latest view even when called asynchronously from auth events.
  const currentViewRef = useRef<View>(view);
  // Captures the most recent user role so the SIGNED_OUT handler can route
  // students back to the student-login screen instead of the teacher-focused
  // public landing.  The auth listener effect runs once with empty deps, so
  // it can't read `user` state directly — needs a ref kept in sync below.
  const lastUserRoleRef = useRef<AppUser["role"] | null>(null);

  const goBack = () => {
    setView(previousViewRef.current as any);
  };

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

  // ─── Lazy-load vocabulary out of the initial bundle ────────────────
  // The vocabulary tuple file is ~376 kB raw / 139 kB gzipped — by far
  // the largest single asset.  Public visitors (landing, terms,
  // privacy, security, accessibility) never need it.  Gate the load
  // on the view: any non-public view triggers the dynamic import.
  // (DemoMode lazy-loads vocabulary itself via its own static import,
  // so we don't need a special demo gate here.)
  // See docs/perf-2026-04-28.md for rationale + measurements.
  const isPublicView =
    view === "public-landing" ||
    view === "public-terms" ||
    view === "public-privacy" ||
    view === "public-security" ||
    view === "public-free-resources" ||
    view === "public-interactive-worksheet" ||
    view === "public-status" ||
    view === "accessibility-statement";
  const vocab = useVocabularyLazy(!isPublicView);
  // Falsy-safe constants so existing code paths that reference these
  // names compile unchanged.  When vocab is null (still loading or
  // never triggered), these are empty arrays — every consumer is
  // either gated behind an authenticated view (which won't render
  // until vocab resolves) OR it's a fallback path that's safe to skip.
  const ALL_WORDS = vocab?.ALL_WORDS ?? [];
  const SET_1_WORDS = vocab?.SET_1_WORDS ?? [];
  const SET_2_WORDS = vocab?.SET_2_WORDS ?? [];
  const TOPIC_PACKS = vocab?.TOPIC_PACKS ?? [];
  // Track whether handleStudentLogin is in progress so onAuthStateChange
  // doesn't clobber loading/view mid-login (signInAnonymously fires the
  // listener before handleStudentLogin finishes its DB queries).
  const manualLoginInProgress = useRef(false);
  const restoreInProgress = useRef(false);
  const restoreRetried = useRef(false);
  const [, setLandingTab] = useState<"student" | "teacher">("student");
  const [studentLoginClassCode, setStudentLoginClassCode] = useState("");
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string, displayName: string, classCode: string, className: string, joinedAt: string }>>([]);
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<{ name: string; classCode: string; profileId?: string } | null>(null);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  // Edit-class modal state — null when closed, the class data when open.
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  // Roster modal — opened from a ClassCard's "Manage roster" action.
  // When non-null, ClassRosterModal renders for this class so the teacher
  // can pre-create PIN-login students (Path C).
  const [rosterModalClass, setRosterModalClass] = useState<ClassData | null>(null);
  const [createdClassName, setCreatedClassName] = useState<string>("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectStudentModal, setRejectStudentModal] = useState<{ id: string; displayName: string } | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openDropdownClassId, setOpenDropdownClassId] = useState<string | null>(null);
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
  // Keys of parts that were just unlocked — used to bounce-animate
  // them on the next render, then cleared after a short delay.
  const [celebrateStructureKeys, setCelebrateStructureKeys] = useState<string[]>([]);

  // Active boosters (xp_booster, weekend_warrior, streak_freeze,
  // lucky_charm, focus_mode).  Scoped per-user via uid; persists in
  // localStorage so boosters survive page refresh.
  const boosters = useBoosters(user?.uid);

  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // --- OAUTH STATE ---
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [oauthAuthUid, setOauthAuthUid] = useState<string | null>(null);
  const [showOAuthClassCode, setShowOAuthClassCode] = useState(false);
  // Sticky banner: when a student typed a class code that doesn't exist,
  // surface a persistent banner on the dashboard so they can't miss it
  // (toasts get dismissed/ignored). Funnel point for both the OAuth
  // path and the session-restore path.
  const [classNotFoundIntent, setClassNotFoundIntent] = useState<string | null>(null);

  // --- CLASS SWITCH STATE ---
  // Set when an already-approved student logs in with a class code that
  // differs from their current class_code. Shows a confirmation modal;
  // on confirm, student_profiles.class_code + users.class_code are updated
  // and the student lands on the new class's dashboard. See "Approach 1,
  // skip approval on switch" in the design discussion.
  const [pendingClassSwitch, setPendingClassSwitch] = useState<{
    fromCode: string;
    fromClassName: string | null;
    toCode: string;
    toClassName: string | null;
    supabaseUser: { id: string; email?: string | null };
  } | null>(null);

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

  // --- QUICK PLAY STATE ---
  // Only the setters are used — the values themselves are never read in
  // this component or any child that gets them passed down. The state
  // still exists so the teacher-monitor cleanup path can reset it to
  // null/[] on session end.
  const [, setQuickPlaySessionCode] = useState<string | null>(null);
  const [quickPlayInitialWords, setQuickPlaySelectedWords] = useState<Word[]>([]);
  // Saved-task templates also restore mode selection when reused.
  const [quickPlayInitialModes, setQuickPlayInitialModes] = useState<string[] | undefined>(undefined);
  const [quickPlaySearchQuery] = useState("");
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<{id: string, sessionCode: string, wordIds: number[], words: Word[], allowedModes?: string[], aiSentences?: string[]} | null>(null);
  // Class Show — teacher-led projector mode.  When the teacher
  // launches from an assignment card, this stores the assignment's
  // word list so the setup panel pre-selects "From assignment".
  const [classShowAssignment, setClassShowAssignment] = useState<{ title: string; wordIds: number[]; customWords?: Word[] } | null>(null);
  // Worksheet — optional pre-fill from an assignment.
  const [worksheetAssignment, setWorksheetAssignment] = useState<{ title: string; wordIds: number[]; customWords?: Word[]; className?: string | null } | null>(null);
  // Tracks the entry point for activity-type tab views (class-show,
  // worksheet, hot-seat, vocabagrut).  When set to 'create-assignment',
  // these views' back/exit handlers return to the New Activity wizard
  // (so the teacher lands back on the tab strip) instead of jumping
  // straight to the teacher dashboard.  Cleared when the wizard itself
  // is exited.
  const [activityNavOrigin, setActivityNavOrigin] = useState<"create-assignment" | null>(null);
  // Cumulative score across all modes a guest has played in the
  // current Quick Play session.  The per-mode `score` state (in
  // useGameState) resets to 0 on every new mode, so emitting it
  // directly to the QP socket caused the leaderboard to regress
  // (server rejected with [QP SCORE regress] prev=15 new=10).
  // This ref accumulates each mode's finalScore so the QP socket
  // sees a monotonically-increasing total.
  // Cumulative QP score across all modes in a session.  Initialised
  // from the resume hint so a kid who closed the tab and rescanned
  // doesn't reset their server-side score (the server's monotonic
  // score gate would otherwise reject every later updateScore as a
  // regression — silent points loss for the kid).  Hint is 90-min
  // TTL'd; falls through to 0 for fresh joins.
  const qpCumulativeScoreRef = useRef(readQpResumeScore());
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'];
  // QP avatar — random by default, but if the student is resuming a
  // recent session via QuickPlayResumeBanner we honour their previous
  // avatar so identity stays stable across the close→reopen.
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(() => {
    try {
      const raw = localStorage.getItem('vocaband_qp_guest');
      if (raw) {
        const parsed = JSON.parse(raw) as { avatar?: string; joinedAt?: number };
        if (parsed?.avatar && typeof parsed.joinedAt === 'number'
            && Date.now() - parsed.joinedAt < 90 * 60 * 1000) {
          return parsed.avatar;
        }
      }
    } catch { /* fall through to random */ }
    return QUICK_PLAY_AVATARS[secureRandomInt(QUICK_PLAY_AVATARS.length)];
  });
  const [quickPlayJoinedStudents, setQuickPlayJoinedStudents] = useState<{name: string, score: number, avatar: string, lastSeen: string, mode: string, studentUid: string}[]>([]);
  const [, setQuickPlayCustomWords] = useState<Map<string, {hebrew: string, arabic: string}>>(new Map());
  const [, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [, setQuickPlayTranslating] = useState<Set<string>>(new Set());
  const [quickPlayKicked, setQuickPlayKicked] = useState(false);
  const [quickPlaySessionEnded, setQuickPlaySessionEnded] = useState(false);
  // Tracks whether the teacher monitor's Realtime channel is actually
  // receiving events.  'live' = subscribed, 'connecting' = transient,
  // 'polling' = subscription failed or was closed (polling-only mode).
  // Shown as a discrete status dot on the monitor header so the teacher
  // can tell instant updates from polling-delayed ones.
  const [quickPlayRealtimeStatus, setQuickPlayRealtimeStatus] =
    useState<QpRealtimeStatus>('connecting');
  const [quickPlayCompletedModes, setQuickPlayCompletedModes] = useState<Set<string>>(new Set());

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

  // --- TOAST NOTIFICATIONS STATE ---
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info', action?: { label: string, onClick: () => void }}[]>([]);
  // Stable across renders so consumers can put `showToast` in
  // useEffect / useCallback dep arrays without causing churn.  A
  // 2026-05-04 audit found GradebookView, RewardInboxCard, and
  // PendingApprovalScreen all used `showToast` as a dep and got
  // re-fired on every App render — that was a major contributor
  // to the request-storm incident.  setToasts (from useState) is
  // already stable, so [] is the correct dep list here.
  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    options?: { action?: { label: string; onClick: () => void } },
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, action: options?.action }]);
    // Errors and toasts with an action stay longer so the user has time
    // to read + click before auto-dismissal.
    const duration = (type === 'error' || options?.action) ? 8000 : 3000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // Paywall toast — used when an AI / OCR endpoint returns 403
  // ai_requires_pro.  Adds an "Upgrade" button that opens the same
  // mailto the dashboard's trial-expired banner uses.  Until Stripe
  // payment links are wired (see docs/PRICING-MODEL.md Status), email
  // is the upgrade channel.
  const showPaywallToast = useCallback((message: string) => {
    showToast(message, 'error', {
      action: {
        label: 'Upgrade',
        onClick: () => {
          window.location.href = 'mailto:contact@vocaband.com?subject=Upgrade%20to%20Pro';
        },
      },
    });
  }, [showToast]);

  // --- CONFIRMATION DIALOG STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean,
    message: string,
    onConfirm: () => void
  }>({ show: false, message: '', onConfirm: () => {} });

  // --- ASSIGNMENT WELCOME POPUP STATE ---
  const [showAssignmentWelcome, setShowAssignmentWelcome] = useState(() => {
    try { return !localStorage.getItem('vocaband_welcome_seen'); } catch { return true; }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('vocaband_onboarding_done'); } catch { return true; }
  });
  const [showStudentOnboarding, setShowStudentOnboarding] = useState(() => {
    try { return !localStorage.getItem('vocaband_student_onboarding_done'); } catch { return true; }
  });
  // --- PERFORMANCE OPTIMIZATIONS ---
  // Use Set for O(1) lookup instead of array.includes() which is O(n)
  const selectedWordsSet = useMemo(() => new Set(selectedWords), [selectedWords]);

  // --- QUICK PLAY SEARCH PARSING ---
  // Memoize expensive parsing and search operations for Quick Play word search
  const searchTerms = useMemo(() => {
    return parseSearchTerms(quickPlaySearchQuery);
  }, [quickPlaySearchQuery]);

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
  // Captures the `?assignment=<id>` URL param at boot.  When the
  // student lands on their dashboard with this set, we look up the
  // matching assignment in `studentAssignments` and drop them straight
  // into the mode picker for it — teachers share links from the
  // assignment row so the student should bypass the dashboard step.
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get("assignment");
    } catch {
      return null;
    }
  });
  // Captures `?play=<mode>` at boot.  Set by teacher-shared share
  // links (Class Minute today; extendable later if we surface more
  // dashboard-launched entry points).  Consumed once the student is
  // on their dashboard then stripped from the URL so a back-nav
  // doesn't re-trigger the auto-launch.
  const [pendingPlayMode, setPendingPlayMode] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get("play");
    } catch {
      return null;
    }
  });

  const { speak: speakWordRaw, preloadMany, playWrong, playMotivational, stopAll: stopAllAudio } = useAudio();
  const speakWord = speakWordRaw;

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);

  // Quick Play Supabase Realtime plumbing — teacher monitor progress
  // stream + legacy v1 session-end / kick watchers.  v2 sessions use
  // useQuickPlaySocket for kick/end instead; the hook no-ops that path
  // when quickPlayV2 is true.
  useQuickPlayRealtime({
    view,
    user,
    quickPlayActiveSession,
    quickPlayV2: QUICKPLAY_V2,
    setQuickPlayJoinedStudents,
    setQuickPlayRealtimeStatus,
    setQuickPlaySessionEnded,
    setQuickPlayKicked,
    setActiveAssignment,
  });

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
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">(() => {
    try { return (localStorage.getItem('vocaband_target_lang') as "hebrew" | "arabic") || "hebrew"; } catch { return "hebrew"; }
  });
  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => {
    try { return !!localStorage.getItem('vocaband_target_lang'); } catch { return false; }
  });
  const [isFinished, setIsFinished] = useState(false);
  const [wordAttempts, setWordAttempts] = useState<Record<number, number>>({});

  // --- NEW MODES STATE ---
  // tfOption is derived (useMemo below) so it's populated SYNCHRONOUSLY on
  // the first render of True/False. Previously it was useState+useEffect,
  // which left tfOption null for one render cycle after entering the mode
  // — the first tap was swallowed (handleTFAnswer guards against null) and
  // the buttons felt dead until the student backed out and re-entered.
  const [isFlipped, setIsFlipped] = useState(false);

  // --- MATCHING MODE STATE ---
  const [matchingPairs, setMatchingPairs] = useState<{id: number, text: string, type: 'english' | 'arabic'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: number, type: 'english' | 'arabic'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [isMatchingProcessing, setIsMatchingProcessing] = useState(false);

  // --- LETTER SOUNDS MODE STATE ---
  const [revealedLetters, setRevealedLetters] = useState(0);
  // --- SENTENCE BUILDER MODE STATE ---
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);
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

  // Teacher-side handlers extracted into a single hook so the file
  // doesn't have to maintain duplicate copies of class / assignment /
  // word-import logic. The hook owns the implementations; this file
  // just plumbs the state in and destructures the methods out.
  // handleOcrUpload stays inline below — its hook version is a much
  // simpler implementation and we'd lose the OCR status UI, custom-
  // word audio generation, and vocabulary cross-check by swapping it.
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

  // --- SAVE QUEUE (BATCH DB WRITES FOR BETTER PERFORMANCE) ---
  // queueSaveOperation pushes a closure; the hook batches up to 10 of
  // them per flush after a 300ms debounce. clearQueue is called from
  // cleanupSessionData on logout to drop in-flight writes.
  const {
    queueSaveOperation,
    clearQueue: clearSaveQueue,
    processSaveQueue,
    hasPending: saveQueueHasPending,
  } = useSaveQueue();

  // Cleanup function to clear all pending operations and prevent DB calls after logout/session end
  const cleanupSessionData = () => {
    clearSaveQueue();
    // Clear feedback timeout (lives outside the save queue's domain).
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = undefined;
    }
  };


  // Refs for effects that need the "current" user without re-registering.
  // (isLiveChallengeRef moved into useLiveChallengeSocket.)
  const userRef = useRef(user);

  // Timeout ref for cleanup (prevents memory leaks on unmount)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isProcessingRef = useRef<boolean>(false); // Guard against rapid clicks during feedback
  const lastScoreEmitRef = useRef<number>(0); // Track last Socket.IO score emit time to prevent spam

  // Misc side-effects bundled into one hook — see useAppMiscEffects
  // for the list (userRef sync, Sentry user pipe, feedback timeout
  // cleanup, legacy view redirect, round-finish audio, welcome popup
  // gate, view-change dispatch, lastUserRoleRef sync, queue-depth
  // toasts, QP audio preload, isFlipped reset).

  // Quick Play v2 socket — only active when the flag is on AND a
  // session is live. When a student's score changes during gameplay
  // we forward it here so the teacher's monitor sees live movement.
  const quickPlaySocket = useQuickPlaySocket({
    sessionCode: quickPlayActiveSession?.sessionCode ?? null,
    enabled: QUICKPLAY_V2,
  });

  // Translate v2-native KICKED / SESSION_ENDED events into the existing
  // quickPlayKicked / quickPlaySessionEnded UI state. Hook guards on
  // isGuest so the teacher who pressed "End session" lands cleanly
  // back on their own dashboard via the monitor view, instead of the
  // student QuickPlaySessionEndScreen (whose "Go home" wipes the user).
  useQuickPlayEvents({
    enabled: QUICKPLAY_V2,
    isGuest: user?.isGuest ?? false,
    onKicked: quickPlaySocket.onKicked,
    onSessionEnded: quickPlaySocket.onSessionEnded,
    handleGuestKicked: () => {
      setQuickPlayKicked(true);
      setActiveAssignment(null);
    },
    handleGuestSessionEnded: () => {
      setQuickPlaySessionEnded(true);
      setActiveAssignment(null);
    },
  });

  // Throttled Socket.IO score emit. Routes to the right transport
  // depending on context:
  //   * classroom live challenge — existing `/` namespace, needs classCode
  //   * Quick Play v2 guest game — new `/quick-play` namespace, no auth
  const emitScoreUpdate = (newScore: number) => {
    const now = Date.now();
    const shouldEmit = now - lastScoreEmitRef.current > 2000 || isFinished;
    if (!shouldEmit) return;
    lastScoreEmitRef.current = now;

    if (QUICKPLAY_V2 && quickPlayActiveSession) {
      // Add the per-mode score on top of the cumulative running total
      // for previously-completed modes in this session.  Without this,
      // each new mode would emit a small per-mode value and the server
      // would reject it as a regress (new < previous max).
      // The previous gate also required `user.isGuest`, which silently
      // dropped scores for any OAuth student who somehow ended up in a
      // QP session — they appeared on the teacher's podium but their
      // score never moved.  Today's QR-scan flow turns OAuth students
      // into guests at join time, so this branch effectively covers
      // them too; dropping the isGuest guard removes the failsafe that
      // had no business being there.
      const cumulative = qpCumulativeScoreRef.current + newScore;
      setTimeout(() => quickPlaySocket.updateScore(cumulative), 0);
      // Also refresh the localStorage resume hint with the latest score
      // and a fresh joinedAt timestamp.  This (a) lets the
      // QuickPlayResumeBanner show the actual score the student has
      // earned if they accidentally close the tab, and (b) extends the
      // 90-minute TTL window for as long as the student is actively
      // scoring — kids who walk away for 90 min see no banner; kids
      // who scored 30 sec ago see "850 points".
      try {
        const raw = localStorage.getItem('vocaband_qp_guest');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.lastScore = cumulative;
          parsed.joinedAt = Date.now();
          localStorage.setItem('vocaband_qp_guest', JSON.stringify(parsed));
        }
      } catch { /* localStorage blocked / private mode — silent */ }
      return;
    }

    if (!socket || !user?.classCode) return;
    setTimeout(() => {
      socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
    }, 0);
  };


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
  // Student-account login flow — the approved-student finishing path
  // (processStudentProfile with its SECURITY check against impersonation)
  // and the profile-id login wrapper used by PendingApprovalScreen and
  // the OAuth approved-student branch.
  const {
    handleLoginAsStudent,
    processStudentProfile,
    renameStudentDisplayName,
  } = useStudentLogin({
    user, setUser, setError, setLoading, setView,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    showPendingApproval,
    loadAssignmentsForClass,
  });

  // Google-OAuth post-callback handlers — extracted to a hook so the
  // class-switch detection logic and the upsert-then-hydrate sequence
  // aren't crowding App.tsx. Same behaviour as before.
  const {
    handleOAuthTeacherDetected,
    handleOAuthStudentDetected,
    handleOAuthNewUser,
  } = useOAuthFlow({
    setUser, setError, setLoading, setView, setIsOAuthCallback,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    setClassNotFoundIntent, setPendingClassSwitch,
    setOauthEmail, setOauthAuthUid, setShowOAuthClassCode,
    showPendingApproval, readIntendedClassCode, clearIntendedClassCode,
  });

  // Class-switch modal confirm/cancel handlers — extracted to a hook
  // since both branches hydrate the dashboard after the choice.
  const { handleConfirmClassSwitch, handleCancelClassSwitch } = useClassSwitch({
    pendingClassSwitch, setPendingClassSwitch,
    setUser, setView, setLoading,
    setStudentAssignments, setStudentProgress,
    showToast,
  });

  // Privacy-policy consent flow — checkConsent gates the banner,
  // recordConsent persists the acceptance to both localStorage (fast
  // path) and consent_log (audit trail).
  const { checkConsent, recordConsent } = useConsent({
    user, setNeedsConsent, setConsentChecked,
  });

  // OCR pipeline — photo → /api/ocr → translate → custom-word tab
  // with dictionary cross-check. Preserves App.tsx's progress UI,
  // Neural2 audio generation, and hallucination-guard behaviour.
  const { handleOcrUpload, processOcrFile } = useOcrUpload({
    classes, setSelectedClass,
    setCustomWords, setSelectedWords,
    // App narrows these with union types; hook takes the wider string.
    // Same bivariance cast we used for useTeacherActions.
    setSelectedLevel: setSelectedLevel as (v: string) => void,
    setView: setView as (v: string) => void,
    setIsOcrProcessing, setOcrProgress, setOcrStatus, setOcrPendingFile,
    showToast, showPaywallToast, translateWordsBatch,
  });

  // Adapter for the picker-wiring `onOcrUpload` contract.  The picker
  // expects `(file: File) => Promise<{ words, success? }>` but the
  // existing OCR pipeline is preview-modal based — extracted words
  // flow through the modal into setCustomWords + setSelectedWords,
  // not through this function's return value.  We honour the
  // contract by returning an empty result; the picker doesn't read
  // the words back from here in any path I could find.
  const onPickerOcrUpload = useCallback(async (file: File) => {
    await processOcrFile(file);
    return { words: [], success: true };
  }, [processOcrFile]);

  // --- AUTH LOGIC ---
  // restoreSession + onAuthStateChange wiring + safety timeout live in
  // useAuthRestore.  Closure deps that came from App's render scope
  // (setters, refs, sibling-hook helpers) are passed in explicitly.
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
    setQuickPlayKicked, setQuickPlaySessionEnded, setQuickPlayJoinedStudents,
    setClassNotFoundIntent, setPendingClassSwitch, setPendingApprovalInfo,
    setOauthAuthUid, setOauthEmail, setShowOAuthClassCode,
    setCurrentIndex, setScore, setMistakes, setIsFinished, setFeedback,
    setSpellingInput, setMatchedIds, setSelectedMatch, setIsFlipped,
    setRevealedLetters, setSentenceIndex, setAvailableWords,
    setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    setWordAttemptBatch, setShowModeSelection,
  });

  // Mobile back-button + History API trap.  Keeps logged-in users
  // pinned at their dashboard (never escapes to login / external
  // URL), routes back presses between real in-app views, and
  // surfaces the exit-confirm modal at the dashboard floor.
  // Returns a helper to start the actual exit flow from the modal.
  const { beginExitFlow } = useBackButtonTrap({
    view,
    setView,
    user,
    showExitConfirmModal,
    setShowExitConfirmModal,
    restoreInProgressRef: restoreInProgress,
  });




  // ─── GLOBAL TEACHER DASHBOARD THEME ────────────────────────────────────
  // Apply teacher's selected theme globally across all pages. This runs
  // at the App level (not per-view) so the theme persists when navigating
  // between teacher pages without flashing or clearing.
  // - For teachers: applies their dashboard theme CSS variables
  // - For students/public: clears any teacher theme variables
  // Apply the teacher's dashboard theme to the document root.  Extract
  // theme ID separately to avoid re-running the effect on unrelated
  // user updates.  See useApplyTeacherTheme for the palette + dark-mode
  // dataset writes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherThemeId = hasTeacherAccess(user) ? (user as any).teacherDashboardTheme : null;
  useApplyTeacherTheme(teacherThemeId);


  // View-state guards: redirect the user out of orphaned / broken
  // views (landing with auth resolved, game without assignment,
  // quick-play-student without an active session).
  useViewGuards({
    view, setView, user, loading,
    activeAssignment, quickPlayActiveSession,
  });



  // Warn before leaving while a score save is in flight.  Extracted
  // into a hook so the "don't let the user leave while unsaved state
  // is pending" pattern is reusable.  Previously there was also a
  // no-op beforeunload handler whose only purpose was documenting
  // "we intentionally don't clear localStorage here" — removed since
  // the comment was the handler.
  useBeforeUnloadWhileSaving(isSaving);



  // Teacher-side toasts: diff `pendingStudents` and `allScores` (both
  // refreshed by the polling effects) and fire a single toast when
  // something new lands.  Seeded-ref pattern inside the hook prevents
  // "everyone who existed before you logged in just joined" spam.
  useTeacherNotifications({ user, view, pendingStudents, allScores, showToast });

  // Save-queue resilience: periodic flush, retry of progress
  // writes left over from prior offline sessions, and the Quick
  // Play queue flusher install (online/visibility/30s poll).
  useSaveQueueResilience({
    user, isSaving, saveQueueHasPending, processSaveQueue,
  });

  // Surface save-queue transitions as toasts so the offline write
  // flow (saveQueue.ts) feels visible to teachers/students:
  //   * "Saved locally — will sync when online" when a write was
  //     enqueued AND the browser believes we're offline. We don't
  //     fire on every queue growth because a transient depth bump
  //     while online usually resolves within a few hundred ms
  //     and would just be noise.
  //   * "All progress synced" when the queue drains from non-empty
  //     to empty — confirmation that the backlog cleared.
  //
  // Companion to the silent retry logic the queue already runs and
  // the OfflineIndicator pill mounted below.  See R2 in
  // docs/SCHOOL-PERFORMANCE-PLAN.md for context.
  const queueDepthRef = useRef<number>(0);

  // Background auto-refresh on dashboards: student assignments (30 s),
  // teacher pending-student approvals (10 s), teacher class scores
  // (20 s on Classroom / Analytics / Gradebook).  All three cheap
  // indexed polls + visibility refetches — Supabase Realtime has
  // proven unreliable for these lists in practice.
  useDashboardPolling({
    user, view, classes, allScores,
    pendingStudentsCount: pendingStudents.length,
    setStudentAssignments,
    loadPendingStudents,
    fetchScores,
  });

  // Class Minute entry point — used by both the dashboard widget tap
  // and the teacher-shared ?play=class-minute deep-link.  Pulls SRS-
  // due words first, falls back to current assignments, then
  // SET_2_WORDS as last resort.
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
  // See useDeepLinkConsumers for gating + URL-strip semantics.
  useDeepLinkConsumers({
    user, view,
    pendingAssignmentId, pendingPlayMode,
    studentAssignments, allWordsCount: ALL_WORDS.length, pendingClassSwitch,
    startClassMinute,
    setActiveAssignment, setAssignmentWords, setShowModeSelection, setView,
    setPendingAssignmentId, setPendingPlayMode,
  });


  // --- SMART PASTE FUNCTIONS ---

  // Quick-play preview handlers (handleQuickPlayPreviewConfirm +
  // handleQuickPlayPreviewCancel) previously lived here but were never
  // wired to any UI. Removed along with their backing state
  // (showQuickPlayPreview, quickPlayPreviewAnalysis) — ~65 lines of
  // dead code TypeScript had been flagging with TS6133.
  // Idempotent badge grant — used by the save-score milestone checks.
  // Hook encapsulates the includes-guard + celebrate + DB upsert.
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


  // Full guest exit cleanup. Called whenever a Quick Play student
  // explicitly leaves the game (Exit button on mode picker, header
  // Back button, finish-screen "Exit Quick Play", session-end overlay).
  //
  // Progress rows are intentionally left in place so the student stays
  // visible on the teacher's podium after leaving — teachers need to see
  // who actually played. Row removal happens in two places instead:
  //   (a) teacher kick — QuickPlayMonitor.removeStudent
  //   (b) re-join with same name — QuickPlayStudentView join-time delete
  // This function only signs out the anon auth session + clears the
  // guest localStorage entry so a fresh re-entry from the same device
  // starts cleanly.
  const cleanupQuickPlayGuest = async () => {
    if (!user?.isGuest || !quickPlayActiveSession) return;
    try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
    setQuickPlayCompletedModes(new Set());
    try { await supabase.auth.signOut(); } catch {}
  };

  // Game-finish handlers (saveScore + handleExitGame), extracted into a
  // dedicated hook. saveScore in particular is large — anti-farm cap,
  // booster math, streak handling, badge checks, optimistic save with
  // retry queue — and was crowding App.tsx. Behaviour unchanged.
  const { saveScore, handleExitGame } = useGameFinish({
    user,
    score, gameMode, gameWords, mistakes, wordAttemptBatch, activeAssignment,
    quickPlayActiveSession,
    quickPlayV2: QUICKPLAY_V2,
    // On mode-finish: accumulate this mode's finalScore into the
    // session-wide cumulative ref BEFORE emitting, so the QP socket
    // sees a monotonically-increasing total across modes.  Without
    // this, mode 2 would emit its own (smaller) per-mode value and
    // the server would reject as a regress.
    quickPlaySocketUpdateScore: (finalScore: number) => {
      qpCumulativeScoreRef.current += Math.max(0, finalScore);
      quickPlaySocket.updateScore(qpCumulativeScoreRef.current);
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
  const cookieBannerOverlay = (
    <>
      {showCookieBanner && !user && (
        <Suspense fallback={null}>
          <CookieBanner onAccept={handleCookieAccept} onCustomize={handleCookieCustomize} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <QuickPlayResumeBanner suppress={qpResumeSuppress} />
      </Suspense>
      {/* Global amber pill when the browser reports the network is down.
          See OfflineIndicator + useOnlineStatus for the implementation,
          and R2 in docs/SCHOOL-PERFORMANCE-PLAN.md for the rationale. */}
      <OfflineIndicator />
    </>
  );

  // Image crop modal for OCR — shown when user picks a photo, before uploading
  const ocrCropModal = ocrPendingFile ? (
    <Suspense fallback={null}>
      <ImageCropModal
        file={ocrPendingFile.file}
        onConfirm={(croppedFile) => processOcrFile(croppedFile, ocrPendingFile.inputRef)}
        onCancel={() => {
          if (ocrPendingFile.inputRef?.target) ocrPendingFile.inputRef.target.value = '';
          setOcrPendingFile(null);
        }}
      />
    </Suspense>
  ) : null;

  if (loading && !quickPlaySessionParam) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <SvgSpinner className="animate-spin text-blue-700" size={48} />
    </div>;
  }


  // Configuration error banner — shown when Supabase env vars are missing
  const configErrorBanner = !isSupabaseConfigured ? (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white px-4 py-3 text-center text-sm font-bold z-[9999]">
      <SvgAlertTriangle size={16} className="inline mr-2" />
      Supabase is not configured. Copy <code className="bg-red-700 px-1 rounded">.env.example</code> to <code className="bg-red-700 px-1 rounded">.env</code> and add your credentials, then restart the server.
    </div>
  ) : null;

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
    onTeacherOAuth: () => {
      // Was: inline writeIntendedRole + signInWithOAuth.
      // Now: navigate to the new self-contained TeacherLoginView,
      // which renders BOTH options (Google + email-OTP code).  The
      // intended-role stamp + OAuth call moved into
      // TeacherLoginCard so all teacher-auth concerns live in one
      // place outside App.tsx.  See src/components/TeacherLoginCard.tsx.
      setView('teacher-login');
    },
    onStudentLogin: () => {
      // Push `/student` so the URL is bookmarkable / shareable —
      // matches the initial-view detection that maps `/student` →
      // student-account-login.
      try {
        if (window.location.pathname !== '/student') {
          window.history.pushState({}, '', '/student');
        }
      } catch { /* ignore — fall back to view-only nav */ }
      setView('student-account-login');
    },
    configErrorBanner,
    cookieBannerOverlay,
  });
  if (publicView) return publicView;

  // Student auth / Quick Play join screens (pending-approval, account
  // login, quick-play-student) bundled into renderStudentAuthRoute.
  const studentAuthRoute = renderStudentAuthRoute({
    view, user, setView, setUser, showToast, cookieBannerOverlay,
    pendingApprovalInfo, setPendingApprovalInfo, handleLoginAsStudent,
    error, setError,
    studentLoginClassCode, setStudentLoginClassCode,
    isOAuthCallback, setIsOAuthCallback,
    showOAuthClassCode, setShowOAuthClassCode,
    oauthEmail, setOauthEmail, oauthAuthUid, setOauthAuthUid,
    handleOAuthTeacherDetected, handleOAuthStudentDetected, handleOAuthNewUser,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    setAssignmentWords, setActiveAssignment, setCurrentIndex,
    setScore, setFeedback, setIsFinished, setMistakes, setShowModeSelection,
    cleanupSessionData,
  });
  if (studentAuthRoute) return studentAuthRoute;

  // ── Student Pending Approval Screen ────────────────────────────────────────

  // Shared "exit to public landing" path used by both the Kicked and
  // Quick Play exit screens (Kicked + SessionEnded) + shared
  // exit-to-landing cleanup — see views/QuickPlayExitScreens.
  const qpExit = renderQuickPlayExitScreens({
    quickPlayKicked, quickPlaySessionEnded, quickPlayActiveSession,
    user, quickPlayStudentName, score,
    cleanupSessionData,
    setQuickPlayKicked, setQuickPlaySessionEnded, setQuickPlayActiveSession,
    setActiveAssignment, setUser, setQuickPlayStudentName, setView,
  });
  if (qpExit) return qpExit;



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
    });
  }

  // --- PRIVACY SETTINGS VIEW (lazy-loaded from ./views/PrivacySettingsView) ---
  if (user && view === "privacy-settings") {
    return (
      <LazyWrapper loadingMessage="Loading privacy settings...">
        <PrivacySettingsView
          user={user}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          setView={setView}
          setUser={setUser}
          setConfirmDialog={setConfirmDialog}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  // --- SHOP VIEW (single-screen marketplace, lazy-loaded) ---
  // All Hebrew-side routing (vocahebrew-dashboard + the four mode
  // views) lives in renderHebrewRoute.  Returns JSX or null.
  const hebrewRoute = renderHebrewRoute({
    view, user, activeAssignment,
    quickPlayActiveSession, qpCumulativeScoreRef,
    quickPlaySocketUpdateScore: quickPlaySocket.updateScore,
    quickPlayV2Enabled: QUICKPLAY_V2,
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
      setActivityNavOrigin, setClassShowAssignment, setWorksheetAssignment,
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
    quickPlayActiveSession, quickPlayJoinedStudents, setQuickPlayJoinedStudents,
    setQuickPlayActiveSession, setQuickPlaySelectedWords, setQuickPlaySessionCode,
    setQuickPlayCustomWords, setQuickPlayAddingCustom, setQuickPlayTranslating,
    cleanupSessionData, showToast, quickPlayRealtimeStatus,
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
  return renderGameRoute({
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
  });
};
