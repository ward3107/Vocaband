import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import type { View } from "./core/views";
import { type VocaId, ACTIVE_VOCA_KEY, getEntitledVocas } from "./core/subject";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import type { Word } from "./data/vocabulary";
import { useVocabularyLazy, getCachedVocabulary } from "./hooks/useVocabularyLazy";
import { generateSentencesForAssignment } from "./data/sentence-bank";
import {
  RefreshCw,
  AlertTriangle,
  ArrowLeftRight,
} from "lucide-react";
// motion is no longer imported eagerly here. Its three eager consumers
// (CookieBanner, QuickPlayResumeBanner, ImageCropModal — all defined
// further down as React.lazy) carry it in their own chunks now, so the
// ~43 kB gz motion bundle drops out of the App.tsx modulepreload chain
// on cold first-paint. AnimatePresence / motion.div weren't used in
// this file anyway, so the original `import { motion, AnimatePresence }`
// was a dead import.
import { supabase, isSupabaseConfigured, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, hasTeacherAccess, performUserLogout, USER_COLUMNS, CLASS_COLUMNS, ASSIGNMENT_COLUMNS, PROGRESS_COLUMNS, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { freshTrialEndsAt, isPro } from "./core/plan";
import { enqueueQuickPlaySave, enqueueAssignmentSave, installQuickPlayQueueFlusher, subscribeQueueDepth } from "./core/saveQueue";
import { clearAllReadCache } from "./core/readCache";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { setSentryUser, clearSentryUser } from "./core/sentry";
import { useAudio } from "./hooks/useAudio";
import { useLanguage } from "./hooks/useLanguage";
import { appToastsT } from "./locales/app-toasts";
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
import { logAudit } from './utils/audit';
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
const ShopView = lazy(() => import("./views/ShopMarketplaceView"));
const PrivacySettingsView = lazy(() => import("./views/PrivacySettingsView"));
const GlobalLeaderboardView = lazy(() => import("./views/GlobalLeaderboardView"));
const TeacherApprovalsView = lazy(() => import("./views/TeacherApprovalsView"));
const WorksheetAttemptsView = lazy(() => import("./views/WorksheetAttemptsView"));
const CreateAssignmentView = lazy(() => import("./views/CreateAssignmentView"));
// AnalyticsView + GradebookView are no longer routed directly here —
// they're now lazy-loaded inside ClassroomView and rendered as tabs.
const ClassroomView = lazy(() => import("./views/ClassroomView"));
const StudentAccountLoginView = lazy(() => import("./views/StudentAccountLoginView"));
const ClassRosterModal = lazy(() => import("./components/ClassRosterModal"));
const QuickPlaySetupView = lazy(() => import("./views/QuickPlaySetupView"));
const QuickPlayTeacherMonitorView = lazy(() => import("./views/QuickPlayTeacherMonitorView"));
const ClassShowView = lazy(() => import("./views/ClassShowView"));
const HotSeatView = lazy(() => import("./views/HotSeatView"));
const HebrewClassShowView = lazy(() => import("./views/HebrewClassShowView"));
const WorksheetView = lazy(() => import("./views/WorksheetView"));
const HebrewWorksheetView = lazy(() => import("./views/HebrewWorksheetView"));
const HebrewComingSoonView = lazy(() => import("./views/HebrewComingSoonView"));
const HebrewQuickPlaySetupView = lazy(() => import("./views/HebrewQuickPlaySetupView"));
const VocabagrutShell = lazy(() => import("./features/vocabagrut/VocabagrutShell"));
const QuickPlayStudentView = lazy(() => import("./views/QuickPlayStudentView"));
const LiveChallengeClassSelectView = lazy(() => import("./views/LiveChallengeClassSelectView"));
const LiveChallengeView = lazy(() => import("./views/LiveChallengeView"));
const GameModeIntroView = lazy(() => import("./views/GameModeIntroView"));
const GameModeSelectionView = lazy(() => import("./views/GameModeSelectionView"));
const GameFinishedView = lazy(() => import("./views/GameFinishedView"));
const GameActiveView = lazy(() => import("./views/GameActiveView"));
const StudentDashboardView = lazy(() => import("./views/StudentDashboardView"));
const TeacherDashboardView = lazy(() => import("./views/TeacherDashboardView"));
const VocaPickerView = lazy(() => import("./views/VocaPickerView"));
const VocaHebrewDashboardView = lazy(() => import("./views/VocaHebrewDashboardView"));
const NiqqudModeView = lazy(() => import("./views/NiqqudModeView"));
const ShoreshHuntView = lazy(() => import("./views/ShoreshHuntView"));
const SynonymMatchView = lazy(() => import("./views/SynonymMatchView"));
const ListeningModeView = lazy(() => import("./views/ListeningModeView"));
const HebrewModeSelectionView = lazy(() => import("./views/HebrewModeSelectionView"));
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
// ImageCropModal moved to a React.lazy at the top of this file.
import { setGuideStore, type GuideKey } from "./hooks/useFirstTimeGuide";
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
import { useQuickPlaySocket, disconnectQuickPlaySocket } from "./hooks/useQuickPlaySocket";
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

  const [view, setView] = useState<View>(() => {
    if (quickPlaySessionParam) return "quick-play-student";
    if (window.location.pathname === "/accessibility-statement") return "accessibility-statement";
    // Public interactive worksheet — WhatsApp-shareable link teachers paste
    // from the Free Resources page.  Path is /w/<slug>; the slug is read in
    // the render switch below.  Auth state is ignored, since logged-in
    // teachers should also be able to test their own shares.
    if (window.location.pathname.startsWith("/w/")) return "public-interactive-worksheet";
    // Dedicated student URL — `vocaband.com/student` lands directly on
    // the student login page, separate from the teacher-focused
    // marketing landing.  Teachers can share this URL with their class.
    if (window.location.pathname === "/student") return "student-account-login";
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

  // First-time-guide persistence — push the signed-in teacher's
  // dismissed-guide list into the module-level store consumed by
  // useFirstTimeGuide.  On dismissal, the hook calls markSeen here
  // which appends to user.guides_seen + writes it back to Supabase, so
  // a teacher signing in on a second device never re-sees a guide they
  // already closed.  Students/guests get null → hook falls back to
  // localStorage (still works, just per-device).
  useEffect(() => {
    if (!user || !hasTeacherAccess(user)) {
      setGuideStore(null);
      return;
    }
    const seen = user.guidesSeen ?? [];
    setGuideStore({
      seen,
      markSeen: async (key: GuideKey) => {
        if (seen.includes(key)) return;
        const next = Array.from(new Set([...seen, key]));
        // Optimistic in-memory update first — the dashboard re-renders
        // immediately without waiting for the round-trip.
        setUser(prev => prev ? { ...prev, guidesSeen: next } : prev);
        const { error } = await supabase
          .from("users")
          .update({ guides_seen: next })
          .eq("uid", user.uid);
        if (error) {
          // Roll back the optimistic update so a retry from another
          // device can re-attempt.  localStorage still suppresses
          // re-shows on THIS device until storage clears.
          console.warn("[guides] persist failed; rolling back:", error);
          setUser(prev => prev ? { ...prev, guidesSeen: seen } : prev);
        }
      },
    });
    return () => {
      setGuideStore(null);
    };
  }, [user]);

  // Voca routing — teachers belong to exactly one Voca (users.subject)
  // so getEntitledVocas returns a single id and their activeVoca is
  // auto-set without showing the picker.  Admins are entitled to every
  // Voca and land on the picker until they pick one for this session.
  useEffect(() => {
    if (!user || !hasTeacherAccess(user)) return;
    const entitled = getEntitledVocas(user);
    if (entitled.length === 0) return; // shouldn't happen for teacher/admin
    if (entitled.length === 1) {
      if (activeVoca !== entitled[0]) setActiveVoca(entitled[0]);
      return;
    }
    // 2+ Vocas (admin only): must pick.  If we're sitting on
    // teacher-dashboard without a pick, send to picker.  Don't redirect
    // mid-flow (create-assignment, classroom, etc.) — only the
    // dashboard entry-point triggers this.
    if (!activeVoca && view === "teacher-dashboard") {
      setView("voca-picker");
    }
  }, [user, activeVoca, view]);

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

  const handlePublicNavigate = (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "resources" | "status") => {
    const viewMap = {
      home: "public-landing",
      terms: "public-terms",
      privacy: "public-privacy",
      accessibility: "accessibility-statement",
      security: "public-security",
      resources: "public-free-resources",
      status: "public-status",
    } as const;
    setView(viewMap[page]);
  };
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
      const error = await response.json().catch(() => ({}));
      const isPaywall = response.status === 403 && error.error === 'ai_requires_pro';
      const msg = error.message || error.error || 'AI lesson generation failed';
      if (isPaywall) showPaywallToast(msg);
      throw new Error(msg);
    }

    return await response.json();
  };

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

  useEffect(() => { userRef.current = user; }, [user]);

  // Pipe the signed-in user to Sentry so any error after this point is
  // tagged with who hit it ("this crash affected 14 students in class X").
  // Cleared on logout so a subsequent anonymous error isn't attributed
  // to the previous session.
  useEffect(() => {
    if (user?.uid) {
      setSentryUser({ uid: user.uid, role: user.role ?? undefined, email: user.email ?? undefined });
    } else {
      clearSentryUser();
    }
  }, [user?.uid, user?.role, user?.email]);

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
        // `is_anonymous` is on auth.users but not in the public type
        // surfaced to clients, so cast through the indexable shape to
        // read it without losing the rest of the type info.
        const supabaseUserAny = supabaseUser as unknown as {
          id: string;
          is_anonymous?: boolean;
          app_metadata?: { provider?: string };
        };
        const isAnonymous = !!supabaseUserAny.is_anonymous || supabaseUserAny.app_metadata?.provider === 'anonymous';
        // Speculatively fetch teacher-owned classes in parallel with the
        // users row. For teachers this halves login latency — the two
        // round-trips overlap instead of running back-to-back. For
        // students it's a cheap RLS-filtered query that returns []
        // (they're not the teacher_uid owner of any class) so no harm.
        // PostgrestBuilder is PromiseLike, so to chain .catch we wrap in
        // Promise.resolve() (gets us a real Promise, .catch works).
        const speculativeClassesPromise: Promise<ClassData[]> = isAnonymous
          ? Promise.resolve([] as ClassData[])
          : Promise.resolve(
              supabase
                .from('classes')
                .select(CLASS_COLUMNS)
                .eq('teacher_uid', supabaseUser.id)
                .then(r => (r.data ?? []).map(mapClass))
            ).catch(() => [] as ClassData[]);
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
          //
          // Only reject when the DB role is 'student' — admins are a
          // superset of teachers and must be allowed through the teacher
          // entrance (see hasTeacherAccess in core/supabase).
          const intended = readIntendedRole();
          if (intended?.role === 'teacher' && intended.fresh && userData.role === 'student') {
            clearIntendedRole();
            setError(
              `This Google account (${userData.email ?? 'unknown'}) is registered as a student, not a teacher. ` +
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
          if (hasTeacherAccess(userData)) {
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
                        SET_2_WORDS: m.SET_2_WORDS, SET_3_WORDS: m.SET_3_WORDS,
                        TOPIC_PACKS: m.TOPIC_PACKS,
                      };
                    }
                    // vocabMod is guaranteed non-null here — either the
                    // cached lookup returned something or we just assigned
                    // the dynamic-import shape above.
                    const dbWords = vocabMod!.ALL_WORDS.filter(w => (sessionData.word_ids || []).includes(w.id));
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
              .select('id, email, status, display_name, class_code, xp, avatar')
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
                    setView(hasTeacherAccess(restored) ? "teacher-dashboard" : "student-dashboard");
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

          // Auto-create teacher account for OAuth sign-ins (Google + Microsoft).
          // Anonymous students take the localStorage path above and skip this branch.
          const oauthProvider = supabaseUser.app_metadata?.provider;
          const isOAuthSignIn = oauthProvider === 'google' || oauthProvider === 'azure';
          if (isOAuthSignIn) {
            // First check if this is an OAuth student (they exist in student_profiles, not users)
            // Narrowed select on 2026-04-28 to match the consumer below.
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('id, email, status, display_name, class_code, xp, avatar')
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
            // The teacher_allowlist gate dates from the early-stage
            // soft launch when only invited teachers could sign up.
            // With public freemium pricing live (Free + Pro tiers
            // advertised on the landing page), ANY user who arrived
            // via the teacher flow should be onboarded as a teacher.
            // TeacherLoginCard stamps intended_role="teacher" before
            // both Google OAuth and email-OTP, so reading that flag
            // here lets us honour the user's explicit intent without
            // requiring an admin to pre-add their email.
            //
            // Without this branch, brand-new freemium signups landed
            // on student-account-login (class-code + name form) and
            // had to be told to ask the operator to be allowlisted —
            // which silently broke the public "Start free" promise.
            const teacherIntent = readIntendedRole();
            const wantsTeacher = teacherIntent?.role === 'teacher' && teacherIntent.fresh;
            if (!isAllowed && !wantsTeacher) {
              // No teacher intent + not allowlisted → genuinely a new
              // student arriving via OAuth (e.g. a kid pressed Google
              // on the student login page).  Show the class-code form.
              setOauthEmail(supabaseUser.email || "");
              setOauthAuthUid(supabaseUser.id);
              setShowOAuthClassCode(true);
              setView("student-account-login");
              setLoading(false);
              return;
            }
            // Consumed — clear so a future student-flow login on the
            // same device doesn't accidentally inherit the stamp.
            if (teacherIntent) clearIntendedRole();
            const newUser: AppUser = {
              uid: supabaseUser.id,
              email: supabaseUser.email || "",
              role: "teacher",
              displayName: (supabaseUser.user_metadata?.full_name as string) || (supabaseUser.user_metadata?.name as string) || "Teacher",
              // First-time teacher: start the 30-day Pro trial.  Existing
              // teachers were grandfathered by migration 20260611 so they
              // don't hit this branch.  upsert on uid means re-running this
              // for an already-registered teacher won't overwrite an older
              // (more advanced into the trial / already paying Pro)
              // trial_ends_at, because we only set it when freshly creating
              // the row — see the upsert call below uses ignoreDuplicates
              // semantics via onConflict on uid.
              plan: "free",
              trialEndsAt: freshTrialEndsAt(),
            };
            // Use upsert with ignoreDuplicates=true to handle race
            // conditions (StrictMode double-mount, retry after partial
            // failure) WITHOUT overwriting an already-paying Pro
            // teacher's plan/trial_ends_at on every re-sign-in.  The
            // adjacent comment used to claim this was the case, but the
            // call previously omitted `ignoreDuplicates`, which made
            // Supabase default to ON CONFLICT DO UPDATE — silently
            // downgrading any returning Pro teacher to Free + a fresh
            // 30-day trial.  Same bug also made it possible for the
            // tightened users_update RLS (20260602) to reject the
            // re-sign-in altogether once that migration lands.
            const { error: insertErr } = await supabase
              .from('users')
              .upsert(mapUserToDb(newUser), { onConflict: 'uid', ignoreDuplicates: true });
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
                showToast(appToasts.couldNotRestoreSession, "error");
                setLoading(false);
              }
            } catch {
              showToast(appToasts.signInFailed, "error");
              setLoading(false);
            }
          }, 1500);
          return; // Don't setLoading(false) yet — the retry will handle it
        }
        showToast(appToasts.signInFailed, "error");
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
        } else if (!session?.user) {
          // FALLBACK: no session here means we're logged out. The
          // INITIAL_SESSION event fires shortly after with the same data
          // and its handler clears loading — but on slow mobile networks
          // (and specifically after a logout-triggered location.replace)
          // that event can be delayed past the 20s safety timeout, leaving
          // the teacher staring at a spinner. Clear loading here too, but
          // only when no OAuth callback or saved-student handoff is in
          // play (those paths manage their own loading state inside the
          // INITIAL_SESSION branch and we mustn't clobber them).
          const isOAuthCallback =
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token=");
          const hasOAuthFlag =
            sessionStorage.getItem('oauth_session_ready') ||
            sessionStorage.getItem('oauth_exchange_failed');
          const savedStudent = localStorage.getItem('vocaband_student_login');
          const savedPending = sessionStorage.getItem('vocaband_pending_approval');
          if (!isOAuthCallback && !hasOAuthFlag && !savedStudent && !savedPending) {
            setLoading(false);
          }
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
        // Kill any audio still in flight — word TTS, motivational MP3s,
        // demo speechSynthesis utterances — so the logged-out landing
        // doesn't get serenaded by leftovers from the previous session.
        try { stopAllAudio(); } catch {}
        try { window.speechSynthesis?.cancel(); } catch {}
        // Tear down the cached Quick Play socket explicitly.  It's a
        // module-level singleton with reconnectionAttempts: Infinity, so
        // without this call it would keep retrying WS connections in the
        // background after the user logs out — visible as endless
        // reconnect traffic in the Network tab and a slow memory leak.
        try { disconnectQuickPlaySocket(); } catch {}
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
        // Wipe the SWR read cache (classes/assignments) so the next
        // teacher or student signing in on this device can't see a
        // flash of the previous session's data before their own fetch
        // resolves.  See src/core/readCache.ts.
        try { clearAllReadCache(); } catch {}
        // Students log out back to the student-login screen (not the
        // teacher-focused public landing) so they can immediately re-enter
        // their class code or pick their name.  Teachers/guests/unknown
        // roles still go to the marketing landing.
        const wasStudent = lastUserRoleRef.current === 'student';
        const postLogoutView: View = wasStudent ? 'student-account-login' : 'public-landing';
        lastUserRoleRef.current = null;
        // Swap the URL + reset history state in one shot.  The third arg
        // to replaceState rewrites the path so a stale ?assignment=… or
        // similar query param can't be picked up by bootstrap effects,
        // and the state payload anchors the back-button trap on the
        // public landing entry so pad/dashboard entries from the
        // previous session no longer match.  Previous in-memory state
        // (audio, speech, sockets) is already cleared above — see
        // stopAllAudio / speechSynthesis.cancel / disconnectQuickPlaySocket
        // and the React resets below — so we don't need a hard reload
        // to get a clean slate any more.  Skipping the reload makes
        // logout feel instant (<100 ms vs. the 1–3 s the full page
        // navigation used to take).
        const target = wasStudent ? '/student' : '/';
        if (!quickPlaySessionParam) {
          try { window.history.replaceState({ view: postLogoutView }, '', target); } catch {
            try { window.history.replaceState({ view: postLogoutView }, ''); } catch {}
          }
        } else {
          try { window.history.replaceState({ view: postLogoutView }, ''); } catch {}
        }
        // Clear loading + swap the SPA view so React paints the public
        // landing immediately.  Order matters: setLoading(false) first
        // so any global "Loading…" overlay tears down before the view
        // swap renders the landing tree.
        setLoading(false);
        setView(postLogoutView);
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
              showToast(appToasts.signInTakingTooLong, "error");
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

  // Keep lastUserRoleRef in sync with the live user state so the auth
  // listener (which closes over a stale `user`) can still tell whether the
  // signed-out user was a student vs. a teacher.
  useEffect(() => {
    if (user?.role) lastUserRoleRef.current = user.role;
  }, [user]);


  // ─── GLOBAL TEACHER DASHBOARD THEME ────────────────────────────────────
  // Apply teacher's selected theme globally across all pages. This runs
  // at the App level (not per-view) so the theme persists when navigating
  // between teacher pages without flashing or clearing.
  // - For teachers: applies their dashboard theme CSS variables
  // - For students/public: clears any teacher theme variables
  // Extract theme ID separately to avoid re-running effect on unrelated user updates.
  const teacherThemeId = hasTeacherAccess(user) ? (user as any).teacherDashboardTheme : null;
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
  useEffect(() => {
    const unsubscribe = subscribeQueueDepth((depth) => {
      const prev = queueDepthRef.current;
      queueDepthRef.current = depth;
      if (depth > prev && typeof navigator !== 'undefined' && navigator.onLine === false) {
        showToast(appToasts.savedLocally, 'info');
      } else if (depth === 0 && prev > 0) {
        showToast(appToasts.allSynced, 'success');
      }
    });
    return unsubscribe;
  }, [showToast, appToasts]);


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

  // Deep-link to a specific assignment.  When a teacher shares an
  // assignment via the Share button on its row in ClassCard, the URL
  // carries `&assignment=<id>`.  After the student logs in and lands
  // on their dashboard with assignments loaded, drop them straight
  // into the mode picker for that assignment — skipping the manual
  // dashboard tap a teacher just shortcut for them.  We only consume
  // the pending id once; missing matches silently fall back to the
  // normal dashboard so an outdated link doesn't strand the student.
  useEffect(() => {
    if (!pendingAssignmentId) return;
    if (user?.role !== "student") return;
    if (view !== "student-dashboard") return;
    if (studentAssignments.length === 0) return;
    const match = studentAssignments.find(a => a.id === pendingAssignmentId);
    if (!match) return;
    setActiveAssignment(match);
    setAssignmentWords(match.words ?? []);
    setShowModeSelection(true);
    setView("game");
    setPendingAssignmentId(null);
    // Strip the consumed param so a refresh or back-nav doesn't
    // re-trigger the auto-open after the student left the assignment.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("assignment");
      window.history.replaceState({}, "", url.toString());
    } catch { /* history API unavailable — non-fatal */ }
  }, [pendingAssignmentId, user?.role, view, studentAssignments]);

  // Class Minute entry point — used by both the dashboard widget tap
  // and the teacher-shared ?play=class-minute deep-link.  Pulls SRS-
  // due words first, falls back to current assignments, then
  // SET_2_WORDS as last resort.  See onStartClassMinute prop on
  // StudentDashboardView for the inline flow.
  const startClassMinute = useCallback(async () => {
    const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
    let seedWords: Word[] = [];
    try {
      const { data, error } = await supabase.rpc('get_due_reviews', {
        p_today_local: today,
        p_limit: 20,
      });
      if (!error && Array.isArray(data)) {
        const dueIds = (data as Array<{ word_id: number }>).map(r => r.word_id);
        seedWords = dueIds
          .map(id => ALL_WORDS.find(w => w.id === id))
          .filter((w): w is Word => Boolean(w));
      }
    } catch (err) {
      console.error('[class-minute] get_due_reviews failed:', err);
    }
    if (seedWords.length < 15) {
      const fallbackPool: Word[] = [];
      const seen = new Set(seedWords.map(w => w.id));
      for (const a of studentAssignments) {
        const pool = a.words ?? a.wordIds.map(id => ALL_WORDS.find(w => w.id === id)).filter((w): w is Word => Boolean(w));
        for (const w of pool) {
          if (seen.has(w.id)) continue;
          fallbackPool.push(w);
          seen.add(w.id);
        }
        if (seedWords.length + fallbackPool.length >= 30) break;
      }
      seedWords = [...seedWords, ...fallbackPool];
    }
    if (seedWords.length < 4) {
      seedWords = SET_2_WORDS.slice(0, 20);
    }
    setAssignmentWords(seedWords);
    setGameMode("class-minute");
    setIsFinished(false);
    setShowModeSelection(false);
    setView("game");
  }, [ALL_WORDS, SET_2_WORDS, studentAssignments]);

  // Deep-link to Class Minute.  When a teacher shares the daily-drill
  // link via the Send Class Minute action on ClassCard, the URL carries
  // `?play=class-minute`.  Same gating as the assignment deep-link:
  // student role, dashboard view, and ALL_WORDS loaded (the SRS row
  // hydration needs the vocabulary chunk).  We also wait until
  // studentAssignments has populated at least once so the fallback
  // word pool isn't empty when SRS returns thin — the polling effect
  // above tops it up shortly after login, but the very first render
  // can race.
  //
  // pendingClassSwitch gate: if the student lands on the deep-link
  // mid-class-switch flow (ClassSwitchModal asking "stay or switch?"),
  // wait for that decision before consuming the deep-link.  Otherwise
  // the round launches under whichever class context happens to be
  // active at mount time, which may not be what the student picks.
  useEffect(() => {
    if (pendingPlayMode !== 'class-minute') return;
    if (user?.role !== "student") return;
    if (view !== "student-dashboard") return;
    if (ALL_WORDS.length === 0) return;
    if (pendingClassSwitch) return;
    setPendingPlayMode(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("play");
      window.history.replaceState({}, "", url.toString());
    } catch { /* history API unavailable — non-fatal */ }
    void startClassMinute();
  }, [pendingPlayMode, user?.role, view, ALL_WORDS.length, pendingClassSwitch, startClassMinute]);


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
      student={
        user?.role === 'student' && !user.isGuest
          ? { name: user.displayName || '', classCode: user.classCode ?? null }
          : null
      }
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
          onStartClassMinute={startClassMinute}
          retention={retention}
          boosters={{
            isXpBoosterActive: boosters.isXpBoosterActive,
            isFocusModeActive: boosters.isFocusModeActive,
            isWeekendWarriorActive: boosters.isWeekendWarriorActive,
            streakFreezes: boosters.streakFreezes,
            luckyCharms: boosters.luckyCharms,
          }}
          onGrantXp={(amount, reason) => {
            // Persist retention rewards (daily chest, weekly challenge,
            // comeback, pet evolution) through claim_retention_xp.
            // Direct UPDATE on public.users used to work but RLS now
            // restricts xp writes to SECURITY DEFINER paths — see
            // supabase/migrations/20260514130000_claim_retention_xp.sql
            // for context.  Optimistically bump local xp so the
            // celebration toast lands instantly;  the RPC reconciles
            // (and clamps) authoritatively.
            setXp(prev => prev + amount);
            if (user && amount > 0) {
              supabase.rpc('claim_retention_xp', { p_xp_delta: amount }).then(({ data, error }) => {
                if (error) {
                  console.error('[onGrantXp] claim_retention_xp failed:', error);
                  // Roll back the optimistic bump so the dashboard
                  // doesn't show a phantom XP value the server didn't
                  // accept.
                  setXp(prev => Math.max(0, prev - amount));
                  return;
                }
                const serverXp = (data as { new_xp?: number } | null)?.new_xp;
                if (typeof serverXp === 'number') setXp(serverXp);
              });
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

  // --- SHOP VIEW (single-screen marketplace, lazy-loaded) ---
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
          activateBooster={boosters.activate}
        />
      </LazyWrapper>
    );
  }
  // Voca picker — admin-only entry point.  Teachers have a single
  // users.subject so they auto-route past this view via the routing
  // effect above.  Admins land here on first dashboard visit each
  // session; picking writes activeVoca and routes into that dashboard.
  if (hasTeacherAccess(user) && view === "voca-picker") {
    return (
      <LazyWrapper loadingMessage="Loading...">
        <VocaPickerView
          user={user}
          onPickVoca={(voca) => {
            setActiveVoca(voca);
            setView("teacher-dashboard");
          }}
        />
      </LazyWrapper>
    );
  }
  // VocaHebrew dashboard — entry point into the four native-track
  // games (Niqqud, Shoresh Hunt, Synonym Match, Listening).
  // Switch-Voca returns the teacher to the picker so they can flip
  // back to English without logging out.
  if (hasTeacherAccess(user) && view === "vocahebrew-dashboard") {
    const showSwitcher = getEntitledVocas(user).length >= 2;
    return (
      <LazyWrapper loadingMessage="Loading VocaHebrew...">
        <VocaHebrewDashboardView
          user={user}
          showSwitcher={showSwitcher}
          onSwitchVoca={() => {
            setActiveVoca(null);
            setView("voca-picker");
          }}
          onLaunchNiqqudMode={() => setView("vocahebrew-niqqud")}
          onLaunchShoreshHunt={() => setView("vocahebrew-shoresh")}
          onLaunchSynonymMatch={() => setView("vocahebrew-synonyms")}
          onLaunchListeningMode={() => setView("vocahebrew-listening")}
        />
      </LazyWrapper>
    );
  }
  // Hebrew game views — used by both teachers (solo-launch from the
  // VocaHebrew dashboard) and students (assignment playback).  When
  // there's an active assignment with subject==='hebrew', its
  // wordIds scope the round pool; otherwise the views shuffle the
  // full corpus.  Exit goes back to whatever route makes sense for
  // the role: students back to the mode picker, teachers back to
  // the VocaHebrew dashboard.
  const inHebrewAssignment = activeAssignment?.subject === "hebrew";
  const hebrewLemmaIds = inHebrewAssignment ? activeAssignment?.wordIds : undefined;
  const hebrewExit = () => {
    if (user?.role === "student" && inHebrewAssignment) {
      // Re-show the mode picker so the student can pick another
      // Hebrew game on the same assignment without a full reset.
      setShowModeSelection(true);
      setView("game");
    } else {
      // Solo-launch by a Hebrew teacher returns to the unified
      // dashboard.  The legacy "vocahebrew-dashboard" route is now
      // unreachable from here; its render block is retained as dead
      // code until the Phase 4 cleanup step removes it.
      setView("teacher-dashboard");
    }
  };

  // Persist a Hebrew round's final score to the gradebook.  No-op
  // when there's no active assignment (teacher solo-launch) or no
  // logged-in user (shouldn't happen, but defensive).  Uses the
  // same save_student_progress RPC the English flow uses, with
  // empty mistakes + word_attempts arrays — Hebrew progress doesn't
  // track per-question detail yet.
  const saveHebrewScore = async (
    mode: "niqqud" | "shoresh" | "synonym" | "listening",
    score: number,
    total: number,
  ) => {
    if (!user || !activeAssignment || !inHebrewAssignment) return;

    // Hebrew Quick Play: push the round's raw score to the live podium
    // so the teacher's QuickPlayMonitor leaderboard updates in real
    // time.  Without this branch, only the gradebook recorded the
    // round and every Hebrew student stayed at 0 pts on the projector.
    // Mirrors what the English flow does via useGameFinish's
    // quickPlaySocketUpdateScore callback — accumulate per-mode into
    // the session-wide cumulative ref so consecutive modes don't
    // regress and the server stops accepting updates.
    if (QUICKPLAY_V2 && quickPlayActiveSession) {
      qpCumulativeScoreRef.current += Math.max(0, score);
      quickPlaySocket.updateScore(qpCumulativeScoreRef.current);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUid = session?.user?.id;
      const studentUid = sessionUid
        ? (localStorage.getItem(`vocaband_student_${sessionUid}`) || sessionUid)
        : user.uid;
      // Normalise to a 0-100 percentage so the gradebook can compare
      // Hebrew rounds against English (which already stores capped
      // points).  Total is always > 0 here (we early-returned at
      // round-build time when the pool was empty).
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      await supabase.rpc("save_student_progress", {
        p_student_name: user.displayName,
        p_student_uid: studentUid,
        p_assignment_id: activeAssignment.id,
        p_class_code: user.classCode || "",
        p_score: pct,
        p_mode: mode,
        p_mistakes: [],
        p_avatar: user.avatar || "🦊",
        p_word_attempts: [],
      });
    } catch (err) {
      // Silent — same pattern as the English flow.  The student
      // shouldn't see a network error after their score screen.
      console.error("[VocaHebrew] save_student_progress failed:", err);
    }
  };

  if (view === "vocahebrew-niqqud") {
    return (
      <LazyWrapper loadingMessage="Loading Niqqud Mode...">
        <NiqqudModeView
          onExit={hebrewExit}
          lemmaIds={hebrewLemmaIds}
          onComplete={(s, t) => saveHebrewScore("niqqud", s, t)}
        />
      </LazyWrapper>
    );
  }
  if (view === "vocahebrew-shoresh") {
    return (
      <LazyWrapper loadingMessage="Loading Shoresh Hunt...">
        <ShoreshHuntView
          onExit={hebrewExit}
          lemmaIds={hebrewLemmaIds}
          onComplete={(s, t) => saveHebrewScore("shoresh", s, t)}
        />
      </LazyWrapper>
    );
  }
  if (view === "vocahebrew-synonyms") {
    return (
      <LazyWrapper loadingMessage="Loading Synonym Match...">
        <SynonymMatchView
          onExit={hebrewExit}
          lemmaIds={hebrewLemmaIds}
          onComplete={(s, t) => saveHebrewScore("synonym", s, t)}
        />
      </LazyWrapper>
    );
  }
  if (view === "vocahebrew-listening") {
    return (
      <LazyWrapper loadingMessage="Loading Listening Mode...">
        <ListeningModeView
          onExit={hebrewExit}
          lemmaIds={hebrewLemmaIds}
          onComplete={(s, t) => saveHebrewScore("listening", s, t)}
        />
      </LazyWrapper>
    );
  }
  if (hasTeacherAccess(user) && view === "teacher-dashboard") {
    const showVocaSwitcher = getEntitledVocas(user).length >= 2;
    // Inline Voca switcher rendered inside TopAppBar's controls
    // (passed via TeacherDashboardView's `headerExtra` prop).  Previously
    // floated over the header with `position: fixed`, which covered the
    // logo in Hebrew RTL and the user chip / logout in English LTR no
    // matter how high we pushed the z-index.  Lives in the flex flow
    // now so it just sits beside the language switcher.
    const vocaSwitcherButton = showVocaSwitcher ? (
      <button
        type="button"
        onClick={() => {
          setActiveVoca(null);
          setView("voca-picker");
        }}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-600 text-white text-[10px] sm:text-xs font-black tracking-wider shadow-sm hover:bg-indigo-500 active:scale-95 transition"
        title={activeVoca === "hebrew" ? "החלף ל-Voca אחר" : "Switch to another Voca"}
      >
        <ArrowLeftRight size={12} aria-hidden />
        <span className="hidden sm:inline">
          {activeVoca === "hebrew" ? "החלף Voca" : "Switch Voca"}
        </span>
        <span className="sm:hidden">
          {activeVoca === "hebrew" ? "החלף" : "Switch"}
        </span>
      </button>
    ) : null;
    return (
      <LazyWrapper loadingMessage="Loading dashboard...">
        <TeacherDashboardView
          user={user}
          setUser={setUser}
          subject={activeVoca ?? "english"}
          headerExtra={vocaSwitcherButton}
          consentModal={consentModal}
          exitConfirmModal={exitConfirmModal}
          ocrCropModal={ocrCropModal}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          classes={visibleClasses}
          teacherAssignments={visibleAssignments}
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
              if (error) showToast(appToasts.failedDeleteFromDb(error.message), "error");
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
                  showToast(appToasts.assignmentRestored, "success");
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
          onClassroomClick={() => {
            fetchScores();
            fetchTeacherAssignments();
            setView("classroom");
            // Audit-log the access ONCE per click, not per realtime push.
            // fetchScores re-fires on every progress INSERT, so logging
            // there caused a request storm — see 2026-05-04 audit fix.
            void logAudit('view_gradebook', 'progress');
          }}
          onApprovalsClick={() => { loadPendingStudents(); setView("teacher-approvals"); }}
          onWorksheetResultsClick={activeVoca === "hebrew" ? undefined : () => setView("worksheet-attempts")}
          onProjectAssignmentToClass={(a) => {
            // Direct dashboard entry — back should go to dashboard, not
            // to a possibly-stale create-assignment session.
            setActivityNavOrigin(null);
            setClassShowAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
            setView("class-show");
          }}
          onPrintAssignmentWorksheet={(a) => {
            setActivityNavOrigin(null);
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
            // School branding fields (added 20260512) are nullable so we
            // either send a trimmed string or NULL — never an empty
            // string, which would clutter the DB with meaningless rows.
            const { error } = await supabase
              .from('classes')
              .update({
                name: next.name,
                avatar: next.avatar,
                school_name: next.schoolName?.trim() || null,
                school_logo_url: next.schoolLogoUrl?.trim() || null,
              })
              .eq('id', editingClass.id);
            if (error) {
              showToast('Could not save class changes. Please try again.', 'error');
              return;
            }
            setClasses(prev => prev.map(c => c.id === editingClass.id
              ? { ...c, name: next.name, avatar: next.avatar, schoolName: next.schoolName?.trim() || null, schoolLogoUrl: next.schoolLogoUrl?.trim() || null }
              : c));
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
              showToast(appToasts.failedDeleteAssignment(error.message), "error");
              return;
            }
            setTeacherAssignments(prev => prev.filter(a => a.id !== assignment.id));
            showToast(appToasts.assignmentDeleted, "success");
          }}
          onOpenRoster={(c) => setRosterModalClass(c)}
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
          onWizardComplete={async (result) => {
            // First-class onboarding wizard completion handler.  Creates
            // the class + a starter assignment + marks the teacher
            // onboarded, all in one round-trip.  Returns the new class
            // code so the wizard can show the success step.
            if (!user) return null;
            try {
              // Generate a class code (same alphabet as handleCreateClass —
              // no 0/O/1/I to avoid teacher-typing confusion).
              const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
              const code = Array.from(crypto.getRandomValues(new Uint32Array(8)))
                .map(x => {
                  const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;
                  let v = x;
                  while (v >= limit) v = crypto.getRandomValues(new Uint32Array(1))[0];
                  return alphabet[v % alphabet.length];
                })
                .join('');

              // Insert the class.  Tag with the active Voca so it shows
              // up on the right tab; null/legacy paths fall back to
              // 'english' (matches the DB default).
              const onboardingSubject = activeVoca ?? 'english';
              const { data: classRow, error: classErr } = await supabase
                .from('classes')
                .insert({ name: result.className, teacher_uid: user.uid, code, subject: onboardingSubject })
                .select()
                .single();
              if (classErr || !classRow) throw classErr ?? new Error('class insert failed');

              // Optimistically add to local state so the wizard's gating
              // (classes.length === 0) flips immediately and the modal
              // doesn't reopen on close.
              setClasses(prev => [
                ...prev,
                { id: classRow.id, name: classRow.name, code: classRow.code, teacherUid: user.uid, subject: onboardingSubject },
              ]);

              // Pick starter words from the chosen pack.  For 'custom'
              // we skip the assignment — teacher can build it in the
              // regular flow.
              const vocabMod = getCachedVocabulary();
              let words: { id: number }[] = [];
              if (vocabMod && result.starterPack !== 'custom') {
                const set = result.starterPack === 'set-1' ? vocabMod.SET_1_WORDS
                  : result.starterPack === 'set-3' ? vocabMod.SET_3_WORDS
                  : vocabMod.SET_2_WORDS;
                words = set.slice(0, 20).map(w => ({ id: w.id }));
              }

              if (words.length > 0) {
                await supabase.from('assignments').insert({
                  class_id: classRow.id,
                  word_ids: words.map(w => w.id),
                  title: 'Welcome quiz',
                  allowed_modes: result.modes,
                  created_at: new Date().toISOString(),
                  sentence_difficulty: 2,
                  subject: onboardingSubject,
                });
              }

              // Flip the server flag so the wizard never re-fires.
              // PostgrestBuilder is PromiseLike — wrap in Promise.resolve()
              // to get a real Promise so we can chain .catch.
              await Promise.resolve(supabase.rpc('mark_teacher_onboarded')).catch((err: unknown) => {
                console.error('[onboarding] mark_teacher_onboarded failed:', err);
              });
              setUser(prev => prev ? { ...prev, onboardedAt: new Date().toISOString() } : prev);

              return { classCode: code };
            } catch (err) {
              console.error('[onboarding] wizard completion failed:', err);
              showToast(appToasts.couldNotSetupClass, 'error');
              return null;
            }
          }}
          onWizardSkip={async () => {
            // Mark onboarded so the wizard doesn't reappear.  Don't
            // create anything — the teacher will use the regular
            // class/assignment flows instead.
            try {
              await supabase.rpc('mark_teacher_onboarded');
            } catch (err) {
              console.error('[onboarding] skip mark failed:', err);
            }
            setUser(prev => prev ? { ...prev, onboardedAt: new Date().toISOString() } : prev);
          }}
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
          setActivityNavOrigin(null);
          setView("teacher-dashboard");
        }}
        // The setup wizard's AssignmentData type narrows
        // sentenceDifficulty to `1|2|3|4`; the supabase mapper returns
        // it as `number` (DB is INT, no DB-level CHECK constraint).
        // The runtime value is always 1-4 by row-spec, so the cast is
        // correct at the value level — TS just can't prove it from a
        // `number` parameter type.  Cast both the value and the
        // setter to keep the wizard's tighter typing intact.
        editingAssignment={editingAssignment as unknown as import('./components/setup/types').AssignmentData | null}
        setEditingAssignment={setEditingAssignment as unknown as React.Dispatch<React.SetStateAction<import('./components/setup/types').AssignmentData | null>>}
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText)}
        isProUser={isPro(user)}
        onGenerateLesson={handleGenerateLesson}
        // Activity-type tabs at the top of the wizard.  When the
        // teacher picks a non-Assignment tab, close the wizard and
        // open the chosen tool's view with this class preselected.
        // The existing class-aware entry points
        // (setClassShowAssignment / setWorksheetAssignment) take an
        // assignment-shaped object — for the empty-state launch we
        // pass null so the tool opens to its own picker UI but with
        // the class name pre-filled via selectedClass.
        onSwitchActivity={(type) => {
          // Remember that this tab view was opened from the wizard so
          // its back/exit handler returns here instead of jumping past
          // to the teacher dashboard.
          setActivityNavOrigin('create-assignment');
          if (type === 'class-show') {
            setClassShowAssignment(null);
            setView('class-show');
          } else if (type === 'worksheet') {
            setWorksheetAssignment(null);
            setView('worksheet');
          } else if (type === 'hot-seat') {
            setView('hot-seat');
          } else if (type === 'vocabagrut') {
            setView('vocabagrut');
          }
        }}
      />
      </LazyWrapper>
    );
  }


  if (view === "game" && showModeSelection) {
    // Hebrew assignments get the 4-mode native picker; English ones
    // get the full GameModeSelectionView.  The branch is on the
    // assignment's subject column, set when the teacher created it.
    if (activeAssignment?.subject === "hebrew") {
      return (
        <LazyWrapper loadingMessage="Loading Hebrew modes...">
          <HebrewModeSelectionView
            activeAssignment={activeAssignment}
            onPickMode={(mode) => {
              setShowModeSelection(false);
              if (mode === "niqqud")    setView("vocahebrew-niqqud");
              else if (mode === "shoresh")   setView("vocahebrew-shoresh");
              else if (mode === "synonym")   setView("vocahebrew-synonyms");
              else if (mode === "listening") setView("vocahebrew-listening");
            }}
            onExit={handleExitGame}
          />
        </LazyWrapper>
      );
    }
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
    // VocaHebrew has no Hebrew-native Live Challenge yet — the English
    // socket session would surface English-only assignment data to the
    // Hebrew teacher's podium. Real Hebrew Live Challenge needs Hebrew
    // assignment data + Hebrew student-side play surface; until that
    // ships, show the same coming-soon screen used by Quick Play.
    if (selectedClass.subject === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="אתגר חי"
            descriptionHe="מצב כיתה חי עם לוח שיא בזמן אמת — בקרוב באוצר המילים העברי."
            onBack={() => {
              setIsLiveChallenge(false);
              setView("teacher-dashboard");
            }}
          />
        </LazyWrapper>
      );
    }
    // Demo-friendly error fallback: a Live Challenge crash mid-pitch is
    // the worst possible moment.  Default "Failed to load component"
    // text reads as a hard failure to a watching principal.  This
    // fallback frames it as a quick reconnect, gives the teacher an
    // obvious one-tap path back to the dashboard, and keeps the page
    // colourful + on-brand rather than red-alert.
    const liveChallengeErrorFallback = (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 px-6">
        <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-2xl font-black text-white mb-3">Reconnecting…</h2>
          <p className="text-white/80 mb-6">
            The challenge hit a hiccup. Students stay connected — pick the class again to resume.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsLiveChallenge(false);
              setView("teacher-dashboard");
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
    return (
      <LazyWrapper
        loadingMessage="Loading live challenge..."
        fallback={liveChallengeErrorFallback}
      >
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
      if (hasTeacherAccess(user)) setView('live-challenge-class-select');
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

  if (view === "worksheet-attempts" && user) {
    return (
      <LazyWrapper loadingMessage="Loading worksheet results...">
        <WorksheetAttemptsView user={user} onBack={() => setView("teacher-dashboard")} />
      </LazyWrapper>
    );
  }

  if (view === "quick-play-setup") {
    // VocaHebrew gets a focused Hebrew-only Quick Play setup that
    // surfaces HEBREW_LEMMAS via HEBREW_PACKS — never ALL_WORDS or
    // TOPIC_PACKS. Gate on activeVoca (the dashboard's current
    // subject) rather than selectedClass?.subject because Quick Play
    // is launched without a class context.
    //
    // REQUIRES the 20260510_quick_play_subject migration:
    //   - quick_play_sessions.subject column
    //   - create_quick_play_session(p_subject text DEFAULT 'english')
    // Without it, the RPC call below fails (unknown parameter) and the
    // teacher sees a "Failed to create session" toast — Hebrew QP
    // can't function until the migration is applied.
    if (activeVoca === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewQuickPlaySetupView
            onBack={() => setView("teacher-dashboard")}
            onOpenMonitor={() => setView("quick-play-teacher-monitor")}
            onCreateSession={async (lemmaIds, modes, hebrewTitle) => {
              const { data, error } = await supabase.rpc('create_quick_play_session', {
                p_word_ids: lemmaIds.length > 0 ? lemmaIds : null,
                p_custom_words: null,
                p_allowed_modes: modes,
                p_subject: 'hebrew',
              });
              if (error) {
                showToast(appToasts.failedCreateSession(error.message), "error");
                throw error;
              }
              const session = data as { id: string; session_code: string; allowed_modes?: string[] };
              const effectiveAllowedModes = session.allowed_modes && session.allowed_modes.length > 0
                ? session.allowed_modes
                : modes;
              // Project Hebrew lemmas into the Word shape the Quick
              // Play monitor / resume state expects.  Same projection
              // useQuickPlayUrlBootstrap uses on the student side, so
              // both ends agree on what the session "words" look like.
              // Dynamic import keeps the Hebrew corpus out of the
              // English bundle — by the time we get here the
              // HebrewQuickPlaySetupView chunk has already loaded it,
              // so this resolves from cache.
              const { HEBREW_LEMMAS } = await import("./data/vocabulary-hebrew");
              const projectedWords = HEBREW_LEMMAS
                .filter((l) => lemmaIds.includes(l.id))
                .map((l) => ({
                  id: l.id,
                  english: l.translationEn,
                  hebrew: l.lemmaNiqqud,
                  arabic: l.translationAr,
                  level: "Custom" as const,
                }));
              setQuickPlaySessionCode(session.session_code);
              setQuickPlayActiveSession({
                id: session.id,
                sessionCode: session.session_code,
                wordIds: lemmaIds,
                words: projectedWords,
                allowedModes: effectiveAllowedModes,
              });
              try {
                sessionStorage.removeItem('vocaband_skip_restore');
                localStorage.setItem('vocaband_quick_play_session', JSON.stringify({
                  id: session.id,
                  words: projectedWords,
                  allowedModes: effectiveAllowedModes,
                }));
              } catch { /* quota exceeded — safe to ignore */ }
              // Hebrew QP doesn't yet generate AI sentences — the 4
              // wired Hebrew modes (niqqud, shoresh, synonym, listening)
              // don't read sentences. Sentence Builder isn't in the
              // Hebrew mode set, so skipping the AI generation step is
              // correct, not a gap.
              // Suppress the unused-param warning — `hebrewTitle` is
              // accepted by the wizard for future use (when we add a
              // sessions.title column) but not persisted today.
              void hebrewTitle;
              return session.session_code;
            }}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage="Loading quick play setup...">
      <QuickPlaySetupView
        allWords={ALL_WORDS}
        onSaveTemplate={savedTasks.save}
        initialSelectedWords={quickPlayInitialWords}
        initialSelectedModes={quickPlayInitialModes}
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
            showToast(appToasts.failedCreateSession(error.message), "error");
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
        onGenerateLesson={handleGenerateLesson}
        topicPacks={TOPIC_PACKS}
        user={user}
        onLogout={() => performUserLogout()}
        isProUser={isPro(user)}
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


  if (view === "hot-seat") {
    // Pass-around classroom mode — one device, many players.  Owns its
    // own setup screen + game loop + podium internally; we feed it the
    // teacher's English assignments so they can pick one as the word
    // pool (in addition to the curriculum Sets 1/2/3).  Scope to the
    // selected class when one is set — usually the case since Hot Seat
    // launches from the class wizard's tab strip.  Scores stay
    // in-memory; no Supabase writes since the players aren't logged in.
    const hotSeatAssignments = visibleAssignments
      .filter(a => !selectedClass || a.classId === selectedClass.id)
      .map(a => ({ id: a.id, title: a.title, wordIds: a.wordIds, words: a.words }));
    return (
      <LazyWrapper loadingMessage="Loading Hot Seat…">
        <HotSeatView
          onExit={() => {
            // When launched from the New Activity wizard's tab strip,
            // back should land on the wizard (so the teacher keeps
            // their tab context); otherwise return to dashboard.
            if (activityNavOrigin === 'create-assignment' && selectedClass) {
              setView('create-assignment');
            } else {
              setView('teacher-dashboard');
            }
          }}
          speak={speakWord}
          assignments={hotSeatAssignments}
          topicPacks={TOPIC_PACKS}
        />
      </LazyWrapper>
    );
  }

  if (view === "class-show") {
    // Hebrew classes get a focused 2-mode projector view
    // (HebrewClassShowView). The English ClassShowView is shaped
    // around Word + 6 English-specific modes; the subject-aware fold
    // is a future PR — see task 12 in the parity memory.
    //
    // Two paths land here: a teacher-selected class (selectedClass set)
    // OR the dashboard's "Class Show" tile (selectedClass may be stale).
    // Use activeVoca as the second signal so a Hebrew-tab teacher can't
    // fall through to the English picker just because no class is
    // currently selected.
    if (selectedClass?.subject === "hebrew" || activeVoca === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען מצב הקרנה…">
          <HebrewClassShowView
            initialLemmaIds={classShowAssignment?.wordIds}
            className={selectedClass?.name ?? null}
            onExit={() => {
              setClassShowAssignment(null);
              if (activityNavOrigin === 'create-assignment' && selectedClass) {
                setView('create-assignment');
              } else {
                setView('teacher-dashboard');
              }
            }}
          />
        </LazyWrapper>
      );
    }

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
            onOcrUpload: onPickerOcrUpload,
            topicPacks: TOPIC_PACKS,
            // savedGroups: pass [] for now — wiring useSavedWordGroups
            // through App-level state is a future PR.  WordPicker's
            // SavedGroupsPanel renders an empty state cleanly when [].
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setClassShowAssignment(null);
            if (activityNavOrigin === 'create-assignment' && selectedClass) {
              setView('create-assignment');
            } else {
              setView('teacher-dashboard');
            }
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === "worksheet") {
    // Hebrew classes get a focused single-template worksheet view
    // (HebrewWorksheetView). The full English builder isn't subject-aware
    // yet — task 10 in the parity memory tracks the eventual fold so
    // both subjects share one component.
    //
    // Gate on activeVoca too: the dashboard's "Worksheet" tile fires
    // setView("worksheet") without setting selectedClass, so a Hebrew-tab
    // teacher with no class currently selected was falling through to
    // the English builder + ALL_WORDS / TOPIC_PACKS.
    if (selectedClass?.subject === "hebrew" || activeVoca === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען בונה דפי עבודה…">
          <HebrewWorksheetView
            initialLemmaIds={worksheetAssignment?.wordIds}
            initialTitle={worksheetAssignment?.title}
            className={worksheetAssignment?.className ?? selectedClass?.name ?? null}
            onBack={() => {
              setWorksheetAssignment(null);
              if (activityNavOrigin === 'create-assignment' && selectedClass) {
                setView('create-assignment');
              } else {
                setView('teacher-dashboard');
              }
            }}
          />
        </LazyWrapper>
      );
    }

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
            onOcrUpload: onPickerOcrUpload,
            topicPacks: TOPIC_PACKS,
            savedGroups: [],
            showToast,
          }}
          onExit={() => {
            setWorksheetAssignment(null);
            if (activityNavOrigin === 'create-assignment' && selectedClass) {
              setView('create-assignment');
            } else {
              setView('teacher-dashboard');
            }
          }}
        />
      </LazyWrapper>
    );
  }

  if (view === "vocabagrut" && user) {
    // Vocabagrut = Israeli English-Bagrut mock exam. There is no Hebrew
    // analog (Hebrew literature has its own Bagrut, structured nothing
    // like the English one), so Hebrew-tab teachers shouldn't see it at
    // all. The TeacherQuickActions tile is also hidden when isHebrew —
    // this guard catches direct navigation (URL state restore, etc.).
    if (activeVoca === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="Vocabagrut"
            descriptionHe="מבחן מתכונת בסגנון בגרות זמין כרגע רק במסלול האנגלית."
            onBack={() => {
              if (activityNavOrigin === 'create-assignment' && selectedClass) {
                setView('create-assignment');
              } else {
                setView('teacher-dashboard');
              }
            }}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage="Loading Vocabagrut…">
        <VocabagrutShell
          user={user}
          classes={visibleClasses}
          teacherAssignments={visibleAssignments}
          onExit={() => {
            // Students always return to their own dashboard.  Teachers
            // who entered Vocabagrut via the New Activity wizard's tab
            // strip go back to the wizard; other teachers (direct
            // navigation, state restore) land on the dashboard.
            if (user.role === 'student') {
              setView('student-dashboard');
            } else if (activityNavOrigin === 'create-assignment' && selectedClass) {
              setView('create-assignment');
            } else {
              setView('teacher-dashboard');
            }
          }}
          showToast={showToast}
        />
      </LazyWrapper>
    );
  }

  if (view === "quick-play-teacher-monitor") {
    if (!quickPlayActiveSession) {
      setView("quick-play-setup");
      return null;
    }
    // Same demo-friendly fallback rationale as Live Challenge — Quick
    // Play is the other live-classroom screen a teacher might be
    // showing during a sales demo when the worst-case crash hits.
    const monitorErrorFallback = (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 px-6">
        <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-2xl font-black text-white mb-3">Reconnecting…</h2>
          <p className="text-white/80 mb-6">
            The session monitor hit a hiccup. Your active session is safe — return to the dashboard and reopen it.
          </p>
          <button
            type="button"
            onClick={() => setView(user?.role === 'student' ? 'student-dashboard' : 'teacher-dashboard')}
            className="w-full px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
    return (
      <LazyWrapper
        loadingMessage="Loading session monitor..."
        fallback={monitorErrorFallback}
      >
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
          classes={visibleClasses}
          allScores={allScores}
          teacherAssignments={visibleAssignments}
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
    // Hebrew teachers landing on the class-select would otherwise see a
    // picker that leads into the (English-only) socket session. Mirror
    // the guard at the live-challenge route. Gated on activeVoca because
    // no class has been selected yet at this stage.
    if (activeVoca === "hebrew") {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="אתגר חי"
            descriptionHe="מצב כיתה חי עם לוח שיא בזמן אמת — בקרוב באוצר המילים העברי."
            onBack={() => setView("teacher-dashboard")}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper loadingMessage="Loading classes...">
        <LiveChallengeClassSelectView
          user={user}
          classes={visibleClasses}
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
        saveScore={saveScore}
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