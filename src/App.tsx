import React, { useState, useEffect, useMemo, useRef, useCallback, lazy } from "react";
import type { View, ShopTab } from "./core/views";
import { HelpTooltip, HelpIcon } from "./components/HelpTooltip";
import { ALL_WORDS, SET_1_WORDS, SET_2_WORDS, TOPIC_PACKS, Word } from "./data/vocabulary";
import { generateSentencesForAssignment } from "./data/sentence-bank";
import {
  searchWords
} from "./data/vocabulary-matching";
import {
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, mapProgressToDb, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./core/supabase";
import { useAudio } from "./hooks/useAudio";
import { useRetention } from "./hooks/useRetention";
import { useBoosters } from "./hooks/useBoosters";
import QuickPlayKickedScreen from "./components/QuickPlayKickedScreen";
import QuickPlaySessionEndScreen from "./components/QuickPlaySessionEndScreen";
import FloatingButtons from "./components/FloatingButtons";
import { PRIVACY_POLICY_VERSION} from "./config/privacy-config";
import { shuffle, chunkArray, addUnique, removeKey } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './core/types';
// SetupWizard is now lazy-loaded via QuickPlaySetupView
// CreateAssignmentWizard is now lazy-loaded via CreateAssignmentView
import { type WordAnalysisResult} from "./utils/wordAnalysis";
import CookieBanner, { CookiePreferences } from "./components/CookieBanner";
import { LandingPageWrapper, TermsPageWrapper, PrivacyPageWrapper, DemoModeWrapper, AccessibilityStatementWrapper } from "./components/LazyComponents";
import { LazyWrapper} from "./components/SuspenseWrapper";

// Lazy-loaded views (code-split into separate chunks)
const ShopView = lazy(() => import("./views/ShopView"));
const PrivacySettingsView = lazy(() => import("./views/PrivacySettingsView"));
const GlobalLeaderboardView = lazy(() => import("./views/GlobalLeaderboardView"));
const TeacherApprovalsView = lazy(() => import("./views/TeacherApprovalsView"));
const CreateAssignmentView = lazy(() => import("./views/CreateAssignmentView"));
const GradebookView = lazy(() => import("./views/GradebookView"));
const AnalyticsView = lazy(() => import("./views/AnalyticsView"));
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
import { loadMammoth, loadSocketIO, loadConfetti } from "./utils/lazyLoad";
import { trackError, trackAutoError } from "./errorTracking";
import { compressImageForUpload } from "./utils/compressImage";
import ImageCropModal from "./components/ImageCropModal";
import { getGameDebugger } from "./utils/gameDebug";
import {
  MAX_ATTEMPTS_PER_WORD, AUTO_SKIP_DELAY_MS, SHOW_ANSWER_DELAY_MS, WRONG_FEEDBACK_DELAY_MS,
  MAX_ASSIGNMENT_ROUNDS,
  THEMES,
  type GameMode,
} from "./constants/game";
import { incrementAssignmentPlays, isAssignmentLocked, resolveAssignmentPlays } from "./hooks/useAssignmentPlays";

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

  const [view, setView] = useState<View>(() => {
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
  const [shopTab, setShopTab] = useState<ShopTab>("hub");
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
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
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
  // Per-word attempts accumulated during the current game.  Flushed to the
  // word_attempts table via save_student_progress when the student finishes.
  // Reset on game start so each session is independent.
  const [wordAttemptBatch, setWordAttemptBatch] = useState<Array<{ word_id: number; is_correct: boolean }>>([]);
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
              // Validate the intended class exists before offering to switch.
              const { data: intendedClassRows } = await supabase
                .from('classes').select('code, name').eq('code', intendedNorm);
              if (intendedClassRows && intendedClassRows.length > 0) {
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
              }
              // Intended code was typed but doesn't match a real class.
              // Set a sticky banner (NOT a toast — toasts auto-dismiss and
              // students miss them).  ClassNotFoundBanner on the dashboard
              // renders this until the student acknowledges it.
              setClassNotFoundIntent(intendedNorm);
              clearIntendedClassCode();
            } else if (intendedCode) {
              // Same class — just clear the flag
              clearIntendedClassCode();
            }

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
      if (atDashboardFloor) {
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

  // Find matching Set 2 words (EXACT OR PARTIAL MATCH)
  // Combines duplicates and merges translations (Hebrew+Hebrew, Arabic+Arabic)
  // Also combines words with/without "(n)" suffix
  const findMatchesInSet2 = (words: string[]): { matched: Word[], unmatched: string[] } => {
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

    const { matched, unmatched } = findMatchesInSet2(words);

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

      // Class-switch detection: same logic as the restoreSession path.
      // If the student entered a class code that differs from their
      // current one and it's a real class, show the switch modal instead
      // of logging them into their existing class.
      const intendedCode = readIntendedClassCode();
      const intendedNorm = intendedCode?.trim().toUpperCase() || null;
      const currentNorm = studentData.class_code?.trim().toUpperCase() || '';
      if (intendedNorm && currentNorm && intendedNorm !== currentNorm) {
        const { data: intendedClassRows } = await supabase
          .from('classes').select('code, name').eq('code', intendedNorm);
        if (intendedClassRows && intendedClassRows.length > 0) {
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
        }
        // Typed a code that doesn't exist — sticky banner on dashboard so
        // the student can actually see the problem (toasts get missed).
        setClassNotFoundIntent(intendedNorm);
        clearIntendedClassCode();
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
    setWordAttemptBatch([]);
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
        p_avatar: user.avatar || "🦊",
        // Per-word attempt batch — the migration 20260423 added support for
        // this arg.  Older DBs without the migration will fail the RPC call;
        // catch below logs and falls back.  Empty array is fine (no attempts).
        p_word_attempts: wordAttemptBatch,
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

    // Record the attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

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

    // Record the flashcard answer for per-word mastery tracking.
    // Flashcard "Got it" = correct, "Still learning" = incorrect.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: knewIt }]);

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

    // Record the spelling attempt for per-word mastery tracking.
    setWordAttemptBatch(prev => [...prev, { word_id: currentWord.id, is_correct: isCorrect }]);

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
        />
      </LazyWrapper>
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

  // Shown when a logged-in user presses the hardware back button at the
  // dashboard floor.  Tapping "Leave" exits the app by popping past the
  // pad buffer; "Stay" dismisses the modal and keeps the user in place.
  const exitConfirmModal = showExitConfirmModal ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-black mb-2">Leave Vocaband?</h2>
        <p className="text-stone-500 mb-6">
          You'll need to sign in again next time.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExitConfirmModal(false)}
            className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 border-2 border-stone-200 transition-colors"
          >
            Stay
          </button>
          <button
            onClick={() => {
              setShowExitConfirmModal(false);
              // Signal that the next popstate should NOT re-trap.
              // Then sign out and reset history so the logged-out
              // public-landing renders cleanly.  The user can then
              // press back once more to exit the tab naturally.
              exitIntentRef.current = true;
              supabase.auth.signOut().catch(() => {});
              try { window.history.replaceState({ view: 'public-landing' }, ''); } catch {}
              // Give SIGNED_OUT a tick to fire, then release the
              // exit-intent guard so normal navigation resumes.
              setTimeout(() => { exitIntentRef.current = false; }, 500);
            }}
            className="flex-1 py-4 rounded-2xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // --- CLASS SWITCH MODAL -------------------------------------------------
  // Shown when an already-approved student logs in with a class code that
  // differs from their current class_code.  Approve = update profile +
  // users row to the new class and land on the new dashboard (no teacher
  // re-approval per Approach 1).  Cancel = keep the current class.
  const handleConfirmClassSwitch = async () => {
    if (!pendingClassSwitch) return;
    const { toCode, supabaseUser } = pendingClassSwitch;
    const email = supabaseUser.email ?? "";
    try {
      // Update both tables atomically from the client — no RPC needed, the
      // student owns both rows (RLS keyed on email/uid).  Run in parallel.
      await Promise.all([
        supabase.from('student_profiles').update({ class_code: toCode, status: 'approved' }).eq('email', email),
        supabase.from('users').update({ class_code: toCode }).eq('uid', supabaseUser.id),
      ]);

      // Load the new class's data and navigate to its dashboard.
      const { data: classRows } = await supabase
        .from('classes').select('*').eq('code', toCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select('*').eq('class_code', toCode).eq('student_uid', supabaseUser.id),
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
        .from('classes').select('*').eq('code', fromCode);
      if (classRows && classRows.length > 0) {
        const classData = mapClass(classRows[0]);
        const [assignResult, progressResult] = await Promise.all([
          supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
          supabase.from('progress').select('*').eq('class_code', fromCode).eq('student_uid', supabaseUser.id),
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
  // class code that doesn't exist.  Now has a direct "Sign out & retry"
  // button so the student doesn't need to hunt for the logout control.
  const classNotFoundBanner = classNotFoundIntent ? (
    <div className="max-w-4xl mx-auto mb-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-rose-500 to-pink-500 text-white shadow-lg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">⚠️</div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm sm:text-base">Class code "{classNotFoundIntent}" not found</p>
            <p className="text-xs sm:text-sm text-white/90 mt-0.5 leading-relaxed">
              That class doesn't exist. You're still signed in to your current class.
            </p>
          </div>
          <button
            onClick={() => setClassNotFoundIntent(null)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              // Sign out + navigate back to the student login so they
              // can type the correct code.  Also clear the dismiss-state
              // so the banner doesn't linger past the redirect.
              setClassNotFoundIntent(null);
              try { await supabase.auth.signOut(); } catch {/* noop */}
              setView('student-account-login');
            }}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-rose-700 bg-white hover:bg-rose-50 px-4 py-2 rounded-xl shadow-md transition-all"
          >
            Sign out & try again
          </button>
          <button
            onClick={() => setClassNotFoundIntent(null)}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all"
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const classSwitchModal = pendingClassSwitch ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-black mb-2">Switch class?</h2>
        <p className="text-stone-600 mb-6 leading-relaxed">
          You're currently in{' '}
          <span className="font-bold text-stone-900">
            {pendingClassSwitch.fromClassName ?? pendingClassSwitch.fromCode}
          </span>
          {'. '}Do you want to switch to{' '}
          <span className="font-bold text-stone-900">
            {pendingClassSwitch.toClassName ?? pendingClassSwitch.toCode}
          </span>
          ?
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={handleCancelClassSwitch}
            style={{ touchAction: 'manipulation' }}
            className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 border-2 border-stone-200 transition-colors"
          >
            Stay in {pendingClassSwitch.fromCode}
          </button>
          <button
            onClick={handleConfirmClassSwitch}
            style={{ touchAction: 'manipulation' }}
            className="flex-1 py-4 rounded-2xl font-black text-white bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-lg active:scale-95 transition-all"
          >
            Switch to {pendingClassSwitch.toCode}
          </button>
        </div>
      </div>
    </div>
  ) : null;

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
            window.history.replaceState({ view: 'quick-play-setup' }, '', window.location.pathname);
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
          onAnalyticsClick={() => { fetchScores(); fetchTeacherAssignments(); setView("analytics"); }}
          onGradebookClick={() => { fetchScores(); setView("gradebook"); }}
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
          isQuickPlayGuest={isQuickPlayGuest}
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
        />
      </LazyWrapper>
    );
  }

  if (view === "analytics") {
    return (
      <LazyWrapper loadingMessage="Loading analytics...">
        <AnalyticsView
          user={user}
          classes={classes}
          allScores={allScores}
          teacherAssignments={teacherAssignments}
          setView={setView}
        />
      </LazyWrapper>
    );
  }
  if (view === "gradebook") {
    return (
      <LazyWrapper loadingMessage="Loading gradebook...">
        <GradebookView
          user={user}
          allScores={allScores}
          teacherAssignments={teacherAssignments}
          classStudents={classStudents}
          classes={classes}
          expandedStudent={expandedStudent}
          setExpandedStudent={setExpandedStudent}
          setView={setView}
          showToast={showToast}
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
          setMotivationalMessage={setMotivationalMessage}
          setAssignmentWords={setAssignmentWords}
          setShowModeSelection={setShowModeSelection}
          setView={setView}
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
        motivationalMessage={motivationalMessage}
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