import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useFloating, offset, flip, shift, arrow } from "@floating-ui/react";
import { ALL_WORDS, BAND_1_WORDS, BAND_2_WORDS, Word } from "./vocabulary";
import {
  searchWords
} from "./vocabulary-matching";
import {
  Volume2,
  Languages,
  Trophy,
  RefreshCw,
  LogIn,
  UserCircle,
  Users,
  CheckCircle2,
  BookOpen,
  BarChart3,
  ChevronRight,
  Upload,
  AlertTriangle,
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
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { io, Socket } from "socket.io-client";
import { supabase, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, mapProgressToDb, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./supabase";
import Tesseract from 'tesseract.js';
import { shuffle, chunkArray } from './utils';
import { LeaderboardEntry, SOCKET_EVENTS } from './types';

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase


const MOTIVATIONAL_MESSAGES = [
  "Great job! 🎉", "Well done! 👏", "Awesome! 🌟", "Keep it up! 💪",
  "Nailed it! 🎯", "Brilliant! ✨", "You're on fire! 🔥", "Fantastic! 🚀",
  "Way to go! 🏆", "Superstar! ⭐",
];
const randomMotivation = () =>
  MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

// --- REUSABLE HELP TOOLTIP COMPONENT ---
// Powered by @floating-ui/react - modern positioning engine
// Desktop only - shows on hover, hidden on mobile devices
const HelpTooltip = ({ children, content, position = "bottom" }: {
  children: React.ReactNode;
  content: string | string[];
  position?: "top" | "bottom" | "left" | "right";
}) => {
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useMemo(() => 'ontouchstart' in window, []);
  const contentArray = Array.isArray(content) ? content : [content];

  const { refs, floatingStyles, middlewareData } = useFloating({
    open: isVisible && !isMobile,
    onOpenChange: setIsVisible,
    placement: position,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
  });
  const { setReference, setFloating } = refs;

  // Handle hover events
  const handleMouseEnter = () => {
    if (!isMobile) setIsVisible(true);
  };

  const staticSide = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }[position];

  return (
    <>
      <span
        ref={setReference}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        className="inline"
      >
        {children}
      </span>
      {isVisible && !isMobile && (
        <div
          ref={setFloating}
          style={floatingStyles}
          className="z-50"
        >
          <div className="w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
            {contentArray.map((line, i) => (
              <p key={i} className={i > 0 ? "mt-1 text-slate-300" : ""}>{line}</p>
            ))}
          </div>
          {middlewareData.arrow?.x != null && (
            <div
              ref={setArrowEl}
              className="absolute w-2 h-2 bg-slate-900 rotate-45"
              style={{
                left: middlewareData.arrow.x ?? undefined,
                top: middlewareData.arrow.y ?? undefined,
                [staticSide]: '-4px',
              }}
            />
          )}
        </div>
      )}
    </>
  );
};

// Question mark icon for help hints
const HelpIcon = ({ tooltip, position = "bottom" }: { tooltip: string | string[]; position?: "top" | "bottom" | "left" | "right" }) => (
  <HelpTooltip content={tooltip} position={position}>
    <span className="inline-flex items-center justify-center w-5 h-5 ml-1.5 text-slate-400 bg-slate-100 rounded-full cursor-help hover:bg-slate-200 hover:text-slate-600 transition-all">
      <span className="text-[10px] font-bold">?</span>
    </span>
  </HelpTooltip>
);

export default function App() {
  type GameMode = "classic" | "listening" | "spelling" | "matching" | "true-false" | "flashcards" | "scramble" | "reverse";
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "game" | "teacher-dashboard" | "student-dashboard" | "create-assignment" | "gradebook" | "live-challenge" | "live-challenge-class-select" | "analytics" | "global-leaderboard" | "students">("landing");
  const [landingTab, setLandingTab] = useState<"student" | "teacher">("student");
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [createdClassName, setCreatedClassName] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);

  const [studentAvatar, setStudentAvatar] = useState("🦊");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const AVATAR_CATEGORIES = {
    Animals: ["🦊", "🦁", "🐯", "🐨", "🐼", "🐸", "🐵", "🦄", "🐻", "🐰", "🦋", "🐙", "🦜"],
    Faces: ["😎", "🤓", "🥳", "😊", "🤩", "🥹", "😜", "🤗", "🥰", "😇", "🧐", "🤠"],
    Sports: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "⛳"],
    Food: ["🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🥨", "🍦", "🍩", "🍪", "🎂", "🍰"],
    Objects: ["🎸", "🎹", "🎺", "🎷", "🪕", "🎻", "🎤", "🎧", "📷", "🎮", "🕹️", "💎"],
    Nature: ["🌸", "🌺", "🌻", "🌷", "🌹", "🍀", "🌲", "🌳", "🌵", "🌴", "🍄", "🌾"],
    Space: ["🚀", "🛸", "🌙", "⭐", "🌟", "💫", "✨", "☄️", "🪐", "🌍", "🔥", "💧"]
  };

  const ASSIGNMENT_TITLE_SUGGESTIONS = [
    "Classic Mode Practice",
    "Listening Challenge",
    "Spelling Bee",
    "Matching Pairs",
    "True or False",
    "Flashcard Review",
    "Word Scramble",
    "Reverse Mode",
    "Mixed Modes Practice",
    "Unit 5 Vocabulary",
    "Midterm Review",
    "Final Exam Practice",
    "Spelling Bee Practice",
    "Word Building Exercise",
    "Flashcard Mastery",
    "Listening Comprehension",
    "Reading Vocabulary",
    "Grammar & Vocabulary",
    "Advanced Vocabulary Test"
  ];

  const [selectedAvatarCategory, setSelectedAvatarCategory] = useState<keyof typeof AVATAR_CATEGORIES>("Animals");

  // --- LIVE CHALLENGE STATE ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry>>({});
  const [isLiveChallenge, setIsLiveChallenge] = useState(false);

  // --- TEACHER DATA STATE ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"Band 1" | "Band 2" | "Custom">("Band 2");
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [allScores, setAllScores] = useState<ProgressData[]>([]);
  const [classStudents, setClassStudents] = useState<{name: string, classCode: string, lastActive: string}[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<{name: string, score: number, avatar: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentModes, setAssignmentModes] = useState<string[]>(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]);

  // --- SMART PASTE STATE ---
  const [pastedText, setPastedText] = useState("");
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteMatchedCount, setPasteMatchedCount] = useState(0);
  const [pasteUnmatched, setPasteUnmatched] = useState<string[]>([]);

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
  const [showAssignmentWelcome, setShowAssignmentWelcome] = useState(true);
  // --- PERFORMANCE OPTIMIZATIONS ---
  // Use Set for O(1) lookup instead of array.includes() which is O(n)
  const selectedWordsSet = useMemo(() => new Set(selectedWords), [selectedWords]);
  const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const toScoreHeightClass = (score: number) => {
    if (score < 25) return "h-1/4";
    if (score < 50) return "h-2/4";
    if (score < 75) return "h-3/4";
    return "h-full";
  };

  // --- STUDENT DATA STATE ---
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">("hebrew");
  const [isFinished, setIsFinished] = useState(false);

  // --- NEW MODES STATE ---
  const [tfOption, setTfOption] = useState<Word | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // --- MATCHING MODE STATE ---
  const [matchingPairs, setMatchingPairs] = useState<{id: number, text: string, type: 'english' | 'hebrew'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: number, type: 'english' | 'hebrew'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);

  // --- RELIABILITY STATE ---
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Refs for socket reconnect handler (avoids stale closure on [] deps useEffect)
  const userRef = useRef(user);
  const isLiveChallengeRef = useRef(isLiveChallenge);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { if (feedback === null) setMotivationalMessage(null); }, [feedback]);
  useEffect(() => { isLiveChallengeRef.current = isLiveChallenge; }, [isLiveChallenge]);

  // Reset welcome popup when entering assignment creation view
  useEffect(() => {
    if (view === "create-assignment") {
      setShowAssignmentWelcome(true);
    }
  }, [view]);

  useEffect(() => {
    const s = io({ reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
    setSocket(s);

    s.on("connect", () => setSocketConnected(true));
    s.on("disconnect", () => setSocketConnected(false));
    s.on("reconnect", () => {
      setSocketConnected(true);
      const currentUser = userRef.current;
      if (currentUser?.role === "student" && currentUser.classCode && isLiveChallengeRef.current) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token ?? "";
          s.emit("join-challenge", { classCode: currentUser.classCode, name: currentUser.displayName, uid: currentUser.uid, token });
        });
      }
    });
    s.on("connect_error", (err) => console.error("Socket connection error:", err.message));
    s.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data) => {
      setLeaderboard(data);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // --- AUTH LOGIC ---
  useEffect(() => {
    // Exchange PKCE code from URL before subscribing to auth changes.
    // We do this manually (detectSessionInUrl: false in supabase.ts) to
    // avoid lock contention when React StrictMode double-mounts.
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      supabase.auth.exchangeCodeForSession(params.get('code')!).then(() => {
        // Clean the URL so a page refresh doesn't try to re-use the code
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(() => {
        // Code may have already been exchanged (StrictMode double-mount) — ignore
      });
    }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const supabaseUser = session.user;
          const userData = await fetchUserProfile(supabaseUser.id);
          if (userData) {
            setUser(userData);
            if (userData.role === "teacher") {
              fetchTeacherData(supabaseUser.id);
              setView("teacher-dashboard");
            } else if (userData.role === "student" && userData.classCode) {
              // Restore student dashboard on page refresh — load their assignments
              // and progress exactly as handleStudentLogin does.
              const code = userData.classCode;
              const { data: classRows } = await supabase
                .from('classes').select('*').eq('code', code);
              if (classRows && classRows.length > 0) {
                const classData = mapClass(classRows[0]);
                const { data: assignRows } = await supabase
                  .from('assignments').select('*').eq('class_id', classData.id);
                setStudentAssignments((assignRows ?? []).map(mapAssignment));
                const { data: progressRows } = await supabase
                  .from('progress').select('*')
                  .eq('class_code', code)
                  .eq('student_uid', supabaseUser.id);
                setStudentProgress((progressRows ?? []).map(mapProgress));
              }
              setBadges(userData.badges || []);
              setView("student-dashboard");
            }
          } else {
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
                displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "Teacher",
              };
              await supabase.from('users').insert(mapUserToDb(newUser));
              setUser(newUser);
              setView("teacher-dashboard");
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Only redirect to landing on an explicit sign-out.  INITIAL_SESSION
          // fires before Supabase finishes restoring the session from storage,
          // so we must wait for the actual session state instead of redirecting.
          setUser(null);
          setView("landing");
        } else if (!session && event !== 'INITIAL_SESSION') {
          // No session exists (after restoration completed) - show landing
          setUser(null);
          setView("landing");
        }
      } catch (err) {
        // Log the error but do NOT redirect to landing — a transient Supabase
        // error should not sign the user out of a session they already have.
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Safety timeout: if auth state never resolves (e.g. offline on mobile refresh),
  // stop the spinner after 3 seconds so the app doesn't hang forever.
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);
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
    window.history.pushState({ view }, '');
  }, [view]);

  // Handle the physical back button (popstate fires on Android hardware back
  // and browser back gesture on iOS).
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prevView = e.state?.view as typeof view | undefined;
      if (prevView) {
        isPopStateNavRef.current = true;
        setView(prevView);
      }
      // If no state, the browser will naturally close/go to the previous page.
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const fetchTeacherData = async (uid: string) => {
    const { data, error } = await supabase.from('classes').select('*').eq('teacher_uid', uid);
    if (!error && data) setClasses(data.map(mapClass));
  };

  const handleCreateClass = async () => {
    if (!newClassName || !user) return;

    const code = Array.from(crypto.getRandomValues(new Uint32Array(6)))
      .map(x => x % 10)
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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const words: Word[] = lines.slice(1).map((line, idx) => {
        const [english, hebrew, arabic] = line.split(",");
        return {
          id: 5000 + idx,
          english: english?.trim(),
          hebrew: hebrew?.trim(),
          arabic: arabic?.trim(),
          level: "Custom" as const
        };
      }).filter(w => w.english && w.hebrew);
      
      setCustomWords(words);
      setSelectedLevel("Custom");
    };
    reader.readAsText(file);
  };

  /**
   * handleOcrUpload
   * This function takes an image file (e.g., a photo of a book page),
   * uses Tesseract.js to "read" the text from the image, and then
   * matches that text against our vocabulary bank.
   * 
   * Analogy: It's like giving the computer a pair of glasses and asking it
   * to circle all the words it recognizes from our dictionary!
   */
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrProgress(0);

    try {
      // 1. Run Tesseract OCR on the image
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      // 2. Clean up the extracted text
      const text = result.data.text;
      // Convert to lowercase, remove punctuation, and split into an array of words
      const wordsInText = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
      
      // 3. Match against our vocabulary bank (ALL_WORDS)
      const matchedWords = ALL_WORDS.filter(w => wordsInText.includes(w.english.toLowerCase()));
      
      if (matchedWords.length === 0) {
        showToast("No words from our vocabulary bank were found in this image.", "info");
      } else {
        // 4. Add the matched words to the Custom tab and select them
        setCustomWords(matchedWords);
        setSelectedLevel("Custom");
        setSelectedWords(matchedWords.map(w => w.id));
        showToast(`Found ${matchedWords.length} words from the vocabulary bank!`, "success");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      showToast("Error processing image. Please try again.", "error");
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      // Reset the file input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  // --- SMART PASTE FUNCTIONS ---

  // Extract words from pasted text - handles commas, newlines, semicolons, pipes
  const extractWordsFromPaste = (text: string): string[] => {
    const words = text
      .split(/[,\n;|]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 1 && w.length < 50); // Filter invalid
    return [...new Set(words)]; // Remove duplicates
  };

  // Find matching Band 2 words (EXACT OR PARTIAL MATCH)
  const findMatchesInBand2 = (words: string[]): { matched: Word[], unmatched: string[] } => {
    const matched: Word[] = [];
    const unmatched: string[] = [];

    for (const word of words) {
      const found = BAND_2_WORDS.find(w =>
        w.english.toLowerCase() === word ||
        w.english.toLowerCase().startsWith(word) ||
        w.english.toLowerCase().endsWith(word)
      );
      if (found) {
        matched.push(found);
      } else {
        unmatched.push(word);
      }
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
    let words = selectedLevel === "Band 1" ? BAND_1_WORDS :
                 selectedLevel === "Band 2" ? BAND_2_WORDS : customWords;

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
    if (!selectedClass || selectedWords.length === 0 || !assignmentTitle) {
      showToast("Please enter a title and select words.", "error");
      return;
    }

    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToSave = uniqueWords.filter(w => selectedWordsSet.has(w.id));
    
    const newAssignment = {
      classId: selectedClass.id,
      wordIds: selectedWords,
      words: wordsToSave,
      title: assignmentTitle,
      deadline: assignmentDeadline || null,
      createdAt: new Date().toISOString(),
      allowedModes: assignmentModes
    };

    try {
      const { error } = await supabase.from('assignments').insert({
        class_id: newAssignment.classId,
        word_ids: newAssignment.wordIds,
        words: newAssignment.words,
        title: newAssignment.title,
        deadline: newAssignment.deadline,
        created_at: newAssignment.createdAt,
        allowed_modes: newAssignment.allowedModes,
      });
      if (error) throw error;
      showToast("Assignment created successfully!", "success");
      setView("teacher-dashboard");
      setSelectedWords([]);
      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentModes(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]);
    } catch (error) {
      handleDbError(error, OperationType.CREATE, "assignments");
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
      wordIds: selectedWords,
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

  const handleStudentLogin = async (code: string, name: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      // Sign in anonymously — reuse existing session if present
      let session = (await supabase.auth.getSession()).data.session;
      if (!session || !session.user.is_anonymous) {
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError || !data.session) {
          setError("Login failed: " + (signInError?.message ?? "Could not create session"));
          setLoading(false);
          return;
        }
        session = data.session;
      }
      const studentUid = session.user.id;

      // Look up class by code
      const { data: classRows, error: classErr } = await supabase
        .from('classes').select('*').eq('code', code);
      if (classErr) throw classErr;
      if (!classRows || classRows.length === 0) {
        setError("Invalid Class Code!");
        setLoading(false);
        return;
      }
      const classData = mapClass(classRows[0]);

      // Upsert student profile FIRST — must happen before fetching assignments so RLS can verify class membership
      const { data: userRow } = await supabase
        .from('users').select('*').eq('uid', studentUid).maybeSingle();
      let userData: AppUser;
      if (userRow) {
        // Always sync class_code to the class they're currently joining
        userData = { ...mapUser(userRow), classCode: code };
        const { error: updateErr } = await supabase
          .from('users').update({ class_code: code }).eq('uid', studentUid);
        if (updateErr) throw updateErr;
      } else {
        userData = {
          uid: studentUid,
          role: "student",
          displayName: name,
          classCode: code,
          avatar: studentAvatar,
          badges: [],
        };
        const { error: insertErr } = await supabase.from('users').insert(mapUserToDb(userData));
        if (insertErr) throw insertErr;
      }

      // Fetch assignments for the class (user row now exists, so RLS class membership check passes)
      const { data: assignRows, error: assignErr } = await supabase
        .from('assignments').select('*').eq('class_id', classData.id);
      if (assignErr) throw assignErr;
      if (!assignRows || assignRows.length === 0) {
        setError("No assignments found for this class yet!");
        setLoading(false);
        return;
      }
      const assignments = assignRows.map(mapAssignment);

      // Load existing progress for this student in this class (use UID — name is spoofable)
      const { data: progressRows, error: progErr } = await supabase
        .from('progress').select('*')
        .eq('class_code', code)
        .eq('student_uid', studentUid);
      if (progErr) throw progErr;
      const progress = (progressRows ?? []).map(mapProgress);

      setStudentAssignments(assignments);
      setStudentProgress(progress);
      setUser(userData);
      setBadges(userData.badges || []);

      // Join Live Challenge
      if (socket) {
        const token = session.access_token;
        socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, { classCode: code, name, uid: studentUid, token });
      }

      setView("student-dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong during login.");
    }
    setLoading(false);
  };

  const awardBadge = async (badge: string) => {
    if (!user || badges.includes(badge)) return;
    
    const newBadges = [...badges, badge];
    setBadges(newBadges);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.3 }
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
    // Scope to the student's own class to avoid cross-class PII leaks.
    // RLS already restricts results, but filtering explicitly makes the intent clear.
    const classCode = user?.classCode;
    if (!classCode) return;
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

  // --- GAME LOGIC ---
  const gameWords = view === "game" && assignmentWords.length > 0 ? assignmentWords : BAND_2_WORDS;
  const currentWord = gameWords[currentIndex];

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

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (view === "game" && !isFinished && currentWord && !showModeSelection) {
      speak(currentWord.english);
    }
  }, [currentIndex, isFinished, view, currentWord, showModeSelection]);

  useEffect(() => {
    if (view === "game" && !showModeSelection && gameMode === "matching") {
      const shuffled = shuffle(gameWords).slice(0, 6);
      const pairs = shuffle([
        ...shuffled.map(w => ({ id: w.id, text: w.english, type: 'english' as const })),
        ...shuffled.map(w => ({ id: w.id, text: w.hebrew, type: 'hebrew' as const }))
      ]);
      setMatchingPairs(pairs);
      setMatchedIds([]);
      setSelectedMatch(null);
    }
  }, [view, showModeSelection, gameMode, gameWords]);

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
      setView("landing");
    }
  };

  const saveScore = async () => {
    if (!user || !activeAssignment) return;
    setIsSaving(true);
    setSaveError(null);

    const xpEarned = score;
    setXp(prev => prev + xpEarned);

    // Streak logic: if score >= 80, increment streak
    if (score >= 80) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    if (score === 100) await awardBadge("🎯 Perfect Score");
    if (streak >= 5) await awardBadge("🔥 Streak Master");
    if (xp >= 500) await awardBadge("💎 XP Hunter");

    // Get current auth session UID to ensure RLS policy compatibility
    const { data: { session } } = await supabase.auth.getSession();
    const currentAuthUid = session?.user?.id;
    if (!currentAuthUid) {
      throw new Error("Not authenticated - please log in again");
    }

    const progress: Omit<ProgressData, "id"> = {
      studentName: user.displayName,
      studentUid: currentAuthUid, // Use current auth session UID
      assignmentId: activeAssignment.id,
      classCode: user.classCode || "",
      score: score,
      mode: gameMode,
      completedAt: new Date().toISOString(),
      mistakes: mistakes,
      avatar: user.avatar || "🦊"
    };

    try {
      // Upsert: insert or update if higher score. The unique constraint
      // (assignment_id, student_uid, mode, class_code) prevents duplicates.
      // Check for existing record first so we only update when score is higher.
      const { data: existingRows } = await supabase
        .from('progress').select('id, score')
        .eq('assignment_id', activeAssignment.id)
        .eq('mode', gameMode)
        .eq('student_uid', currentAuthUid)
        .eq('class_code', user.classCode || "");

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        if (score > existing.score) {
          const { error } = await supabase
            .from('progress').update(mapProgressToDb(progress)).eq('id', existing.id);
          if (error) throw error;
          setStudentProgress(prev =>
            prev.map(p => p.id === existing.id ? { id: existing.id, ...progress } : p)
          );
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('progress').insert(mapProgressToDb(progress)).select().single();
        if (error) throw error;
        setStudentProgress(prev => [...prev, { id: inserted.id, ...progress }]);
      }

      // Clear any queued retry for this assignment+mode
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.removeItem(retryKey);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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

  const handleMatchClick = (item: {id: number, type: 'english' | 'hebrew'}) => {
    if (matchedIds.includes(item.id)) return;
    
    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        setMatchedIds([...matchedIds, item.id]);
        const newScore = score + 15;
        setScore(newScore);
        
        if (socket && user?.classCode) {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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
      setMotivationalMessage(randomMotivation());
      const newScore = score + 10;
      setScore(newScore);
      
      if (socket && user?.classCode) {
        socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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

  const handleTFAnswer = (isTrue: boolean) => {
    if (feedback) return;
    const isActuallyTrue = tfOption?.id === currentWord.id;
    
    if (isTrue === isActuallyTrue) {
      setFeedback("correct");
      setMotivationalMessage(randomMotivation());
      const newScore = score + 15;
      setScore(newScore);
      
      if (socket && user?.classCode) {
        socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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
      setMotivationalMessage(randomMotivation());
      setTimeout(() => setMotivationalMessage(null), 1000);
      const newScore = score + 5;
      setScore(newScore);
      if (socket && user?.classCode) {
        socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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
      setMotivationalMessage(randomMotivation());
      const newScore = score + 20;
      setScore(newScore);
      
      if (socket && user?.classCode) {
        socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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

    return { students, assignments, matrix, averages, studentMap, getStudentClassCode, getStudentAvatar };
  }, [allScores]);

  // State for selected score detail view
  const [selectedScore, setSelectedScore] = useState<ProgressData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <RefreshCw className="animate-spin text-blue-700" size={48} />
    </div>;
  }

  if (view === "landing" && !user) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 via-indigo-900 p-7 sm:p-8 text-center text-white relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-white/30 via-white/20 to-white/10 rounded-2xl sm:rounded-3xl flex items-center justify-center backdrop-blur-sm overflow-hidden shadow-xl shadow-blue-900/50 ring-2 ring-white/30">
                  <img src="/logo.webp" alt="Vocaband" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-blue-50 to-blue-100 bg-clip-text text-transparent">Vocaband</h1>
              </div>
              <p className="text-blue-100 text-base sm:text-lg font-medium">Israeli English Curriculum</p>
              <p className="text-blue-100 text-base sm:text-lg font-medium">Band II Vocabulary</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-8 sm:mb-8">
              <button
                onClick={() => setLandingTab("student")}
                className={`flex-1 py-4 sm:py-3 rounded-xl font-bold transition-all text-lg sm:text-sm ${landingTab === "student" ? "bg-white text-blue-700 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                Student
              </button>
              <button
                onClick={() => setLandingTab("teacher")}
                className={`flex-1 py-4 sm:py-3 rounded-xl font-bold transition-all text-lg sm:text-sm ${landingTab === "teacher" ? "bg-white text-blue-700 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                Teacher
              </button>
            </div>

            <AnimatePresence mode="wait">
              {landingTab === "student" ? (
                <motion.div
                  key="student"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="space-y-5">
                    <div className="relative">
                      <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        type="text"
                        placeholder="Class Code"
                        id="class-code"
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-base"
                      />
                    </div>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        type="text"
                        placeholder="Your Name"
                        id="student-name"
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-base"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-5 rounded-2xl shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Choose Avatar</p>
                        <HelpIcon tooltip="Pick a fun emoji to represent you in class!" position="left" />
                      </div>

                      {/* Category Tabs */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>).map(category => (
                          <button
                            key={category}
                            onClick={() => setSelectedAvatarCategory(category)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-md ${
                              selectedAvatarCategory === category
                                ? "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200"
                                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>

                      {/* Avatar Grid */}
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_CATEGORIES[selectedAvatarCategory].map(a => (
                          <button
                            key={a}
                            onClick={() => setStudentAvatar(a)}
                            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-lg sm:text-xl transition-all ${
                              studentAvatar === a
                                ? "bg-gradient-to-br from-blue-300 via-blue-500 to-blue-800 shadow-xl shadow-blue-300 ring-2 ring-blue-400 scale-110"
                                : "bg-white hover:bg-gradient-to-br hover:from-stone-50 hover:to-stone-100 hover:scale-105 shadow-sm"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const code = (document.getElementById("class-code") as HTMLInputElement).value;
                        const name = (document.getElementById("student-name") as HTMLInputElement).value;
                        if (code && name) handleStudentLogin(code, name);
                        else showToast("Please enter both code and name!", "error");
                      }}
                      className="w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 via-blue-800 text-white py-5 sm:py-5 rounded-2xl font-black text-lg sm:text-xl shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 hover:from-blue-500 hover:via-blue-600 hover:to-blue-900 transition-all active:scale-95 relative overflow-hidden"
                    >
                      <span className="relative z-10">Join Class</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-transparent to-blue-600 opacity-0 hover:opacity-20 transition-opacity"></div>
                    </button>
                    {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}

                    <button
                      onClick={() => { fetchGlobalLeaderboard(); setView("global-leaderboard"); }}
                      className="w-full flex items-center justify-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors text-sm mt-3"
                    >
                      <Trophy size={16} />
                      <span className="hidden sm:inline">View Global Leaderboard</span>
                      <span className="sm:hidden">Leaderboard</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="teacher"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12 sm:space-y-4"
                >
                  <p className="text-center text-stone-500 text-xl sm:text-sm font-medium">
                    Sign in with your school Google account
                  </p>

                  {error && <p className="text-red-500 text-xl sm:text-sm font-bold text-center">{error}</p>}

                  <button
                    onClick={() => supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: window.location.origin },
                    }).then(({ error: err }) => {
                      if (err) setError(`Google sign-in failed: ${err.message}. Please try again.`);
                    })}
                    className="w-full flex items-center justify-center gap-5 bg-white border-3 border-stone-200 py-14 sm:py-4 rounded-2xl font-black text-2xl sm:text-base text-stone-700 hover:bg-stone-50 transition-all active:scale-95 shadow-md"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-10 h-10 sm:w-5 sm:h-5" alt="Google" />
                    Sign in with Google
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-8 text-center">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-stone-400 text-xs hover:text-stone-600 underline">Privacy Policy</a>
            <span className="text-stone-300 mx-2">|</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-stone-400 text-xs hover:text-stone-600 underline">Terms of Service</a>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === "student" && view === "student-dashboard") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-14 h-14 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                {user.avatar}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Hello, {user.displayName}!</h1>
                <p className="text-stone-500 font-bold text-base sm:text-sm">Class Code: <span className="text-blue-700">{user.classCode}</span></p>
                {badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {badges.map(badge => (
                      <div key={badge} className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-1">
                        <Trophy size={14} />
                        {badge}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-stone-500 font-bold hover:text-red-500 text-base sm:text-sm">Logout</button>
          </div>

          {studentAssignments.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-lg font-bold text-stone-800 mb-3 sm:mb-2">Overall Progress</h3>
              <div className="flex items-center gap-3 sm:gap-4">
                <progress
                  className="flex-1 h-5 sm:h-4 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600 rounded-full overflow-hidden"
                  max={100}
                  value={toProgressValue((studentAssignments.filter(a => {
                    const allowedModes = a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                    const completedModes = new Set(
                      studentProgress.filter(p => p.assignmentId === a.id).map(p => p.mode)
                    ).size;
                    return completedModes >= allowedModes.length;
                  }).length / studentAssignments.length) * 100)}
                />
                <span className="font-bold text-stone-500 text-sm sm:text-sm">
                  {studentAssignments.filter(a => {
                    const allowedModes = a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                    const completedModes = new Set(
                      studentProgress.filter(p => p.assignmentId === a.id).map(p => p.mode)
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
                {studentAssignments.map(assignment => {
                  const allowedModes = assignment.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                  const totalModes = allowedModes.length;

                  // Find unique modes completed for this assignment
                  const completedModes = new Set(
                    studentProgress
                      .filter(p => p.assignmentId === assignment.id)
                      .map(p => p.mode)
                  ).size;

                  const progressPercentage = Math.min(100, Math.round((completedModes / totalModes) * 100));
                  const isComplete = completedModes >= totalModes;

                  return (
                    <div key={assignment.id} className="bg-stone-50 p-5 sm:p-6 rounded-3xl border-2 border-stone-100 hover:border-blue-200 transition-colors">
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
                            setAssignmentWords(filteredWords);
                            setActiveAssignment(assignment);
                            setView("game");
                            setShowModeSelection(true);
                          }}
                          className="w-full sm:w-auto px-6 py-4 sm:py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors whitespace-nowrap text-base sm:text-sm"
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
                          className={`h-4 sm:h-3 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 ${isComplete ? "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600" : "[&::-webkit-progress-value]:bg-blue-500 [&::-moz-progress-bar]:bg-blue-500"}`}
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
      </div>
    );
  }

  if (user?.role === "teacher" && view === "teacher-dashboard") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <div>
              <p className="text-xs sm:text-sm text-stone-500">Welcome back,</p>
              <h1 className="text-xl sm:text-3xl font-black text-stone-900">{user?.displayName || "Teacher"}</h1>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-stone-500 font-bold hover:text-red-500 text-xs sm:text-sm px-3 sm:px-4 py-2 bg-white rounded-xl shadow-sm border-2 border-blue-100 hover:border-red-200">Logout</button>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Live Challenge */}
            <HelpTooltip content="Start a real-time vocabulary competition - students race to answer correctly!">
              <button
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
                    // Multiple classes - show selector
                    setView("live-challenge-class-select");
                  }
                }}
                className="bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <RefreshCw className="text-blue-600 mb-3 sm:mb-4 group-hover:rotate-180 transition-transform duration-500" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Live Challenge</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Real-time competition</p>
              </button>
            </HelpTooltip>

            {/* Analytics */}
            <HelpTooltip content="View detailed class performance data, averages, and insights">
              <button
                onClick={() => { fetchScores(); setView("analytics"); }}
                className="bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <BarChart3 className="text-purple-600 mb-3 sm:mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Analytics</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Class insights</p>
              </button>
            </HelpTooltip>

            {/* Students */}
            <HelpTooltip content="Manage student list and view who has joined your classes">
              <button
                onClick={() => { fetchStudents(); setView("students"); }}
                className="bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <UserCircle className="text-orange-600 mb-3 sm:mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Students</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Manage students</p>
              </button>
            </HelpTooltip>

            {/* Gradebook */}
            <HelpTooltip content="Track individual student progress, scores, and activity history">
              <button
                onClick={() => { fetchScores(); setView("gradebook"); }}
                className="bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <Trophy className="text-blue-700 mb-3 sm:mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Gradebook</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Track progress</p>
              </button>
            </HelpTooltip>
          </div>

          {/* My Classes - Full width below */}
          <div className="bg-white p-2 sm:p-8 rounded-3xl shadow-md border-2 border-blue-100">
            <div className="flex justify-between items-center mb-2 sm:mb-6">
              <h2 className="text-sm sm:text-xl font-bold flex items-center gap-2"><Users className="text-blue-700" size={16} /> My Classes</h2>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="p-1.5 sm:p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border-2 border-blue-200"
                aria-label="Create new class"
                title="Create new class"
              >
                <Plus size={16} />
              </button>
            </div>
            {classes.length === 0 ? <p className="text-stone-400 italic text-xs sm:text-sm">No classes yet. Create one to get a code!</p> : (
              <div className="space-y-1 sm:space-y-2">
                {[...classes].reverse().map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-blue-50/50 rounded-xl border-2 border-blue-200 hover:shadow-md hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold text-stone-800 text-sm truncate">{c.name}</p>
                      <p className="text-sm font-mono text-blue-700 bg-blue-50 px-3 py-1 rounded-lg font-bold flex-shrink-0">{c.code}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          setCopiedCode(c.code);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="p-2 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all border border-blue-200"
                        title="Copy Code"
                      >
                        {copiedCode === c.code ? <Check size={16} className="text-blue-700" /> : <Copy size={16} />}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code: ${c.code}\n\nSee you there!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all border border-green-200"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </a>
                      <button
                        onClick={() => { setSelectedClass(c); setView("create-assignment"); }}
                        className="px-4 py-2 text-blue-700 font-bold text-sm hover:bg-blue-50 rounded-lg transition-all border-2 border-blue-200"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => handleDeleteClass(c.id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all border border-red-200 rounded-lg"
                        title="Delete Class"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
                    href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${createdClassName}" on Vocaband!\n\n🔑 Class Code: ${createdClassCode}\n\nSee you there!`)}`}
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

  if (view === "create-assignment" && selectedClass) {
    return (
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full">← Back to Dashboard</button>
          <div className="bg-white rounded-[40px] shadow-xl p-10">
            <h2 className="text-3xl font-black mb-2 text-stone-900">Assign to {selectedClass.name}</h2>

            <div className="space-y-4 mb-8">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Assignment Title"
                  list="assignment-titles"
                  value={assignmentTitle}
                  onChange={(e) => {
                    setAssignmentTitle(e.target.value);
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-blue-100 focus:border-blue-300 outline-none"
                />
                <datalist id="assignment-titles">
                  {ASSIGNMENT_TITLE_SUGGESTIONS.map((title) => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                    aria-label="Assignment deadline"
                    title="Assignment deadline"
                    className={`w-auto min-w-[200px] p-4 rounded-2xl border-2 ${assignmentDeadline && assignmentDeadline < new Date().toISOString().split('T')[0] ? 'border-red-500' : 'border-blue-100'} focus:border-blue-300 outline-none`}
                  />
                  {assignmentDeadline && assignmentDeadline < new Date().toISOString().split('T')[0] && (
                    <p className="text-red-500 text-sm font-bold ml-2">Warning: Deadline is in the past!</p>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-stone-700">Choose Game Modes:</p>
                  <button 
                    onClick={() => {
                      const all = ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                      if (assignmentModes.length === all.length) {
                        setAssignmentModes([]);
                      } else {
                        setAssignmentModes(all);
                      }
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800"
                  >
                    {assignmentModes.length === 8 ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"] as const).map(mode => {
                    const modeEmojis: Record<string, string> = {
                      classic: '📝',
                      listening: '🎧',
                      spelling: '✍️',
                      matching: '🔗',
                      'true-false': '✓',
                      flashcards: '🎴',
                      scramble: '🔤',
                      reverse: '🔄'
                    };
                    return (
                      <button
                        key={mode}
                        onClick={() => setAssignmentModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])}
                        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap ${assignmentModes.includes(mode) ? "bg-blue-500 text-white shadow-md" : "bg-white text-stone-500 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300"}`}
                      >
                        {modeEmojis[mode]} {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Smart Paste Box - NEW */}
            <div className="bg-blue-50 rounded-2xl p-3 mb-3 border-2 border-blue-100">
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-lg">📋</span>
                <h3 className="font-bold text-blue-900 text-sm">Import Word List</h3>
                <span className="text-xs text-blue-600 ml-auto">Paste from anywhere</span>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste Hebrew and/or English words here...

Examples:
• שלום, peace, hello
• תפוח, apple
• apple, banana, orange
• One word per line
• Separated by commas or semicolons"
                className="w-full p-2.5 rounded-xl border border-blue-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={12}
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-sm text-blue-600 font-medium">
                  {pastedText.trim() && `✓ ${pastedText.split(/[\n,;]+/).filter(w => w.trim()).length} word(s) detected`}
                </span>
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pastedText.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Import Words
                </button>
              </div>
            </div>

            <div className="flex flex-nowrap gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2">
              {(["Band 1", "Band 2", "Custom"] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-bold transition-all text-xs sm:text-sm whitespace-nowrap ${selectedLevel === level ? "bg-blue-700 text-white shadow-lg shadow-blue-100" : "bg-white text-stone-500 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300"}`}
                >
                  {level}
                </button>
              ))}
              <label className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-stone-900 text-white rounded-xl font-bold cursor-pointer hover:bg-black transition-all whitespace-nowrap text-xs sm:text-sm">
                <Upload size={16} />
                <span className="hidden sm:inline">Upload CSV</span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>

              <label className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-bold cursor-pointer transition-all relative overflow-hidden whitespace-nowrap text-xs sm:text-sm ${isOcrProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <Camera size={16} />
                {isOcrProcessing ? `Scanning... ${ocrProgress}%` : <span className="hidden sm:inline">Scan Page (OCR)</span>}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleOcrUpload}
                  className="hidden"
                  disabled={isOcrProcessing}
                />
                {isOcrProcessing && (
                  <progress
                    className="absolute bottom-0 left-0 h-1 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white/50 [&::-moz-progress-bar]:bg-white/50"
                    max={100}
                    value={toProgressValue(ocrProgress)}
                  />
                )}
              </label>
            </div>

            {/* Browse Word Bank Toggle */}
            <button
              onClick={() => setShowWordBank(!showWordBank)}
              className="w-full mb-4 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl border-2 border-stone-200 transition-all flex items-center justify-between"
            >
              <span className="font-bold text-stone-700">📚 Browse Word Bank</span>
              <span className="text-stone-500">{showWordBank ? "▲" : "▼"}</span>
            </button>

            {/* Search Options */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setEnableFuzzyMatch(!enableFuzzyMatch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  enableFuzzyMatch
                    ? 'bg-blue-500 text-white'
                    : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                }`}
              >
                🔤 Fuzzy Match: {enableFuzzyMatch ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setEnableWordFamilies(!enableWordFamilies)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  enableWordFamilies
                    ? 'bg-blue-500 text-white'
                    : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                }`}
              >
                🌳 Word Families: {enableWordFamilies ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Collapsible Word Bank */}
            {showWordBank && (
              <>
                {/* Quick Search */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="🔍 Search words..."
                    value={wordSearchQuery}
                    onChange={(e) => setWordSearchQuery(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                {/* Quick Category Filters - Only show when search or filters active */}
                {(wordSearchQuery || selectedCore || selectedPos || selectedRecProd) && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {/* Core Filter */}
                      <select
                        value={selectedCore}
                        onChange={(e) => setSelectedCore(e.target.value as "Core I" | "Core II" | "")}
                        aria-label="Filter by core"
                        title="Filter by core"
                        className="px-3 py-1.5 rounded-lg bg-white border-2 border-blue-100 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                      >
                        <option value="">All Core</option>
                        <option value="Core I">Core I</option>
                        <option value="Core II">Core II</option>
                      </select>

                      {/* Part of Speech Filter */}
                      <select
                        value={selectedPos}
                        onChange={(e) => setSelectedPos(e.target.value)}
                        aria-label="Filter by part of speech"
                        title="Filter by part of speech"
                        className="px-3 py-1.5 rounded-lg bg-white border-2 border-blue-100 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                      >
                        <option value="">All POS</option>
                        <option value="n">Nouns</option>
                        <option value="v">Verbs</option>
                        <option value="adj">Adjectives</option>
                        <option value="adv">Adverbs</option>
                        <option value="prep">Prepositions</option>
                        <option value="conj">Conjunctions</option>
                      </select>

                      {/* Rec/Prod Filter */}
                      <select
                        value={selectedRecProd}
                        onChange={(e) => setSelectedRecProd(e.target.value as "Rec" | "Prod" | "")}
                        aria-label="Filter by receptive or productive type"
                        title="Filter by receptive or productive type"
                        className="px-3 py-1.5 rounded-lg bg-white border-2 border-blue-100 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                      >
                        <option value="">All Types</option>
                        <option value="Rec">Receptive</option>
                        <option value="Prod">Productive</option>
                      </select>

                      {/* Clear Filters Button */}
                      {(selectedCore || selectedPos || selectedRecProd || wordSearchQuery) && (
                        <button
                          onClick={() => {
                            setSelectedCore("");
                            setSelectedPos("");
                            setSelectedRecProd("");
                            setWordSearchQuery("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all border-2 border-red-200"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>

                    {/* Active Filter Summary */}
                    <div className="text-xs text-stone-500 mb-2">
                      {wordSearchQuery && `Search: "${wordSearchQuery}" `}
                      {selectedCore && `| Core: ${selectedCore} `}
                      {selectedPos && `| POS: ${selectedPos} `}
                      {selectedRecProd && `| Type: ${selectedRecProd}`}
                    </div>
                  </>
                )}

                {/* Compact Word List with Tap-to-Add */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[300px] overflow-y-auto p-3 bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                  {currentLevelWords.map(word => {
                    const isSelected = selectedWordsSet.has(word.id);
                    return (
                      <button
                        key={`word-select-${word.id}`}
                        onClick={() => toggleWordSelection(word.id)}
                        className={`p-3 rounded-xl text-left flex justify-between items-center transition-all ${isSelected ? "bg-blue-600 text-white shadow-md" : "bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300"}`}
                      >
                        <div>
                          <p className={`font-bold ${isSelected ? "text-white" : "text-stone-900"}`}>{word.english}</p>
                          <p className={`text-xs truncate ${isSelected ? "text-blue-100" : "text-stone-400"}`}>{word.hebrew} | {word.arabic}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-white/20" : "bg-stone-100"}`}>
                          {isSelected ? "✓" : "+"}
                        </div>
                      </button>
                    );
                  })}
                  {currentLevelWords.length === 0 && (
                    <p className="col-span-full text-center py-8 text-stone-400 italic">
                      No words found. Try a different search.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Selection Summary */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-blue-100">
              <span className="font-bold text-stone-700">
                {selectedWords.length} words selected
              </span>
              {selectedWords.length > 0 && (
                <button
                  onClick={() => setSelectedWords([])}
                  className="text-sm font-bold text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                disabled={selectedWords.length === 0}
                onClick={handlePreviewAssignment}
                className="flex-1 py-2 bg-stone-200 text-stone-700 rounded-2xl font-black text-sm hover:bg-stone-300 transition-all active:scale-95 disabled:opacity-50"
              >
                👁️ Preview
              </button>
              <button
                disabled={selectedWords.length === 0 || !assignmentTitle}
                onClick={handleSaveAssignment}
                className="flex-1 py-2 bg-blue-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 disabled:opacity-50 disabled:shadow-none hover:bg-blue-800 transition-all active:scale-95"
              >
                Create Assignment ({selectedWords.length} Words)
              </button>
            </div>
          </div>

          {/* Paste Match Confirmation Dialog - NEW */}
          {showPasteDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-black text-stone-900 mb-4">Word Import Results</h3>

                <div className="space-y-3 mb-6">
                  {/* Matched Words */}
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600 text-lg">✓</span>
                      <p className="font-bold text-green-700">Matched Band 2 Words</p>
                    </div>
                    <p className="text-2xl font-black text-green-600">{pasteMatchedCount}</p>
                    <p className="text-sm text-green-600">Added to your assignment automatically</p>
                  </div>

                  {/* Unmatched Words */}
                  {pasteUnmatched.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-600 text-lg">⚠</span>
                        <p className="font-bold text-amber-700">Not Found in Band 2</p>
                      </div>
                      <p className="text-sm text-amber-600 mb-2">These words weren't found:</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pasteUnmatched.map(w => (
                          <span key={w} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                            {w}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-amber-600">Add them as custom words instead?</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {pasteUnmatched.length > 0 ? (
                    <>
                      <button
                        onClick={handleAddUnmatchedAsCustom}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                      >
                        Add {pasteUnmatched.length} as Custom
                      </button>
                      <button
                        onClick={handleSkipUnmatched}
                        className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-bold hover:bg-stone-300 transition-all border-2 border-blue-200"
                      >
                        Skip
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowPasteDialog(false)}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignment Creation Welcome Popup */}
        <AnimatePresence>
          {showAssignmentWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen size={40} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-stone-900">Create Assignment</h3>
                <p className="text-stone-600 mb-6 text-lg">Select a level or upload your own list to get started.</p>

                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-bold text-stone-800">Import Word List</p>
                      <p className="text-sm text-stone-600">Paste Hebrew/English words from anywhere</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                    <span className="text-2xl">📚</span>
                    <div>
                      <p className="font-bold text-stone-800">Band 2 Words</p>
                      <p className="text-sm text-stone-600">Choose from 1000+ vocabulary words</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <span className="text-2xl">📤</span>
                    <div>
                      <p className="font-bold text-stone-800">Upload Custom</p>
                      <p className="text-sm text-stone-600">Upload CSV or scan with OCR</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAssignmentWelcome(false)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Got it, let's start! →
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
    ];

    const allowedModes = activeAssignment?.allowedModes || modes.map(m => m.id);
    const filteredModes = modes.filter(m => allowedModes.includes(m.id));

    const colorClasses: Record<string, string> = {
      emerald: "bg-blue-50 border-blue-100 hover:bg-blue-50 text-blue-700",
      blue: "bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-700",
      purple: "bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700",
      amber: "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700",
      rose: "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700",
      cyan: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-700",
      indigo: "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700",
      fuchsia: "bg-fuchsia-50 border-fuchsia-100 hover:bg-fuchsia-100 text-fuchsia-700",
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredModes.map((mode, idx) => {
              const isCompleted = studentProgress.some(p => p.assignmentId === activeAssignment?.id && p.mode === mode.id);

              return (
                <motion.button
                  key={mode.id}
                  onClick={() => { setGameMode(mode.id); setShowModeSelection(false); }}
                  className={`p-8 rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, translateY: -8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-16 h-16 rounded-[24px] bg-white flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                    {mode.icon}
                    {isCompleted && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-xl mb-2 leading-tight">{mode.name}</p>
                  <p className="opacity-70 text-sm font-bold leading-snug">{mode.desc}</p>

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
      .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const top3 = sortedLeaderboard.slice(0, 3);
    const rest = sortedLeaderboard.slice(3);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-6 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
            <button onClick={() => setView("teacher-dashboard")} className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-base sm:text-sm bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all">← Back to Dashboard</button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <span className={`w-3 h-3 rounded-full ${socketConnected ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400 animate-pulse"}`} />
                <span className="font-bold">{socketConnected ? "🔴 LIVE" : "Reconnecting..."}</span>
              </div>
              <button onClick={() => { setView("teacher-dashboard"); setIsLiveChallenge(false); }} className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105">End Challenge</button>
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
                      <p className="font-bold text-sm sm:text-base truncate">{top3[1].name}</p>
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
                      <p className="font-bold text-base sm:text-lg truncate">{top3[0].name}</p>
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
                      <p className="font-bold text-sm sm:text-base truncate">{top3[2].name}</p>
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
                    <span className="font-bold text-base sm:text-lg">{entry.name}</span>
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
          <button onClick={() => setView("landing")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full">← Back to Dashboard</button>
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

  if (view === "students") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 text-base sm:text-sm">← Back to Dashboard</button>
          <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-xl p-5 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-6 text-stone-900">Class Students</h2>
            <div className="overflow-x-auto rounded-3xl border border-stone-100">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="py-3 px-4 sm:py-4 sm:px-6 font-bold text-stone-400 uppercase text-xs">Student Name</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6 font-bold text-stone-400 uppercase text-xs">Class Code</th>
                    <th className="py-3 px-4 sm:py-4 sm:px-6 font-bold text-stone-400 uppercase text-xs">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => (
                    <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 sm:py-4 sm:px-6 font-bold text-stone-800 text-base sm:text-sm">{s.name}</td>
                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-stone-500 text-base sm:text-sm">{s.classCode}</td>
                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-stone-400 text-sm sm:text-sm">{new Date(s.lastActive).toLocaleString()}</td>
                    </tr>
                  ))}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-stone-400 italic text-base sm:text-sm">No students found for your classes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "analytics") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <button onClick={() => setView("teacher-dashboard")} className="text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full">← Back to Dashboard</button>
            <h1 className="text-xl sm:text-3xl font-black text-stone-900">Student Performance Matrix</h1>
          </div>

          {allScores.length === 0 ? (
            <div className="bg-white p-8 rounded-[32px] sm:rounded-[40px] shadow-xl text-center">
              <p className="text-stone-400 italic mb-4 text-base sm:text-sm">No student data yet. Analytics will appear once students complete assignments.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-sm font-bold uppercase">Total Students</p>
              <p className="text-2xl sm:text-3xl font-black text-stone-900">{matrixData.students.length}</p>
            </div>
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-sm font-bold uppercase">Total Assignments</p>
              <p className="text-2xl sm:text-3xl font-black text-stone-900">{matrixData.assignments.length}</p>
            </div>
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-sm font-bold uppercase">Class Average</p>
              <p className="text-3xl font-black text-blue-700">
                {matrixData.students.length > 0
                  ? Math.round(Array.from(matrixData.averages.values()).reduce((a, b) => a + b, 0) / matrixData.averages.size)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-[30px] shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-stone-400 uppercase text-xs sticky left-0 bg-stone-50">Student</th>
                    {matrixData.assignments.map(assignmentId => (
                      <th key={assignmentId} className="px-4 py-4 text-center font-bold text-stone-400 uppercase text-xs min-w-[100px]">
                        {assignmentId}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center font-bold text-stone-400 uppercase text-xs min-w-[80px]">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.students.map(student => {
                    const studentAvg = matrixData.averages.get(student) || 0;
                    const classCode = matrixData.getStudentClassCode(student);
                    const avatar = matrixData.getStudentAvatar(student);
                    return (
                      <tr key={student} className="border-t border-stone-100 hover:bg-stone-50">
                        <td
                          className="px-4 py-3 font-bold text-stone-800 sticky left-0 bg-white hover:bg-stone-50 cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="flex items-center gap-2">
                            {avatar && <span className="text-lg">{avatar}</span>}
                            <div className="flex flex-col">
                              <span>{student}</span>
                              <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">{classCode}</span>
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
                              className={`px-4 py-3 text-center ${cellClass} ${hasScore ? "cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all" : ""}`}
                              onClick={() => hasScore && setSelectedScore(scoreData!)}
                            >
                              {hasScore ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-black text-stone-800">{score}%</span>
                                  <span className="text-xs">{indicator}</span>
                                </div>
                              ) : (
                                <span className="text-stone-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`px-4 py-3 text-center font-bold ${
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
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 rounded"></div>
                <span className="text-stone-600">Excellent (90%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 rounded"></div>
                <span className="text-stone-600">Good (70-89%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-rose-100 rounded"></div>
                <span className="text-stone-600">Needs Attention (&lt;70%)</span>
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
                    <p className="text-stone-500">Assignment: {selectedScore.assignmentId}</p>
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
        </div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-slate-600 font-bold flex items-center gap-2 hover:text-slate-900 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all text-sm">
            <span>←</span> Back to Dashboard
          </button>

          {/* Header */}
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Student Gradebook
                </h2>
                <p className="text-slate-500 mt-2">Click on a student to see their detailed scores</p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                <span className="text-2xl">📚</span>
                <span className="font-bold text-blue-700">{studentEntries.length} Students</span>
              </div>
            </div>
          </div>

          {studentEntries.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-slate-400 italic text-lg">No scores recorded yet.</p>
              <p className="text-slate-300 text-sm mt-2">Student results will appear here once they complete assignments.</p>
            </div>
          ) : (
            <div className="space-y-3">
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
                      className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                    >
                      {/* Summary Row - Always Visible */}
                      <div
                        onClick={() => setExpandedStudent(isExpanded ? null : entryKey)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Expand/Collapse Icon */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-slate-400"
                          >
                            <ChevronDown size={20} />
                          </motion.div>

                          {/* Avatar */}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-lg">
                            {entry.studentName.charAt(0)}
                          </div>

                          {/* Name and Class */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-800 text-base sm:text-lg truncate">{entry.studentName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                {entry.classCode}
                              </span>
                              <span className="text-slate-400 text-xs">
                                {entry.scores.length} {entry.scores.length === 1 ? 'attempt' : 'attempts'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-3 sm:gap-6">
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Avg</div>
                            <div className={`text-lg sm:text-xl font-black ${
                              avgScore >= 90 ? 'text-green-600' :
                              avgScore >= 70 ? 'text-blue-600' :
                              avgScore >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>{avgScore}%</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Best</div>
                            <div className="text-lg sm:text-xl font-black text-yellow-600">{entry.bestScore}%</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Total</div>
                            <div className="text-lg sm:text-xl font-black text-purple-600">{entry.totalScore}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Last</div>
                            <div className="text-xs sm:text-sm font-bold text-green-600">
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
                            <div className="px-4 pb-4 border-t border-slate-100">
                              {/* Detailed Stats Header */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                <HelpTooltip content={`Average Score: ${avgScore}% - Mean performance across all attempts`}>
                                  <div className="text-center p-3 bg-slate-50 rounded-xl cursor-help hover:bg-slate-100 transition-colors">
                                    <div className="text-xs text-slate-500 font-bold uppercase">Average</div>
                                    <div className={`text-2xl font-black ${getScoreColor(avgScore)}`}>
                                      {avgScore}%
                                    </div>
                                  </div>
                                </HelpTooltip>

                                <HelpTooltip content={`Best Score: ${entry.bestScore}% - Highest score achieved`}>
                                  <div className="text-center p-3 bg-yellow-50 rounded-xl cursor-help hover:bg-yellow-100 transition-colors">
                                    <div className="flex items-center gap-1 justify-center">
                                      <span className="text-xs text-yellow-600 font-bold uppercase">Best</span>
                                      <span>⭐</span>
                                    </div>
                                    <div className="text-2xl font-black text-yellow-600">{entry.bestScore}%</div>
                                  </div>
                                </HelpTooltip>

                                <HelpTooltip content={`Total Points: ${entry.totalScore} - Sum of all scores earned`}>
                                  <div className="text-center p-3 bg-purple-50 rounded-xl cursor-help hover:bg-purple-100 transition-colors">
                                    <div className="text-xs text-purple-600 font-bold uppercase">Total</div>
                                    <div className="text-2xl font-black text-purple-600">{entry.totalScore}</div>
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
                                    <span className="text-xs text-slate-400 font-bold uppercase cursor-help">All Attempts</span>
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
                                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-help">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">{modeInfo.icon}</span>
                                            <div>
                                              <div className="font-bold text-slate-700 text-sm">{modeInfo.name}</div>
                                              <div className="text-[10px] text-slate-400">{modeInfo.label}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className={`px-3 py-1 rounded-lg font-bold text-sm ${getScoreColor(s.score)}`}>
                                              {s.score}%
                                            </div>
                                            <div className="text-[10px] text-slate-400">
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
        </div>
      </div>
    );
  }

  if (view === "live-challenge-class-select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-6 text-white">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-white/80 font-bold flex items-center gap-1 hover:text-white bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all text-sm">← Back to Dashboard</button>

          <div className="text-center mb-8">
            <motion.h1
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
            >
              🏆 Select Class
            </motion.h1>
            <p className="text-white/90 font-bold">Choose which class to start the Live Challenge for</p>
          </div>

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
                className="bg-white/20 backdrop-blur-md rounded-3xl p-6 border-2 border-white/30 hover:bg-white/30 hover:border-white/50 hover:scale-105 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl sm:text-2xl font-black mb-1">{cls.name}</h3>
                    <p className="text-white/80 text-sm">Code: <span className="bg-white text-purple-600 px-3 py-1 rounded-lg font-mono font-bold ml-1">{cls.code}</span></p>
                  </div>
                  <div className="text-4xl">🚀</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Kol Hakavod, {user?.displayName}!</h1>
        <p className="text-lg sm:text-xl mb-6">You finished the assignment.</p>
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
        <button
          onClick={handleExitGame}
          disabled={isSaving}
          className="bg-black text-white px-12 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >Done</button>

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

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center p-4 sm:p-8 font-sans">
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
      <div className="w-full max-w-5xl flex flex-wrap justify-between items-center gap-2 mb-6 sm:mb-8">
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

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-8">
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
              {matchingPairs.map((item, idx) => {
                const key = `${item.id}-${item.type}-${idx}`;
                return (
                <motion.button
                  key={key}
                  whileHover={{ scale: matchedIds.includes(item.id) ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMatchClick(item)}
                  disabled={matchedIds.includes(item.id)}
                  className={`p-3 sm:p-6 rounded-2xl shadow-sm font-bold text-lg h-28 sm:h-32 flex items-center justify-center transition-all duration-300 ${
                    matchedIds.includes(item.id) 
                      ? "bg-blue-50 text-blue-400 shadow-none" 
                      : selectedMatch?.id === item.id && selectedMatch?.type === item.type
                      ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                      : "bg-white text-stone-800 hover:shadow-md"
                  }`}
                >
                  {item.text}
                </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`bg-white rounded-[40px] shadow-2xl p-6 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-4 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-4 border-red-500" : "border-4 border-transparent"}`}
            >
              {/* Progress Bar */}
              <progress
                className="absolute top-0 left-0 h-2 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                max={100}
                value={toProgressValue(((currentIndex + 1) / gameWords.length) * 100)}
              />

              {/* Motivational message */}
              {motivationalMessage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="text-3xl sm:text-5xl font-black text-blue-700 drop-shadow animate-bounce">
                    {motivationalMessage}
                  </span>
                </div>
              )}

              <div className="mb-6 sm:mb-12">
                <span className="text-stone-300 font-black text-4xl sm:text-6xl lg:text-8xl opacity-20 absolute top-8 left-1/2 -translate-x-1/2">{currentIndex + 1}</span>
                <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-12">
                  {currentWord?.imageUrl && (
                    <motion.img
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentWord.imageUrl}
                      alt={currentWord.english}
                      referrerPolicy="no-referrer"
                      className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-[32px] shadow-lg border-4 border-white"
                    />
                  )}
                  <h2 className={`text-4xl sm:text-6xl font-black text-stone-900 relative z-10 break-words w-full ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}>
                    {gameMode === "spelling" || gameMode === "reverse" ? currentWord?.[targetLanguage] : 
                     gameMode === "scramble" ? scrambledWord :
                     gameMode === "flashcards" ? (isFlipped ? currentWord?.[targetLanguage] : currentWord?.english) :
                     currentWord?.english}
                  </h2>
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => speak(currentWord?.english)}
                    className="p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                    aria-label="Play pronunciation"
                    title="Play pronunciation"
                  >
                    <Volume2 size={24} className="text-stone-600" />
                  </button>
                </div>
              </div>

              {gameMode === "classic" || gameMode === "listening" || gameMode === "reverse" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option)}
                      className={`py-6 px-8 rounded-3xl text-2xl font-bold transition-all duration-300 ${
                        feedback === "correct" && option.id === currentWord.id
                          ? "bg-blue-600 text-white scale-105 shadow-xl"
                          : feedback === "wrong" && option.id !== currentWord.id
                          ? "bg-rose-100 text-rose-500 opacity-50"
                          : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                      }`}
                    >
                      {gameMode === "reverse" ? option.english : option[targetLanguage]}
                    </button>
                  ))}
                </div>
              ) : gameMode === "true-false" ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-stone-100 p-8 rounded-3xl mb-8">
                    <p className="text-3xl font-bold text-stone-800">{tfOption?.[targetLanguage]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleTFAnswer(true)} className="py-6 rounded-3xl text-2xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">True</button>
                    <button onClick={() => handleTFAnswer(false)} className="py-6 rounded-3xl text-2xl font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">False</button>
                  </div>
                </div>
              ) : gameMode === "flashcards" ? (
                <div className="max-w-md mx-auto space-y-4">
                  <button onClick={() => setIsFlipped(!isFlipped)} className="w-full py-6 rounded-3xl text-xl font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                    {isFlipped ? "Show English" : "Show Translation"}
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleFlashcardAnswer(false)} className="py-4 rounded-3xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">Still Learning</button>
                    <button onClick={() => handleFlashcardAnswer(true)} className="py-4 rounded-3xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-50 transition-colors">Got It!</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSpellingSubmit} className="max-w-md mx-auto">
                  <input
                    autoFocus
                    type="text"
                    value={spellingInput}
                    onChange={(e) => setSpellingInput(e.target.value)}
                    placeholder="Type in English..."
                    className={`w-full p-6 text-3xl font-black text-center border-4 rounded-3xl mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-8">Translation: <span className="text-stone-900">{currentWord?.[targetLanguage]}</span></p>
                  )}
                  <button type="submit" className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-colors">Check Answer</button>
                </form>
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
              .map(([uid, entry]) => ({ uid, name: entry.name, totalScore: entry.baseScore + entry.currentGameScore }))
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
                        {entry.name}
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
  </div>
);
}
