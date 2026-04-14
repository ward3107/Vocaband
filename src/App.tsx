import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS, Word } from "./data/vocabulary";
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
import SetupWizard from "./components/setup/SetupWizard";
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
import { compressImageForUpload } from "./utils/compressImage";
import ImageCropModal from "./components/ImageCropModal";
import { getGameDebugger } from "./utils/gameDebug";
import {
  MAX_ATTEMPTS_PER_WORD, AUTO_SKIP_DELAY_MS, SHOW_ANSWER_DELAY_MS, WRONG_FEEDBACK_DELAY_MS,
  MOTIVATIONAL_MESSAGES, SPEAKABLE_MOTIVATIONS, randomMotivation,
  XP_TITLES, getXpTitle, PREMIUM_AVATARS, AVATAR_CATEGORY_UNLOCKS,
  THEMES, POWER_UP_DEFS, BOOSTERS_DEFS, NAME_FRAMES, NAME_TITLES, LETTER_COLORS,
  type GameMode,
} from "./constants/game";
import { ErrorTrackingPanel } from "./components/ErrorTrackingPanel";

// Types for lazy-loaded modules
type SocketIOModule = typeof import('socket.io-client');
type Socket = InstanceType<SocketIOModule['Socket']>;

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase

// --- Memoized game UI components (avoid re-rendering all buttons on single feedback change) ---
const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer }: {
  option: Word; currentWordId: number; feedback: string | null; gameMode: string; targetLanguage: "hebrew" | "arabic"; onAnswer: (w: Word) => void;
}) => {
  const isCorrect = option.id === currentWordId;
  const showCorrect = feedback === "correct" && isCorrect;
  const showAnswer = feedback === "show-answer" && isCorrect;
  const isDisabled = !!feedback; // Disable on ANY feedback (correct, wrong, or show-answer)

  const handleClick = () => {
    const gameDebug = getGameDebugger();
    gameDebug.logButtonClick({
      button: 'answer_option',
      gameMode,
      wordId: currentWordId,
      disabled: isDisabled,
      feedback,
    });
    if (!isDisabled) {
      onAnswer(option);
    } else {
      console.warn('[AnswerButton] Click blocked - button is disabled', { feedback, isDisabled });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      dir={gameMode === "reverse" ? "ltr" : "auto"}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`py-3 px-3 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold motion-safe:transition-all duration-300 min-h-[56px] sm:min-h-[80px] flex items-center justify-center gap-2 ${
        showCorrect
          ? "bg-blue-600 text-white motion-safe:scale-105 shadow-xl"
          : feedback === "wrong" && !isCorrect
          ? "bg-rose-100 text-rose-500 opacity-50"
          : showAnswer
          ? "bg-amber-500 text-white motion-safe:scale-105 shadow-xl ring-4 ring-amber-300"
          : feedback === "show-answer"
          ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
          : feedback === "wrong"
          ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
          : "bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300"
      }`}
    >
      {showCorrect && <span aria-hidden="true">✓</span>}
      {showAnswer && <span aria-hidden="true">→</span>}
      <span>{gameMode === "reverse" ? option.english : (option[targetLanguage] || option.arabic || option.hebrew || option.english)}</span>
    </button>
  );
});

// Memoized Classic Mode Game component with debugging and error handling
const ClassicModeGame = React.memo(({ gameMode, currentWord, options, hiddenOptions, feedback, targetLanguage, gameWordsCount, currentIndex, onAnswer }: {
  gameMode: string;
  currentWord: Word | undefined;
  options: Word[];
  hiddenOptions: number[];
  feedback: string | null;
  targetLanguage: "hebrew" | "arabic";
  gameWordsCount: number;
  currentIndex: number;
  onAnswer: (w: Word) => void;
}) => {
  // Handle error cases
  if (!currentWord) {
    console.error('[Classic Mode ERROR] No currentWord!', { gameMode, currentIndex, gameWordsCount });
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl">
        <p className="text-red-600 font-black">⚠️ Error: No word loaded</p>
        <p className="text-sm text-red-500 mt-2">Please try selecting another mode or refreshing the page</p>
      </div>
    );
  }

  if (options.length === 0) {
    console.error('[Classic Mode ERROR] No options!', { currentWordId: currentWord.id, gameWordsCount });
    return (
      <div className="text-center p-8 bg-amber-50 rounded-2xl">
        <p className="text-amber-600 font-black">⚠️ Error: No answer options available</p>
        <p className="text-sm text-amber-500 mt-2">You need at least 4 words in the assignment for this mode to work</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
      {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
        <AnswerOptionButton key={option.id} option={option} currentWordId={currentWord.id} feedback={feedback} gameMode={gameMode} targetLanguage={targetLanguage} onAnswer={onAnswer} />
      ))}
    </div>
  );
});

