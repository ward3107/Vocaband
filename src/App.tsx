import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import { ALL_WORDS, BAND_1_WORDS, BAND_2_WORDS, TOPIC_PACKS, Word } from "./data/vocabulary";
import { generateSentencesForAssignment } from "./data/sentence-bank";
import {
  searchWords
} from "./data/vocabulary-matching";
import {
  Volume2,
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
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, mapProgressToDb, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { useAudio } from "./hooks/useAudio";
import FloatingButtons from "./components/FloatingButtons";
import { PRIVACY_POLICY_VERSION, DATA_CONTROLLER, DATA_COLLECTION_POINTS, THIRD_PARTY_REGISTRY } from "./config/privacy-config";
import { shuffle, chunkArray, addUnique, removeKey } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
import TopAppBar from "./components/TopAppBar";
import ActionCard from "./components/ActionCard";
import ClassCard from "./components/ClassCard";
import { CreateAssignmentWizard } from "./components/CreateAssignmentWizard";
import CookieBanner, { CookiePreferences } from "./components/CookieBanner";
import { LandingPageWrapper, TermsPageWrapper, PrivacyPageWrapper, DemoModeWrapper } from "./components/LazyComponents";
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

// Types for lazy-loaded modules
type MammothModule = typeof import('mammoth');
type ConfettiModule = typeof import('canvas-confetti');
type SocketIOModule = typeof import('socket.io-client');
type Socket = SocketIOModule['Socket'];

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase

// --- Memoized game UI components (avoid re-rendering all buttons on single feedback change) ---
const AnswerOptionButton = React.memo(({ option, currentWordId, feedback, gameMode, targetLanguage, onAnswer }: {
  option: Word; currentWordId: number; feedback: string | null; gameMode: string; targetLanguage: "hebrew" | "arabic"; onAnswer: (w: Word) => void;
}) => (
  <button
    onClick={() => onAnswer(option)}
    disabled={feedback === "show-answer" || feedback === "correct"}
    className={`py-2.5 px-2 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold transition-all duration-300 ${
      feedback === "correct" && option.id === currentWordId
        ? "bg-blue-600 text-white scale-105 shadow-xl"
        : feedback === "wrong" && option.id !== currentWordId
        ? "bg-rose-100 text-rose-500 opacity-50"
        : feedback === "show-answer" && option.id === currentWordId
        ? "bg-amber-500 text-white scale-105 shadow-xl ring-4 ring-amber-300"
        : feedback === "show-answer"
        ? "bg-stone-50 text-stone-400 opacity-40 cursor-not-allowed"
        : "bg-stone-100 text-stone-800 hover:bg-stone-200"
    }`}
  >
    {gameMode === "reverse" ? option.english : option[targetLanguage]}
  </button>
));


export default function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Detect Quick Play session from URL synchronously so it takes priority over auth redirects
  const quickPlaySessionParam = new URLSearchParams(window.location.search).get('session');

  const [view, setView] = useState<
    | "public-landing"
    | "public-terms"
    | "public-privacy"
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
  >(quickPlaySessionParam ? "quick-play-student" : "public-landing");
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
      console.log('[Cookie Banner] Initial check - hasConsented:', !!hasConsented, 'value:', hasConsented);
      return !hasConsented;
    } catch (e) {
      console.log('[Cookie Banner] localStorage error:', e);
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
      console.log('[Cookie Banner] Consent saved:', consentData);
      // Verify it was saved
      const verify = localStorage.getItem("vocaband_cookie_consent");
      console.log('[Cookie Banner] Verification read:', verify);
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
  const [existingStudents, setExistingStudents] = useState<Array<{ id: string, displayName: string, xp: number, status: string }>>([]);
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string, displayName: string, classCode: string, className: string, joinedAt: string }>>([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [createdClassName, setCreatedClassName] = useState<string>("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectStudentModal, setRejectStudentModal] = useState<{ id: string; displayName: string } | null>(null);
  const [endQuickPlayModal, setEndQuickPlayModal] = useState(false);
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
  const quickPlayNameInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPlayJoinedStudents, setQuickPlayJoinedStudents] = useState<{name: string, score: number, avatar: string}[]>([]);
  const [quickPlayCustomWords, setQuickPlayCustomWords] = useState<Map<string, {hebrew: string, arabic: string}>>(new Map());
  const [quickPlayAddingCustom, setQuickPlayAddingCustom] = useState<Set<string>>(new Set());
  const [quickPlayTranslating, setQuickPlayTranslating] = useState<Set<string>>(new Set());
  const [quickPlayWordEditorOpen, setQuickPlayWordEditorOpen] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [quickPlayStatusMessage, setQuickPlayStatusMessage] = useState("");

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
  const [assignmentModes, setAssignmentModes] = useState<string[]>(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]);
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
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);
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

        console.log('[Quick Play Load] Session loaded:', { sessionCode: data.session_code, wordIds: data.word_ids, dbWordsCount: dbWords.length, customWordsCount: customWords.length, totalWords: allWords.length });

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
        console.log('[Quick Play Student] Session loaded:', { id: data.id, sessionCode: data.session_code });
        setView("quick-play-student");
      };

      loadQuickPlaySession();
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
  useEffect(() => {
    // Only poll when in teacher monitor view and have an active session
    if (view !== "quick-play-teacher-monitor" || !quickPlayActiveSession?.id) return;

    const pollProgress = async () => {
      if (!quickPlayActiveSession?.id) return;

      try {
        console.log('[Quick Play Monitor] Polling for session:', quickPlayActiveSession.id);
        // Fetch progress records for this Quick Play session
        // We use assignmentId to store the session UUID (id) for Quick Play
        const { data: progressData, error } = await supabase
          .from('progress')
          .select('student_name, score, avatar, completed_at, mode')
          .eq('assignment_id', quickPlayActiveSession.id)
          .order('completed_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[Quick Play Monitor] Error fetching progress:', error);
          return;
        }

        console.log('[Quick Play Monitor] Progress data received:', progressData);

        if (progressData) {
          // Aggregate by student name (keep best score per mode)
          const studentMap = new Map<string, { name: string; score: number; avatar: string; lastSeen: string }>();

          progressData.forEach((p: any) => {
            const key = p.student_name;
            const existing = studentMap.get(key);

            if (!existing || p.score > existing.score || new Date(p.completed_at) > new Date(existing.lastSeen)) {
              studentMap.set(key, {
                name: p.student_name,
                score: p.score,
                avatar: p.avatar || '🦊',
                lastSeen: p.completed_at
              });
            }
          });

          // Convert to array and sort by score
          const students = Array.from(studentMap.values())
            .sort((a, b) => b.score - a.score);

          console.log('[Quick Play Monitor] Students after aggregation:', students);
          setQuickPlayJoinedStudents(students);
        }
      } catch (err) {
        console.error('[Quick Play Monitor] Poll error:', err);
      }
    };

    // Poll immediately
    pollProgress();

    // Set up polling interval (every 3 seconds)
    const interval = setInterval(pollProgress, 3000);

    return () => clearInterval(interval);
  }, [view, quickPlayActiveSession?.id]);

  const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const toScoreHeightClass = (score: number) => {
    if (score < 25) return "h-1/4";
    if (score < 50) return "h-2/4";
    if (score < 75) return "h-3/4";
    return "h-full";
  };

  // --- HELPER: Create Guest User ---
  // Centralized function to create guest user objects with consistent structure
  const createGuestUser = (name: string, prefix: string = 'guest'): AppUser => {
    // Mobile-compatible UUID generation (crypto.randomUUID() not supported on some mobile browsers)
    const generateUUID = (): string => {
      // Fallback for mobile browsers that don't support crypto.randomUUID()
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Simple fallback: timestamp + random
      return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    };

    return {
      uid: `${prefix}-${generateUUID()}`,
      displayName: name.trim().slice(0, 30),
      email: null,
      role: "guest",
      isGuest: true,
      avatar: "🦊",
      xp: 0,
      classCode: null,
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

  const handleAutoTranslate = async (term: string) => {
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

  const { speak: speakWord, preloadMany, preloadMotivational, playMotivational, getMotivationalLabel } = useAudio();

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
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">("arabic");
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
  const feedbackTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Speak motivational message during gameplay — audio and text use the SAME phrase
  useEffect(() => {
    if (motivationalMessage) {
      playMotivational();
    }
  }, [motivationalMessage]);

  // Speak congratulatory message when a mode is finished
  useEffect(() => {
    if (isFinished && user?.displayName) {
      const phrases = [
        `Kol Hakavod ${user.displayName}! You did amazing!`,
        `Excellent work ${user.displayName}! You're a superstar!`,
        `Wow ${user.displayName}! That was fantastic!`,
        `Great job ${user.displayName}! Keep going!`,
        `Well done ${user.displayName}! You're getting better and better!`,
      ];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
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
    let s: ReturnType<typeof io> | null = null;
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
      s = io(socketUrl || "/", {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: { token }, // Pass token directly, not via async callback
      });

      // Debug: log connection attempt
      console.log("[Socket] Connecting to", socketUrl, "with token:", token ? "✓" : "✗");

      setSocket(s);

      s.on("connect", () => {
        console.log("[Socket] ✓ Connected successfully");
        setSocketConnected(true);
      });
      s.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected:", reason);
        setSocketConnected(false);
      });
      s.on("reconnect", () => {
        setSocketConnected(true);
        const currentUser = userRef.current;
        // Allow students to rejoin live challenge on reconnect.
        // Token is provided via the socket auth callback (line above), not in the payload.
        if (currentUser?.classCode && isLiveChallengeRef.current) {
          if (currentUser.role === "student") {
            getToken().then(t => {
              s!.emit("join-challenge", { classCode: currentUser.classCode, name: currentUser.displayName, uid: currentUser.uid, token: t });
            });
          }
        }
      });
      s.on("connect_error", (err) => console.error("Socket connection error:", err.message));
      s.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data) => {
        setLeaderboard(data);
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      s?.disconnect();
    };
  }, []);

  // --- AUTH LOGIC ---
  useEffect(() => {
    // PKCE code exchange happens in main.tsx (outside React lifecycle)
    // to avoid StrictMode double-mount races.  By the time this effect
    // runs, the exchange is already in-flight or completed.

    // Helper: fetch user profile with retry (mobile networks are flaky)
    const fetchUserProfile = async (uid: string, retries = 2): Promise<ReturnType<typeof mapUser> | null> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const { data: userRow, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
        if (userRow) return mapUser(userRow);
        if (!error) return null; // No row exists — don't retry
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
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
            // the "empty dashboard until refresh" bug.  Retry once on failure.
            try {
              const fetchedClasses = await fetchTeacherData(supabaseUser.id);
              fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            } catch {
              // Retry once after a short delay (flaky network / cold start)
              await new Promise(r => setTimeout(r, 1500));
              const fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => []);
              fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            }
            setView("teacher-dashboard");
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
              if (savedCode && savedName && savedUid) {
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
            const { data: isAllowed } = await supabase.rpc('is_teacher_allowed', {
              check_email: supabaseUser.email ?? ""
            });
            if (!isAllowed) {
              setError("Your account is not authorised as a teacher. Contact your administrator to be added.");
              await supabase.auth.signOut();
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
    }, 8000);
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
    const refresh = async () => {
      const { data: classRows } = await supabase.from('classes').select('id').eq('code', code).limit(1);
      if (!classRows || classRows.length === 0) return;
      const { data } = await supabase.from('assignments').select('*').eq('class_id', classRows[0].id);
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
    const code = Array.from(crypto.getRandomValues(new Uint32Array(8)))
      .map(x => alphabet[x % alphabet.length])
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
    if (file.size > 10 * 1024 * 1024) { showToast("Image too large (max 10 MB).", "error"); e.target.value = ""; return; }

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
      const customWordsFromOCR: Word[] = extractedWords.map((word, index) => ({
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
      if (!parsed.hostname.endsWith("google.com")) {
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
        setAssignmentModes(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]);
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
      allowedModes: assignmentModes
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

  // Check if user needs to accept the current privacy policy version
  const checkConsent = (_userData: AppUser) => {
    // Use localStorage to track consent — no DB columns needed
    const accepted = localStorage.getItem('vocaband_consent_version');
    if (accepted !== PRIVACY_POLICY_VERSION) {
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
          status: s.status
        }));

        setExistingStudents(mappedStudents);
        return;
      }

      // Map RPC results
      const mappedStudents = (data || []).map((s: any) => ({
        id: s.id,
        displayName: s.display_name,
        xp: s.xp || 0,
        status: s.status
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
          p_display_name: trimmedName
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
      const [classResult, userResult] = await Promise.all([
        supabase.from('classes').select('*').eq('code', trimmedCode),
        supabase.from('users').select('*').eq('uid', studentUid).maybeSingle(),
      ]);
      if (classResult.error) throw classResult.error;
      if (!classResult.data || classResult.data.length === 0) {
        setError("Invalid Class Code!");
        return;
      }
      const classData = mapClass(classResult.data[0]);

      // Step 2.5: Check if student is approved (for student_profiles workflow)
      const studentUniqueIdNew = trimmedCode.toLowerCase() + trimmedName.toLowerCase() + ':' + studentUid;
      const studentUniqueIdLegacy = trimmedCode.toLowerCase() + trimmedName.toLowerCase();

      // Check new format first, fall back to legacy
      let studentProfile: { status: string } | null = null;
      let profileError: unknown = null;
      {
        const result = await supabase
          .from('student_profiles')
          .select('status')
          .eq('unique_id', studentUniqueIdNew)
          .maybeSingle();
        studentProfile = result.data;
        profileError = result.error;
      }
      if (!studentProfile && !profileError) {
        const result = await supabase
          .from('student_profiles')
          .select('status')
          .eq('unique_id', studentUniqueIdLegacy)
          .maybeSingle();
        studentProfile = result.data;
        profileError = result.error;
      }


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

      // Step 4: Fetch assignments + progress in parallel (user row now exists, RLS passes)
      const [assignResult, progressResult] = await Promise.all([
        supabase.from('assignments').select('*').eq('class_id', classData.id),
        supabase.from('progress').select('*').eq('class_code', trimmedCode).eq('student_uid', studentUid),
      ]);
      if (assignResult.error) throw assignResult.error;
      if (progressResult.error) throw progressResult.error;

      setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
      setStudentProgress((progressResult.data ?? []).map(mapProgress));
      setUser(userData);
      setBadges(userData.badges || []);
      setXp(userData.xp ?? 0);
      setStreak(userData.streak ?? 0);
      checkConsent(userData);

      // Join Live Challenge
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
          classCode: trimmedCode, name: trimmedName, uid: studentUid, token: session.access_token,
        });
      }

      setView("student-dashboard");

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
        ? (error.message.includes('fetch') || error.message.includes('network')
          ? "Network error. Please check your connection."
          : "Could not log in. Please try again.")
        : "Could not log in. Please try again.";
      setError(errorMsg);
    } finally {
      clearTimeout(loginTimeout);
      manualLoginInProgress.current = false;
      setLoading(false);
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
        .limit(200);
      if (data) allRows.push(...data.map(mapProgress));
    }

    setAllScores(allRows);
  };

  const fetchTeacherAssignments = async (classIdsOverride?: string[]) => {
    // Use optional chaining on user state, but don't early return - the caller ensures valid context
    setTeacherAssignmentsLoading(true);
    const classIds = classIdsOverride || classes.map(c => c.id);
    console.log('fetchTeacherAssignments called with classIds:', classIds);
    const { data, error } = await supabase.from('assignments').select('*').in('class_id', classIds).order('created_at', { ascending: false });
    console.log('Assignments query result:', { data, error });
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
      if (Math.random() > 0.5) {
        setTfOption(currentWord);
      } else {
        let possibleDistractors = gameWords.filter(w => w.id !== currentWord.id);
        if (possibleDistractors.length === 0) {
          const allPossibleWords = [...ALL_WORDS, ...gameWords];
          possibleDistractors = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values()).filter(w => w.id !== currentWord.id);
        }
        setTfOption(possibleDistractors[Math.floor(Math.random() * possibleDistractors.length)]);
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
      speakWord(currentWord.id);
    }
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro, gameMode]);

  useEffect(() => {
    if (view === "game" && !showModeSelection && gameMode === "matching") {
      const shuffled = shuffle(gameWords).slice(0, 6);
      const pairs = shuffle([
        ...shuffled.map(w => ({ id: w.id, text: w.english, type: 'english' as const })),
        ...shuffled.map(w => ({ id: w.id, text: w.arabic || w.hebrew, type: 'arabic' as const }))
      ]);
      setMatchingPairs(pairs);
      setMatchedIds([]);
      setSelectedMatch(null);
    }
  }, [view, showModeSelection, gameMode, gameWords]);

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
          saveScore();
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
    } else {
      setUser(null);
      setView("public-landing");
    }
  };

  const saveScore = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    // Quick Play (guest) mode - save progress with session UUID as identifier
    if (user.isGuest && quickPlayActiveSession) {
      try {
        const progress: Omit<ProgressData, "id"> = {
          studentName: user.displayName,
          studentUid: user.uid, // Guest UID
          assignmentId: quickPlayActiveSession.id, // Use session UUID as assignment ID
          classCode: "QUICK_PLAY", // Special identifier for Quick Play
          score: Math.min(Math.max(0, score), gameWords.length * 10),
          mode: gameMode,
          completedAt: new Date().toISOString(),
          mistakes: mistakes,
          avatar: user.avatar || "🦊"
        };

        console.log('[Quick Play] Saving progress:', {
          studentName: progress.studentName,
          assignmentId: progress.assignmentId,
          score: progress.score,
          mode: progress.mode
        });

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
            mistakes: Array.isArray(mistakes) ? mistakes.length : (mistakes || 0),
            avatar: progress.avatar
          });

        if (error) {
          console.error('[Quick Play] Failed to save progress:', error);
        } else {
          console.log('[Quick Play] ✓ Progress saved successfully for', user.displayName);
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
    const cappedScore = Math.min(Math.max(0, score), maxPossible);

    const xpEarned = cappedScore;
    const newXp = xp + xpEarned;
    const newStreak = cappedScore >= 80 ? streak + 1 : 0;
    setXp(newXp);
    setStreak(newStreak);

    if (cappedScore === 100) await awardBadge("🎯 Perfect Score");
    if (newStreak >= 5) await awardBadge("🔥 Streak Master");
    if (newXp >= 500) await awardBadge("💎 XP Hunter");

    // Persist XP and streak to database
    await supabase.from('users').update({ xp: newXp, streak: newStreak }).eq('uid', user.uid);

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
      // Use RPC to save progress (bypasses RLS for students)
      const { data: progressId, error: rpcError } = await supabase
        .rpc('save_student_progress', {
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

      // Update local state with the saved progress
      const newProgress = {
        id: progressId,
        ...progress
      };

      setStudentProgress(prev => {
        const existingIndex = prev.findIndex(
          p => p.assignmentId === activeAssignment.id
            && p.mode === gameMode
            && p.studentUid === currentAuthUid
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
    setTimeout(() => { speakWord(item.id); }, 0);

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
            saveScore();
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
          saveScore();
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
          saveScore();
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

  const handleFlashcardAnswer = (knewIt: boolean) => {
    if (knewIt) {
      setMotivationalMessage(getMotivationalLabel(playMotivational()));
      setTimeout(() => setMotivationalMessage(null), 1000);
      const newScore = score + 5;
      setScore(newScore);
      if (socket && user?.classCode) {
        setTimeout(() => { socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore }); }, 0);
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
      saveScore();
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
          saveScore();
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

  // Debug: log banner state on every render
  if (showCookieBanner && !user) {
    console.log('[Cookie Banner] Rendering banner - showCookieBanner:', showCookieBanner, 'user:', !!user);
  }

  if (loading && !quickPlaySessionParam) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <RefreshCw className="animate-spin text-blue-700" size={48} />
    </div>;
  }

  // --- PUBLIC VIEWS (No authentication required) ---
  if (view === "public-landing") {
    return (
      <>
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

  if (view === "student-account-login") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-tertiary/10 to-secondary/10">
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

                  {/* New Student Button */}
                  <button
                    onClick={() => setShowNewStudentForm(true)}
                    className="w-full bg-secondary-container text-on-secondary-container py-4 rounded-xl text-lg font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    I'm a New Student
                  </button>
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
        {cookieBannerOverlay}
      </div>
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
              // If in game mode, go back to mode selection; otherwise go to landing
              if (view === "game" && showModeSelection) {
                setShowModeSelection(false);
              } else if (view === "game") {
                setView("quick-play-student");
              } else {
                setView("public-landing");
              }
            }}
            className="text-on-surface-variant font-bold text-sm hover:text-on-surface flex items-center gap-1"
          >
            ← Back
          </button>
        </header>

        <main className="flex-grow flex flex-col items-center px-4 py-3 sm:py-6 max-w-4xl mx-auto w-full">
            {!quickPlayActiveSession ? (
              <div className="text-center py-12 sm:py-20">
                <Loader2 className="mx-auto animate-spin text-primary mb-4" size={36} sm:size={48} />
                <p className="text-on-surface-variant font-bold text-sm sm:text-base">Loading Quick Play session...</p>
              </div>
            ) : !quickPlayStudentName ? (
              <div className="w-full max-w-md">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <QrCode className="text-white" size={32} sm:size={40} />
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-on-surface mb-2">Quick Play!</h1>
                  <p className="text-sm sm:text-base text-on-surface-variant font-bold">{quickPlayActiveSession.words.length} words • No login needed</p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    <label className="absolute -top-2.5 left-4 px-2 bg-surface text-primary font-black text-xs z-10">YOUR NAME</label>
                    <input
                      id="quick-play-name-input"
                      type="text"
                      inputMode="text"
                      autoCapitalize="words"
                      autoComplete="off"
                      defaultValue={quickPlayStudentName}
                      placeholder="Enter your nickname..."
                      className="w-full px-4 py-3 sm:py-4 bg-transparent border-4 border-stone-200 rounded-2xl text-base sm:text-lg font-black text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  </div>

                  <button
                    data-quick-play-join
                    onClick={() => {
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

                      if (!quickPlayActiveSession.words || quickPlayActiveSession.words.length === 0) {
                        showToast("This session has no words. Please contact your teacher.", "error");
                        return;
                      }

                      setTimeout(() => {
                        setQuickPlayStudentName(trimmedName);
                        const guestUser = createGuestUser(trimmedName, "quickplay");
                        setUser(guestUser);

                        const words = shuffle(quickPlayActiveSession.words).map(w => ({
                          ...w,
                          hebrew: w.hebrew || "",
                          arabic: w.arabic || ""
                        }));

                        setAssignmentWords(words);
                        setCurrentIndex(0);
                        setScore(0);
                        setFeedback(null);
                        setIsFinished(false);
                        setMistakes([]);
                        setView("game");
                        setShowModeSelection(true);
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
  const consentModal = needsConsent && user ? (
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
            <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 flex items-center gap-2"><BookOpen className="text-blue-700" size={22} /> Your Assignments</h2>
            
            {studentAssignments.length === 0 ? (
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
                    <button onClick={() => setEditingName(false)} className="text-stone-400 font-bold text-xs">Cancel</button>
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
              <div className="h-full">
                <ActionCard
                  icon={<QrCode size={24} />}
                  iconBg="bg-indigo-100"
                  iconColor="text-indigo-600"
                  title="Quick Online Challenge"
                  description="Generate QR code for instant play"
                  buttonText="Create"
                  buttonVariant="qr-purple"
                  onClick={() => setView("quick-play-setup")}
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
                        supabase.auth.getSession().then(({ data: { session } }) => {
                          const token = session?.access_token ?? "";
                          socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: classes[0].code, token });
                        });
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
              <div className="h-full">
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
              <div className="h-full">
                <ActionCard
                  icon={<Trophy size={24} />}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  title="Students & Grades"
                  description="All students & scores"
                  buttonText="Open Gradebook"
                  buttonVariant="gradebook-amber"
                  onClick={() => { fetchScores(); fetchStudents(); setView("gradebook"); }}
                />
              </div>
            </HelpTooltip>

            {/* Student Approvals */}
            <HelpTooltip className="h-full" content="Approve students who signed up for your classes">
              <div className="h-full">
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
          <div className="bg-surface-container-low rounded-2xl p-6 mb-6 shadow-lg border-2 border-surface-container-high">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                <Users className="text-primary" size={20} /> My Classes
              </h2>
              <button
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
                        onAssign={() => { setSelectedClass(c); setView("create-assignment"); setAssignmentStep(1); }}
                        onCopyCode={() => {
                          navigator.clipboard.writeText(c.code);
                          setCopiedCode(c.code);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        onWhatsApp={() => {
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code:\n\n${c.code}\n\nCopy the code above and paste it in the app!`)}`,
                          '_blank'
                        );
                      }}
                      onDelete={() => handleDeleteClass(c.id)}
                      onEditAssignment={(assignment) => {
                        console.log('[EDIT BUTTON] Clicked! Assignment:', assignment);
                        console.log('[EDIT BUTTON] Current view before:', view);
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
                        if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                        else if (unknownWords.length > 0) setSelectedLevel("Custom");
                        else setSelectedLevel("Band 2");
                        setSelectedClass(c);
                        console.log('[EDIT BUTTON] Setting view to create-assignment');
                        setView("create-assignment");
                        console.log('[EDIT BUTTON] State updates queued');
                      }}
                      onDuplicateAssignment={(assignment) => {
                        console.log('[DUPLICATE BUTTON] Clicked! Assignment:', assignment);
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
                        if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                        else if (unknownWords.length > 0) setSelectedLevel("Custom");
                        else setSelectedLevel("Band 2");
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
                    href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${createdClassName}" on Vocaband!\n\n🔑 Class Code:\n\n${createdClassCode}\n\nCopy the code above and paste it in the app!`)}`}
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
                    onClick={async () => {
                      const { error } = await supabase.from('assignments').delete().eq('id', deleteConfirmModal.id);
                      if (error) {
                        showToast("Failed to delete: " + error.message, "error");
                        setDeleteConfirmModal(null);
                        return;
                      }
                      setTeacherAssignments(prev => prev.filter(x => x.id !== deleteConfirmModal.id));
                      showToast("Assignment deleted successfully", "success");
                      setDeleteConfirmModal(null);
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

        {/* End Quick Play Session Confirmation Modal */}
        <AnimatePresence>
          {endQuickPlayModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">End Quick Play Session?</h2>
                <p className="text-stone-500 mb-6">
                  Students will no longer be able to join this session using the code <strong>{quickPlayActiveSession?.sessionCode}</strong>. The session and all progress will be permanently ended.
                </p>
                <p className="text-amber-600 bg-amber-50 px-4 py-3 rounded-2xl mb-6 font-medium border-2 border-amber-200">
                  ⚠️ Make sure all students have finished their games before ending.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEndQuickPlayModal(false)}
                    className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border-2 border-stone-200"
                  >
                    Keep Session
                  </button>
                  <button
                    onClick={async () => {
                      console.log('[End Session] Confirm button clicked');
                      console.log('[End Session] Session code:', quickPlayActiveSession?.sessionCode);
                      console.log('[End Session] Session ID:', quickPlayActiveSession?.id);

                      const { error } = await supabase.rpc('end_quick_play_session', {
                        p_session_code: quickPlayActiveSession!.sessionCode
                      });

                      console.log('[End Session] RPC result:', { error, data: !error });

                      if (error) {
                        console.error('[End Session] Error:', error);
                        showToast("Failed to end session: " + error.message, "error");
                        setEndQuickPlayModal(false);
                        return;
                      }

                      console.log('[End Session] ✓ Session ended successfully');
                      setView("teacher-dashboard");
                      setQuickPlayActiveSession(null);
                      setQuickPlaySelectedWords([]);
                      setQuickPlaySessionCode(null);
                      setQuickPlayJoinedStudents([]);
                      setQuickPlayCustomWords(new Map());
                      setQuickPlayAddingCustom(new Set());
                      setQuickPlayTranslating(new Set());
                      showToast("Quick Play session ended", "success");
                      setEndQuickPlayModal(false);
                    }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    End Session
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                <span>{toast.message}</span>
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
      />
    );
  }


  if (view === "game" && showModeSelection) {
    console.log('[Mode Selection] Rendering mode selection screen');
    console.log('[Mode Selection] assignmentWords length:', assignmentWords.length);
    console.log('[Mode Selection] activeAssignment:', activeAssignment);

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
    const filteredModes = modes.filter(m => m.id === "flashcards" || allowedModes.includes(m.id));

    console.log('[Mode Selection] Modes count:', filteredModes.length);
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

              return (
                <motion.button
                  key={mode.id}
                  onClick={() => { setGameMode(mode.id); setShowModeSelection(false); setShowModeIntro(true); }}
                  className={`p-4 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, translateY: -8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] bg-white flex items-center justify-center mb-3 sm:mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                    {mode.icon}
                    {isCompleted && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
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
          <button onClick={() => setView(user?.role === "teacher" ? "teacher-dashboard" : "student-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full">← Back to Dashboard</button>
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
          showBackButton
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
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black mb-1">
                    Pending Approvals
                  </h1>
                  <p className="text-on-surface-variant font-medium">
                    {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'} waiting
                  </p>
                </div>
                <button
                  onClick={loadPendingStudents}
                  className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container-high rounded-xl font-bold flex items-center gap-2 transition-all"
                  title="Refresh list"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
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
                {toast.type === 'error' && <AlertCircle size={20} />}
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

    // Get all found words (flat array) and unmatched terms
    const allFoundWords: Word[] = [];
    searchResults.forEach(matches => allFoundWords.push(...matches));
    // Remove duplicates
    const uniqueFoundWords = Array.from(new Map(allFoundWords.map(w => [w.id, w])).values());

    // Count exact matches (these are auto-added)
    const exactMatchesCount = searchTerms.filter(term =>
      ALL_WORDS.some(w => w.english.toLowerCase() === term)
    ).length;

    const unmatchedTerms = searchTerms.filter(term => !searchResults.has(term));

    return (
      <div className="min-h-screen bg-surface pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-4 md:px-6">
        <TopAppBar
          title="Quick Play Setup"
          subtitle="SELECT WORDS • GENERATE QR CODE"
          showBack
          onBack={() => setView("teacher-dashboard")}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />

        <div className="max-w-4xl mx-auto">
          {/* Word Search Section */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-surface-container-highest">
            <h2 className="text-lg sm:text-xl font-black text-on-surface mb-3 sm:mb-4 flex items-center gap-2">
              <Search className="text-primary" size={18} sm:size={20} />
              Add Words to Search
            </h2>

            {/* Word Chips Display */}
            {searchTerms.length > 0 ? (
              <div className="mb-4 p-4 bg-surface-container rounded-xl border-2 border-surface-container-highest">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-on-surface">
                    {searchTerms.length} word{searchTerms.length !== 1 ? 's' : ''} added
                  </p>
                  <button
                    onClick={() => setQuickPlaySearchQuery("")}
                    className="text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {searchTerms.map(term => (
                    <div
                      key={term}
                      className="group flex items-center gap-2 px-3 py-2 bg-white rounded-full border-2 border-primary/30 hover:border-primary transition-all"
                    >
                      <span className="text-sm font-bold text-on-surface">{term}</span>
                      <button
                        onClick={() => {
                          // Remove this term from search
                          const terms = quickPlaySearchQuery.split(/[,\s\n\t]+/).filter(t => t.trim().toLowerCase() !== term);
                          setQuickPlaySearchQuery(terms.join(", "));
                        }}
                        className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => setQuickPlayWordEditorOpen(true)}
                className="mb-3 sm:mb-4 p-6 sm:p-8 bg-surface-container rounded-xl border-2 border-dashed border-surface-container-highest text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Search className="mx-auto text-on-surface-variant mb-2" size={24} sm:size={32} />
                <p className="text-sm font-bold text-on-surface-variant mb-1">Click to add words</p>
                <p className="text-xs text-on-surface-variant">Paste: apple, "ice cream", house</p>
              </div>
            )}

            {/* Add More Words Button */}
            {searchTerms.length > 0 && (
              <button
                onClick={() => setQuickPlayWordEditorOpen(true)}
                className="w-full py-2.5 sm:py-3 bg-white border-2 border-dashed border-surface-container-highest rounded-xl text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 mb-3 sm:mb-4"
              >
                <Plus size={14} sm:size={16} />
                Add More Words
              </button>
            )}

            {/* OCR Upload Button */}
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrUpload}
                disabled={isOcrProcessing}
                className="hidden"
                id="quick-play-ocr-upload"
              />
              <button
                onClick={() => document.getElementById('quick-play-ocr-upload')?.click()}
                disabled={isOcrProcessing}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
              >
                {isOcrProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="text-xs sm:text-sm">Processing... {ocrProgress}%</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} sm:size={16} />
                    <span className="text-xs sm:text-sm">Upload Image to Extract Words</span>
                  </>
                )}
              </button>
              <p className="text-xs text-center text-on-surface-variant">Take a photo of a worksheet or text to extract vocabulary words</p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-on-surface-variant">
                {quickPlaySearchQuery ? (
                  <>
                    {searchTerms.length} search term{searchTerms.length !== 1 ? 's' : ''} •
                    <span className="font-bold text-green-600 ml-1">{exactMatchesCount} exact match{exactMatchesCount !== 1 ? 'es' : ''} auto-added ✓</span>
                    {uniqueFoundWords.length > exactMatchesCount && (
                      <span className="font-bold text-blue-600 ml-2">• {uniqueFoundWords.length - exactMatchesCount} more found</span>
                    )}
                    {unmatchedTerms.length > 0 && (
                      <span className="font-bold text-amber-600 ml-2">• {unmatchedTerms.length} need AI translation</span>
                    )}
                  </>
                ) : (
                  <>Paste or type words to search from {ALL_WORDS.length}+ words</>
                )}
              </p>
              <div className="flex gap-2">
                {quickPlaySearchQuery && (
                  <button
                    onClick={() => setQuickPlaySearchQuery("")}
                    className="text-sm text-rose-600 font-bold hover:text-rose-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {unmatchedTerms.length > 0 && (
                  <button
                    onClick={async () => {
                      // Auto-translate and add all unmatched terms
                      let customWordsToAdd: Word[] = [];

                      if (unmatchedTerms.length > 0) {
                        for (const term of unmatchedTerms) {
                          if (!quickPlayCustomWords.has(term)) {
                            const translation = await translateWord(term);
                            if (translation) {
                              const newMap = new Map(quickPlayCustomWords);
                              newMap.set(term, translation);
                              setQuickPlayCustomWords(newMap);
                            }
                          }
                        }

                        // Add all translated custom words
                        quickPlayCustomWords.forEach((data, term) => {
                          if (data.hebrew || data.arabic) {
                            customWordsToAdd.push({
                              id: -Date.now() - Math.floor(Math.random() * 1000) - customWordsToAdd.length,
                              english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                              hebrew: data.hebrew || "",
                              arabic: data.arabic || "",
                              level: "Custom"
                            });
                          }
                        });
                      }

                      // Add only custom translated words (found words are already auto-added)
                      setQuickPlaySelectedWords(prev => [...prev, ...customWordsToAdd]);

                      // Clear custom words state
                      setQuickPlayCustomWords(new Map());
                      setQuickPlayAddingCustom(new Set());

                      // Clear search
                      setQuickPlaySearchQuery("");

                      showToast(`Added ${customWordsToAdd.length} translated word${customWordsToAdd.length !== 1 ? 's' : ''}!`, "success");
                    }}
                    disabled={quickPlayTranslating.size > 0}
                    className="text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1 shadow-lg disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    Add Translated Words ({unmatchedTerms.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Add All & Generate QR Button */}
          {(uniqueFoundWords.length > 0 || unmatchedTerms.length > 0) && quickPlaySelectedWords.length === 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-xl text-white">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black mb-1">Quick Start!</h3>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {exactMatchesCount > 0 && `${exactMatchesCount} exact match${exactMatchesCount > 1 ? 'es' : ''} ready`}
                    {exactMatchesCount > 0 && uniqueFoundWords.length > exactMatchesCount && ` + ${uniqueFoundWords.length - exactMatchesCount} more found`}
                    {unmatchedTerms.length > 0 && ` + ${unmatchedTerms.length} custom word${unmatchedTerms.length > 1 ? 's' : ''} to translate`}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    // Add all found database words
                    const allDbWordsToAdd = uniqueFoundWords.filter(w => !quickPlaySelectedWords.some(sw => sw.id === w.id));
                    setQuickPlaySelectedWords(prev => [...prev, ...allDbWordsToAdd]);

                    // Translate and add all unmatched terms
                    let customWordsToAdd: Word[] = [];

                    if (unmatchedTerms.length > 0) {
                      showToast("Translating custom words...", "info");

                      for (const term of unmatchedTerms) {
                        const translation = await translateWord(term);
                        if (translation) {
                          customWordsToAdd.push({
                            id: -Date.now() - Math.floor(Math.random() * 1000) - customWordsToAdd.length,
                            english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                            hebrew: translation.hebrew,
                            arabic: translation.arabic,
                            sentence: "",
                            example: "",
                            band: "I" as Band,
                            level: 1,
                            frequency: 0
                          });
                        }
                      }

                      setQuickPlaySelectedWords(prev => [...prev, ...customWordsToAdd]);
                    }

                    // Wait for state to update, then generate QR
                    setTimeout(async () => {
                      const updatedSelection = [...allDbWordsToAdd, ...customWordsToAdd];
                      const dbWords = updatedSelection.filter(w => w.id >= 0);
                      const customWords = updatedSelection.filter(w => w.id < 0);
                      const wordIds = dbWords.map(w => w.id);

                      const customWordsJson = customWords.length > 0 ? JSON.stringify(customWords.map(w => ({
                        english: w.english,
                        hebrew: w.hebrew,
                        arabic: w.arabic,
                        sentence: w.sentence || "",
                        example: w.example || ""
                      }))) : null;

                      const { data, error } = await supabase.rpc('create_quick_play_session', {
                        p_word_ids: wordIds.length > 0 ? wordIds : null,
                        p_custom_words: customWordsJson
                      });

                      if (error) {
                        showToast("Failed to create session: " + error.message, "error");
                        return;
                      }

                      const session = data as { id: string, session_code: string };
                      setQuickPlaySessionCode(session.session_code);
                      setQuickPlayActiveSession({
                        id: session.id,
                        sessionCode: session.session_code,
                        wordIds: wordIds,
                        words: updatedSelection
                      });
                      console.log('[Quick Play Teacher] Session created:', session);
                      setQuickPlaySearchQuery("");
                      setView("quick-play-teacher-monitor");
                    }, 500);
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-green-600 rounded-xl font-black hover:bg-white/90 transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
                >
                  <QrCode size={16} sm:size={20} />
                  <span className="text-sm sm:text-base">Add All & Generate QR</span>
                </button>
              </div>
            </div>
          )}

          {/* Unmatched Terms - Add as Custom Words */}
          {unmatchedTerms.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-purple-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-amber-200">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Sparkles className="text-purple-600 flex-shrink-0 mt-0.5" size={16} sm:size={20} />
                  <div>
                    <h3 className="font-black text-amber-900 mb-0.5 sm:mb-1 text-sm sm:text-base">Custom Words Found</h3>
                    <p className="text-xs sm:text-sm text-amber-700">AI will translate these automatically! Click the green "Add All & Generate QR" button above to add everything at once.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                {unmatchedTerms.map(term => {
                  const isAdding = quickPlayAddingCustom.has(term);
                  const customData = quickPlayCustomWords.get(term);

                  if (isAdding) {
                    return (
                      <div key={term} className="bg-white rounded-xl p-2 sm:p-3 border-2 border-amber-300">
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-black text-on-surface text-sm sm:text-base">"{term}"</span>
                            <span className="text-[10px] sm:text-xs text-on-surface-variant">Add translations:</span>
                          </div>
                          {!quickPlayTranslating.has(term) && (
                            <button
                              onClick={() => handleAutoTranslate(term)}
                              className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-0.5 sm:gap-1"
                            >
                              <Sparkles size={10} sm:size={12} />
                              <span className="hidden sm:inline">Auto-translate with AI</span>
                              <span className="sm:hidden">Translate</span>
                            </button>
                          )}
                        </div>
                        {quickPlayTranslating.has(term) && (
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-purple-600">
                            <Loader2 className="animate-spin" size={14} sm:size={16} />
                            <span className="text-[10px] sm:text-xs font-bold">AI is translating...</span>
                          </div>
                        )}
                        <div className="flex gap-1.5 sm:gap-2">
                          <input
                            type="text"
                            placeholder="Hebrew translation..."
                            value={customData?.hebrew || ""}
                            onChange={(e) => {
                              const newMap = new Map(quickPlayCustomWords);
                              newMap.set(term, { hebrew: e.target.value, arabic: customData?.arabic || "" });
                              setQuickPlayCustomWords(newMap);
                            }}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-container border-2 border-surface-container-highest rounded-lg text-xs sm:text-sm font-bold focus:border-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Arabic translation..."
                            value={customData?.arabic || ""}
                            onChange={(e) => {
                              const newMap = new Map(quickPlayCustomWords);
                              newMap.set(term, { hebrew: customData?.hebrew || "", arabic: e.target.value });
                              setQuickPlayCustomWords(newMap);
                            }}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-container border-2 border-surface-container-highest rounded-lg text-xs sm:text-sm font-bold focus:border-primary focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const data = quickPlayCustomWords.get(term);
                              if (!data) return;

                              // Create custom word with negative ID
                              const customWord: Word = {
                                id: -Date.now() - Math.floor(Math.random() * 1000),
                                english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
                                hebrew: data.hebrew || "",
                                arabic: data.arabic || "",
                                level: "Custom"
                              };

                              setQuickPlaySelectedWords(prev => [...prev, customWord]);

                              // Clear and close
                              const newMap = new Map(quickPlayCustomWords);
                              newMap.delete(term);
                              setQuickPlayCustomWords(newMap);

                              const newAdding = new Set(quickPlayAddingCustom);
                              newAdding.delete(term);
                              setQuickPlayAddingCustom(newAdding);
                            }}
                            disabled={!customData?.hebrew && !customData?.arabic}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg font-bold text-xs sm:text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✓ Add
                          </button>
                          <button
                            onClick={() => {
                              const newMap = new Map(quickPlayCustomWords);
                              newMap.delete(term);
                              setQuickPlayCustomWords(newMap);

                              const newAdding = new Set(quickPlayAddingCustom);
                              newAdding.delete(term);
                              setQuickPlayAddingCustom(newAdding);
                            }}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-surface-container text-on-surface rounded-lg font-bold text-xs sm:text-sm hover:bg-surface-container-highest transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isAdded = quickPlaySelectedWords.some(w => w.english.toLowerCase() === term.toLowerCase());

                  return (
                    <div key={term} className={`flex items-center gap-1.5 sm:gap-2 ${isAdded ? 'opacity-50' : ''}`}>
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white rounded-full text-xs sm:text-sm font-bold text-on-surface border-2 border-amber-300">
                        "{term}"
                      </span>
                      {isAdded ? (
                        <span className="text-[10px] sm:text-xs text-green-600 font-bold">✓ Added</span>
                      ) : (
                        <button
                          onClick={() => {
                            const newAdding = new Set(quickPlayAddingCustom);
                            newAdding.add(term);
                            setQuickPlayAddingCustom(newAdding);
                            // Auto-translate on open
                            handleAutoTranslate(term);
                          }}
                          className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-0.5 sm:gap-1"
                        >
                          <Sparkles size={8} sm:size={10} />
                          <span className="hidden sm:inline">Translate & Add</span>
                          <span className="sm:hidden">Translate</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Word Selection Grid */}
          {allFoundWords.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-surface-container-highest">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="text-green-600" size={16} sm:size={20} />
                  <span className="text-base sm:text-lg">Select Words ({quickPlaySelectedWords.length} selected)</span>
                </h2>
                <div className="flex gap-1.5 sm:gap-2">
                  {allFoundWords.length > 0 && quickPlaySelectedWords.length < allFoundWords.length && (
                    <button
                      onClick={() => setQuickPlaySelectedWords(allFoundWords)}
                      className="text-sm text-primary font-bold hover:text-primary/80 transition-colors"
                    >
                      Select All
                    </button>
                  )}
                  {quickPlaySelectedWords.length > 0 && (
                    <button
                      onClick={() => setQuickPlaySelectedWords([])}
                      className="text-sm text-rose-600 font-bold hover:text-rose-700 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Group results by search term */}
              {searchTerms.length > 0 && (
                <div className="space-y-2 sm:space-y-4 max-h-72 sm:max-h-96 overflow-y-auto">
                  {searchTerms
                    .filter(term => searchResults.has(term))
                    .map(term => {
                      const matches = searchResults.get(term)!;
                      const allSelected = matches.every(w => quickPlaySelectedWords.some(sw => sw.id === w.id));
                      const someSelected = matches.some(w => quickPlaySelectedWords.some(sw => sw.id === w.id));

                      return (
                        <div key={term} className="bg-surface-container rounded-xl p-3 sm:p-4 border-2 border-surface-container-highest">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <h3 className="font-black text-on-surface text-sm sm:text-base">
                              "{term}" • {matches.length} word{matches.length !== 1 ? 's' : ''}
                            </h3>
                            <button
                              onClick={() => {
                                if (allSelected) {
                                  // Deselect all in this group
                                  const wordIds = new Set(matches.map(w => w.id));
                                  setQuickPlaySelectedWords(prev => prev.filter(w => !wordIds.has(w.id)));
                                } else {
                                  // Select all in this group
                                  const newWords = matches.filter(w => !quickPlaySelectedWords.some(sw => sw.id === w.id));
                                  setQuickPlaySelectedWords(prev => [...prev, ...newWords]);
                                }
                              }}
                              className={`text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg font-bold transition-colors ${
                                allSelected
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {allSelected ? "Deselect All" : someSelected ? "Select Remaining" : "Select All"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            {matches.map(word => {
                              const isSelected = quickPlaySelectedWords.some(w => w.id === word.id);
                              return (
                                <button
                                  key={word.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setQuickPlaySelectedWords(prev => prev.filter(w => w.id !== word.id));
                                    } else {
                                      setQuickPlaySelectedWords(prev => [...prev, word]);
                                    }
                                  }}
                                  className={`p-2 sm:p-3 rounded-lg border transition-all text-left ${
                                    isSelected
                                      ? "bg-primary-container border-primary text-on-primary-container"
                                      : "bg-surface border-surface-container-highest hover:border-primary/50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-black text-xs sm:text-sm ${isSelected ? "text-on-primary-container" : "text-on-surface"}`}>
                                        {word.english}
                                      </p>
                                      <p className={`text-[10px] sm:text-xs truncate ${isSelected ? "text-on-primary-container/80" : "text-on-surface-variant"}`}>
                                        {word.hebrew} / {word.arabic}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <Check className="text-primary flex-shrink-0" size={14} sm:size={16} />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Custom Words Section */}
          {quickPlaySelectedWords.filter(w => w.id < 0).length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg border-2 border-amber-200">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-black text-amber-900 flex items-center gap-1.5 sm:gap-2">
                  <Sparkles className="text-amber-600" size={16} sm:size={20} />
                  <span className="text-base sm:text-lg">Custom Words ({quickPlaySelectedWords.filter(w => w.id < 0).length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {quickPlaySelectedWords.filter(w => w.id < 0).map(word => {
                  const isSelected = quickPlaySelectedWords.some(w => w.id === word.id);
                  return (
                    <div
                      key={word.id}
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : "bg-white border-amber-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs sm:text-sm">{word.english}</p>
                          <p className="text-[10px] sm:text-xs truncate opacity-80">
                            {word.hebrew || "No Hebrew"} / {word.arabic || "No Arabic"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setQuickPlaySelectedWords(prev => prev.filter(w => w.id !== word.id));
                          }}
                          className="flex-shrink-0 text-rose-600 hover:text-rose-800"
                        >
                          <X size={14} sm:size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate QR Code Button */}
          {quickPlaySelectedWords.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 shadow-xl text-white">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black mb-1">Ready to Start!</h3>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {quickPlaySelectedWords.length} word{quickPlaySelectedWords.length > 1 ? 's' : ''} selected
                  </p>
                </div>
                <button
                  onClick={async () => {
                    // Separate custom words (negative IDs) from database words
                    const dbWords = quickPlaySelectedWords.filter(w => w.id >= 0);
                    const customWords = quickPlaySelectedWords.filter(w => w.id < 0);
                    const wordIds = dbWords.map(w => w.id);

                    // Only create session if we have database words OR we have custom words
                    if (dbWords.length === 0 && customWords.length === 0) {
                      showToast("Please select at least one word", "error");
                      return;
                    }

                    // Prepare custom words for database (convert to JSON)
                    const customWordsJson = customWords.length > 0 ? JSON.stringify(customWords.map(w => ({
                      english: w.english,
                      hebrew: w.hebrew,
                      arabic: w.arabic,
                      sentence: w.sentence || "",
                      example: w.example || ""
                    }))) : null;

                    // Create session with database words AND custom words
                    const { data, error } = await supabase.rpc('create_quick_play_session', {
                      p_word_ids: wordIds.length > 0 ? wordIds : null,
                      p_custom_words: customWordsJson
                    });

                    if (error) {
                      showToast("Failed to create session: " + error.message, "error");
                      return;
                    }

                    const session = data as { id: string, session_code: string };
                    setQuickPlaySessionCode(session.session_code);
                    setQuickPlayActiveSession({
                      id: session.id,
                      sessionCode: session.session_code,
                      wordIds: wordIds,
                      words: quickPlaySelectedWords // Include all words (db + custom)
                    });
                    console.log('[Quick Play Teacher] Session created with custom words:', session);
                    setView("quick-play-teacher-monitor");
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-indigo-600 rounded-xl font-black hover:bg-white/90 transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
                >
                  <QrCode size={16} sm:size={20} />
                  <span className="text-sm sm:text-base">Generate QR Code</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Word Editor Modal */}
        {quickPlayWordEditorOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-surface-container-highest">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-1.5 sm:gap-2">
                    <Search className="text-primary" size={16} sm:size={20} />
                    <span className="text-base sm:text-lg">Add Your Words</span>
                  </h2>
                  <button
                    onClick={() => setQuickPlayWordEditorOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X size={20} sm:size={24} />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 sm:mt-2">
                  Type or paste words below. Use <span className="font-bold">commas</span> to separate words, or put each word on a <span className="font-bold">new line</span>.
                </p>
              </div>

              {/* Textarea */}
              <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
                <textarea
                  placeholder='Examples:&#10;apple, ice cream, house, book&#10;&#10;Or each word on a new line:&#10;apple&#10;ice cream&#10;house&#10;book&#10;&#10;Use commas or newlines to separate!'
                  value={quickPlaySearchQuery}
                  onChange={(e) => setQuickPlaySearchQuery(e.target.value)}
                  className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 bg-surface-container border-2 border-surface-container-highest text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium resize-none text-sm sm:text-base"
                  autoFocus
                />

                {/* Word Preview */}
                {searchTerms.length > 0 && (
                  <div className="mt-3 sm:mt-4">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <p className="text-xs sm:text-sm font-bold text-on-surface">
                        {searchTerms.length} word{searchTerms.length !== 1 ? 's' : ''} detected
                      </p>
                      <button
                        onClick={() => setQuickPlaySearchQuery("")}
                        className="text-[10px] sm:text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
                      {searchTerms.map(term => (
                        <div
                          key={term}
                          draggable
                          onDragStart={() => setDraggedWord(term)}
                          onDragEnd={() => setDraggedWord(null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (draggedWord && draggedWord !== term) {
                              // Merge words: draggedWord + " " + term
                              const mergedPhrase = `${draggedWord} ${term}`;
                              const terms = quickPlaySearchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== draggedWord && t !== term);
                              terms.push(mergedPhrase);
                              setQuickPlaySearchQuery(terms.join(", "));
                              setDraggedWord(null);
                            }
                          }}
                          className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white rounded-full border transition-all cursor-move
                            ${draggedWord === term ? 'opacity-50' : ''}
                            ${draggedWord && draggedWord !== term ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-surface-container-highest hover:border-rose-300'}
                          `}
                          title={draggedWord && draggedWord !== term ? `Drop "${draggedWord}" here to make "${draggedWord} ${term}"` : term}
                        >
                          <span className="text-xs sm:text-sm font-bold text-on-surface">{term}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Remove this term by splitting and filtering
                              const terms = quickPlaySearchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== term);
                              setQuickPlaySearchQuery(terms.join(", "));
                            }}
                            className="text-rose-400 hover:text-rose-600 transition-opacity"
                            aria-label={`Remove ${term}`}
                          >
                            <X size={12} sm:size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {searchTerms.length > 1 && (
                      <p className="text-[10px] sm:text-xs text-on-surface-variant mt-1.5 sm:mt-2 flex items-center gap-0.5 sm:gap-1">
                        <Info size={10} sm:size={12} />
                        <span className="hidden sm:inline">Tip: Drag one word onto another to combine them into a phrase!</span>
                        <span className="sm:hidden">Drag words together to make phrases!</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 border-t border-surface-container-highest flex items-center justify-between gap-2">
                <button
                  onClick={() => setQuickPlayWordEditorOpen(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setQuickPlayWordEditorOpen(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base"
                >
                  <CheckCircle2 size={14} sm:size={18} />
                  Done - Added {searchTerms.length} Words
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "quick-play-teacher-monitor") {
    if (!quickPlayActiveSession) {
      setView("quick-play-setup");
      return null;
    }
    // Fix QR code for local development: use local network IP instead of localhost
    // so phones can scan and access the game
    const getNetworkOrigin = () => {
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        // In development, use local network IP so phones can connect
        return 'http://10.0.0.5:3000';
      }
      return origin;
    };
    const qrUrl = `${getNetworkOrigin()}/quick-play?session=${quickPlayActiveSession.sessionCode}`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-3 sm:p-6 text-white">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => {
                setView("teacher-dashboard");
                setQuickPlayActiveSession(null);
                setQuickPlaySelectedWords([]);
                setQuickPlaySessionCode(null);
                setQuickPlayJoinedStudents([]);
                setQuickPlayCustomWords(new Map());
                setQuickPlayAddingCustom(new Set());
                setQuickPlayTranslating(new Set());
              }}
              className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-sm sm:text-base bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => {
                console.log('[End Session] Button clicked');
                console.log('[End Session] Session:', quickPlayActiveSession);
                setEndQuickPlayModal(true);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105"
            >
              End Session
            </button>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <motion.h1
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
            >
              🎮 Quick Play
            </motion.h1>
            <p className="text-white/90 font-bold text-xs sm:text-base">
              Scan QR code to play • {quickPlayActiveSession.words.length} words • No login required
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* QR Code Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
              <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
                <QrCode size={20} sm:size={24} />
                QR Code
              </h2>

              {/* QR Code Display */}
              <div className="bg-white rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="aspect-square max-w-[200px] sm:max-w-[250px] mx-auto">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`}
                    alt="Quick Play QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-white/80 text-center mb-3 sm:mb-4">
                Session Code: <span className="bg-white text-purple-600 px-3 py-1 rounded-lg font-mono font-black ml-1">
                  {quickPlayActiveSession.sessionCode}
                </span>
              </p>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  showToast("Link copied to clipboard!", "success");
                }}
                className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 border-2 border-white/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Copy size={16} sm:size={18} />
                Copy Link
              </button>
            </div>

            {/* Live Stats Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
              <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
                <Users size={20} sm:size={24} />
                Live Stats
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {/* Students Joined */}
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-bold">Students Joined</span>
                    <span className="text-xl sm:text-2xl font-black">{quickPlayJoinedStudents.length}</span>
                  </div>
                </div>

                {/* Live Leaderboard */}
                {quickPlayJoinedStudents.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-white/80">LIVE LEADERBOARD</h3>
                    {quickPlayJoinedStudents
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((student, idx) => (
                        <div
                          key={student.name}
                          className="bg-white/10 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black">#{idx + 1}</span>
                            <span className="text-2xl">{student.avatar}</span>
                            <span className="font-bold">{student.name}</span>
                          </div>
                          <span className="text-xl font-black">{student.score}</span>
                        </div>
                      ))}
                  </div>
                )}

                {quickPlayJoinedStudents.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Users size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="font-bold">Waiting for students to join...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Words Preview */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mt-6">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <BookOpen size={24} />
              Words ({quickPlayActiveSession.words.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {quickPlayActiveSession.words.map(word => (
                <span
                  key={word.id}
                  className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold"
                >
                  {word.english}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
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
                  <div className="space-y-2">
                    {classAnalytics.topMistakes.map(({ wordId, count }) => {
                      const word = ALL_WORDS.find(w => w.id === wordId);
                      const pct = Math.round((count / classAnalytics.maxMistakeCount) * 100);
                      return (
                        <div key={wordId} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-bold text-on-surface truncate">{word?.english || `#${wordId}`}</span>
                              <span className="text-error font-bold ml-2">{count}x</span>
                            </div>
                            <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-error/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {word?.hebrew && <span className="text-xs text-on-surface-variant w-16 text-right truncate" dir="rtl">{word.hebrew}</span>}
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

          {/* Explanation banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-purple-900 text-sm sm:text-base mb-2">Student Scores Matrix</h2>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-300 inline-block"></span> ★ 90%+ Excellent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"></span> 70-89% Good</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span> Below 70%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-100 border border-stone-200 inline-block"></span> — Not attempted</span>
            </div>
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
                          className="px-3 py-2 font-bold text-stone-800 text-sm sticky left-0 bg-white hover:bg-stone-50 cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all"
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
                        <div className="grid grid-cols-2 gap-2">
                          {selectedScore.mistakes.map((wordId, idx) => {
                            const word = BAND_2_WORDS.find(w => w.id === wordId);
                            return (
                              <div key={`${selectedScore.id}-${wordId}-${idx}`} className="bg-white p-3 rounded-xl border border-stone-200">
                                <p className="font-bold text-stone-800">{word?.english || "Unknown"}</p>
                                <p className="text-xs text-stone-500">{word?.hebrew || ""}</p>
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
                            const word = BAND_2_WORDS.find(w => w.id === wordId);
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
                                <p className="font-bold text-stone-800">{s.assignmentId}</p>
                                <p className="text-xs text-stone-500">
                                  {s.mode} • {new Date(s.completedAt).toLocaleDateString()}
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
                    supabase.auth.getSession().then(({ data: { session } }) => {
                      const token = session?.access_token ?? "";
                      socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: cls.code, token });
                    });
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
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Trophy className="w-20 h-20 sm:w-24 sm:h-24 text-yellow-500 mb-4 mx-auto" />
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{
          [
            `Kol Hakavod, ${user?.displayName}!`,
            `Amazing work, ${user?.displayName}!`,
            `You crushed it, ${user?.displayName}!`,
            `${user?.displayName}, you're a star!`,
            `Incredible, ${user?.displayName}!`,
            `Way to go, ${user?.displayName}!`,
            `${user?.displayName} is on fire!`,
            `Bravo, ${user?.displayName}!`,
          ][Math.floor(Math.random() * 8)]
        }</h1>
        <p className="text-lg sm:text-xl mb-6">{
          [
            "You finished the assignment!",
            "Another challenge conquered!",
            "Your vocabulary is growing!",
            "Keep this momentum going!",
            "You're making great progress!",
          ][Math.floor(Math.random() * 5)]
        }</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-lg">
          <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-stone-500 mb-1">Final Score</p>
            <p className="text-4xl sm:text-6xl font-black text-blue-700">{score}</p>
          </div>
          <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center">
            <p className="text-xs sm:text-sm uppercase tracking-widest text-stone-500 mb-1">Total XP</p>
            <p className="text-4xl sm:text-6xl font-black text-blue-600">{xp}</p>
          </div>
          {streak > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border-2 border-orange-100 flex-1 text-center">
              <p className="text-sm uppercase tracking-widest text-orange-500 mb-1">Streak</p>
              <p className="text-5xl sm:text-6xl font-black text-orange-600">{streak} 🔥</p>
            </div>
          )}
        </div>
        {badges.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-black text-stone-400 uppercase mb-4 tracking-widest">Badges Earned</p>
            <div className="flex flex-wrap justify-center gap-3">
              {badges.map(badge => (
                <motion.div 
                  key={badge}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-2"
                >
                  <span className="text-xl">{badge.split(' ')[0]}</span>
                  <span className="font-bold text-stone-700">{badge.split(' ').slice(1).join(' ')}</span>
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
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleExitGame}
            disabled={isSaving}
            className="bg-black text-white px-12 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >Choose Another Mode</button>
          <button
            onClick={() => { setIsFinished(false); setScore(0); setCurrentIndex(0); setMistakes([]); setFeedback(null); setShowModeSelection(true); setView("student-dashboard"); }}
            disabled={isSaving}
            className="text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors"
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
                <span>{toast.message}</span>
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

  return (
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeConfig.colors.bg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-8 font-sans max-w-7xl mx-auto`}>
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
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="bg-white px-3 sm:px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <Trophy className="text-amber-500" size={18} />
            <span className="font-black text-stone-800">{score}</span>
          </div>
          <div className="bg-blue-50 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-blue-700 font-bold text-xs uppercase tracking-widest">XP: {xp}</span>
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
            <Languages size={18} /><span className="text-sm font-bold uppercase hidden sm:inline">{targetLanguage}</span>
          </button>
          <button onClick={handleExitGame} className="text-stone-400 hover:text-stone-900 font-bold text-sm">Exit</button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {gameMode === "matching" ? (
            <motion.div 
              key="matching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4"
            >
              <AnimatePresence>
              {matchingPairs.filter(item => !matchedIds.includes(item.id)).map((item, idx) => {
                const key = `${item.id}-${item.type}-${idx}`;
                return (
                <motion.button
                  key={key}
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMatchClick(item)}
                  className={`p-3 sm:p-6 rounded-2xl shadow-sm font-bold text-sm sm:text-lg h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
                    selectedMatch?.id === item.id && selectedMatch?.type === item.type
                      ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                      : "bg-white text-stone-800 hover:shadow-md"
                  }`}
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
              className={`bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl p-3 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-4 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-4 border-red-500" : feedback === "show-answer" ? "bg-amber-50 border-4 border-amber-500" : "border-4 border-transparent"}`}
            >
              {/* Progress Bar */}
              <progress
                className="absolute top-0 left-0 h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                max={100}
                value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
              />

              {/* Motivational message - positioned at top to not block answers */}
              {motivationalMessage && (
                <div className="absolute top-2 sm:top-4 left-0 right-0 flex justify-center pointer-events-none z-20">
                  <span className="text-lg sm:text-3xl font-black text-blue-700 drop-shadow animate-bounce bg-white/80 px-3 py-1 sm:px-4 sm:py-2 rounded-2xl">
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

              <div className="mb-3 sm:mb-12">
                <span className="inline-block bg-stone-100 text-stone-500 font-black text-xs sm:text-base px-3 py-1 rounded-full mb-1 sm:mb-2">{currentIndex + 1} / {gameWords.length}</span>
                <div className="flex flex-col items-center justify-center gap-2 sm:gap-6 mb-3 sm:mb-12">
                  {currentWord?.imageUrl && (
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-48 sm:h-48 object-cover rounded-[16px] sm:rounded-[32px] shadow-lg border-4 border-white"
                    />
                  )}
                  <h2 className={`text-2xl sm:text-5xl md:text-6xl font-black text-stone-900 relative z-10 break-words w-full text-center ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}
                    dir={(gameMode === "spelling" || gameMode === "reverse" || (gameMode === "flashcards" && isFlipped)) ? "auto" : "ltr"}>
                    {gameMode === "spelling" || gameMode === "reverse" ? currentWord?.[targetLanguage] :
                     gameMode === "scramble" ? scrambledWord :
                     gameMode === "flashcards" ? (isFlipped ? currentWord?.[targetLanguage] : currentWord?.english) :
                     currentWord?.english}
                  </h2>
                </div>
                <div className="flex justify-center gap-2 mt-1 sm:mt-0">
                  <button
                    onClick={() => speakWord(currentWord?.id)}
                    className="p-2 sm:p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
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
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                  {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
                    <AnswerOptionButton key={option.id} option={option} currentWordId={currentWord.id} feedback={feedback} gameMode={gameMode} targetLanguage={targetLanguage} onAnswer={handleAnswer} />
                  ))}
                </div>
              ) : gameMode === "true-false" ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-stone-100 p-3 sm:p-8 rounded-2xl sm:rounded-3xl mb-3 sm:mb-8">
                    <p className="text-xl sm:text-3xl font-bold text-stone-800" dir="auto">{tfOption?.[targetLanguage]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => handleTFAnswer(true)} className="py-3 sm:py-6 rounded-2xl sm:rounded-3xl text-base sm:text-2xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">True</button>
                    <button onClick={() => handleTFAnswer(false)} className="py-3 sm:py-6 rounded-2xl sm:rounded-3xl text-base sm:text-2xl font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">False</button>
                  </div>
                </div>
              ) : gameMode === "flashcards" ? (
                <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
                  <button onClick={() => setIsFlipped(!isFlipped)} className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                    {isFlipped ? "Show English" : "Show Translation"}
                  </button>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => handleFlashcardAnswer(false)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">Still Learning</button>
                    <button onClick={() => handleFlashcardAnswer(true)} className="py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors">Got It!</button>
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
                                className="w-8 h-10 sm:w-12 sm:h-14 rounded-xl font-black text-lg sm:text-2xl flex items-center justify-center border-[3px] sm:border-4 flex-shrink-0 transition-all duration-300"
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
                      <button type="submit" className="w-full py-3 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-colors">Check Answer</button>
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
                        <button onClick={() => { setBuiltSentence([]); setAvailableWords(shuffle(sentences[sentenceIndex].split(" ").filter(Boolean))); }} className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">Clear</button>
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
                    className={`w-full p-3 sm:p-6 text-lg sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      feedback === "show-answer" ? "border-amber-500 bg-amber-50 text-amber-700 cursor-not-allowed" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-4 sm:mb-8 text-sm sm:text-base">Translation: <span className="text-stone-900">{currentWord?.[targetLanguage]}</span></p>
                  )}
                  {feedback === "show-answer" && (
                    <ShowAnswerFeedback answer={currentWord?.english} dir="ltr" className="mb-4" />
                  )}
                  <button type="submit" className="w-full py-3 sm:py-4 bg-stone-900 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-black transition-colors">Check Answer</button>
                </form>
              )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live Leaderboard Widget */}
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
}
