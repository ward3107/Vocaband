import React, { useState, useEffect, useMemo, useRef, useCallback, lazy } from "react";
import type { View, ShopTab } from "./core/views";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS, Word } from "./data/vocabulary";
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
import { useBoosters } from "./hooks/useBoosters";
import QuickPlayKickedScreen from "./components/QuickPlayKickedScreen";
import QuickPlaySessionEndScreen from "./components/QuickPlaySessionEndScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import { ConsentModal, ExitConfirmModal, ClassSwitchModal } from "./components/AppModals";
import { ClassNotFoundBanner } from "./components/ClassNotFoundBanner";
import { PRIVACY_POLICY_VERSION} from "./config/privacy-config";
import { shuffle, chunkArray, addUnique, removeKey } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
import { isAnswerCorrect } from './utils/answerMatch';
// SetupWizard is now lazy-loaded via QuickPlaySetupView
// CreateAssignmentWizard is now lazy-loaded via CreateAssignmentView
import CookieBanner, { CookiePreferences } from "./components/CookieBanner";
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
import { celebrate } from "./utils/celebrate";
import { trackError, trackAutoError } from "./errorTracking";
import { compressImageForUpload } from "./utils/compressImage";
import ImageCropModal from "./components/ImageCropModal";
import { getGameDebugger } from "./utils/gameDebug";
import {
  MAX_ATTEMPTS_PER_WORD, AUTO_SKIP_DELAY_MS, SHOW_ANSWER_DELAY_MS, WRONG_FEEDBACK_DELAY_MS,
  MAX_ASSIGNMENT_ROUNDS,
  STREAK_CELEBRATION_MILESTONES,
  type GameMode,
} from "./constants/game";
import { incrementAssignmentPlays, isAssignmentLocked, resolveAssignmentPlays } from "./hooks/useAssignmentPlays";
import { useSpeechVoiceManager } from "./hooks/useSpeechVoiceManager";
import { useBeforeUnloadWhileSaving } from "./hooks/useBeforeUnloadWhileSaving";
import { useQuickPlaySocket } from "./hooks/useQuickPlaySocket";
import { useTeacherActions } from "./hooks/useTeacherActions";
import { requestCustomWordAudio } from "./utils/requestCustomWordAudio";

// Match the flag used in QuickPlayStudentView + QuickPlayMonitor. When
// on, Quick Play runs entirely over the /quick-play socket namespace —
// no Supabase anon auth, no progress-table writes during a session.
const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === "true";

// Types for lazy-loaded modules
type SocketIOModule = typeof import('socket.io-client');
type Socket = InstanceType<SocketIOModule['Socket']>;

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase

