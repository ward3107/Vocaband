import React, { useState, useEffect, useMemo, useRef, useCallback, lazy } from "react";
import type { View, ShopTab } from "./core/views";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import type { Word } from "./data/vocabulary";
import { useVocabularyLazy, getCachedVocabulary } from "./hooks/useVocabularyLazy";
import { generateSentencesForAssignment } from "./data/sentence-bank";
import {
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, USER_COLUMNS, CLASS_COLUMNS, ASSIGNMENT_COLUMNS, PROGRESS_COLUMNS, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { enqueueQuickPlaySave, enqueueAssignmentSave, installQuickPlayQueueFlusher } from "./core/saveQueue";
import { useAudio } from "./hooks/useAudio";
import { useRetention } from "./hooks/useRetention";
import { getTeacherDashboardTheme } from "./constants/teacherDashboardThemes";
import { applyThemePalette, clearThemePalette } from "./utils/applyThemePalette";
import { useSavedTasks, type SavedTask } from "./hooks/useSavedTasks";
import { useStructure } from "./hooks/useStructure";
import { useBoosters } from "./hooks/useBoosters";
import QuickPlayKickedScreen from "./components/QuickPlayKickedScreen";
import QuickPlaySessionEndScreen from "./components/QuickPlaySessionEndScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import { ConsentModal, ExitConfirmModal, ClassSwitchModal } from "./components/AppModals";
import { ClassNotFoundBanner } from "./components/ClassNotFoundBanner";
import { PRIVACY_POLICY_VERSION} from "./config/privacy-config";
import { shuffle, chunkArray, addUnique, removeKey, secureRandomInt } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
import { isAnswerCorrect } from './utils/answerMatch';
// SetupWizard is now lazy-loaded via QuickPlaySetupView
// CreateAssignmentWizard is now lazy-loaded via CreateAssignmentView
import CookieBanner, { CookiePreferences } from "./components/CookieBanner";
import PwaInstallBanner from "./components/PwaInstallBanner";
import QuickPlayResumeBanner from "./components/QuickPlayResumeBanner";
import { renderPublicView } from "./views/PublicViews";
import { LazyWrapper} from "./components/SuspenseWrapper";

// Lazy-loaded views (code-split into separate chunks)
const ShopView = lazy(() => import("./views/ShopView"));
const PrivacySettingsView = lazy(() => import("./views/PrivacySettingsView"));
const GlobalLeaderboardView = lazy(() => import("./views/GlobalLeaderboardView"));
const TeacherApprovalsView = lazy(() => import("./views/TeacherApprovalsView"));
const CreateAssignmentView = lazy(() => import("./views/CreateAssignmentView"));
// AnalyticsView + GradebookView are no longer routed directly here —
// they're now lazy-loaded inside ClassroomView and rendered as tabs.
const ClassroomView = lazy(() => import("./views/ClassroomView"));
const StudentAccountLoginView = lazy(() => import("./views/StudentAccountLoginView"));
const QuickPlaySetupView = lazy(() => import("./views/QuickPlaySetupView"));
const QuickPlayTeacherMonitorView = lazy(() => import("./views/QuickPlayTeacherMonitorView"));
const ClassShowView = lazy(() => import("./views/ClassShowView"));
const WorksheetView = lazy(() => import("./views/WorksheetView"));
const QuickPlayStudentView = lazy(() => import("./views/QuickPlayStudentView"));
const LiveChallengeClassSelectView = lazy(() => import("./views/LiveChallengeClassSelectView"));
const LiveChallengeView = lazy(() => import("./views/LiveChallengeView"));
const GameModeIntroView = lazy(() => import("./views/GameModeIntroView"));
const GameModeSelectionView = lazy(() => import("./views/GameModeSelectionView"));
const GameFinishedView = lazy(() => import("./views/GameFinishedView"));
const GameActiveView = lazy(() => import("./views/GameActiveView"));
const StudentDashboardView = lazy(() => import("./views/StudentDashboardView"));
const TeacherDashboardView = lazy(() => import("./views/TeacherDashboardView"));
import { loadMammoth, loadSocketIO } from "./utils/lazyLoad";
import { createGuestUser } from "./utils/createGuestUser";
import { readQpResumeScore } from "./utils/qpResumeHint";
import {
  readIntendedClassCode,
  clearIntendedClassCode,
  readIntendedRole,
  clearIntendedRole,
  writeIntendedRole,
} from "./utils/oauthIntent";
import { celebrate } from "./utils/celebrate";
import { compressImageForUpload } from "./utils/compressImage";
import ImageCropModal from "./components/ImageCropModal";
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
import { generateAndStoreQuickPlayAiSentences } from "./utils/generateAndStoreQuickPlayAiSentences";

// Match the flag used in QuickPlayStudentView + QuickPlayMonitor. When
// on, Quick Play runs entirely over the /quick-play socket namespace —
// no Supabase anon auth, no progress-table writes during a session.
const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === "true";

// ─── View constants for shouldPreserveView (O(1) lookup with Sets) ────────
// Defined at module level to avoid re-creating arrays on every auth restore.
const PUBLIC_VIEWS = new Set<View>([
  "public-landing", "public-terms", "public-privacy", "public-security", "accessibility-statement"
]);
const TEACHER_VIEWS = new Set<View>([
  "worksheet", "classroom", "class-show", "teacher-approvals",
  "quick-play-teacher-monitor", "quick-play-setup", "create-assignment"
]);
const STUDENT_VIEWS = new Set<View>([
  "student-dashboard", "game-mode-intro", "game-mode-selection",
  "game-active", "game-finished", "live-challenge"
]);

/** Check if current view should be preserved during auth restore. */
const shouldPreserveView = (role: string, currentView: View): boolean => {
  if (PUBLIC_VIEWS.has(currentView)) return false;
  return role === "teacher"
    ? TEACHER_VIEWS.has(currentView)
    : STUDENT_VIEWS.has(currentView);
};

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase

// secureRandomInt moved to `src/utils.ts` for reuse.

export default function App() {
  // Initialize game debugger
  const gameDebug = getGameDebugger();

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

  const [view, setView] = useState<View>(() => {
    if (quickPlaySessionParam) return "quick-play-student";
    if (window.location.pathname === "/accessibility-statement") return "accessibility-statement";
    // Classroom-poster QR code / teacher-shared invite link.  When the
    // URL carries a `?class=XXX` parameter and there's no already-active
    // session, skip the landing page and drop the visitor straight on
    // the student-login screen so they can tap their name.  Without
    // this, QR-scanners land on the generic landing page, see no
    // obvious "enter my classroom" CTA, and give up.  Auth restore
    // still runs afterwards — a logged-in user's session override
    // this initial view (they'll go to their dashboard, and if their
    // classCode differs, the class-switch modal handles the rest).
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('class')) return "student-account-login";
    } catch { /* URLSearchParams unavailable — fall through */ }
    return "public-landing";
  });
  const previousViewRef = useRef<string>("public-landing");
  // Track current view for auth state changes — using a ref so restoreSession
  // can read the latest view even when called asynchronously from auth events.
  const currentViewRef = useRef<View>(view);

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

  const handlePublicNavigate = (page: "home" | "terms" | "privacy" | "accessibility" | "security") => {
    const viewMap = {
      home: "public-landing",
      terms: "public-terms",
      privacy: "public-privacy",
      accessibility: "accessibility-statement",
      security: "public-security",
    } as const;
    setView(viewMap[page]);
  };
  const [shopTab, setShopTab] = useState<ShopTab>("hub");
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
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    // Errors stay longer so users can read them on mobile
    const duration = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

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
  const parseSearchTerms = useCallback((query: string): string[] => {
    if (!query.trim()) return [];

    const terms: string[] = [];
    let remainingText = query;

    // Extract quote-wrapped phrases first (e.g., "ice cream", 'washing machine')
    const quoteRegex = /(["'])(?:(?=(\\1?))\2.)*?\1/g;
    const quotes: string[] = [];
    let match;
    while ((match = quoteRegex.exec(query)) !== null) {
      quotes.push(match[0].replace(/['"]/g, '').trim().toLowerCase());
    }

    // Remove quoted phrases from remaining text
    remainingText = query.replace(/(["'])(?:(?=(\\1?))\2.)*?\1/g, '');

    // Split by comma or newline ONLY - spaces are part of the word
    const splitTerms = remainingText.split(/[,\n]+/)
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);

    // Combine: quoted phrases + split terms
    terms.push(...quotes, ...splitTerms);

    return terms;
  }, []);

  const searchTerms = useMemo(() => {
    return parseSearchTerms(quickPlaySearchQuery);
  }, [quickPlaySearchQuery, parseSearchTerms]);

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

  // AI Vocabulary Generator — calls /api/ai-generate-words endpoint
  const handleAiGenerateWords = async (params: {
    topic: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    examplesToAnchor?: string;
    skipCurriculumDuplicates: boolean;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      showToast?.('Authentication required', 'error');
      throw new Error('No auth token');
    }

    const response = await fetch('/api/ai-generate-words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI generation failed');
    }

    const data = await response.json();

    // Mark curriculum words by checking against ALL_WORDS
    const curriculumWords = new Map(
      ALL_WORDS.map(w => [w.english.toLowerCase(), w])
    );

    return data.words.map((w: {
      english: string;
      hebrew: string;
      arabic: string;
      example?: string;
    }) => {
      const curriculumMatch = curriculumWords.get(w.english.toLowerCase());
      if (curriculumMatch) {
        return {
          ...w,
          isFromCurriculum: true,
          curriculumId: curriculumMatch.id,
        };
      }
      return {
        ...w,
        isFromCurriculum: false,
      };
    });
  };

  // AI Lesson Generator — calls /api/ai-generate-lesson endpoint
  const handleGenerateLesson = async (params: {
    words: Array<{ english: string; hebrew: string; arabic: string }>;
    config: {
      textDifficulty: string;
      textType: string;
      wordCount: number;
      questionTypes: {
        yesNo: number;
        wh: number;
        literal: number;
        inferential: number;
        fillBlank: number;
        trueFalse: number;
        matching: number;
        multipleChoice: number;
        sentenceComplete: number;
      };
      includeAnswers: boolean;
    };
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      showToast?.('Authentication required', 'error');
      throw new Error('No auth token');
    }

    const response = await fetch('/api/ai-generate-lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI lesson generation failed');
    }

    return await response.json();
  };

  // --- STUDENT DATA STATE ---
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);

  const { speak: speakWordRaw, preloadMany, playWrong, playMotivational } = useAudio();
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
    user, classes, setClasses,
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

  useEffect(() => { userRef.current = user; }, [user]);

  // Cleanup feedback timeout on unmount. Save-queue unmount-flush is
  // owned by useSaveQueue itself.
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Quick Play v2 socket — only active when the flag is on AND a
  // session is live. When a student's score changes during gameplay
  // we forward it here so the teacher's monitor sees live movement.
  const quickPlaySocket = useQuickPlaySocket({
    sessionCode: quickPlayActiveSession?.sessionCode ?? null,
    enabled: QUICKPLAY_V2,
  });

  // Translate v2-native KICKED / SESSION_ENDED events into the existing
  // quickPlayKicked / quickPlaySessionEnded UI state. Keeps the screens
  // that render those states (QuickPlayKickedScreen, QuickPlaySessionEndScreen)
  // untouched. Dependencies are the hook's on-* methods specifically
  // (they're useCallback-stable) — depending on the whole socket
  // object would churn the effect every render.
  const qpOnKicked = quickPlaySocket.onKicked;
  const qpOnSessionEnded = quickPlaySocket.onSessionEnded;
  const userIsGuestRef = useRef(user?.isGuest ?? false);
  useEffect(() => { userIsGuestRef.current = user?.isGuest ?? false; }, [user?.isGuest]);
  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    // KICKED + SESSION_ENDED are broadcast to EVERY socket in the room
    // — including the teacher who triggered them.  Only flip the
    // student-facing screens when the local viewer is actually a guest
    // (Quick Play student); ignore otherwise so the teacher who pressed
    // "End session" lands cleanly back on their own dashboard via the
    // monitor view's onEndSession handler instead of the student
    // QuickPlaySessionEndScreen, whose "Go home" button does
    // setUser(null) + setView('public-landing') — wrong for a teacher.
    const offKicked = qpOnKicked(() => {
      if (!userIsGuestRef.current) return;
      setQuickPlayKicked(true);
      setActiveAssignment(null);
    });
    const offEnded = qpOnSessionEnded(() => {
      if (!userIsGuestRef.current) return;
      setQuickPlaySessionEnded(true);
      setActiveAssignment(null);
    });
    return () => { offKicked(); offEnded(); };
  }, [qpOnKicked, qpOnSessionEnded]);

  // Throttled Socket.IO score emit. Routes to the right transport
  // depending on context:
  //   * classroom live challenge — existing `/` namespace, needs classCode
  //   * Quick Play v2 guest game — new `/quick-play` namespace, no auth
  const emitScoreUpdate = (newScore: number) => {
    const now = Date.now();
    const shouldEmit = now - lastScoreEmitRef.current > 2000 || isFinished;
    if (!shouldEmit) {
      console.log('[emitScoreUpdate] throttled', { newScore, msSinceLast: now - lastScoreEmitRef.current, isFinished });
      return;
    }
    lastScoreEmitRef.current = now;

    // Diagnostic — surfaces WHY a Quick Play student's score doesn't
    // reach the server.  When teachers reported "students show 0 pts
    // on my podium even after they played", the fly logs showed zero
    // SCORE_UPDATE events.  These three conditions are the gate; if
    // any is false the QP branch silently bails into the Live Challenge
    // branch which itself bails because guests have no classCode.
    console.log('[emitScoreUpdate] gate check', {
      newScore,
      QUICKPLAY_V2,
      isGuest: user?.isGuest,
      hasQpSession: !!quickPlayActiveSession,
      qpSessionCode: quickPlayActiveSession?.sessionCode,
      hasClassCode: !!user?.classCode,
    });

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
      console.log('[emitScoreUpdate] QP path → updateScore', { mode: newScore, cumulative });
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

    if (!socket || !user?.classCode) {
      console.log('[emitScoreUpdate] both paths bailed — no emit');
      return;
    }
    setTimeout(() => {
      socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
    }, 0);
  };

  // Redirect legacy "students" view to gradebook
  useEffect(() => {
    if (view === "students") {
      setView("gradebook");
      fetchScores();
    }
  }, [view]);

  // Play a random pre-recorded female-voice praise phrase when a mode
  // finishes. Previous behaviour passed a template string to speak(),
  // which routed through window.speechSynthesis — and the browser's
  // default voice on desktop is usually male, which didn't match the
  // female voice used for the curated /motivational/*.mp3 library.
  // playMotivational picks one of ~74 phrases from that library.
  useEffect(() => {
    if (isFinished && user?.displayName && view === "game") {
      setTimeout(() => playMotivational(), 500);

      // Force emit final score to server (bypass throttle)
      if (socket && user?.classCode) {
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score });
        }, 100);
      }
    }
  }, [isFinished]);

  // Reset welcome popup when entering assignment creation view
  // Only show if user hasn't seen it before (checked via localStorage)
  useEffect(() => {
    if (view === "create-assignment") {
      try {
        if (!localStorage.getItem('vocaband_welcome_seen')) {
          setShowAssignmentWelcome(true);
        }
      } catch {
        setShowAssignmentWelcome(true);
      }
    }
  }, [view]);

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
    showToast, translateWordsBatch,
  });

  // --- AUTH LOGIC ---
  useEffect(() => {
    // If Supabase isn't configured, skip auth entirely and show the landing page.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // PKCE code exchange happens in main.tsx (outside React lifecycle)
    // to avoid StrictMode double-mount races.  By the time this effect
    // runs, the exchange is already in-flight or completed.

    // Helper: fetch user profile with a single retry for transient errors.
    const fetchUserProfile = async (uid: string, retries = 1): Promise<ReturnType<typeof mapUser> | null> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const { data: userRow, error } = await supabase.from('users').select(USER_COLUMNS).eq('uid', uid).maybeSingle();
        if (userRow) return mapUser(userRow);
        if (!error) return null; // No row exists — don't retry
        if (attempt < retries) await new Promise(r => setTimeout(r, 500));
      }
      return null;
    };

    // Restore session from a Supabase user.  Called OUTSIDE the auth lock
    // (fire-and-forget from the non-async onAuthStateChange callback).
    // Uses currentViewRef to read the latest view and preserve navigation.
    const restoreSession = async (
      supabaseUser: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
    ) => {
      if (restoreInProgress.current) return;
      // QR-scan Live Play: if the URL carries `?session=…` the user
      // scanned a teacher's Quick Play QR and the initial-view setter
      // (line ~132) already routed them to "quick-play-student".  We
      // intentionally skip auth restore in that case so a logged-in
      // OAuth student lands in the guest join flow exactly like a
      // fresh visitor — they type a nickname, become a guest for the
      // duration, and their score updates flow through the QP V2
      // channel (which the legacy live-challenge channel does not).
      // Without this guard, the dashboard setView calls below override
      // the QR view and the student never sees the join form.
      if (quickPlaySessionParam) return;
      restoreInProgress.current = true;

      try {
        // For anonymous students: RLS blocks SELECT on users table
        // (is_anonymous IS FALSE). Instead of querying the DB, restore
        // directly from localStorage which was saved on login.
        const isAnonymous = supabaseUser.is_anonymous || supabaseUser.app_metadata?.provider === 'anonymous';
        // Speculatively fetch teacher-owned classes in parallel with the
        // users row. For teachers this halves login latency — the two
        // round-trips overlap instead of running back-to-back. For
        // students it's a cheap RLS-filtered query that returns []
        // (they're not the teacher_uid owner of any class) so no harm.
        const speculativeClassesPromise = isAnonymous
          ? Promise.resolve([] as ClassData[])
          : supabase
              .from('classes')
              .select(CLASS_COLUMNS)
              .eq('teacher_uid', supabaseUser.id)
              .then(r => (r.data ?? []).map(mapClass))
              .catch(() => [] as ClassData[]);
        let userData = await fetchUserProfile(supabaseUser.id);

        if (!userData && isAnonymous) {
          try {
            const savedRaw = localStorage.getItem('vocaband_student_login');
            if (savedRaw) {
              const saved = JSON.parse(savedRaw);
              if (saved.classCode && saved.displayName) {
                // Restore from localStorage without DB read
                userData = {
                  uid: supabaseUser.id,
                  displayName: saved.displayName,
                  email: supabaseUser.email || '',
                  role: 'student' as const,
                  classCode: saved.classCode,
                  avatar: saved.avatar || '🦊',
                  badges: [],
                  xp: 0,
                  streak: 0,
                };
                // Update localStorage with the current auth UID
                localStorage.setItem('vocaband_student_login', JSON.stringify({
                  ...saved,
                  uid: supabaseUser.id,
                }));
              }
            }
          } catch { /* localStorage unavailable */ }
        }

        if (userData) {
          // OAuth role-intent enforcement.  If the user clicked "Log in
          // as Teacher" on the landing page, we stamped an 'oauth_intent'
          // role='teacher' flag BEFORE the Google redirect.  Google signs
          // them in with whatever account they have active (which might
          // be the one they previously signed up as a STUDENT with).
          // Without this guard, restoreSession would silently drop them
          // into the student dashboard even though they clearly pressed
          // the teacher button.  Reject with a clear error + sign out.
          // Stale flags older than the freshness window are ignored
          // (see utils/oauthIntent).
          const intended = readIntendedRole();
          if (intended?.role === 'teacher' && intended.fresh && userData.role !== 'teacher') {
            clearIntendedRole();
            setError(
              `This Google account (${userData.email ?? 'unknown'}) is registered as a ${userData.role}, not a teacher. ` +
              `Sign in from the student page instead, or use a different Google account for teacher access.`
            );
            await supabase.auth.signOut().catch(() => {});
            setLoading(false);
            return;
          }
          // Consumed — clear so subsequent logins don't re-trigger.
          if (intended) clearIntendedRole();

          setUser(userData);
          checkConsent(userData);
          if (userData.role === "teacher") {
            // The speculative parallel fetch above already has the classes
            // ready by now (it started at the same time as fetchUserProfile,
            // not after). Fall back to a direct fetch only if the speculative
            // one failed or returned nothing.
            let fetchedClasses = await speculativeClassesPromise;
            if (fetchedClasses.length === 0) {
              fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => [] as Awaited<ReturnType<typeof fetchTeacherData>>);
            } else {
              setClasses(fetchedClasses);
            }
            fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            // Restore Quick Play session if teacher was monitoring one before refresh
            // Skip if the "Quick Online Challenge" button set the skip flag
            const skipRestore = sessionStorage.getItem('vocaband_skip_restore');
            if (skipRestore) {
              sessionStorage.removeItem('vocaband_skip_restore');
              try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
              // Only redirect to dashboard if not already on a valid teacher view
              if (!shouldPreserveView("teacher", currentViewRef.current)) {
                setView("teacher-dashboard");
              }
            } else {
              try {
                const savedSession = localStorage.getItem('vocaband_quick_play_session');
                if (savedSession) {
                  const parsed = JSON.parse(savedSession);
                  const { data: sessionData } = await supabase
                    .from('quick_play_sessions')
                    .select('id, session_code, word_ids, allowed_modes, is_active')
                    .eq('id', parsed.id)
                    .eq('is_active', true)
                    .maybeSingle();
                  if (sessionData) {
                    // Vocabulary may not be loaded yet at this point —
                    // the lazy hook only triggers after view transitions
                    // away from public-landing.  This restore path runs
                    // BEFORE the view transition, so do an inline
                    // dynamic import to be safe.  The import resolves
                    // to the same cached chunk the hook will use.
                    let vocabMod = getCachedVocabulary();
                    if (!vocabMod) {
                      const m = await import("./data/vocabulary");
                      vocabMod = {
                        ALL_WORDS: m.ALL_WORDS, SET_1_WORDS: m.SET_1_WORDS,
                        SET_2_WORDS: m.SET_2_WORDS, TOPIC_PACKS: m.TOPIC_PACKS,
                      };
                    }
                    const dbWords = vocabMod.ALL_WORDS.filter(w => (sessionData.word_ids || []).includes(w.id));
                    // allowed_modes can come from either the DB (source of
                    // truth on refresh) or the cached localStorage blob
                    // (fallback if the column was added after the session
                    // was created). DB wins when both present.
                    const restoredAllowedModes =
                      (sessionData as { allowed_modes?: string[] }).allowed_modes
                      || parsed.allowedModes
                      || undefined;
                    setQuickPlayActiveSession({
                      id: sessionData.id,
                      sessionCode: sessionData.session_code,
                      wordIds: sessionData.word_ids || [],
                      words: parsed.words?.length ? parsed.words : dbWords,
                      allowedModes: restoredAllowedModes,
                    });
                    setQuickPlaySessionCode(sessionData.session_code);
                    setView("quick-play-teacher-monitor");
                  } else {
                    localStorage.removeItem('vocaband_quick_play_session');
                    // Preserve current view if on a valid teacher page
                    if (!shouldPreserveView("teacher", currentViewRef.current)) {
                      setView("teacher-dashboard");
                    }
                  }
                } else {
                  // Preserve current view if on a valid teacher page
                  if (!shouldPreserveView("teacher", currentViewRef.current)) {
                    setView("teacher-dashboard");
                  }
                }
              } catch {
                // Preserve current view if on a valid teacher page
                if (!shouldPreserveView("teacher", currentViewRef.current)) {
                  setView("teacher-dashboard");
                }
              }
            }
          } else if (userData.role === "student" && userData.classCode) {
            const code = userData.classCode;

            // Class-switch detection: if the student typed a different class
            // code before the OAuth redirect, and that code maps to a real
            // (different) class, surface the switch confirmation modal
            // instead of silently logging them into their old class.
            const intendedCode = readIntendedClassCode();
            // Normalise both sides to uppercase so a DB-stored code that
            // slipped through without case normalisation still compares
            // correctly. The login form uppercases what students type.
            const intendedNorm = intendedCode?.trim().toUpperCase() || null;
            const currentNorm = code?.trim().toUpperCase() || '';
            if (intendedNorm && intendedNorm !== currentNorm) {
              // Validate the intended class exists via a SECURITY DEFINER RPC
              // that bypasses RLS — the student isn't a member yet, so a
              // direct .from('classes').select(...) would return empty even
              // for valid codes. RPC only returns code + name (safe to expose).
              const { data: intendedClassRows, error: lookupErr } = await supabase
                .rpc('class_lookup_by_code', { p_code: intendedNorm });
              if (lookupErr) {
                // RPC errored rather than returned empty. Log + show the
                // reason so a misconfigured server (missing migration, rate
                // limit, legacy API key, etc.) isn't misdiagnosed as a
                // bad class code by the user.
                console.error('[restoreSession class switch] RPC failed:', lookupErr);
                setClassNotFoundIntent(`${intendedNorm} (lookup failed: ${lookupErr.message})`);
                clearIntendedClassCode();
              } else if (intendedClassRows && intendedClassRows.length > 0) {
                const { data: currentClassRows } = await supabase
                  .from('classes').select('code, name').eq('code', code);
                setUser(userData);
                checkConsent(userData);
                setPendingClassSwitch({
                  fromCode: code,
                  fromClassName: currentClassRows?.[0]?.name ?? null,
                  toCode: intendedNorm,
                  toClassName: intendedClassRows[0].name ?? null,
                  supabaseUser: { id: supabaseUser.id, email: supabaseUser.email },
                });
                // Park the user on their existing dashboard while the modal
                // is up so there's a visible background (not the landing page).
                setView("student-dashboard");
                clearIntendedClassCode();
                return; // stop here — modal drives the next step
              } else {
                // RPC returned zero rows AND no error: class genuinely
                // doesn't exist. Sticky banner (NOT a toast — toasts
                // auto-dismiss and students miss them). ClassNotFoundBanner
                // on the dashboard renders this until acknowledged.
                setClassNotFoundIntent(intendedNorm);
                clearIntendedClassCode();
              }
            } else if (intendedCode) {
              // Same class — just clear the flag
              clearIntendedClassCode();
            }

            const { data: classRows } = await supabase
              .from('classes').select(CLASS_COLUMNS).eq('code', code);
            if (classRows && classRows.length > 0) {
              const classData = mapClass(classRows[0]);
              // Fetch assignments + progress in parallel for faster restore.
              // Use RPC for assignments to bypass RLS (SECURITY DEFINER).
              const [assignResult, progressResult] = await Promise.all([
                supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', code).eq('student_uid', supabaseUser.id),
              ]);
              setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
              setStudentProgress((progressResult.data ?? []).map(mapProgress));
            }
            setBadges(userData.badges || []);
            setXp(userData.xp ?? 0);
            setStreak(userData.streak ?? 0);
            // Preserve current view if on a valid student page
            if (!shouldPreserveView("student", currentViewRef.current)) {
              setView("student-dashboard");
            }
          } else {
            // users row exists but is in a broken state — most commonly an
            // OAuth student whose previous sign-in didn't complete class-code
            // entry, leaving role="student" with class_code=null.  Without
            // this branch, neither the teacher nor the populated-student
            // branch fires, so setView is never called and the user is
            // stranded on the landing page after OAuth redirect.
            //
            // Check if a completed student_profiles row already exists (e.g.
            // the user entered a class code in a later session).  If so,
            // adopt it — otherwise prompt for class-code entry.
            // Narrowed select on 2026-04-28 (LOW DB-cost finding) — pull
            // only the 6 fields the AppUser builder reads, not every row
            // column.  Saves ~1.4 KB / call.
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('email, status, display_name, class_code, xp, avatar')
              .eq('email', supabaseUser.email ?? "")
              .maybeSingle();
            if (studentProfile && (studentProfile.status === 'active' || studentProfile.status === 'approved')) {
              const studentUser: AppUser = {
                uid: supabaseUser.id,
                email: studentProfile.email,
                displayName: studentProfile.display_name || (supabaseUser.user_metadata?.full_name as string) || "Student",
                role: "student",
                classCode: studentProfile.class_code,
                xp: studentProfile.xp || 0,
                avatar: studentProfile.avatar,
              };
              // Repair the broken users row so subsequent logins take the
              // fast path at line 1453 instead of re-entering this branch.
              await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });
              setUser(studentUser);
              if (studentProfile.class_code) {
                const { data: classRows } = await supabase
                  .from('classes').select(CLASS_COLUMNS).eq('code', studentProfile.class_code);
                if (classRows && classRows.length > 0) {
                  const classData = mapClass(classRows[0]);
                  const [assignResult, progressResult] = await Promise.all([
                    supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                    supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
                  ]);
                  setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                  setStudentProgress((progressResult.data ?? []).map(mapProgress));
                }
              }
              // Preserve current view if on a valid student page
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            }
            if (studentProfile && studentProfile.status === 'pending_approval') {
              showPendingApproval({
                name: studentProfile.display_name || '',
                classCode: studentProfile.class_code || '',
                profileId: studentProfile.id,
              });
              return;
            }

            // No student_profiles row — route to OAuth class-code entry form
            // so they can finish signup. Also covers unexpected role values.
            setOauthEmail(supabaseUser.email || "");
            setOauthAuthUid(supabaseUser.id);
            setShowOAuthClassCode(true);
            setView("student-account-login");
          }
        } else {
          // No user row found for this anonymous UID.  Before giving up,
          // check if a student login was persisted to localStorage — the
          // anonymous UID may have changed on refresh (mobile/PWA).
          try {
            const savedRaw = localStorage.getItem('vocaband_student_login');
            if (savedRaw) {
              const { classCode: savedCode, displayName: savedName, uid: savedUid } = JSON.parse(savedRaw);
              const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (savedCode && savedName && savedUid && UUID_RE.test(savedUid)) {
                // Look up the users row by the OLD uid
                const { data: existingUser } = await supabase
                  .from('users').select(USER_COLUMNS).eq('uid', savedUid).maybeSingle();
                if (existingUser) {
                  // Migrate the row to the new anonymous UID
                  await supabase.from('users')
                    .update({ uid: supabaseUser.id })
                    .eq('uid', savedUid);
                  // Re-fetch with new UID
                  const restored = await fetchUserProfile(supabaseUser.id);
                  if (restored) {
                    setUser(restored);
                    checkConsent(restored);
                    if (restored.role === "student" && restored.classCode) {
                      const { data: classRows } = await supabase
                        .from('classes').select(CLASS_COLUMNS).eq('code', restored.classCode);
                      if (classRows && classRows.length > 0) {
                        const c = mapClass(classRows[0]);
                        const [a, p] = await Promise.all([
                          supabase.rpc('get_assignments_for_class', { p_class_id: c.id }),
                          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', restored.classCode).eq('student_uid', supabaseUser.id),
                        ]);
                        setStudentAssignments((a.data ?? []).map(mapAssignment));
                        setStudentProgress((p.data ?? []).map(mapProgress));
                      }
                    }
                    setBadges(restored.badges || []);
                    setXp(restored.xp ?? 0);
                    setStreak(restored.streak ?? 0);
                    setView(restored.role === "teacher" ? "teacher-dashboard" : "student-dashboard");
                    // Update saved UID for next refresh
                    localStorage.setItem('vocaband_student_login', JSON.stringify({
                      classCode: restored.classCode || savedCode,
                      displayName: restored.displayName || savedName,
                      uid: supabaseUser.id,
                    }));
                    return; // restored successfully
                  }
                }
                // No existing user row — clear stale saved login
                localStorage.removeItem('vocaband_student_login');
              }
            }
          } catch { /* localStorage unavailable — non-critical */ }

          // Auto-create teacher account for Google sign-ins only (not anonymous)
          const isGoogleSignIn = supabaseUser.app_metadata?.provider === 'google';
          if (isGoogleSignIn) {
            // First check if this is an OAuth student (they exist in student_profiles, not users)
            // Narrowed select on 2026-04-28 to match the consumer below.
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('email, status, display_name, class_code, xp, avatar')
              .eq('email', supabaseUser.email ?? "")
              .maybeSingle();
            if (studentProfile && (studentProfile.status === 'active' || studentProfile.status === 'approved')) {
              // Existing approved OAuth student — create/update their users row and log them in
              const studentUser: AppUser = {
                uid: supabaseUser.id,
                email: studentProfile.email,
                displayName: studentProfile.display_name || (supabaseUser.user_metadata?.full_name as string) || "Student",
                role: "student",
                classCode: studentProfile.class_code,
                xp: studentProfile.xp || 0,
                avatar: studentProfile.avatar,
              };
              await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });
              setUser(studentUser);
              if (studentProfile.class_code) {
                const { data: classRows } = await supabase
                  .from('classes').select(CLASS_COLUMNS).eq('code', studentProfile.class_code);
                if (classRows && classRows.length > 0) {
                  const classData = mapClass(classRows[0]);
                  const [assignResult, progressResult] = await Promise.all([
                    supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                    supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
                  ]);
                  setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                  setStudentProgress((progressResult.data ?? []).map(mapProgress));
                }
              }
              // Preserve current view if on a valid student page
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            } else if (studentProfile && studentProfile.status === 'pending_approval') {
              showPendingApproval({
                name: studentProfile.display_name || '',
                classCode: studentProfile.class_code || '',
                profileId: studentProfile.id,
              });
              setLoading(false);
              return;
            }

            // Not a known student — check teacher allowlist
            const { data: isAllowed, error: allowErr } = await supabase.rpc('is_teacher_allowed', {
              check_email: supabaseUser.email ?? ""
            });
            if (allowErr) {
              // RPC failed (cold start, function missing) — throw so retry handles it
              throw new Error(`Teacher allowlist check failed: ${allowErr.message}`);
            }
            if (!isAllowed) {
              // Not a teacher either — this is a new OAuth student who hasn't
              // entered a class code yet.  Show the class code entry form.
              setOauthEmail(supabaseUser.email || "");
              setOauthAuthUid(supabaseUser.id);
              setShowOAuthClassCode(true);
              setView("student-account-login");
              setLoading(false);
              return;
            }
            const newUser: AppUser = {
              uid: supabaseUser.id,
              email: supabaseUser.email || "",
              role: "teacher",
              displayName: (supabaseUser.user_metadata?.full_name as string) || (supabaseUser.user_metadata?.name as string) || "Teacher",
            };
            // Use upsert to handle race conditions (StrictMode double-mount, retry after partial failure)
            const { error: insertErr } = await supabase.from('users').upsert(mapUserToDb(newUser), { onConflict: 'uid' });
            if (insertErr) {
              console.error("Teacher profile upsert failed:", insertErr);
            }
            setUser(newUser);
            const fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => []);
            fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            setView("teacher-dashboard");
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
        // If restoreSession fails (network glitch, Render cold start, RLS
        // error), the teacher lands on the landing page with no explanation.
        // Fix: retry once after a short delay. If that also fails, show the
        // error so the teacher knows to retry manually.
        if (!restoreRetried.current) {
          restoreRetried.current = true;
          restoreInProgress.current = false;
          // Retry after 1.5s — gives Render time to wake up from cold start
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await restoreSession(session.user);
              } else {
                showToast("Could not restore session. Please sign in again.", "error");
                setLoading(false);
              }
            } catch {
              showToast("Sign-in failed. Please try again.", "error");
              setLoading(false);
            }
          }, 1500);
          return; // Don't setLoading(false) yet — the retry will handle it
        }
        showToast("Sign-in failed. Please try again.", "error");
      } finally {
        restoreInProgress.current = false;
        setLoading(false);
      }
    };
    // Retry flag managed via useRef (restoreRetried) — see declaration above

    // CRITICAL: This callback must NOT be async.
    // Supabase runs it inside an exclusive Navigator Lock. If the callback
    // is async and does slow work (DB queries, retries), it holds the lock
    // the whole time — blocking getSession(), signInAnonymously(), signOut(),
    // and every other auth operation.  This causes the 5-second lock timeout
    // → steal → AbortError chain that made login hang on mobile.
    //
    // Instead, we synchronously read the event/session, then fire-and-forget
    // the async restore work.  The lock is released immediately.
    //
    // BELT-AND-SUSPENDERS: proactively check getSession() on mount.  The
    // INITIAL_SESSION event should fire with the current session, but there
    // have been cases where it fires with null on the first mount after an
    // OAuth redirect (the "teacher logs in twice" bug).  By also calling
    // getSession() directly, we guarantee the session is restored even if
    // the event fails to deliver correctly.  restoreInProgress guards against
    // double-firing if INITIAL_SESSION also comes through.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !manualLoginInProgress.current && !restoreInProgress.current && !fromShareLinkRef.current) {
          restoreSession(session.user);
        } else if (fromShareLinkRef.current) {
          // Shared-link visitor is already logged in. Keep them on the
          // landing page so the preview they were sent to is what they
          // actually see — they can click "Start Learning" or "Teacher
          // Login" to jump back to their dashboard if they want.
          setLoading(false);
        }
      } catch { /* getSession failed — let onAuthStateChange handle it */ }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If handleStudentLogin is running, it owns loading/view — don't interfere.
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        // Fire-and-forget: releases the auth lock immediately, then
        // does the slow DB work asynchronously.
        if (fromShareLinkRef.current && event === 'INITIAL_SESSION') {
          // Same reasoning as the getSession path above: don't hijack a
          // shared-link visit with an auto-dashboard redirect.
          setLoading(false);
          return;
        }
        // Preserve the current view when auth state changes (e.g., token refresh
        // when user switches tabs). Only redirect to dashboard if currently on a
        // public view. This prevents teachers from being kicked out of
        // worksheet, classroom, class-show, etc. when they switch tabs.
        // Uses currentViewRef internally to check the latest view.
        restoreSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        cleanupSessionData(); // Clear save queue and timers
        setUser(null);
        // Reset all game-playing state so the back button can't resurrect
        // a ghost of the previous session.  Symptom before this clear:
        // teacher signs out, taps back a few times on mobile, and lands
        // on a "practice 789 words" game (those 789 being an
        // assignmentWords array left over from whatever was loaded last)
        // even though auth.user is null.  Popstate restores the old view
        // string but the render falls through to stale state in these
        // variables if we don't null them out in lockstep.
        setActiveAssignment(null);
        setAssignmentWords([]);
        setIsFinished(false);
        setCurrentIndex(0);
        setScore(0);
        setMistakes([]);
        setWordAttemptBatch([]);
        setFeedback(null);
        setSpellingInput("");
        setMatchedIds([]);
        setSelectedMatch(null);
        setIsFlipped(false);
        setRevealedLetters(0);
        setSentenceIndex(0);
        setAvailableWords([]);
        setBuiltSentence([]);
        setSentenceFeedback(null);
        setHiddenOptions([]);
        setShowModeSelection(false);
        setQuickPlayActiveSession(null);
        setQuickPlaySessionCode(null);
        setQuickPlayJoinedStudents([]);
        // Reset cumulative QP score so a fresh session starts at 0.
        qpCumulativeScoreRef.current = 0;
        setQuickPlayKicked(false);
        setQuickPlaySessionEnded(false);
        try { localStorage.removeItem('vocaband_student_login'); } catch {}
        try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
        try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
        // Reset history state so the back-button trap doesn't persist
        // into the logged-out experience (otherwise pad entries from
        // the previous session would still block navigation).
        try { window.history.replaceState({ view: 'public-landing' }, ''); } catch {}
        // Don't redirect Quick Play students — they don't need auth
        if (!quickPlaySessionParam) setView("public-landing");
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // No session exists — user needs to log in.
        // Exception: if the URL has an OAuth code (?code=) or implicit token
        // fragment (#access_token=), Supabase is still in the middle of the
        // async code exchange.  Keep the spinner until SIGNED_IN fires and
        // restoreSession → setLoading(false) completes.  Without this guard,
        // the landing page flashes on mobile between INITIAL_SESSION (no
        // session yet) and SIGNED_IN (exchange done), making the teacher
        // think login failed and prompting a second attempt.
        const isOAuthCallback =
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token=");

        // Check if bootstrap() just completed a successful PKCE exchange.
        // The ?code= param is already stripped by the time React renders,
        // so we use a sessionStorage flag as a bridge. If set, actively
        // poll getSession() to find the session — Supabase v2 may not
        // fire a SIGNED_IN event after INITIAL_SESSION, so passive
        // waiting can leave the user stuck on landing.
        const justExchanged = sessionStorage.getItem('oauth_session_ready');
        if (justExchanged) {
          sessionStorage.removeItem('oauth_session_ready');
          // Poll for session — 250ms intervals, up to 16 seconds.  Tight
          // intervals close the window where loading=false might let the
          // landing page flash into view and make the teacher click Login
          // a second time.
          let pollCount = 0;
          const maxPolls = 64;
          const pollForSession = async () => {
            pollCount++;
            try {
              const { data: { session: polled } } = await supabase.auth.getSession();
              if (polled?.user) {
                if (!restoreInProgress.current) restoreSession(polled.user);
                return;
              }
            } catch { /* retry */ }
            if (pollCount < maxPolls) {
              setTimeout(pollForSession, 250);
            } else {
              // Session never materialised — show landing with error
              showToast("Sign-in is taking too long. Please try again.", "error");
              setLoading(false);
            }
          };
          // Start immediately — no initial delay.
          pollForSession();
          return;
        }

        // If the PKCE exchange failed in boot(), show a toast and let the
        // teacher try again immediately instead of silently showing landing.
        const exchangeFailed = sessionStorage.getItem('oauth_exchange_failed');
        if (exchangeFailed) {
          sessionStorage.removeItem('oauth_exchange_failed');
          setError("Sign-in timed out. Please try again.");
          setLandingTab("teacher");
          setLoading(false);
        } else if (!isOAuthCallback) {
          // Check if a student was waiting for teacher approval before refresh
          try {
            const savedPending = sessionStorage.getItem('vocaband_pending_approval');
            if (savedPending) {
              const info = JSON.parse(savedPending);
              if (info.name && info.classCode) {
                setPendingApprovalInfo(info);
                setView("student-pending-approval");
                setLoading(false);
                return;
              }
            }
          } catch {}

          // Before showing the landing page, check if a student session was
          // persisted — if so, silently re-authenticate.
          // signInAnonymously() will trigger onAuthStateChange → SIGNED_IN,
          // which calls restoreSession → handles the UID migration.
          // NOTE: fire-and-forget to avoid blocking the auth lock.
          const savedRaw = localStorage.getItem('vocaband_student_login');
          if (savedRaw) {
            // signInAnonymously triggers SIGNED_IN → restoreSession handles the rest
            supabase.auth.signInAnonymously().catch(() => {
              localStorage.removeItem('vocaband_student_login');
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safety timeout: if onAuthStateChange never fires (e.g. fully offline),
  // stop the spinner so the app doesn't hang forever.  Skip if a manual
  // login (handleStudentLogin) or session restore (restoreSession) is in
  // progress — they manage their own loading state.
  // 20s so the new 16s OAuth polling window has time to finish.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current && !restoreInProgress.current) setLoading(false);
    }, 20000);
    return () => clearTimeout(timeout);
  }, []);

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


  // Broadcast the current view so the global AccessibilityWidget knows
  // whether to render its floating trigger. Per the product owner the
  // trigger should only appear on public/landing pages, not while a
  // student is mid-game or a teacher is in their dashboard.
  useEffect(() => {
    currentViewRef.current = view;
    window.dispatchEvent(new CustomEvent('vocaband-view-change', { detail: view }));
  }, [view]);


  // ─── GLOBAL TEACHER DASHBOARD THEME ────────────────────────────────────
  // Apply teacher's selected theme globally across all pages. This runs
  // at the App level (not per-view) so the theme persists when navigating
  // between teacher pages without flashing or clearing.
  // - For teachers: applies their dashboard theme CSS variables
  // - For students/public: clears any teacher theme variables
  // Extract theme ID separately to avoid re-running effect on unrelated user updates.
  const teacherThemeId = user?.role === 'teacher' ? (user as any).teacherDashboardTheme : null;
  const lastThemeRef = useRef<string | null>(null);

  useEffect(() => {
    // Only apply if theme actually changed (avoid unnecessary DOM writes)
    if (lastThemeRef.current === teacherThemeId) return;
    lastThemeRef.current = teacherThemeId;

    if (teacherThemeId) {
      const theme = getTeacherDashboardTheme(teacherThemeId);
      applyThemePalette(theme.palette);
      // Update data attribute for dark mode scrollbar styles
      document.documentElement.dataset.themeDark = theme.dark.toString();
    } else {
      clearThemePalette();
      delete document.documentElement.dataset.themeDark;
    }
  }, [teacherThemeId]);


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


  // Pre-fetch all word audio at Quick Play join time.  The TTS MP3s
  // are stored on Supabase Storage; downloading them up-front means
  // gameplay never has to wait on the network mid-question — even on
  // 3G or a weak classroom Wi-Fi the audio clip is already local.
  // This is what lets the student experience feel 'Kahoot-smooth'
  // regardless of connectivity: gameplay is a local-only loop and
  // only the score save has to talk to the server (and that's
  // queued — see above).  Fire-and-forget; preload failures don't
  // block the game, the live TTS fallback handles those.
  useEffect(() => {
    if (!user?.isGuest) return;
    if (!quickPlayActiveSession?.words?.length) return;
    const ids = quickPlayActiveSession.words.map(w => w.id).filter(id => id > 0);
    if (ids.length === 0) return;
    preloadMany(ids);
  }, [user?.isGuest, quickPlayActiveSession?.id, preloadMany]);

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

  useEffect(() => {
    if (currentWord) setIsFlipped(false);
  }, [currentIndex, currentWord]);


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
      console.log('[QP cumulative] mode finished', { mode: finalScore, totalNow: qpCumulativeScoreRef.current });
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
  // Also bundles the mobile PWA install banner — fully self-gated (mobile-only,
  // not-installed-only, not-recently-dismissed) so it costs nothing on
  // teacher desktops or already-installed PWAs.
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
        <CookieBanner onAccept={handleCookieAccept} onCustomize={handleCookieCustomize} />
      )}
      <PwaInstallBanner />
      <QuickPlayResumeBanner suppress={qpResumeSuppress} />
    </>
  );

  // Image crop modal for OCR — shown when user picks a photo, before uploading
  const ocrCropModal = ocrPendingFile ? (
    <ImageCropModal
      file={ocrPendingFile.file}
      onConfirm={(croppedFile) => processOcrFile(croppedFile, ocrPendingFile.inputRef)}
      onCancel={() => {
        if (ocrPendingFile.inputRef?.target) ocrPendingFile.inputRef.target.value = '';
        setOcrPendingFile(null);
      }}
    />
  ) : null;

  if (loading && !quickPlaySessionParam) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <RefreshCw className="animate-spin text-blue-700" size={48} />
    </div>;
  }


  // Configuration error banner — shown when Supabase env vars are missing
  const configErrorBanner = !isSupabaseConfigured ? (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white px-4 py-3 text-center text-sm font-bold z-[9999]">
      <AlertTriangle size={16} className="inline mr-2" />
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
    setView,
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
    configErrorBanner,
    cookieBannerOverlay,
  });
  if (publicView) return publicView;

  // ── Student Pending Approval Screen ────────────────────────────────────────
  if (view === "student-pending-approval" && pendingApprovalInfo) {
    return (
      <PendingApprovalScreen
        pendingApprovalInfo={pendingApprovalInfo}
        setPendingApprovalInfo={setPendingApprovalInfo}
        handleLoginAsStudent={handleLoginAsStudent}
        setView={setView}
        showToast={showToast}
      />
    );
  }

  if (view === "student-account-login") {
    return (
      <LazyWrapper loadingMessage="Loading login...">
        <StudentAccountLoginView
          setView={setView}
          error={error}
          setError={setError}
          studentLoginClassCode={studentLoginClassCode}
          setStudentLoginClassCode={setStudentLoginClassCode}
          isOAuthCallback={isOAuthCallback}
          setIsOAuthCallback={setIsOAuthCallback}
          showOAuthClassCode={showOAuthClassCode}
          setShowOAuthClassCode={setShowOAuthClassCode}
          oauthEmail={oauthEmail}
          setOauthEmail={setOauthEmail}
          oauthAuthUid={oauthAuthUid}
          setOauthAuthUid={setOauthAuthUid}
          handleOAuthTeacherDetected={handleOAuthTeacherDetected}
          handleOAuthStudentDetected={handleOAuthStudentDetected}
          handleOAuthNewUser={handleOAuthNewUser}
          cookieBannerOverlay={cookieBannerOverlay}
        />
      </LazyWrapper>
    );
  }

  // Quick Play: Kicked by teacher
  if (quickPlayKicked) {
    return (
      <QuickPlayKickedScreen
        onGoHome={() => {
          cleanupSessionData(); // Clear save queue and timers
          setQuickPlayKicked(false);
          setQuickPlayActiveSession(null);
          setActiveAssignment(null);
          setUser(null);
          setView("public-landing");
          try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
        }}
        // Only offer rejoin when we still have the session context.  The
        // rejoin path clears the guest identity (localStorage + anon auth
        // sign-out) so the student picks up a fresh uid, then drops them
        // back on the Quick Play student view where the same session is
        // still active — name-change happens there via the join form.
        onRejoin={quickPlayActiveSession ? () => {
          cleanupSessionData();
          try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
          supabase.auth.signOut().catch(() => { /* best-effort */ });
          setQuickPlayKicked(false);
          setActiveAssignment(null);
          setUser(null);
          setQuickPlayStudentName("");
          setView("quick-play-student");
        } : undefined}
      />
    );
  }

  // Quick Play: Session ended by teacher
  if (quickPlaySessionEnded) {
    return (
      <QuickPlaySessionEndScreen
        studentName={user?.displayName || quickPlayStudentName || "Player"}
        finalScore={score || 0}
        sessionId={quickPlayActiveSession?.id}
        studentUid={user?.uid}
        onGoHome={() => {
          cleanupSessionData(); // Clear save queue and timers
          setQuickPlaySessionEnded(false);
          setQuickPlayActiveSession(null);
          setActiveAssignment(null);
          setUser(null);
          setView("public-landing");
          try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
        }}
      />
    );
  }

  if (view === "quick-play-student") {
    return (
      <LazyWrapper loadingMessage="Loading quick play...">
        <QuickPlayStudentView
          quickPlayActiveSession={quickPlayActiveSession}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          quickPlayStudentName={quickPlayStudentName}
          setQuickPlayStudentName={setQuickPlayStudentName}
          quickPlayAvatar={quickPlayAvatar}
          setQuickPlayAvatar={setQuickPlayAvatar}
          setView={setView}
          setUser={setUser}
          setAssignmentWords={setAssignmentWords}
          setActiveAssignment={setActiveAssignment}
          setCurrentIndex={setCurrentIndex}
          setScore={setScore}
          setFeedback={setFeedback}
          setIsFinished={setIsFinished}
          setMistakes={setMistakes}
          setShowModeSelection={setShowModeSelection}
          createGuestUser={createGuestUser}
          cleanupSessionData={cleanupSessionData}
          showToast={showToast}
          userIsActiveGuest={!!user?.isGuest}
        />
      </LazyWrapper>
    );
  }


  // --- CONSENT MODAL (overlays any view when policy update requires re-consent) ---
  const consentModal = (
    <ConsentModal
      show={needsConsent && !!user && !showOnboarding}
      policyVersion={PRIVACY_POLICY_VERSION}
      consentChecked={consentChecked}
      onToggleChecked={setConsentChecked}
      onAccept={() => recordConsent()}
    />
  );

  // Shown when a logged-in user presses the hardware back button at the
  // dashboard floor.  Tapping "Leave" exits the app by popping past the
  // pad buffer; "Stay" dismisses the modal and keeps the user in place.
  const handleExitConfirmLeave = () => {
    // beginExitFlow closes the modal, suppresses popstate re-trap for
    // ~500 ms, and resets history to public-landing.  Signing out is
    // our concern — the hook stays agnostic of the auth client.
    beginExitFlow();
    supabase.auth.signOut().catch(() => {});
  };
  const exitConfirmModal = (
    <ExitConfirmModal
      show={showExitConfirmModal}
      onStay={() => setShowExitConfirmModal(false)}
      onLeave={handleExitConfirmLeave}
    />
  );

  // --- CLASS SWITCH MODAL -------------------------------------------------
  // Shown when an already-approved student logs in with a class code that
  // differs from their current class_code.  Approve = update profile +
  // users row to the new class and land on the new dashboard (no teacher
  // re-approval per Approach 1).  Cancel = keep the current class.
  // Sticky banner the student sees on the dashboard when they typed a
  // class code that doesn't exist.  Rendered-variable pattern mirrors
  // the other modals (consentModal / exitConfirmModal / classSwitchModal)
  // so it can be passed as a prop to whichever view hosts it.
  const classNotFoundBanner = (
    <ClassNotFoundBanner
      classCode={classNotFoundIntent}
      onDismiss={() => setClassNotFoundIntent(null)}
      onSignOutAndLogin={async () => {
        // Clear the dismiss-state first so the banner doesn't linger
        // past the redirect, then sign out and route to the login.
        setClassNotFoundIntent(null);
        try { await supabase.auth.signOut(); } catch { /* noop */ }
        setView('student-account-login');
      }}
    />
  );

  const classSwitchModal = (
    <ClassSwitchModal
      pendingClassSwitch={pendingClassSwitch}
      onConfirm={handleConfirmClassSwitch}
      onCancel={handleCancelClassSwitch}
    />
  );

  if (user?.role === "student" && view === "student-dashboard") {
    return (
      <LazyWrapper loadingMessage="Loading dashboard...">
        <StudentDashboardView
          user={user}
          xp={xp}
          streak={streak}
          badges={badges}
          copiedCode={copiedCode}
          setCopiedCode={setCopiedCode}
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          studentDataLoading={studentDataLoading}
          showStudentOnboarding={showStudentOnboarding}
          setShowStudentOnboarding={setShowStudentOnboarding}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          classSwitchModal={classSwitchModal}
          classNotFoundBanner={classNotFoundBanner}
          setView={setView}
          setShopTab={setShopTab}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setShowModeSelection={setShowModeSelection}
          onStartReview={() => {
            // Spaced repetition entry point — bypasses the mode
            // picker.  ReviewGame self-fetches its queue + the
            // ALL_WORDS distractor pool, so we don't need to seed
            // gameWords or activeAssignment.  Set isFinished off so
            // the finish-screen overlay doesn't show stale state
            // from a previous round.
            setGameMode("review");
            setIsFinished(false);
            setShowModeSelection(false);
            setView("game");
          }}
          retention={retention}
          boosters={{
            isXpBoosterActive: boosters.isXpBoosterActive,
            isFocusModeActive: boosters.isFocusModeActive,
            isWeekendWarriorActive: boosters.isWeekendWarriorActive,
            streakFreezes: boosters.streakFreezes,
            luckyCharms: boosters.luckyCharms,
          }}
          onGrantXp={(amount, reason) => {
            // Grant retention rewards through the same path as gameplay XP.
            // Persist to the server and show a celebration toast so students
            // feel the reward landing, not just a silent number bump.
            const newXp = xp + amount;
            setXp(newXp);
            if (user) {
              supabase.from('users').update({ xp: newXp }).eq('uid', user.uid).then(() => {});
            }
            showToast(reason, 'success');
          }}
          onApplyServerRewards={({ xpToAdd, badgesToAppend }) => {
            // Teacher-given rewards arrive already-applied on the server
            // (award_reward RPC increments users.xp and appends badges in
            // the same transaction as the teacher_rewards insert).  This
            // callback exists to sync the dashboard's LOCAL snapshot to
            // the DB when RewardInboxCard detects a newly-polled reward.
            // Writing to Supabase here would double-count — do NOT.
            if (xpToAdd > 0) setXp(prev => prev + xpToAdd);
            if (badgesToAppend.length > 0) {
              setBadges(prev => {
                const next = [...prev];
                for (const b of badgesToAppend) {
                  if (!next.includes(b)) next.push(b);
                }
                return next;
              });
            }
          }}
          onGrantReward={(kind, value) => {
            // Apply a non-XP reward (title/frame/avatar unlock) into
            // user state + DB.  Gets called from the pet milestone claim.
            if (!user) return;
            if (kind === 'unlock_avatar') {
              setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), String(value)] } : prev);
            } else if (kind === 'unlock_title') {
              setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `title_${value}`] } : prev);
            } else if (kind === 'unlock_frame') {
              setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `frame_${value}`] } : prev);
            }
          }}
          onRenameDisplayName={renameStudentDisplayName}
          structure={structure}
          celebrateStructureKeys={celebrateStructureKeys}
        />
      </LazyWrapper>
    );
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

  // --- SHOP VIEW (lazy-loaded from ./views/ShopView) ---
  if (user?.role === "student" && view === "shop") {
    return (
      <LazyWrapper loadingMessage="Loading shop...">
        <ShopView
          user={user}
          xp={xp}
          setXp={setXp}
          setUser={setUser}
          setView={setView}
          showToast={showToast}
          shopTab={shopTab}
          setShopTab={setShopTab}
          activateBooster={boosters.activate}
        />
      </LazyWrapper>
    );
  }
  if (user?.role === "teacher" && view === "teacher-dashboard") {
    return (
      <LazyWrapper loadingMessage="Loading dashboard...">
        <TeacherDashboardView
          user={user}
          setUser={setUser}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          ocrCropModal={ocrCropModal}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          classes={classes}
          teacherAssignments={teacherAssignments}
          pendingStudentsCount={pendingStudents.length}
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
          onConfirmDeleteAssignment={(deletedId, deletedTitle) => {
            setTeacherAssignments(prev => {
              const removed = prev.find(x => x.id === deletedId);
              if (removed) (window as any).__undoAssignment = removed;
              return prev.filter(x => x.id !== deletedId);
            });
            setDeleteConfirmModal(null);
            const undoTimeout = setTimeout(async () => {
              const { error } = await supabase.from('assignments').delete().eq('id', deletedId);
              if (error) showToast("Failed to delete from database: " + error.message, "error");
              delete (window as any).__undoAssignment;
              delete (window as any).__undoDeleteTimeout;
            }, 8000);
            (window as any).__undoDeleteTimeout = undoTimeout;
            const undoToastId = Date.now().toString();
            setToasts(prev => [...prev, {
              id: undoToastId,
              message: `"${deletedTitle}" deleted`,
              type: 'info' as const,
              action: {
                label: 'Undo',
                onClick: () => {
                  clearTimeout((window as any).__undoDeleteTimeout);
                  const restored = (window as any).__undoAssignment;
                  if (restored) {
                    setTeacherAssignments(prev => [...prev, restored]);
                    delete (window as any).__undoAssignment;
                  }
                  setToasts(prev => prev.filter(t => t.id !== undoToastId));
                  showToast("Assignment restored!", "success");
                }
              }
            }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== undoToastId)), 8000);
          }}
          rejectStudentModal={rejectStudentModal}
          setRejectStudentModal={setRejectStudentModal}
          confirmRejectStudent={confirmRejectStudent}
          toasts={toasts}
          confirmDialog={confirmDialog}
          setConfirmDialog={setConfirmDialog}
          onQuickPlayClick={() => {
            try { sessionStorage.setItem('vocaband_skip_restore', 'true'); } catch (e) { /* ignore */ }
            // Previously we called history.replaceState({view:'quick-play-setup'}) here,
            // which clobbered the teacher-dashboard history entry. As a result the
            // mobile browser back button couldn't return the teacher to their
            // dashboard — it jumped past into pad buffer / landing territory.
            // Let the view-change effect push the new entry naturally on top of
            // the dashboard so back pops cleanly back to it.
            try { localStorage.removeItem('vocaband_quick_play_session'); } catch (e) { /* ignore */ }
            cleanupSessionData();
            setQuickPlayActiveSession(null);
            setQuickPlaySessionCode(null);
            setView("quick-play-setup");
          }}
          onClassroomClick={() => { fetchScores(); fetchTeacherAssignments(); setView("classroom"); }}
          onApprovalsClick={() => { loadPendingStudents(); setView("teacher-approvals"); }}
          onClassShowClick={() => { setClassShowAssignment(null); setView("class-show"); }}
          onProjectAssignmentToClass={(a) => {
            setClassShowAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
            setView("class-show");
          }}
          onWorksheetClick={() => { setWorksheetAssignment(null); setView("worksheet"); }}
          onPrintAssignmentWorksheet={(a) => {
            setWorksheetAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
            setView("worksheet");
          }}
          onNewClass={() => setShowCreateClassModal(true)}
          onAssignClass={(c) => {
            setSelectedClass(c);
            setView("create-assignment");
            setAssignmentStep(1);
            setSelectedWords([]);
            setAssignmentTitle("");
            setAssignmentDeadline("");
            setAssignmentModes([]);
            setAssignmentSentences([]);
            setEditingAssignment(null);
          }}
          onDeleteClass={(classId) => handleDeleteClass(classId)}
          editingClass={editingClass}
          onEditClass={(c) => setEditingClass(c)}
          onCloseEditClass={() => setEditingClass(null)}
          onSaveClassEdit={async (next) => {
            if (!editingClass) return;
            // Direct UPDATE — RLS already lets teachers modify their own
            // classes (see migration 20260402_add_teacher_class_rls).
            // class_id and class_code never change, so all foreign keys
            // (assignments, progress, student_profiles) are preserved.
            const { error } = await supabase
              .from('classes')
              .update({ name: next.name, avatar: next.avatar })
              .eq('id', editingClass.id);
            if (error) {
              showToast('Could not save class changes. Please try again.', 'error');
              return;
            }
            setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, name: next.name, avatar: next.avatar } : c));
            setEditingClass(null);
            showToast('Class updated.', 'success');
          }}
          onNameChange={async (classId, newName) => {
            const { error } = await supabase
              .from('classes')
              .update({ name: newName })
              .eq('id', classId);
            if (error) {
              showToast('Could not update name. Please try again.', 'error');
              return;
            }
            setClasses(prev => prev.map(c => c.id === classId ? { ...c, name: newName } : c));
            showToast('Name updated.', 'success');
          }}
          onAvatarChange={async (classId, newAvatar) => {
            const { error } = await supabase
              .from('classes')
              .update({ avatar: newAvatar })
              .eq('id', classId);
            if (error) {
              showToast('Could not update avatar. Please try again.', 'error');
              return;
            }
            setClasses(prev => prev.map(c => c.id === classId ? { ...c, avatar: newAvatar } : c));
            showToast('Avatar updated.', 'success');
          }}
          onEditAssignment={(assignment, c) => {
            setEditingAssignment(assignment);
            const knownIds = assignment.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
            const unknownWords: Word[] = (assignment.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
            const customIds = unknownWords.map(w => w.id);
            setSelectedWords([...assignment.wordIds, ...customIds]);
            setCustomWords(unknownWords);
            setAssignmentTitle(assignment.title);
            setAssignmentDeadline(assignment.deadline || '');
            setAssignmentModes(assignment.allowedModes ?? ALL_GAME_MODES);
            setAssignmentSentences(assignment.sentences ?? []);
            setSentenceDifficulty((assignment.sentenceDifficulty ?? 2) as 1 | 2 | 3 | 4);
            setSentencesAutoGenerated(true);
            if (knownIds.some(id => SET_1_WORDS.some(w => w.id === id))) setSelectedLevel("Set 1");
            else if (unknownWords.length > 0) setSelectedLevel("Custom");
            else setSelectedLevel("Set 2");
            setSelectedClass(c);
            setView("create-assignment");
          }}
          onDuplicateAssignment={(assignment, c) => {
            setEditingAssignment(assignment);
            const knownIds = assignment.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
            const unknownWords: Word[] = (assignment.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
            const customIds = unknownWords.map(w => w.id);
            setSelectedWords([...assignment.wordIds, ...customIds]);
            setCustomWords(unknownWords);
            setAssignmentTitle(assignment.title + ' (copy)');
            setAssignmentDeadline(assignment.deadline || '');
            setAssignmentModes(assignment.allowedModes ?? ALL_GAME_MODES);
            setAssignmentSentences(assignment.sentences ?? []);
            setSentenceDifficulty((assignment.sentenceDifficulty ?? 2) as 1 | 2 | 3 | 4);
            setSentencesAutoGenerated(true);
            if (knownIds.some(id => SET_1_WORDS.some(w => w.id === id))) setSelectedLevel("Set 1");
            else if (unknownWords.length > 0) setSelectedLevel("Custom");
            else setSelectedLevel("Set 2");
            setSelectedClass(c);
            setView("create-assignment");
          }}
          onDeleteAssignment={async (assignment) => {
            const { error } = await supabase.from('assignments').delete().eq('id', assignment.id);
            if (error) {
              showToast("Failed to delete assignment: " + error.message, "error");
              return;
            }
            setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id));
            showToast("Assignment deleted successfully", "success");
          }}
          savedTasks={savedTasks.tasks}
          onTogglePinSavedTask={savedTasks.togglePin}
          onRemoveSavedTask={savedTasks.remove}
          onUseSavedTask={(task: SavedTask) => {
            // Resolve word IDs back to full Word objects.  IDs that no
            // longer exist in ALL_WORDS are silently skipped — that
            // happens if the teacher deleted a custom word after saving
            // the template.
            const resolvedWords = task.wordIds
              .map(id => ALL_WORDS.find(w => w.id === id))
              .filter((w): w is Word => Boolean(w));
            const resolvedIds = resolvedWords.map(w => w.id);

            savedTasks.bumpUse(task.id);

            if (task.mode === 'quick-play') {
              setQuickPlaySelectedWords(resolvedWords);
              setQuickPlayInitialModes(task.modes);
              setView('quick-play-setup');
              return;
            }

            // Assignment template — needs a class context.  Default to
            // the teacher's first class so the wizard can render; the
            // teacher can change class via the Back button if needed.
            const targetClass = selectedClass ?? classes[0];
            if (!targetClass) {
              showToast('Create a class first to use this template.', 'info');
              return;
            }

            setSelectedClass(targetClass);
            setSelectedWords(resolvedIds);
            setAssignmentTitle(task.title);
            setAssignmentDeadline('');
            setAssignmentModes(task.modes);
            setAssignmentSentences(task.sentences ?? []);
            if (task.sentenceDifficulty !== undefined) {
              setSentenceDifficulty(task.sentenceDifficulty);
            }
            setEditingAssignment(null);
            setView('create-assignment');
            setAssignmentStep(1);
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === "create-assignment" && selectedClass) {
    return (
      <LazyWrapper loadingMessage="Loading assignment wizard...">
      <CreateAssignmentView
        selectedClass={selectedClass}
        allWords={ALL_WORDS}
        set1Words={SET_1_WORDS}
        set2Words={SET_2_WORDS}
        customWords={customWords}
        onSaveTemplate={savedTasks.save}
        assignmentTitle={assignmentTitle}
        setCustomWords={setCustomWords}
        setAssignmentTitle={setAssignmentTitle}
        assignmentDeadline={assignmentDeadline}
        setAssignmentDeadline={setAssignmentDeadline}
        assignmentModes={assignmentModes}
        setAssignmentModes={setAssignmentModes}
        selectedWords={selectedWords}
        setSelectedWords={setSelectedWords}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        tagInput={tagInput}
        setTagInput={setTagInput}
        pastedText={pastedText}
        setPastedText={setPastedText}
        showPasteDialog={showPasteDialog}
        setShowPasteDialog={setShowPasteDialog}
        pasteMatchedCount={pasteMatchedCount}
        pasteUnmatched={pasteUnmatched}
        handlePasteSubmit={handlePasteSubmit}
        handleAddUnmatchedAsCustom={handleAddUnmatchedAsCustom}
        handleSkipUnmatched={handleSkipUnmatched}
        handleTagInputKeyDown={handleTagInputKeyDown}
        handleDocxUpload={handleDocxUpload}
        handleOcrUpload={handleOcrUpload}
        handleSaveAssignment={handleSaveAssignment}
        assignmentSentences={assignmentSentences}
        setAssignmentSentences={setAssignmentSentences}
        sentenceDifficulty={sentenceDifficulty}
        setSentenceDifficulty={setSentenceDifficulty}
        isOcrProcessing={isOcrProcessing}
        ocrProgress={ocrProgress}
        ocrStatus={ocrStatus}
        showTopicPacks={showTopicPacks}
        setShowTopicPacks={setShowTopicPacks}
        showAssignmentWelcome={showAssignmentWelcome}
        setShowAssignmentWelcome={setShowAssignmentWelcome}
        TOPIC_PACKS={TOPIC_PACKS}
        onBack={() => {
          setEditingAssignment(null);
          setView("teacher-dashboard");
        }}
        editingAssignment={editingAssignment}
        setEditingAssignment={setEditingAssignment}
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText)}
        onAiGenerateWords={handleAiGenerateWords}
        onGenerateLesson={handleGenerateLesson}
      />
      </LazyWrapper>
    );
  }


  if (view === "game" && showModeSelection) {
    return (
      <LazyWrapper loadingMessage="Loading game modes...">
        <GameModeSelectionView
          activeAssignment={activeAssignment}
          studentProgress={studentProgress}
          isQuickPlayGuest={!!user?.isGuest}
          quickPlayCompletedModes={quickPlayCompletedModes}
          setGameMode={setGameMode}
          setShowModeSelection={setShowModeSelection}
          setShowModeIntro={setShowModeIntro}
          handleExitGame={handleExitGame}
        />
      </LazyWrapper>
    );
  }

  if (view === "live-challenge" && selectedClass) {
    return (
      <LazyWrapper loadingMessage="Loading live challenge...">
        <LiveChallengeView
          selectedClass={selectedClass}
          leaderboard={leaderboard}
          socketConnected={socketConnected}
          setView={setView}
          setIsLiveChallenge={setIsLiveChallenge}
        />
      </LazyWrapper>
    );
  }
  // Fallback: view === "live-challenge" but selectedClass was cleared (can
  // happen after a hardware-back + state reset, or if a student lands on
  // this teacher-only view directly).  Previously this rendered NOTHING
  // (white page), then popstate kicked the user to the landing page
  // without the teacher-login tab visible.  Redirect to the right home
  // view instead so students get their dashboard back and teachers can
  // re-select a class.
  if (view === "live-challenge" && !selectedClass) {
    // useEffect-style redirect without the hook — render a calm loading
    // state while we schedule the navigation change.
    setTimeout(() => {
      setIsLiveChallenge(false);
      if (user?.role === 'teacher') setView('live-challenge-class-select');
      else if (user?.role === 'student') setView('student-dashboard');
      else setView('public-landing');
    }, 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="font-black text-lg">Redirecting…</p>
          <p className="text-white/80 text-sm mt-1">Taking you back to your home screen.</p>
        </div>
      </div>
    );
  }

  if (view === "global-leaderboard") {
    return (
      <LazyWrapper loadingMessage="Loading leaderboard...">
        <GlobalLeaderboardView
          userRole={user?.role}
          setView={setView}
          globalLeaderboard={globalLeaderboard}
        />
      </LazyWrapper>
    );
  }

  // "students" view merged into gradebook — redirect if somehow navigated here
  // (wrapped in useEffect-safe pattern to avoid setState during render)
  if (view === "students") {
    // Return a loading state while the effect below redirects
    return <div className="min-h-screen flex items-center justify-center bg-stone-100"><RefreshCw className="animate-spin text-blue-700" size={48} /></div>;
  }

  if (view === "teacher-approvals") {
    return (
      <LazyWrapper loadingMessage="Loading approvals...">
        <TeacherApprovalsView
          user={user}
          pendingStudents={pendingStudents}
          toasts={toasts}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          setView={setView}
          loadPendingStudents={loadPendingStudents}
          handleApproveStudent={handleApproveStudent}
          handleRejectStudent={handleRejectStudent}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  if (view === "quick-play-setup") {
    return (
      <LazyWrapper loadingMessage="Loading quick play setup...">
      <QuickPlaySetupView
        allWords={ALL_WORDS}
        onSaveTemplate={savedTasks.save}
        initialSelectedWords={quickPlayInitialWords}
        initialSelectedModes={quickPlayInitialModes}
        // use2026WordInput + OCR/DOCX handlers + custom-words state make
        // Quick Play's step 1 look and behave identically to Assignment's.
        // Without these the QP teacher got the older WordInputStep UI
        // (just paste + topics) while assignment teachers got the richer
        // 2026 redesign (library, OCR photo, DOCX upload, custom words).
        use2026WordInput={true}
        onOcrUpload={handleOcrUpload}
        isOcrProcessing={isOcrProcessing}
        ocrProgress={ocrProgress}
        onDocxUpload={handleDocxUpload}
        customWords={customWords}
        onCustomWordsChange={setCustomWords}
        onCreateSession={async (words, modes) => {
          // Creates the Quick Play session in the DB and returns the 6-char
          // session code so QuickPlaySetupView can render its success
          // screen. The title/notes parameters are accepted by the
          // prop signature but not yet persisted — we can add columns to
          // quick_play_sessions in a follow-up if teachers want to see
          // labelled sessions in their history.
          const dbWords = words.filter(w => w.id >= 0);
          const customWords = words.filter(w => w.id < 0);
          const wordIds = dbWords.map(w => w.id);

          const customWordsJson = customWords.length > 0 ? JSON.stringify(
            customWords.map(w => ({
              english: w.english,
              hebrew: w.hebrew,
              arabic: w.arabic,
            }))
          ) : null;

          const { data, error } = await supabase.rpc('create_quick_play_session', {
            p_word_ids: wordIds.length > 0 ? wordIds : null,
            p_custom_words: customWordsJson,
            p_allowed_modes: modes
          });

          if (error) {
            showToast("Failed to create session: " + error.message, "error");
            throw error;
          }

          const session = data as { id: string; session_code: string; allowed_modes?: string[] };
          // Prefer the server's echoed allowed_modes over the local `modes`
          // array so we're always in agreement with what the DB actually
          // persisted — if the RPC future-normalises or validates modes,
          // we inherit that.
          const effectiveAllowedModes = session.allowed_modes && session.allowed_modes.length > 0
            ? session.allowed_modes
            : modes;
          setQuickPlaySessionCode(session.session_code);
          setQuickPlayActiveSession({
            id: session.id,
            sessionCode: session.session_code,
            wordIds: wordIds,
            words,
            allowedModes: effectiveAllowedModes,
          });

          // Fire-and-forget: generate AI sentences for this Quick Play
          // session and store them on the row so every student who joins
          // reads the same high-quality sentences (especially Fill in
          // the Blank).  If this fails, the student-side falls back to
          // template sentences, exactly like before this feature shipped.
          void generateAndStoreQuickPlayAiSentences(session.id, words, 2);

          try {
            // Session just successfully launched — clear the skip-restore
            // flag that was set when the teacher clicked "Quick Play" from
            // the dashboard. If we leave it set, the next auth state change
            // (tab refocus, token refresh) will hit the restore branch at
            // the top of fetchUserProfile, see the flag, and silently wipe
            // this brand-new session + kick the teacher back to the
            // dashboard. That's the "monitor keeps disappearing" bug.
            sessionStorage.removeItem('vocaband_skip_restore');
            localStorage.setItem('vocaband_quick_play_session', JSON.stringify({
              id: session.id,
              words,
              allowedModes: effectiveAllowedModes,
            }));
          } catch { /* quota exceeded — safe to ignore, UI still works */ }

          return session.session_code;
        }}
        onOpenMonitor={() => setView("quick-play-teacher-monitor")}
        onBack={() => setView("teacher-dashboard")}
        autoMatchPartial={true}
        showLevelFilter={false}
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText)}
        onTranslateWord={translateWord}
        onAiGenerateWords={handleAiGenerateWords}
        onGenerateLesson={handleGenerateLesson}
        topicPacks={TOPIC_PACKS}
        user={user}
        onLogout={() => supabase.auth.signOut()}
        // Sentence Builder config — without these props the Sentence
        // Difficulty buttons in ConfigureStep call an undefined handler
        // and silently no-op (user-reported "not clickable"), and the
        // AI-sentences button generates fine but has nowhere to store
        // the output because onSentencesChange is undefined.
        // QuickPlaySetupView spreads {...rest} into SetupWizard, so
        // forwarding them here reaches ConfigureStep without further
        // plumbing.
        assignmentSentences={assignmentSentences}
        onSentencesChange={setAssignmentSentences}
        sentenceDifficulty={sentenceDifficulty}
        onSentenceDifficultyChange={setSentenceDifficulty}
      />
      </LazyWrapper>
    );
  }


  if (view === "class-show") {
    // Build the word-source list: optional pre-filled assignment.
    // The setup panel selects index 0 automatically; if an assignment
    // is pre-filled, it goes first.
    const sources: { label: string; description?: string; words: Word[] }[] = [];
    if (classShowAssignment) {
      const knownWords = ALL_WORDS.filter(w => classShowAssignment.wordIds.includes(w.id));
      const customs = classShowAssignment.customWords ?? [];
      const merged = [...knownWords, ...customs.filter(c => !knownWords.some(k => k.id === c.id))];
      if (merged.length > 0) {
        sources.push({
          label: classShowAssignment.title || "Assignment",
          description: "From assignment",
          words: merged,
        });
      }
    }
    return (
      <LazyWrapper loadingMessage="Loading class show…">
        <ClassShowView
          user={user}
          initialSources={sources}
          initialSourceIndex={0}
          pickerWiring={{
            allWords: ALL_WORDS,
            onTranslateWord: translateWord,
            onTranslateBatch: translateWordsBatch,
            onOcrUpload: handleOcrUpload,
            onAiGenerateWords: handleAiGenerateWords,
            topicPacks: TOPIC_PACKS,
            // savedGroups: pass [] for now — wiring useSavedWordGroups
            // through App-level state is a future PR.  WordPicker's
            // SavedGroupsPanel renders an empty state cleanly when [].
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setClassShowAssignment(null);
            setView("teacher-dashboard");
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === "worksheet") {
    const sources: { label: string; description?: string; words: Word[] }[] = [];
    if (worksheetAssignment) {
      const knownWords = ALL_WORDS.filter(w => worksheetAssignment.wordIds.includes(w.id));
      const customs = worksheetAssignment.customWords ?? [];
      const merged = [...knownWords, ...customs.filter(c => !knownWords.some(k => k.id === c.id))];
      if (merged.length > 0) {
        sources.push({
          label: worksheetAssignment.title || "Assignment",
          description: "From assignment",
          words: merged,
        });
      }
    }
    return (
      <LazyWrapper loadingMessage="Loading worksheet builder…">
        <WorksheetView
          user={user}
          initialSources={sources}
          initialSourceIndex={0}
          initialTitle={worksheetAssignment?.title}
          className={worksheetAssignment?.className ?? null}
          pickerWiring={{
            allWords: ALL_WORDS,
            onTranslateWord: translateWord,
            onTranslateBatch: translateWordsBatch,
            onOcrUpload: handleOcrUpload,
            onAiGenerateWords: handleAiGenerateWords,
            topicPacks: TOPIC_PACKS,
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setWorksheetAssignment(null);
            setView("teacher-dashboard");
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === "quick-play-teacher-monitor") {
    if (!quickPlayActiveSession) {
      setView("quick-play-setup");
      return null;
    }
    return (
      <LazyWrapper loadingMessage="Loading session monitor...">
        <QuickPlayTeacherMonitorView
          quickPlayActiveSession={quickPlayActiveSession}
          quickPlayJoinedStudents={quickPlayJoinedStudents}
          setQuickPlayJoinedStudents={setQuickPlayJoinedStudents}
          setView={setView}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          setQuickPlaySelectedWords={setQuickPlaySelectedWords}
          setQuickPlaySessionCode={setQuickPlaySessionCode}
          setQuickPlayCustomWords={setQuickPlayCustomWords}
          setQuickPlayAddingCustom={setQuickPlayAddingCustom}
          setQuickPlayTranslating={setQuickPlayTranslating}
          cleanupSessionData={cleanupSessionData}
          showToast={showToast}
          realtimeStatus={quickPlayRealtimeStatus}
        />
      </LazyWrapper>
    );
  }

  // Single "Classroom" entry point now wraps Analytics + Gradebook under
  // a tabbed UI (Pulse / Mastery / Records). Legacy /analytics and
  // /gradebook view strings still resolve here so existing dashboard
  // buttons + history-stack entries keep working — they just land on
  // the matching tab inside the merged view.
  if (view === "classroom" || view === "analytics" || view === "gradebook") {
    // Legacy /analytics → Mastery tab, legacy /gradebook → Pulse tab
    // (Records tab was removed — its content lived inside Pulse anyway).
    const initialTab = view === "analytics" ? "mastery" : "pulse";
    return (
      <LazyWrapper loadingMessage="Loading classroom...">
        <ClassroomView
          user={user}
          classes={classes}
          allScores={allScores}
          teacherAssignments={teacherAssignments}
          classStudents={classStudents}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedWords={selectedWords}
          setSelectedWords={setSelectedWords}
          expandedStudent={expandedStudent}
          setExpandedStudent={setExpandedStudent}
          setView={setView}
          showToast={showToast}
          initialTab={initialTab}
        />
      </LazyWrapper>
    );
  }

  if (view === "live-challenge-class-select") {
    return (
      <LazyWrapper loadingMessage="Loading classes...">
        <LiveChallengeClassSelectView
          user={user}
          classes={classes}
          socket={socket}
          setView={setView}
          setSelectedClass={setSelectedClass}
          setIsLiveChallenge={setIsLiveChallenge}
        />
      </LazyWrapper>
    );
  }

  if (isFinished) {
    return (
      <LazyWrapper loadingMessage="Loading results...">
        <GameFinishedView
          user={user}
          score={score}
          xp={xp}
          streak={streak}
          badges={badges}
          mistakes={mistakes}
          gameWords={gameWords}
          quickPlaySessionCode={quickPlayActiveSession?.sessionCode}
          isSaving={isSaving}
          saveError={saveError}
          toasts={toasts}
          confirmDialog={confirmDialog}
          setConfirmDialog={setConfirmDialog}
          setIsFinished={setIsFinished}
          setScore={setScore}
          setCurrentIndex={setCurrentIndex}
          setMistakes={setMistakes}
          setFeedback={setFeedback}
          setWordAttempts={setWordAttempts}
          setHiddenOptions={setHiddenOptions}
          setSpellingInput={setSpellingInput}
          setAssignmentWords={setAssignmentWords}
          setShowModeSelection={setShowModeSelection}
          setView={setView}
          onQuickPlayExit={() => {
            cleanupSessionData();
            cleanupQuickPlayGuest().catch(() => { /* fire-and-forget */ });
            setQuickPlayActiveSession(null);
            setQuickPlayStudentName("");
            setUser(null);
            setView("public-landing");
          }}
        />
      </LazyWrapper>
    );
  }

  // Mode intro instructions with translations
  if (showModeIntro) {
    return (
      <LazyWrapper loadingMessage="Loading...">
        <GameModeIntroView
          gameMode={gameMode}
          hasChosenLanguage={hasChosenLanguage}
          setHasChosenLanguage={setHasChosenLanguage}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          setShowModeIntro={setShowModeIntro}
          setShowModeSelection={setShowModeSelection}
          onLetsGo={() => {
            gameDebug.logModeIntroComplete({ mode: gameMode });
            gameDebug.logState({
              view,
              gameMode,
              showModeSelection,
              showModeIntro: false,
              currentIndex,
              isFinished,
              feedback,
              isProcessing: isProcessingRef.current,
              currentWord: currentWord ? { id: currentWord.id, english: currentWord.english } : undefined,
            }, 'lets_go_clicked');
            setShowModeIntro(false);
          }}
        />
      </LazyWrapper>
    );
  }

  return (
    <LazyWrapper loadingMessage="Loading game...">
      <GameActiveView
        user={user}
        setUser={setUser}
        saveError={saveError}
        setSaveError={setSaveError}
        score={score}
        xp={xp}
        streak={streak}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
        gameMode={gameMode}
        gameWords={gameWords}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        currentWord={currentWord}
        feedback={feedback}
        options={options}
        hiddenOptions={hiddenOptions}
        setHiddenOptions={setHiddenOptions}
        isMatchingProcessing={isMatchingProcessing}
        matchingPairs={matchingPairs}
        matchedIds={matchedIds}
        selectedMatch={selectedMatch}
        tfOption={tfOption}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        isProcessingRef={isProcessingRef}
        scrambledWord={scrambledWord}
        revealedLetters={revealedLetters}
        spellingInput={spellingInput}
        setSpellingInput={setSpellingInput}
        activeAssignment={activeAssignment}
        sentenceIndex={sentenceIndex}
        sentenceFeedback={sentenceFeedback}
        builtSentence={builtSentence}
        setBuiltSentence={setBuiltSentence}
        availableWords={availableWords}
        setAvailableWords={setAvailableWords}
        leaderboard={leaderboard}
        isFinished={isFinished}
        handleExitGame={handleExitGame}
        handleAnswer={handleAnswer}
        handleMatchClick={handleMatchClick}
        handleTFAnswer={handleTFAnswer}
        handleFlashcardAnswer={handleFlashcardAnswer}
        handleSpellingSubmit={handleSpellingSubmit}
        handleSentenceWordTap={handleSentenceWordTap}
        handleSentenceCheck={handleSentenceCheck}
        speakWord={speakWord}
        speak={speak}
        shuffle={shuffle}
      />
    </LazyWrapper>
  );
};