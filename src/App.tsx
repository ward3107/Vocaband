import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import { ALL_WORDS, BAND_1_WORDS, BAND_2_WORDS, TOPIC_PACKS, Word } from "./data/vocabulary";
import { generateSentencesForAssignment } from "./data/sentence-bank";
import {
  searchWords
} from "./data/vocabulary-matching";
import {
  Volume2, VolumeX,
  Languages,
  Trophy,
  RefreshCw,
  LogIn,
  LogOut,
  UserCircle,
  Users,
  CheckCircle2,
  BookOpen,
  BarChart3,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Camera,
  Trash2,
  PenTool,
  Zap,
  Layers,
  Shuffle,
  Repeat,
  Copy,
  Check,
  MessageCircle,
  History,
  Info,
  ChevronDown,
  Plus,
  X,
  TrendingUp,
  GraduationCap,
  Loader2,
  QrCode,
  Search,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, mapProgressToDb, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { useAudio } from "./hooks/useAudio";
import QuickPlayMonitor from "./components/QuickPlayMonitor";
import QuickPlayKickedScreen from "./components/QuickPlayKickedScreen";
import QuickPlaySessionEndScreen from "./components/QuickPlaySessionEndScreen";
import FloatingButtons from "./components/FloatingButtons";
import DashboardOnboarding from "./components/DashboardOnboarding";
import StudentOnboarding from "./components/StudentOnboarding";
import { PRIVACY_POLICY_VERSION, DATA_CONTROLLER, DATA_COLLECTION_POINTS, THIRD_PARTY_REGISTRY } from "./config/privacy-config";
import { shuffle, chunkArray, addUnique, removeKey } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
import TopAppBar from "./components/TopAppBar";
import ActionCard from "./components/ActionCard";
import ClassCard from "./components/ClassCard";
import { CreateAssignmentWizard } from "./components/CreateAssignmentWizard";
import { PastePreviewModal } from "./components/PastePreviewModal";
import { analyzePastedText, type WordAnalysisResult } from "./utils/wordAnalysis";
import CookieBanner, { CookiePreferences } from "./components/CookieBanner";
import { LandingPageWrapper, TermsPageWrapper, PrivacyPageWrapper, DemoModeWrapper, AccessibilityStatementWrapper } from "./components/LazyComponents";
import OAuthButton from "./components/OAuthButton";
import OAuthCallback from "./components/OAuthCallback";
import OAuthClassCode from "./components/OAuthClassCode";
import { SuspenseWrapper } from "./components/SuspenseWrapper";
import { ShowAnswerFeedback } from "./components/ShowAnswerFeedback";
import { loadMammoth, loadSocketIO, loadConfetti } from "./utils/lazyLoad";
import { trackError, trackAutoError } from "./errorTracking";
import {
  MAX_ATTEMPTS_PER_WORD, AUTO_SKIP_DELAY_MS, SHOW_ANSWER_DELAY_MS, WRONG_FEEDBACK_DELAY_MS,
  MOTIVATIONAL_MESSAGES, SPEAKABLE_MOTIVATIONS, randomMotivation,
  XP_TITLES, getXpTitle, PREMIUM_AVATARS, AVATAR_CATEGORY_UNLOCKS,
  THEMES, POWER_UP_DEFS, BOOSTERS_DEFS, NAME_FRAMES, NAME_TITLES, LETTER_COLORS,
  type GameMode,
} from "./constants/game";
import { ErrorTrackingPanel } from "./components/ErrorTrackingPanel";
const GameView = lazy(() => import("./views/GameView"));
const AnalyticsView = lazy(() => import("./views/AnalyticsView"));
const GradebookView = lazy(() => import("./views/GradebookView"));
const LiveChallengeClassSelectView = lazy(() => import("./views/LiveChallengeClassSelectView"));
const GlobalLeaderboardView = lazy(() => import("./views/GlobalLeaderboardView"));
const TeacherApprovalsView = lazy(() => import("./views/TeacherApprovalsView"));
const QuickPlaySetupView = lazy(() => import("./views/QuickPlaySetupView"));
const StudentAccountLoginView = lazy(() => import("./views/StudentAccountLoginView"));
const QuickPlayStudentView = lazy(() => import("./views/QuickPlayStudentView"));
const LiveChallengeView = lazy(() => import("./views/LiveChallengeView"));
const StudentDashboardView = lazy(() => import("./views/StudentDashboardView"));
const TeacherDashboardView = lazy(() => import("./views/TeacherDashboardView"));
const GameModeSelectionView = lazy(() => import("./views/GameModeSelectionView"));
const PrivacySettingsView = lazy(() => import("./views/PrivacySettingsView"));
const ShopView = lazy(() => import("./views/ShopView"));

// Types for lazy-loaded modules
type MammothModule = typeof import('mammoth');
type ConfettiModule = typeof import('canvas-confetti');
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

// Generate a unique negative ID for custom words (not security-sensitive, just needs uniqueness)
function uniqueNegativeId(offset = 0): number {
  return -(Date.now() + offset + secureRandomInt(10000));
}

export default function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  // Detect Quick Play session from URL synchronously so it takes priority over auth redirects
  const quickPlaySessionParam = new URLSearchParams(window.location.search).get('session');

  const [view, setView] = useState<
    | "public-landing"
    | "public-terms"
    | "public-privacy"
    | "accessibility-statement"
    | "student-account-login"
    | "landing"
    | "game"
    | "teacher-dashboard"
    | "teacher-approvals"
    | "student-dashboard"
    | "create-assignment"
    | "gradebook"
    | "live-challenge"
    | "live-challenge-class-select"
    | "analytics"
    | "global-leaderboard"
    | "students"
    | "shop"
    | "privacy-settings"
    | "quick-play-setup"
    | "quick-play-teacher-monitor"
    | "quick-play-student"
  >(() => {
    if (quickPlaySessionParam) return "quick-play-student";
    if (window.location.pathname === "/accessibility-statement") return "accessibility-statement";
    return "public-landing";
  });
  const previousViewRef = useRef<string>("public-landing");

  // Custom setView that tracks previous view for back navigation
  const handleSetView = (newView: typeof view) => {
    // Only track previous view when navigating TO privacy/terms pages
    if (newView === "public-privacy" || newView === "public-terms") {
      previousViewRef.current = view;
    }
    setView(newView);
  };

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
      // Verify it was saved
      const verify = localStorage.getItem("vocaband_cookie_consent");
    } catch (e) {
      console.error('[Cookie Banner] Failed to save consent:', e);
    }
    setShowCookieBanner(false);
  };

  const handleCookieCustomize = (preferences: CookiePreferences) => {
    handleCookieAccept(preferences);
  };

  const handlePublicNavigate = (page: "home" | "terms" | "privacy") => {
    const viewMap = {
      home: "public-landing",
      terms: "public-terms",
      privacy: "public-privacy",
    } as const;
    setView(viewMap[page]);
  };
  const [shopTab, setShopTab] = useState<"avatars" | "themes" | "powerups" | "titles" | "frames" | "boosters">("avatars");
  const [showDemo, setShowDemo] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  // Track whether handleStudentLogin is in progress so onAuthStateChange
  // doesn't clobber loading/view mid-login (signInAnonymously fires the
  // listener before handleStudentLogin finishes its DB queries).
  const manualLoginInProgress = useRef(false);
  const restoreInProgress = useRef(false);
  const [landingTab, setLandingTab] = useState<"student" | "teacher">("student");
  const [studentLoginClassCode, setStudentLoginClassCode] = useState("");
  const [studentLoginName, setStudentLoginName] = useState("");
  const [existingStudents, setExistingStudents] = useState<Array<{ id: string, displayName: string, xp: number, status: string, avatar?: string }>>([]);
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string, displayName: string, classCode: string, className: string, joinedAt: string }>>([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [createdClassName, setCreatedClassName] = useState<string>("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectStudentModal, setRejectStudentModal] = useState<{ id: string; displayName: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openDropdownClassId, setOpenDropdownClassId] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);

  const [studentAvatar, setStudentAvatar] = useState("🦊");
  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // --- OAUTH STATE ---
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [oauthAuthUid, setOauthAuthUid] = useState<string | null>(null);
  const [showOAuthClassCode, setShowOAuthClassCode] = useState(false);

  const AVATAR_CATEGORIES = {
    Animals: ["🦊", "🦁", "🐯", "🐨", "🐼", "🐸", "🐵", "🦄", "🐻", "🐰", "🦋", "🐙", "🦜", "🐶", "🐱", "🦈", "🐬", "🦅", "🐝", "🦉"],
    Faces: ["😎", "🤓", "🥳", "😊", "🤩", "🥹", "😜", "🤗", "🥰", "😇", "🧐", "🤠", "😈", "🤡", "👻", "🤖", "👽", "💀"],
    Fantasy: ["🧙", "🧛", "🧜", "🧚", "🦸", "🦹", "🧝", "👸", "🤴", "🥷", "🦖", "🐉", "🧞", "🧟", "🎃"],
    Sports: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "⛳", "🏊", "🚴", "🏄"],
    Food: ["🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🥨", "🍦", "🍩", "🍪", "🎂", "🍰", "🍉", "🍇", "🥑"],
    Objects: ["🎸", "🎹", "🎺", "🎷", "🪕", "🎻", "🎤", "🎧", "📷", "🎮", "🕹️", "💎", "🎨", "🔮", "🏆"],
    Vehicles: ["🚗", "🚕", "🏎️", "🚓", "🚑", "🚒", "✈️", "🚀", "🛶", "🚲", "🛸", "🚁", "🚂", "⛵", "🛵"],
    Nature: ["🌸", "🌺", "🌻", "🌷", "🌹", "🍀", "🌲", "🌳", "🌵", "🌴", "🍄", "🌾", "🌈", "❄️", "🌊"],
    Space: ["🚀", "🛸", "🌙", "⭐", "🌟", "💫", "✨", "☄️", "🪐", "🌍", "🔥", "💧", "🌕", "🌑", "🌌"]
  };

  const [selectedAvatarCategory, setSelectedAvatarCategory] = useState<keyof typeof AVATAR_CATEGORIES>("Animals");

  // --- LIVE CHALLENGE STATE ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry>>({});
  const [isLiveChallenge, setIsLiveChallenge] = useState(false);

  // --- QUICK PLAY STATE ---
  const [quickPlaySessionCode, setQuickPlaySessionCode] = useState<string | null>(null);
  const [quickPlaySelectedWords, setQuickPlaySelectedWords] = useState<Word[]>([]);
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<{id: string, sessionCode: string, wordIds: number[], words: Word[]} | null>(null);
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'];
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(() => QUICK_PLAY_AVATARS[secureRandomInt( QUICK_PLAY_AVATARS.length)]);
  const quickPlayNameInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPlayJoinedStudents, setQuickPlayJoinedStudents] = useState<{name: string, score: number, avatar: string, lastSeen: string, mode: string, studentUid: string}[]>([]);
  const [quickPlayCustomWords, setQuickPlayCustomWords] = useState<Map<string, {hebrew: string, arabic: string}>>(new Map());
  const [quickPlayAddingCustom, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [quickPlayTranslating, setQuickPlayTranslating] = useState<Set<string>>(new Set());
  const [quickPlayKicked, setQuickPlayKicked] = useState(false);
  const [quickPlaySessionEnded, setQuickPlaySessionEnded] = useState(false);
  const [quickPlayCompletedModes, setQuickPlayCompletedModes] = useState<Set<string>>(new Set());
  const [quickPlayStatusMessage, setQuickPlayStatusMessage] = useState("");

  // Game music player state
  const [gameMusicTrack, setGameMusicTrack] = useState(0);
  const [gameMusicVolume, setGameMusicVolume] = useState(0.5);
  const [gameMusicPlaying, setGameMusicPlaying] = useState(false);
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);

  const GAME_MUSIC_TRACKS = useMemo(() => [
    { label: "🎯 Steady Focus", file: "/game-music/bgm-steady-focus.mp3" },
    { label: "⚡ Upbeat Energy", file: "/game-music/bgm-upbeat-energy.mp3" },
    { label: "🌊 Chill Vibes", file: "/game-music/bgm-chill-vibes.mp3" },
    { label: "🗺️ Adventure Quest", file: "/game-music/bgm-adventure-quest.mp3" },
    { label: "🎸 Funky Groove", file: "/game-music/bgm-funky-groove.mp3" },
    { label: "🚀 Space Explorer", file: "/game-music/bgm-space-explorer.mp3" },
    { label: "🏆 Victory March", file: "/game-music/bgm-victory-march.mp3" },
  ], []);

  // Handle music track/volume changes
  useEffect(() => {
    if (!gameMusicPlaying) {
      if (gameMusicRef.current) {
        gameMusicRef.current.pause();
        gameMusicRef.current = null;
      }
      return;
    }
    // Create or update audio
    if (gameMusicRef.current) {
      gameMusicRef.current.pause();
    }
    const audio = new Audio(GAME_MUSIC_TRACKS[gameMusicTrack].file);
    audio.volume = gameMusicVolume;
    audio.loop = true;
    audio.play().catch(() => {});
    gameMusicRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [gameMusicPlaying, gameMusicTrack, GAME_MUSIC_TRACKS]);

  // Update volume without restarting track
  useEffect(() => {
    if (gameMusicRef.current) {
      gameMusicRef.current.volume = gameMusicVolume;
    }
  }, [gameMusicVolume]);

  // Stop music when leaving the monitor view
  useEffect(() => {
    if (view !== "quick-play-teacher-monitor") {
      setGameMusicPlaying(false);
    }
  }, [view]);

  // --- TEACHER DATA STATE ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"Band 1" | "Band 2" | "Custom">("Band 1");
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [allScores, setAllScores] = useState<ProgressData[]>([]);
  const [classStudents, setClassStudents] = useState<{name: string, classCode: string, lastActive: string}[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<{name: string, score: number, avatar: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentModes, setAssignmentModes] = useState<string[]>([]);
  const [assignmentSentences, setAssignmentSentences] = useState<string[]>([]);
  const [sentenceDifficulty, setSentenceDifficulty] = useState<1 | 2 | 3 | 4>(2);
  const [sentencesAutoGenerated, setSentencesAutoGenerated] = useState(false);
  const [assignmentStep, setAssignmentStep] = useState(1);

  // --- SMART PASTE STATE ---
  const [pastedText, setPastedText] = useState("");
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteMatchedCount, setPasteMatchedCount] = useState(0);
  const [pasteUnmatched, setPasteUnmatched] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [gSheetsUrl, setGSheetsUrl] = useState("");
  const [gSheetsLoading, setGSheetsLoading] = useState(false);
  const [showTopicPacks, setShowTopicPacks] = useState(false);

  // --- QUICK SEARCH & FILTERS STATE ---
  const [wordSearchQuery, setWordSearchQuery] = useState("");
  const [selectedCore, setSelectedCore] = useState<"Core I" | "Core II" | "">("");
  const [selectedPos, setSelectedPos] = useState<string>("");
  const [selectedRecProd, setSelectedRecProd] = useState<"Rec" | "Prod" | "">("");
  const [showWordBank, setShowWordBank] = useState(false);
  const [enableFuzzyMatch, setEnableFuzzyMatch] = useState(true);
  const [enableWordFamilies, setEnableWordFamilies] = useState(false);

  // --- TOAST NOTIFICATIONS STATE ---
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info', action?: { label: string, onClick: () => void }}[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
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
        // Ensure we have at least an anonymous auth session — RLS requires it
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          await supabase.auth.signInAnonymously().catch(() => {});
        }

        const { data, error } = await supabase
          .from('quick_play_sessions')
          .select('*')
          .eq('session_code', sessionCode)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          console.error('Failed to load Quick Play session:', error);
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
          words: allWords
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
                const { data: existingRecord } = await supabase
                  .from('progress')
                  .select('id')
                  .eq('assignment_id', data.id)
                  .eq('student_uid', authUid)
                  .limit(1);
                if (existingRecord && existingRecord.length > 0) {
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
                    allowedModes: ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"],
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
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
                .select('id, session_code, word_ids, is_active, custom_words')
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
                  setQuickPlayActiveSession({ id: data.id, sessionCode: data.session_code, wordIds: data.word_ids || [], words: allSessionWords });
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
                    allowedModes: ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"],
                    sentences: quickPlaySentences, sentenceDifficulty: 2,
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
  // Real-time polling for Quick Play teacher monitor
  // Polls Supabase for student progress every 3 seconds when in teacher monitor view
  // Helper: aggregate raw progress rows into the leaderboard format
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

    return Array.from(studentMap.values()).sort((a, b) => b.score - a.score);
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
        setQuickPlayJoinedStudents(aggregateProgress(data));
      }
    };
    fetchProgress();

    // 2. Subscribe to realtime changes on progress table for this session
    const channel = supabase
      .channel(`qp-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`
        },
        (payload) => {
          // Re-fetch on any change — simple and correct
          fetchProgress();
        }
      )
      .subscribe((status) => {
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, quickPlayActiveSession?.id, aggregateProgress]);

  // Quick Play student: subscribe to session status (end) and progress deletes (kick)
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession?.sessionCode) return;

    const sessionCode = quickPlayActiveSession.sessionCode;
    const sessionId = quickPlayActiveSession.id;

    // 1. Subscribe to session end
    const sessionChannel = supabase
      .channel(`qp-session-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quick_play_sessions',
          filter: `session_code=eq.${sessionCode}`
        },
        (payload) => {
          if (payload.new && !(payload.new as any).is_active) {
            // Show session end screen instead of just redirecting
            setQuickPlaySessionEnded(true);
            setActiveAssignment(null);
          }
        }
      )
      .subscribe();

    // 2. Subscribe to progress deletes (teacher kicked this student)
    const kickChannel = supabase
      .channel(`qp-kick-${sessionId}-${user.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`
        },
        () => {
          // Check if our own progress was deleted by querying with auth UID
          supabase.auth.getSession().then(({ data: { session: authSess } }) => {
            const authUid = authSess?.user?.id;
            const query = supabase
              .from('progress')
              .select('id')
              .eq('assignment_id', sessionId);
            // Prefer UID match, fall back to name
            if (authUid) {
              query.eq('student_uid', authUid);
            } else {
              query.eq('student_name', user.displayName);
            }
            query.limit(1).then(({ data }) => {
              if (!data || data.length === 0) {
                // Our progress was deleted — we've been kicked
                setQuickPlayKicked(true);
                setActiveAssignment(null);
              }
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(kickChannel);
    };
  }, [user?.isGuest, quickPlayActiveSession?.sessionCode, quickPlayActiveSession?.id, user?.uid, user?.displayName]);

  const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
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
  const translationCache = useRef<Map<string, {hebrew: string, arabic: string}>>(new Map());

  const translateWord = async (englishWord: string): Promise<{hebrew: string, arabic: string} | null> => {
    // Check cache first
    const cached = translationCache.current.get(englishWord.toLowerCase());
    if (cached) return cached;

    try {
      // Using MyMemory Translation API (free, no API key required)
      const [hebrewRes, arabicRes] = await Promise.all([
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishWord)}&langpair=en|he`),
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishWord)}&langpair=en|ar`)
      ]);

      const hebrewData = await hebrewRes.json();
      const arabicData = await arabicRes.json();

      if (hebrewData.responseStatus === 200 && arabicData.responseStatus === 200) {
        const result = {
          hebrew: hebrewData.responseData.translatedText,
          arabic: arabicData.responseData.translatedText
        };
        // Cache the result
        translationCache.current.set(englishWord.toLowerCase(), result);
        return result;
      }

      return null;
    } catch (error) {
      trackAutoError(error, 'Translation service error');
      return null;
    }
  };

  // --- STUDENT DATA STATE ---
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);

  // --- THEME ---
  const activeThemeConfig = useMemo(() => {
    const themeId = user?.activeTheme ?? 'default';
    return THEMES.find(t => t.id === themeId) ?? THEMES[0];
  }, [user?.activeTheme]);

  const { speak: speakWordRaw, preloadMany, preloadMotivational, playMotivational: playMotivationalRaw, getMotivationalLabel, playWrong } = useAudio();

  // In Quick Play online mode, keep word pronunciation but suppress motivational sounds
  const isQuickPlayGuest = !!user?.isGuest;
  const speakWord = speakWordRaw; // Always allow pronunciation
  const playMotivational = (...args: Parameters<typeof playMotivationalRaw>) => {
    if (isQuickPlayGuest) return ''; // Mute motivational sounds in QP
    return playMotivationalRaw(...args);
  };

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [showModeIntro, setShowModeIntro] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "show-answer" | null>(null);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">(() => {
    try { return (localStorage.getItem('vocaband_target_lang') as "hebrew" | "arabic") || "hebrew"; } catch { return "hebrew"; }
  });
  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => {
    try { return !!localStorage.getItem('vocaband_target_lang'); } catch { return false; }
  });
  const [isFinished, setIsFinished] = useState(false);
  const [wordAttempts, setWordAttempts] = useState<Record<number, number>>({});

  // --- NEW MODES STATE ---
  const [tfOption, setTfOption] = useState<Word | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // --- MATCHING MODE STATE ---
  const [matchingPairs, setMatchingPairs] = useState<{id: number, text: string, type: 'english' | 'arabic'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: number, type: 'english' | 'arabic'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);

  // --- LETTER SOUNDS MODE STATE ---
  const [revealedLetters, setRevealedLetters] = useState(0);
  // --- SENTENCE BUILDER MODE STATE ---
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);
  const [introLang, setIntroLang] = useState<"en" | "ar" | "he">("en");
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentData[]>([]);
  const [teacherAssignmentsLoading, setTeacherAssignmentsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentData | null>(null);


  // --- RELIABILITY STATE ---
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // --- QUERY DEDUPLICATION ---
  // Track when data was last fetched to avoid redundant Supabase calls
  const lastFetchRef = useRef<Record<string, number>>({});

  // Refs for socket reconnect handler (avoids stale closure on [] deps useEffect)
  const userRef = useRef(user);
  const isLiveChallengeRef = useRef(isLiveChallenge);

  // Timeout ref for cleanup (prevents memory leaks on unmount)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { if (feedback === null) setMotivationalMessage(null); }, [feedback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Redirect legacy "students" view to gradebook
  useEffect(() => {
    if (view === "students") {
      setView("gradebook");
      fetchScores();
    }
  }, [view]);

  // Speak motivational message during gameplay — only when student is in game view
  useEffect(() => {
    if (motivationalMessage && view === "game") {
      playMotivational();
    }
  }, [motivationalMessage, view]);

  // Speak congratulatory message when a mode is finished — only in game view
  useEffect(() => {
    if (isFinished && user?.displayName && view === "game") {
      const phrases = [
        `Kol Hakavod ${user.displayName}! You did amazing!`,
        `Excellent work ${user.displayName}! You're a superstar!`,
        `Wow ${user.displayName}! That was fantastic!`,
        `Great job ${user.displayName}! Keep going!`,
        `Well done ${user.displayName}! You're getting better and better!`,
      ];
      const phrase = phrases[secureRandomInt( phrases.length)];
      setTimeout(() => speak(phrase), 500);
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
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        // Async callback ensures a fresh token is fetched on every reconnect,
        // so the handshake never carries a stale/expired JWT.
        auth: (cb: (data: { token: string }) => void) => { getToken().then(t => cb({ token: t })); },
      }) as Socket;
      s = sock;

      setSocket(sock);

      sock.on("connect", () => {
        setSocketConnected(true);
      });
      sock.on("disconnect", (reason: any) => {
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
        const { data: userRow, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
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
        const userData = await fetchUserProfile(supabaseUser.id);
        if (userData) {
          setUser(userData);
          checkConsent(userData);
          if (userData.role === "teacher") {
            // Await so the dashboard has data before we show it — prevents
            // the "empty dashboard until refresh" bug.
            const fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => [] as Awaited<ReturnType<typeof fetchTeacherData>>);
            fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            // Check if teacher had an active Quick Play session before refresh
            try {
              const savedSession = localStorage.getItem('vocaband_quick_play_session');
              if (savedSession) {
                const parsed = JSON.parse(savedSession);
                const { data: sessionData } = await supabase
                  .from('quick_play_sessions')
                  .select('id, session_code, word_ids, is_active')
                  .eq('id', parsed.id)
                  .eq('is_active', true)
                  .maybeSingle();
                if (sessionData) {
                  const dbWords = ALL_WORDS.filter(w => (sessionData.word_ids || []).includes(w.id));
                  setQuickPlayActiveSession({
                    id: sessionData.id,
                    sessionCode: sessionData.session_code,
                    wordIds: sessionData.word_ids || [],
                    words: parsed.words?.length ? parsed.words : dbWords,
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
          } else if (userData.role === "student" && userData.classCode) {
            const code = userData.classCode;
            const { data: classRows } = await supabase
              .from('classes').select('*').eq('code', code);
            if (classRows && classRows.length > 0) {
              const classData = mapClass(classRows[0]);
              // Fetch assignments + progress in parallel for faster restore
              const [assignResult, progressResult] = await Promise.all([
                supabase.from('assignments').select('*').eq('class_id', classData.id),
                supabase.from('progress').select('*').eq('class_code', code).eq('student_uid', supabaseUser.id),
              ]);
              setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
              setStudentProgress((progressResult.data ?? []).map(mapProgress));
            }
            setBadges(userData.badges || []);
            setXp(userData.xp ?? 0);
            setStreak(userData.streak ?? 0);
            setView("student-dashboard");
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
                  .from('users').select('*').eq('uid', savedUid).maybeSingle();
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
                        .from('classes').select('*').eq('code', restored.classCode);
                      if (classRows && classRows.length > 0) {
                        const c = mapClass(classRows[0]);
                        const [a, p] = await Promise.all([
                          supabase.from('assignments').select('*').eq('class_id', c.id),
                          supabase.from('progress').select('*').eq('class_code', restored.classCode).eq('student_uid', supabaseUser.id),
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
                  .from('classes').select('*').eq('code', studentProfile.class_code);
                if (classRows && classRows.length > 0) {
                  const classData = mapClass(classRows[0]);
                  const [assignResult, progressResult] = await Promise.all([
                    supabase.from('assignments').select('*').eq('class_id', classData.id),
                    supabase.from('progress').select('*').eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
                  ]);
                  setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                  setStudentProgress((progressResult.data ?? []).map(mapProgress));
                }
              }
              setView("student-dashboard");
              return;
            } else if (studentProfile && studentProfile.status === 'pending_approval') {
              setError("Your account is pending approval. Please ask your teacher to approve it.");
              await supabase.auth.signOut();
              return;
            }

            // Not a known student — check teacher allowlist
            const { data: isAllowed } = await supabase.rpc('is_teacher_allowed', {
              check_email: supabaseUser.email ?? ""
            });
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
      } finally {
        restoreInProgress.current = false;
        setLoading(false);
      }
    };

    // CRITICAL: This callback must NOT be async.
    // Supabase runs it inside an exclusive Navigator Lock. If the callback
    // is async and does slow work (DB queries, retries), it holds the lock
    // the whole time — blocking getSession(), signInAnonymously(), signOut(),
    // and every other auth operation.  This causes the 5-second lock timeout
    // → steal → AbortError chain that made login hang on mobile.
    //
    // Instead, we synchronously read the event/session, then fire-and-forget
    // the async restore work.  The lock is released immediately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If handleStudentLogin is running, it owns loading/view — don't interfere.
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        // Fire-and-forget: releases the auth lock immediately, then
        // does the slow DB work asynchronously.
        restoreSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        try { localStorage.removeItem('vocaband_student_login'); } catch {}
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

        // If the PKCE exchange failed in boot(), show a toast and let the
        // teacher try again immediately instead of silently showing landing.
        const exchangeFailed = sessionStorage.getItem('oauth_exchange_failed');
        if (exchangeFailed) {
          sessionStorage.removeItem('oauth_exchange_failed');
          setError("Sign-in timed out. Please try again.");
          setLandingTab("teacher");
          setLoading(false);
        } else if (!isOAuthCallback) {
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
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current && !restoreInProgress.current) setLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // --- BACK BUTTON (History API) ---
  // Track whether a view change was triggered by the browser back/forward button
  // so we don't double-push the same entry.
  const isPopStateNavRef = useRef(false);

  // On first mount, seed the history stack with the initial view so the browser
  // has something to pop back to.
  useEffect(() => {
    window.history.replaceState({ view: 'landing' }, '');
  }, []);

  // Whenever the app navigates to a new view, push a history entry so the
  // Android/iOS back button can walk back through them.
  useEffect(() => {
    if (isPopStateNavRef.current) {
      // This change came from popstate — don't push another entry.
      isPopStateNavRef.current = false;
      return;
    }
    // When an authenticated user transitions from landing to their dashboard,
    // replace the landing entry instead of pushing so back doesn't go to login.
    const isAuthTransition = userRef.current && (view === 'teacher-dashboard' || view === 'student-dashboard')
      && window.history.state?.view === 'landing';
    if (isAuthTransition) {
      window.history.replaceState({ view }, '');
    } else {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  // Handle the physical back button (popstate fires on Android hardware back
  // and browser back gesture on iOS).
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prevView = e.state?.view as typeof view | undefined;
      // Don't navigate back to landing if user is logged in
      if (prevView === 'landing' && userRef.current) {
        window.history.pushState({ view }, '');
        return;
      }
      if (prevView) {
        isPopStateNavRef.current = true;
        setView(prevView);
      }
      // If no state, the browser will naturally close/go to the previous page.
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Quick Play guest: remove from podium on page unload/refresh
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession) return;
    const handleUnload = () => {
      // Clear localStorage so name is released for re-login
      try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
      // Use sendBeacon to delete progress (fire-and-forget, works on tab close)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        // Delete progress via REST API using sendBeacon
        // sendBeacon only supports POST, so we use the PostgREST RPC approach
        // Instead, we just clear localStorage - the teacher can manually remove stale students
      }
      try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.isGuest, quickPlayActiveSession?.id]);

  // Warn before leaving while a score save is in flight
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = "Your score is still saving. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);

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

  // Auto-refresh student assignments every 30s while on the dashboard
  // so new assignments from the teacher appear without re-login
  useEffect(() => {
    if (user?.role !== "student" || view !== "student-dashboard" || !user.classCode) return;
    const code = user.classCode;
    // Cache class ID to avoid querying classes table every 30s
    let cachedClassId: string | null = null;
    const refresh = async () => {
      if (!cachedClassId) {
        const { data: classRows } = await supabase.from('classes').select('id').eq('code', code).limit(1);
        if (!classRows || classRows.length === 0) return;
        cachedClassId = classRows[0].id;
      }
      const { data } = await supabase.from('assignments').select('*').eq('class_id', cachedClassId);
      if (data) setStudentAssignments(data.map(mapAssignment));
    };
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [user?.role, user?.classCode, view]);

  // Load pending students for teachers
  useEffect(() => {
    if (user?.role === "teacher" && view === "teacher-dashboard") {
      loadPendingStudents();
    }
  }, [user?.role, view]);

  const fetchTeacherData = async (uid: string) => {
    const { data, error } = await supabase.from('classes').select('*').eq('teacher_uid', uid);
    if (!error && data) {
      const mappedClasses = data.map(mapClass);
      setClasses(mappedClasses);
      return mappedClasses;
    }
    return [];
  };

  const handleCreateClass = async () => {
    if (!newClassName || !user) return;

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
    const randomValues = crypto.getRandomValues(new Uint32Array(8));
    const code = Array.from(randomValues)
      .map(x => {
        // Rejection sampling to avoid modulo bias
        const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;
        let val = x;
        while (val >= limit) {
          val = crypto.getRandomValues(new Uint32Array(1))[0];
        }
        return alphabet[val % alphabet.length];
      })
      .join("");
    const newClass = {
      name: newClassName,
      teacherUid: user.uid,
      code: code
    };

    try {
      const { data: docRow, error } = await supabase.from('classes').insert({ name: newClass.name, teacher_uid: newClass.teacherUid, code: newClass.code }).select().single();
      if (error) throw error;
      setClasses([...classes, mapClass(docRow)]);
      setCreatedClassName(newClass.name);
      setShowCreateClassModal(false);
      setNewClassName("");
      setCreatedClassCode(code);
    } catch (error) {
      console.error("Error creating class:", error);
      showToast("Failed to create class.", "error");
    }
  };

  const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
  const MAX_IMPORT_WORDS = 500;

  /**
   * handleOcrUpload
   * Takes an image file (e.g., a photo of a word list), sends it to the
   * server-side Tesseract.js OCR endpoint, and extracts English vocabulary words.
   */
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image too large (max 5 MB).", "error"); e.target.value = ""; return; }

    setIsOcrProcessing(true);
    setOcrProgress(10); // Initial progress

    try {
      // Get auth token for teacher authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("Please sign in again.", "error"); return; }

      // Create FormData with the image file
      const formData = new FormData();
      formData.append('file', file);

      // Send to server-side OCR microservice
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // JWT token for teacher authentication
        },
        body: formData,
      });

      setOcrProgress(50); // Upload complete

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR service error');
      }

      const ocrData = await response.json();
      setOcrProgress(90); // Processing complete

      // Extract words from the OCR service response
      // The service already returns English-only words (filtered by regex on server)
      const extractedWords = ocrData.words || [];
      const rawText = ocrData.raw_text || '';

      console.log('OCR service response:', ocrData);
      console.log('Extracted English words:', extractedWords);
      console.log('Raw text for reference:', rawText.substring(0, 100) + '...');

      // Create Word objects for custom assignment
      const customWordsFromOCR: Word[] = extractedWords.map((word: string, index: number) => ({
        id: Date.now() + index, // Generate unique ID
        english: word,
        hebrew: '', // Leave empty - user can add later
        arabic: '',
        level: 'Custom',
        recProd: 'Prod'
      }));

      console.log('Created custom words count:', customWordsFromOCR.length);
      if (customWordsFromOCR.length > 0) {
        console.log('Custom words:', customWordsFromOCR.map(w => w.english));
      }

      if (customWordsFromOCR.length === 0) {
        showToast(
          `No English words found. OCR recognized: "${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}"`,
          "info"
        );
      } else {
        // Add all detected words to the Custom tab and select them
        setCustomWords(customWordsFromOCR);
        setSelectedLevel("Custom");
        setSelectedWords(customWordsFromOCR.map(w => w.id));

        // Navigate to create-assignment view so user can see the matched words
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
          setView("create-assignment");
        }

        showToast(`Found ${customWordsFromOCR.length} words from the image!`, "success");
      }
    } catch (err) {
      trackAutoError(err, 'OCR processing failed');
      const errorMessage = err instanceof Error ? err.message : 'Error processing image';
      console.error('OCR error:', errorMessage);
      showToast(`${errorMessage}. Please try again.`, "error");
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      // Reset the file input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  // --- SMART PASTE FUNCTIONS ---

  // Extract words from pasted text - handles commas, newlines, semicolons, pipes, tabs
  const extractWordsFromPaste = (text: string): string[] => {
    // Strip zero-width characters from PDFs/Word documents
    const cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Split by common delimiters (added tab support for Excel/Google Sheets)
    const words = cleaned
      .split(/[,\n;\t\|]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && w.length <= 100); // Filter invalid

    const unique = [...new Set(words)];

    // Soft limit for very large pastes
    if (unique.length > 500) {
      console.warn(`Large paste: ${unique.length} words (processing first 500)`);
    }

    return unique.slice(0, 500);
  };

  // Find matching Band 2 words (EXACT OR PARTIAL MATCH)
  // Combines duplicates and merges translations (Hebrew+Hebrew, Arabic+Arabic)
  // Also combines words with/without "(n)" suffix
  const findMatchesInBand2 = (words: string[]): { matched: Word[], unmatched: string[] } => {
    const allMatches: Word[] = [];
    const unmatched: string[] = [];

    // Find ALL matches for each input word
    for (const word of words) {
      const matches = BAND_2_WORDS.filter(w =>
        w.english.toLowerCase() === word ||
        w.english.toLowerCase().startsWith(word) ||
        w.english.toLowerCase().endsWith(word)
      );
      if (matches.length > 0) {
        allMatches.push(...matches);
      } else {
        unmatched.push(word);
      }
    }

    // Group matches by base English word (remove "(n)" suffix for grouping)
    const groupedMatches = new Map<string, Word[]>();
    for (const match of allMatches) {
      const baseWord = match.english.replace(/\(n\)$/, '').toLowerCase().trim();
      if (!groupedMatches.has(baseWord)) {
        groupedMatches.set(baseWord, []);
      }
      groupedMatches.get(baseWord)!.push(match);
    }

    // Combine each group into a single word with merged translations
    const matched: Word[] = [];
    for (const [baseWord, group] of groupedMatches) {
      // Merge Hebrew translations (combine non-empty ones, unique)
      const hebrewParts = group
        .map(w => w.hebrew.trim())
        .filter(h => h.length > 0);
      const uniqueHebrew = [...new Set(hebrewParts)];
      const combinedHebrew = uniqueHebrew.join(' | ');

      // Merge Arabic translations (combine non-empty ones, unique)
      const arabicParts = group
        .map(w => w.arabic.trim())
        .filter(a => a.length > 0);
      const uniqueArabic = [...new Set(arabicParts)];
      const combinedArabic = uniqueArabic.join(' | ');

      // Use the base word (without "(n)") as the English word
      const combinedWord: Word = {
        ...group[0],
        english: group[0].english.replace(/\(n\)$/, '').trim(),
        hebrew: combinedHebrew,
        arabic: combinedArabic
      };
      matched.push(combinedWord);
    }

    return { matched, unmatched };
  };

  // Handle paste submission
  const handlePasteSubmit = () => {
    const words = extractWordsFromPaste(pastedText);
    if (words.length === 0) return;

    const { matched, unmatched } = findMatchesInBand2(words);

    setPasteMatchedCount(matched.length);
    setPasteUnmatched(unmatched);
    setShowPasteDialog(true);

    // Auto-add matched words
    const newSelected = [...selectedWords];
    matched.forEach(w => {
      if (!newSelected.includes(w.id)) {
        newSelected.push(w.id);
      }
    });
    setSelectedWords(newSelected);
    setPastedText("");
  };

  // Add unmatched as custom words
  const handleAddUnmatchedAsCustom = () => {
    const newCustomWords = pasteUnmatched.map((word, idx) => ({
      id: Date.now() + idx,
      english: word,
      hebrew: "",
      arabic: "",
      level: "Custom" as const
    }));
    setCustomWords(prev => [...prev, ...newCustomWords]);
    setSelectedWords(prev => [...prev, ...newCustomWords.map(w => w.id)]);
    // Switch to Custom tab so users can see the added words
    setSelectedLevel("Custom");
    // Clear search and filters so all words are visible
    setWordSearchQuery("");
    setSelectedCore("");
    setSelectedPos("");
    setSelectedRecProd("");
    setShowPasteDialog(false);
    setPasteUnmatched([]);
    setPasteMatchedCount(0);
  };

  // Skip unmatched words
  const handleSkipUnmatched = () => {
    setShowPasteDialog(false);
    setPasteUnmatched([]);
    setPasteMatchedCount(0);
  };

  // --- QUICK PLAY PREVIEW HANDLERS ---

  // Tag-style single word entry
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !tagInput.trim()) return;
    e.preventDefault();
    const word: Word = { id: Date.now(), english: tagInput.trim(), hebrew: "", arabic: "", level: "Custom" };
    setCustomWords(prev => [...prev, word]);
    setSelectedWords(prev => [...prev, word.id]);
    setSelectedLevel("Custom");
    setTagInput("");
  };

  // Word (.docx) upload — extract text then use smart paste logic
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) { showToast("File too large (max 5 MB).", "error"); e.target.value = ""; return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Lazy load mammoth
      const mammothModule = await loadMammoth();
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer });
      setPastedText(result.value);
      showToast("Word document text extracted — click Import Words to continue.", "info");
    } catch {
      showToast("Could not read Word document.", "error");
    }
    e.target.value = "";
  };

  // Google Sheets URL import
  const handleGSheetsImport = async () => {
    if (!gSheetsUrl.trim()) return;
    try {
      const parsed = new URL(gSheetsUrl.trim());
      if (parsed.hostname !== "google.com" && !parsed.hostname.endsWith(".google.com")) {
        showToast("Only Google Sheets URLs are allowed.", "error");
        return;
      }
    } catch {
      showToast("Invalid URL.", "error");
      return;
    }
    setGSheetsLoading(true);
    try {
      const csvUrl = gSheetsUrl.replace(/\/edit.*$/, "/export?format=csv");
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Could not fetch sheet");
      const text = await res.text();
      const lines = text.split("\n");
      const words: Word[] = lines.slice(1).map((line, idx) => {
        const [english, hebrew, arabic] = line.split(",");
        return { id: 7000 + idx, english: english?.trim() ?? "", hebrew: hebrew?.trim() ?? "", arabic: arabic?.trim() ?? "", level: "Custom" as const };
      }).filter(w => w.english);
      if (words.length === 0) { showToast("No words found in the sheet. Make sure column A is English.", "error"); return; }
      const limited = words.slice(0, MAX_IMPORT_WORDS);
      if (words.length > MAX_IMPORT_WORDS) showToast(`Only the first ${MAX_IMPORT_WORDS} words were imported.`, "info");
      setCustomWords(prev => [...prev, ...limited]);
      setSelectedWords(prev => [...prev, ...limited.map(w => w.id)]);
      setSelectedLevel("Custom");
      setGSheetsUrl("");
      showToast(`Imported ${limited.length} words from Google Sheets.`, "success");
    } catch {
      showToast("Could not import from Google Sheets. Make sure the sheet is public and the URL is correct.", "error");
    } finally {
      setGSheetsLoading(false);
    }
  };

  // --- PERFORMANCE: Memoized toggle function to prevent re-renders
  const toggleWordSelection = useCallback((wordId: number) => {
    setSelectedWords(prev => {
      if (prev.includes(wordId)) {
        return prev.filter(id => id !== wordId);
      } else {
        return [...prev, wordId];
      }
    });
  }, []);

  const currentLevelWords = useMemo(() => {
    // When searching, search ALL words (both bands + custom) regardless of selected tab
    let words = wordSearchQuery.trim()
      ? [...ALL_WORDS, ...customWords.filter(cw => !ALL_WORDS.some(aw => aw.id === cw.id))]
      : selectedLevel === "Band 1" ? BAND_1_WORDS
      : selectedLevel === "Band 2" ? BAND_2_WORDS : customWords;

    // Enhanced multi-language search with fuzzy matching
    if (wordSearchQuery.trim()) {
      const searchResults = searchWords(wordSearchQuery, words, {
        fuzzy: enableFuzzyMatch,
        includeWordFamilies: enableWordFamilies,
        maxResults: 500
      });
      words = searchResults.map(m => m.word);
    }

    // Core filter
    if (selectedCore) {
      words = words.filter(w => w.core === selectedCore);
    }

    // Part of speech filter
    if (selectedPos) {
      words = words.filter(w => w.pos && w.pos.includes(selectedPos));
    }

    // Rec/Prod filter
    if (selectedRecProd) {
      words = words.filter(w => w.recProd === selectedRecProd);
    }

    // Deduplicate by word.id to prevent React key warnings
    const uniqueWords = Array.from(new Map(words.map(w => [w.id, w])).values());

    return uniqueWords;
  }, [selectedLevel, customWords, wordSearchQuery, selectedCore, selectedPos, selectedRecProd, enableFuzzyMatch, enableWordFamilies]);
  const handleSaveAssignment = async () => {
    // For editing, allow custom-only assignments
    const hasWords = editingAssignment
      ? selectedWords.length > 0 || customWords.length > 0
      : selectedWords.length > 0;

    if (!selectedClass || !hasWords || !assignmentTitle) {
      showToast("Please enter a title and select words.", "error");
      return;
    }

    // Check if there's at least one database word (not custom/session-only)
    // For creating new assignments, require at least one database word
    // For editing, allow custom-only assignments
    const hasDbWords = selectedWords.some(id => id > 0);
    if (!hasDbWords && !editingAssignment) {
      showToast("Please select at least one word from the vocabulary database.", "error");
      return;
    }
    // For editing, if no database words, ensure we have at least one custom word
    if (!hasDbWords && editingAssignment && customWords.length === 0 && selectedWords.length === 0) {
      showToast("Please select at least one word (database or custom).", "error");
      return;
    }

    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToSave = uniqueWords.filter(w => selectedWordsSet.has(w.id));

    const assignmentData = {
      classId: selectedClass.id,
      wordIds: selectedWords.filter(id => id > 0), // Only save positive IDs (database words, not custom/phrases)
      words: wordsToSave,
      title: assignmentTitle,
      deadline: assignmentDeadline || null,
      allowedModes: assignmentModes,
      sentences: assignmentSentences.filter(s => s.trim()),
      sentenceDifficulty,
    };

    try {
      if (editingAssignment) {
        // UPDATE existing assignment
        const updatePayload: Record<string, unknown> = {
          class_id: assignmentData.classId,
          word_ids: assignmentData.wordIds,
          words: assignmentData.words,
          title: assignmentData.title,
          deadline: assignmentData.deadline,
          allowed_modes: assignmentData.allowedModes,
          sentence_difficulty: assignmentData.sentenceDifficulty,
        };
        if (assignmentData.sentences.length > 0) {
          updatePayload.sentences = assignmentData.sentences;
        }

        const { error } = await supabase
          .from('assignments')
          .update(updatePayload)
          .eq('id', editingAssignment.id);

        if (error) throw error;
        showToast("Assignment updated successfully!", "success");

        // Update the assignment in the list
        setTeacherAssignments(prev =>
          prev.map(a => a.id === editingAssignment.id
            ? { ...a, ...assignmentData }
            : a
          )
        );
        // Also update editingAssignment so the wizard shows the new data
        setEditingAssignment(prev => prev ? { ...prev, ...assignmentData } : null);
      } else {
        // CREATE new assignment
        const newAssignment = {
          ...assignmentData,
          createdAt: new Date().toISOString(),
        };

        const insertPayload: Record<string, unknown> = {
          class_id: newAssignment.classId,
          word_ids: newAssignment.wordIds,
          words: newAssignment.words,
          title: newAssignment.title,
          deadline: newAssignment.deadline,
          created_at: newAssignment.createdAt,
          allowed_modes: newAssignment.allowedModes,
          sentence_difficulty: newAssignment.sentenceDifficulty,
        };
        if (newAssignment.sentences.length > 0) {
          insertPayload.sentences = newAssignment.sentences;
        }

        const { error } = await supabase.from('assignments').insert(insertPayload);
        if (error) throw error;
        showToast("Assignment created successfully!", "success");

        // Refresh assignments list
        fetchTeacherAssignments();

        // Only redirect and reset form when creating (not when editing)
        setView("teacher-dashboard");
        setSelectedWords([]);
        setAssignmentTitle("");
        setAssignmentDeadline("");
        setAssignmentModes([]); // No default selection - teacher must choose
        setAssignmentStep(1);
        setAssignmentSentences([]);
        setSentenceDifficulty(2);
      }
    } catch (error) {
      handleDbError(error, editingAssignment ? OperationType.UPDATE : OperationType.CREATE, "assignments");
    }
  };

  // Preview the assignment with selected words and modes (for teachers)
  const handlePreviewAssignment = () => {
    if (selectedWords.length === 0) {
      showToast("Please select at least one word to preview.", "error");
      return;
    }

    // Get the selected words
    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToPreview = uniqueWords.filter(w => selectedWordsSet.has(w.id));

    // Create a temporary assignment object with selected modes
    const previewAssignment: AssignmentData = {
      id: "preview",
      classId: selectedClass?.id || "",
      wordIds: selectedWords.filter(id => id > 0), // Filter out custom words for consistency
      words: wordsToPreview,
      title: assignmentTitle || "Preview Assignment",
      deadline: null,
      createdAt: new Date().toISOString(),
      allowedModes: assignmentModes,
      sentences: assignmentSentences.filter(s => s.trim()),
      sentenceDifficulty,
    };

    // Set up the game with the preview assignment
    setAssignmentWords(wordsToPreview);
    setActiveAssignment(previewAssignment);
    setView("game");
    setShowModeSelection(true);
  };

  const handleDeleteClass = async (classId: string) => {
    setConfirmDialog({
      show: true,
      message: "Are you sure you want to delete this class? This will also remove access for all students in this class.",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('classes').delete().eq('id', classId);
          if (error) throw error;
          setClasses(prev => prev.filter(c => c.id !== classId));
          showToast("Class deleted successfully.", "success");
        } catch (error) {
          handleDbError(error, OperationType.DELETE, `classes/${classId}`);
        }
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
      }
    });
  };

  // Check if user needs to accept the current privacy policy version.
  // Fast path: localStorage. Fallback: DB consent_log (handles cleared storage).
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

  const loginAttemptsRef = useRef<number[]>([]);

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
    const student = existingStudents.find(s => s.id === studentId);
    if (!student) return;


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

    // Check approval status
    if (profile.status === 'pending_approval') {
      setError("Your account is pending approval from your teacher. Please check back later!");
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

    // For students with approved accounts (from teacher approval workflow):
    // We use their profile.auth_uid directly without creating a Supabase auth session.
    // The save_student_progress RPC bypasses RLS, so we don't need a valid session.
    const studentUid = profile.auth_uid;

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
      .select('*')
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
        .from('classes').select('*').eq('code', code);

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

    // Progress still uses direct query (should work for student's own progress)
    const { data: progressResult, error: progressError } = await supabase
      .from('progress').select('*').eq('class_code', code).eq('student_uid', studentUid);


    if (assignError) {
      console.error('Assignments RPC error:', assignError);
      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('assignments').select('*').eq('class_id', classData.id);
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
      const isNew = result[0].is_new;


      if (profile.status === 'approved') {
        // Already approved, just log them in
        handleLoginAsStudent(profile.id);
        return;
      } else if (profile.status === 'pending_approval') {
        const message = isNew
          ? `Account created! Tell your teacher to approve "${trimmedName}" in class ${trimmedCode}. Once approved, you can log in and start earning XP!`
          : `Your account is pending approval. Please ask your teacher to approve it!`;


        // Clear form if new account
        if (isNew) {
          setStudentLoginName("");
          setStudentLoginClassCode("");
          setStudentAvatar("🦊");
          setExistingStudents([]);
          setShowNewStudentForm(false);
        }

        showToast(message, "success");
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError("Could not create account. Please try again.");
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
        setError('Your account is pending approval. Please ask your teacher to approve it.');
        return;
      }

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) {
        setError('Session expired. Please sign in again.');
        return;
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
          .from('classes').select('*').eq('code', studentData.class_code);
        if (classRows && classRows.length > 0) {
          const classData = mapClass(classRows[0]);
          const [assignResult, progressResult] = await Promise.all([
            supabase.from('assignments').select('*').eq('class_id', classData.id),
            supabase.from('progress').select('*').eq('class_code', studentData.class_code).eq('student_uid', supabaseUser.id),
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
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          id,
          display_name,
          class_code,
          joined_at
        `)
        .eq('status', 'pending_approval')
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
      trackAutoError(error, 'Failed to load pending students list');
    }
  };

  const handleApproveStudent = async (studentId: string, displayName: string) => {
    try {
      // Call the approve_student function
      const { data, error } = await supabase.rpc('approve_student', {
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

  const handleStudentLogin = async (code: string, name: string) => {
    if (loading) return;
    const trimmedName = name.trim().slice(0, 30);
    const trimmedCode = code.trim().slice(0, 20);
    if (!trimmedName || !trimmedCode) { setError("Please enter both code and name."); return; }

    // Client-side rate limit: max 5 attempts per 60 seconds
    const now = Date.now();
    loginAttemptsRef.current = loginAttemptsRef.current.filter(t => now - t < 60_000);
    if (loginAttemptsRef.current.length >= 5) {
      setError("Too many login attempts. Please wait a minute and try again.");
      return;
    }
    loginAttemptsRef.current.push(now);
    manualLoginInProgress.current = true;
    setLoading(true);
    setError(null);

    // Safety: if the whole login takes longer than 20 seconds on a slow
    // mobile network, stop the spinner and show an error.
    const loginTimeout = setTimeout(() => {
      if (manualLoginInProgress.current) {
        manualLoginInProgress.current = false;
        setLoading(false);
        setError("Login is taking too long. Please check your connection and try again.");
      }
    }, 20000);

    try {
      // Step 1: Sign in anonymously — reuse existing anonymous session if present.
      // signInAnonymously() acquires the Supabase auth lock, so we avoid
      // calling getSession() first (that would acquire the lock twice).
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !data.session) {
        setError("Login failed: " + (signInError?.message ?? "Could not create session"));
        return;
      }
      const session = data.session;
      const studentUid = session.user.id;

      // Step 2: Look up class + existing user profile in parallel
      // OPTIMIZATION: Check cache first to avoid database query
      let classData: ClassData | undefined;
      const cacheKey = `vocaband_class_${trimmedCode}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, cached: cacheTime } = JSON.parse(cached);
          // Use cache if less than 5 minutes old
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            classData = data;
          }
        }
      } catch { /* ignore cache errors */ }

      const classResult = classData ? null : await supabase.from('classes').select('*').eq('code', trimmedCode);
      if (classResult?.error) throw classResult.error;

      if (classResult?.data && classResult.data.length > 0) {
        classData = mapClass(classResult.data[0]);
        // Update cache with fresh data
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: classData,
            cached: Date.now(),
          }));
        } catch { /* ignore */ }
      }

      if (!classData) {
        setError("Invalid Class Code!");
        return;
      }

      const [userResult] = await Promise.all([
        supabase.from('users').select('*').eq('uid', studentUid).maybeSingle(),
      ]);

      // Cache class info in localStorage for faster future logins
      try {
        localStorage.setItem(`vocaband_class_${trimmedCode}`, JSON.stringify({
          data: classData,
          cached: Date.now(),
        }));
      } catch { /* ignore */ }

      // Step 2.5: Check if student is approved (for student_profiles workflow)
      // OPTIMIZATION: Check both formats in parallel instead of sequentially
      const studentUniqueIdNew = trimmedCode.toLowerCase() + trimmedName.toLowerCase() + ':' + studentUid;
      const studentUniqueIdLegacy = trimmedCode.toLowerCase() + trimmedName.toLowerCase();

      // Check both new and legacy formats in parallel - much faster!
      const [newFormatResult, legacyFormatResult] = await Promise.all([
        supabase.from('student_profiles').select('status').eq('unique_id', studentUniqueIdNew).maybeSingle(),
        supabase.from('student_profiles').select('status').eq('unique_id', studentUniqueIdLegacy).maybeSingle(),
      ]);

      // Use new format result if found, otherwise fall back to legacy
      const studentProfile = newFormatResult.data || legacyFormatResult.data;
      const profileError = newFormatResult.error || legacyFormatResult.error;

      if (profileError) {
        console.error('Error checking student approval:', profileError);
      } else if (studentProfile) {
        if (studentProfile.status === 'pending_approval') {
          setError("Your account is pending approval from your teacher. Please check back later!");
          return;
        }
        if (studentProfile.status === 'rejected') {
          setError("Your account was not approved. Please contact your teacher.");
          return;
        }
      }

      // Step 3: Upsert student profile (must happen before fetching assignments — RLS needs class membership)
      let userData: AppUser;
      if (userResult.data) {
        userData = { ...mapUser(userResult.data), classCode: trimmedCode, role: "student", displayName: trimmedName };
        const { error: updateErr } = await supabase
          .from('users').update({ class_code: trimmedCode, role: "student", display_name: trimmedName }).eq('uid', studentUid);
        if (updateErr) throw updateErr;
      } else {
        userData = {
          uid: studentUid,
          role: "student",
          displayName: trimmedName,
          classCode: trimmedCode,
          avatar: studentAvatar,
          badges: [],
        };
        const { error: insertErr } = await supabase.from('users').insert(mapUserToDb(userData));
        if (insertErr) throw insertErr;
      }

      // OPTIMISTIC UI: Set user and show dashboard IMMEDIATELY
      // This makes the login feel instant while data loads in background
      setUser(userData);
      setBadges(userData.badges || []);
      setXp(userData.xp ?? 0);
      setStreak(userData.streak ?? 0);
      setView("student-dashboard");
      setLoading(false); // Hide the loading spinner immediately

      // Join Live Challenge immediately (doesn't need to wait for data)
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
          classCode: trimmedCode, name: trimmedName, uid: studentUid,
        });
      }

      // Check consent early (before background data load)
      checkConsent(userData);

      // BACKGROUND: Fetch assignments + progress after UI is visible
      // This makes the login feel much faster!
      setStudentDataLoading(true);
      Promise.all([
        supabase.from('assignments').select('*').eq('class_id', classData.id),
        supabase.from('progress').select('*').eq('class_code', trimmedCode).eq('student_uid', studentUid),
      ]).then(([assignResult, progressResult]) => {
        if (assignResult.error) {
          console.error('Error loading assignments:', assignResult.error);
        } else {
          setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        }

        if (progressResult.error) {
          console.error('Error loading progress:', progressResult.error);
        } else {
          setStudentProgress((progressResult.data ?? []).map(mapProgress));
        }

        setStudentDataLoading(false);
      }).catch((error) => {
        console.error('Background data load error:', error);
        setStudentDataLoading(false);
      });

      // Persist student credentials so we can auto-restore on page refresh
      // (anonymous Supabase sessions don't reliably survive mobile/PWA restarts)
      try {
        localStorage.setItem('vocaband_student_login', JSON.stringify({
          classCode: trimmedCode,
          displayName: trimmedName,
          uid: studentUid,
        }));
      } catch { /* localStorage unavailable — non-critical */ }
    } catch (error) {
      trackAutoError(error, 'Student login failed');
      const errorMsg = error && typeof error === 'object' && 'message' in error
        ? (String((error as { message: unknown }).message).includes('fetch') || String((error as { message: unknown }).message).includes('network')
          ? "Network error. Please check your connection."
          : "Could not log in. Please try again.")
        : "Could not log in. Please try again.";
      setError(errorMsg);
    } finally {
      clearTimeout(loginTimeout);
      manualLoginInProgress.current = false;
      setLoading(false);
      setStudentDataLoading(false);
    }
  };

  const awardBadge = async (badge: string) => {
    if (!user || badges.includes(badge)) return;

    const newBadges = [...badges, badge];
    setBadges(newBadges);
    // Lazy load and use confetti
    loadConfetti().then(confettiModule => {
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 }
      });
    });

    try {
      const { error } = await supabase.from('users').update({ badges: newBadges }).eq('uid', user.uid);
      if (error) throw error;
    } catch (error) {
      console.error("Error saving badge:", error);
      setSaveError("Badge couldn't be saved right now, but don't worry — it will sync next time.");
    }
  };
  const fetchStudents = async () => {
    if (!user || user.role !== "teacher" || classes.length === 0) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.students ?? 0) < 10000) return;
    lastFetchRef.current.students = now;
    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: any[] = [];

    for (const chunk of chunks) {
      const { data } = await supabase.from('progress').select('*').in('class_code', chunk).limit(5000);
      if (data) allRows.push(...data);
    }

    const studentMap: Record<string, {name: string, classCode: string, lastActive: string}> = {};
    allRows.forEach(row => {
      const key = `${row.student_name}-${row.class_code}`;
      if (!studentMap[key] || new Date(row.completed_at) > new Date(studentMap[key].lastActive)) {
        studentMap[key] = {
          name: row.student_name,
          classCode: row.class_code,
          lastActive: row.completed_at,
        };
      }
    });

    setClassStudents(Object.values(studentMap));
  };
  const fetchGlobalLeaderboard = async () => {
    const classCode = user?.classCode;
    if (!classCode) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.leaderboard ?? 0) < 10000) return;
    lastFetchRef.current.leaderboard = now;
    const { data } = await supabase
      .from('progress').select('student_name, score, avatar')
      .eq('class_code', classCode)
      .order('score', { ascending: false }).limit(10);
    const scores = (data ?? []).map(row => ({
      name: row.student_name,
      score: row.score,
      avatar: row.avatar || "🦊",
    }));
    setGlobalLeaderboard(scores);
  };
  const fetchScores = async () => {
    if (!user || user.role !== "teacher") return;
    const now = Date.now();
    if (now - (lastFetchRef.current.scores ?? 0) < 10000) return;
    lastFetchRef.current.scores = now;

    if (classes.length === 0) {
      setAllScores([]);
      setClassStudents([]);
      return;
    }

    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    const allRows: ProgressData[] = [];

    for (const chunk of chunks) {
      const { data } = await supabase
        .from('progress').select('*')
        .in('class_code', chunk)
        .order('completed_at', { ascending: false })
        .limit(5000);
      if (data) allRows.push(...data.map(mapProgress));
    }

    setAllScores(allRows);

    // Derive students from the same data — avoids a separate query
    const studentMap: Record<string, {name: string, classCode: string, lastActive: string}> = {};
    allRows.forEach(row => {
      const key = `${row.studentName}-${row.classCode}`;
      if (!studentMap[key] || new Date(row.completedAt) > new Date(studentMap[key].lastActive)) {
        studentMap[key] = { name: row.studentName, classCode: row.classCode, lastActive: row.completedAt };
      }
    });
    setClassStudents(Object.values(studentMap));
    lastFetchRef.current.students = now;
  };

  const fetchTeacherAssignments = async (classIdsOverride?: string[]) => {
    // Use optional chaining on user state, but don't early return - the caller ensures valid context
    setTeacherAssignmentsLoading(true);
    const classIds = classIdsOverride || classes.map(c => c.id);
    const { data, error } = await supabase.from('assignments').select('*').in('class_id', classIds).order('created_at', { ascending: false });
    setTeacherAssignments((data ?? []).map(mapAssignment));
    setTeacherAssignmentsLoading(false);
  };

  // --- GAME LOGIC ---
  const gameWords = view === "game" && assignmentWords.length > 0 ? assignmentWords : BAND_2_WORDS;
  const currentWord = gameWords[currentIndex];
  // Debug: verify word count in game
  if (view === "game" && activeAssignment) {
  }

  // Debug: log state when in game view
  if (view === "game") {
    console.log('[Game View Debug] view:', view, 'showModeSelection:', showModeSelection, 'assignmentWords.length:', assignmentWords.length);
  }

  const options = useMemo(() => {
    if (!currentWord) return [];
    const correct = currentWord;
    
    // Try to use ONLY the assigned gameWords for distractors so students only see what they are learning
    let possibleDistractors = gameWords.filter(w => w.id !== correct.id);
    
    // If the teacher assigned fewer than 4 words, we have to borrow from ALL_WORDS to fill the 4 buttons
    if (possibleDistractors.length < 3) {
      const allPossibleWords = [...ALL_WORDS, ...gameWords];
      const uniqueOthers = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values()).filter(w => w.id !== correct.id);
      possibleDistractors = uniqueOthers;
    }
    
    const shuffledOthers = shuffle(possibleDistractors).slice(0, 3);
    return shuffle([...shuffledOthers, correct]);
  }, [currentWord, gameWords]);

  useEffect(() => {
    if (currentWord) {
      // 50% chance to show correct translation, 50% chance to show wrong translation
      if (secureRandomInt(2) === 0) {
        setTfOption(currentWord);
      } else {
        let possibleDistractors = gameWords.filter(w => w.id !== currentWord.id);
        if (possibleDistractors.length === 0) {
          const allPossibleWords = [...ALL_WORDS, ...gameWords];
          possibleDistractors = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values()).filter(w => w.id !== currentWord.id);
        }
        setTfOption(possibleDistractors[secureRandomInt( possibleDistractors.length)]);
      }
      setIsFlipped(false);
    }
  }, [currentIndex, currentWord, gameWords]);

  const scrambledWord = useMemo(() => {
    if (!currentWord) return "";
    let scrambled = shuffle(currentWord.english.split('')).join('');
    // Ensure it's actually scrambled if length > 1
    while (scrambled === currentWord.english && currentWord.english.length > 1) {
      scrambled = shuffle(currentWord.english.split('')).join('');
    }
    return scrambled;
  }, [currentWord]);

  // Cache the selected voice so the same voice is used consistently
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const getVoice = () => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    const picked = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Natural") || v.name.includes("Neural")))
      || voices.find(v => v.lang.startsWith("en-US"));
    if (picked) cachedVoiceRef.current = picked;
    return picked ?? null;
  };
  // Re-cache when voices load (they load asynchronously in some browsers)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const onVoicesChanged = () => { cachedVoiceRef.current = null; getVoice(); };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    getVoice();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, []);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (view === "game" && !isFinished && currentWord && !showModeSelection && !showModeIntro && gameMode !== "sentence-builder") {
      speakWord(currentWord.id, currentWord.english);
    }
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro, gameMode]);

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
      speak(validSentences[sentenceIndex]);
      const newScore = score + 20;
      setScore(newScore);
      if (socket && user?.classCode) setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
      setTimeout(() => {
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
      setTimeout(() => { setBuiltSentence([]); setAvailableWords(shuffle(validSentences[sentenceIndex].split(" ").filter(Boolean))); setSentenceFeedback(null); }, 1200);
    }
  };

  // Remove Quick Play guest from teacher's dashboard (delete progress, clear localStorage)
  const cleanupQuickPlayGuest = async () => {
    if (!user?.isGuest || !quickPlayActiveSession) return;
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const authUid = authSession?.user?.id;
      if (authUid) {
        await supabase
          .from('progress')
          .delete()
          .eq('assignment_id', quickPlayActiveSession.id)
          .eq('student_uid', authUid);
      }
    } catch {}
    try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
    setQuickPlayCompletedModes(new Set());
  };

  const handleExitGame = () => {
    setIsFinished(false);
    setCurrentIndex(0);
    setScore(0);
    setMistakes([]);
    setFeedback(null);
    setSpellingInput("");
    setMatchedIds([]);
    setSelectedMatch(null);
    setIsFlipped(false);
    setTfOption(null);
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
      }
    } else if (user?.isGuest) {
      // Quick Play guest: go back to mode selection so they can pick another mode
      setShowModeSelection(true);
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

        // Insert progress for Quick Play (direct insert since no RLS for guest sessions)
        const { error } = await supabase
          .from('progress')
          .insert({
            student_name: progress.studentName,
            student_uid: progress.studentUid,
            assignment_id: progress.assignmentId,
            class_code: progress.classCode,
            score: progress.score,
            mode: progress.mode,
            completed_at: progress.completedAt,
            mistakes: Array.isArray(mistakes) ? mistakes : [],
            avatar: progress.avatar
          });

        if (error) {
          console.error('[Quick Play] Failed to save progress:', error);
        } else {
          // Mark this mode as completed so it gets locked in mode selection
          setQuickPlayCompletedModes(prev => new Set([...prev, gameMode]));
        }

        setIsSaving(false);
        return;
      } catch (err) {
        console.error('[Quick Play] Error saving progress:', err);
        setIsSaving(false);
        return;
      }
    }

    // Regular assignment mode
    if (!activeAssignment) return;

    // Cap score to the maximum possible for this assignment (10 pts per word)
    const maxPossible = gameWords.length * 10;
    const cappedScore = Math.min(Math.max(0, finalScore), maxPossible);

    const xpEarned = cappedScore;
    const newXp = xp + xpEarned;
    const newStreak = cappedScore >= 80 ? streak + 1 : 0;
    setXp(newXp);
    setStreak(newStreak);

    if (cappedScore === 100) await awardBadge("🎯 Perfect Score");
    if (newStreak >= 5) await awardBadge("🔥 Streak Master");
    if (newXp >= 500) await awardBadge("💎 XP Hunter");

    // Streak milestone celebrations
    const streakMilestones = [7, 14, 30, 50, 100];
    if (streakMilestones.includes(newStreak)) {
      loadConfetti().then(confettiModule => {
        const confetti = confettiModule.default || confettiModule;
        // Big celebration burst
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.2, y: 0.5 } }), 300);
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.8, y: 0.5 } }), 600);
      });
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

    try {
      // Save progress + XP/streak in parallel (2 calls → 1 round-trip)
      const [{ data: progressId, error: rpcError }] = await Promise.all([
        supabase.rpc('save_student_progress', {
          p_student_name: user.displayName,
          p_student_uid: studentUid,
          p_assignment_id: activeAssignment.id,
          p_class_code: user.classCode || "",
          p_score: cappedScore,
          p_mode: gameMode,
          p_mistakes: Array.isArray(mistakes) ? mistakes.length : (mistakes || 0),
          p_avatar: user.avatar || "🦊"
        }),
        supabase.from('users').update({ xp: newXp, streak: newStreak }).eq('uid', user.uid),
      ]);

      if (rpcError) throw rpcError;

      // Update local state with the saved progress
      const newProgress = {
        id: progressId,
        ...progress
      };

      setStudentProgress(prev => {
        const existingIndex = prev.findIndex(
          p => p.assignmentId === activeAssignment.id
            && p.mode === gameMode
            && p.studentUid === studentUid
        );

        if (existingIndex >= 0) {
          // Update existing if found
          const updated = [...prev];
          updated[existingIndex] = newProgress;
          return updated;
        } else {
          // Add new progress
          return [...prev, newProgress];
        }
      });

      // Clear any queued retry for this assignment+mode
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.removeItem(retryKey);

      // Lazy load and use confetti
      loadConfetti().then(confettiModule => {
        const confetti = confettiModule.default || confettiModule;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      });
    } catch (error) {
      console.error("Error saving score:", error);
      // Log detailed error for debugging
      if (error && typeof error === 'object' && 'message' in error) {
        console.error("Supabase error details:", error);
      }
      // Queue for retry on next load
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.setItem(retryKey, JSON.stringify(mapProgressToDb(progress)));
      setSaveError(`Your score couldn't be saved. Check your connection — it will retry automatically.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMatchClick = (item: {id: number, type: 'english' | 'arabic'}) => {
    if (matchedIds.includes(item.id)) return;

    // Pronounce the word when clicking any card (deferred to not block paint)
    const matchWord = gameWords.find(w => w.id === item.id);
    setTimeout(() => { speakWord(item.id, matchWord?.english); }, 0);

    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        setMatchedIds([...matchedIds, item.id]);
        const newScore = score + 15;
        setScore(newScore);

        if (socket && user?.classCode) {
          setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
        }

        setSelectedMatch(null);

        if (matchedIds.length + 1 === matchingPairs.length / 2) {
          setTimeout(() => {
            setIsFinished(true);
            saveScore(newScore);
          }, 500);
        }
      } else {
        setSelectedMatch(item);
      }
    }
  };

  const handleAnswer = (selectedWord: Word) => {
    if (feedback) return;

    if (selectedWord.id === currentWord.id) {
      setFeedback("correct");
      const mKey = playMotivational();
      setMotivationalMessage(getMotivationalLabel(mKey));
      const newScore = score + 10;
      setScore(newScore);

      // Clear attempts for this word since they got it right
      setWordAttempts(prev => {
        const newState = { ...prev };
        delete newState[currentWord.id];
        return newState;
      });

      if (socket && user?.classCode) {
        setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
      }

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
        setMotivationalMessage(`Try again (${currentAttempts}/${MAX_ATTEMPTS_PER_WORD})`);

        // Clear any pending timeout first
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), WRONG_FEEDBACK_DELAY_MS);
      }
    }
  };

  const handleTFAnswer = (isTrue: boolean) => {
    if (feedback) return;
    const isActuallyTrue = tfOption?.id === currentWord.id;
    
    if (isTrue === isActuallyTrue) {
      setFeedback("correct");
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
      const newScore = score + 15;
      setScore(newScore);

      if (socket && user?.classCode) {
        setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
      }

      setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, 1000);
    } else {
      setFeedback("wrong");
      playWrong();
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const handleFlashcardAnswer = (knewIt: boolean) => {
    let currentScore = score;
    if (knewIt) {
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
      setTimeout(() => setMotivationalMessage(null), 1000);
      currentScore = score + 5;
      setScore(currentScore);
      if (socket && user?.classCode) {
        setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: currentScore }); }, 0);
      }
    } else {
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
    }

    if (currentIndex < gameWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
      saveScore(currentScore);
    }
  };

  const handleSpellingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (feedback) return;

    if (spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase()) {
      setFeedback("correct");
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
      const newScore = score + 20;
      setScore(newScore);

      if (socket && user?.classCode) {
        setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
      }

      setTimeout(() => {
        if (currentIndex < gameWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setFeedback(null);
          setSpellingInput("");
        } else {
          setIsFinished(true);
          saveScore(newScore);
        }
      }, 1000);
    } else {
      setFeedback("wrong");
      if (!mistakes.includes(currentWord.id)) {
        setMistakes([...mistakes, currentWord.id]);
      }
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  // Global cookie banner — renders on top of ANY view until accepted
  // Only show to non-authenticated users (logged-in users have already accepted via privacy consent)
  const cookieBannerOverlay = showCookieBanner && !user ? (
    <CookieBanner onAccept={handleCookieAccept} onCustomize={handleCookieCustomize} />
  ) : null;

  // Debug: log banner state on every render
  if (showCookieBanner && !user) {
  }


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
  if (view === "public-landing") {
    return (
      <>
        {configErrorBanner}
        <LandingPageWrapper
          onNavigate={handlePublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onTeacherLogin={() => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          })}
          onTryDemo={() => setShowDemo(true)}
          isAuthenticated={!!user}
        />
        {showDemo && (
          <DemoModeWrapper
            onClose={() => setShowDemo(false)}
            onSignUp={() => {
              setShowDemo(false);
              setView("student-account-login");
            }}
          />
        )}
        {cookieBannerOverlay}
        <FloatingButtons showBackToTop={true} />
      </>
    );
  }

  if (view === "public-terms") {
    return (
      <>
        <TermsPageWrapper
          onNavigate={handlePublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "public-privacy") {
    return (
      <>
        <PrivacyPageWrapper
          onNavigate={handlePublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "accessibility-statement") {
    return (
      <>
        <AccessibilityStatementWrapper
          onNavigate={handlePublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "student-account-login") {
    return (
      <SuspenseWrapper>
        <StudentAccountLoginView
          isOAuthCallback={isOAuthCallback}
          setIsOAuthCallback={setIsOAuthCallback}
          oauthEmail={oauthEmail}
          setOauthEmail={setOauthEmail}
          oauthAuthUid={oauthAuthUid}
          setOauthAuthUid={setOauthAuthUid}
          showOAuthClassCode={showOAuthClassCode}
          setShowOAuthClassCode={setShowOAuthClassCode}
          handleOAuthTeacherDetected={handleOAuthTeacherDetected}
          handleOAuthStudentDetected={handleOAuthStudentDetected}
          handleOAuthNewUser={handleOAuthNewUser}
          studentLoginClassCode={studentLoginClassCode}
          setStudentLoginClassCode={setStudentLoginClassCode}
          studentLoginName={studentLoginName}
          setStudentLoginName={setStudentLoginName}
          existingStudents={existingStudents}
          setExistingStudents={setExistingStudents}
          showNewStudentForm={showNewStudentForm}
          setShowNewStudentForm={setShowNewStudentForm}
          loadStudentsInClass={loadStudentsInClass}
          handleLoginAsStudent={handleLoginAsStudent}
          handleNewStudentSignup={handleNewStudentSignup}
          studentAvatar={studentAvatar}
          setStudentAvatar={setStudentAvatar}
          selectedAvatarCategory={selectedAvatarCategory}
          setSelectedAvatarCategory={setSelectedAvatarCategory}
          AVATAR_CATEGORIES={AVATAR_CATEGORIES}
          error={error}
          setError={setError}
          cookieBannerOverlay={cookieBannerOverlay}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }

  // Quick Play: Kicked by teacher
  if (quickPlayKicked) {
    return (
      <QuickPlayKickedScreen
        onGoHome={() => {
          setQuickPlayKicked(false);
          setQuickPlayActiveSession(null);
          setActiveAssignment(null);
          setUser(null);
          setView("public-landing");
          try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
        }}
      />
    );
  }

  // Quick Play: Session ended by teacher
  if (quickPlaySessionEnded) {
    return (
      <QuickPlaySessionEndScreen
        studentName={user?.displayName || quickPlayStudentName || "Player"}
        finalScore={score || 0}
        onGoHome={() => {
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
      <SuspenseWrapper>
        <QuickPlayStudentView
          quickPlayActiveSession={quickPlayActiveSession}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          quickPlayStudentName={quickPlayStudentName}
          setQuickPlayStudentName={setQuickPlayStudentName}
          quickPlayAvatar={quickPlayAvatar}
          setQuickPlayAvatar={setQuickPlayAvatar}
          createGuestUser={createGuestUser}
          setUser={setUser}
          setAssignmentWords={setAssignmentWords}
          setActiveAssignment={setActiveAssignment}
          setCurrentIndex={setCurrentIndex}
          setScore={setScore}
          setFeedback={setFeedback}
          setIsFinished={setIsFinished}
          setMistakes={setMistakes}
          setShowModeSelection={setShowModeSelection}
          showToast={showToast}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }


  // --- CONSENT MODAL (overlays any view when policy update requires re-consent) ---
  const consentModal = needsConsent && user && !showOnboarding ? (
    <div className="fixed inset-0 bg-inverse-surface/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border-t sm:border border-surface-variant/20">
        <h2 className="text-base sm:text-lg font-black text-on-surface mb-2 font-headline">Privacy Policy Update</h2>
        <p className="text-on-surface-variant text-xs sm:text-sm mb-3">
          We&apos;ve updated our Privacy Policy (v{PRIVACY_POLICY_VERSION}). Please review and accept to continue using Vocaband.
        </p>
        <div className="bg-surface-container-low rounded-xl p-3 mb-3 text-xs sm:text-sm text-on-surface-variant space-y-1.5">
          <p><strong>What we collect:</strong> Display name, class code, game scores & progress. Student accounts are anonymous — no emails or personal info required.</p>
          <p><strong>For teachers:</strong> Email (via Google) and display name, used only for authentication.</p>
          <p><strong>How we use it:</strong> To run the app — games, progress tracking, leaderboards. No ads, no profiling, no third-party trackers.</p>
          <p><strong>Your rights:</strong> You can export or delete your data anytime from Privacy Settings.</p>
          <div className="flex gap-3 pt-1">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold hover:underline">Full Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-bold hover:underline">Terms of Service</a>
          </div>
        </div>
        <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-outline text-primary focus:ring-primary"
          />
          <span className="text-xs sm:text-sm text-on-surface">
            I have read and agree to the <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Privacy Policy</a> and <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Terms of Service</a>.
          </span>
        </label>
        <button
          onClick={() => recordConsent()}
          disabled={!consentChecked}
          className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm font-headline ${consentChecked ? 'signature-gradient text-white hover:shadow-lg' : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'}`}
        >
          Accept & Continue
        </button>
      </div>
    </div>
  ) : null;

  if (user?.role === "student" && view === "student-dashboard") {
    return (
      <SuspenseWrapper>
        <StudentDashboardView
          user={user}
          consentModal={consentModal}
          showStudentOnboarding={showStudentOnboarding}
          setShowStudentOnboarding={setShowStudentOnboarding}
          activeThemeBg={activeThemeConfig.colors.bg}
          xp={xp}
          streak={streak}
          badges={badges}
          copiedCode={copiedCode}
          setCopiedCode={setCopiedCode}
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          studentDataLoading={studentDataLoading}
          toProgressValue={toProgressValue}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setShowModeSelection={setShowModeSelection}
          setShopTab={setShopTab}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }

  // --- PRIVACY SETTINGS VIEW ---
  if (user && view === "privacy-settings") {
    return (
      <SuspenseWrapper>
        <PrivacySettingsView
          user={user}
          consentModal={consentModal}
          setUser={setUser}
          setConfirmDialog={setConfirmDialog}
          showToast={showToast}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }

  // --- SHOP VIEW ---
  if (user?.role === "student" && view === "shop") {
    return (
      <SuspenseWrapper>
        <ShopView
          user={user}
          setUser={setUser}
          xp={xp}
          setXp={setXp}
          shopTab={shopTab}
          setShopTab={setShopTab}
          showToast={showToast}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }

  if (user?.role === "teacher" && view === "teacher-dashboard") {
    return (
      <SuspenseWrapper>
        <TeacherDashboardView
          user={user}
          consentModal={consentModal}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          classes={classes}
          teacherAssignments={teacherAssignments}
          setTeacherAssignments={setTeacherAssignments}
          pendingStudents={pendingStudents}
          classStudents={classStudents}
          allScores={allScores}
          copiedCode={copiedCode}
          setCopiedCode={setCopiedCode}
          openDropdownClassId={openDropdownClassId}
          setOpenDropdownClassId={setOpenDropdownClassId}
          showCreateClassModal={showCreateClassModal}
          setShowCreateClassModal={setShowCreateClassModal}
          newClassName={newClassName}
          setNewClassName={setNewClassName}
          createdClassCode={createdClassCode}
          setCreatedClassCode={setCreatedClassCode}
          createdClassName={createdClassName}
          deleteConfirmModal={deleteConfirmModal}
          setDeleteConfirmModal={setDeleteConfirmModal}
          rejectStudentModal={rejectStudentModal}
          setRejectStudentModal={setRejectStudentModal}
          confirmDialog={confirmDialog}
          setConfirmDialog={setConfirmDialog}
          toasts={toasts}
          setToasts={setToasts}
          showToast={showToast}
          setSelectedClass={setSelectedClass}
          setSelectedWords={setSelectedWords}
          setSelectedLevel={setSelectedLevel}
          setAssignmentTitle={setAssignmentTitle}
          setAssignmentDeadline={setAssignmentDeadline}
          setAssignmentModes={setAssignmentModes}
          setAssignmentSentences={setAssignmentSentences}
          setAssignmentStep={setAssignmentStep}
          setCustomWords={setCustomWords}
          setSentenceDifficulty={setSentenceDifficulty}
          setSentencesAutoGenerated={setSentencesAutoGenerated}
          setEditingAssignment={setEditingAssignment}
          setIsLiveChallenge={setIsLiveChallenge}
          handleCreateClass={handleCreateClass}
          handleDeleteClass={handleDeleteClass}
          loadPendingStudents={loadPendingStudents}
          fetchScores={fetchScores}
          fetchTeacherAssignments={fetchTeacherAssignments}
          confirmRejectStudent={confirmRejectStudent}
          setView={setView}
          socket={socket}
        />
      </SuspenseWrapper>
    );
  }

  if (view === "create-assignment" && selectedClass) {
    return (
      <CreateAssignmentWizard
        selectedClass={selectedClass}
        allWords={ALL_WORDS}
        band1Words={BAND_1_WORDS}
        band2Words={BAND_2_WORDS}
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
    );
  }


  if (view === "game" && showModeSelection) {
    return (
      <SuspenseWrapper>
        <GameModeSelectionView
          activeAssignment={activeAssignment}
          studentProgress={studentProgress}
          isQuickPlayGuest={isQuickPlayGuest}
          quickPlayCompletedModes={quickPlayCompletedModes}
          handleExitGame={handleExitGame}
          setGameMode={setGameMode}
          setShowModeSelection={setShowModeSelection}
          setShowModeIntro={setShowModeIntro}
        />
      </SuspenseWrapper>
    );
  }

  if (view === "live-challenge" && selectedClass) {
    return (
      <SuspenseWrapper>
        <LiveChallengeView
          selectedClass={selectedClass}
          leaderboard={leaderboard}
          socketConnected={socketConnected}
          setView={setView}
          setIsLiveChallenge={setIsLiveChallenge}
        />
      </SuspenseWrapper>
    );
  }

  if (view === "global-leaderboard") {
    return (
      <SuspenseWrapper>
        <GlobalLeaderboardView
          user={user}
          globalLeaderboard={globalLeaderboard}
          setView={setView}
        />
      </SuspenseWrapper>
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
      <SuspenseWrapper>
        <TeacherApprovalsView
          user={user}
          consentModal={consentModal}
          pendingStudents={pendingStudents}
          loadPendingStudents={loadPendingStudents}
          handleApproveStudent={handleApproveStudent}
          handleRejectStudent={handleRejectStudent}
          showToast={showToast}
          setView={setView}
          toasts={toasts}
        />
      </SuspenseWrapper>
    );
  }

  if (view === "quick-play-setup") {
    return (
      <SuspenseWrapper>
        <QuickPlaySetupView
          user={user}
          quickPlaySelectedWords={quickPlaySelectedWords}
          setQuickPlaySelectedWords={setQuickPlaySelectedWords}
          quickPlayCustomWords={quickPlayCustomWords}
          setQuickPlayCustomWords={setQuickPlayCustomWords}
          quickPlayAddingCustom={quickPlayAddingCustom}
          setQuickPlayAddingCustom={setQuickPlayAddingCustom}
          quickPlayTranslating={quickPlayTranslating}
          setQuickPlayTranslating={setQuickPlayTranslating}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          setQuickPlaySessionCode={setQuickPlaySessionCode}
          translateWord={translateWord}
          uniqueNegativeId={uniqueNegativeId}
          showToast={showToast}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }
  if (view === "quick-play-teacher-monitor") {
    if (!quickPlayActiveSession) {
      setView("quick-play-setup");
      return null;
    }
    return (
      <QuickPlayMonitor
        session={quickPlayActiveSession}
        students={quickPlayJoinedStudents}
        setStudents={setQuickPlayJoinedStudents}
        onBack={() => {
          setView("teacher-dashboard");
          setQuickPlayActiveSession(null);
          setQuickPlaySelectedWords([]);
          setQuickPlaySessionCode(null);
          setQuickPlayJoinedStudents([]);
          setQuickPlayCustomWords(new Map());
          setQuickPlayAddingCustom(new Set());
          setQuickPlayTranslating(new Set());
          try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
        }}
        onEndSession={async () => {
          showToast("Ending session...", "info");
          const { error } = await supabase.rpc('end_quick_play_session', {
            p_session_code: quickPlayActiveSession!.sessionCode
          });
          if (error) {
            showToast("Failed to end session: " + error.message, "error");
            return;
          }
          setView("teacher-dashboard");
          setQuickPlayActiveSession(null);
          setQuickPlaySelectedWords([]);
          setQuickPlaySessionCode(null);
          setQuickPlayJoinedStudents([]);
          setQuickPlayCustomWords(new Map());
          setQuickPlayAddingCustom(new Set());
          setQuickPlayTranslating(new Set());
          try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
          showToast("Quick Play session ended", "success");
        }}
        showToast={showToast}
      />
    );
  }

  if (view === "analytics") {
    return (
      <SuspenseWrapper>
        <AnalyticsView
          user={user}
          allScores={allScores}
          teacherAssignments={teacherAssignments}
          classes={classes}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }
  if (view === "gradebook") {
    return (
      <SuspenseWrapper>
        <GradebookView
          user={user}
          allScores={allScores}
          classes={classes}
          classStudents={classStudents}
          teacherAssignments={teacherAssignments}
          showToast={showToast}
          setView={setView}
        />
      </SuspenseWrapper>
    );
  }

  if (view === "live-challenge-class-select") {
    return (
      <SuspenseWrapper>
        <LiveChallengeClassSelectView
          user={user}
          classes={classes}
          setView={setView}
          setSelectedClass={setSelectedClass}
          setIsLiveChallenge={setIsLiveChallenge}
          socket={socket}
        />
      </SuspenseWrapper>
    );
  }

  if (isFinished) {
    const t = activeThemeConfig.colors;
    const isDark = t.bg.includes('gray-9') || t.bg.includes('gray-950');
    return (
      <div className={`min-h-screen ${t.bg} flex flex-col items-center justify-center p-4 sm:p-6 text-center`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Trophy className="w-20 h-20 sm:w-24 sm:h-24 text-yellow-500 mb-4 mx-auto" />
        </motion.div>
        <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${t.text}`}>{
          [
            `Kol Hakavod, ${user?.displayName}!`,
            `Amazing work, ${user?.displayName}!`,
            `You crushed it, ${user?.displayName}!`,
            `${user?.displayName}, you're a star!`,
            `Incredible, ${user?.displayName}!`,
            `Way to go, ${user?.displayName}!`,
            `${user?.displayName} is on fire!`,
            `Bravo, ${user?.displayName}!`,
          ][secureRandomInt( 8)]
        }</h1>
        <p className={`text-lg sm:text-xl mb-6 ${isDark ? 'text-gray-300' : 'text-stone-600'}`}>{
          [
            "You finished the assignment!",
            "Another challenge conquered!",
            "Your vocabulary is growing!",
            "Keep this momentum going!",
            "You're making great progress!",
          ][secureRandomInt( 5)]
        }</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-lg">
          <div className={`${t.card} p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center`}>
            <p className={`text-xs sm:text-sm uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-stone-500'} mb-1`}>Final Score</p>
            <p className="text-4xl sm:text-6xl font-black text-blue-500">{score}</p>
          </div>
          <div className={`${t.card} p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center`}>
            <p className={`text-xs sm:text-sm uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-stone-500'} mb-1`}>Total XP</p>
            <p className="text-4xl sm:text-6xl font-black text-blue-600">{xp}</p>
          </div>
          {streak > 0 && (
            <div className={`${t.card} p-6 sm:p-8 rounded-3xl shadow-md border-2 border-orange-100 flex-1 text-center`}>
              <p className="text-sm uppercase tracking-widest text-orange-500 mb-1">Streak</p>
              <p className="text-5xl sm:text-6xl font-black text-orange-600">{streak} 🔥</p>
            </div>
          )}
        </div>
        {/* Accuracy summary */}
        {gameWords.length > 0 && (
          <div className={`${t.card} rounded-2xl shadow-sm px-6 py-3 mb-6 ${isDark ? 'text-gray-300' : 'text-stone-600'}`}>
            <span className="font-bold">{gameWords.length - mistakes.length}</span> / {gameWords.length} correct
            {mistakes.length > 0 && <span className="ml-2 text-rose-500 font-bold">({mistakes.length} to review)</span>}
          </div>
        )}
        {badges.length > 0 && (
          <div className="mb-8">
            <p className={`text-xs font-black ${isDark ? 'text-gray-500' : 'text-stone-400'} uppercase mb-4 tracking-widest`}>Badges Earned</p>
            <div className="flex flex-wrap justify-center gap-3">
              {badges.map(badge => (
                <motion.div
                  key={badge}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`${t.card} px-6 py-3 rounded-2xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-stone-100'} flex items-center gap-2`}
                >
                  <span className="text-xl">{badge.split(' ')[0]}</span>
                  <span className={`font-bold ${t.text}`}>{badge.split(' ').slice(1).join(' ')}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {isSaving ? (
          <div className="flex items-center gap-2 text-yellow-600 mb-4">
            <RefreshCw className="animate-spin" size={18} />
            <span className="font-semibold">Saving your score...</span>
          </div>
        ) : saveError ? (
          <div className="flex items-center gap-2 text-red-500 mb-4">
            <AlertTriangle size={18} />
            <span className="text-sm">{saveError}</span>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          {/* Try Again — replay same mode + words */}
          <button
            onClick={() => {
              setIsFinished(false); setScore(0); setCurrentIndex(0); setMistakes([]); setFeedback(null); setWordAttempts({}); setHiddenOptions([]);
              setSpellingInput(""); setMotivationalMessage(null);
            }}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >Try Again</button>
          {/* Try Again — only missed words */}
          {mistakes.length > 0 && (
            <button
              onClick={() => {
                const missedWords = gameWords.filter(w => mistakes.includes(w.id));
                if (missedWords.length > 0) {
                  setAssignmentWords(missedWords);
                }
                setIsFinished(false); setScore(0); setCurrentIndex(0); setMistakes([]); setFeedback(null); setWordAttempts({}); setHiddenOptions([]);
                setSpellingInput(""); setMotivationalMessage(null);
              }}
              disabled={isSaving}
              className={`w-full px-8 py-3 rounded-full font-bold text-base transition-all disabled:opacity-50 ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-stone-200 text-stone-800 hover:bg-stone-300'}`}
            >Review {mistakes.length} Missed Word{mistakes.length > 1 ? 's' : ''}</button>
          )}
          <button
            onClick={handleExitGame}
            disabled={isSaving}
            className={`w-full px-8 py-3 rounded-full font-bold text-base transition-all disabled:opacity-50 ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-black text-white hover:bg-gray-800'}`}
          >Choose Another Mode</button>
          <button
            onClick={() => {
              setIsFinished(false); setScore(0); setCurrentIndex(0); setMistakes([]); setFeedback(null); setShowModeSelection(true);
              if (user?.isGuest) {
                setView("game");
              } else {
                setView("student-dashboard");
              }
            }}
            disabled={isSaving}
            className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-stone-400 hover:text-stone-600'} font-bold text-sm transition-colors`}
          >Back to Dashboard</button>
        </div>

        {/* Toast Notifications */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 min-w-[300px] ${
                  toast.type === 'success' ? 'bg-green-600 text-white' :
                  toast.type === 'error' ? 'bg-red-600 text-white' :
                  'bg-blue-600 text-white'
                }`}
              >
                {toast.type === 'success' && <CheckCircle2 size={24} />}
                {toast.type === 'error' && <AlertTriangle size={24} />}
                {toast.type === 'info' && <Info size={24} />}
                <span className="flex-1">{toast.message}</span>
                {toast.action && (
                  <button onClick={toast.action.onClick} className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">
                    {toast.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Error Tracking Panel (Debug Mode) */}
        <ErrorTrackingPanel />

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {confirmDialog.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-black mb-3 text-stone-900">Confirm Action</h3>
                <p className="text-stone-600 mb-8">{confirmDialog.message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
                    className="flex-1 py-4 bg-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-300 transition-all border-2 border-blue-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Mode intro instructions with translations
  const modeInstructionsAll: Record<string, Record<GameMode, { title: string; steps: string[]; icon: string }>> = {
    en: {
      classic: { title: "Classic Mode", icon: "📖", steps: ["See the English word", "Listen to pronunciation", "Pick the correct translation"] },
      listening: { title: "Listening Mode", icon: "🎧", steps: ["Listen carefully to the word", "The text is hidden!", "Choose the correct translation"] },
      spelling: { title: "Spelling Mode", icon: "✏️", steps: ["See the translation", "Type the English word", "Spelling must be exact!"] },
      matching: { title: "Matching Mode", icon: "⚡", steps: ["Find matching pairs", "Tap English then translation", "Match all pairs to finish!"] },
      "true-false": { title: "True / False", icon: "✅", steps: ["See a word and translation", "Decide if the pair is correct", "Think fast!"] },
      flashcards: { title: "Flashcards", icon: "🃏", steps: ["Review words at your pace", "Flip to see the answer", "No pressure — just learn!"] },
      scramble: { title: "Word Scramble", icon: "🔤", steps: ["Letters are scrambled", "Type the correct English word", "Unscramble them all!"] },
      reverse: { title: "Reverse Mode", icon: "🔄", steps: ["See the Hebrew/Arabic word", "Pick the English translation", "Reverse of classic!"] },
      "letter-sounds": { title: "Letter Sounds", icon: "🔡", steps: ["Each letter appears in a color", "Listen to each letter sound", "Type the full word when ready"] },
      "sentence-builder": { title: "Sentence Builder", icon: "🧩", steps: ["Words are shuffled below", "Tap words in the correct order", "Build the sentence to finish!"] },
    },
    ar: {
      classic: { title: "الوضع الكلاسيكي", icon: "📖", steps: ["شاهد الكلمة بالإنجليزية", "استمع إلى النطق", "اختر الترجمة الصحيحة"] },
      listening: { title: "وضع الاستماع", icon: "🎧", steps: ["استمع جيداً للكلمة", "النص مخفي!", "اختر الترجمة الصحيحة"] },
      spelling: { title: "وضع التهجئة", icon: "✏️", steps: ["شاهد الترجمة", "اكتب الكلمة بالإنجليزية", "التهجئة يجب أن تكون دقيقة!"] },
      matching: { title: "وضع المطابقة", icon: "⚡", steps: ["ابحث عن الأزواج المتطابقة", "اضغط الإنجليزية ثم الترجمة", "طابق كل الأزواج!"] },
      "true-false": { title: "صح أو خطأ", icon: "✅", steps: ["شاهد كلمة وترجمتها", "قرر إذا كانت صحيحة", "فكر بسرعة!"] },
      flashcards: { title: "البطاقات", icon: "🃏", steps: ["راجع الكلمات بسرعتك", "اقلب لترى الإجابة", "بدون ضغط - فقط تعلم!"] },
      scramble: { title: "خلط الحروف", icon: "🔤", steps: ["الحروف مخلوطة", "اكتب الكلمة الصحيحة", "رتب كل الكلمات!"] },
      reverse: { title: "الوضع العكسي", icon: "🔄", steps: ["شاهد الكلمة بالعربية/العبرية", "اختر الترجمة بالإنجليزية", "عكس الكلاسيكي!"] },
      "letter-sounds": { title: "أصوات الحروف", icon: "🔡", steps: ["كل حرف يظهر بلون", "استمع لصوت كل حرف", "اكتب الكلمة كاملة عندما تكون جاهزاً"] },
      "sentence-builder": { title: "بناء الجمل", icon: "🧩", steps: ["الكلمات مخلوطة في الأسفل", "اضغط الكلمات بالترتيب الصحيح", "ابنِ الجملة لتنتهي!"] },
    },
    he: {
      classic: { title: "מצב קלאסי", icon: "📖", steps: ["ראה את המילה באנגלית", "הקשב להגייה", "בחר את התרגום הנכון"] },
      listening: { title: "מצב הקשבה", icon: "🎧", steps: ["הקשב היטב למילה", "הטקסט מוסתר!", "בחר את התרגום הנכון"] },
      spelling: { title: "מצב איות", icon: "✏️", steps: ["ראה את התרגום", "הקלד את המילה באנגלית", "האיות חייב להיות מדויק!"] },
      matching: { title: "מצב התאמה", icon: "⚡", steps: ["מצא זוגות תואמים", "לחץ אנגלית ואז תרגום", "התאם את כל הזוגות!"] },
      "true-false": { title: "נכון / לא נכון", icon: "✅", steps: ["ראה מילה ותרגום", "החלט אם הזוג נכון", "חשוב מהר!"] },
      flashcards: { title: "כרטיסיות", icon: "🃏", steps: ["חזור על מילים בקצב שלך", "הפוך לראות תשובה", "בלי לחץ - רק ללמוד!"] },
      scramble: { title: "ערבוב מילים", icon: "🔤", steps: ["האותיות מעורבבות", "הקלד את המילה הנכונה", "פתור את כולן!"] },
      reverse: { title: "מצב הפוך", icon: "🔄", steps: ["ראה את המילה בעברית/ערבית", "בחר את התרגום באנגלית", "הפוך מקלאסי!"] },
      "letter-sounds": { title: "צלילי אותיות", icon: "🔡", steps: ["כל אות מופיעה בצבע", "הקשב לצליל כל אות", "הקלד את המילה כשמוכן"] },
      "sentence-builder": { title: "בניית משפטים", icon: "🧩", steps: ["המילים מעורבבות למטה", "לחץ על מילים בסדר הנכון", "בנה את המשפט!"] },
    },
  };
  const modeInstructions = modeInstructionsAll[introLang];

  if (showModeIntro) {
    const info = modeInstructions[gameMode];
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] shadow-2xl p-8 sm:p-12 max-w-md w-full text-center"
        >
          {/* Language toggle */}
          <div className="flex justify-center gap-2 mb-4">
            {([["en", "EN"], ["ar", "عربي"], ["he", "עברית"]] as const).map(([code, label]) => (
              <button key={code} onClick={() => setIntroLang(code as "en" | "ar" | "he")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${introLang === code ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="text-5xl mb-4">{info.icon}</div>
          <h2 className={`text-2xl sm:text-3xl font-black text-stone-900 mb-6 ${introLang !== "en" ? "dir-rtl" : ""}`} dir={introLang !== "en" ? "rtl" : "ltr"}>{info.title}</h2>
          <div className="space-y-3 mb-8">
            {info.steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-3 text-left bg-stone-50 p-3 rounded-xl"
              >
                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-stone-700 font-medium text-sm sm:text-base" dir={introLang !== "en" ? "rtl" : "ltr"}>{step}</span>
              </motion.div>
            ))}
          </div>
          {/* Language selection — shown once, then remembered */}
          {!hasChosenLanguage && (
            <div className="mb-6 bg-blue-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-blue-900 mb-3">Choose your translation language:</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setTargetLanguage("hebrew"); try { localStorage.setItem('vocaband_target_lang', 'hebrew'); } catch {} setHasChosenLanguage(true); }}
                  className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${targetLanguage === "hebrew" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-stone-700 border-2 border-stone-200 hover:border-blue-300"}`}
                >
                  עברית
                </button>
                <button
                  onClick={() => { setTargetLanguage("arabic"); try { localStorage.setItem('vocaband_target_lang', 'arabic'); } catch {} setHasChosenLanguage(true); }}
                  className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${targetLanguage === "arabic" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-stone-700 border-2 border-stone-200 hover:border-blue-300"}`}
                >
                  عربي
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowModeIntro(false)}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors"
          >
            Let's Go!
          </button>
          <button
            onClick={() => { setShowModeIntro(false); setShowModeSelection(true); }}
            className="w-full mt-2 py-2 text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
          >
            ← Back to Modes
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === "game") {
    return (
      <SuspenseWrapper>
        <GameView
          user={user}
          setUser={setUser}
          saveError={saveError}
          setSaveError={setSaveError}
          score={score}
          xp={xp}
          streak={streak}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          handleExitGame={handleExitGame}
          gameMode={gameMode}
          activeThemeBg={activeThemeConfig.colors.bg}
          matchingPairs={matchingPairs}
          matchedIds={matchedIds}
          selectedMatch={selectedMatch}
          handleMatchClick={handleMatchClick}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          gameWords={gameWords}
          currentWord={currentWord}
          options={options}
          feedback={feedback}
          motivationalMessage={motivationalMessage}
          toProgressValue={toProgressValue}
          speakWord={speakWord}
          hiddenOptions={hiddenOptions}
          setHiddenOptions={setHiddenOptions}
          handleAnswer={handleAnswer}
          tfOption={tfOption}
          handleTFAnswer={handleTFAnswer}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          handleFlashcardAnswer={handleFlashcardAnswer}
          revealedLetters={revealedLetters}
          spellingInput={spellingInput}
          setSpellingInput={setSpellingInput}
          handleSpellingSubmit={handleSpellingSubmit}
          scrambledWord={scrambledWord}
          activeAssignment={activeAssignment}
          sentenceIndex={sentenceIndex}
          builtSentence={builtSentence}
          setBuiltSentence={setBuiltSentence}
          availableWords={availableWords}
          setAvailableWords={setAvailableWords}
          sentenceFeedback={sentenceFeedback}
          handleSentenceWordTap={handleSentenceWordTap}
          handleSentenceCheck={handleSentenceCheck}
          speak={speak}
          leaderboard={leaderboard}
          isFinished={isFinished}
        />
      </SuspenseWrapper>
    );
  }

  return null;
};