// Unbiased secure random integer in [0, max). Uses rejection sampling to avoid modulo bias.
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

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

  const goBack = () => {
    setView(previousViewRef.current as any);
  };

  // Cookie consent state
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    try {
      const hasConsented = localStorage.getItem("vocaband_cookie_consent");
      return !hasConsented;
    } catch (e) {
      return true;
    }
  });

  const handleCookieAccept = (eventOrPreferences?: CookiePreferences | React.MouseEvent) => {
    // Ignore React events - they were accidentally passed before the fix
    const preferences = eventOrPreferences && typeof eventOrPreferences === 'object' && 'nativeEvent' in eventOrPreferences
      ? undefined
      : eventOrPreferences as CookiePreferences | undefined;

    try {
      const consentData = preferences
        ? JSON.stringify(preferences)
        : JSON.stringify({ essential: true, analytics: true, functional: true });
      localStorage.setItem("vocaband_cookie_consent", consentData);
    } catch (e) {
      console.error('[Cookie Banner] Failed to save consent:', e);
    }
    setShowCookieBanner(false);
  };

  const handleCookieCustomize = (preferences: CookiePreferences) => {
    handleCookieAccept(preferences);
  };

  const handlePublicNavigate = (page: "home" | "terms" | "privacy" | "accessibility") => {
    const viewMap = {
      home: "public-landing",
      terms: "public-terms",
      privacy: "public-privacy",
      accessibility: "accessibility-statement",
    } as const;
    setView(viewMap[page]);
  };
  const [shopTab, setShopTab] = useState<ShopTab>("hub");
  const [showDemo, setShowDemo] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  // Track whether handleStudentLogin is in progress so onAuthStateChange
  // doesn't clobber loading/view mid-login (signInAnonymously fires the
  // listener before handleStudentLogin finishes its DB queries).
  const manualLoginInProgress = useRef(false);
  const restoreInProgress = useRef(false);
  const restoreRetried = useRef(false);
  const [, setLandingTab] = useState<"student" | "teacher">("student");
  const [studentLoginClassCode, setStudentLoginClassCode] = useState("");
  const [studentLoginName, setStudentLoginName] = useState("");
  const [existingStudents, setExistingStudents] = useState<Array<{ id: string, displayName: string, xp: number, status: string, avatar?: string }>>([]);
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
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

  // Active boosters (xp_booster, weekend_warrior, streak_freeze,
  // lucky_charm, focus_mode).  Scoped per-user via uid; persists in
  // localStorage so boosters survive page refresh.
  const boosters = useBoosters(user?.uid);

  const [studentAvatar, setStudentAvatar] = useState("🦊");
  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // --- OAUTH STATE ---
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [oauthAuthUid, setOauthAuthUid] = useState<string | null>(null);
  const [showOAuthClassCode, setShowOAuthClassCode] = useState(false);

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry>>({});
  const [isLiveChallenge, setIsLiveChallenge] = useState(false);

  // --- QUICK PLAY STATE ---
  // Only the setters are used — the values themselves are never read in
  // this component or any child that gets them passed down. The state
  // still exists so the teacher-monitor cleanup path can reset it to
  // null/[] on session end.
  const [, setQuickPlaySessionCode] = useState<string | null>(null);
  const [, setQuickPlaySelectedWords] = useState<Word[]>([]);
  const [quickPlaySearchQuery] = useState("");
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<{id: string, sessionCode: string, wordIds: number[], words: Word[], allowedModes?: string[]} | null>(null);
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'];
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(() => QUICK_PLAY_AVATARS[secureRandomInt( QUICK_PLAY_AVATARS.length)]);
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
    useState<'connecting' | 'live' | 'polling'>('connecting');
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


  // Auto-generate sentences for Sentence Builder when words are selected or difficulty changes
  useEffect(() => {
    if (!assignmentModes.includes("sentence-builder")) return;
    if (selectedWords.length === 0) {
      setAssignmentSentences([]);
      setSentencesAutoGenerated(false);
      return;
    }
    // Only auto-generate if user hasn't manually edited (but always regenerate on difficulty change)
    if (!sentencesAutoGenerated && assignmentSentences.length > 0) return;
    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const words = uniqueWords.filter(w => selectedWordsSet.has(w.id));
    const generated = generateSentencesForAssignment(words, sentenceDifficulty);
    setAssignmentSentences(generated);
    setSentencesAutoGenerated(true);
  }, [selectedWords, assignmentModes, sentenceDifficulty]);

  // Handle Quick Play session from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionCode = params.get('session');

    if (sessionCode) {
      // Load Quick Play session
      const loadQuickPlaySession = async () => {
        // ─── Legacy anon-auth bootstrap (v2 skips the anon sign-in) ────
        // Ensure we have a VALID anonymous auth session — RLS requires it.
        //
        // `getSession()` only reads localStorage, so a stale token (from a
        // previous Quick Play whose anon user has since been deleted by the
        // 20260429 cleanup cron) sneaks past unnoticed.  The first real
        // auth-aware call then fails with `session_not_found` (403),
        // Supabase fires SIGNED_OUT, and the student is bounced to login
        // mid-Quick-Play-join.
        //
        // Recover silently: validate with `getUser()` (which actually hits
        // the server).  If the server rejects, surgically remove the
        // sb-*-auth-token entry from localStorage and create a fresh anon
        // session.  We deliberately do NOT call `supabase.auth.signOut()`
        // — that fires the SIGNED_OUT listener at line ~2070 which runs
        // cleanup + setUser(null) + history reset MID-join and tears
        // down the live component tree (caused 8/10 student crashes in a
        // classroom test).
        //
        // Under v2: we still wipe stale sb-*-auth-token entries, because
        // they'd otherwise be sent as the `authorization` header on every
        // Supabase query — including the quick_play_sessions lookup below
        // — and a server-rejected token returns an error that bounces the
        // student to landing. Skip only the signInAnonymously step, so no
        // new anon auth.users row is created.
        const { data: { session: cachedSession } } = await supabase.auth.getSession();
        let stale = false;
        if (cachedSession) {
          const { error } = await supabase.auth.getUser();
          stale = !!error;
        }
        if (stale) {
          try {
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
          } catch { /* private mode / disabled storage — fall through */ }
        }
        if (!QUICKPLAY_V2 && (!cachedSession || stale)) {
          await supabase.auth.signInAnonymously().catch(() => {});
        }

        const { data, error } = await supabase
          .from('quick_play_sessions')
          .select('*')
          .eq('session_code', sessionCode)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          // Verbose logging — this path is where we lose Quick Play
          // students to the landing page, so make the reason obvious
          // in DevTools on every failure mode.
          console.error('[Quick Play Load] session lookup failed', {
            sessionCode,
            error: error ? {
              message: error.message, code: error.code, details: error.details, hint: error.hint,
            } : null,
            dataIsNull: !data,
            quickPlayV2: QUICKPLAY_V2,
          });
          showToast("Invalid or expired Quick Play session. Please scan the QR code again.", "error");
          window.history.replaceState({}, '', window.location.pathname);
          setView("public-landing");
          return;
        }

        // Fetch database words from vocabulary
        const dbWords = ALL_WORDS.filter(w => data.word_ids.includes(w.id));

        // Parse custom words from JSON
        let customWords: Word[] = [];
        if (data.custom_words) {
          try {
            const customWordsData = typeof data.custom_words === 'string'
              ? JSON.parse(data.custom_words)
              : data.custom_words;

            customWords = customWordsData.map((w: any, index: number) => ({
              id: -(Date.now() + index), // Negative IDs for custom words
              english: w.english,
              hebrew: w.hebrew,
              arabic: w.arabic,
              sentence: w.sentence || "",
              example: w.example || "",
              level: "Custom" as const
            }));
          } catch (e) {
            console.error('Failed to parse custom words:', e);
          }
        }

        // Combine database and custom words
        const allWords = [...dbWords, ...customWords];


        if (allWords.length === 0) {
          console.error('[Quick Play Load] No words in session!');
          showToast("This Quick Play session has no words. Please contact your teacher.", "error");
          window.history.replaceState({}, '', window.location.pathname);
          setView("public-landing");
          return;
        }

        setQuickPlayActiveSession({
          id: data.id,
          sessionCode: data.session_code,
          wordIds: data.word_ids,
          words: allWords,
          allowedModes: data.allowed_modes || undefined
        });

        // Check if this student already joined this session (page refresh / re-scan)
        // Force them to rejoin with the SAME name to prevent name-swapping chaos
        try {
          const saved = localStorage.getItem('vocaband_qp_guest');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.sessionId === data.id && parsed.name) {
              // Verify they still have a progress record (weren't kicked)
              const { data: { session: authSession } } = await supabase.auth.getSession();
              const authUid = authSession?.user?.id;
              if (authUid) {
                // Check by uid OR by name to handle auth session refresh
                const { data: existingRecord } = await supabase
                  .from('progress')
                  .select('id, student_uid')
                  .eq('assignment_id', data.id)
                  .or(`student_uid.eq.${authUid},student_name.eq.${parsed.name}`)
                  .limit(1);
                if (existingRecord && existingRecord.length > 0) {
                  // Migrate old progress rows to current uid if they differ
                  const oldRecord = existingRecord[0];
                  if (oldRecord.student_uid !== authUid) {
                    await supabase
                      .from('progress')
                      .update({ student_uid: authUid })
                      .eq('assignment_id', data.id)
                      .eq('student_name', parsed.name);
                  }
                  // Auto-rejoin with same name and avatar
                  const guestUser = createGuestUser(parsed.name, 'quickplay', parsed.avatar || '\uD83E\uDD8A');
                  setUser(guestUser);
                  setQuickPlayStudentName(parsed.name);
                  setQuickPlayAvatar(parsed.avatar || '\uD83E\uDD8A');
                  const words = allWords.map(w => ({ ...w, hebrew: w.hebrew || '', arabic: w.arabic || '' }));
                  setAssignmentWords(words);
                  const quickPlaySentences = generateSentencesForAssignment(words, 2);
                  setActiveAssignment({
                    id: "quickplay-" + data.id, classId: "", wordIds: words.map(w => w.id), words,
                    title: "Quick Play",
                    allowedModes: data.allowed_modes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"],
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
                  });
                  gameDebug.logGameInit({
                    wordsCount: words.length,
                    modesCount: data.allowed_modes?.length || 10,
                    userId: 'quickplay_guest',
                  });
                  setView("game");
                  setShowModeSelection(true);
                  window.history.replaceState({}, '', window.location.pathname);
                  return; // Skip join screen — go straight to game
                }
              }
            }
          }
        } catch {}

        setView("quick-play-student");
      };

      loadQuickPlaySession();
    } else {
      // No URL param — try recovering a saved guest session from localStorage
      try {
        const saved = localStorage.getItem('vocaband_qp_guest');
        if (saved) {
          const { sessionId, sessionCode, name, avatar } = JSON.parse(saved);
          if (sessionId && sessionCode && name) {
            // Verify session is still active
            const loadSaved = async () => {
              const { data: { session: existingSession } } = await supabase.auth.getSession();
              if (!existingSession) await supabase.auth.signInAnonymously().catch(() => {});

              const { data } = await supabase
                .from('quick_play_sessions')
                .select('id, session_code, word_ids, allowed_modes, is_active, custom_words')
                .eq('id', sessionId)
                .eq('is_active', true)
                .maybeSingle();

              if (data) {
                const dbWords = ALL_WORDS.filter(w => (data.word_ids || []).includes(w.id));
                let customWords: Word[] = [];
                if (data.custom_words) {
                  try {
                    const cw = typeof data.custom_words === 'string' ? JSON.parse(data.custom_words) : data.custom_words;
                    customWords = cw.map((w: any, i: number) => ({
                      id: -(Date.now() + i), english: w.english, hebrew: w.hebrew, arabic: w.arabic, level: "Custom" as const
                    }));
                  } catch {}
                }
                const allSessionWords = [...dbWords, ...customWords];
                if (allSessionWords.length > 0) {
                  setQuickPlayActiveSession({
                    id: data.id,
                    sessionCode: data.session_code,
                    wordIds: data.word_ids || [],
                    words: allSessionWords,
                    allowedModes: (data as { allowed_modes?: string[] }).allowed_modes || undefined,
                  });
                  setQuickPlayStudentName(name);
                  setQuickPlayAvatar(avatar || '\uD83E\uDD8A');
                  // Go straight to mode selection (they already joined)
                  const guestUser = createGuestUser(name, 'quickplay', avatar || '\uD83E\uDD8A');
                  setUser(guestUser);
                  const words = allSessionWords.map(w => ({ ...w, hebrew: w.hebrew || '', arabic: w.arabic || '' }));
                  setAssignmentWords(words);
                  const quickPlaySentences = generateSentencesForAssignment(words, 2);
                  setActiveAssignment({
                    id: "quickplay-" + data.id, classId: "", wordIds: words.map(w => w.id), words,
                    title: "Quick Play",
                    allowedModes: data.allowed_modes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"],
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
                  });
                  gameDebug.logGameInit({
                    wordsCount: words.length,
                    modesCount: data.allowed_modes?.length || 10,
                    userId: 'quickplay_guest',
                  });
                  setView("game");
                  setShowModeSelection(true);
                  return;
                }
              }
              // Session ended or invalid — clear saved data
              localStorage.removeItem('vocaband_qp_guest');
            };
            loadSaved();
          }
        }
      } catch {}
    }
  }, []);

  // Auto-add EXACT matches found in database to Quick Play selection
  // Only words that match exactly what the teacher typed are auto-added
  // Partial matches (starts-with) are shown but NOT auto-added
  useEffect(() => {
    // Only run this in Quick Play setup view
    if (view !== "quick-play-setup") return;

    // Get ONLY exact matches - not partial matches
    const exactMatches: Word[] = [];
    searchTerms.forEach(term => {
      const exactMatchesForTerm = ALL_WORDS.filter(w =>
        w.english.toLowerCase() === term
      );
      exactMatches.push(...exactMatchesForTerm);
    });

    // Remove duplicates
    const uniqueExactMatches = Array.from(new Map(exactMatches.map(w => [w.id, w])).values());

    // Add exact matches to selection if not already added
    if (uniqueExactMatches.length > 0) {
      setQuickPlaySelectedWords(prev => {
        const existingIds = new Set(prev.map(w => w.id));
        const newWords = uniqueExactMatches.filter(w => !existingIds.has(w.id));
        return [...prev, ...newWords];
      });
    }
  }, [searchTerms, view]);

  // Real-time polling for Quick Play teacher monitor
  // Polls Supabase for student progress every 3 seconds when in teacher monitor view
  // Helper: aggregate raw progress rows into the leaderboard format
  //
  // Dedupe strategy (two passes):
  //   1. Group by student_uid — the "correct" key per row.
  //   2. POST-PASS merge by student_name — catches the case where the
  //      SAME student ends up with two different uids in the progress
  //      table (which happens when their Supabase session rotates
  //      between the "joined" insert and the first mode save, or when
  //      the JOIN row uses session.user.id but the finish-game path
  //      falls back to a guest "quickplay-<uuid>" because no session
  //      was available at that instant).  Previously the teacher saw
  //      "two students with the same name but different icons" — now
  //      they collapse into one entry with the most-recent avatar.
  const aggregateProgress = useCallback((progressData: any[]) => {
    const studentMap = new Map<string, { name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string; modes: Map<string, number> }>();

    progressData.forEach((p: any) => {
      // Group by student_uid to avoid merging different students with same name
      const key = p.student_uid || p.student_name;
      const existing = studentMap.get(key);

      if (!existing) {
        const modes = new Map<string, number>();
        if (p.mode !== 'joined') modes.set(p.mode, Number(p.score));
        studentMap.set(key, {
          name: p.student_name,
          score: p.mode === 'joined' ? 0 : Number(p.score),
          avatar: p.avatar || '🦊',
          lastSeen: p.completed_at,
          mode: p.mode,
          studentUid: p.student_uid,
          modes
        });
      } else {
        if (new Date(p.completed_at) > new Date(existing.lastSeen)) {
          existing.lastSeen = p.completed_at;
          existing.mode = p.mode;
          // Update avatar from the most recent entry
          if (p.avatar) existing.avatar = p.avatar;
        }
        // Track best score per mode, then sum for cumulative total
        if (p.mode !== 'joined') {
          const prev = existing.modes.get(p.mode) || 0;
          if (Number(p.score) > prev) existing.modes.set(p.mode, Number(p.score));
        }
        let total = 0;
        existing.modes.forEach(v => { total += v; });
        existing.score = total;
      }
    });

    // POST-PASS: merge entries that share the same student_name but
    // have different uids (same student, rotated session).  Take the
    // newer entry's avatar (what the student see themselves as),
    // union the per-mode scores, and drop the older uid.
    type Entry = { name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string; modes: Map<string, number> };
    const byName = new Map<string, Entry>();
    for (const entry of studentMap.values()) {
      const dup = byName.get(entry.name);
      if (!dup) {
        byName.set(entry.name, entry);
      } else {
        // Merge the two entries — newer wins on metadata (avatar, mode,
        // lastSeen); per-mode scores are max-merged.
        const newer = new Date(entry.lastSeen) > new Date(dup.lastSeen) ? entry : dup;
        const older = newer === entry ? dup : entry;
        const mergedModes = new Map(older.modes);
        newer.modes.forEach((v, mode) => {
          const prev = mergedModes.get(mode) || 0;
          if (v > prev) mergedModes.set(mode, v);
        });
        let total = 0;
        mergedModes.forEach(v => { total += v; });
        byName.set(entry.name, {
          ...newer,
          modes: mergedModes,
          score: total,
        });
      }
    }

    return Array.from(byName.values()).sort((a, b) => b.score - a.score);
  }, []);

  useEffect(() => {
    // Only subscribe when in teacher monitor view and have an active session
    if (view !== "quick-play-teacher-monitor" || !quickPlayActiveSession?.id) return;

    const sessionId = quickPlayActiveSession.id;

    // 1. Initial fetch to hydrate state
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('student_name, student_uid, score, avatar, completed_at, mode')
        .eq('assignment_id', sessionId)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[Quick Play Monitor] Error fetching progress:', error);
        return;
      }
      if (data) {
        const aggregated = aggregateProgress(data);
        setQuickPlayJoinedStudents(aggregated);
      }
    };

    // OPTIMIZED: Only fetch when page is visible
    if (!document.hidden) {
      fetchProgress();
    }

    // 2. Subscribe to realtime changes on progress table for this session.
    // We can't safely merge `payload.new` into the already-aggregated state
    // (previously we fed aggregated entries back into aggregateProgress,
    // which reads raw column names like student_name/student_uid — the
    // camelCase aggregated fields became undefined, producing a phantom
    // "no-name, 0 pts" student on the podium next to the real one).
    // Re-fetching on each INSERT is cheap at classroom scale and keeps
    // the dedup logic in one place.
    setQuickPlayRealtimeStatus('connecting');

    // Adaptive polling — only run when Realtime isn't delivering.  When
    // the subscription callback reports SUBSCRIBED we stop the poll and
    // let the doorbell handle it; when it reports an error/closed we
    // resume the 5s knock as a safety net.  Status transitions toggle
    // this interval on and off.  Variable lives outside the channel
    // callback so both .subscribe() and cleanup can reach it.
    let pollId: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (pollId) return;
      pollId = setInterval(() => {
        if (!document.hidden) fetchProgress();
      }, 5_000);
    };
    const stopPoll = () => {
      if (pollId) { clearInterval(pollId); pollId = null; }
    };
    // Start polling immediately — we're in 'connecting' until the
    // subscribe callback confirms SUBSCRIBED.  No gap where the teacher
    // is unprotected.
    startPoll();

    const channel = supabase
      .channel(`qp-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`
        },
        () => {
          if (document.hidden) return;
          fetchProgress();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setQuickPlayRealtimeStatus('live');
          // Realtime is now delivering — polling is redundant.
          stopPoll();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setQuickPlayRealtimeStatus('polling');
          // Realtime degraded — resume polling as a safety net.
          startPoll();
        }
      });

    // OPTIMIZED: Re-fetch when tab becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (!document.hidden && view === "quick-play-teacher-monitor") {
        fetchProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPoll();
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [view, quickPlayActiveSession?.id, aggregateProgress]);

  // Quick Play student: one channel, two listeners — session-end + kick.
  //
  // Previously this useEffect opened TWO channels (`qp-session-*` and
  // `qp-kick-*`) per student. Combined with the teacher-side progress
  // channel that makes 3 concurrent postgres_changes subscriptions every
  // time a Quick Play session is running. Supabase Starter allows 10
  // concurrent realtime subscribers per project, so a classroom of 10+
  // students would exhaust the slots and start dropping mid-game.
  //
  // One channel can hold multiple `.on(...)` listeners, each watching a
  // different table/filter, so fold them together.
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession?.sessionCode) return;
    // v2 routes session-end + kick over the /quick-play socket.io
    // namespace. Subscribing to the progress-table DELETE stream here
    // under v2 was the root cause of the "everyone else joining kicks
    // the two who logged in" bug — any DELETE event (including the
    // teacher's own kick cleanup) was treated as "you were kicked".
    // Under v2 we skip this subscription entirely; v2-native KICKED
    // and SESSION_ENDED events are handled via useQuickPlaySocket in
    // QuickPlayStudentView.
    if (QUICKPLAY_V2) return;

    const sessionCode = quickPlayActiveSession.sessionCode;
    const sessionId = quickPlayActiveSession.id;
    const uid = user.uid;

    const channel = supabase
      .channel(`qp-student-${sessionCode}-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quick_play_sessions',
          filter: `session_code=eq.${sessionCode}`,
        },
        (payload) => {
          if (payload.new && !(payload.new as any).is_active) {
            setQuickPlaySessionEnded(true);
            setActiveAssignment(null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.old && (payload.old as any).student_uid === uid) {
            setQuickPlayKicked(true);
            setActiveAssignment(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.isGuest, user?.uid, quickPlayActiveSession?.sessionCode, quickPlayActiveSession?.id]);

  // --- HELPER: Create Guest User ---
  // Centralized function to create guest user objects with consistent structure
  const createGuestUser = (name: string, prefix: string = 'guest', avatar: string = '\uD83E\uDD8A'): AppUser => {
    // Mobile-compatible UUID generation (crypto.randomUUID() not supported on some mobile browsers)
    const generateUUID = (): string => {
      // Prefer native crypto.randomUUID when available
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }

      // Fallback: generate a UUID-like string using crypto.getRandomValues if available
      if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        // Set version (4) and variant bits to match UUID v4 layout
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const toHex = (b: number) => b.toString(16).padStart(2, "0");
        const hex = Array.from(bytes, toHex).join("");

        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20)
        ].join("-");
      }

      // Last-resort fallback: use timestamp plus a monotonically increasing counter.
      // This avoids Math.random but does not provide strong unpredictability.
      const now = Date.now().toString(36);
      if (!(generateUUID as any)._counter) {
        (generateUUID as any)._counter = 0;
      }
      (generateUUID as any)._counter = ((generateUUID as any)._counter + 1) | 0;
      const counter = ((generateUUID as any)._counter as number).toString(36);
      return `${now}-${counter}`;
    };

    return {
      uid: `${prefix}-${generateUUID()}`,
      displayName: name.trim().slice(0, 30),
      email: undefined,
      role: "guest",
      isGuest: true,
      avatar,
      xp: 0,
      classCode: undefined,
      createdAt: new Date().toISOString()
    };
  };

  // --- AI TRANSLATION FOR QUICK PLAY ---
  // Cache for translated words to avoid redundant API calls
  const translationCache = useRef<Map<string, {hebrew: string, arabic: string, match: number}>>(new Map());

  // Batch-translate English → Hebrew + Arabic via /api/translate (Gemini).
  // Handles one-or-many words in a single HTTP call so paste of 30 custom
  // words doesn't fire 30 parallel requests. Results are cached by lowercased
  // English so subsequent requests (per-word retries, auto-translate button)
  // don't re-hit the API.
  const translateWordsBatch = async (
    englishWords: string[]
  ): Promise<Map<string, { hebrew: string; arabic: string; match: number }>> => {
    const out = new Map<string, { hebrew: string; arabic: string; match: number }>();
    const uncached: string[] = [];

    for (const w of englishWords) {
      const key = w.toLowerCase().trim();
      if (!key) continue;
      const cached = translationCache.current.get(key);
      if (cached) {
        out.set(key, cached);
      } else {
        uncached.push(w.trim());
      }
    }

    if (uncached.length === 0) return out;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return out;

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ words: uncached }),
      });

      if (!res.ok) {
        console.warn('[translate] /api/translate failed:', res.status);
        return out;
      }

      const { hebrew, arabic } = await res.json() as { hebrew?: string[]; arabic?: string[] };
      uncached.forEach((word, i) => {
        const he = hebrew?.[i]?.trim() || '';
        const ar = arabic?.[i]?.trim() || '';
        if (!he && !ar) return;
        const entry = { hebrew: he, arabic: ar, match: he && ar ? 1 : 0.5 };
        const key = word.toLowerCase();
        translationCache.current.set(key, entry);
        out.set(key, entry);
      });
    } catch (error) {
      trackAutoError(error, 'Translation service error');
    }

    return out;
  };

  // Single-word translator kept for API compatibility with existing callers
  // (manual "Auto-translate" button, Quick Play). Thin wrapper over the batch.
  const translateWord = async (englishWord: string): Promise<{hebrew: string, arabic: string, match: number} | null> => {
    const result = await translateWordsBatch([englishWord]);
    return result.get(englishWord.toLowerCase().trim()) || null;
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
  const [showModeIntro, setShowModeIntro] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
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
  const [socketConnected, setSocketConnected] = useState(false);

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

  // --- SAVE QUEUE (BATCH DB WRITES FOR BETTER PERFORMANCE) ---
  const saveQueueRef = useRef<Array<() => Promise<void>>>([]);
  const saveQueueTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isProcessingQueueRef = useRef(false);

  // Process save queue in batches (reduces DB round-trips)
  const processSaveQueue = async () => {
    if (isProcessingQueueRef.current || saveQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    const queue = saveQueueRef.current.splice(0, 10); // Process up to 10 saves at once

    try {
      await Promise.all(queue.map(fn => fn().catch(err => console.error('[Save Queue] Item failed:', err))));
    } finally {
      isProcessingQueueRef.current = false;

      // Process more if queue was refilled
      if (saveQueueRef.current.length > 0) {
        saveQueueTimerRef.current = setTimeout(processSaveQueue, 100);
      }
    }
  };

  const queueSaveOperation = (operation: () => Promise<void>) => {
    saveQueueRef.current.push(operation);

    // Trigger processing after short delay (allows batching)
    if (!saveQueueTimerRef.current) {
      saveQueueTimerRef.current = setTimeout(() => {
        processSaveQueue();
        saveQueueTimerRef.current = undefined;
      }, 300); // 300ms delay to accumulate multiple saves
    }
  };

  // Cleanup function to clear all pending operations and prevent DB calls after logout/session end
  const cleanupSessionData = () => {
    // Clear save queue to prevent any further DB operations
    saveQueueRef.current = [];
    // Clear any pending save timer
    if (saveQueueTimerRef.current) {
      clearTimeout(saveQueueTimerRef.current);
      saveQueueTimerRef.current = undefined;
    }
    // Clear feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = undefined;
    }
  };


  // Refs for socket reconnect handler (avoids stale closure on [] deps useEffect)
  const userRef = useRef(user);
  const isLiveChallengeRef = useRef(isLiveChallenge);
  // Tracks which (socketId:classCode:uid) combo has already emitted
  // JOIN_CHALLENGE — prevents duplicate emits when effects re-run.
  // Cleared whenever the socket reconnects (new socket id) so the
  // next join goes through.
  const joinChallengeEmittedRef = useRef<string>("");

  // Timeout ref for cleanup (prevents memory leaks on unmount)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSpokenWordRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false); // Guard against rapid clicks during feedback
  const lastScoreEmitRef = useRef<number>(0); // Track last Socket.IO score emit time to prevent spam

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    isProcessingRef.current = !!feedback;
    gameDebug.logProcessing({ isProcessing: !!feedback, reason: `feedback changed to ${feedback}` });
  }, [feedback]);

  // FAILSAFE: Clear stuck feedback after 5 seconds (prevents buttons being permanently disabled)
  useEffect(() => {
    if (!feedback) return;

    const failsafeTimer = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(failsafeTimer);
  }, [feedback]);

  // Track feedback state changes
  const prevFeedbackRef = useRef<string | null>(feedback);
  useEffect(() => {
    if (prevFeedbackRef.current !== feedback) {
      gameDebug.logFeedback({ from: prevFeedbackRef.current, to: feedback, reason: 'state_change' });
      prevFeedbackRef.current = feedback;
    }
  }, [feedback]);

  // Track word changes and log state transitions
  const prevIndexRef = useRef<number>(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex && view === "game") {
      const fromIndex = prevIndexRef.current;
      const toIndex = currentIndex;
      const word = gameWords[toIndex];
      gameDebug.logWordChange({
        fromIndex,
        toIndex,
        word: word ? { id: word.id, english: word.english } : undefined,
      });
      gameDebug.logState({
        view,
        gameMode,
        showModeSelection,
        showModeIntro,
        currentIndex: toIndex,
        isFinished,
        feedback,
        isProcessing: isProcessingRef.current,
        currentWord: word ? { id: word.id, english: word.english } : undefined,
      }, 'after_word_change');
      prevIndexRef.current = toIndex;
    }
  }, [currentIndex, view, gameMode, showModeSelection, showModeIntro, isFinished, feedback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Flush save queue on unmount to ensure no data is lost
      if (saveQueueTimerRef.current) {
        clearTimeout(saveQueueTimerRef.current);
      }
      if (saveQueueRef.current.length > 0) {
        Promise.all(saveQueueRef.current.map(fn => fn().catch(console.error))).catch(console.error);
        saveQueueRef.current = [];
      }
    };
  }, []);

  // Periodic flush: Process save queue every 5 seconds when idle (not during active gameplay)
  // This ensures queued data is eventually saved without overwhelming the DB
  useEffect(() => {
    const flushInterval = setInterval(() => {
      // Only flush if user exists, not actively saving, and queue has items
      if (user && !isSaving && saveQueueRef.current.length > 0 && !isProcessingQueueRef.current) {
        processSaveQueue();
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(flushInterval);
  }, [isSaving, user]); // Added user as dependency

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
  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    const offKicked = qpOnKicked(() => {
      setQuickPlayKicked(true);
      setActiveAssignment(null);
    });
    const offEnded = qpOnSessionEnded(() => {
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

    if (QUICKPLAY_V2 && user?.isGuest && quickPlayActiveSession) {
      setTimeout(() => quickPlaySocket.updateScore(newScore), 0);
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
  useEffect(() => { isLiveChallengeRef.current = isLiveChallenge; }, [isLiveChallenge]);

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

  // Defer socket connection until we have a valid auth session.
  // Connecting immediately on mount (before OAuth exchange completes) would
  // always fail with "Authentication required" on the first attempt, causing
  // the console error the teacher sees before the retry succeeds.
  useEffect(() => {
    let s: Socket | undefined = undefined;
    let cancelled = false;

    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? "";
    };

    const connectSocket = async () => {
      // Wait for a valid session before opening the socket
      const token = await getToken();
      if (cancelled) return;
      if (!token) {
        // No session yet — listen for auth changes and retry
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
          if (cancelled) { subscription.unsubscribe(); return; }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            subscription.unsubscribe();
            connectSocket();
          }
        });
        return;
      }

      // Lazy load socket.io-client
      const socketIO = await loadSocketIO();
      const io = socketIO.default || socketIO;

      const socketUrl = import.meta.env.VITE_SOCKET_URL || "";
      const sock = io(socketUrl || "/", {
        reconnection: true,
        // Retry indefinitely.  A Live Challenge can run for 20+ minutes
        // and students may briefly lose Wi-Fi (classroom networks are
        // flaky).  Before: capped at 10 attempts * 1s = 10s window and
        // then the socket gave up forever — student stayed "offline"
        // for the rest of the session.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        // Cap back-off at 10s so we retry often enough that a brief
        // outage is invisible, but don't hammer the server if it's
        // genuinely down.
        reconnectionDelayMax: 10_000,
        // Jitter so 30 students all reconnecting after a Render restart
        // don't thunder at the same millisecond.
        randomizationFactor: 0.5,
        // Async callback ensures a fresh token is fetched on every reconnect,
        // so the handshake never carries a stale/expired JWT.
        auth: (cb: (data: { token: string }) => void) => { getToken().then(t => cb({ token: t })); },
      }) as Socket;
      s = sock;

      setSocket(sock);

      sock.on("connect", () => {
        setSocketConnected(true);
      });
      sock.on("disconnect", () => {
        setSocketConnected(false);
      });
      sock.on("reconnect", () => {
        setSocketConnected(true);
        const currentUser = userRef.current;
        // Allow students to rejoin live challenge on reconnect.
        // Token is provided via the socket auth callback (line above), not in the payload.
        if (currentUser?.classCode && isLiveChallengeRef.current) {
          if (currentUser.role === "student") {
            sock.emit("join-challenge", { classCode: currentUser.classCode, name: currentUser.displayName, uid: currentUser.uid });
          }
        }
      });
      sock.on("connect_error", (err: any) => console.error("Socket connection error:", err.message));
      sock.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data: unknown) => {
        if (typeof data === "object" && data !== null) {
          setLeaderboard(data as Record<string, LeaderboardEntry>);
        } else {
          setLeaderboard({});
        }
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (s) {
        s.disconnect();
      }
    };
  }, []);

  // ── Live Challenge: ensure JOIN_CHALLENGE is emitted for students ──
  // Centralised effect that fires whenever (student + socket + classCode)
  // are all present, emitting exactly once per unique (socketId, uid)
  // tuple.  Covers every login path (traditional, click-name, restore).
  //
  // CRITICAL: the uid in the payload MUST be the Supabase session's
  // user.id, not user.uid from app state.  The server middleware
  // authenticates the socket with the session's JWT and stores the
  // verified uid in socket.data.uid.  The JOIN_CHALLENGE handler then
  // rejects (silently!) if payload uid !== socket.data.uid.  On the
  // click-name student login path, user.uid = profile.auth_uid which
  // can differ from the current session's user.id — that mismatch was
  // dropping join events on the floor.  Reading the session uid on
  // every run guarantees we send whatever matches the JWT.
  useEffect(() => {
    if (!user || user.role !== 'student' || !user.classCode) return;
    if (!socket || !socketConnected) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUid = session?.user?.id;
      if (cancelled) return;
      if (!sessionUid) {
        console.warn('[Live] JOIN_CHALLENGE skipped — no Supabase session yet. Students without an anonymous session cannot appear on the podium.');
        return;
      }
      const joinKey = `${socket.id}:${user.classCode}:${sessionUid}`;
      if (joinChallengeEmittedRef.current === joinKey) return;
      joinChallengeEmittedRef.current = joinKey;
      socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
        classCode: user.classCode!,
        name: user.displayName,
        uid: sessionUid,
      });
      console.log('[Live] JOIN_CHALLENGE emitted', {
        classCode: user.classCode,
        name: user.displayName,
        sessionUid,
        userUid: user.uid,
        match: sessionUid === user.uid,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.uid, user?.role, user?.classCode, user?.displayName, socket, socketConnected]);

  // Teacher re-observe on reconnect: LiveChallengeClassSelectView
  // emits OBSERVE_CHALLENGE once when the teacher picks a class, but
  // if the socket drops + reconnects mid-challenge the teacher ends
  // up in a live-challenge room without being subscribed to its
  // leaderboard updates.  This effect re-emits on every reconnect
  // while the teacher is inside the live-challenge view.
  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    if (!socket || !socketConnected) return;
    if (!selectedClass || !isLiveChallenge) return;
    socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: selectedClass.code });
    console.log('[Live] OBSERVE_CHALLENGE re-emitted for teacher', { classCode: selectedClass.code });
  }, [user?.role, socket, socketConnected, selectedClass, isLiveChallenge]);

  // Listen for server-side challenge error events so we can surface
  // the rejection reason in the console (and optionally toast) instead
  // of the silent-drop behaviour that made podium bugs invisible.
  useEffect(() => {
    if (!socket) return;
    const onError = (payload: { event?: string; reason?: string }) => {
      console.error('[Live] Server rejected event:', payload);
    };
    socket.on('challenge_error', onError);
    return () => { socket.off('challenge_error', onError); };
  }, [socket]);

  // Reset the emit-dedupe key on disconnect so the next connect can
  // re-emit.  Covers reconnects where the socket gets a new id.
  useEffect(() => {
    if (!socketConnected) {
      joinChallengeEmittedRef.current = "";
    }
  }, [socketConnected]);

  // Helper: set pending approval info and persist to sessionStorage
  const showPendingApproval = (info: { name: string; classCode: string; profileId?: string }) => {
    setPendingApprovalInfo(info);
    setView("student-pending-approval");
    try { sessionStorage.setItem('vocaband_pending_approval', JSON.stringify(info)); } catch {}
  };

  // Intended-class-code storage helpers (component-scoped so both the
  // auth-effect's restoreSession and the component-level OAuth handler
  // can share them).  We write to BOTH sessionStorage and localStorage
  // because Google OAuth has been observed to wipe sessionStorage in
  // some mobile browsers — the localStorage fallback keeps the student's
  // class-switch intent alive across the Google redirect.
  const readIntendedClassCode = (): string | null => {
    try {
      const s = sessionStorage.getItem('oauth_intended_class_code');
      if (s) return s;
    } catch {/* sessionStorage unavailable */}
    try {
      return localStorage.getItem('oauth_intended_class_code');
    } catch {/* localStorage unavailable */}
    return null;
  };
  const clearIntendedClassCode = () => {
    try { sessionStorage.removeItem('oauth_intended_class_code'); } catch {}
    try { localStorage.removeItem('oauth_intended_class_code'); } catch {}
  };

  // Sticky banner state: when a student typed a class code that doesn't
  // exist, we surface a persistent banner on the dashboard so they can't
  // miss the problem (toasts get dismissed/ignored).  Setting it here
  // from either the OAuth-return path or the session-restore path both
  // funnel into the same UI state.
  const [classNotFoundIntent, setClassNotFoundIntent] = useState<string | null>(null);

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
    const restoreSession = async (supabaseUser: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
      if (restoreInProgress.current) return;
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
          // OAuth role-intent enforcement.  If the user clicked
          // "Log in as Teacher" on the landing page, we stamped
          // sessionStorage.oauth_intended_role='teacher' BEFORE the
          // Google redirect.  Google signs them in with whatever
          // account they have active (which might be the one they
          // previously signed up as a STUDENT with).  Without this
          // guard, restoreSession would silently drop them into the
          // student dashboard even though they clearly pressed the
          // teacher button.  Reject with a clear error + sign out.
          //
          // Guard clears after 10 minutes to avoid a stale flag
          // surviving across unrelated logins.
          try {
            const intendedRole = sessionStorage.getItem('oauth_intended_role');
            const intendedAt = Number(sessionStorage.getItem('oauth_intended_role_at') || 0);
            const fresh = intendedAt > 0 && (Date.now() - intendedAt) < 10 * 60 * 1000;
            if (intendedRole === 'teacher' && fresh && userData.role !== 'teacher') {
              sessionStorage.removeItem('oauth_intended_role');
              sessionStorage.removeItem('oauth_intended_role_at');
              setError(
                `This Google account (${userData.email ?? 'unknown'}) is registered as a ${userData.role}, not a teacher. ` +
                `Sign in from the student page instead, or use a different Google account for teacher access.`
              );
              await supabase.auth.signOut().catch(() => {});
              setLoading(false);
              return;
            }
            // Consumed — clear so subsequent logins don't re-trigger.
            if (intendedRole) {
              sessionStorage.removeItem('oauth_intended_role');
              sessionStorage.removeItem('oauth_intended_role_at');
            }
          } catch { /* storage unavailable — skip enforcement */ }

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
              setView("teacher-dashboard");
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
                    const dbWords = ALL_WORDS.filter(w => (sessionData.word_ids || []).includes(w.id));
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
                    setView("teacher-dashboard");
                  }
                } else {
                  setView("teacher-dashboard");
                }
              } catch {
                setView("teacher-dashboard");
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
            setView("student-dashboard");
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
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('*')
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
              setView("student-dashboard");
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
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('*')
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
              setView("student-dashboard");
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

  // --- BACK BUTTON (History API) ---
  //
  // Goal: mobile back button navigates between in-app pages, but NEVER
  // logs out and NEVER exits the app.  The user's dashboard (teacher or
  // student) is the "floor" — pressing back at the dashboard is a no-op.
  //
  // How it works:
  //   1. Every view change pushes a history entry (so back walks backward).
  //   2. Login transitions REPLACE the landing entry (so back can't reach
  //      the login screen while logged in).
  //   3. On popstate, we check: is the destination view "safe"?  If not
  //      (it's a login/auth view, or there's no state at all), we block
  //      it and re-push the current view to keep the history stack alive.
  //   4. Two extra "padding" entries are pushed on login so the browser
  //      never runs out of history and exits the tab/PWA.

  const isPopStateNavRef = useRef(false);

  // When the user taps "Leave" in the exit-confirm modal we want to
  // actually leave — so popstate should NOT re-trap during that window.
  const exitIntentRef = useRef(false);

  // Mirror of showExitConfirmModal so the popstate handler (attached once
  // with empty deps) can see the latest value without a closure re-attach.
  // Used to detect a "double back press" at the dashboard floor: if the
  // confirm modal is already open and the user presses back again, we
  // treat that as confirmation and log out — matching the mobile idiom
  // where repeated back presses mean "I really want to exit."
  const exitModalOpenRef = useRef(false);

  // Views that a logged-in user should never land on via back button.
  // If popstate would navigate to one of these, we block it.
  const AUTH_VIEWS = new Set([
    'landing', 'public-landing', 'student-account-login',
    'student-pending-approval', 'oauth-class-code', 'oauth-callback',
  ]);

  // The "home" view for each role — back button cannot go past this.
  const getHomeView = () =>
    userRef.current?.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard';

  // Number of padding entries pushed beneath the dashboard.  On mobile
  // browsers (especially Android Chrome) the edge-swipe gesture can pop
  // faster than popstate can re-trap, so a single padding entry is not
  // enough: the user escapes into external URLs (Google OAuth, Supabase
  // callback) or into stale pre-login entries (student-account-login)
  // that were pushed before the OAuth redirect.  Ten pads + aggressive
  // re-trapping on every popstate keeps the user pinned at the dashboard.
  const PAD_COUNT = 10;

  // Keep a ref to `view` so the popstate handler (attached once on
  // mount) always sees the latest value without a closure re-attach.
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => { exitModalOpenRef.current = showExitConfirmModal; }, [showExitConfirmModal]);

  // Broadcast the current view so the global AccessibilityWidget knows
  // whether to render its floating trigger. Per the product owner the
  // trigger should only appear on public/landing pages, not while a
  // student is mid-game or a teacher is in their dashboard.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('vocaband-view-change', { detail: view }));
  }, [view]);

  // Push a full dashboard trap: refill the pad buffer, then push the
  // dashboard on top.  Called on login transitions and whenever a pad
  // entry is popped so the buffer is always replenished.
  const pushDashboardTrap = () => {
    const v = viewRef.current;
    window.history.replaceState({ view: v, _pad: true }, '');
    for (let i = 1; i < PAD_COUNT; i++) {
      window.history.pushState({ view: v, _pad: true }, '');
    }
    window.history.pushState({ view: v }, '');
  };

  // On first mount, seed the history stack with the real current view
  // (usually 'public-landing').  We purposely do NOT pushState here —
  // the view-change effect below runs on first render and handles any
  // pushState needed for non-trivial initial views.
  useEffect(() => {
    window.history.replaceState({ view }, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the app navigates to a new view, push a history entry.
  useEffect(() => {
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      return;
    }
    const isDashboard = view === 'teacher-dashboard' || view === 'student-dashboard';
    const currentStateView = window.history.state?.view ?? '';
    const comingFromAuth = AUTH_VIEWS.has(currentStateView);

    // Login transition: replace the landing/auth entry with a pad buffer,
    // then push the dashboard on top.
    if (userRef.current && isDashboard && comingFromAuth) {
      pushDashboardTrap();
      return;
    }

    // Normal in-app navigation — single pushState so the back button
    // walks naturally between pages (dashboard ← wizard, etc.).
    window.history.pushState({ view }, '');
  }, [view]);

  // Handle the physical back button / swipe gesture.  Attached once
  // on mount (empty deps) — we read the latest view/user via refs
  // to avoid stale closures during rapid back presses.
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { view?: string; _pad?: boolean } | null;
      const prevView = state?.view;
      const isPad = state?._pad === true;
      const currentUser = userRef.current;
      const currentView = viewRef.current;

      // Guard 0: the user tapped "Leave" — let the browser actually
      // navigate out.  Do not re-trap.
      if (exitIntentRef.current) {
        return;
      }

      // Guard 1: auth is still being restored.  Treat as "user present"
      // and re-push so the back button doesn't accidentally escape
      // during the ~500ms restore window after a fresh mount.
      if (restoreInProgress.current) {
        window.history.pushState({ view: currentView }, '');
        return;
      }

      const home = currentUser ? getHomeView() : null;
      const atDashboardFloor = !!currentUser && currentView === home;

      // CASE A: at dashboard floor, ANY back press re-traps and shows
      //         the exit confirmation.  We never navigate away from
      //         the dashboard via popstate — it's an absolute floor.
      //         This also handles the case where rapid back presses
      //         pop past the pad buffer into pre-login entries like
      //         {view:'student-account-login'} or external URLs.
      //
      //         Double-back = logout: if the confirm modal is already
      //         visible and the user presses back AGAIN, treat it as
      //         "yes, really leave." This matches the mobile idiom where
      //         repeated back presses mean the user wants to exit, and
      //         saves them from having to aim for the small Leave button.
      if (atDashboardFloor) {
        if (exitModalOpenRef.current) {
          setShowExitConfirmModal(false);
          exitIntentRef.current = true;
          supabase.auth.signOut().catch(() => {});
          try { window.history.replaceState({ view: 'public-landing' }, ''); } catch {}
          setTimeout(() => { exitIntentRef.current = false; }, 500);
          return;
        }
        pushDashboardTrap();
        setShowExitConfirmModal(true);
        return;
      }

      // CASE B: logged-in user NOT at dashboard, but back would go to
      //         a login/auth view — block it (re-push current view).
      if (currentUser && (!prevView || AUTH_VIEWS.has(prevView))) {
        window.history.pushState({ view: currentView }, '');
        return;
      }

      // CASE C: normal in-app back navigation between real views
      //         (e.g., create-assignment → teacher-dashboard).
      if (prevView && !isPad) {
        isPopStateNavRef.current = true;
        setView(prevView as typeof view);
        return;
      }

      // CASE D: defensive block (no state, or pad below a non-dashboard
      //         view — shouldn't happen, but re-push to stay safe).
      window.history.pushState({ view: currentView }, '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect orphaned "landing" view — logged-out users go to student login,
  // logged-in users go to their dashboard (teacher or student).
  useEffect(() => {
    if (view !== "landing" || loading) return;
    if (!user) {
      setView("student-account-login");
    } else if (user.role === "teacher") {
      setView("teacher-dashboard");
    } else {
      setView("student-dashboard");
    }
  }, [view, user, loading]);

  // Guard: game view needs an active assignment. When popstate restores
  // view='game' but the assignment was cleared (e.g. after the student
  // finished or backed out), the render path would return white. Send
  // them back to the right dashboard instead of showing a blank screen.
  useEffect(() => {
    if (view !== "game" || activeAssignment) return;
    if (user?.isGuest) {
      setView("quick-play-student");
    } else if (user?.role === "student") {
      setView("student-dashboard");
    } else if (user?.role === "teacher") {
      setView("teacher-dashboard");
    } else {
      setView("public-landing");
    }
  }, [view, activeAssignment, user]);

  // Guard: quick-play-student view without an active session = the
  // infinite "Loading Quick Play session..." spinner. This happens when
  // the back button restores the view but the session was cleared. If
  // the URL still has ?session=CODE, send them back to the landing URL
  // (cleaner than a stuck spinner — they can re-scan the QR). Otherwise
  // go to public-landing.
  useEffect(() => {
    if (view !== "quick-play-student" || quickPlayActiveSession || loading) return;
    const code = new URLSearchParams(window.location.search).get('session');
    if (!code) {
      setView("public-landing");
      return;
    }
    // URL still has ?session= but our state doesn't — stale history entry.
    // Clear the param and send home; the user can re-scan to rejoin.
    window.history.replaceState({}, '', window.location.pathname);
    setView("public-landing");
  }, [view, quickPlayActiveSession, loading]);

  // Warn before leaving while a score save is in flight.  Extracted
  // into a hook so the "don't let the user leave while unsaved state
  // is pending" pattern is reusable.  Previously there was also a
  // no-op beforeunload handler whose only purpose was documenting
  // "we intentionally don't clear localStorage here" — removed since
  // the comment was the handler.
  useBeforeUnloadWhileSaving(isSaving);

  // Retry any progress writes that failed during a previous session
  useEffect(() => {
    const retryPending = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // No session — skip retries

      const currentUid = session.user.id;
      const keys = Object.keys(localStorage).filter(k => k.startsWith("vocaband_retry_"));
      for (const key of keys) {
        try {
          const progress = JSON.parse(localStorage.getItem(key)!);
          // Only retry records that belong to the current authenticated user
          if (progress.student_uid !== currentUid) {
            localStorage.removeItem(key); // Discard stale/foreign entries
            continue;
          }
          const { error } = await supabase.from('progress').insert(progress);
          if (!error) localStorage.removeItem(key);
        } catch {
          // Still offline — will retry on next load
        }
      }
    };
    retryPending();
  }, []);

  // Quick Play score queue flusher.  Runs once for the app lifetime —
  // listens to window 'online' + document 'visibilitychange' + a 30s
  // poll and flushes any pending Quick Play score rows that failed
  // their first send.  See src/core/saveQueue.ts for details.
  useEffect(() => {
    const uninstall = installQuickPlayQueueFlusher();
    return uninstall;
  }, []);

  // Teacher-side notifications — diff the polling snapshots and fire a
  // toast when something new lands.  Purely passive: no additional
  // network traffic (the polling effects already fetch these lists).
  //
  // Two diffs tracked via refs:
  //   pendingStudentsPrev — IDs we already told the teacher about
  //   allScoresPrev       — score-row IDs already seen
  // First snapshot seeds the ref without notifying (no "everyone
  // who existed before you logged in just joined" noise).
  //
  // Toast is throttled by the natural polling interval (10s / 20s),
  // so even a burst of new students / scores gets batched into at
  // most one notification per cycle per type.
  const pendingStudentsPrevRef = useRef<Set<string>>(new Set());
  const pendingStudentsSeededRef = useRef(false);
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const currentIds = new Set(pendingStudents.map(p => p.id));
    if (!pendingStudentsSeededRef.current) {
      pendingStudentsPrevRef.current = currentIds;
      pendingStudentsSeededRef.current = true;
      return;
    }
    const newOnes = pendingStudents.filter(p => !pendingStudentsPrevRef.current.has(p.id));
    pendingStudentsPrevRef.current = currentIds;
    if (newOnes.length === 1) {
      showToast(`🔔 ${newOnes[0].displayName} wants to join ${newOnes[0].className}`, 'info');
    } else if (newOnes.length > 1) {
      showToast(`🔔 ${newOnes.length} new students waiting for approval`, 'info');
    }
  }, [pendingStudents, user?.role, showToast]);

  const allScoresPrevRef = useRef<Set<string>>(new Set());
  const allScoresSeededRef = useRef(false);
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const currentIds = new Set(allScores.map(s => s.id).filter(Boolean) as string[]);
    if (!allScoresSeededRef.current) {
      allScoresPrevRef.current = currentIds;
      allScoresSeededRef.current = true;
      return;
    }
    const newOnes = allScores.filter(s => s.id && !allScoresPrevRef.current.has(s.id));
    allScoresPrevRef.current = currentIds;
    // Only toast when the teacher is on a view where a notification
    // makes sense — dashboard/classroom/analytics/gradebook.  During
    // a Quick Play session or inside another modal it would just be
    // noise; the podium updates already cover that.
    const notifiableViews = ['teacher-dashboard', 'classroom', 'analytics', 'gradebook'];
    if (!notifiableViews.includes(view)) return;
    if (newOnes.length === 1) {
      const s = newOnes[0];
      if (s.studentName && s.mode && s.mode !== 'joined') {
        showToast(`✅ ${s.studentName} finished ${s.mode} — ${s.score} pts`, 'success');
      }
    } else if (newOnes.length > 1) {
      const scoring = newOnes.filter(s => s.mode && s.mode !== 'joined');
      if (scoring.length > 0) {
        showToast(`✅ ${scoring.length} new results just came in`, 'success');
      }
    }
  }, [allScores, user?.role, view, showToast]);

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

  // Auto-refresh student assignments every 30s while on the dashboard
  // so new assignments from the teacher appear without re-login
  useEffect(() => {
    if (user?.role !== "student" || view !== "student-dashboard" || !user.classCode) return;
    const code = user.classCode;
    // Cache class ID to avoid querying classes table every 30s
    let cachedClassId: string | null = null;
    const refresh = async () => {
      // Double-check user still exists and is still logged in (prevents DB calls after logout)
      if (!user || !user.classCode) return;

      if (!cachedClassId) {
        const { data: classRows } = await supabase.from('classes').select('id').eq('code', code).limit(1);
        if (!classRows || classRows.length === 0) return;
        cachedClassId = classRows[0].id;
      }
      const { data } = await supabase.rpc('get_assignments_for_class', { p_class_id: cachedClassId });
      setStudentAssignments((data ?? []).map(mapAssignment));
    };
    // Fetch immediately on mount (so new assignments appear as soon as the
    // student navigates to the dashboard), then refresh every 30 seconds.
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [user?.role, user?.classCode, view, user]);

  // Load pending students for teachers
  useEffect(() => {
    // Trigger pending-students fetch on any of: fresh teacher dashboard
    // mount, dashboard re-entry, OR the async classes list finally
    // arriving (common race — loadPendingStudents early-returns when
    // classes.length === 0, so without this dep the teacher sees a
    // permanent empty state if they land on the dashboard before the
    // classes fetch resolves).
    //
    // Also polls every 10s + refetches on tab refocus. Without these,
    // a teacher sitting on the dashboard sees no new pending students
    // until they navigate away and back (or relogin) — because the
    // Supabase Realtime channel we'd normally lean on to push the
    // notification has been unreliable in practice. Polling is cheap
    // (single indexed query) and means the approval tray always reflects
    // reality within ~10 seconds regardless of realtime health.
    if (!(user?.role === "teacher" && view === "teacher-dashboard" && classes.length > 0)) {
      return;
    }
    loadPendingStudents();

    const pollId = setInterval(() => {
      if (!document.hidden) loadPendingStudents();
    }, 10_000);

    const handleVisibility = () => {
      if (!document.hidden) loadPendingStudents();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.role, view, classes.length]);

  const fetchTeacherData = async (uid: string) => {
    const { data, error } = await supabase.from('classes').select(CLASS_COLUMNS).eq('teacher_uid', uid);
    if (!error && data) {
      const mappedClasses = data.map(mapClass);
      setClasses(mappedClasses);
      return mappedClasses;
    }
    return [];
  };

  const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15 MB (client compresses before upload)

  /**
   * handleOcrUpload
   * Takes an image file (e.g., a photo of a word list), sends it to the
   * server-side Tesseract.js OCR endpoint, and extracts English vocabulary words.
   */
  // OCR upload — send photo directly to the Worker (no crop modal).
  // The crop modal's canvas export was corrupting images on mobile.
  // The Cloudflare Worker OCR works perfectly with raw photos.
  const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    processOcrFile(rawFile, e);
  };

  // Step 2: User confirms from the preview → run OCR
  const processOcrFile = async (fileToProcess: File, originalEvent?: React.ChangeEvent<HTMLInputElement> | null) => {
    setOcrPendingFile(null);
    setIsOcrProcessing(true);
    setOcrProgress(5);
    setOcrStatus("Compressing image...");

    try {
      const file = await compressImageForUpload(fileToProcess);
      const fileSizeKB = Math.round(file.size / 1024);
      setOcrProgress(10);
      setOcrStatus(`Uploading image... (${fileSizeKB} KB)`);

      // Get auth token for teacher authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("Please sign in again.", "error"); return; }

      // OCR runs directly in the Cloudflare Worker (same-origin, no Render,
      // no CORS, no cold starts). The Worker calls Claude Vision API.
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s

      // Simulate smooth progress during the API call (10% → 85%)
      let simProgress = 15;
      setOcrProgress(15);
      const progressInterval = setInterval(() => {
        simProgress += (85 - simProgress) * 0.08;
        setOcrProgress(Math.round(simProgress));
      }, 400);

      // Update status while waiting
      const statusTimer1 = setTimeout(() => setOcrStatus("Analyzing with AI..."), 2000);
      const statusTimer2 = setTimeout(() => setOcrStatus("Extracting words..."), 6000);

      let response: Response;
      try {
        response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        clearTimeout(statusTimer1);
        clearTimeout(statusTimer2);
        clearInterval(progressInterval);
      }

      setOcrProgress(88);
      setOcrStatus("Processing results...");

      if (!response.ok) {
        let errorMessage = `OCR failed (${response.status})`;
        try {
          const errorData = await response.json();
          // Prefer the detailed 'message' field (which has the actual
          // Gemini error reason) over the generic 'error' field.
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMessage);
      }

      let ocrData: any;
      try {
        ocrData = await response.json();
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      setOcrProgress(95);

      // Extract words from the OCR service response
      // The service already returns English-only words (filtered by regex on server)
      const extractedWords = ocrData.words || [];
      const rawText = ocrData.raw_text || '';

      // Dictionary cross-check to catch Gemini hallucinations. Any OCR result
      // that matches a curriculum word (ALL_WORDS, ~9k entries) is treated as
      // high confidence; anything else could be a ghost word the model made
      // up, or a legitimate non-curriculum word (proper noun, slang). We keep
      // BOTH in the custom words list so teachers don't lose real words, but
      // only auto-select the known ones. Unknown words show up unchecked so
      // the teacher can dismiss obvious nonsense with a glance instead of it
      // silently joining the assignment.
      const normalizeWord = (w: string) => w.toLowerCase().trim();
      const knownEnglishSet = new Set(ALL_WORDS.map(w => normalizeWord(w.english)));
      const isKnownWord = (w: string) => knownEnglishSet.has(normalizeWord(w));


      // Auto-translate OCR words to Hebrew + Arabic via Gemini so teachers
      // don't have to fill them in manually. Done BEFORE creating the Word
      // objects so the translations land on first render. Failure is silent
      // — teachers see a "Translate" button per word as the fallback.
      setOcrStatus("Translating to Hebrew + Arabic…");
      const translations = await translateWordsBatch(extractedWords);

      const customWordsFromOCR: Word[] = extractedWords.map((word: string, index: number) => {
        const t = translations.get(word.toLowerCase().trim());
        return {
          id: Date.now() + index,
          english: word,
          hebrew: t?.hebrew || '',
          arabic: t?.arabic || '',
          level: 'Custom',
          recProd: 'Prod',
        };
      });

      if (customWordsFromOCR.length > 0) {
      }

      if (customWordsFromOCR.length === 0) {
        showToast(
          rawText
            ? `No English words found. AI saw: "${rawText.substring(0, 120)}${rawText.length > 120 ? '...' : ''}"`
            : "No words found — the image may be unclear. Try a closer photo with better lighting.",
          "error"
        );
      } else {
        // Add all detected words to the Custom tab, but only auto-select the
        // ones that match our curriculum dictionary. Unknown words (possible
        // hallucinations) appear unchecked for the teacher to review.
        setCustomWords(customWordsFromOCR);
        setSelectedLevel("Custom");
        const knownCustomIds = customWordsFromOCR
          .filter(w => isKnownWord(w.english))
          .map(w => w.id);
        const autoSelectIds = knownCustomIds.length > 0
          ? knownCustomIds
          : customWordsFromOCR.map(w => w.id);
        setSelectedWords(autoSelectIds);

        // Fire off Neural2 audio generation so students hear real pronunciations.
        void requestCustomWordAudio(customWordsFromOCR);

        // Navigate to create-assignment view so user can see the matched words
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          setView("create-assignment");
        }

        const unknownCount = customWordsFromOCR.length - knownCustomIds.length;
        const successMsg = knownCustomIds.length > 0 && unknownCount > 0
          ? `Found ${customWordsFromOCR.length} words — ${knownCustomIds.length} curriculum matches auto-selected, ${unknownCount} need review.`
          : `Found ${customWordsFromOCR.length} words from the image!`;
        showToast(successMsg, "success");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        showToast("OCR timed out — the image may be too complex. Try a clearer photo or a smaller area.", "error");
      } else {
        trackAutoError(err, 'OCR processing failed');
        const errorMessage = err instanceof Error ? err.message : 'Error processing image';
        console.error('OCR error:', errorMessage);
        showToast(`${errorMessage}. Please try again.`, "error");
      }
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      setOcrStatus("");
      // Reset the file input so the same file can be uploaded again if needed
      if (originalEvent?.target) originalEvent.target.value = '';
    }
  };

  // --- SMART PASTE FUNCTIONS ---

  // Quick-play preview handlers (handleQuickPlayPreviewConfirm +
  // handleQuickPlayPreviewCancel) previously lived here but were never
  // wired to any UI. Removed along with their backing state
  // (showQuickPlayPreview, quickPlayPreviewAnalysis) — ~65 lines of
  // dead code TypeScript had been flagging with TS6133.
  const checkConsent = (userData: AppUser) => {
    const accepted = localStorage.getItem('vocaband_consent_version');
    if (accepted === PRIVACY_POLICY_VERSION) return;

    // localStorage missing — check DB before showing the banner
    if (userData.uid) {
      supabase
        .from('consent_log')
        .select('policy_version')
        .eq('uid', userData.uid)
        .eq('action', 'accept')
        .eq('policy_version', PRIVACY_POLICY_VERSION)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            // Valid consent found in DB — restore localStorage and skip banner
            try { localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION); } catch { /* ignore */ }
          } else {
            setNeedsConsent(true);
          }
        });
    } else {
      setNeedsConsent(true);
    }
  };

  const recordConsent = async () => {
    localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION);
    // Also persist to the consent_log DB table for compliance/audit trail
    if (user?.uid) {
      try {
        await supabase.from('consent_log').insert({
          uid: user.uid,
          policy_version: PRIVACY_POLICY_VERSION,
          terms_version: PRIVACY_POLICY_VERSION,
          action: 'accept',
        });
      } catch (error) {
        trackError('Could not persist consent to database', 'database', 'low', { uid: user?.uid });
      }
    }
    setNeedsConsent(false);
    setConsentChecked(false);
  };

  // Student Account Login System
  const loadStudentsInClass = async (classCode: string) => {
    const trimmedCode = classCode.trim().toUpperCase();
    if (!trimmedCode) return;


    try {
      // Use the new RPC function that bypasses RLS
      const { data, error } = await supabase
        .rpc('list_students_in_class', {
          p_class_code: trimmedCode
        });


      if (error) {
        console.error('RPC error:', error);
        // Fallback to direct query if RPC doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('student_profiles')
          .select('id, display_name, xp, status, avatar')
          .eq('class_code', trimmedCode)
          .eq('status', 'approved')
          .order('display_name', { ascending: true });


        if (fallbackError) {
          if (fallbackError.code === '42P01') {
            setExistingStudents([]);
            return;
          }
          throw fallbackError;
        }

        const mappedStudents = (fallbackData || []).map(s => ({
          id: s.id,
          displayName: s.display_name,
          xp: s.xp || 0,
          status: s.status,
          avatar: s.avatar || '🦊'
        }));

        setExistingStudents(mappedStudents);
        return;
      }

      // Map RPC results
      const mappedStudents = (data || []).map((s: any) => ({
        id: s.id,
        displayName: s.display_name,
        xp: s.xp || 0,
        status: s.status,
        avatar: s.avatar || '🦊'
      }));

      setExistingStudents(mappedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      setError("Could not load students. Please check the class code.");
      setExistingStudents([]);
    }
  };

  const handleLoginAsStudent = async (studentId: string) => {
    // Look up the student's full profile including auth_uid
    try {
      // Use RPC to bypass RLS for login
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_student_profile_for_login', {
          p_student_id: studentId
        });


      // Handle RPC error (function might not exist yet)
      if (rpcError) {
        const { data: profile, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', studentId)
          .single();


        if (error) {
          setError("Could not load student profile. Please try again.");
          return;
        }

        if (!profile) {
          setError("Student profile not found. Please ask your teacher to approve your account.");
          return;
        }

        // Process profile from fallback
        await processStudentProfile(profile);
        return;
      }

      // Get first result from RPC
      const profile = rpcResult && rpcResult.length > 0 ? rpcResult[0] : null;

      if (!profile) {
        setError("Student profile not found. Please ask your teacher to approve your account.");
        return;
      }

      // Process profile from RPC
      await processStudentProfile(profile);
    } catch (error) {
      console.error('Error logging in as student:', error);
      setError("Could not log in. Please try again.");
    }
  };

  // Helper function to process student profile and log them in
  const processStudentProfile = async (profile: any) => {

    // Check approval status — show the waiting screen instead of a generic error
    if (profile.status === 'pending_approval') {
      showPendingApproval({
        name: profile.display_name || '',
        classCode: profile.class_code || '',
        profileId: profile.id,
      });
      setLoading(false);
      return;
    }
    if (profile.status === 'rejected') {
      setError("Your account was not approved. Please contact your teacher.");
      return;
    }

    if (!profile.auth_uid) {
      setError("Student account not fully set up. Please ask your teacher to approve your account.");
      return;
    }

    // SECURITY: The caller's live Supabase session must belong to THIS
    // student's auth_uid. Without this check, anyone who knows a class
    // code could tap a name in the "Is that you?" list and the app
    // would happily create a new users row with that student's
    // display_name/xp/badges — letting them see the victim's dashboard
    // and appear under their name in the class leaderboard.
    //
    // Previous revisions:
    //   * Auto-created a fresh anonymous session on mismatch (shipped
    //     2026-04 and caused the impersonation hole reported on
    //     2026-04-21). REVERTED — never silently create a session
    //     tied to someone else's profile.
    //   * Showed "Just tap your name below to sign back in 👋" with no
    //     recovery path. UX was confusing but at least blocked
    //     impersonation.
    //
    // Current behaviour: if the session is missing or doesn't match,
    // refuse the login and point the student at OAuth / teacher help.
    // Re-authentication for anonymous students who lost their session
    // is an open problem — the only safe paths today are Google
    // sign-in or a teacher-mediated reset.
    const { data: { session: liveSession } } = await supabase.auth.getSession();
    const liveAuthUid = liveSession?.user?.id ?? null;
    if (!liveAuthUid || liveAuthUid !== profile.auth_uid) {
      console.warn('[processStudentProfile] blocked login — session/profile auth_uid mismatch', {
        profileAuthUid: profile.auth_uid,
        sessionAuthUid: liveAuthUid,
      });
      setError(
        "Can't sign you in as this student on this device. " +
        "Try Google sign-in, or ask your teacher to reset your account."
      );
      return;
    }
    const studentUid = liveAuthUid;

    // Create user data with the profile's auth_uid
    const userData: AppUser = {
      uid: studentUid, // Use profile auth_uid directly
      displayName: profile.display_name,
      email: profile.email,
      role: 'student',
      classCode: profile.class_code,
      avatar: profile.avatar || '🦊',
      badges: profile.badges || [],
      xp: profile.xp || 0,
      isGuest: false
    };


    setUser(userData);

    // Ensure user record exists in users table (for XP/streak tracking)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('uid', studentUid)
      .maybeSingle();

    if (checkError) {
      trackAutoError(checkError, 'Student user record check failed during signup');
    } else if (!existingUser) {
      // Create user record if it doesn't exist
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          uid: studentUid,
          email: profile.email,
          display_name: profile.display_name,
          role: 'student',
          class_code: profile.class_code,
          avatar: profile.avatar || '🦊',
          badges: profile.badges || [],
          xp: profile.xp || 0,
          streak: 0,
        });

      if (insertError) {
        trackAutoError(insertError, 'Failed to create student user record during signup');
      } else {
      }
    } else {
      // Update existing user record with latest profile data
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar: profile.avatar || '🦊',
          badges: profile.badges || [],
          xp: profile.xp || existingUser.xp
        })
        .eq('uid', studentUid);

      if (updateError) {
        trackAutoError(updateError, 'Failed to update student user record during login');
      }
    }

    // Fetch class data and assignments using RPC to bypass RLS
    const code = profile.class_code;

    // Use RPC to get class data (bypasses RLS)
    const { data: classResult, error: classError } = await supabase
      .rpc('get_class_by_code', {
        p_class_code: code
      });


    if (classError) {
      console.error('Class RPC error:', classError);
      // Fallback: try direct query (might fail due to RLS, but worth trying)
      const { data: fallbackClassRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', code);

      if (fallbackClassRows && fallbackClassRows.length > 0) {
        await loadAssignmentsForClass(mapClass(fallbackClassRows[0]), code, profile.auth_uid);
      } else {
        setStudentAssignments([]);
        setStudentProgress([]);
      }
    } else if (classResult && classResult.length > 0) {
      const classData = mapClass(classResult[0]);
      await loadAssignmentsForClass(classData, code, profile.auth_uid);
    } else {
      console.warn('No class found for code:', code);
      setStudentAssignments([]);
      setStudentProgress([]);
    }

    setBadges(profile.badges || []);
    setXp(profile.xp || 0);
    setStreak(0); // Will fetch from DB later
    setView("student-dashboard");
  };

  // Helper to load assignments for a class
  const loadAssignmentsForClass = async (classData: any, code: string, studentUid: string) => {

    // Use RPC to bypass RLS for assignments
    const { data: assignResult, error: assignError } = await supabase
      .rpc('get_assignments_for_class', {
        p_class_id: classData.id
      });

    if (assignError) {
      // Surface the real PostgREST error body — the plain 400 line in
      // the network tab says nothing; the body has the actual cause
      // (function overload missing, column renamed, auth gate, etc.).
      console.error('[get_assignments_for_class] RPC failed:', {
        code: assignError.code,
        message: assignError.message,
        details: assignError.details,
        hint: assignError.hint,
        classId: classData.id,
      });
    }

    // Progress still uses direct query (should work for student's own progress)
    const { data: progressResult } = await supabase
      .from('progress').select(PROGRESS_COLUMNS).eq('class_code', code).eq('student_uid', studentUid);


    if (assignError) {
      console.error('Assignments RPC error:', assignError);
      // Fallback to direct query
      const { data: fallbackData } = await supabase
        .from('assignments').select(ASSIGNMENT_COLUMNS).eq('class_id', classData.id);
      setStudentAssignments((fallbackData ?? []).map(mapAssignment));
    } else {
      setStudentAssignments((assignResult ?? []).map(mapAssignment));
    }

    setStudentProgress((progressResult ?? []).map(mapProgress));
  };

  const handleNewStudentSignup = async () => {
    const trimmedName = studentLoginName.trim().slice(0, 30);
    const trimmedCode = studentLoginClassCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setError("Please enter both class code and your name.");
      return;
    }

    // Guard: prevent onAuthStateChange → restoreSession from interfering
    // while this function owns the login flow.  signInAnonymously() fires
    // SIGNED_IN, and without this guard restoreSession would run (can't
    // find the user row yet) and redirect to landing.
    manualLoginInProgress.current = true;

    try {
      // Step 1: Sign in anonymously to ensure auth.uid() is set for the RPC
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !signInData.session) {
        setError("Could not create account. Please try again.");
        console.error('Sign-in error:', signInError);
        return;
      }

      // Step 2: Use the RPC function which has SECURITY DEFINER to bypass RLS
      const { data: result, error: rpcError } = await supabase
        .rpc('get_or_create_student_profile', {
          p_class_code: trimmedCode,
          p_display_name: trimmedName,
          p_avatar: studentAvatar
        });


      if (rpcError) throw rpcError;

      if (!result || result.length === 0) {
        throw new Error('Failed to create student profile');
      }

      const profile = result[0].profile;

      if (profile.status === 'approved') {
        // Already approved, just log them in
        handleLoginAsStudent(profile.id);
        return;
      } else if (profile.status === 'pending_approval') {
        // Navigate to a dedicated waiting screen instead of just a toast.
        // The student needs to understand what's happening and what to do next.
        const info = {
          name: trimmedName,
          classCode: trimmedCode,
          profileId: profile.id,
        };
        setPendingApprovalInfo(info);
        setView("student-pending-approval");

        // Persist so the pending screen survives page refresh
        try { sessionStorage.setItem('vocaband_pending_approval', JSON.stringify(info)); } catch {}

        // Clear form
        setStudentLoginName("");
        setStudentLoginClassCode("");
        setStudentAvatar("🦊");
        setExistingStudents([]);
        setShowNewStudentForm(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError("Could not create account. Please try again.");
    } finally {
      manualLoginInProgress.current = false;
    }
  };

  // --- OAUTH HANDLERS ---
  const handleOAuthTeacherDetected = async (_email: string) => {
    try {
      // The onAuthStateChange → restoreSession path already handles teacher
      // login (including auto-creating the users row for allowed Google
      // sign-ins).  Just close the OAuth UI and let it finish.
      setIsOAuthCallback(false);
      setLoading(true);
      // If restoreSession already ran and set the view, we're done.
      // If not, the next onAuthStateChange event will trigger it.
    } catch (error) {
      console.error('Teacher detection error:', error);
      setError('Could not load teacher profile.');
    }
  };

  const handleOAuthStudentDetected = async (email: string) => {
    try {
      // Load student profile from student_profiles table
      const { data: studentData, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !studentData) {
        setError('Student profile not found. Please sign up again.');
        return;
      }

      if (studentData.status !== 'active' && studentData.status !== 'approved') {
        showPendingApproval({
          name: studentData.display_name || '',
          classCode: studentData.class_code || '',
          profileId: studentData.id,
        });
        return;
      }

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) {
        setError('Just tap your name below to sign back in 👋');
        return;
      }

      // Class-switch detection: same logic as the restoreSession path.
      // If the student entered a class code that differs from their
      // current one and it's a real class, show the switch modal instead
      // of logging them into their existing class.
      const intendedCode = readIntendedClassCode();
      const intendedNorm = intendedCode?.trim().toUpperCase() || null;
      const currentNorm = studentData.class_code?.trim().toUpperCase() || '';
      if (intendedNorm && currentNorm && intendedNorm !== currentNorm) {
        // Same RLS workaround as above — use the SECURITY DEFINER RPC so
        // non-member students can still verify the target class exists.
        const { data: intendedClassRows, error: lookupErr } = await supabase
          .rpc('class_lookup_by_code', { p_code: intendedNorm });
        if (lookupErr) {
          // Surface the real reason instead of the generic "not found"
          // banner. Common causes: migration 20260428 requires auth but
          // auth.uid() was null mid-OAuth; rate limit hit; migration
          // 20260426 never applied so the RPC doesn't exist server-side.
          console.error('[OAuth class switch] RPC failed:', lookupErr);
          setClassNotFoundIntent(`${intendedNorm} (lookup failed: ${lookupErr.message})`);
          clearIntendedClassCode();
        } else if (intendedClassRows && intendedClassRows.length > 0) {
          const { data: currentClassRows } = await supabase
            .from('classes').select('code, name').eq('code', studentData.class_code);
          setIsOAuthCallback(false);
          // Populate in-memory user so dashboard can render as the modal's
          // backdrop rather than flashing landing/loader.
          const switchUser: AppUser = {
            uid: supabaseUser.id,
            email: studentData.email,
            displayName: studentData.display_name || email.split('@')[0],
            role: 'student',
            classCode: studentData.class_code,
            xp: studentData.xp || 0,
            avatar: studentData.avatar,
            createdAt: studentData.created_at,
          };
          setUser(switchUser);
          setPendingClassSwitch({
            fromCode: studentData.class_code,
            fromClassName: currentClassRows?.[0]?.name ?? null,
            toCode: intendedNorm,
            toClassName: intendedClassRows[0].name ?? null,
            supabaseUser: { id: supabaseUser.id, email: supabaseUser.email },
          });
          setView("student-dashboard");
          clearIntendedClassCode();
          return;
        } else if (!lookupErr) {
          // RPC succeeded with zero rows — the class genuinely doesn't
          // exist. Show the standard not-found banner. (Error branch
          // already set its own more informative banner above.)
          setClassNotFoundIntent(intendedNorm);
          clearIntendedClassCode();
        }
      } else if (intendedCode) {
        clearIntendedClassCode();
      }

      // Ensure a users table row exists for this OAuth student (restoreSession needs it)
      const studentUser: AppUser = {
        uid: supabaseUser.id,
        email: studentData.email,
        displayName: studentData.display_name || email.split('@')[0],
        role: 'student',
        classCode: studentData.class_code,
        xp: studentData.xp || 0,
        avatar: studentData.avatar,
        createdAt: studentData.created_at,
      };
      await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });

      setUser(studentUser);
      setIsOAuthCallback(false);

      // Load class assignments and progress
      if (studentData.class_code) {
        const { data: classRows } = await supabase
          .from('classes').select(CLASS_COLUMNS).eq('code', studentData.class_code);
        if (classRows && classRows.length > 0) {
          const classData = mapClass(classRows[0]);
          const [assignResult, progressResult] = await Promise.all([
            supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
            supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentData.class_code).eq('student_uid', supabaseUser.id),
          ]);
          setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
          setStudentProgress((progressResult.data ?? []).map(mapProgress));
        }
      }

      setBadges(studentUser.badges || []);
      setXp(studentUser.xp ?? 0);
      setStreak(studentUser.streak ?? 0);
      setView("student-dashboard");
      setLoading(false);
    } catch (error) {
      console.error('Student detection error:', error);
      setError('Could not load student profile.');
    }
  };

  const handleOAuthNewUser = (email: string, authUid: string) => {
    setOauthEmail(email);
    setOauthAuthUid(authUid);
    setShowOAuthClassCode(true);
    setIsOAuthCallback(false);
    setLoading(false);
  };

  // Teacher Approval System
  const loadPendingStudents = async () => {
    // Guard: the query below must be scoped by the teacher's class codes,
    // both as a belt-and-suspenders against RLS misconfig and so we can
    // render the class name next to each pending student. If classes
    // haven't loaded yet (common race on fresh teacher dashboard mount),
    // clear the list and bail — the effect below will re-invoke us once
    // classes populates.
    if (classes.length === 0) {
      setPendingStudents([]);
      return;
    }
    try {
      const classCodes = classes.map(c => c.code);
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          id,
          display_name,
          class_code,
          joined_at
        `)
        .eq('status', 'pending_approval')
        .in('class_code', classCodes)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setPendingStudents((data || []).map(s => {
        // Find class name from local classes state
        const classObj = classes.find(c => c.code === s.class_code);
        return {
          id: s.id,
          displayName: s.display_name,
          classCode: s.class_code,
          className: classObj?.name || s.class_code,
          joinedAt: s.joined_at
        };
      }));
    } catch (error) {
      // Surface instead of swallow — teachers reported seeing "All caught
      // up!" even when students were waiting. If RLS blocks the query or
      // the network dies, the teacher needs to know there's a problem
      // rather than silently seeing an empty list.
      trackAutoError(error, 'Failed to load pending students list');
      const message = error instanceof Error ? error.message : 'unknown error';
      showToast(`Couldn't load pending students: ${message}`, 'error');
    }
  };

  const handleApproveStudent = async (studentId: string, displayName: string) => {
    try {
      // Call the approve_student function
      const { error } = await supabase.rpc('approve_student', {
        p_profile_id: studentId
      });


      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Refresh the list
      await loadPendingStudents();

      // Show success
      showToast(`Approved ${displayName}! They can now log in and start learning.`, "success");
    } catch (error) {
      console.error('Error approving student:', error);
      showToast("Could not approve student. Please try again.", "error");
    }
  };

  const handleRejectStudent = async (studentId: string, displayName: string) => {
    setRejectStudentModal({ id: studentId, displayName });
  };

  const confirmRejectStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ status: 'rejected' })
        .eq('id', studentId);

      if (error) throw error;

      // Refresh the list
      await loadPendingStudents();
    } catch (error) {
      console.error('Error rejecting student:', error);
      showToast("Could not reject student. Please try again.", "error");
    }
  };


  const awardBadge = async (badge: string) => {
    if (!user || badges.includes(badge)) return;

    const newBadges = [...badges, badge];
    setBadges(newBadges);
    celebrate('big');

    try {
      const { error } = await supabase.from('users').update({ badges: newBadges }).eq('uid', user.uid);
      if (error) throw error;
    } catch (error) {
      console.error("Error saving badge:", error);
      setSaveError("Badge couldn't be saved right now, but don't worry — it will sync next time.");
    }
  };

  // Re-run fetchScores when classes transitions from 0 → non-zero while the
  // teacher is viewing Analytics or Gradebook. Without this, clicking the
  // Analytics card before the async classes fetch completes locks in an
  // empty state: fetchScores sees classes=[] and returns early, and nothing
  // else re-triggers it. Guarded by allScores.length === 0 so this fires
  // at most once per session.
  useEffect(() => {
    if (user?.role !== "teacher") return;
    if (classes.length === 0) return;
    if (view !== "classroom" && view !== "analytics" && view !== "gradebook") return;
    // Initial fetch — only if we haven't already loaded this session.
    // Without this guard, every view-switch inside Classroom would
    // re-hit the DB.
    if (allScores.length === 0) fetchScores();
    // Live refresh — students complete assignments at any moment while
    // the teacher is on Classroom/Analytics/Gradebook.  Before this,
    // the teacher had to leave and re-enter the view to see a new
    // score land (or full refresh the page).  Poll every 20 seconds
    // and re-fetch when the tab becomes visible.  Cheap single query.
    const pollId = setInterval(() => {
      if (!document.hidden) fetchScores();
    }, 20_000);
    const handleVisibility = () => {
      if (!document.hidden) fetchScores();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length, view, user?.role]);

  // --- GAME LOGIC ---
  const gameWords = view === "game" && assignmentWords.length > 0 ? assignmentWords : SET_2_WORDS;
  const currentWord = gameWords[currentIndex];
  // Debug: verify word count in game
  if (view === "game" && activeAssignment) {
  }

  // Debug: log state when in game view
  if (view === "game") {
  }

  const options = useMemo(() => {
    if (!currentWord) return [];
    const correct = currentWord;

    // Use ONLY the assigned gameWords for distractors - students should only see what the teacher assigned
    let possibleDistractors = gameWords.filter(w => w.id !== correct.id);

    // If fewer than 3 distractors available (teacher assigned <4 words),
    // cycle through the assigned words instead of borrowing from ALL_WORDS.
    // Edge case: if the teacher assigned exactly 1 word, possibleDistractors
    // is empty — the cycle loop would never terminate and freezes the page.
    // Fall back to ALL_WORDS in that case so we have real distractors to show.
    if (possibleDistractors.length === 0) {
      possibleDistractors = ALL_WORDS.filter(w => w.id !== correct.id);
    }
    if (possibleDistractors.length < 3) {
      // Shuffle available distractors first
      const shuffledDistractors = shuffle(possibleDistractors);
      // Repeat until we have at least 3
      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push(...shuffle(possibleDistractors));
      }
      possibleDistractors = shuffledDistractors;
    }

    const shuffledOthers = possibleDistractors.slice(0, 3);
    return shuffle([...shuffledOthers, correct]);
  }, [currentWord, gameWords]);

  // Synchronously derive tfOption so it is never null on the first render
  // of a True/False round (see note next to the isFlipped declaration).
  const tfOption = useMemo<Word | null>(() => {
    if (!currentWord) return null;
    // 50% correct translation, 50% distractor
    if (secureRandomInt(2) === 0) return currentWord;
    let possibleDistractors = gameWords.filter(w => w.id !== currentWord.id);
    if (possibleDistractors.length === 0) {
      const allPossibleWords = [...ALL_WORDS, ...gameWords];
      possibleDistractors = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values()).filter(w => w.id !== currentWord.id);
    }
    return possibleDistractors[secureRandomInt(possibleDistractors.length)] ?? currentWord;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentWord, gameWords]);

  useEffect(() => {
    if (currentWord) setIsFlipped(false);
  }, [currentIndex, currentWord]);

  const scrambledWord = useMemo(() => {
    if (!currentWord) return "";
    let scrambled = shuffle(currentWord.english.split('')).join('');
    // Ensure it's actually scrambled if length > 1
    while (scrambled === currentWord.english && currentWord.english.length > 1) {
      scrambled = shuffle(currentWord.english.split('')).join('');
    }
    return scrambled;
  }, [currentWord]);

  // Voice selection + caching + voiceschanged listener are bundled in
  // a hook so this component doesn't hold browser-API plumbing.
  const { getVoice } = useSpeechVoiceManager();

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean up text for better pronunciation (remove grammatical markers)
    const cleanText = text
      .replace(/\s*\([nva]\)\s*/gi, ' ')  // Remove (n), (v), (adj)
      .replace(/\s*\([^)]*?\)\s*/g, ' ')   // Remove other parenthetical content
      .replace(/^['"]+|['"]+$/g, '')        // Remove quotes
      .replace(/\s+/g, ' ')
      .trim();

    // Speak the whole phrase smoothly - no word-by-word pauses
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.7;  // Slower for clarity (0.7x)
    utterance.pitch = 1.0;  // Neutral pitch
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (view === "game" && !isFinished && currentWord && !showModeSelection && !showModeIntro && gameMode !== "sentence-builder" && gameMode !== "matching") {
      // Only speak if this is a different word than the last one we spoke
      if (lastSpokenWordRef.current !== currentWord.id) {
        gameDebug.logPronunciation({ wordId: currentWord.id, word: currentWord.english, method: 'auto', success: true });
        lastSpokenWordRef.current = currentWord.id;
        // Small delay to ensure UI has updated before speaking
        setTimeout(() => {
          speakWord(currentWord.id, currentWord.english);
        }, 100);
      }
    }
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro, gameMode]);

  // Reset last spoken word when game mode changes (to re-pronounce the current word)
  useEffect(() => {
    lastSpokenWordRef.current = null;
  }, [gameMode]);

  useEffect(() => {
    if (view === "game" && !showModeSelection && gameMode === "matching") {
      const shuffled = shuffle(gameWords).slice(0, 6);
      const pairs = shuffle([
        ...shuffled.map(w => ({ id: w.id, text: w.english, type: 'english' as const })),
        ...shuffled.map(w => ({ id: w.id, text: w[targetLanguage] || w.arabic || w.hebrew || w.english, type: 'arabic' as const }))
      ]);
      setMatchingPairs(pairs);
      setMatchedIds([]);
      setSelectedMatch(null);
    }
  }, [view, showModeSelection, gameMode, gameWords, targetLanguage]);

  // Letter Sounds: reveal one letter at a time, speak each letter
  // Uses sequential timeouts so each letter's sound plays AFTER the letter
  // is visually revealed (300ms spring delay) and previous speech finishes.
  useEffect(() => {
    if (view !== "game" || showModeSelection || showModeIntro || gameMode !== "letter-sounds" || !currentWord || isFinished) return;
    setRevealedLetters(0);
    const word = currentWord.english;
    let cancelled = false;
    const revealNext = (idx: number) => {
      if (cancelled || idx >= word.length) return;
      setRevealedLetters(idx + 1);
      // Delay speech 250ms so the spring animation shows the letter first
      setTimeout(() => {
        if (cancelled) return;
        // Cancel any ongoing speech before starting the new letter
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word[idx]);
        utter.rate = 0.8;
        utter.onend = () => {
          if (!cancelled) setTimeout(() => revealNext(idx + 1), 200);
        };
        // Fallback if onend doesn't fire (some browsers)
        const fallbackTimer = setTimeout(() => {
          if (!cancelled) revealNext(idx + 1);
        }, 1500);
        utter.onend = () => { clearTimeout(fallbackTimer); if (!cancelled) setTimeout(() => revealNext(idx + 1), 200); };
        window.speechSynthesis.speak(utter);
      }, 250);
    };
    // Start after a short initial delay
    const startTimer = setTimeout(() => revealNext(0), 400);
    return () => { cancelled = true; clearTimeout(startTimer); window.speechSynthesis.cancel(); };
  }, [currentIndex, view, showModeSelection, showModeIntro, gameMode, currentWord, isFinished]);

  // Sentence Builder: load sentences from active assignment
  useEffect(() => {
    if (view !== "game" || showModeSelection || showModeIntro || gameMode !== "sentence-builder" || !activeAssignment) return;
    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter(s => s.trim().length > 0);
    if (validSentences.length > 0) {
      setSentenceIndex(0);
      const words = shuffle(validSentences[0].split(" ").filter(Boolean));
      setAvailableWords(words);
      setBuiltSentence([]);
      setSentenceFeedback(null);
      // Speak the target sentence so students know what to build
      setTimeout(() => speak(validSentences[0]), 400);
    }
  }, [view, showModeSelection, showModeIntro, gameMode, activeAssignment]);

  const handleSentenceWordTap = (word: string, fromAvailable: boolean) => {
    if (fromAvailable) {
      setAvailableWords(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
      setBuiltSentence(prev => [...prev, word]);
    } else {
      setBuiltSentence(prev => { const idx = prev.indexOf(word); return [...prev.slice(0, idx), ...prev.slice(idx + 1)]; });
      setAvailableWords(prev => [...prev, word]);
    }
  };

  const handleSentenceCheck = () => {
    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter(s => s.trim().length > 0);
    const target = validSentences[sentenceIndex]?.trim().toLowerCase();
    const built = builtSentence.join(" ").toLowerCase();
    if (built === target) {
      setSentenceFeedback("correct");
      celebrate('small');
      speak(validSentences[sentenceIndex]);
      const newScore = score + 20;
      setScore(newScore);
      emitScoreUpdate(newScore);

      // Use feedbackTimeoutRef for consistent auto-advance
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        const next = sentenceIndex + 1;
        if (next >= validSentences.length) {
          setIsFinished(true);
          saveScore(newScore);
        } else {
          setSentenceIndex(next);
          setAvailableWords(shuffle(validSentences[next].split(" ").filter(Boolean)));
          setBuiltSentence([]);
          setSentenceFeedback(null);
          // Speak the next sentence so students know what to build
          setTimeout(() => speak(validSentences[next]), 400);
        }
      }, 1800);
    } else {
      setSentenceFeedback("wrong");

      // Use feedbackTimeoutRef for consistent feedback clearing
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setBuiltSentence([]);
        setAvailableWords(shuffle(validSentences[sentenceIndex].split(" ").filter(Boolean)));
        setSentenceFeedback(null);
      }, 1200);
    }
  };

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

  const handleExitGame = () => {
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

    if (user?.role === "teacher") {
      setView("teacher-dashboard");
    } else if (user?.role === "student") {
      if (showModeSelection) {
        setView("student-dashboard");
      } else {
        setShowModeSelection(true);
        setFeedback(null); // Clear feedback when showing mode selection
      }
    } else if (user?.isGuest) {
      if (showModeSelection) {
        // Already on mode selection — second Exit tap leaves Quick Play
        // entirely. cleanupQuickPlayGuest deletes the student's progress
        // rows (so they disappear from the teacher's podium) and signs
        // out the anon Supabase session (so re-entering from the same
        // phone gets a fresh state instead of restoring the old one
        // and failing the "name already taken" guard).
        cleanupSessionData();
        cleanupQuickPlayGuest().catch(() => { /* fire-and-forget */ });
        setQuickPlayActiveSession(null);
        setQuickPlayStudentName("");
        setUser(null);
        setView("public-landing");
      } else {
        setShowModeSelection(true);
        setFeedback(null); // Clear feedback when showing mode selection
      }
    } else {
      setUser(null);
      setView("public-landing");
    }
  };

  const saveScore = async (scoreOverride?: number) => {
    const finalScore = scoreOverride !== undefined ? scoreOverride : score;
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    // Quick Play (guest) mode - save progress with session UUID as identifier
    if (user.isGuest && quickPlayActiveSession) {
      // v2 path: score lives on the /quick-play socket's in-memory
      // leaderboard, not in the progress table. Emit a final
      // SCORE_UPDATE so the teacher sees the end-of-game total,
      // update the completed-modes set, and skip the Supabase insert.
      if (QUICKPLAY_V2) {
        quickPlaySocket.updateScore(Math.max(0, finalScore));
        setQuickPlayCompletedModes(prev => new Set([...prev, gameMode]));
        setIsSaving(false);
        return;
      }
      try {
        // Use the actual Supabase auth UID (not the guest app UID) so RLS allows the insert
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const authUid = authSession?.user?.id || user.uid;
        const progress: Omit<ProgressData, "id"> = {
          studentName: user.displayName,
          studentUid: authUid,
          assignmentId: quickPlayActiveSession.id, // Use session UUID as assignment ID
          classCode: "QUICK_PLAY", // Special identifier for Quick Play
          score: Math.max(0, finalScore),
          mode: gameMode,
          completedAt: new Date().toISOString(),
          mistakes: mistakes,
          avatar: user.avatar || "\uD83E\uDD8A"
        };

        // Optimistic save-and-queue.  Previously we awaited the INSERT
        // and showed a red 'Couldn't save your score' toast on failure;
        // on flaky classroom Wi-Fi that fired often and shook students'
        // trust in the game.  Now we drop the row into a local retry
        // queue and let the background flusher (installQuickPlayQueue-
        // Flusher, wired on app mount) push it to Supabase whenever the
        // network is cooperating.  Student sees the mode credited
        // instantly; no error toast ever fires for them.  If the send
        // really can't complete after 20 retries we give up silently —
        // the alternative would be nagging about something they can't
        // act on.
        enqueueQuickPlaySave({
          student_name: progress.studentName,
          student_uid: progress.studentUid || authUid,
          assignment_id: progress.assignmentId,
          class_code: progress.classCode,
          score: progress.score,
          mode: progress.mode,
          completed_at: progress.completedAt,
          mistakes: Array.isArray(mistakes) ? mistakes : [],
          avatar: progress.avatar || '🦊',
        });
        setQuickPlayCompletedModes(prev => new Set([...prev, gameMode]));

        setIsSaving(false);
        return;
      } catch (err) {
        // Only reachable if localStorage itself is broken (private
        // browsing, quota exhausted).  Don't surface — the UI has
        // already credited the mode; a toast here would just confuse.
        console.error('[Quick Play] enqueue failed:', err);
        setIsSaving(false);
        return;
      }
    }

    // Regular assignment mode
    if (!activeAssignment) return;

    // Anti-farm round cap — new semantics: 1 round = all allowed modes
    // once; after MAX_ASSIGNMENT_ROUNDS (3) full rounds the assignment
    // locks.  Total allowed plays = 3 × allowedModes.length.  Tracked
    // client-side in localStorage per (uid, assignmentId) — see
    // src/hooks/useAssignmentPlays.ts.  UI lock on the dashboard is the
    // primary gate; this is belt-and-suspenders.
    const allowedModesCount = (activeAssignment.allowedModes ?? []).filter(m => m !== 'flashcards').length || 1;
    // Uses max(DB play_count sum, localStorage cache) so the cap is
    // honoured across devices but still responds instantly to a fresh
    // local play before the server round-trips.
    const playsForThis = resolveAssignmentPlays(user?.uid, activeAssignment.id, studentProgress);
    const replayLocked = isAssignmentLocked(playsForThis, allowedModesCount);

    // Cap score to the maximum possible for this assignment (10 pts per word)
    const maxPossible = gameWords.length * 10;
    let cappedScore = Math.min(Math.max(0, finalScore), maxPossible);

    // Lucky Charm: forgive the student's first wrong answer (= +10
    // points up to maxPossible) by consuming one shield from inventory.
    // Only worth burning if the student actually got something wrong.
    if (cappedScore < maxPossible && boosters.consumeLuckyCharm()) {
      const bumped = Math.min(maxPossible, cappedScore + 10);
      showToast(`🍀 Lucky Charm used! Score ${cappedScore} → ${bumped}`, 'success');
      cappedScore = bumped;
    }

    // Apply active booster multipliers — xp_booster (2×) +
    // weekend_warrior (2× on Sat/Sun) stack multiplicatively.  Only
    // applies to the actual XP grant, not to the score record itself.
    const boosterMult = boosters.xpMultiplier();

    // If locked, still record the play for stats but grant zero XP.
    const baseEarned = replayLocked ? 0 : cappedScore;
    const xpEarned = Math.round(baseEarned * boosterMult);
    if (replayLocked) {
      showToast(`Assignment locked — you've completed all ${MAX_ASSIGNMENT_ROUNDS} rounds. Try another assignment.`, 'info');
    } else if (boosterMult > 1) {
      showToast(`${boosterMult}× XP active! ${cappedScore} → ${xpEarned} XP`, 'success');
    }
    const newXp = xp + xpEarned;
    // Streak handling — try to consume a Streak Freeze before resetting.
    // Lets students keep their streak after a single bad day if they've
    // bought the shield from the shop.
    let newStreak: number;
    if (cappedScore >= 80) {
      newStreak = streak + 1;
    } else if (boosters.tryConsumeStreakFreeze()) {
      newStreak = streak; // freeze consumed — preserve streak
      showToast('🧊 Streak Freeze used — your streak is safe!', 'success');
    } else {
      newStreak = 0;
    }
    setXp(newXp);
    setStreak(newStreak);

    // Advance the retention weekly-challenge counter — any completed
    // game counts toward the student's weekly-play target.
    retention.recordPlay();

    // Record this completed game against the assignment's round cap.
    // Increments even when locked (so the total stays honest for
    // display) but zero XP was granted above if locked.
    if (user?.uid) {
      incrementAssignmentPlays(user.uid, activeAssignment.id);
    }

    // OPTIMIZED: Queue badge checks instead of immediate execution
    // Badges are cached server-side, so client checks are fast
    if (cappedScore === 100 && !badges.includes("🎯 Perfect Score")) queueSaveOperation(() => awardBadge("🎯 Perfect Score"));
    if (newStreak >= 5 && !badges.includes("🔥 Streak Master")) queueSaveOperation(() => awardBadge("🔥 Streak Master"));
    if (newXp >= 500 && !badges.includes("💎 XP Hunter")) queueSaveOperation(() => awardBadge("💎 XP Hunter"));

    // Streak milestone celebrations
    if (STREAK_CELEBRATION_MILESTONES.includes(newStreak)) {
      celebrate('big');
      showToast(`🔥 ${newStreak}-day streak! Amazing dedication!`, "success");
    }

    // For students using the teacher approval workflow, user.uid is already the profile.auth_uid
    // For regular students, we try to get the session UID
    const { data: { session } } = await supabase.auth.getSession();
    const sessionUid = session?.user?.id;

    // Determine the student UID to use for progress tracking
    // If we have a session, check for a mapped profile UID (for anonymous sessions)
    // Otherwise, use user.uid directly (which is profile.auth_uid for approved students)
    let studentUid: string;
    if (sessionUid) {
      const mappedUid = localStorage.getItem(`vocaband_student_${sessionUid}`);
      studentUid = mappedUid || sessionUid;
    } else {
      studentUid = user.uid;
    }

    const progress: Omit<ProgressData, "id"> = {
      studentName: user.displayName,
      studentUid: studentUid,
      assignmentId: activeAssignment.id,
      classCode: user.classCode || "",
      score: cappedScore,
      mode: gameMode,
      completedAt: new Date().toISOString(),
      mistakes: mistakes,
      avatar: user.avatar || "🦊"
    };

    // Optimistic save pattern for regular class assignments (mirrors
    // the Kahoot-style behaviour we shipped for Quick Play).  We write
    // local state immediately, attempt the RPC, and fall back to the
    // background retry queue on any error — no red banner, no toast.
    //
    // Why no error UI: the student can't act on a network failure
    // mid-game and they already see their score + XP update.  The
    // flusher (installQuickPlayQueueFlusher, wired on mount) retries
    // the save on 'online', tab refocus, and a 30s interval.  If the
    // save ultimately can't be sent after 20 attempts we give up
    // silently — the alternative is nagging the student about a state
    // they can't fix.
    //
    // word_attempts batch is preserved: storing RPC args (rather than
    // a raw progress row) in the queue means the retried save goes
    // through save_student_progress and still appends word_attempts +
    // increments play_count the same way the first attempt would.
    const rpcArgs = {
      p_student_name: user.displayName,
      p_student_uid: studentUid,
      p_assignment_id: activeAssignment.id,
      p_class_code: user.classCode || "",
      p_score: cappedScore,
      p_mode: gameMode,
      p_mistakes: Array.isArray(mistakes) ? mistakes.length : (mistakes || 0),
      p_avatar: user.avatar || "🦊",
      p_word_attempts: wordAttemptBatch,
    };

    // Optimistic local-state update — UI reflects the save immediately
    // so the student never sees "saving..." spinners or error banners.
    // If the real server-assigned id arrives later we reconcile below;
    // if the save ends up routed through the queue it still lands
    // eventually, and the local row will be overwritten on the next
    // fetch with the server's version.
    const optimisticProgress: ProgressData = {
      id: `local-${Date.now()}`,
      ...progress,
    };
    setStudentProgress(prev => {
      const existingIndex = prev.findIndex(
        p => p.assignmentId === activeAssignment.id
          && p.mode === gameMode
          && p.studentUid === studentUid
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = optimisticProgress;
        return updated;
      }
      return [...prev, optimisticProgress];
    });
    celebrate('big');

    try {
      const { data: progressId, error: rpcError } = await supabase.rpc('save_student_progress', rpcArgs);
      if (rpcError) throw rpcError;

      // Reconcile the optimistic row with the server's id.
      setStudentProgress(prev => prev.map(p =>
        p.id === optimisticProgress.id ? { ...p, id: progressId } : p
      ));

      // XP/streak write is batched with other queued saves — cheap,
      // non-critical to the game loop, survives a failed flush the
      // next time it runs.
      queueSaveOperation(async () => {
        await supabase.from('users').update({ xp: newXp, streak: newStreak }).eq('uid', user.uid);
      });

      // Clear any legacy retry key for this assignment+mode — the new
      // save queue (enqueueAssignmentSave) uses a different storage
      // key, so both systems can coexist while old keys drain.
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.removeItem(retryKey);
    } catch (error) {
      // Silent.  Log for dev console but never surface a banner to the
      // student — the queue will retry in the background.
      console.error("[assignment save] queued for retry:", error);
      enqueueAssignmentSave(rpcArgs);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMatchClick = (item: {id: number, type: 'english' | 'arabic'}) => {

    gameDebug.logButtonClick({
      button: 'matching_card',
      gameMode: 'matching',
      wordId: item.id,
      disabled: matchedIds.includes(item.id) || isMatchingProcessing,
      feedback: null,
    });

    if (matchedIds.includes(item.id) || isMatchingProcessing) {
      return;
    }

    // Only pronounce when clicking English cards — Hebrew/Arabic cards
    // should not trigger English audio (confusing for students)
    if (item.type === 'english') {
      const matchWord = gameWords.find(w => w.id === item.id);
      setTimeout(() => {
        speakWord(item.id, matchWord?.english);
        gameDebug.logPronunciation({ wordId: item.id, word: matchWord?.english || '', method: 'manual', success: true });
      }, 0);
    }

    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        // Correct match - set processing flag to prevent rapid clicks
        isProcessingRef.current = true;
        setIsMatchingProcessing(true);
        setMatchedIds([...matchedIds, item.id]);
        // Record the correct match as a word attempt for mastery tracking.
        setWordAttemptBatch(prev => [...prev, { word_id: item.id, is_correct: true }]);
        const newScore = score + 15;
        setScore(newScore);

        emitScoreUpdate(newScore);

        setSelectedMatch(null);

        if (matchedIds.length + 1 === matchingPairs.length / 2) {
          // All matched - finish game
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => {
            setIsFinished(true);
            saveScore(newScore);
            isProcessingRef.current = false;
            setIsMatchingProcessing(false);
          }, 500);
        } else {
          // Allow next match after brief delay
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            setIsMatchingProcessing(false);
          }, 300);
        }
      } else {
        // Wrong match - just change selection
        setSelectedMatch(item);
      }
    }
  };

  const handleAnswer = (selectedWord: Word) => {

    if (feedback) {
      return;
    }

    if (!currentWord) {
      console.error('[handleAnswer] ERROR - No currentWord!', { selectedWordId: selectedWord.id, gameMode, currentIndex, gameWordsCount: gameWords.length });
      return;
    }


    if (selectedWord.id === currentWord.id) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 10;
      setScore(newScore);

      // Clear attempts for this word since they got it right
      setWordAttempts(prev => {
        const newState = { ...prev };
        delete newState[currentWord.id];
        return newState;
      });

      // Record the correct attempt for per-word mastery tracking.
      setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: true }]);

      emitScoreUpdate(newScore);

      // Auto-skip quickly after correct answer (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
          setHiddenOptions([]);
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      // Track attempts for this word
      const currentAttempts = (wordAttempts[currentWord.id] || 0) + 1;
      setWordAttempts(prev => ({ ...prev, [currentWord.id]: currentAttempts }));

      if (currentAttempts >= MAX_ATTEMPTS_PER_WORD) {
        // Show the right answer after max attempts
        setFeedback("show-answer");
        setMistakes(prev => addUnique(prev, currentWord.id));
        // Final incorrect attempt on this word — record for mastery tracking.
        setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: false }]);

        // Clear any pending timeout first
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (currentIndex < gameWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFeedback(null);
            setHiddenOptions([]);
            // Clear attempts for next word
            setWordAttempts(prev => removeKey(prev, currentWord.id));
          } else {
            setIsFinished(true);
            saveScore();
          }
        }, SHOW_ANSWER_DELAY_MS);
      } else {
        // Show try again with attempt count
        setFeedback("wrong");
        playWrong();

        // Clear any pending timeout first
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedback(null);
        }, WRONG_FEEDBACK_DELAY_MS);
      }
    }
  };

  const handleTFAnswer = (isTrue: boolean) => {

    gameDebug.logButtonClick({
      button: isTrue ? 'true_button' : 'false_button',
      gameMode,
      wordId: currentWord?.id ?? -1,
      disabled: !!feedback,
      feedback,
    });

    if (feedback) {
      gameDebug.logButtonClick({
        button: isTrue ? 'true_button' : 'false_button',
        gameMode,
        wordId: currentWord?.id ?? -1,
        disabled: true,
        feedback,
      });
      return;
    }

    // Guard against null/undefined tfOption
    if (!tfOption || !currentWord) {
      gameDebug.logError({
        error: 'tfOption or currentWord is null',
        context: 'handleTFAnswer',
        details: { tfOption, currentWord },
      });
      return;
    }

    const isActuallyTrue = tfOption?.id === currentWord.id;
    const isCorrect = isTrue === isActuallyTrue;

    gameDebug.logAnswer({
      gameMode,
      wordId: currentWord.id,
      userAnswer: isTrue,
      correctAnswer: isActuallyTrue,
      isCorrect,
      willAutoSkip: isCorrect,
    });

    // Record the attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

    if (isCorrect) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 15;
      setScore(newScore);

      emitScoreUpdate(newScore);

      // Auto-skip after correct answer (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      gameDebug.logAutoSkip({
        triggered: true,
        delay: AUTO_SKIP_DELAY_MS,
        reason: 'correct_answer',
      });
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      setFeedback("wrong");
      playWrong();
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }

      gameDebug.logAutoSkip({
        triggered: false,
        delay: WRONG_FEEDBACK_DELAY_MS,
        reason: 'wrong_answer_will_clear_after_delay',
      });

      // Clear feedback after delay (clear any pending timeout first)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, WRONG_FEEDBACK_DELAY_MS);
    }
  };

  const handleFlashcardAnswer = (knewIt: boolean) => {

    gameDebug.logButtonClick({
      button: knewIt ? 'flashcard_got_it' : 'flashcard_still_learning',
      gameMode: 'flashcards',
      wordId: currentWord?.id ?? -1,
      disabled: false,
      feedback,
    });

    // Set processing flag to prevent double-clicks
    isProcessingRef.current = true;

    // Record the flashcard answer for per-word mastery tracking.
    // Flashcard "Got it" = correct, "Still learning" = incorrect.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: knewIt }]);

    let currentScore = score;
    if (knewIt) {
      currentScore = score + 5;
      setScore(currentScore);
      emitScoreUpdate(currentScore);
    } else {
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
    }

    // Auto-advance to next word with brief delay for visual feedback
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentIndex < gameWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        isProcessingRef.current = false;
      } else {
        setIsFinished(true);
        saveScore(currentScore);
      }
    }, 400); // Brief delay for user to see their choice registered
  };

  const handleSpellingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    gameDebug.logButtonClick({
      button: 'spelling_submit',
      gameMode: 'spelling',
      wordId: currentWord?.id ?? -1,
      disabled: !!feedback,
      feedback,
    });

    if (feedback) {
      return;
    }


    const isCorrect = isAnswerCorrect(spellingInput, currentWord.english);

    gameDebug.logAnswer({
      gameMode: 'spelling',
      wordId: currentWord.id,
      userAnswer: spellingInput,
      correctAnswer: currentWord.english,
      isCorrect,
      willAutoSkip: isCorrect,
    });

    // Record the spelling attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

    if (isCorrect) {
      setFeedback("correct");
      celebrate('small');
      const newScore = score + 20;
      setScore(newScore);

      emitScoreUpdate(newScore);

      gameDebug.logAutoSkip({
        triggered: true,
        delay: AUTO_SKIP_DELAY_MS,
        reason: 'correct_spelling',
      });

      // Use feedbackTimeoutRef for consistent auto-advance
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
          setSpellingInput("");
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, AUTO_SKIP_DELAY_MS);
    } else {
      setFeedback("wrong");
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
      // Use feedbackTimeoutRef for consistent feedback clearing
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), WRONG_FEEDBACK_DELAY_MS);
    }
  };

  // Global cookie banner — renders on top of ANY view until accepted
  // Only show to non-authenticated users (logged-in users have already accepted via privacy consent)
  const cookieBannerOverlay = showCookieBanner && !user ? (
    <CookieBanner onAccept={handleCookieAccept} onCustomize={handleCookieCustomize} />
  ) : null;

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
      // Stamp the user's intent BEFORE the Google redirect so we can
      // honour it on the way back.  Without this, "Log in as Teacher"
      // and "Sign in with Google" on the student page fire the same
      // OAuth flow — and restoreSession then routes based purely on
      // whatever role exists in the users table for that email.  If
      // the Google account has a student profile, the teacher button
      // silently logs you in as the student.  Not good.
      //
      // After OAuth returns, restoreSession reads this flag and will
      // refuse to complete login when the intent is 'teacher' but the
      // found profile is not a teacher — the user sees an error and
      // stays signed out instead of being dropped into the wrong role.
      try {
        sessionStorage.setItem('oauth_intended_role', 'teacher');
        sessionStorage.setItem('oauth_intended_role_at', String(Date.now()));
      } catch { /* storage unavailable — fall through, flag absent = legacy behavior */ }
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
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
          studentLoginName={studentLoginName}
          setStudentLoginName={setStudentLoginName}
          existingStudents={existingStudents}
          setExistingStudents={setExistingStudents}
          showNewStudentForm={showNewStudentForm}
          setShowNewStudentForm={setShowNewStudentForm}
          studentAvatar={studentAvatar}
          setStudentAvatar={setStudentAvatar}
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
          handleLoginAsStudent={handleLoginAsStudent}
          handleNewStudentSignup={handleNewStudentSignup}
          loadStudentsInClass={loadStudentsInClass}
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
    setShowExitConfirmModal(false);
    // Signal that the next popstate should NOT re-trap.
    // Then sign out and reset history so the logged-out
    // public-landing renders cleanly.  The user can then
    // press back once more to exit the tab naturally.
    exitIntentRef.current = true;
    supabase.auth.signOut().catch(() => {});
    try { window.history.replaceState({ view: 'public-landing' }, ''); } catch { /* noop */ }
    // Give SIGNED_OUT a tick to fire, then release the
    // exit-intent guard so normal navigation resumes.
    setTimeout(() => { exitIntentRef.current = false; }, 500);
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
  const handleConfirmClassSwitch = async () => {
    if (!pendingClassSwitch) return;
    const { toCode, supabaseUser } = pendingClassSwitch;
    try {
      // Use the SECURITY DEFINER RPC instead of direct UPDATEs. The
      // users_update RLS policy (migration 20260340) freezes class_code for
      // non-admins to prevent casual class hopping via .update(). A direct
      // .update({class_code: newCode}) therefore 403s here. The RPC
      // validates target class exists + updates both users + student_profiles
      // atomically for the caller only. Added in migration 20260506.
      const { error: rpcErr } = await supabase.rpc('switch_student_class', {
        p_new_code: toCode,
      });
      if (rpcErr) throw rpcErr;

      // Load the new class's data and navigate to its dashboard.
      const { data: classRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', toCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', toCode).eq('student_uid', supabaseUser.id),
        ]);
        setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        setStudentProgress((progressResult.data ?? []).map(mapProgress));
      }

      // Update in-memory user.classCode so the dashboard header shows the new code.
      setUser(prev => prev ? { ...prev, classCode: toCode } : prev);
      setPendingClassSwitch(null);
      setView("student-dashboard");
      setLoading(false);
    } catch (err) {
      console.error('Class switch failed:', err);
      showToast('Could not switch class. Please try again.', 'error');
      setPendingClassSwitch(null);
    }
  };

  const handleCancelClassSwitch = async () => {
    if (!pendingClassSwitch) return;
    const { fromCode, supabaseUser } = pendingClassSwitch;
    // User chose to stay in their current class — load that class's data
    // as if the intended-code was never there.
    try {
      const { data: classRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', fromCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', fromCode).eq('student_uid', supabaseUser.id),
        ]);
        setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        setStudentProgress((progressResult.data ?? []).map(mapProgress));
      }
    } catch { /* non-fatal — dashboard still renders */ }
    setPendingClassSwitch(null);
    setView("student-dashboard");
    setLoading(false);
  };

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
          onLiveChallengeClick={() => {
            if (classes.length === 0) showToast("Create a class first!", "error");
            else if (classes.length === 1) {
              setSelectedClass(classes[0]);
              setView("live-challenge");
              setIsLiveChallenge(true);
              if (socket) {
                socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: classes[0].code });
              }
            } else {
              setView("live-challenge-class-select");
            }
          }}
          onClassroomClick={() => { fetchScores(); fetchTeacherAssignments(); setView("classroom"); }}
          onApprovalsClick={() => { loadPendingStudents(); setView("teacher-approvals"); }}
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
            setAssignmentModes(assignment.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
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
            setAssignmentModes(assignment.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
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