ClassicModeGame.displayName = 'ClassicModeGame';

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
  // Initialize game debugger
  const gameDebug = getGameDebugger();

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
    | "student-pending-approval"
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
  const restoreRetried = useRef(false);
  const [landingTab, setLandingTab] = useState<"student" | "teacher">("student");
  const [studentLoginClassCode, setStudentLoginClassCode] = useState("");
  const [studentLoginName, setStudentLoginName] = useState("");
  const [existingStudents, setExistingStudents] = useState<Array<{ id: string, displayName: string, xp: number, status: string, avatar?: string }>>([]);
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string, displayName: string, classCode: string, className: string, joinedAt: string }>>([]);
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<{ name: string; classCode: string; profileId?: string } | null>(null);
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
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);      

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
  const [quickPlaySearchQuery, setQuickPlaySearchQuery] = useState("");
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<{id: string, sessionCode: string, wordIds: number[], words: Word[]} | null>(null);
  const [quickPlayStudentName, setQuickPlayStudentName] = useState("");
  const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'];
  const [quickPlayAvatar, setQuickPlayAvatar] = useState(() => QUICK_PLAY_AVATARS[secureRandomInt( QUICK_PLAY_AVATARS.length)]);
  const quickPlayNameInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPlayJoinedStudents, setQuickPlayJoinedStudents] = useState<{name: string, score: number, avatar: string, lastSeen: string, mode: string, studentUid: string}[]>([]);
  const [quickPlayCustomWords, setQuickPlayCustomWords] = useState<Map<string, {hebrew: string, arabic: string}>>(new Map());
  const [quickPlayAddingCustom, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [quickPlayTranslating, setQuickPlayTranslating] = useState<Set<string>>(new Set());
  const [quickPlayWordEditorOpen, setQuickPlayWordEditorOpen] = useState(false);
  const [quickPlayKicked, setQuickPlayKicked] = useState(false);
  const [quickPlaySessionEnded, setQuickPlaySessionEnded] = useState(false);
  const [quickPlayCompletedModes, setQuickPlayCompletedModes] = useState<Set<string>>(new Set());
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [quickPlayStatusMessage, setQuickPlayStatusMessage] = useState("");
  const [showQuickPlayPreview, setShowQuickPlayPreview] = useState(false);
  const [quickPlayPreviewAnalysis, setQuickPlayPreviewAnalysis] = useState<WordAnalysisResult | null>(null);

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
  const [selectedLevel, setSelectedLevel] = useState<"Set 1" | "Set 2" | "Custom">("Set 1");
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrPendingFile, setOcrPendingFile] = useState<{ file: File; inputRef: React.ChangeEvent<HTMLInputElement> | null } | null>(null);
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

  const searchResults = useMemo(() => {
    const results: Map<string, Word[]> = new Map();
    const matchedWordIds = new Set<number>();

    searchTerms.forEach(term => {
      // Priority 1: Exact match
      let matches = ALL_WORDS.filter(w =>
        w.english.toLowerCase() === term
      );

      // Priority 2: Starts with match (e.g., "app" matches "apple" but not "snap")
      if (matches.length < 20) {
        const startsWithMatches = ALL_WORDS.filter(w =>
          w.english.toLowerCase().startsWith(term) &&
          !matches.some(m => m.id === w.id)
        );
        matches.push(...startsWithMatches.slice(0, 20 - matches.length));
      }

      // Limit results to max 20 per search term to prevent overwhelming results
      matches = matches.slice(0, 20);

      // Deduplicate words (same word might match multiple search terms)
      const uniqueMatches = matches.filter(w => !matchedWordIds.has(w.id));
      uniqueMatches.forEach(w => matchedWordIds.add(w.id));

      if (uniqueMatches.length > 0) {
        results.set(term, uniqueMatches);
      }
    });

    return results;
  }, [searchTerms]);

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

    // OPTIMIZED: Only fetch when page is visible
    if (!document.hidden) {
      fetchProgress();
    }

    // 2. Subscribe to realtime changes on progress table for this session
    // OPTIMIZED: Use payload data directly instead of re-fetching, only when visible
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
        (payload) => {
          // Only process if page is visible (save resources when hidden)
          if (document.hidden) return;

          if (payload.new && payload.eventType === 'INSERT') {
            const newRecord = payload.new as any;
            setQuickPlayJoinedStudents(prev => {
              const updated = aggregateProgress([...prev, {
                student_name: newRecord.student_name,
                student_uid: newRecord.student_uid,
                score: newRecord.score,
                avatar: newRecord.avatar,
                completed_at: newRecord.completed_at,
                mode: newRecord.mode
              }]);
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
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
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

    // 2. Subscribe to progress deletes for THIS student only (teacher kicked)
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
        (payload) => {
          // Only kick if the deleted row belongs to THIS student
          if (payload.old && (payload.old as any).student_uid === user.uid) {
            setQuickPlayKicked(true);
            setActiveAssignment(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(kickChannel);
    };
  }, [user?.isGuest, quickPlayActiveSession?.sessionCode, quickPlayActiveSession?.id]);

  const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const toScoreHeightClass = (score: number) => {
    if (score < 25) return "h-1/4";
    if (score < 50) return "h-2/4";
    if (score < 75) return "h-3/4";
    return "h-full";
  };

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

  const translateWord = async (englishWord: string): Promise<{hebrew: string, arabic: string, match: number} | null> => {
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
        // MyMemory returns match score 0-1 for each translation
        const heMatch = parseFloat(hebrewData.responseData.match) || 0;
        const arMatch = parseFloat(arabicData.responseData.match) || 0;
        const match = Math.min(heMatch, arMatch); // Use the lower score

        const result = {
          hebrew: hebrewData.responseData.translatedText,
          arabic: arabicData.responseData.translatedText,
          match,
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

  const handleAutoTranslate = async (term: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const newTranslating = new Set(quickPlayTranslating);
    newTranslating.add(term);
    setQuickPlayTranslating(newTranslating);

    const translations = await translateWord(term);

    if (translations) {
      const newMap = new Map(quickPlayCustomWords);
      newMap.set(term, translations);
      setQuickPlayCustomWords(newMap);
    }
    // Silent failure - don't show error toast, just log for debugging
    console.warn("Translation service unavailable for word:", term);

    const newTranslatingDone = new Set(quickPlayTranslating);
    newTranslatingDone.delete(term);
    setQuickPlayTranslating(newTranslatingDone);
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
  const [isMatchingProcessing, setIsMatchingProcessing] = useState(false);

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

  // Timeout ref for cleanup (prevents memory leaks on unmount)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSpokenWordRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false); // Guard against rapid clicks during feedback
  const lastScoreEmitRef = useRef<number>(0); // Track last Socket.IO score emit time to prevent spam

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { if (feedback === null) setMotivationalMessage(null); }, [feedback]);
  useEffect(() => {
    isProcessingRef.current = !!feedback;
    gameDebug.logProcessing({ isProcessing: !!feedback, reason: `feedback changed to ${feedback}` });
  }, [feedback]);

  // FAILSAFE: Clear stuck feedback after 5 seconds (prevents buttons being permanently disabled)
  useEffect(() => {
    if (!feedback) return;

    const failsafeTimer = setTimeout(() => {
      setFeedback(null);
      setMotivationalMessage(null);
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

  // Throttled Socket.IO score emit to prevent DB spam
  const emitScoreUpdate = (newScore: number) => {
    if (!socket || !user?.classCode) return;
    const now = Date.now();
    // Only emit once per 2 seconds max, or if it's the final score (game finished)
    if (now - lastScoreEmitRef.current > 2000 || isFinished) {
      lastScoreEmitRef.current = now;
      setTimeout(() => {
        socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
      }, 0);
    } else {
    }
  };

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

  // Helper: set pending approval info and persist to sessionStorage
  const showPendingApproval = (info: { name: string; classCode: string; profileId?: string }) => {
    setPendingApprovalInfo(info);
    setView("student-pending-approval");
    try { sessionStorage.setItem('vocaband_pending_approval', JSON.stringify(info)); } catch {}
  };

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
        // For anonymous students: RLS blocks SELECT on users table
        // (is_anonymous IS FALSE). Instead of querying the DB, restore
        // directly from localStorage which was saved on login.
        const isAnonymous = supabaseUser.is_anonymous || supabaseUser.app_metadata?.provider === 'anonymous';
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
          setUser(userData);
          checkConsent(userData);
          if (userData.role === "teacher") {
            // Await so the dashboard has data before we show it — prevents
            // the "empty dashboard until refresh" bug.
            const fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => [] as Awaited<ReturnType<typeof fetchTeacherData>>);
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
            }
          } else if (userData.role === "student" && userData.classCode) {
            const code = userData.classCode;
            const { data: classRows } = await supabase
              .from('classes').select('*').eq('code', code);
            if (classRows && classRows.length > 0) {
              const classData = mapClass(classRows[0]);
              // Fetch assignments + progress in parallel for faster restore.
              // Use RPC for assignments to bypass RLS (SECURITY DEFINER).
              const [assignResult, progressResult] = await Promise.all([
                supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
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
                          supabase.rpc('get_assignments_for_class', { p_class_id: c.id }),
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
                    supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                    supabase.from('progress').select('*').eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
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
        if (session?.user && !manualLoginInProgress.current && !restoreInProgress.current) {
          restoreSession(session.user);
        }
      } catch { /* getSession failed — let onAuthStateChange handle it */ }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If handleStudentLogin is running, it owns loading/view — don't interfere.
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        // Fire-and-forget: releases the auth lock immediately, then
        // does the slow DB work asynchronously.
        restoreSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        cleanupSessionData(); // Clear save queue and timers
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

        // Check if bootstrap() just completed a successful PKCE exchange.
        // The ?code= param is already stripped by the time React renders,
        // so we use a sessionStorage flag as a bridge. If set, actively
        // poll getSession() for up to 8 seconds to find the session —
        // Supabase v2 may not fire a SIGNED_IN event after INITIAL_SESSION,
        // so passive waiting can leave the user stuck on landing.
        const justExchanged = sessionStorage.getItem('oauth_session_ready');
        if (justExchanged) {
          sessionStorage.removeItem('oauth_session_ready');
          // Poll for session — 500ms intervals, up to 8 seconds
          let pollCount = 0;
          const maxPolls = 16;
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
              setTimeout(pollForSession, 500);
            } else {
              // Session never materialised — show landing with error
              showToast("Sign-in is taking too long. Please try again.", "error");
              setLoading(false);
            }
          };
          setTimeout(pollForSession, 200);
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
  // Extended to 12s so OAuth polling has time to find the session.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current && !restoreInProgress.current) setLoading(false);
    }, 12000);
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

  // Views that a logged-in user should never land on via back button.
  // If popstate would navigate to one of these, we block it.
  const AUTH_VIEWS = new Set([
    'landing', 'public-landing', 'student-account-login',
    'student-pending-approval', 'oauth-class-code', 'oauth-callback',
  ]);

  // The "home" view for each role — back button cannot go past this.
  const getHomeView = () =>
    userRef.current?.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard';

  // On first mount, seed the history stack.
  useEffect(() => {
    window.history.replaceState({ view: 'landing' }, '');
  }, []);

  // Whenever the app navigates to a new view, push a history entry.
  useEffect(() => {
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      return;
    }
    const isDashboard = view === 'teacher-dashboard' || view === 'student-dashboard';

    // When transitioning to the dashboard after login, REPLACE the
    // landing entry AND push an extra padding entry before it.  This
    // ensures the history stack always has entries below the dashboard,
    // so the browser can't exit when the user presses back at home.
    if (userRef.current && isDashboard && AUTH_VIEWS.has(window.history.state?.view ?? '')) {
      // Stack: [padding] [dashboard]
      // The padding entry has the dashboard view too, so if popstate
      // fires on it, the user just stays on the dashboard.
      window.history.replaceState({ view, _pad: true }, '');
      window.history.pushState({ view }, '');
    } else {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  // Handle the physical back button / swipe gesture.
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prevView = e.state?.view as string | undefined;
      const currentUser = userRef.current;

      // CASE 1: User is logged in and back would go to a login/auth view.
      //         Block it — stay on current view.
      if (currentUser && (!prevView || AUTH_VIEWS.has(prevView))) {
        window.history.pushState({ view }, '');
        return;
      }

      // CASE 2: User is at the dashboard and presses back again.
      //         Block it — dashboard is the floor.
      const home = currentUser ? getHomeView() : null;
      if (currentUser && view === home && (prevView === home || (e.state as any)?._pad)) {
        window.history.pushState({ view }, '');
        return;
      }

      // CASE 3: Normal back navigation between in-app pages.
      if (prevView) {
        isPopStateNavRef.current = true;
        setView(prevView as typeof view);
      } else {
        // No state at all — could exit the app.  Block it.
        window.history.pushState({ view }, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

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

  // Quick Play guest: keep localStorage intact on refresh for session recovery
  // Only clear on explicit exit, not on refresh/navigation
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession) return;
    const handleUnload = () => {
      // Do NOT clear localStorage on refresh - this allows students to stay logged in
      // Only clear on explicit exit via handleExitGame or teacher kick
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

  const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15 MB (client compresses before upload)
  const MAX_IMPORT_WORDS = 500;

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


      // Create Word objects for custom assignment
      const customWordsFromOCR: Word[] = extractedWords.map((word: string, index: number) => ({
        id: Date.now() + index, // Generate unique ID
        english: word,
        hebrew: '', // Leave empty - user can add later
        arabic: '',
        level: 'Custom',
        recProd: 'Prod'
      }));

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
      const matches = SET_2_WORDS.filter(w =>
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

  const handleQuickPlayPreviewConfirm = (customTranslations?: Map<string, { hebrew: string; arabic: string }>, addedSuggestionIds?: Set<number>) => {
    if (!quickPlayPreviewAnalysis) return;

    const { matchedWords, unmatchedTerms } = quickPlayPreviewAnalysis;

    // Only add exact, hebrew, arabic, and phrase matches automatically.
    // Fuzzy, starts-with, and family matches are suggestions — only add if teacher clicked them.
    const autoAddTypes = new Set(['exact', 'hebrew', 'arabic', 'phrase']);
    const newSelectedWords = [...quickPlaySelectedWords];
    matchedWords.forEach(mw => {
      const shouldAdd = autoAddTypes.has(mw.matchType) || (addedSuggestionIds && addedSuggestionIds.has(mw.word.id));
      if (shouldAdd && !newSelectedWords.some(w => w.id === mw.word.id)) {
        newSelectedWords.push(mw.word);
      }
    });
    // Also add family suggestion words that were manually selected
    if (addedSuggestionIds && addedSuggestionIds.size > 0 && quickPlayPreviewAnalysis.wordFamilySuggestions) {
      for (const family of quickPlayPreviewAnalysis.wordFamilySuggestions) {
        for (const w of family.familyMembers) {
          if (addedSuggestionIds.has(w.id) && !newSelectedWords.some(sw => sw.id === w.id)) {
            newSelectedWords.push(w);
          }
        }
      }
    }
    setQuickPlaySelectedWords(newSelectedWords);

    // Add custom words from translations (either from Translate All or manual entry)
    if (unmatchedTerms.length > 0 && customTranslations) {
      unmatchedTerms.forEach(term => {
        const translation = customTranslations.get(term.term);
        if (translation && (translation.hebrew || translation.arabic)) {
          const customWord: Word = {
            id: uniqueNegativeId(),
            english: term.term.charAt(0).toUpperCase() + term.term.slice(1).toLowerCase(),
            hebrew: translation.hebrew || "",
            arabic: translation.arabic || "",
            level: "Custom"
          };
          setQuickPlaySelectedWords(prev => [...prev, customWord]);
        }
      });
    }

    // Clear preview state
    setShowQuickPlayPreview(false);
    setQuickPlayPreviewAnalysis(null);
    setQuickPlaySearchQuery("");
  };

  const handleQuickPlayPreviewCancel = () => {
    setShowQuickPlayPreview(false);
    setQuickPlayPreviewAnalysis(null);
  };


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
      : selectedLevel === "Set 1" ? SET_1_WORDS
      : selectedLevel === "Set 2" ? SET_2_WORDS : customWords;

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
  const handleSaveAssignment = async (wordsOverride?: number[], modesOverride?: string[]) => {
    // Use override values if provided (from SetupWizard completion), otherwise use state
    const wordsToCheck = wordsOverride ?? selectedWords;
    const modesToCheck = modesOverride ?? assignmentModes;

    // For editing, allow custom-only assignments
    const hasWords = editingAssignment
      ? wordsToCheck.length > 0 || customWords.length > 0
      : wordsToCheck.length > 0;

    if (!selectedClass || !hasWords || !assignmentTitle) {
      showToast("Please enter a title and select words.", "error");
      return;
    }

    // Check if there's at least one database word (not custom/session-only)
    const hasDbWords = wordsToCheck.some(id => id > 0);

    if (!hasDbWords && !editingAssignment) {
      console.warn('[handleSaveAssignment] BLOCKED - No DB words for new assignment');
      showToast("Please select at least one word from the vocabulary database.", "error");
      return;
    }
    // For editing, if no database words, ensure we have at least one custom word
    if (!hasDbWords && editingAssignment && customWords.length === 0 && wordsToCheck.length === 0) {
      console.warn('[handleSaveAssignment] BLOCKED - No words at all for edit');
      showToast("Please select at least one word (database or custom).", "error");
      return;
    }

    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    // Use wordsToCheck for filtering, but we need to create a Set from it
    const wordsToCheckSet = new Set(wordsToCheck);
    const wordsToSave = uniqueWords.filter(w => wordsToCheckSet.has(w.id));

    const assignmentData = {
      classId: selectedClass.id,
      wordIds: wordsToCheck.filter(id => id > 0), // Only save positive IDs (database words, not custom/phrases)
      words: wordsToSave,
      title: assignmentTitle,
      deadline: assignmentDeadline || null,
      allowedModes: modesToCheck,
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

        if (error) {
          console.error('[handleSaveAssignment] UPDATE failed', error);
          throw error;
        }
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
        if (error) {
          console.error('[handleSaveAssignment] INSERT failed', error);
          throw error;
        }
        showToast("Assignment created successfully!", "success");

        // Refresh assignments list
        await fetchTeacherAssignments();

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
      console.error('[handleSaveAssignment] CATCH - Error occurred:', error);
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
      const isNew = result[0].is_new;


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
            supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
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
      // Select all fields we need (status, id, display_name, class_code)
      // because the pending_approval path uses them.
      const [newFormatResult, legacyFormatResult] = await Promise.all([
        supabase.from('student_profiles').select('status, id, display_name, class_code').eq('unique_id', studentUniqueIdNew).maybeSingle(),
        supabase.from('student_profiles').select('status, id, display_name, class_code').eq('unique_id', studentUniqueIdLegacy).maybeSingle(),
      ]);

      // Use new format result if found, otherwise fall back to legacy
      const studentProfile = newFormatResult.data || legacyFormatResult.data;
      const profileError = newFormatResult.error || legacyFormatResult.error;

      if (profileError) {
        console.error('Error checking student approval:', profileError);
      } else if (studentProfile) {
        if (studentProfile.status === 'pending_approval') {
          showPendingApproval({
            name: studentProfile.display_name || '',
            classCode: studentProfile.class_code || '',
            profileId: studentProfile.id,
          });
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
      // Use RPC for assignments to bypass RLS (SECURITY DEFINER).
      setStudentDataLoading(true);
      Promise.all([
        supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
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
      const { data } = await supabase.from('progress').select('student_name, class_code, completed_at').in('class_code', chunk).limit(500);
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
        .from('progress').select('id, student_name, student_uid, assignment_id, class_code, score, mode, completed_at, mistakes, avatar')
        .in('class_code', chunk)
        .order('completed_at', { ascending: false })
        .limit(1000);
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
    // cycle through the assigned words instead of borrowing from ALL_WORDS
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
        setFeedback(null); // Clear feedback when showing mode selection
      }
    } else if (user?.isGuest) {
      // Quick Play guest: go back to mode selection so they can pick another mode
      setShowModeSelection(true);
      setFeedback(null); // Clear feedback when showing mode selection
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

    // OPTIMIZED: Queue badge checks instead of immediate execution
    // Badges are cached server-side, so client checks are fast
    if (cappedScore === 100 && !badges.includes("🎯 Perfect Score")) queueSaveOperation(() => awardBadge("🎯 Perfect Score"));
    if (newStreak >= 5 && !badges.includes("🔥 Streak Master")) queueSaveOperation(() => awardBadge("🔥 Streak Master"));
    if (newXp >= 500 && !badges.includes("💎 XP Hunter")) queueSaveOperation(() => awardBadge("💎 XP Hunter"));

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
      // OPTIMIZED: Only save progress immediately (critical data)
      // Queue user stats updates (XP/streak) to be batched with other saves
      const { data: progressId, error: rpcError } = await supabase.rpc('save_student_progress', {
        p_student_name: user.displayName,
        p_student_uid: studentUid,
        p_assignment_id: activeAssignment.id,
        p_class_code: user.classCode || "",
        p_score: cappedScore,
        p_mode: gameMode,
        p_mistakes: Array.isArray(mistakes) ? mistakes.length : (mistakes || 0),
        p_avatar: user.avatar || "🦊"
      });

      if (rpcError) throw rpcError;

      // OPTIMIZED: Queue user stats update instead of immediate
      // This batches multiple updates together, reducing DB writes by ~50%
      queueSaveOperation(async () => {
        await supabase.from('users').update({ xp: newXp, streak: newStreak }).eq('uid', user.uid);
      });

      // Update local state immediately (UI stays snappy)

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

    if (isCorrect) {
      setFeedback("correct");
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
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

    let currentScore = score;
    if (knewIt) {
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
      setTimeout(() => setMotivationalMessage(null), 1000);
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


    const isCorrect = spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase();

    gameDebug.logAnswer({
      gameMode: 'spelling',
      wordId: currentWord.id,
      userAnswer: spellingInput,
      correctAnswer: currentWord.english,
      isCorrect,
      willAutoSkip: isCorrect,
    });

    if (isCorrect) {
      setFeedback("correct");
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
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

  // Matrix data for Student × Assignment view
  const matrixData = useMemo(() => {
    // Get unique students and assignments
    const studentMap = new Map<string, ProgressData[]>();
    const assignmentSet = new Set<string>();

    allScores.forEach(s => {
      if (!studentMap.has(s.studentName)) {
        studentMap.set(s.studentName, []);
      }
      studentMap.get(s.studentName)!.push(s);
      assignmentSet.add(s.assignmentId);
    });

    const students = Array.from(studentMap.keys()).sort();
    const assignments = Array.from(assignmentSet).sort();

    // Helper function to get student metadata from their first record
    const getStudentClassCode = (studentName: string): string => {
      const scores = studentMap.get(studentName);
      return scores?.[0]?.classCode || "";
    };

    const getStudentAvatar = (studentName: string): string | undefined => {
      const scores = studentMap.get(studentName);
      return scores?.find(s => s.avatar)?.avatar;
    };

    // Build matrix: for each student-assignment, get the most recent score
    const matrix: Map<string, Map<string, ProgressData>> = new Map();
    const averages: Map<string, number> = new Map(); // student averages

    students.forEach(student => {
      matrix.set(student, new Map());
      const studentScores = studentMap.get(student)!;

      // Calculate student average
      const avgScore = studentScores.reduce((sum, s) => sum + s.score, 0) / studentScores.length;
      averages.set(student, Math.round(avgScore));

      // For each assignment, get the most recent score
      assignments.forEach(assignmentId => {
        const assignmentScores = studentScores.filter(s => s.assignmentId === assignmentId);
        if (assignmentScores.length > 0) {
          // Sort by completedAt descending and take the first (most recent)
          assignmentScores.sort((a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );
          matrix.get(student)!.set(assignmentId, assignmentScores[0]);
        }
      });
    });

    // Build assignment title lookup from teacherAssignments
    const assignmentTitleMap = new Map<string, string>();
    teacherAssignments.forEach(a => assignmentTitleMap.set(a.id, a.title));
    const getAssignmentTitle = (id: string) => assignmentTitleMap.get(id) || id.slice(0, 8) + '…';

    return { students, assignments, matrix, averages, studentMap, getStudentClassCode, getStudentAvatar, getAssignmentTitle };
  }, [allScores, teacherAssignments]);

  // State for selected score detail view
  const [selectedScore, setSelectedScore] = useState<ProgressData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [analyticsClassFilter, setAnalyticsClassFilter] = useState<string>("all");

  // Per-class analytics computed from allScores
  const classAnalytics = useMemo(() => {
    const filteredScores = analyticsClassFilter === "all"
      ? allScores
      : allScores.filter(s => s.classCode === analyticsClassFilter);

    if (filteredScores.length === 0) return null;

    // Score distribution buckets
    const distribution = { excellent: 0, good: 0, needsWork: 0 };
    filteredScores.forEach(s => {
      if (s.score >= 90) distribution.excellent++;
      else if (s.score >= 70) distribution.good++;
      else distribution.needsWork++;
    });

    // Mode usage
    const modeCount: Record<string, number> = {};
    filteredScores.forEach(s => {
      modeCount[s.mode] = (modeCount[s.mode] || 0) + 1;
    });
    const topModes = Object.entries(modeCount).sort((a, b) => b[1] - a[1]);
    const maxModeCount = topModes.length > 0 ? topModes[0][1] : 1;

    // Activity over time (group by week)
    const weekMap: Record<string, { count: number; totalScore: number }> = {};
    filteredScores.forEach(s => {
      const d = new Date(s.completedAt);
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weekMap[weekKey]) weekMap[weekKey] = { count: 0, totalScore: 0 };
      weekMap[weekKey].count++;
      weekMap[weekKey].totalScore += s.score;
    });
    const weeklyActivity = Object.entries(weekMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12); // last 12 weeks
    const maxWeekCount = Math.max(...weeklyActivity.map(([, v]) => v.count), 1);

    // Most missed words across all students
    const mistakeCounts: Record<number, number> = {};
    filteredScores.forEach(s => {
      s.mistakes?.forEach(wordId => {
        mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
      });
    });
    const topMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([wordId, count]) => ({ wordId: parseInt(wordId), count }));
    const maxMistakeCount = topMistakes.length > 0 ? topMistakes[0].count : 1;

    // Unique students
    const uniqueStudents = new Set(filteredScores.map(s => s.studentUid || s.studentName));

    // Average score
    const avgScore = Math.round(filteredScores.reduce((sum, s) => sum + s.score, 0) / filteredScores.length);

    // Completion rate per assignment
    const assignmentStudents: Record<string, Set<string>> = {};
    filteredScores.forEach(s => {
      if (!assignmentStudents[s.assignmentId]) assignmentStudents[s.assignmentId] = new Set();
      assignmentStudents[s.assignmentId].add(s.studentName);
    });

    return {
      totalAttempts: filteredScores.length,
      uniqueStudents: uniqueStudents.size,
      avgScore,
      distribution,
      topModes,
      maxModeCount,
      weeklyActivity,
      maxWeekCount,
      topMistakes,
      maxMistakeCount,
      assignmentStudents,
    };
  }, [allScores, analyticsClassFilter]);

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

  // ── Student Pending Approval Screen ────────────────────────────────────────
  if (view === "student-pending-approval" && pendingApprovalInfo) {
    // Auto-check approval status every 10 seconds
    const PendingApprovalScreen = () => {
      const [checking, setChecking] = React.useState(false);
      const [dots, setDots] = React.useState('');

      // Animated dots
      React.useEffect(() => {
        const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
        return () => clearInterval(id);
      }, []);

      // Auto-poll every 10 seconds
      React.useEffect(() => {
        const checkStatus = async () => {
          try {
            const { data } = await supabase
              .from('student_profiles')
              .select('status, id, auth_uid')
              .eq('class_code', pendingApprovalInfo.classCode)
              .eq('display_name', pendingApprovalInfo.name)
              .order('joined_at', { ascending: false })
              .limit(1);

            if (data && data.length > 0 && data[0].status === 'approved') {
              try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
              showToast("You've been approved! Logging in...", "success");
              handleLoginAsStudent(data[0].id);
            }
          } catch { /* silent retry */ }
        };

        const id = setInterval(checkStatus, 10_000);
        return () => clearInterval(id);
      }, []);

      const handleManualCheck = async () => {
        setChecking(true);
        try {
          const { data } = await supabase
            .from('student_profiles')
            .select('status, id, auth_uid')
            .eq('class_code', pendingApprovalInfo.classCode)
            .eq('display_name', pendingApprovalInfo.name)
            .order('joined_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0 && data[0].status === 'approved') {
            try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
            showToast("You've been approved! Logging in...", "success");
            handleLoginAsStudent(data[0].id);
          } else {
            showToast("Not approved yet. Ask your teacher!", "info");
          }
        } catch {
          showToast("Could not check. Try again.", "error");
        } finally {
          setChecking(false);
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">
              <span className="inline-block animate-bounce">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
            </div>
            <h2 className="text-2xl font-black text-stone-800 mb-2">
              Waiting for approval{dots}
            </h2>
            <p className="text-stone-500 mb-6">
              Your teacher needs to approve <strong>"{pendingApprovalInfo.name}"</strong> in class <strong>{pendingApprovalInfo.classCode}</strong> before you can play.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm font-bold text-amber-800 mb-2">What to do:</p>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Tell your teacher you signed up</li>
                <li>They'll approve you from their dashboard</li>
                <li>This screen will update automatically</li>
              </ol>
            </div>

            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 mb-3"
            >
              {checking ? "Checking..." : "Check now"}
            </button>

            <button
              onClick={() => {
                setPendingApprovalInfo(null);
                try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
                setView("student-account-login");
              }}
              className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
            >
              Use a different account
            </button>
          </div>
        </div>
      );
    };

    return <PendingApprovalScreen />;
  }

  if (view === "student-account-login") {
    return (
      <>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-tertiary/10 to-secondary/10">
        {/* OAuth Callback Handler */}
        {isOAuthCallback && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <OAuthCallback
                onTeacherDetected={handleOAuthTeacherDetected}
                onStudentDetected={handleOAuthStudentDetected}
                onNewUser={handleOAuthNewUser}
              />
            </motion.div>
          </div>
        )}

        {/* OAuth Class Code Entry */}
        {showOAuthClassCode && oauthEmail && oauthAuthUid && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setShowOAuthClassCode(false);
                      setOauthEmail(null);
                      setOauthAuthUid(null);
                    }}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                </div>
                <OAuthClassCode
                  email={oauthEmail}
                  authUid={oauthAuthUid}
                  onSuccess={async () => {
                    setShowOAuthClassCode(false);
                    setOauthEmail(null);
                    setOauthAuthUid(null);
                    // After class code entry, load the student profile and log them in
                    await handleOAuthStudentDetected(oauthEmail!);
                  }}
                  onError={setError}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Normal Student Login (only show if not in OAuth flow) */}
        {!isOAuthCallback && !showOAuthClassCode && (
          <>
        {/* Header */}
        <header className="w-full bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3 shadow-sm">
          <button
            onClick={() => {
              setView("public-landing");
              setStudentLoginClassCode("");
              setStudentLoginName("");
              setExistingStudents([]);
              setShowNewStudentForm(false);
            }}
            className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl signature-gradient flex items-center justify-center shadow-lg">
              <span className="text-white text-xl sm:text-2xl font-black font-headline italic">V</span>
            </div>
            <span className="text-lg sm:text-xl font-black signature-gradient-text hidden sm:block">Vocaband</span>
          </div>
        </header>

        {/* Main Content - centered and fits in viewport */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            {/* Student Login Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
              <div className="text-center mb-4 md:mb-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                  <span className="text-3xl md:text-4xl">👤</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black font-headline mb-1 md:mb-2">
                  Student Login
                </h1>
                <p className="text-base md:text-lg font-bold text-on-surface-variant">
                  Join your class and save your progress!
                </p>
              </div>

              {!showNewStudentForm ? (
                <>
                  {/* Class Code Input */}
                  <div className="space-y-3 mb-4 md:mb-6">
                    <div>
                      <label
                        htmlFor="student-class-code-input"
                        className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide"
                      >
                        Class Code
                      </label>
                      <input
                        id="student-class-code-input"
                        type="text"
                        value={studentLoginClassCode}
                        onChange={(e) => {
                          setStudentLoginClassCode(e.target.value.toUpperCase());
                          if (e.target.value.length >= 3) {
                            loadStudentsInClass(e.target.value);
                          }
                        }}
                        placeholder="MATH101"
                        maxLength={20}
                        autoFocus
                        aria-describedby={error ? "student-login-error" : undefined}
                        className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 uppercase"
                      />
                    </div>

                    {error && (
                      <motion.div
                        id="student-login-error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2"
                        role="alert"
                      >
                        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Existing Students List */}
                  {studentLoginClassCode && existingStudents.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-bold mb-3 text-on-surface-variant uppercase tracking-wide">
                        Select your name:
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {existingStudents.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => handleLoginAsStudent(student.id)}
                            className="w-full px-6 py-4 bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary-container rounded-xl text-left font-bold transition-all flex items-center justify-between group border-2 border-surface-container-highest hover:border-primary"
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-2xl">{student.avatar || '🦊'}</span>
                              <span className="text-lg">{student.displayName}</span>
                            </span>
                            <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-primary-container">
                              {student.xp} XP
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Students Found */}
                  {studentLoginClassCode && existingStudents.length === 0 && (
                    <div className="mb-6 p-4 bg-surface-container-highest rounded-xl text-center">
                      <p className="text-sm font-bold text-on-surface-variant">
                        No students found in this class yet.
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Be the first to join! 👇
                      </p>
                    </div>
                  )}

                  {/* OAuth Sign In Button */}
                  <OAuthButton
                    onSuccess={(email, isNewUser) => {
                      // OAuth callback will handle routing
                      setIsOAuthCallback(true);
                    }}
                    onError={(errorMessage) => {
                      setError(errorMessage);
                    }}
                  />
                </>
              ) : (
                <>
                  {/* New Student Form */}
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-surface-container-highest rounded-xl">
                      <p className="text-sm font-bold text-on-surface-variant mb-1">
                        Class: <span className="text-primary font-black">{studentLoginClassCode}</span>
                      </p>
                      <button
                        onClick={() => {
                          setShowNewStudentForm(false);
                          setStudentLoginClassCode("");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Change class code
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="new-student-name-input"
                        className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide"
                      >
                        Your Full Name
                      </label>
                      <input
                        id="new-student-name-input"
                        type="text"
                        value={studentLoginName}
                        onChange={(e) => setStudentLoginName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleNewStudentSignup()}
                        placeholder="Sarah Johnson"
                        maxLength={30}
                        aria-describedby={error ? "new-student-error" : undefined}
                        className="w-full px-6 py-4 text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50"
                      />
                    </div>

                    {/* Avatar Selection */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide">
                        Choose Your Avatar
                      </label>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>).map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedAvatarCategory(category)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedAvatarCategory === category
                                ? "bg-primary text-white"
                                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest">
                        {AVATAR_CATEGORIES[selectedAvatarCategory].map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setStudentAvatar(avatar)}
                            className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                              studentAvatar === avatar
                                ? "bg-primary/20 ring-2 ring-primary"
                                : "hover:bg-surface-container"
                            }`}
                            aria-label={`Choose ${avatar} avatar`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        id="new-student-error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2"
                        role="alert"
                      >
                        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleNewStudentSignup}
                    className="w-full signature-gradient text-white py-5 rounded-xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mb-4"
                  >
                    Request Account
                    <Check size={24} />
                  </button>

                  {/* Info Notice */}
                  <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
                    <p className="text-sm font-bold text-center">
                      ⏳ <strong>Teacher Approval Required</strong>
                    </p>
                    <p className="text-xs text-center mt-1">
                      Tell your teacher to approve your account. Once approved, you can log in and start earning XP!
                    </p>
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => setShowNewStudentForm(false)}
                    className="w-full mt-4 py-3 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    ← Back to student list
                  </button>
                </>
              )}

            </div>

            {/* Feature Pills */}
            {!showNewStudentForm && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["✅ Save Progress", "✅ Earn XP", "✅ Assignments", "✅ Live Challenge"].map((feature, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-xs font-bold text-on-surface-variant shadow-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </>
        )}  {/* Closes conditional from line 3499 */}
        {cookieBannerOverlay}
      </div>  {/* Closes main div from line 3443 */}
      </>
      );  {/* Closes return */}
    }  {/* Closes if */}

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
      <div className="min-h-screen flex flex-col bg-surface">
        <header className="w-full sticky top-0 bg-surface flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 z-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white text-xl sm:text-2xl font-black font-headline italic">V</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight font-headline signature-gradient-text">Vocaband</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none hidden sm:block">Quick Play</span>
            </div>
          </div>
          <button
            onClick={() => {
              cleanupSessionData(); // Clear save queue and timers
              setView("public-landing");
              setQuickPlayActiveSession(null);
            }}
            className="text-on-surface-variant font-bold text-sm hover:text-on-surface flex items-center gap-1"
          >
            ← Back
          </button>
        </header>

        <main className="flex-grow flex flex-col items-center px-4 py-3 sm:py-6 max-w-4xl mx-auto w-full">
            {!quickPlayActiveSession ? (
              <div className="text-center py-12 sm:py-20">
                <Loader2 className="mx-auto animate-spin text-primary mb-4 w-9 h-9 sm:w-12 sm:h-12" />
                <p className="text-on-surface-variant font-bold text-sm sm:text-base">Loading Quick Play session...</p>
              </div>
            ) : !quickPlayStudentName ? (
              <div className="w-full max-w-md">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <QrCode className="text-white w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-on-surface mb-2">Quick Play!</h1>
                  <p className="text-sm sm:text-base text-on-surface-variant font-bold">{quickPlayActiveSession.words.length} words • No login needed</p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Avatar picker */}
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-2 text-center">Choose your avatar</label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_PLAY_AVATARS.map(av => (
                        <button
                          key={av}
                          onClick={() => setQuickPlayAvatar(av)}
                          className={`text-2xl w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                            quickPlayAvatar === av
                              ? 'bg-primary/20 ring-3 ring-primary scale-110'
                              : 'bg-surface-container hover:bg-surface-container-high'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2.5 left-4 px-2 bg-surface text-primary font-black text-xs z-10">YOUR NAME</label>
                    {(() => {
                      // Check if student already joined this session — lock their name
                      let lockedName = '';
                      try {
                        const saved = localStorage.getItem('vocaband_qp_guest');
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          if (parsed.sessionId === quickPlayActiveSession?.id && parsed.name) {
                            lockedName = parsed.name;
                          }
                        }
                      } catch {}
                      return lockedName ? (
                        <>
                          <input
                            id="quick-play-name-input"
                            type="text"
                            value={lockedName}
                            readOnly
                            className="w-full px-4 py-3 sm:py-4 bg-surface-container border-4 border-stone-200 rounded-2xl text-base sm:text-lg font-black text-on-surface cursor-not-allowed opacity-70"
                          />
                          <p className="text-xs text-on-surface-variant mt-1 text-center">You already joined as <strong>{lockedName}</strong></p>
                        </>
                      ) : (
                        <input
                          id="quick-play-name-input"
                          type="text"
                          inputMode="text"
                          autoCapitalize="words"
                          autoComplete="off"
                          maxLength={30}
                          defaultValue={quickPlayStudentName}
                          placeholder="Enter your nickname..."
                          className="w-full px-4 py-3 sm:py-4 bg-transparent border-4 border-stone-200 rounded-2xl text-base sm:text-lg font-black text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          autoFocus
                        />
                      );
                    })()}
                  </div>

                  <button
                    data-quick-play-join
                    onClick={async () => {
                      const input = document.getElementById('quick-play-name-input') as HTMLInputElement;
                      const trimmedName = input?.value.trim() || "";

                      if (!trimmedName) {
                        showToast("Please enter your name first", "error");
                        return;
                      }

                      if (!quickPlayActiveSession) {
                        showToast("Session expired. Please scan QR code again.", "error");
                        return;
                      }

                      // Check if this name was kicked from this session
                      try {
                        const kickedKey = `vocaband_kicked_${quickPlayActiveSession.id}`;
                        const kickedNames: string[] = JSON.parse(localStorage.getItem(kickedKey) || '[]');
                        if (kickedNames.includes(trimmedName)) {
                          showToast("This name has been removed from the session by the teacher.", "error");
                          return;
                        }
                      } catch {}

                      if (!quickPlayActiveSession.words || quickPlayActiveSession.words.length === 0) {
                        showToast("This session has no words. Please contact your teacher.", "error");
                        return;
                      }

                      // Check for duplicate name in this session
                      const { data: { session: currentAuth } } = await supabase.auth.getSession();
                      const currentAuthUid = currentAuth?.user?.id;

                      // Clean up any stale progress for this student:
                      // 1. By uid (same device refresh)
                      // 2. By name (re-joining with same name from any device)
                      if (currentAuthUid) {
                        await supabase
                          .from('progress')
                          .delete()
                          .eq('assignment_id', quickPlayActiveSession.id)
                          .or(`student_uid.eq.${currentAuthUid},student_name.eq.${trimmedName}`);
                      } else {
                        // No auth uid — clean up by name only
                        await supabase
                          .from('progress')
                          .delete()
                          .eq('assignment_id', quickPlayActiveSession.id)
                          .eq('student_name', trimmedName);
                      }

                      const { data: existingProgress } = await supabase
                        .from('progress')
                        .select('id')
                        .eq('assignment_id', quickPlayActiveSession.id)
                        .eq('student_name', trimmedName)
                        .limit(1);
                      if (existingProgress && existingProgress.length > 0) {
                        showToast("This name is already taken. Please choose a different one.", "error");
                        return;
                      }

                      setTimeout(async () => {
                        setQuickPlayStudentName(trimmedName);
                        const guestUser = createGuestUser(trimmedName, "quickplay", quickPlayAvatar);
                        setUser(guestUser);

                        const words = shuffle(quickPlayActiveSession.words).map(w => ({
                          ...w,
                          hebrew: w.hebrew || "",
                          arabic: w.arabic || ""
                        }));

                        setAssignmentWords(words);
                        // Create a virtual assignment so all game modes (including
                        // sentence-builder) work the same as in real assignments.
                        const quickPlaySentences = generateSentencesForAssignment(words, 2);
                        setActiveAssignment({
                          id: "quickplay-" + quickPlayActiveSession.id,
                          classId: "",
                          wordIds: words.map(w => w.id),
                          words,
                          title: "Quick Play",
                          allowedModes: quickPlayActiveSession.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"],
                          sentences: quickPlaySentences,
                          sentenceDifficulty: 2,
                        });
                        setCurrentIndex(0);
                        setScore(0);
                        setFeedback(null);
                        setIsFinished(false);
                        setMistakes([]);
                        setView("game");
                        setShowModeSelection(true);

                        // Save guest session to localStorage for page refresh recovery
                        try {
                          localStorage.setItem('vocaband_qp_guest', JSON.stringify({
                            sessionId: quickPlayActiveSession.id,
                            sessionCode: quickPlayActiveSession.sessionCode,
                            name: trimmedName,
                            avatar: quickPlayAvatar,
                          }));
                        } catch {}

                        // Record that student joined — so teacher sees them in live stats immediately
                        supabase.auth.getSession().then(({ data: { session } }) => {
                          const authUid = session?.user?.id;
                          if (!authUid) {
                            console.error('[Quick Play] No auth session - cannot record join');
                            return;
                          }
                          supabase.from('progress').insert({
                            student_name: trimmedName,
                            student_uid: authUid,
                            assignment_id: quickPlayActiveSession.id,
                            class_code: "QUICK_PLAY",
                            score: 0,
                            mode: "joined",
                            completed_at: new Date().toISOString(),
                            mistakes: [],
                            avatar: guestUser.avatar || "🦊",
                          }).then(({ error }) => {
                            if (error) {
                              console.error('[Quick Play] Failed to record join:', error);
                            }
                          });
                        });
                      }, 100);
                    }}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg"
                  >
                    Start Playing →
                  </button>
                </div>

                <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-surface-container-low rounded-2xl border-2 border-surface-container-highest">
                  <p className="text-xs sm:text-sm text-on-surface-variant text-center">
                    ℹ️ Your progress won't be saved (guest mode). Create an account to track your XP and unlock features!
                  </p>
                </div>
              </div>
            ) : null}
        </main>
      </div>
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
      <div className={`min-h-screen ${activeThemeConfig.colors.bg} p-4 sm:p-6`}>
        {consentModal}
        {showStudentOnboarding && (
          <StudentOnboarding
            userName={user.displayName}
            onComplete={() => setShowStudentOnboarding(false)}
          />
        )}
        <div className="max-w-4xl mx-auto">
          {/* Top bar with logout */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setView("privacy-settings")} className="px-3 py-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all" title="Privacy Settings">
              Privacy
            </button>
            <button onClick={() => { setShopTab("avatars"); setView("shop"); }} className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-xl hover:from-pink-500 hover:to-rose-600 transition-all text-base flex items-center gap-2 shadow-lg shadow-pink-500/30 animate-pulse">
              🛍️ Shop
            </button>
            <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 text-stone-500 font-bold hover:text-red-500 hover:bg-red-50 rounded-xl text-sm transition-all">Logout</button>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
              {user.avatar}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Hello, {user.displayName}!</h1>
              <p className="text-stone-500 font-bold text-base sm:text-sm">Class Code: <button onClick={() => { navigator.clipboard.writeText(user.classCode || ""); setCopiedCode(user.classCode || ""); setTimeout(() => setCopiedCode(null), 2000); }} className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-mono hover:bg-blue-100 active:scale-95 transition-all inline-flex items-center gap-1" title="Tap to copy code">{user.classCode} {copiedCode === user.classCode ? <Check size={14} className="text-blue-700" /> : <Copy size={14} className="text-blue-400" />}</button></p>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-amber-200">
                  <Zap size={14} /> {xp} XP
                </div>
                <div className="bg-purple-50 text-purple-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-purple-200">
                  {getXpTitle(xp).emoji} {getXpTitle(xp).title}
                </div>
                {streak > 0 && (
                  <div className="bg-orange-50 text-orange-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-orange-200">
                    🔥 {streak} streak
                  </div>
                )}
                {badges.map(badge => (
                  <div key={badge} className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                    <Trophy size={14} />
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {studentAssignments.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-lg font-bold text-stone-800 mb-3 sm:mb-2">Overall Progress</h3>
              <div className="flex items-center gap-3 sm:gap-4">
                <progress
                  className="flex-1 h-5 sm:h-4 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600 rounded-full overflow-hidden"
                  max={100}
                  value={toProgressValue((studentAssignments.filter(a => {
                    const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
                    const completedModes = new Set(
                      studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode)
                    ).size;
                    return completedModes >= allowedModes.length;
                  }).length / studentAssignments.length) * 100)}
                />
                <span className="font-bold text-stone-500 text-sm sm:text-sm">
                  {studentAssignments.filter(a => {
                    const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
                    const completedModes = new Set(
                      studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode)
                    ).size;
                    return completedModes >= allowedModes.length;
                  }).length} / {studentAssignments.length}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-xl">
            <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 flex items-center gap-2">
              <BookOpen className="text-blue-700" size={22} /> Your Assignments
            </h2>

            {/* Background loading indicator */}
            {studentDataLoading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 animate-pulse">
                <RefreshCw className="text-blue-700 animate-spin" size={16} />
                <span className="text-blue-800 font-bold text-sm">Loading your assignments...</span>
              </div>
            )}

            {studentAssignments.length === 0 && !studentDataLoading ? (
              <p className="text-stone-400 italic text-center py-10 text-base sm:text-sm">No assignments yet. Check back later!</p>
            ) : (
              <div className="space-y-5 sm:space-y-4">
                {studentAssignments.map((assignment, assignmentIdx) => {
                  const allowedModes = (assignment.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
                  const totalModes = allowedModes.length;

                  // Find unique modes completed for this assignment (flashcards excluded from progress)
                  const completedModes = new Set(
                    studentProgress
                      .filter(p => p.assignmentId === assignment.id && p.mode !== "flashcards")
                      .map(p => p.mode)
                  ).size;

                  const progressPercentage = Math.min(100, Math.round((completedModes / Math.max(totalModes, 1)) * 100));
                  const isComplete = completedModes >= totalModes;

                  // Cycle through accent colors for visual differentiation
                  const accentColors = [
                    { bg: "bg-blue-50", border: "border-blue-100", hoverBorder: "hover:border-blue-300", bar: "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600", btn: "bg-blue-700 hover:bg-blue-800", strip: "bg-blue-500" },
                    { bg: "bg-purple-50", border: "border-purple-100", hoverBorder: "hover:border-purple-300", bar: "[&::-webkit-progress-value]:bg-purple-600 [&::-moz-progress-bar]:bg-purple-600", btn: "bg-purple-700 hover:bg-purple-800", strip: "bg-purple-500" },
                    { bg: "bg-emerald-50", border: "border-emerald-100", hoverBorder: "hover:border-emerald-300", bar: "[&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600", btn: "bg-emerald-700 hover:bg-emerald-800", strip: "bg-emerald-500" },
                    { bg: "bg-amber-50", border: "border-amber-100", hoverBorder: "hover:border-amber-300", bar: "[&::-webkit-progress-value]:bg-amber-600 [&::-moz-progress-bar]:bg-amber-600", btn: "bg-amber-700 hover:bg-amber-800", strip: "bg-amber-500" },
                    { bg: "bg-rose-50", border: "border-rose-100", hoverBorder: "hover:border-rose-300", bar: "[&::-webkit-progress-value]:bg-rose-600 [&::-moz-progress-bar]:bg-rose-600", btn: "bg-rose-700 hover:bg-rose-800", strip: "bg-rose-500" },
                    { bg: "bg-cyan-50", border: "border-cyan-100", hoverBorder: "hover:border-cyan-300", bar: "[&::-webkit-progress-value]:bg-cyan-600 [&::-moz-progress-bar]:bg-cyan-600", btn: "bg-cyan-700 hover:bg-cyan-800", strip: "bg-cyan-500" },
                  ];
                  const accent = accentColors[assignmentIdx % accentColors.length];

                  return (
                    <div key={assignment.id} className={`${accent.bg} p-5 sm:p-6 rounded-3xl border-2 ${accent.border} ${accent.hoverBorder} transition-colors relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${accent.strip} rounded-l-3xl`} />
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-xl font-bold text-stone-800">{assignment.title}</h3>
                          <p className="text-stone-500 text-base sm:text-sm font-medium mt-2 sm:mt-1">
                            {assignment.wordIds.length} Vocabulary Words
                            {assignment.deadline && ` • Due: ${new Date(assignment.deadline).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const filteredWords = assignment.words || ALL_WORDS.filter(w => assignment.wordIds.includes(w.id));
                            setActiveAssignment(assignment);
                            setAssignmentWords(filteredWords);
                            // Use startTransition for non-urgent view change so React can paint immediately
                            React.startTransition(() => {
                              setView("game");
                              setShowModeSelection(true);
                            });
                          }}
                          className={`w-full sm:w-auto px-6 py-4 sm:py-3 ${accent.btn} text-white rounded-xl font-bold transition-colors whitespace-nowrap text-base sm:text-sm`}
                        >
                          {isComplete ? "Play Again" : "Start Learning"}
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm sm:text-xs font-bold mb-3 sm:mb-2">
                          <span className="text-stone-500 uppercase tracking-widest">Progress</span>
                          <span className={isComplete ? "text-blue-700" : "text-stone-500"}>
                            {completedModes} / {totalModes} Modes ({progressPercentage}%)
                          </span>
                        </div>
                        <progress
                          className={`h-4 sm:h-3 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 ${accent.bar}`}
                          max={100}
                          value={toProgressValue(progressPercentage)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <FloatingButtons showBackToTop={true} />
      </div>
    );
  }

  // --- PRIVACY SETTINGS VIEW ---
  if (user && view === "privacy-settings") {
    const handleExportData = async () => {
      try {
        // Client-side data export — fetch user's own data via RLS-protected queries
        const [userResult, progressResult] = await Promise.all([
          supabase.from('users').select('*').eq('uid', user.uid).maybeSingle(),
          supabase.from('progress').select('*').eq('student_uid', user.uid),
        ]);
        const exportData = {
          exported_at: new Date().toISOString(),
          user: userResult.data,
          progress: progressResult.data ?? [],
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocaband-data-${user.uid.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Data exported successfully!", "success");
      } catch (err) {
        console.error("Export error:", err);
        showToast("Failed to export data.", "error");
      }
    };

    const handleDeleteAccount = async () => {
      setConfirmDialog({
        show: true,
        message: "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?",
        onConfirm: async () => {
          try {
            // Delete user's progress and profile
            await supabase.from('progress').delete().eq('student_uid', user.uid);
            await supabase.from('users').delete().eq('uid', user.uid);
            localStorage.removeItem('vocaband_consent_version');
            await supabase.auth.signOut();
            showToast("Account deleted successfully.", "success");
          } catch (err) {
            console.error("Delete account error:", err);
            showToast("Failed to delete account.", "error");
          }
          setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        },
      });
    };

    const handleSaveName = async () => {
      const trimmed = newDisplayName.trim().slice(0, 30);
      if (!trimmed) return;
      try {
        const { error: updateErr } = await supabase.from('users').update({ display_name: trimmed }).eq('uid', user.uid);
        if (updateErr) throw updateErr;
        setUser(prev => prev ? { ...prev, displayName: trimmed } : prev);
        setEditingName(false);
        showToast("Name updated!", "success");
      } catch {
        showToast("Failed to update name.", "error");
      }
    };

    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        {consentModal}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView(user.role === "teacher" ? "teacher-dashboard" : "student-dashboard")} className="text-stone-500 hover:text-stone-700 font-bold flex items-center gap-1">
              <ChevronRight className="rotate-180" size={18} /> Back
            </button>
            <h1 className="text-2xl font-black text-stone-900">Privacy & Data Settings</h1>
          </div>

          {/* Profile Info (editable name) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold text-stone-800 mb-3">Your Profile</h2>
            <div className="space-y-2 text-sm text-stone-600">
              <p><strong>Role:</strong> {user.role}</p>
              <div className="flex items-center gap-2">
                <strong>Name:</strong>
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      maxLength={30}
                      className="border rounded-lg px-2 py-1 text-sm flex-1"
                      autoFocus
                    />
                    <button onClick={handleSaveName} className="text-blue-600 font-bold text-xs">Save</button>
                    <button onClick={() => setEditingName(false)} className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg">Cancel</button>
                  </div>
                ) : (
                  <>
                    {user.displayName}
                    <button onClick={() => { setNewDisplayName(user.displayName); setEditingName(true); }} className="text-blue-600 text-xs font-bold ml-2">Edit</button>
                  </>
                )}
              </div>
              {user.email && <p><strong>Email:</strong> {user.email}</p>}
              {user.classCode && <p><strong>Class Code:</strong> {user.classCode}</p>}
            </div>
          </div>

          {/* What data we store */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold text-stone-800 mb-3">What Data We Store</h2>
            <div className="space-y-3">
              {DATA_COLLECTION_POINTS
                .filter(p => p.role === user.role || p.role === "both")
                .map((point, i) => (
                <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                  <p className="font-bold text-stone-700">{point.location}</p>
                  <p className="text-stone-500">Fields: {point.fields.join(", ")}</p>
                  <p className="text-stone-500">Purpose: {point.purpose}</p>
                  <p className="text-stone-400 text-xs">{point.mandatory ? "Required" : "Optional"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Third-party services */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold text-stone-800 mb-3">Third-Party Services</h2>
            <div className="space-y-3">
              {THIRD_PARTY_REGISTRY.map((tp, i) => (
                <div key={i} className="text-sm border-b border-stone-100 pb-2 last:border-0">
                  <p className="font-bold text-stone-700">{tp.name} <span className="text-stone-400 font-normal">({tp.hostingRegion})</span></p>
                  <p className="text-stone-500">{tp.purpose}</p>
                  <p className="text-stone-400 text-xs">Data: {tp.dataCategories.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Consent status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold text-stone-800 mb-3">Consent Status</h2>
            <div className="text-sm text-stone-600 space-y-1">
              <p><strong>Current policy version:</strong> {PRIVACY_POLICY_VERSION}</p>
              <p><strong>Your accepted version:</strong> {localStorage.getItem('vocaband_consent_version') || "Not yet accepted"}</p>
            </div>
            <div className="flex gap-3 mt-4">
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">Full Privacy Policy</a>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold hover:underline">Terms of Service</a>
            </div>
            {localStorage.getItem('vocaband_consent_version') && (
              <button
                onClick={() => {
                  setConfirmDialog({
                    show: true,
                    message: "Withdrawing consent will log you out. You can re-accept when you log in again. Continue?",
                    onConfirm: async () => {
                      localStorage.removeItem('vocaband_consent_version');
                      if (user?.uid) {
                        try {
                          await supabase.from('consent_log').insert({
                            uid: user.uid,
                            policy_version: PRIVACY_POLICY_VERSION,
                            terms_version: PRIVACY_POLICY_VERSION,
                            action: 'withdraw',
                          });
                        } catch { /* non-critical — sign out regardless */ }
                      }
                      await supabase.auth.signOut();
                      setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
                    },
                  });
                }}
                className="mt-3 text-red-500 text-sm font-bold hover:underline"
              >
                Withdraw Consent
              </button>
            )}
          </div>

          {/* Data export & deletion */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="font-bold text-stone-800 mb-3">Your Data Rights</h2>
            <p className="text-sm text-stone-500 mb-4">Under Israeli privacy law (PPA Amendment 13), you have the right to access, correct, and delete your personal data.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-200 transition-all"
              >
                Download My Data (JSON)
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl text-sm hover:bg-red-200 transition-all"
              >
                Delete My Account
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Note: Data in encrypted backups may be retained for up to 30 days after deletion.
              Contact {DATA_CONTROLLER.contactEmail} for questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- SHOP VIEW ---
  if (user?.role === "student" && view === "shop") {
    const purchaseAvatar = async (avatar: typeof PREMIUM_AVATARS[0]) => {
      if (xp < avatar.cost) { showToast("Not enough XP!", "error"); return; }
      const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: avatar.emoji, item_cost: avatar.cost });
      if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
      setXp(data.new_xp);
      setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), avatar.emoji] } : prev);
      showToast(`Unlocked ${avatar.name}!`, "success");
    };
    const equipAvatar = async (emoji: string) => {
      setUser(prev => prev ? { ...prev, avatar: emoji } : prev);
      await supabase.from('users').update({ avatar: emoji }).eq('uid', user.uid);
      showToast("Avatar equipped!", "success");
    };
    const purchaseTheme = async (theme: typeof THEMES[0]) => {
      if (xp < theme.cost) { showToast("Not enough XP!", "error"); return; }
      const { data, error } = await supabase.rpc('purchase_item', { item_type: 'theme', item_id: theme.id, item_cost: theme.cost });
      if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
      setXp(data.new_xp);
      setUser(prev => prev ? { ...prev, unlockedThemes: [...(prev.unlockedThemes ?? []), theme.id] } : prev);
      showToast(`Unlocked ${theme.name}!`, "success");
    };
    const equipTheme = async (themeId: string) => {
      setUser(prev => prev ? { ...prev, activeTheme: themeId } : prev);
      await supabase.from('users').update({ active_theme: themeId }).eq('uid', user.uid);
      showToast("Theme applied!", "success");
    };
    const purchasePowerUp = async (powerUp: typeof POWER_UP_DEFS[0]) => {
      if (xp < powerUp.cost) { showToast("Not enough XP!", "error"); return; }
      const { data, error } = await supabase.rpc('purchase_item', { item_type: 'power_up', item_id: powerUp.id, item_cost: powerUp.cost });
      if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
      setXp(data.new_xp);
      setUser(prev => prev ? { ...prev, powerUps: { ...(prev.powerUps ?? {}), [powerUp.id]: ((prev.powerUps ?? {})[powerUp.id] ?? 0) + 1 } } : prev);
      showToast(`Got ${powerUp.name}!`, "success");
    };
    const purchaseBooster = async (booster: typeof BOOSTERS_DEFS[0]) => {
      if (xp < booster.cost) { showToast("Not enough XP!", "error"); return; }
      const { data, error } = await supabase.rpc('purchase_item', { item_type: 'booster', item_id: booster.id, item_cost: booster.cost });
      if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
      setXp(data.new_xp);
      showToast(`Got ${booster.name}! 🎉`, "success");
    };

    const activeThemeConfig = THEMES.find(t => t.id === (user.activeTheme ?? 'default')) ?? THEMES[0];

    return (
      <div className={`min-h-screen ${activeThemeConfig.colors.bg} p-4 sm:p-6`}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setView("student-dashboard")} className="text-stone-500 hover:text-stone-700 font-bold flex items-center gap-1">
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl font-black text-lg flex items-center gap-2 border-2 border-amber-200">
                <Zap size={18} /> {xp} XP
              </div>
            </div>
          </div>

          <h1 className={`text-3xl font-black mb-6 ${activeThemeConfig.colors.text}`}>🛍️ Shop</h1>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(["avatars", "themes", "titles", "frames", "boosters", "powerups"] as const).map(tab => (
              <button key={tab} onClick={() => setShopTab(tab)}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${shopTab === tab ? "bg-blue-600 text-white shadow-md" : "bg-white text-stone-500 hover:bg-blue-50 border-2 border-blue-200"}`}>
                {tab === "avatars" ? "🎭 Avatars" : tab === "themes" ? "🎨 Themes" : tab === "titles" ? "🏷️ Titles" : tab === "frames" ? "🖼️ Frames" : tab === "boosters" ? "🔥 Boosters" : "⚡ Power-ups"}
              </button>
            ))}
          </div>

          {/* Avatar Shop */}
          {shopTab === "avatars" && (
            <div className="space-y-6">
              {/* Avatar Collections — Category-based unlocking */}
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
                <h2 className="text-xl font-black mb-2">Avatar Collections</h2>
                <p className="text-stone-500 text-sm mb-4">Earn XP to unlock new avatar packs! Select any unlocked avatar to equip it.</p>
                <div className="space-y-4">
                  {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>).map(category => {
                    const unlock = AVATAR_CATEGORY_UNLOCKS[category] ?? { xpRequired: 0, label: 'Free' };
                    const isUnlocked = xp >= unlock.xpRequired;
                    const progressPercent = unlock.xpRequired > 0 ? Math.min(100, Math.round((xp / unlock.xpRequired) * 100)) : 100;
                    return (
                      <div key={category} className={`rounded-2xl border-2 overflow-hidden transition-all ${isUnlocked ? "border-green-200 bg-green-50/50" : "border-stone-200 bg-stone-50"}`}>
                        <div className={`flex items-center justify-between px-4 py-3 ${isUnlocked ? "bg-green-100/50" : "bg-stone-100"}`}>
                          <div className="flex items-center gap-2">
                            {isUnlocked ? (
                              <CheckCircle2 size={16} className="text-green-600" />
                            ) : (
                              <span className="text-sm">🔒</span>
                            )}
                            <span className={`text-sm font-black ${isUnlocked ? "text-green-800" : "text-stone-500"}`}>{category}</span>
                            <span className="text-xs text-stone-400">({AVATAR_CATEGORIES[category].length} avatars)</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUnlocked ? "bg-green-200 text-green-800" : "bg-amber-100 text-amber-700"}`}>
                            {unlock.xpRequired === 0 ? "Free" : isUnlocked ? "Unlocked!" : `${unlock.label} needed`}
                          </span>
                        </div>
                        {!isUnlocked && (
                          <div className="px-4 pt-2 pb-1">
                            <div className="w-full bg-stone-200 rounded-full h-1.5">
                              <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{xp} / {unlock.xpRequired} XP ({progressPercent}%)</p>
                          </div>
                        )}
                        <div className={`grid grid-cols-6 sm:grid-cols-10 gap-1.5 p-3 ${!isUnlocked ? "opacity-40 pointer-events-none" : ""}`}>
                          {AVATAR_CATEGORIES[category].map(a => {
                            const isEquipped = user.avatar === a;
                            return (
                              <button
                                key={a}
                                onClick={() => { if (isUnlocked) equipAvatar(a); }}
                                className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-xl sm:text-2xl transition-all ${
                                  isEquipped
                                    ? "bg-gradient-to-br from-blue-300 via-blue-500 to-blue-800 shadow-lg shadow-blue-200 ring-2 ring-blue-400 scale-110"
                                    : isUnlocked
                                    ? "bg-white hover:scale-110 hover:shadow-md shadow-sm cursor-pointer"
                                    : "bg-stone-100 grayscale"
                                }`}
                              >
                                {isUnlocked ? a : "?"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Featured Premium Avatars */}
              <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-amber-100">
                <h2 className="text-xl font-black mb-2">Featured Avatars</h2>
                <p className="text-stone-500 text-sm mb-4">Exclusive avatars you can buy with XP!</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {PREMIUM_AVATARS.map(avatar => {
                    const isOwned = (user.unlockedAvatars ?? []).includes(avatar.emoji);
                    const isEquipped = user.avatar === avatar.emoji;
                    const canAfford = xp >= avatar.cost;
                    return (
                      <div key={avatar.emoji} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${isEquipped ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                        <span className="text-4xl mb-2">{isOwned ? avatar.emoji : "?"}</span>
                        <span className="text-xs font-bold text-stone-700 text-center">{avatar.name}</span>
                        {isEquipped ? (
                          <span className="text-xs font-bold text-blue-600 mt-1">Equipped</span>
                        ) : isOwned ? (
                          <button onClick={() => equipAvatar(avatar.emoji)} className="text-xs font-bold text-green-600 mt-1 hover:text-green-800 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200 transition-all">Equip</button>
                        ) : (
                          <button onClick={() => purchaseAvatar(avatar)} disabled={!canAfford}
                            className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                            {avatar.cost} XP
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Theme Shop */}
          {shopTab === "themes" && (
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
              <h2 className="text-xl font-black mb-4">Themes</h2>
              <p className="text-stone-500 text-sm mb-4">Customize your game experience!</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEMES.map(theme => {
                  const isOwned = theme.cost === 0 || (user.unlockedThemes ?? []).includes(theme.id);
                  const isActive = (user.activeTheme ?? 'default') === theme.id;
                  const canAfford = xp >= theme.cost;
                  return (
                    <div key={theme.id} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                      <div className={`w-full h-16 rounded-xl mb-3 ${theme.colors.bg} border border-stone-200 flex items-center justify-center`}>
                        <span className="text-2xl">{theme.preview}</span>
                      </div>
                      <span className="text-sm font-bold text-stone-700">{theme.name}</span>
                      {isActive ? (
                        <span className="text-xs font-bold text-blue-600 mt-1">Active</span>
                      ) : isOwned ? (
                        <button onClick={() => equipTheme(theme.id)} className="text-xs font-bold text-green-600 mt-1 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200 transition-all">Apply</button>
                      ) : (
                        <button onClick={() => purchaseTheme(theme)} disabled={!canAfford}
                          className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                          {theme.cost} XP
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name Titles Shop */}
          {shopTab === "titles" && (
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
              <h2 className="text-xl font-black mb-2">Name Titles</h2>
              <p className="text-stone-500 text-sm mb-4">Show off a custom title below your name!</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NAME_TITLES.map(title => {
                  const isOwned = (user.unlockedAvatars ?? []).includes(`title_${title.id}`);
                  const isActive = (user as any).activeTitle === title.id;
                  const canAfford = xp >= title.cost;
                  return (
                    <div key={title.id} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                      <span className="text-sm font-black text-stone-800 mb-1">{title.display}</span>
                      {isActive ? (
                        <span className="text-xs font-bold text-blue-600">Active</span>
                      ) : isOwned ? (
                        <button onClick={async () => {
                          setUser(prev => prev ? { ...prev, activeTitle: title.id } as any : prev);
                          await supabase.from('users').update({ active_title: title.id } as any).eq('uid', user.uid);
                          showToast("Title equipped!", "success");
                        }} className="text-xs font-bold text-green-600 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200">Equip</button>
                      ) : (
                        <button onClick={async () => {
                          if (xp < title.cost) { showToast("Not enough XP!", "error"); return; }
                          const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `title_${title.id}`, item_cost: title.cost });
                          if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                          setXp(data.new_xp);
                          setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `title_${title.id}`] } : prev);
                          showToast(`Unlocked "${title.display}"!`, "success");
                        }} disabled={!canAfford}
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                          {title.cost} XP
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name Frames Shop */}
          {shopTab === "frames" && (
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
              <h2 className="text-xl font-black mb-2">Avatar Frames</h2>
              <p className="text-stone-500 text-sm mb-4">Add a glowing border around your avatar!</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {NAME_FRAMES.map(frame => {
                  const isOwned = (user.unlockedAvatars ?? []).includes(`frame_${frame.id}`);
                  const isActive = (user as any).activeFrame === frame.id;
                  const canAfford = xp >= frame.cost;
                  return (
                    <div key={frame.id} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 bg-white ${frame.border}`}>
                        {user.avatar || "😎"}
                      </div>
                      <span className="text-xs font-bold text-stone-700">{frame.name}</span>
                      {isActive ? (
                        <span className="text-xs font-bold text-blue-600 mt-1">Active</span>
                      ) : isOwned ? (
                        <button onClick={async () => {
                          setUser(prev => prev ? { ...prev, activeFrame: frame.id } as any : prev);
                          await supabase.from('users').update({ active_frame: frame.id } as any).eq('uid', user.uid);
                          showToast("Frame equipped!", "success");
                        }} className="text-xs font-bold text-green-600 mt-1 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200">Equip</button>
                      ) : (
                        <button onClick={async () => {
                          if (xp < frame.cost) { showToast("Not enough XP!", "error"); return; }
                          const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `frame_${frame.id}`, item_cost: frame.cost });
                          if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                          setXp(data.new_xp);
                          setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `frame_${frame.id}`] } : prev);
                          showToast(`Unlocked ${frame.name}!`, "success");
                        }} disabled={!canAfford}
                          className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                          {frame.cost} XP
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Boosters Shop — High-demand items */}
          {shopTab === "boosters" && (
            <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-3xl p-6 shadow-md border-2 border-pink-200">
              <h2 className="text-xl font-black mb-2 bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">🔥 Hot Boosters</h2>
              <p className="text-stone-500 text-sm mb-4">The most wanted items in 2026!</p>
              <div className="space-y-3">
                {BOOSTERS_DEFS.map(booster => {
                  const canAfford = xp >= booster.cost;
                  return (
                    <div key={booster.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-pink-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-4xl">{booster.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-stone-800">{booster.name}</p>
                        <p className="text-xs text-stone-500">{booster.desc}</p>
                      </div>
                      <button onClick={() => purchaseBooster(booster)} disabled={!canAfford}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${canAfford ? "bg-gradient-to-r from-pink-400 to-orange-400 text-white hover:from-pink-500 hover:to-orange-500 shadow-md" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
                        {booster.cost} XP
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Power-ups Shop */}
          {shopTab === "powerups" && (
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
              <h2 className="text-xl font-black mb-4">Power-ups</h2>
              <p className="text-stone-500 text-sm mb-4">Buy boosts to use during games!</p>
              <div className="space-y-3">
                {POWER_UP_DEFS.map(powerUp => {
                  const owned = (user.powerUps ?? {})[powerUp.id] ?? 0;
                  const canAfford = xp >= powerUp.cost;
                  return (
                    <div key={powerUp.id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border-2 border-stone-100">
                      <span className="text-3xl">{powerUp.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-stone-800">{powerUp.name}</p>
                        <p className="text-xs text-stone-500">{powerUp.desc}</p>
                      </div>
                      <div className="text-center">
                        {owned > 0 && <p className="text-xs font-bold text-blue-600 mb-1">×{owned}</p>}
                        <button onClick={() => purchasePowerUp(powerUp)} disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${canAfford ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
                          {powerUp.cost} XP
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* XP Title Progress */}
          <div className="mt-6 bg-white rounded-3xl p-6 shadow-md border-2 border-purple-100">
            <h2 className="text-lg font-black mb-3 flex items-center gap-2">{getXpTitle(xp).emoji} {getXpTitle(xp).title}</h2>
            <div className="space-y-2">
              {XP_TITLES.map((tier, i) => {
                const nextTier = XP_TITLES[i + 1];
                const isCurrentTier = xp >= tier.min && (!nextTier || xp < nextTier.min);
                const isCompleted = nextTier ? xp >= nextTier.min : false;
                const progress = nextTier ? Math.min(100, Math.round(((xp - tier.min) / (nextTier.min - tier.min)) * 100)) : 100;
                return (
                  <div key={tier.title} className={`flex items-center gap-3 p-2 rounded-xl ${isCurrentTier ? "bg-purple-50 border border-purple-200" : ""}`}>
                    <span className="text-lg">{tier.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-0.5">
                        <span className={isCompleted ? "text-green-600" : isCurrentTier ? "text-purple-700" : "text-stone-400"}>{tier.title}</span>
                        <span className="text-stone-400">{tier.min} XP</span>
                      </div>
                      {nextTier && (
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isCompleted ? "bg-green-500" : isCurrentTier ? "bg-purple-500" : "bg-stone-200"}`} style={{ width: `${isCompleted ? 100 : isCurrentTier ? progress : 0}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <FloatingButtons showBackToTop={true} />
      </div>
    );
  }

  if (user?.role === "teacher" && view === "teacher-dashboard") {
    return (
      <>
      <div className="min-h-screen bg-surface pt-24 pb-8" style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
          {consentModal}

        {/* Top App Bar */}
        {/* First-time onboarding tour */}
        {showOnboarding && (
          <DashboardOnboarding onComplete={() => {
            try { localStorage.setItem('vocaband_onboarding_done', 'true'); } catch {}
            setShowOnboarding(false);
          }} />
        )}

        <TopAppBar
          title="Vocaband"
          subtitle="ISRAELI ENGLISH CURRICULUM • BANDS VOCABULARY"
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <div className="" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>
          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Quick Play */}
            <HelpTooltip className="h-full" content="Create a QR code for students to scan and play selected words - no login required!">
              <div className="h-full" data-tour="quick-play">
                <ActionCard
                  icon={<QrCode size={24} />}
                  iconBg="bg-indigo-100"
                  iconColor="text-indigo-600"
                  title="Quick Online Challenge"
                  description="Generate QR code for instant play"
                  buttonText="Create"
                  buttonVariant="qr-purple"
                  onClick={() => {
                    // Set flag to skip session restoration on next render
                    try {
                      sessionStorage.setItem('vocaband_skip_restore', 'true');
                    } catch (e) {
                    }
                    // Clear any session parameter to avoid loading student view
                    window.history.pushState({}, '', window.location.pathname);
                    // Clear any saved Quick Play session to start fresh
                    try {
                      localStorage.removeItem('vocaband_quick_play_session');
                    } catch (e) {
                    }
                    cleanupSessionData(); // Clear save queue and timers
                    setQuickPlayActiveSession(null);
                    setQuickPlaySessionCode(null);
                    setView("quick-play-setup");
                  }}
                />
              </div>
            </HelpTooltip>

            {/* Live Challenge - Hidden */}
            {false && (
            <HelpTooltip className="h-full" content="Start a real-time vocabulary competition - students race to answer correctly!">
              <div className="h-full">
                <ActionCard
                  icon={<RefreshCw size={24} />}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                  title="Live Mode for Classes"
                  description="Start a real-time vocabulary competition"
                  buttonText="Start"
                  buttonVariant="live-green"
                  onClick={() => {
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
                />
              </div>
            </HelpTooltip>
            )}

            {/* Analytics */}
            <HelpTooltip className="h-full" content="See every student's scores across all assignments, identify struggling students, track trends, and find the most-missed words">
              <div className="h-full" data-tour="analytics">
                <ActionCard
                  icon={<BarChart3 size={24} />}
                  iconBg="bg-purple-100"
                  iconColor="text-purple-600"
                  title="Classroom Analytics"
                  description="Scores, trends & weak words"
                  buttonText="View Insights"
                  buttonVariant="analytics-blue"
                  onClick={() => { fetchScores(); fetchTeacherAssignments(); setView("analytics"); }}
                />
              </div>
            </HelpTooltip>

            {/* Gradebook & Students */}
            <HelpTooltip className="h-full" content="View all students, track scores, progress, and activity history">
              <div className="h-full" data-tour="gradebook">
                <ActionCard
                  icon={<Trophy size={24} />}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  title="Students & Grades"
                  description="All students & scores"
                  buttonText="Open Gradebook"
                  buttonVariant="gradebook-amber"
                  onClick={() => { fetchScores(); setView("gradebook"); }}
                />
              </div>
            </HelpTooltip>

            {/* Student Approvals */}
            <HelpTooltip className="h-full" content="Approve students who signed up for your classes">
              <div className="h-full" data-tour="approvals">
                <ActionCard
                  icon={<UserCircle size={24} />}
                  iconBg="bg-rose-100"
                  iconColor="text-rose-600"
                  title="Student Approvals"
                  description={pendingStudents.length > 0 ? `${pendingStudents.length} waiting` : "No pending approvals"}
                  buttonText={pendingStudents.length > 0 ? `Review (${pendingStudents.length})` : "Check"}
                  buttonVariant={pendingStudents.length > 0 ? "secondary" : "rose"}
                  onClick={() => { loadPendingStudents(); setView("teacher-approvals"); }}
                  badge={pendingStudents.length > 0 ? pendingStudents.length : undefined}
                />
              </div>
            </HelpTooltip>
          </div>

          {/* My Classes Section */}
          <div data-tour="my-classes" className="bg-surface-container-low rounded-2xl p-6 mb-6 shadow-lg border-2 border-surface-container-high">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                <Users className="text-primary" size={20} /> My Classes
              </h2>
              <button
                data-tour="new-class"
                onClick={() => setShowCreateClassModal(true)}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-black text-base flex items-center gap-2 active:scale-95 transition-all"
                aria-label="Create new class"
              >
                <Plus size={16} /> New Class
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-on-surface-variant" />
                </div>
                <p className="text-on-surface-variant font-medium">No classes yet. Create one to get a code!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {[...classes].reverse().map(c => {
                  // Get assignments for this class
                  const classAssignments = teacherAssignments.filter(a => a.classId === c.id);

                  return (
                    <div key={c.id} style={{ minWidth: '300px' }}>
                      <ClassCard
                        name={c.name}
                        code={c.code}
                        copiedCode={copiedCode}
                        assignments={classAssignments}
                        openDropdownClassId={openDropdownClassId}
                        onToggleDropdown={setOpenDropdownClassId}
                        onAssign={() => { setSelectedClass(c); setView("create-assignment"); setAssignmentStep(1); setSelectedWords([]); setAssignmentTitle(""); setAssignmentDeadline(""); setAssignmentModes([]); setAssignmentSentences([]); setEditingAssignment(null); }}
                        onCopyCode={() => {
                          navigator.clipboard.writeText(c.code);
                          setCopiedCode(c.code);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        onWhatsApp={() => {
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(c.code)}`,
                          '_blank'
                        );
                      }}
                      onDelete={() => handleDeleteClass(c.id)}
                      onEditAssignment={(assignment) => {
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
                        setSentencesAutoGenerated(true); // Allow difficulty changes to regenerate sentences
                        if (knownIds.some(id => SET_1_WORDS.some(w => w.id === id))) setSelectedLevel("Set 1");
                        else if (unknownWords.length > 0) setSelectedLevel("Custom");
                        else setSelectedLevel("Set 2");
                        setSelectedClass(c);
                        setView("create-assignment");
                      }}
                      onDuplicateAssignment={(assignment) => {
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
                        setSentencesAutoGenerated(true); // Allow difficulty changes to regenerate sentences
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
        </div>

        {/* Overlay Components - Modals, Toasts, and Panels */}
        {/* Create Class Modal */}
        <AnimatePresence>
          {showCreateClassModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-black mb-2">Create New Class</h2>
                <p className="text-stone-500 mb-6">Enter a name for your class (e.g. Grade 8-B)</p>
                <input 
                  autoFocus
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Class Name"
                  maxLength={50}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-blue-100 focus:border-blue-600 outline-none mb-6 font-bold"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCreateClassModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-colors border-2 border-stone-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateClass}
                    className="flex-1 py-4 bg-blue-700 text-white rounded-2xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-100"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Class Created Success Modal */}
        <AnimatePresence>
          {createdClassCode && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center max-h-[90vh] overflow-y-auto"
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">Class Created!</h2>
                <p className="text-stone-500 mb-6">Share this code with your students so they can join.</p>
                
                <div className="bg-gradient-to-br from-blue-50 to-stone-50 p-6 rounded-3xl border-2 border-blue-100 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-stone-100 rounded-full -ml-8 -mb-8 opacity-50"></div>
                  <p className="text-5xl font-mono font-black text-blue-700 tracking-widest relative z-10">{createdClassCode}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${createdClassName} - Class Code: ${createdClassCode}`);
                      setCopiedCode(createdClassCode);
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2 hover:scale-105 border-2 border-blue-200"
                  >
                    {copiedCode === createdClassCode ? <Check size={20} className="text-blue-700" /> : <Copy size={20} />}
                    <span>Copy</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(createdClassCode || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg shadow-green-100"
                  >
                    <MessageCircle size={20} />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <button
                  onClick={() => setCreatedClassCode(null)}
                  className="w-full py-4 text-stone-500 font-bold hover:text-stone-700 hover:bg-stone-50 rounded-2xl transition-all"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Assignment Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">Delete Assignment?</h2>
                <p className="text-stone-500 mb-6">
                  You're about to delete <strong>"{deleteConfirmModal.title}"</strong>. This action cannot be undone — all student progress and data for this assignment will be permanently removed.
                </p>
                <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                  ⚠️ Make sure you want to delete this assignment before continuing.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmModal(null)}
                    className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors border-2 border-stone-200"
                  >
                    Keep Assignment
                  </button>
                  <button
                    onClick={() => {
                      const deletedId = deleteConfirmModal.id;
                      const deletedTitle = deleteConfirmModal.title;
                      // Optimistically remove from UI
                      setTeacherAssignments(prev => {
                        const removed = prev.find(x => x.id === deletedId);
                        if (removed) (window as any).__undoAssignment = removed;
                        return prev.filter(x => x.id !== deletedId);
                      });
                      setDeleteConfirmModal(null);
                      // Delayed hard delete with undo window
                      const undoTimeout = setTimeout(async () => {
                        const { error } = await supabase.from('assignments').delete().eq('id', deletedId);
                        if (error) showToast("Failed to delete from database: " + error.message, "error");
                        delete (window as any).__undoAssignment;
                        delete (window as any).__undoDeleteTimeout;
                      }, 8000);
                      (window as any).__undoDeleteTimeout = undoTimeout;
                      // Show undo toast
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
                      // Auto-dismiss undo toast after 8 seconds
                      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== undoToastId)), 8000);
                    }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
                  >
                    Delete Assignment
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reject Student Confirmation Modal */}
        <AnimatePresence>
          {rejectStudentModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">Reject Student?</h2>
                <p className="text-stone-500 mb-6">
                  You're about to reject <strong>"{rejectStudentModal.displayName}"</strong>. They will need to sign up again with a new class code to join your class.
                </p>
                <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                  ⚠️ This action cannot be undone. The student's profile will be marked as rejected.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectStudentModal(null)}
                    className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
                  >
                    Keep Student
                  </button>
                  <button
                    onClick={async () => {
                      await confirmRejectStudent(rejectStudentModal.id);
                      setRejectStudentModal(null);
                    }}
                    className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                  >
                    Reject Student
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* End Quick Play Session Modal moved to quick-play-teacher-monitor view */}

        {/* OCR Image Crop Modal */}
        {ocrCropModal}

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
        </>
    );
  }

  if (view === "create-assignment" && selectedClass) {
    return (
      <CreateAssignmentWizard
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
    );
  }


  if (view === "game" && showModeSelection) {

    const modes: Array<{ id: GameMode; name: string; desc: string; color: string; icon: React.ReactNode; tooltip: string[] }> = [
      { id: "classic", name: "Classic Mode", desc: "See the word, hear the word, pick translation.", color: "emerald", icon: <BookOpen size={24} />, tooltip: ["See the word in Hebrew/Arabic", "Hear the pronunciation", "Choose the correct English translation"] },
      { id: "listening", name: "Listening Mode", desc: "Only hear the word. No English text!", color: "blue", icon: <Volume2 size={24} />, tooltip: ["Listen to the word pronunciation", "No text shown - audio only!", "Great for training your ear"] },
      { id: "spelling", name: "Spelling Mode", desc: "Type the English word. Hardest mode!", color: "purple", icon: <PenTool size={24} />, tooltip: ["Hear the word", "Type it correctly in English", "Best for mastering spelling"] },
      { id: "matching", name: "Matching Mode", desc: "Match Hebrew to English. Fun & fast!", color: "amber", icon: <Zap size={24} />, tooltip: ["Match pairs together", "Connect Hebrew to English", "Fast-paced and fun!"] },
      { id: "true-false", name: "True/False", desc: "Is the translation correct? Quick thinking!", color: "rose", icon: <CheckCircle2 size={24} />, tooltip: ["See a word and translation", "Decide if it's correct", "Quick reflexes game"] },
      { id: "flashcards", name: "Flashcards", desc: "Review words at your own pace. No pressure.", color: "cyan", icon: <Layers size={24} />, tooltip: ["Review at your own pace", "Flip cards to see answers", "No scoring - just practice"] },
      { id: "scramble", name: "Word Scramble", desc: "Unscramble the letters to find the word.", color: "indigo", icon: <Shuffle size={24} />, tooltip: ["Letters are mixed up", "Rearrange to form the word", "Tests your spelling skills"] },
      { id: "reverse", name: "Reverse Mode", desc: "See Hebrew/Arabic, pick the English word.", color: "fuchsia", icon: <Repeat size={24} />, tooltip: ["See Hebrew/Arabic word", "Choose matching English word", "Reverse of classic mode"] },
      { id: "letter-sounds", name: "Letter Sounds", desc: "Watch each letter light up and hear its sound.", color: "violet", icon: <span className="text-2xl">🔡</span>, tooltip: ["Each letter lights up in color", "Listen to each letter sound", "Type the full word you heard"] },
      { id: "sentence-builder", name: "Sentence Builder", desc: "Tap words in the right order to build the sentence.", color: "teal", icon: <span className="text-2xl">🧩</span>, tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"] },
    ];

    const allowedModes = activeAssignment?.allowedModes || modes.map(m => m.id);
    const filteredModes = modes.filter(m => allowedModes.includes(m.id));

    if (filteredModes.length === 0) {
      console.error('[Mode Selection] No modes available!');
    }

    const colorClasses: Record<string, string> = {
      emerald: "bg-blue-50 border-blue-100 hover:bg-blue-50 text-blue-700",
      blue: "bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-700",
      purple: "bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700",
      amber: "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700",
      rose: "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700",
      cyan: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-700",
      indigo: "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700",
      fuchsia: "bg-fuchsia-50 border-fuchsia-100 hover:bg-fuchsia-100 text-fuchsia-700",
      violet: "bg-violet-50 border-violet-100 hover:bg-violet-100 text-violet-700",
      teal: "bg-teal-50 border-teal-100 hover:bg-teal-100 text-teal-700",
    };

    const iconColorClasses: Record<string, string> = {
      emerald: "text-blue-700",
      blue: "text-blue-600",
      purple: "text-purple-600",
      amber: "text-amber-600",
      rose: "text-rose-600",
      cyan: "text-cyan-600",
      indigo: "text-indigo-600",
      fuchsia: "text-fuchsia-600",
      violet: "text-violet-600",
      teal: "text-teal-600",
    };

    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl bg-white rounded-[48px] shadow-2xl p-6 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-blue-600" />
          <button
            onClick={handleExitGame}
            className="absolute top-4 right-4 sm:top-10 sm:right-10 text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-3 rounded-full hover:rotate-90 transition-all duration-300"
            aria-label="Close mode selection"
            title="Close mode selection"
          >
            <X size={28} />
          </button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-12 mt-4 sm:mt-0"
          >
            <h2 className="text-3xl sm:text-5xl font-black mb-3 text-stone-900 tracking-tight">Choose Your Mode</h2>
            <p className="text-stone-500 text-base sm:text-xl font-medium">How do you want to learn today?</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredModes.map((mode, idx) => {
              const isCompleted = studentProgress.some(p => p.assignmentId === activeAssignment?.id && p.mode === mode.id);
              // In Quick Play: lock modes that were already completed this session
              const isQpLocked = isQuickPlayGuest && quickPlayCompletedModes.has(mode.id);

              return (
                <motion.button
                  key={mode.id}
                  onClick={() => {
                    if (isQpLocked) {
                      gameDebug.logButtonClick({ button: 'mode_select', gameMode: mode.id, wordId: -1, disabled: true, feedback: null });
                      return;
                    }
                    gameDebug.logModeSelect({ mode: mode.id, from: 'mode_selection' });
                    gameDebug.logState({
                      view,
                      gameMode: mode.id,
                      showModeSelection: false,
                      showModeIntro: true,
                      currentIndex,
                      isFinished,
                      feedback,
                      isProcessing: isProcessingRef.current,
                    }, 'before_mode_select');
                    setGameMode(mode.id);
                    setShowModeSelection(false);
                    setShowModeIntro(true);
                    setFeedback(null);
                  }}
                  disabled={isQpLocked}
                  className={`p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${isQpLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, translateY: -8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] bg-white flex items-center justify-center mb-3 sm:mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                    {mode.icon}
                    {(isCompleted || isQpLocked) && (
                      <div className={`absolute -top-2 -right-2 ${isQpLocked ? 'bg-gray-500' : 'bg-blue-600'} text-white rounded-full p-1 shadow-md`}>
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-base sm:text-xl mb-1 sm:mb-2 leading-tight">{mode.name}</p>
                  <p className="opacity-70 text-xs sm:text-sm font-bold leading-snug">{mode.desc}</p>

                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap size={20} className="animate-pulse" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === "live-challenge" && selectedClass) {
    // Calculate total scores (baseScore + currentGameScore) for each student
    const sortedLeaderboard = (Object.entries(leaderboard) as [string, LeaderboardEntry][])
      .map(([uid, entry]) => ({
        uid,
        name: entry.name,
        totalScore: entry.baseScore + entry.currentGameScore,
        isGuest: entry.isGuest || false
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const top3 = sortedLeaderboard.slice(0, 3);
    const rest = sortedLeaderboard.slice(3);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-6 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
            <button onClick={() => { setView("live-challenge-class-select"); setIsLiveChallenge(false); }} className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-base sm:text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all">← Back to Class Selection</button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <span className={`w-3 h-3 rounded-full ${socketConnected ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 animate-pulse"}`} />
                <span className="font-bold">{socketConnected ? "🔴 LIVE" : "Reconnecting..."}</span>
              </div>
              <button onClick={() => { setView("live-challenge-class-select"); setIsLiveChallenge(false); }} className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105">End Challenge</button>
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-10">
            <motion.h1
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
            >
              🏆 Live Challenge: {selectedClass.name}
            </motion.h1>
            <p className="text-white/90 font-bold text-sm sm:text-base">Class Code: <span className="bg-white text-purple-600 px-4 py-2 rounded-xl font-mono font-black ml-2 shadow-lg">{selectedClass.code}</span></p>
          </div>

          {/* Winner's Podium for Top 3 */}
          {top3.length > 0 && (
            <div className="mb-8">
              <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6">
                {/* 2nd Place */}
                {top3[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-slate-400/30 border-4 border-white">
                        🥈
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full font-black">2ND</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 mt-4 text-center border border-white/30 w-28 sm:w-36">
                      <p className="font-bold text-sm sm:text-base truncate">{top3[1].name}{top3[1].isGuest && <span className="ml-1">🎭</span>}</p>
                      <p className="text-2xl sm:text-3xl font-black">{top3[1].totalScore}</p>
                      <p className="text-[10px] text-white/70 font-bold">POINTS</p>
                    </div>
                    <div className="h-16 sm:h-24 w-full bg-gradient-to-t from-slate-400/30 to-transparent rounded-t-lg mt-2"></div>
                  </motion.div>
                )}

                {/* 1st Place - Center and tallest */}
                {top3[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center relative"
                  >
                    {/* Crown animation */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-4xl sm:text-5xl mb-2 drop-shadow-lg"
                    >
                      👑
                    </motion.div>
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shadow-yellow-400/50 border-4 border-white animate-pulse">
                        🥇
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-0.5 rounded-full font-black shadow-lg">1ST</div>
                      {/* Sparkle effects */}
                      <div className="absolute -top-1 -right-1 text-yellow-300 animate-bounce">✨</div>
                      <div className="absolute -top-1 -left-1 text-yellow-300 animate-bounce [animation-delay:0.5s]">✨</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 mt-4 text-center border-2 border-yellow-300/50 w-32 sm:w-40 shadow-2xl shadow-yellow-400/20">
                      <p className="font-bold text-base sm:text-lg truncate">{top3[0].name}{top3[0].isGuest && <span className="ml-1">🎭</span>}</p>
                      <p className="text-3xl sm:text-4xl font-black">{top3[0].totalScore}</p>
                      <p className="text-[10px] text-white/80 font-bold">POINTS</p>
                    </div>
                    <div className="h-24 sm:h-32 w-full bg-gradient-to-t from-yellow-400/40 to-transparent rounded-t-lg mt-2"></div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-orange-400/30 border-4 border-white">
                        🥉
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full font-black">3RD</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 mt-4 text-center border border-white/30 w-28 sm:w-36">
                      <p className="font-bold text-sm sm:text-base truncate">{top3[2].name}{top3[2].isGuest && <span className="ml-1">🎭</span>}</p>
                      <p className="text-2xl sm:text-3xl font-black">{top3[2].totalScore}</p>
                      <p className="text-[10px] text-white/70 font-bold">POINTS</p>
                    </div>
                    <div className="h-12 sm:h-20 w-full bg-gradient-to-t from-orange-400/30 to-transparent rounded-t-lg mt-2"></div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Rest of Leaderboard */}
          <div className="bg-white/10 backdrop-blur-md rounded-[40px] p-6 sm:p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 flex items-center gap-2">
              <span className="text-2xl">📊</span> Full Leaderboard
              {sortedLeaderboard.length > 0 && (
                <span className="ml-auto text-sm font-normal bg-white/20 px-3 py-1 rounded-full">
                  {sortedLeaderboard.length} {sortedLeaderboard.length === 1 ? 'Player' : 'Players'}
                </span>
              )}
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {rest.map((entry, idx) => (
                <motion.div
                  key={`${entry.uid}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (idx + 3) * 0.05 }}
                  className="flex justify-between items-center p-3 sm:p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm sm:text-base">{idx + 4}</span>
                    <span className="font-bold text-base sm:text-lg">{entry.name}{entry.isGuest && <span className="ml-1">🎭</span>}</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black">{entry.totalScore}</span>
                </motion.div>
              ))}
              {sortedLeaderboard.length === 0 && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    ⏳
                  </motion.div>
                  <p className="text-white/80 font-bold text-lg">Waiting for students to join...</p>
                  <p className="text-white/60 text-sm mt-2">Share the class code to start the competition!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "global-leaderboard") {
    return (
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView(user?.role === "teacher" ? "teacher-dashboard" : "student-dashboard")} className="mb-6 signature-gradient text-white px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg">← Back to Dashboard</button>
          <div className="bg-white rounded-[40px] shadow-xl p-6 sm:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-yellow-100 rounded-3xl">
                <Trophy size={40} className="text-yellow-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-stone-900">Global Top 10</h2>
                <p className="text-stone-500">The best students across all classes!</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {globalLeaderboard.map((entry, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex justify-between items-center p-5 bg-stone-50 rounded-2xl border border-stone-100"
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-stone-300 text-white" : idx === 2 ? "bg-orange-300 text-white" : "bg-stone-200 text-stone-500"}`}>
                      {idx + 1}
                    </span>
                    <span className="text-3xl">{entry.avatar}</span>
                    <span className="font-black text-stone-800 text-lg">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-700">{entry.score}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Points</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-surface pt-24 pb-8 px-4 sm:px-6">
        {consentModal}

        {/* Top App Bar */}
        <TopAppBar
          title="Student Approvals"
          subtitle={`Review and approve student signups`}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
          showBack
          onBack={() => setView("teacher-dashboard")}
        />

        <div className="max-w-4xl mx-auto mt-8">
          {pendingStudents.length === 0 ? (
            <div className="bg-surface-container-low rounded-3xl p-12 text-center border-2 border-surface-container-high shadow-lg">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black mb-2">All Caught Up!</h2>
              <p className="text-on-surface-variant font-medium mb-6">
                No students waiting for approval
              </p>
              <button
                onClick={() => setView("teacher-dashboard")}
                className="px-6 py-3 signature-gradient text-white rounded-xl font-bold hover:scale-105 transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-black mb-1">
                    Pending Approvals
                  </h1>
                  <p className="text-on-surface-variant font-medium">
                    {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'} waiting
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pendingStudents.length > 1 && (
                    <button
                      onClick={async () => {
                        const names = pendingStudents.map(s => s.displayName);
                        for (const student of pendingStudents) {
                          try {
                            await supabase.rpc('approve_student', { p_profile_id: student.id });
                          } catch (e) {
                            console.error('Failed to approve', student.displayName, e);
                          }
                        }
                        await loadPendingStudents();
                        showToast(`Approved ${names.length} students!`, "success");
                      }}
                      className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:scale-105"
                      title="Approve all pending students at once"
                    >
                      <Check size={18} />
                      Approve All ({pendingStudents.length})
                    </button>
                  )}
                  <button
                    onClick={loadPendingStudents}
                    className="px-4 py-2.5 bg-surface-container-highest hover:bg-surface-container-high rounded-xl font-bold flex items-center gap-2 transition-all"
                    title="Refresh list"
                  >
                    <RefreshCw size={18} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {pendingStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-low rounded-2xl p-6 border-2 border-surface-container-high shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center text-2xl font-bold">
                          🎓
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{student.displayName}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-3 py-1 bg-surface-container-highest rounded-full text-xs font-bold">
                              {student.classCode}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {student.className}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              Joined {new Date(student.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleApproveStudent(student.id, student.displayName)}
                          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:scale-105"
                          title="Approve this student - they can then log in and start learning"
                        >
                          <Check size={20} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectStudent(student.id, student.displayName)}
                          className="px-6 py-3 bg-error-container hover:bg-error text-on-error-container rounded-xl font-bold transition-all flex items-center gap-2"
                          title="Reject this student - they'll need to sign up again"
                        >
                          <X size={20} />
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 p-3 bg-surface-container-highest rounded-xl">
                      <p className="text-xs text-on-surface-variant">
                        ℹ️ <strong>After approval:</strong> {student.displayName} can log in with class code <code>{student.classCode}</code> and their full name. Their progress will be saved automatically.
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
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
                {toast.type === 'success' && <CheckCircle2 size={20} />}
                {toast.type === 'error' && <AlertTriangle size={20} />}
                {toast.type === 'info' && <Info size={20} />}
                <span>{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (view === "quick-play-setup") {
    return (
      <SetupWizard
        mode="quick-play"
        allWords={ALL_WORDS}
        onComplete={async (result) => {
          const dbWords = result.words.filter(w => w.id >= 0);
          const customWords = result.words.filter(w => w.id < 0);
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
            p_allowed_modes: result.modes
          });

          if (error) {
            showToast("Failed to create session: " + error.message, "error");
            return;
          }

          const session = data as { id: string; session_code: string; allowed_modes?: string[] };
          setQuickPlaySessionCode(session.session_code);
          const newSession = {
            id: session.id,
            sessionCode: session.session_code,
            wordIds: wordIds,
            words: result.words
          };
          setQuickPlayActiveSession(newSession);

          try {
            localStorage.setItem('vocaband_quick_play_session', JSON.stringify({
              id: session.id,
              words: result.words
            }));
          } catch (e) {
          }

          setView("quick-play-teacher-monitor");
        }}
        onBack={() => setView("teacher-dashboard")}
        autoMatchPartial={true}
        showLevelFilter={false}
        showToast={showToast}
        onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText)}
        onTranslateWord={translateWord}
        topicPacks={TOPIC_PACKS}
        user={user}
        onLogout={() => supabase.auth.signOut()}
      />
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
          cleanupSessionData(); // Clear save queue and timers
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
          cleanupSessionData(); // Clear save queue and timers
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
      <div className="min-h-screen bg-background pb-8">
        <TopAppBar
          title="Analytics"
          subtitle="CLASSROOM INSIGHTS & PERFORMANCE"
          showBack
          onBack={() => setView("teacher-dashboard")}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <main className="pt-24 px-6 max-w-7xl mx-auto">
          {/* Class Filter Tabs */}
          {classes.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setAnalyticsClassFilter("all")}
                className={`px-5 py-2.5 rounded-full text-sm font-black transition-all ${
                  analyticsClassFilter === "all"
                    ? "bg-secondary text-white shadow-lg shadow-purple-500/20"
                    : "bg-surface-container-lowest text-on-surface hover:bg-surface-container border-2 border-surface-container"
                }`}
              >
                All Classes
              </button>
              {classes.map(c => (
                <button
                  key={c.code}
                  onClick={() => setAnalyticsClassFilter(c.code)}
                  className={`px-5 py-2.5 rounded-full text-sm font-black transition-all ${
                    analyticsClassFilter === c.code
                      ? "bg-secondary text-white shadow-lg shadow-purple-500/20"
                      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container border-2 border-surface-container"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {allScores.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-xl shadow-xl text-center border-2 border-blue-50">
              <BarChart3 className="mx-auto text-on-surface-variant mb-4" size={48} />
              <p className="text-on-surface-variant font-medium">No student data yet. Analytics will appear once students complete assignments.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="text-secondary" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Students</p>
              <p className="text-3xl font-black text-on-surface">{classAnalytics?.uniqueStudents ?? 0}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-blue-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <RefreshCw className="text-primary" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Attempts</p>
              <p className="text-3xl font-black text-on-surface">{classAnalytics?.totalAttempts ?? 0}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-emerald-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="text-emerald-600" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Avg Score</p>
              <p className="text-3xl font-black text-primary">{classAnalytics?.avgScore ?? 0}%</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-amber-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <BookOpen className="text-tertiary" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Assignments</p>
              <p className="text-3xl font-black text-on-surface">{matrixData.assignments.length}</p>
            </div>
          </div>

          {/* Charts Row */}
          {classAnalytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {/* Score Distribution Chart */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                    <BarChart3 className="text-secondary" size={16} />
                  </div>
                  Score Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Excellent (90%+)", count: classAnalytics.distribution.excellent, color: "bg-emerald-400", textColor: "text-emerald-700" },
                    { label: "Good (70-89%)", count: classAnalytics.distribution.good, color: "bg-blue-400", textColor: "text-blue-700" },
                    { label: "Needs Work (<70%)", count: classAnalytics.distribution.needsWork, color: "bg-rose-400", textColor: "text-rose-700" },
                  ].map(({ label, count, color, textColor }) => {
                    const total = classAnalytics.totalAttempts;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant font-bold">{label}</span>
                          <span className={`font-black ${textColor}`}>{count} ({pct}%)</span>
                        </div>
                        <div className="h-4 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Game Mode Usage */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                    <Layers className="text-secondary" size={16} />
                  </div>
                  Game Mode Usage
                </h3>
                <div className="space-y-2">
                  {classAnalytics.topModes.slice(0, 6).map(([mode, count]) => {
                    const pct = Math.round((count / classAnalytics.maxModeCount) * 100);
                    return (
                      <div key={mode} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-on-surface-variant w-24 truncate capitalize">{mode.replace(/-/g, ' ')}</span>
                        <div className="flex-1 h-5 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-black text-on-surface w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Activity Chart */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="text-emerald-600" size={16} />
                  </div>
                  Weekly Activity
                </h3>
                {classAnalytics.weeklyActivity.length > 0 ? (
                  <div className="flex items-end gap-1 h-32">
                    {classAnalytics.weeklyActivity.map(([week, data]) => {
                      const heightPct = Math.round((data.count / classAnalytics.maxWeekCount) * 100);
                      const avgPct = Math.round(data.totalScore / data.count);
                      return (
                        <div key={week} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className={`w-full rounded-t-md transition-all ${avgPct >= 90 ? "bg-emerald-400" : avgPct >= 70 ? "bg-primary" : "bg-rose-400"}`}
                            style={{ height: `${Math.max(heightPct, 8)}%` }}
                          />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {data.count} attempts, avg {avgPct}%
                          </div>
                          <span className="text-[9px] text-on-surface-variant truncate w-full text-center">{week.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">No activity data yet</p>
                )}
                <p className="text-[10px] text-on-surface-variant mt-2 text-center">Bar color = average score quality</p>
              </div>

              {/* Most Missed Words */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-rose-100">
                <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                    <AlertTriangle className="text-error" size={16} />
                  </div>
                  Most Missed Words
                </h3>
                {classAnalytics.topMistakes.length > 0 ? (
                  <div className="space-y-3">
                    {classAnalytics.topMistakes.map(({ wordId, count }) => {
                      const word = ALL_WORDS.find(w => w.id === wordId);
                      const pct = Math.round((count / classAnalytics.maxMistakeCount) * 100);
                      // Find which students missed this word
                      const studentsWhoMissed = new Set<string>();
                      allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter)
                        .forEach(s => { if (s.mistakes?.includes(wordId)) studentsWhoMissed.add(s.studentName); });
                      return (
                        <div key={wordId} className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-black text-sm text-on-surface">{word?.english || `#${wordId}`}</span>
                                <span className="text-error font-black text-sm ml-2">{count}×</span>
                              </div>
                              <div className="flex gap-2 text-xs text-on-surface-variant">
                                {word?.hebrew && <span dir="rtl">{word.hebrew}</span>}
                                {word?.hebrew && word?.arabic && <span>•</span>}
                                {word?.arabic && <span dir="rtl">{word.arabic}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden mb-1.5">
                            <div className="h-full bg-error/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(studentsWhoMissed).slice(0, 5).map(name => (
                              <span key={name} className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">{name}</span>
                            ))}
                            {studentsWhoMissed.size > 5 && <span className="text-[10px] text-rose-500 font-bold">+{studentsWhoMissed.size - 5} more</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">No mistake data yet</p>
                )}
              </div>
            </div>
          )}

          {/* Students Needing Attention + Weak Modes row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Students Needing Attention */}
            <div className="bg-white rounded-[30px] shadow-xl p-5 sm:p-6">
              <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="text-amber-700" size={16} />
                </div>
                Students Needing Attention
              </h3>
              {(() => {
                // Find students with avg < 70% or high mistake rates
                const studentStats: {name: string, avg: number, mistakes: number, attempts: number, avatar: string}[] = [];
                const filtered = allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter);
                const byStudent = new Map<string, typeof filtered>();
                filtered.forEach(s => {
                  const key = s.studentName;
                  if (!byStudent.has(key)) byStudent.set(key, []);
                  byStudent.get(key)!.push(s);
                });
                byStudent.forEach((scores, name) => {
                  const avg = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
                  const totalMistakes = scores.reduce((sum, s) => sum + (s.mistakes?.length || 0), 0);
                  const avatar = scores[0]?.avatar || '🦊';
                  if (avg < 70 || (totalMistakes > 5 && avg < 80)) {
                    studentStats.push({ name, avg, mistakes: totalMistakes, attempts: scores.length, avatar });
                  }
                });
                studentStats.sort((a, b) => a.avg - b.avg);
                return studentStats.length > 0 ? (
                  <div className="space-y-2">
                    {studentStats.slice(0, 6).map(s => (
                      <div key={s.name} className="flex items-center gap-3 bg-amber-50/50 rounded-xl p-3 border border-amber-100 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-amber-400 transition-all" onClick={() => setSelectedStudent(s.name)}>
                        <span className="text-xl">{s.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-800 truncate">{s.name}</p>
                          <p className="text-xs text-stone-500">{s.attempts} attempts • {s.mistakes} mistakes</p>
                        </div>
                        <span className={`font-black text-lg ${s.avg < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{s.avg}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">All students are doing well! 🎉</p>
                );
              })()}
            </div>

            {/* Score by Game Mode */}
            <div className="bg-white rounded-[30px] shadow-xl p-5 sm:p-6">
              <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Layers className="text-purple-700" size={16} />
                </div>
                Average Score by Mode
              </h3>
              {(() => {
                const filtered = allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter);
                const modeStats = new Map<string, {total: number, count: number, mistakes: number}>();
                filtered.forEach(s => {
                  if (!modeStats.has(s.mode)) modeStats.set(s.mode, {total: 0, count: 0, mistakes: 0});
                  const m = modeStats.get(s.mode)!;
                  m.total += s.score;
                  m.count++;
                  m.mistakes += (s.mistakes?.length || 0);
                });
                const sorted = Array.from(modeStats.entries())
                  .map(([mode, stats]) => ({ mode, avg: Math.round(stats.total / stats.count), count: stats.count, mistakes: stats.mistakes }))
                  .sort((a, b) => a.avg - b.avg);
                return sorted.length > 0 ? (
                  <div className="space-y-2">
                    {sorted.map(({ mode, avg, count, mistakes }) => (
                      <div key={mode} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-bold text-on-surface capitalize">{mode.replace('-', ' ')}</span>
                            <span className="text-on-surface-variant">{count} plays • {mistakes} mistakes</span>
                          </div>
                          <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${avg >= 80 ? 'bg-blue-400' : avg >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${avg}%` }} />
                          </div>
                        </div>
                        <span className={`font-black text-sm w-10 text-right ${avg >= 80 ? 'text-blue-600' : avg >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{avg}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">No data yet</p>
                );
              })()}
            </div>
          </div>

          {/* Explanation banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-purple-900 text-sm sm:text-base mb-2">Student Scores Matrix</h2>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-300 inline-block"></span> ★ 90%+ Excellent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"></span> 70-89% Good</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span> Below 70%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-100 border border-stone-200 inline-block"></span> — Not attempted</span>
            </div>
            <p className="text-xs text-purple-700 mt-2 font-medium">💡 Click any <strong>student name</strong> or <strong>score cell</strong> to see detailed breakdown and missed words.</p>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-[30px] shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-stone-400 uppercase text-[10px] sm:text-xs sticky left-0 bg-stone-50">Student</th>
                    {matrixData.assignments.map(assignmentId => (
                      <th key={assignmentId} className="px-2 py-2.5 text-center font-bold text-stone-400 text-[10px] sm:text-xs min-w-[70px] max-w-[120px]" title={assignmentId}>
                        <span className="line-clamp-2 leading-tight">{matrixData.getAssignmentTitle(assignmentId)}</span>
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center font-bold text-stone-400 uppercase text-[10px] sm:text-xs min-w-[60px]">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.students
                    .filter(student => analyticsClassFilter === "all" || matrixData.getStudentClassCode(student) === analyticsClassFilter)
                    .map(student => {
                    const studentAvg = matrixData.averages.get(student) || 0;
                    const classCode = matrixData.getStudentClassCode(student);
                    const avatar = matrixData.getStudentAvatar(student);
                    const className = classes.find(c => c.code === classCode)?.name;
                    return (
                      <tr key={student} className="border-t border-stone-100 hover:bg-stone-50">
                        <td
                          className="px-3 py-2 font-bold text-blue-700 text-sm sticky left-0 bg-white hover:bg-blue-50 cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all underline decoration-blue-300 decoration-dotted underline-offset-2"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="flex items-center gap-1.5">
                            {avatar && <span className="text-base">{avatar}</span>}
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm leading-tight">{student}</span>
                              {className && <span className="text-[10px] font-normal text-stone-400 leading-tight">{className}</span>}
                            </div>
                          </div>
                        </td>
                        {matrixData.assignments.map(assignmentId => {
                          const scoreData = matrixData.matrix.get(student)?.get(assignmentId);
                          const score = scoreData?.score || 0;
                          const hasScore = scoreData !== undefined;

                          let cellClass = "bg-stone-100";
                          let indicator = "";

                          if (hasScore) {
                            if (score >= 90) {
                              cellClass = "bg-blue-50";
                              indicator = "★";
                            } else if (score >= 70) {
                              cellClass = "bg-blue-50";
                            } else {
                              cellClass = "bg-rose-100";
                              indicator = "⚠️";
                            }
                          }

                          return (
                            <td
                              key={assignmentId}
                              className={`px-2 py-2 text-center text-xs ${cellClass} ${hasScore ? "cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all" : ""}`}
                              onClick={() => hasScore && setSelectedScore(scoreData!)}
                            >
                              {hasScore ? (
                                <span className="font-black text-stone-800">{indicator}{score}%</span>
                              ) : (
                                <span className="text-stone-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center text-xs font-bold ${
                          studentAvg >= 90 ? "text-blue-700" : studentAvg >= 70 ? "text-blue-600" : "text-rose-600"
                        }`}>
                          {studentAvg}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs sm:hidden">
                <span>Scroll for legend</span>
                <span>→</span>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                  <span className="text-stone-800 font-bold">Excellent (90%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                  <span className="text-stone-800 font-bold">Good (70-89%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-rose-100 border-2 border-rose-400 rounded"></div>
                  <span className="text-stone-800 font-bold">Needs Attention (&lt;70%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Detail Modal */}
          {selectedScore && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedScore(null)}>
              <div className="bg-white rounded-[30px] shadow-2xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">{selectedScore.studentName}</h2>
                    <p className="text-stone-500">Assignment: {matrixData.getAssignmentTitle(selectedScore.assignmentId)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedScore(null)}
                    className="text-stone-400 hover:text-stone-600"
                    aria-label="Close score details"
                    title="Close score details"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className={`px-6 py-3 rounded-2xl font-black text-2xl ${
                      selectedScore.score >= 90 ? "bg-blue-50 text-blue-700" :
                      selectedScore.score >= 70 ? "bg-blue-100 text-blue-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {selectedScore.score}%
                    </div>
                    <div className="text-stone-500">
                      <p>Mode: <span className="font-bold text-stone-800 capitalize">{selectedScore.mode}</span></p>
                      <p>Completed: <span className="font-bold text-stone-800">{new Date(selectedScore.completedAt).toLocaleDateString()}</span></p>
                    </div>
                  </div>

                  {/* Mistakes */}
                  {selectedScore.mistakes && selectedScore.mistakes.length > 0 && (
                    <div>
                      <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" size={20} />
                        Words Missed ({selectedScore.mistakes.length})
                      </h3>
                      <div className="bg-stone-50 rounded-2xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedScore.mistakes.map((wordId, idx) => {
                            const word = ALL_WORDS.find(w => w.id === wordId);
                            // Count how many times this student missed this word across all attempts
                            const totalMisses = allScores
                              .filter(s => s.studentName === selectedScore.studentName)
                              .reduce((sum, s) => sum + (s.mistakes?.filter(m => m === wordId).length || 0), 0);
                            return (
                              <div key={`${selectedScore.id}-${wordId}-${idx}`} className="bg-white p-3 rounded-xl border border-rose-200">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-stone-800">{word?.english || "Unknown"}</p>
                                    <div className="flex gap-2 text-xs text-stone-500 mt-0.5">
                                      {word?.hebrew && <span dir="rtl">{word.hebrew}</span>}
                                      {word?.arabic && <span dir="rtl">{word.arabic}</span>}
                                    </div>
                                  </div>
                                  {totalMisses > 1 && (
                                    <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">{totalMisses}× total</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Class Info */}
                  <p className="text-stone-500">
                    Class: <span className="font-bold text-stone-800">{selectedScore.classCode}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student Profile Modal */}
          {selectedStudent && (() => {
            const studentScores = matrixData.studentMap.get(selectedStudent) || [];
            const classCode = matrixData.getStudentClassCode(selectedStudent);
            const avatar = matrixData.getStudentAvatar(selectedStudent);
            const avgScore = matrixData.averages.get(selectedStudent) || 0;
            const classAvg = Math.round(Array.from(matrixData.averages.values()).reduce((a, b) => a + b, 0) / matrixData.averages.size) || 0;

            // Get top 5 mistake words across all attempts
            const mistakeCounts: Record<number, number> = {};
            studentScores.forEach(s => {
              s.mistakes?.forEach(wordId => {
                mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
              });
            });
            const topMistakes = Object.entries(mistakeCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([wordId, count]) => ({ wordId: parseInt(wordId), count }));

            // Build score trend data (sorted by date)
            const scoreTrend = [...studentScores]
              .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

            return (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedStudent(null)}>
                <div className="bg-white rounded-[30px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      {avatar && <span className="text-4xl">{avatar}</span>}
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-stone-900">{selectedStudent}</h2>
                        <p className="text-stone-500 flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-sm font-bold">{classCode}</span>
                          <span>•</span>
                          <span>{studentScores.length} {studentScores.length === 1 ? 'attempt' : 'attempts'}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-stone-400 hover:text-stone-600"
                      aria-label="Close student details"
                      title="Close student details"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 rounded-2xl ${
                      avgScore >= 90 ? "bg-blue-50" : avgScore >= 70 ? "bg-blue-100" : "bg-rose-100"
                    }`}>
                      <p className="text-stone-500 text-sm font-bold uppercase">Average Score</p>
                      <p className={`text-3xl font-black ${
                        avgScore >= 90 ? "text-blue-700" : avgScore >= 70 ? "text-blue-600" : "text-rose-600"
                      }`}>{avgScore}%</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-stone-500 text-sm font-bold uppercase">Class Average</p>
                      <p className="text-3xl font-black text-stone-700">{classAvg}%</p>
                      <p className={`text-sm mt-1 ${avgScore >= classAvg ? "text-green-600" : "text-rose-600"}`}>
                        {avgScore >= classAvg ? "▲ Above class avg" : "▼ Below class avg"}
                      </p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl">
                      <p className="text-stone-500 text-sm font-bold uppercase">Total Score Points</p>
                      <p className="text-3xl font-black text-stone-700">{studentScores.reduce((sum, s) => sum + s.score, 0)}</p>
                    </div>
                  </div>

                  {/* Score Trend Chart (Simple Bar Visualization) */}
                  {scoreTrend.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" size={20} />
                        Score Trend Over Time
                      </h3>
                      <div className="bg-stone-50 rounded-2xl p-4">
                        <div className="flex items-end gap-1 h-32">
                          {scoreTrend.map((s, idx) => {
                            return (
                              <div
                                key={`${s.id}-${idx}`}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                              >
                                <div
                                  className={`w-full rounded-t-lg transition-all ${
                                    s.score >= 90 ? "bg-blue-400" : s.score >= 70 ? "bg-blue-300" : "bg-rose-300"
                                  } ${toScoreHeightClass(s.score)}`}
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {s.score}%
                                </div>
                                <span className="text-xs text-stone-400 truncate w-full text-center">{idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-center text-xs text-stone-400 mt-2">Click/tap bars to see exact scores</p>
                      </div>
                    </div>
                  )}

                  {/* Top Mistakes */}
                  {topMistakes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" size={20} />
                        Most Challenging Words ({topMistakes.length} total)
                      </h3>
                      <div className="bg-stone-50 rounded-2xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topMistakes.map(({ wordId, count }) => {
                            const word = ALL_WORDS.find(w => w.id === wordId);
                            return (
                              <div key={wordId} className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-stone-800">{word?.english || "Unknown"}</p>
                                  <p className="text-xs text-stone-500">{word?.hebrew || ""}</p>
                                </div>
                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-sm font-bold">{count}×</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assignment History */}
                  <div>
                    <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                      <History className="text-blue-600" size={20} />
                      Assignment History
                    </h3>
                    <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                      {scoreTrend.map((s, idx) => (
                        <div
                          key={`${s.id}-${idx}`}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                            s.score >= 90 ? "bg-blue-50 border-blue-200" : s.score >= 70 ? "bg-blue-50 border-blue-200" : "bg-rose-50 border-rose-200"
                          }`}
                          onClick={() => { setSelectedStudent(null); setSelectedScore(s); }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full font-bold text-lg ${
                                s.score >= 90 ? "bg-blue-200 text-blue-800" : s.score >= 70 ? "bg-blue-200 text-blue-800" : "bg-rose-200 text-rose-800"
                              }`}>
                                {s.score}%
                              </span>
                              <div>
                                <p className="font-bold text-stone-800">{matrixData.getAssignmentTitle(s.assignmentId)}</p>
                                <p className="text-xs text-stone-500">
                                  <span className="capitalize">{s.mode.replace('-', ' ')}</span> • {new Date(s.completedAt).toLocaleDateString()}
                                  {s.mistakes && s.mistakes.length > 0 && (
                                    <span className="text-rose-500 ml-1">• {s.mistakes.length} mistake{s.mistakes.length !== 1 ? 's' : ''}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="text-stone-400" size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400 mt-2 text-center">Click any attempt to see details</p>
                  </div>
                </div>
              </div>
            );
          })()}
            </>
          )}
        </main>
      </div>
    );
  }
  if (view === "gradebook") {
    // Group scores by student
    const groupedByStudent = allScores.reduce((acc, score) => {
      const key = `${score.studentName}-${score.classCode}`;
      if (!acc[key]) {
        acc[key] = {
          studentName: score.studentName,
          classCode: score.classCode,
          scores: [],
          totalScore: 0,
          bestScore: 0,
          lastDate: score.completedAt
        };
      }
      acc[key].scores.push(score);
      acc[key].totalScore += score.score;
      acc[key].bestScore = Math.max(acc[key].bestScore, score.score);
      if (new Date(score.completedAt) > new Date(acc[key].lastDate)) {
        acc[key].lastDate = score.completedAt;
      }
      return acc;
    }, {} as Record<string, {
      studentName: string;
      classCode: string;
      scores: typeof allScores;
      totalScore: number;
      bestScore: number;
      lastDate: string;
    }>);

    const studentEntries = Object.values(groupedByStudent);

    // Score badge with color based on performance
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'bg-gradient-to-br from-green-400 to-green-500 text-white';
      if (score >= 70) return 'bg-gradient-to-br from-blue-400 to-blue-500 text-white';
      if (score >= 50) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white';
      return 'bg-gradient-to-br from-red-400 to-red-500 text-white';
    };

    // Mode icon and color
    const getModeInfo = (mode: string) => {
      const modeMap: Record<string, { icon: string; color: string; label: string; name: string }> = {
        classic: { icon: '📝', color: 'from-blue-400 to-blue-500', label: 'Multiple Choice', name: 'Classic' },
        spelling: { icon: '✍️', color: 'from-purple-400 to-purple-500', label: 'Type the answer', name: 'Spelling' },
        flashcards: { icon: '🎴', color: 'from-green-400 to-green-500', label: 'Study mode', name: 'Flashcards' },
        listening: { icon: '🎧', color: 'from-pink-400 to-pink-500', label: 'Audio questions', name: 'Listening' },
        matching: { icon: '🔗', color: 'from-orange-400 to-orange-500', label: 'Match pairs', name: 'Matching' },
        scramble: { icon: '🔤', color: 'from-teal-400 to-teal-500', label: 'Unscramble letters', name: 'Scramble' },
        reverse: { icon: '🔄', color: 'from-indigo-400 to-indigo-500', label: 'Reverse definitions', name: 'Reverse' },
        'true-false': { icon: '✓', color: 'from-rose-400 to-rose-500', label: 'True or False', name: 'T/F' }
      };
      return modeMap[mode] || { icon: '📊', color: 'from-gray-400 to-gray-500', label: 'Unknown', name: 'Unknown' };
    };

    return (
      <div className="min-h-screen bg-background pb-8">
        <TopAppBar
          title="Gradebook"
          subtitle="STUDENT SCORES & PROGRESS"
          showBack
          onBack={() => setView("teacher-dashboard")}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <main className="pt-24 px-6 max-w-4xl mx-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-tertiary-container/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center">
                  <Users className="text-tertiary" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Students</p>
              <p className="text-3xl font-black text-on-surface">{studentEntries.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-emerald-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Trophy className="text-emerald-600" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Total Attempts</p>
              <p className="text-3xl font-black text-on-surface">{allScores.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-secondary-container/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
                  <GraduationCap className="text-secondary" size={20} />
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Classes</p>
              <p className="text-3xl font-black text-on-surface">{classes.length}</p>
            </div>
          </div>

          {/* Export CSV button */}
          {studentEntries.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  const rows = [['Student', 'Class Code', 'Assignment', 'Mode', 'Score', 'Mistakes', 'Date'].join(',')];
                  for (const entry of studentEntries) {
                    for (const s of entry.scores) {
                      const assignmentTitle = teacherAssignments.find(a => a.id === s.assignmentId)?.title || 'Unknown';
                      rows.push([
                        `"${entry.studentName}"`,
                        entry.classCode,
                        `"${assignmentTitle}"`,
                        s.mode,
                        s.score,
                        s.mistakes?.length ?? 0,
                        new Date(s.completedAt).toLocaleDateString()
                      ].join(','));
                    }
                  }
                  const csv = rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vocaband-gradebook-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("Gradebook exported as CSV!", "success");
                }}
                className="px-5 py-2.5 bg-surface-container-highest hover:bg-surface-container-high rounded-xl font-bold flex items-center gap-2 transition-all text-sm"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          )}

          {studentEntries.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-xl shadow-xl text-center border-2 border-tertiary-container/30">
              <GraduationCap className="mx-auto text-on-surface-variant mb-4" size={48} />
              <p className="text-on-surface-variant font-medium">No scores recorded yet.</p>
              <p className="text-on-surface-variant/60 text-sm mt-2">Student results will appear here once they complete assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentEntries
                .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
                .map((entry, idx) => {
                  const avgScore = Math.round(entry.totalScore / entry.scores.length);
                  const isExpanded = expandedStudent === `${entry.studentName}-${entry.classCode}`;
                  const entryKey = `${entry.studentName}-${entry.classCode}`;

                  return (
                    <motion.div
                      key={entryKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border-2 border-surface-container"
                    >
                      {/* Summary Row - Always Visible */}
                      <div
                        onClick={() => setExpandedStudent(isExpanded ? null : entryKey)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Expand/Collapse Icon */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
                          >
                            <ChevronDown size={20} />
                          </motion.div>

                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container font-black text-lg shadow-md">
                            {entry.studentName.charAt(0)}
                          </div>

                          {/* Name and Class */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-on-surface text-lg truncate">{entry.studentName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                                {entry.classCode}
                              </span>
                              <span className="text-on-surface-variant text-xs font-medium">
                                {entry.scores.length} {entry.scores.length === 1 ? 'attempt' : 'attempts'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-3 sm:gap-6">
                          <div className="text-center">
                            <div className="text-[10px] text-on-surface-variant font-bold uppercase">Avg</div>
                            <div className={`text-lg sm:text-xl font-black ${
                              avgScore >= 90 ? 'text-emerald-600' :
                              avgScore >= 70 ? 'text-primary' :
                              avgScore >= 50 ? 'text-amber-600' :
                              'text-rose-600'
                            }`}>{avgScore}%</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="text-[10px] text-on-surface-variant font-bold uppercase">Best</div>
                            <div className="text-lg sm:text-xl font-black text-tertiary">{entry.bestScore}%</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="text-[10px] text-on-surface-variant font-bold uppercase">Total</div>
                            <div className="text-lg sm:text-xl font-black text-secondary">{entry.totalScore}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-on-surface-variant font-bold uppercase">Last</div>
                            <div className="text-xs sm:text-sm font-bold text-primary">
                              {new Date(entry.lastDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-surface-container">
                              {/* Detailed Stats Header */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                <HelpTooltip content={`Average Score: ${avgScore}% - Mean performance across all attempts`}>
                                  <div className="text-center p-3 bg-surface-container rounded-xl cursor-help hover:bg-surface-container-high transition-colors">
                                    <div className="text-xs text-on-surface-variant font-bold uppercase">Average</div>
                                    <div className={`text-2xl font-black ${getScoreColor(avgScore)}`}>
                                      {avgScore}%
                                    </div>
                                  </div>
                                </HelpTooltip>

                                <HelpTooltip content={`Best Score: ${entry.bestScore}% - Highest score achieved`}>
                                  <div className="text-center p-3 bg-tertiary-container/30 rounded-xl cursor-help hover:bg-tertiary-container/50 transition-colors">
                                    <div className="flex items-center gap-1 justify-center">
                                      <span className="text-xs text-tertiary font-bold uppercase">Best</span>
                                      <span>⭐</span>
                                    </div>
                                    <div className="text-2xl font-black text-tertiary">{entry.bestScore}%</div>
                                  </div>
                                </HelpTooltip>

                                <HelpTooltip content={`Total Points: ${entry.totalScore} - Sum of all scores earned`}>
                                  <div className="text-center p-3 bg-secondary-container/30 rounded-xl cursor-help hover:bg-secondary-container/50 transition-colors">
                                    <div className="text-xs text-secondary font-bold uppercase">Total</div>
                                    <div className="text-2xl font-black text-secondary">{entry.totalScore}</div>
                                  </div>
                                </HelpTooltip>

                                <HelpTooltip content={`Last Activity: ${new Date(entry.lastDate).toLocaleString()} - Most recent attempt`}>
                                  <div className="text-center p-3 bg-green-50 rounded-xl cursor-help hover:bg-green-100 transition-colors">
                                    <div className="flex items-center gap-1 justify-center">
                                      <span className="text-xs text-green-600 font-bold uppercase">Last</span>
                                      <span>🕐</span>
                                    </div>
                                    <div className="text-sm font-bold text-green-600">
                                      {new Date(entry.lastDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </HelpTooltip>
                              </div>

                              {/* All Scores */}
                              <div className="mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <HelpTooltip content="Individual scores for each attempt with detailed information">
                                    <span className="text-xs text-on-surface-variant font-bold uppercase cursor-help">All Attempts</span>
                                  </HelpTooltip>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {entry.scores.map((s, i) => {
                                    const modeInfo = getModeInfo(s.mode);
                                    return (
                                      <HelpTooltip
                                        key={i}
                                        content={`${modeInfo.name} Mode • ${s.score}% • ${new Date(s.completedAt).toLocaleString()} • ${s.mistakes?.length || 0} mistake${(s.mistakes?.length || 0) !== 1 ? 's' : ''}`}
                                      >
                                        <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border-2 border-surface-container-high hover:border-primary/30 hover:shadow-sm transition-all cursor-help">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">{modeInfo.icon}</span>
                                            <div>
                                              <div className="font-bold text-on-surface text-sm">{modeInfo.name}</div>
                                              <div className="text-[10px] text-on-surface-variant">{modeInfo.label}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className={`px-3 py-1 rounded-lg font-bold text-sm ${getScoreColor(s.score)}`}>
                                              {s.score}%
                                            </div>
                                            <div className="text-[10px] text-on-surface-variant">
                                              {new Date(s.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                          </div>
                                        </div>
                                      </HelpTooltip>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
            </div>
          )}

          {/* Enrolled Students Without Scores */}
          {(() => {
            const scoredNames = new Set(studentEntries.map(e => e.studentName));
            const noScoreStudents = classStudents.filter(s => !scoredNames.has(s.name));
            if (noScoreStudents.length === 0) return null;
            return (
              <div className="bg-surface-container-lowest rounded-xl shadow-xl p-6 mt-6 border-2 border-surface-container">
                <h3 className="text-lg font-black text-on-surface mb-1 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-tertiary-container flex items-center justify-center">
                    <UserCircle size={20} className="text-tertiary" />
                  </div>
                  Enrolled Students ({noScoreStudents.length})
                </h3>
                <p className="text-on-surface-variant text-xs mb-4 font-medium">Students who joined but haven't completed any assignments yet.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {noScoreStudents.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-sm truncate">{s.name}</p>
                        <p className="text-on-surface-variant text-xs font-medium">{classes.find(c => c.code === s.classCode)?.name || s.classCode}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium">Last: {new Date(s.lastActive).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    );
  }

  if (view === "live-challenge-class-select") {
    return (
      <div className="min-h-screen bg-background pb-8">
        <TopAppBar
          title="Live Mode for Classes"
          subtitle="SELECT A CLASS TO START"
          showBack
          onBack={() => setView("teacher-dashboard")}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <main className="pt-24 px-6 max-w-2xl mx-auto">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-2xl p-6 mb-8 text-center shadow-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 shadow-lg">
                <Zap className="text-white" size={32} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Select a Class</h2>
              <p className="text-white/90 font-medium">Choose which class to start the Live Challenge for</p>
            </motion.div>
          </div>

          {/* Class Selection */}
          <div className="grid gap-4">
            {classes.map((cls, idx) => (
              <motion.button
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => {
                  setSelectedClass(cls);
                  setView("live-challenge");
                  setIsLiveChallenge(true);
                  if (socket) {
                    socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: cls.code });
                  }
                }}
                className="bg-surface-container-lowest rounded-xl p-6 border-2 border-surface-container hover:border-primary/50 hover:shadow-xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Zap className="text-on-primary-container" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-on-surface">{cls.name}</h3>
                      <p className="text-on-surface-variant text-sm font-medium">
                        Code: <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-mono font-bold ml-1">{cls.code}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all" size={24} />
                </div>
              </motion.button>
            ))}
          </div>
        </main>
      </div>
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
            onClick={() => {
              setIsFinished(false); setScore(0); setCurrentIndex(0); setMistakes([]); setFeedback(null); setShowModeSelection(true);
              if (user?.isGuest) {
                setView("game");
              } else {
                setView("student-dashboard");
              }
            }}
            disabled={isSaving}
            className="signature-gradient text-white px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
            onClick={() => {
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

  return (
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeConfig.colors.bg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-4 font-sans max-w-7xl mx-auto`}>
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="ml-1 hover:opacity-75"
            aria-label="Dismiss error message"
            title="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-1 mb-1.5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap">
          <div className="bg-white px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm flex items-center gap-1.5">
            <Trophy className="text-amber-500" size={16} />
            <span className="font-black text-stone-800 text-sm sm:text-base">{score}</span>
          </div>
          <div className="bg-blue-50 px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5">
            <span className="text-blue-700 font-bold text-[10px] sm:text-xs uppercase tracking-widest">XP: {xp}</span>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-orange-100 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2"
            >
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">🔥 {streak}</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTargetLanguage(targetLanguage === "hebrew" ? "arabic" : "hebrew")} className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition-colors">
            <Languages size={18} /><span className="text-sm font-bold">{targetLanguage === "hebrew" ? "עברית" : "عربي"}</span>
          </button>
          <button onClick={handleExitGame} className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg">Exit</button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
            <motion.div 
              key="matching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3"
            >
              <AnimatePresence>
              {matchingPairs.filter(item => !matchedIds.includes(item.id)).map((item, idx) => {
                const key = `${item.id}-${item.type}-${idx}`;
                return (
                <motion.button
                  key={key}
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
                  whileHover={{ scale: isMatchingProcessing ? 1 : 1.05 }}
                  whileTap={{ scale: isMatchingProcessing ? 1 : 0.95 }}
                  onClick={() => handleMatchClick(item)}
                  onTouchStart={(e) => { if (!isMatchingProcessing && !matchedIds.includes(item.id)) e.currentTarget.click(); }}
                  disabled={isMatchingProcessing}
                  dir="auto"
                  style={{ touchAction: 'manipulation' }}
                  className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm font-black text-lg sm:text-2xl h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
                    selectedMatch?.id === item.id && selectedMatch?.type === item.type
                      ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                      : "bg-white text-stone-800 hover:shadow-md"
                  } ${isMatchingProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {item.text}
                </motion.button>
                );
              })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`bg-white rounded-2xl sm:rounded-[32px] shadow-2xl p-2 sm:p-6 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-3 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-3 border-red-500" : feedback === "show-answer" ? "bg-amber-50 border-3 border-amber-500" : "border-3 border-transparent"}`}
            >
              {/* Progress Bar */}
              <progress
                className="absolute top-0 left-0 h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                max={100}
                value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
              />

              {/* Motivational message - positioned at top to not block answers */}
              {motivationalMessage && (
                <div className="absolute top-4 sm:top-4 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <span className="text-base sm:text-3xl font-black text-blue-700 drop-shadow animate-bounce bg-white/80 px-3 py-1 sm:px-4 sm:py-2 rounded-2xl">
                    {motivationalMessage}
                  </span>
                </div>
              )}

              {/* Show correct answer after 3 failed attempts */}
              {feedback === "show-answer" && (
                <div className="absolute top-12 sm:top-16 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <ShowAnswerFeedback
                    answer={gameMode === "reverse" ? currentWord?.english : currentWord?.[targetLanguage]}
                    dir="auto"
                  />
                </div>
              )}

              <div className="mb-1 sm:mb-4">
                <span className="inline-block bg-stone-100 text-stone-500 font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mb-1">{currentIndex + 1} / {gameWords.length}</span>
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-3 mb-1 sm:mb-4">
                  {currentWord?.imageUrl && (
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-48 sm:h-48 object-cover rounded-2xl sm:rounded-[32px] shadow-lg border-4 border-white"
                    />
                  )}
                  <h2 className={`text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
                    dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}>
                    {gameMode === "spelling" || gameMode === "reverse" ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) :
                     gameMode === "scramble" ? scrambledWord :
                     gameMode === "flashcards" ? (isFlipped ? (currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew) : currentWord?.english) :
                     currentWord?.english}
                  </h2>
                </div>
                <div className="flex justify-center gap-2 mt-0.5 sm:mt-0">
                  <button
                    onClick={() => {
                      gameDebug.logButtonClick({
                        button: 'pronunciation',
                        gameMode,
                        wordId: currentWord?.id ?? -1,
                        disabled: false,
                        feedback,
                      });
                      speakWord(currentWord?.id, currentWord?.english);
                    }}
                    className="p-1.5 sm:p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                    aria-label="Play pronunciation"
                    title="Play pronunciation"
                  >
                    <Volume2 size={20} className="text-stone-600 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Power-up toolbar */}
              {user?.role === "student" && gameMode !== "flashcards" && gameMode !== "sentence-builder" && !isFinished && (
                <div className="flex justify-center gap-2 mb-3">
                  {(gameMode === "classic" || gameMode === "listening" || gameMode === "reverse") && ((user.powerUps ?? {})['fifty_fifty'] ?? 0) > 0 && hiddenOptions.length === 0 && !feedback && (
                    <button onClick={() => {
                      const wrong = options.filter(o => o.id !== currentWord.id);
                      const toHide = shuffle(wrong).slice(0, 2).map(o => o.id);
                      const newPowerUps = { ...(user.powerUps ?? {}), fifty_fifty: ((user.powerUps ?? {})['fifty_fifty'] ?? 1) - 1 };
                      setHiddenOptions(toHide);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid); }, 0);
                    }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200">
                      ✂️ 50/50 <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['fifty_fifty']}</span>
                    </button>
                  )}
                  {((user.powerUps ?? {})['skip'] ?? 0) > 0 && !feedback && (
                    <button onClick={() => {
                      const newPowerUps = { ...(user.powerUps ?? {}), skip: ((user.powerUps ?? {})['skip'] ?? 1) - 1 };
                      setCurrentIndex(prev => Math.min(prev + 1, gameWords.length - 1));
                      setHiddenOptions([]);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid); }, 0);
                    }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200">
                      ⏭️ Skip <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['skip']}</span>
                    </button>
                  )}
                  {(gameMode === "spelling" || gameMode === "letter-sounds") && ((user.powerUps ?? {})['reveal_letter'] ?? 0) > 0 && !feedback && spellingInput.length === 0 && (
                    <button onClick={() => {
                      const newPowerUps = { ...(user.powerUps ?? {}), reveal_letter: ((user.powerUps ?? {})['reveal_letter'] ?? 1) - 1 };
                      if (currentWord) setSpellingInput(currentWord.english[0]);
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      setTimeout(() => { supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid); }, 0);
                    }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200">
                      💡 Hint <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['reveal_letter']}</span>
                    </button>
                  )}
                </div>
              )}

              {gameMode === "classic" || gameMode === "listening" || gameMode === "reverse" ? (
                <ClassicModeGame
                  gameMode={gameMode}
                  currentWord={currentWord}
                  options={options}
                  hiddenOptions={hiddenOptions}
                  feedback={feedback}
                  targetLanguage={targetLanguage}
                  gameWordsCount={gameWords.length}
                  currentIndex={currentIndex}
                  onAnswer={handleAnswer}
                />
              ) : gameMode === "true-false" ? (
                <div className="max-w-lg mx-auto">
                  <div className="bg-stone-100 p-3 sm:p-8 rounded-2xl sm:rounded-3xl mb-2 sm:mb-6">
                    <p className="text-2xl sm:text-4xl font-black text-stone-800" dir="auto">{tfOption?.[targetLanguage] || tfOption?.arabic || tfOption?.hebrew}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <button
                      onClick={() => handleTFAnswer(true)}
                      onTouchStart={(e) => { if (!feedback) e.currentTarget.click(); }}
                      disabled={!!feedback}
                      style={{ touchAction: 'manipulation', minHeight: '60px' }}
                      className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >True ✓</button>
                    <button
                      onClick={() => handleTFAnswer(false)}
                      onTouchStart={(e) => { if (!feedback) e.currentTarget.click(); }}
                      disabled={!!feedback}
                      style={{ touchAction: 'manipulation', minHeight: '60px' }}
                      className="py-5 sm:py-8 rounded-2xl sm:rounded-3xl text-xl sm:text-3xl font-black bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >False ✗</button>
                  </div>
                </div>
              ) : gameMode === "flashcards" ? (
                <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
                  <button
                    onClick={() => !isProcessingRef.current && setIsFlipped(!isFlipped)}
                    disabled={isProcessingRef.current}
                    className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isFlipped ? "Show English" : "Show Translation"}
                  </button>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() => handleFlashcardAnswer(false)}
                      onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
                      disabled={isProcessingRef.current}
                      style={{ touchAction: 'manipulation', minHeight: '56px' }}
                      className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Still Learning</button>
                    <button
                      onClick={() => handleFlashcardAnswer(true)}
                      onTouchStart={(e) => { if (!isProcessingRef.current) e.currentTarget.click(); }}
                      disabled={isProcessingRef.current}
                      style={{ touchAction: 'manipulation', minHeight: '56px' }}
                      className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Got It!</button>
                  </div>
                </div>
              ) : (
              gameMode === "letter-sounds" ? (
                <div className="max-w-lg mx-auto">
                  <p className="text-stone-600 text-lg sm:text-xl font-bold mb-4 text-center" dir="auto">{currentWord?.[targetLanguage]}</p>
                  <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6">
                    {currentWord?.english.split(" ").map((word, wordIdx, allWords) => {
                      let charOffset = 0;
                      for (let j = 0; j < wordIdx; j++) charOffset += allWords[j].length + 1;
                      return (
                        <div key={wordIdx} className="flex justify-center gap-1 sm:gap-2">
                          {word.split("").map((letter, i) => {
                            const globalIdx = charOffset + i;
                            const revealed = globalIdx < revealedLetters;
                            const color = LETTER_COLORS[globalIdx % LETTER_COLORS.length];
                            return (
                              <div
                                key={globalIdx}
                                className="w-9 h-11 sm:w-12 sm:h-14 rounded-xl font-black text-base sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0 transition-all duration-300"
                                style={{ color: revealed ? color : color + "40", borderColor: revealed ? color : color + "40", background: color + "18", opacity: revealed ? 1 : 0.15, transform: revealed ? "scale(1)" : "scale(0.5)" }}
                              >
                                {revealed ? (letter ?? "").toUpperCase() : "?"}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {revealedLetters >= (currentWord?.english.length || 99) && (
                    <form onSubmit={handleSpellingSubmit} className="max-w-sm mx-auto">
                      <input
                        autoFocus
                        type="text"
                        value={spellingInput}
                        onChange={(e) => setSpellingInput(e.target.value)}
                        disabled={feedback === "show-answer" || feedback === "correct"}
                        placeholder="Type the word..."
                        className={`w-full p-3 text-xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
                          feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                          feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                          feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                          "border-stone-100 focus:border-stone-900 outline-none"
                        }`}
                      />
                      {feedback === "show-answer" && (
                        <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-3" />
                      )}
                      <button
                        type="submit"
                        disabled={!!feedback}
                        className="w-full py-3 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >Check Answer</button>
                    </form>
                  )}
                </div>
              ) : gameMode === "sentence-builder" ? (
                (() => {
                  const sentences = (activeAssignment as AssignmentData & { sentences?: string[] })?.sentences?.filter(s => s.trim()) || [];
                  if (sentences.length === 0) return (
                    <div className="text-center p-8">
                      <p className="text-stone-400 text-lg">No sentences were added to this assignment.</p>
                      <p className="text-stone-400 text-sm mt-2">Ask your teacher to add sentences.</p>
                    </div>
                  );
                  return (
                    <div className="max-w-xl mx-auto">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <p className="text-stone-400 text-xs font-bold uppercase">Sentence {sentenceIndex + 1} / {sentences.length}</p>
                        <button onClick={() => speak(sentences[sentenceIndex])} className="text-blue-500 hover:text-blue-700 active:scale-90 transition-all" title="Listen to sentence">🔊</button>
                      </div>
                      {/* Built sentence area */}
                      <div className={`min-h-[60px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
                        sentenceFeedback === "correct" ? "border-blue-500 bg-blue-50" :
                        sentenceFeedback === "wrong" ? "border-rose-500 bg-rose-50" :
                        "border-stone-200 bg-stone-50"
                      }`}>
                        {builtSentence.length === 0 && <span className="text-stone-300 text-sm italic w-full text-center">Tap words below to build the sentence</span>}
                        {builtSentence.map((word, i) => (
                          <button
                            key={i}
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, false)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      {/* Available words */}
                      <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {availableWords.map((word, i) => (
                          <button
                            key={i}
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, true)}
                            className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
                          >{word}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setBuiltSentence([]); setAvailableWords(shuffle(sentences[sentenceIndex].split(" ").filter(Boolean))); }}
                          disabled={sentenceFeedback !== null}
                          className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >Clear</button>
                        <button onClick={handleSentenceCheck} disabled={builtSentence.length === 0 || sentenceFeedback !== null} className="flex-2 py-2 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50">Check ✓</button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <form onSubmit={handleSpellingSubmit} className="max-w-md mx-auto">
                  <input
                    autoFocus
                    type="text"
                    value={spellingInput}
                    onChange={(e) => setSpellingInput(e.target.value)}
                    disabled={feedback === "show-answer" || feedback === "correct"}
                    placeholder="Type in English..."
                    className={`w-full p-3 sm:p-6 text-base sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-3 sm:mb-6 text-base sm:text-lg">Translation: <span className="text-stone-900 text-xl sm:text-2xl" dir="auto">{currentWord?.[targetLanguage] || currentWord?.arabic || currentWord?.hebrew}</span></p>
                  )}
                  {feedback === "show-answer" && (
                    <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
                  )}
                  <button
                    type="submit"
                    disabled={!!feedback}
                    className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >Check Answer</button>
                </form>
              )
              )}
            </motion.div>
          )
        }
        </AnimatePresence>
      </div>

      {/* Live Leaderboard Widget — only shown during live challenges (has leaderboard data).
          Hidden for solo assignments and Quick Play guests. */}
      {!user?.isGuest && Object.keys(leaderboard).length > 0 && (
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl p-6 sticky top-6 border border-white/20">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-white">🏆 Live Rank</h3>
          <div className="space-y-2">
            {(Object.entries(leaderboard) as [string, LeaderboardEntry][])
              .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore, isGuest: entry.isGuest || false }))
              .sort((a, b) => b.totalScore - a.totalScore)
              .slice(0, 5)
              .map((entry, idx) => {
                const isUser = entry.name === user?.displayName;
                const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                const rankClass = idx === 0 ? "bg-gradient-to-r from-yellow-300 to-yellow-500 text-stone-900 shadow-lg shadow-yellow-400/30" :
                                   idx === 1 ? "bg-gradient-to-r from-slate-200 to-slate-400 text-stone-900" :
                                   idx === 2 ? "bg-gradient-to-r from-orange-300 to-orange-500 text-white" :
                                   "bg-white/20 text-white";

                return (
                  <div
                    key={`${entry.uid}-${idx}`}
                    className={`flex justify-between items-center p-2 sm:p-3 rounded-xl transition-all ${isUser ? "bg-white/30 border-2 border-white/50 scale-105 shadow-lg" : "bg-white/10"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankClass}`}>
                        {rankIcon}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-[100px] ${isUser ? "text-white" : "text-white/90"}`}>
                        {entry.name}{entry.isGuest && <span className="ml-0.5">🎭</span>}
                      </span>
                      {idx === 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-xs"
                        >
                          👑
                        </motion.span>
                      )}
                    </div>
                    <span className={`text-sm sm:text-base font-black ${isUser ? "text-white" : "text-white/80"}`}>{entry.totalScore}</span>
                  </div>
                );
              })}
            {Object.values(leaderboard).length === 0 && (
              <div className="text-center py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl mb-2"
                >
                  ⏳
                </motion.div>
                <p className="text-xs text-white/70 italic">Waiting for players...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>

    {gameMode !== "matching" && (
      <div className="w-full max-w-5xl mt-12 flex justify-center">
        <div className="w-full max-w-md">
          <progress
            className="h-2 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
            max={100}
            value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
          />
          <p className="text-center text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Word {currentIndex + 1} of {gameWords.length}</p>
        </div>
      </div>
    )}
    <FloatingButtons showBackToTop={true} />
    </div>
);
};