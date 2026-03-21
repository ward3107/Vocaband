import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { useFloating, offset, flip, shift, arrow } from "@floating-ui/react";
import { ALL_WORDS, BAND_1_WORDS, BAND_2_WORDS, TOPIC_PACKS, Word } from "./vocabulary";
import { generateSentencesForAssignment } from "./sentence-bank";
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
const SPEAKABLE_MOTIVATIONS = [
  "Great job!", "Well done!", "Awesome!", "Keep it up!",
  "Nailed it!", "Brilliant!", "You're on fire!", "Fantastic!",
  "Way to go!", "Superstar!", "Amazing!", "Perfect!",
];
const randomMotivation = () =>
  MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

// --- XP REWARD SYSTEM CONSTANTS ---
const XP_TITLES = [
  { min: 0, title: 'Beginner', emoji: '🌱' },
  { min: 100, title: 'Learner', emoji: '📚' },
  { min: 300, title: 'Scholar', emoji: '🎓' },
  { min: 700, title: 'Expert', emoji: '🏅' },
  { min: 1500, title: 'Master', emoji: '👑' },
  { min: 3000, title: 'Legend', emoji: '🌟' },
];
const getXpTitle = (xpAmount: number) => XP_TITLES.filter(t => xpAmount >= t.min).pop() ?? XP_TITLES[0];

const PREMIUM_AVATARS = [
  { emoji: '🐉', name: 'Dragon', cost: 50 },
  { emoji: '🦅', name: 'Eagle', cost: 50 },
  { emoji: '🐺', name: 'Wolf', cost: 75 },
  { emoji: '🦖', name: 'Dinosaur', cost: 100 },
  { emoji: '🧙‍♂️', name: 'Wizard', cost: 150 },
  { emoji: '🦸', name: 'Superhero', cost: 200 },
  { emoji: '👾', name: 'Alien', cost: 250 },
  { emoji: '🤴', name: 'Prince', cost: 300 },
  { emoji: '👸', name: 'Princess', cost: 300 },
  { emoji: '🦄', name: 'Unicorn', cost: 150 },
  { emoji: '🐲', name: 'Dragon Face', cost: 100 },
  { emoji: '🧛', name: 'Vampire', cost: 200 },
  { emoji: '🧜', name: 'Merperson', cost: 175 },
  { emoji: '🥷', name: 'Ninja', cost: 250 },
  { emoji: '🤖', name: 'Robot', cost: 125 },
];

// Avatar categories unlock at XP milestones — students see locked categories and feel motivated to earn XP
const AVATAR_CATEGORY_UNLOCKS: Record<string, { xpRequired: number; label: string }> = {
  Animals: { xpRequired: 0, label: 'Free' },
  Faces: { xpRequired: 0, label: 'Free' },
  Food: { xpRequired: 50, label: '50 XP' },
  Nature: { xpRequired: 100, label: '100 XP' },
  Sports: { xpRequired: 200, label: '200 XP' },
  Objects: { xpRequired: 400, label: '400 XP' },
  Vehicles: { xpRequired: 600, label: '600 XP' },
  Fantasy: { xpRequired: 1000, label: '1000 XP' },
  Space: { xpRequired: 1500, label: '1500 XP' },
};

const THEMES = [
  { id: 'default', name: 'Classic', preview: '⬜', colors: { bg: 'bg-stone-100', card: 'bg-white', text: 'text-stone-900', accent: 'blue' }, cost: 0 },
  { id: 'dark', name: 'Dark Mode', preview: '⬛', colors: { bg: 'bg-gray-900', card: 'bg-gray-800', text: 'text-white', accent: 'blue' }, cost: 100 },
  { id: 'ocean', name: 'Ocean', preview: '🌊', colors: { bg: 'bg-cyan-50', card: 'bg-white', text: 'text-stone-900', accent: 'cyan' }, cost: 150 },
  { id: 'sunset', name: 'Sunset', preview: '🌅', colors: { bg: 'bg-orange-50', card: 'bg-white', text: 'text-stone-900', accent: 'orange' }, cost: 150 },
  { id: 'neon', name: 'Neon', preview: '💚', colors: { bg: 'bg-gray-950', card: 'bg-gray-900', text: 'text-green-400', accent: 'green' }, cost: 200 },
  { id: 'forest', name: 'Forest', preview: '🌲', colors: { bg: 'bg-green-50', card: 'bg-white', text: 'text-stone-900', accent: 'green' }, cost: 150 },
  { id: 'royal', name: 'Royal', preview: '👑', colors: { bg: 'bg-purple-50', card: 'bg-white', text: 'text-stone-900', accent: 'purple' }, cost: 200 },
];

const POWER_UP_DEFS = [
  { id: 'skip', name: 'Skip Word', emoji: '⏭️', desc: 'Skip the current word without penalty', cost: 30 },
  { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers', cost: 40 },
  { id: 'reveal_letter', name: 'Reveal Letter', emoji: '💡', desc: 'Reveal the first letter in spelling mode', cost: 25 },
];

// Name frames — decorative borders around student avatar on dashboard & leaderboard
const NAME_FRAMES = [
  { id: 'gold', name: 'Gold Frame', preview: '🥇', border: 'ring-4 ring-yellow-400', cost: 200 },
  { id: 'fire', name: 'Fire Frame', preview: '🔥', border: 'ring-4 ring-orange-500', cost: 300 },
  { id: 'diamond', name: 'Diamond Frame', preview: '💎', border: 'ring-4 ring-cyan-400', cost: 500 },
  { id: 'rainbow', name: 'Rainbow Frame', preview: '🌈', border: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-pink-200', cost: 400 },
  { id: 'lightning', name: 'Lightning Frame', preview: '⚡', border: 'ring-4 ring-amber-300 shadow-lg shadow-amber-200', cost: 350 },
  { id: 'crown', name: 'Crown Frame', preview: '👑', border: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-200', cost: 750 },
];

// Custom name titles — shown below student name
const NAME_TITLES = [
  { id: 'champion', name: 'Champion', display: 'Champion', cost: 150 },
  { id: 'genius', name: 'Genius', display: 'Genius', cost: 200 },
  { id: 'word_wizard', name: 'Word Wizard', display: 'Word Wizard', cost: 300 },
  { id: 'vocab_king', name: 'Vocab King', display: 'Vocab King', cost: 250 },
  { id: 'vocab_queen', name: 'Vocab Queen', display: 'Vocab Queen', cost: 250 },
  { id: 'speed_demon', name: 'Speed Demon', display: 'Speed Demon', cost: 400 },
  { id: 'legend', name: 'Living Legend', display: 'Living Legend', cost: 500 },
  { id: 'brain', name: 'Big Brain', display: 'Big Brain', cost: 350 },
];

// --- REUSABLE HELP TOOLTIP COMPONENT ---
// Powered by @floating-ui/react - modern positioning engine
// Desktop only - shows on hover, hidden on mobile devices
const HelpTooltip = ({ children, content, position = "bottom", className = "" }: {
  children: React.ReactNode;
  content: string | string[];
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
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
        className={className || "inline"}
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
  type GameMode = "classic" | "listening" | "spelling" | "matching" | "true-false" | "flashcards" | "scramble" | "reverse" | "letter-sounds" | "sentence-builder";
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "game" | "teacher-dashboard" | "student-dashboard" | "create-assignment" | "gradebook" | "live-challenge" | "live-challenge-class-select" | "analytics" | "global-leaderboard" | "students" | "shop">("landing");
  const [shopTab, setShopTab] = useState<"avatars" | "themes" | "powerups" | "titles" | "frames">("avatars");
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  // Track whether handleStudentLogin is in progress so onAuthStateChange
  // doesn't clobber loading/view mid-login (signInAnonymously fires the
  // listener before handleStudentLogin finishes its DB queries).
  const manualLoginInProgress = useRef(false);
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

  const ASSIGNMENT_TITLE_SUGGESTIONS = [
    "Classic Mode Practice",
    "Listening Challenge",
    "Spelling Bee",
    "Matching Pairs",
    "True or False",
    "Flashcard Review",
    "Word Scramble",
    "Reverse Mode",
    "Letter Sounds Practice",
    "Sentence Builder Challenge",
    "Mixed Modes Practice",
    "Unit 5 Vocabulary",
    "Midterm Review",
    "Final Exam Practice",
    "Word Building Exercise",
    "Listening Comprehension",
    "Reading Vocabulary",
    "Grammar & Vocabulary",
    "Advanced Vocabulary Test",
    "XP Challenge",
    "Speed Round",
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

  // Auto-generate sentences for Sentence Builder when words are selected
  useEffect(() => {
    if (!assignmentModes.includes("sentence-builder")) return;
    if (selectedWords.length === 0) {
      setAssignmentSentences([]);
      setSentencesAutoGenerated(false);
      return;
    }
    // Only auto-generate if user hasn't manually edited
    if (!sentencesAutoGenerated && assignmentSentences.length > 0) return;
    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const words = uniqueWords.filter(w => selectedWordsSet.has(w.id));
    const generated = generateSentencesForAssignment(words);
    setAssignmentSentences(generated);
    setSentencesAutoGenerated(true);
  }, [selectedWords, assignmentModes]);

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

  // --- THEME ---
  const activeThemeConfig = useMemo(() => {
    const themeId = user?.activeTheme ?? 'default';
    return THEMES.find(t => t.id === themeId) ?? THEMES[0];
  }, [user?.activeTheme]);

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [showModeIntro, setShowModeIntro] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">("arabic");
  const [isFinished, setIsFinished] = useState(false);

  // --- NEW MODES STATE ---
  const [tfOption, setTfOption] = useState<Word | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // --- MATCHING MODE STATE ---
  const [matchingPairs, setMatchingPairs] = useState<{id: number, text: string, type: 'english' | 'arabic'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: number, type: 'english' | 'arabic'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);

  // --- LETTER SOUNDS MODE STATE ---
  const [revealedLetters, setRevealedLetters] = useState(0);
  const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

  // --- SENTENCE BUILDER MODE STATE ---
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [assignmentSentences, setAssignmentSentences] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);
  const [sentencesAutoGenerated, setSentencesAutoGenerated] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentData[]>([]);
  const [showTeacherAssignments, setShowTeacherAssignments] = useState(false);
  const [teacherAssignmentsLoading, setTeacherAssignmentsLoading] = useState(false);

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
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { if (feedback === null) setMotivationalMessage(null); }, [feedback]);

  // Speak motivational message during gameplay — strip emojis so TTS reads the actual text
  useEffect(() => {
    if (motivationalMessage) {
      const textOnly = motivationalMessage.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{2B55}\u{1FA00}-\u{1FAFF}]/gu, '').trim();
      if (textOnly) speak(textOnly);
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
      try {
        const userData = await fetchUserProfile(supabaseUser.id);
        if (userData) {
          setUser(userData);
          if (userData.role === "teacher") {
            fetchTeacherData(supabaseUser.id);
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
            await supabase.from('users').insert(mapUserToDb(newUser));
            setUser(newUser);
            setView("teacher-dashboard");
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
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
        setView("landing");
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
        if (!isOAuthCallback) {
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safety timeout: if onAuthStateChange never fires (e.g. fully offline),
  // stop the spinner so the app doesn't hang forever.  Skip if a manual
  // login (handleStudentLogin) is in progress — it manages its own loading.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current) setLoading(false);
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

  const fetchTeacherData = async (uid: string) => {
    const { data, error } = await supabase.from('classes').select('*').eq('teacher_uid', uid);
    if (!error && data) setClasses(data.map(mapClass));
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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) { showToast("File too large (max 5 MB).", "error"); e.target.value = ""; return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const words: Word[] = lines.slice(1).map((line, idx) => {
        const [english, hebrew, arabic] = line.split(",");
        return {
          id: 5000 + idx,
          english: english?.trim(),
          hebrew: hebrew?.trim() || "",
          arabic: arabic?.trim() || "",
          level: "Custom" as const
        };
      }).filter(w => w.english);

      if (words.length === 0) {
        showToast("No valid words found in CSV. Make sure the first column is English.", "error");
        return;
      }
      const limited = words.slice(0, MAX_IMPORT_WORDS);
      if (words.length > MAX_IMPORT_WORDS) showToast(`Only the first ${MAX_IMPORT_WORDS} words were imported.`, "info");
      setCustomWords(prev => [...prev, ...limited]);
      setSelectedWords(prev => [...prev, ...limited.map(w => w.id)]);
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
    if (file.size > 10 * 1024 * 1024) { showToast("Image too large (max 10 MB).", "error"); e.target.value = ""; return; }

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

  // Excel (.xlsx) upload
  const handleXlsxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) { showToast("File too large (max 5 MB).", "error"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
      const words: Word[] = rows.slice(1).map((row, idx) => ({
        id: 6000 + idx,
        english: String(row[0] ?? "").trim(),
        hebrew: String(row[1] ?? "").trim(),
        arabic: String(row[2] ?? "").trim(),
        level: "Custom" as const,
      })).filter(w => w.english);
      if (words.length === 0) { showToast("No valid words found in Excel file.", "error"); return; }
      const limited = words.slice(0, MAX_IMPORT_WORDS);
      if (words.length > MAX_IMPORT_WORDS) showToast(`Only the first ${MAX_IMPORT_WORDS} words were imported.`, "info");
      setCustomWords(prev => [...prev, ...limited]);
      setSelectedWords(prev => [...prev, ...limited.map(w => w.id)]);
      setSelectedLevel("Custom");
      showToast(`Imported ${limited.length} words from Excel.`, "success");
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Word (.docx) upload — extract text then use smart paste logic
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) { showToast("File too large (max 5 MB).", "error"); e.target.value = ""; return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
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
      allowedModes: assignmentModes,
      sentences: assignmentSentences.filter(s => s.trim()),
    };

    try {
      const insertPayload: Record<string, unknown> = {
        class_id: newAssignment.classId,
        word_ids: newAssignment.wordIds,
        words: newAssignment.words,
        title: newAssignment.title,
        deadline: newAssignment.deadline,
        created_at: newAssignment.createdAt,
        allowed_modes: newAssignment.allowedModes,
      };
      if (newAssignment.sentences.length > 0) {
        insertPayload.sentences = newAssignment.sentences;
      }
      const { error } = await supabase.from('assignments').insert(insertPayload);
      if (error) throw error;
      showToast("Assignment created successfully!", "success");
      setView("teacher-dashboard");
      setSelectedWords([]);
      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentModes(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]);
      setAssignmentSentences([]);
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
    const trimmedName = name.trim().slice(0, 30);
    const trimmedCode = code.trim().slice(0, 20);
    if (!trimmedName || !trimmedCode) { setError("Please enter both code and name."); return; }
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

      // Step 3: Upsert student profile (must happen before fetching assignments — RLS needs class membership)
      let userData: AppUser;
      if (userResult.data) {
        userData = { ...mapUser(userResult.data), classCode: trimmedCode };
        const { error: updateErr } = await supabase
          .from('users').update({ class_code: trimmedCode }).eq('uid', studentUid);
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

      // Join Live Challenge
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
          classCode: trimmedCode, name: trimmedName, uid: studentUid, token: session.access_token,
        });
      }

      setView("student-dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong during login.");
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

  const fetchTeacherAssignments = async () => {
    if (!user || user.role !== "teacher" || classes.length === 0) return;
    const now = Date.now();
    if (now - (lastFetchRef.current.teacherAssignments ?? 0) < 10000) return;
    lastFetchRef.current.teacherAssignments = now;
    setTeacherAssignmentsLoading(true);
    const classIds = classes.map(c => c.id);
    const { data } = await supabase.from('assignments').select('*').in('class_id', classIds).order('created_at', { ascending: false });
    setTeacherAssignments((data ?? []).map(mapAssignment));
    setTeacherAssignmentsLoading(false);
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
    // Cancel any queued/ongoing speech so voice stays in sync with fast skipping
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    // Prefer a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Natural") || v.name.includes("Neural")))
      || voices.find(v => v.lang.startsWith("en-US"));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (view === "game" && !isFinished && currentWord && !showModeSelection && !showModeIntro) {
      speak(currentWord.english);
    }
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro]);

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
    if (view !== "game" || showModeSelection || gameMode !== "sentence-builder" || !activeAssignment) return;
    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter(s => s.trim().length > 0);
    if (validSentences.length > 0) {
      setSentenceIndex(0);
      const words = shuffle(validSentences[0].split(" ").filter(Boolean));
      setAvailableWords(words);
      setBuiltSentence([]);
      setSentenceFeedback(null);
    }
  }, [view, showModeSelection, gameMode, activeAssignment]);

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
      if (socket && user?.classCode) socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score: newScore });
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
      setView("landing");
    }
  };

  const saveScore = async () => {
    if (!user || !activeAssignment) return;
    setIsSaving(true);
    setSaveError(null);

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
      score: cappedScore,
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

  const handleMatchClick = (item: {id: number, type: 'english' | 'arabic'}) => {
    if (matchedIds.includes(item.id)) return;
    
    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        setMatchedIds([...matchedIds, item.id]);
        const newScore = score + 15;
        setScore(newScore);

        // Pronounce the matched English word
        const englishCard = selectedMatch.type === 'english' ? selectedMatch : item;
        const matchedPair = matchingPairs.find(p => p.id === englishCard.id && p.type === 'english');
        if (matchedPair) speak(matchedPair.text);

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
          setHiddenOptions([]);
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

    // Build assignment title lookup from teacherAssignments
    const assignmentTitleMap = new Map<string, string>();
    teacherAssignments.forEach(a => assignmentTitleMap.set(a.id, a.title));
    const getAssignmentTitle = (id: string) => assignmentTitleMap.get(id) || id.slice(0, 8) + '…';

    return { students, assignments, matrix, averages, studentMap, getStudentClassCode, getStudentAvatar, getAssignmentTitle };
  }, [allScores, teacherAssignments]);

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
                        maxLength={20}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-base"
                      />
                    </div>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        type="text"
                        placeholder="Your Name"
                        id="student-name"
                        maxLength={30}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-base"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-stone-50 to-stone-100 p-5 rounded-2xl shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">Choose Avatar</p>
                        <HelpIcon tooltip="Pick a fun emoji to represent you in class!" position="left" />
                      </div>

                      {/* Category Tabs — only free categories at login */}
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
                        {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>)
                          .filter(cat => AVATAR_CATEGORY_UNLOCKS[cat]?.xpRequired === 0)
                          .map(category => (
                          <button
                            key={category}
                            onClick={() => setSelectedAvatarCategory(category)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap flex-shrink-0 ${
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
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 justify-items-center">
                        {AVATAR_CATEGORIES[selectedAvatarCategory].map(a => (
                          <button
                            key={a}
                            onClick={() => setStudentAvatar(a)}
                            className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl text-2xl sm:text-3xl transition-all ${
                              studentAvatar === a
                                ? "bg-gradient-to-br from-blue-300 via-blue-500 to-blue-800 shadow-xl shadow-blue-300 ring-2 ring-blue-400 scale-110"
                                : "bg-white hover:bg-gradient-to-br hover:from-stone-50 hover:to-stone-100 hover:scale-105 shadow-sm"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>

                      {/* Locked categories preview */}
                      <div className="mt-4 pt-3 border-t border-stone-200">
                        <p className="text-xs font-bold text-stone-400 mb-2 text-center">🔒 Play games to unlock more!</p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>)
                            .filter(cat => AVATAR_CATEGORY_UNLOCKS[cat]?.xpRequired > 0)
                            .map(cat => (
                            <span key={cat} className="px-2 py-1 bg-stone-200 text-stone-400 rounded-lg text-[10px] font-bold">
                              🔒 {cat} ({AVATAR_CATEGORY_UNLOCKS[cat].label})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={loading}
                      onClick={() => {
                        const code = (document.getElementById("class-code") as HTMLInputElement).value;
                        const name = (document.getElementById("student-name") as HTMLInputElement).value;
                        if (code && name) handleStudentLogin(code, name);
                        else showToast("Please enter both code and name!", "error");
                      }}
                      className={`w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 via-blue-800 text-white py-5 sm:py-5 rounded-2xl font-black text-lg sm:text-xl shadow-xl shadow-blue-200 transition-all relative overflow-hidden ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-2xl hover:shadow-blue-300 hover:from-blue-500 hover:via-blue-600 hover:to-blue-900 active:scale-95"}`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading && <RefreshCw className="animate-spin" size={20} />}
                        {loading ? "Joining..." : "Join Class"}
                      </span>
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
                    }).catch(() => {
                      setError("Could not connect to Google. Please try again.");
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
      <div className={`min-h-screen ${activeThemeConfig.colors.bg} p-4 sm:p-6`}>
        <div className="max-w-4xl mx-auto">
          {/* Top bar with logout */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => { setShopTab("avatars"); setView("shop"); }} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm flex items-center gap-1.5 shadow-md">
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
                            setAssignmentWords(filteredWords);
                            setActiveAssignment(assignment);
                            setView("game");
                            setShowModeSelection(true);
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
      </div>
    );
  }

  // --- SHOP VIEW ---
  if (user?.role === "student" && view === "shop") {
    const purchaseAvatar = async (avatar: typeof PREMIUM_AVATARS[0]) => {
      if (xp < avatar.cost) { showToast("Not enough XP!", "error"); return; }
      const newXp = xp - avatar.cost;
      const newUnlocked = [...(user.unlockedAvatars ?? []), avatar.emoji];
      setXp(newXp);
      setUser(prev => prev ? { ...prev, unlockedAvatars: newUnlocked } : prev);
      await supabase.from('users').update({ xp: newXp, unlocked_avatars: newUnlocked }).eq('uid', user.uid);
      showToast(`Unlocked ${avatar.name}!`, "success");
    };
    const equipAvatar = async (emoji: string) => {
      setUser(prev => prev ? { ...prev, avatar: emoji } : prev);
      await supabase.from('users').update({ avatar: emoji }).eq('uid', user.uid);
      showToast("Avatar equipped!", "success");
    };
    const purchaseTheme = async (theme: typeof THEMES[0]) => {
      if (xp < theme.cost) { showToast("Not enough XP!", "error"); return; }
      const newXp = xp - theme.cost;
      const newUnlocked = [...(user.unlockedThemes ?? []), theme.id];
      setXp(newXp);
      setUser(prev => prev ? { ...prev, unlockedThemes: newUnlocked } : prev);
      await supabase.from('users').update({ xp: newXp, unlocked_themes: newUnlocked }).eq('uid', user.uid);
      showToast(`Unlocked ${theme.name}!`, "success");
    };
    const equipTheme = async (themeId: string) => {
      setUser(prev => prev ? { ...prev, activeTheme: themeId } : prev);
      await supabase.from('users').update({ active_theme: themeId }).eq('uid', user.uid);
      showToast("Theme applied!", "success");
    };
    const purchasePowerUp = async (powerUp: typeof POWER_UP_DEFS[0]) => {
      if (xp < powerUp.cost) { showToast("Not enough XP!", "error"); return; }
      const newXp = xp - powerUp.cost;
      const newPowerUps = { ...(user.powerUps ?? {}), [powerUp.id]: ((user.powerUps ?? {})[powerUp.id] ?? 0) + 1 };
      setXp(newXp);
      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
      await supabase.from('users').update({ xp: newXp, power_ups: newPowerUps }).eq('uid', user.uid);
      showToast(`Got ${powerUp.name}!`, "success");
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
            {(["avatars", "themes", "titles", "frames", "powerups"] as const).map(tab => (
              <button key={tab} onClick={() => setShopTab(tab)}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${shopTab === tab ? "bg-blue-600 text-white shadow-md" : "bg-white text-stone-500 hover:bg-blue-50 border-2 border-blue-200"}`}>
                {tab === "avatars" ? "🎭 Avatars" : tab === "themes" ? "🎨 Themes" : tab === "titles" ? "🏷️ Titles" : tab === "frames" ? "🖼️ Frames" : "⚡ Power-ups"}
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
                          const newXp = xp - title.cost;
                          const newUnlocked = [...(user.unlockedAvatars ?? []), `title_${title.id}`];
                          setXp(newXp);
                          setUser(prev => prev ? { ...prev, unlockedAvatars: newUnlocked } : prev);
                          await supabase.from('users').update({ xp: newXp, unlocked_avatars: newUnlocked }).eq('uid', user.uid);
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
                          const newXp = xp - frame.cost;
                          const newUnlocked = [...(user.unlockedAvatars ?? []), `frame_${frame.id}`];
                          setXp(newXp);
                          setUser(prev => prev ? { ...prev, unlockedAvatars: newUnlocked } : prev);
                          await supabase.from('users').update({ xp: newXp, unlocked_avatars: newUnlocked }).eq('uid', user.uid);
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
            <HelpTooltip className="h-full" content="Start a real-time vocabulary competition - students race to answer correctly!">
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
                className="h-full w-full bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <RefreshCw className="text-blue-600 mb-3 sm:mb-4 group-hover:rotate-180 transition-transform duration-500" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Live Challenge</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Real-time competition</p>
              </button>
            </HelpTooltip>

            {/* Analytics */}
            <HelpTooltip className="h-full" content="See every student's scores across all assignments, identify struggling students, track trends, and find the most-missed words">
              <button
                onClick={() => { fetchScores(); fetchTeacherAssignments(); setView("analytics"); }}
                className="h-full w-full bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-purple-100 hover:border-purple-200 group"
              >
                <BarChart3 className="text-purple-600 mb-3 sm:mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Student Analytics</h2>
                <p className="text-stone-500 text-xs hidden sm:block">Scores, trends & weak words</p>
              </button>
            </HelpTooltip>



            {/* Gradebook & Students */}
            <HelpTooltip className="h-full" content="View all students, track scores, progress, and activity history">
              <button
                onClick={() => { fetchScores(); fetchStudents(); setView("gradebook"); }}
                className="h-full w-full bg-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col items-center justify-center text-center hover:shadow-lg transition-all border-2 border-blue-100 hover:border-blue-200 group"
              >
                <Trophy className="text-blue-700 mb-3 sm:mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h2 className="text-sm sm:text-base font-bold mb-1">Students & Grades</h2>
                <p className="text-stone-500 text-xs hidden sm:block">All students & scores</p>
              </button>
            </HelpTooltip>
          </div>

          {/* My Classes - Full width below */}
          <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-md border-2 border-blue-100">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-xl font-bold flex items-center gap-2"><Users className="text-blue-700" size={16} /> My Classes</h2>
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
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50/50 rounded-xl border-2 border-blue-200 hover:shadow-md hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold text-stone-800 text-sm truncate">{c.name}</p>
                      <p className="text-xs sm:text-sm font-mono text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg font-bold flex-shrink-0">{c.code}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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
                        href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code:\n\n${c.code}\n\nCopy the code above and paste it in the app!`)}`}
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

          {/* My Assignments - Collapsible */}
          <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-md border-2 border-blue-100 mt-4">
            <button
              className="w-full flex justify-between items-center"
              onClick={() => {
                const next = !showTeacherAssignments;
                setShowTeacherAssignments(next);
                if (next && teacherAssignments.length === 0) fetchTeacherAssignments();
              }}
            >
              <h2 className="text-base sm:text-xl font-bold flex items-center gap-2"><BookOpen className="text-blue-700" size={16} /> My Assignments</h2>
              <span className="text-stone-400">{showTeacherAssignments ? "▲" : "▼"}</span>
            </button>
            {showTeacherAssignments && (
              <div className="mt-4">
                {teacherAssignmentsLoading ? (
                  <p className="text-stone-400 text-sm italic">Loading...</p>
                ) : teacherAssignments.length === 0 ? (
                  <p className="text-stone-400 italic text-xs sm:text-sm">No assignments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {teacherAssignments.map(a => {
                      const cls = classes.find(c => c.id === a.classId);
                      return (
                        <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/50 rounded-xl border-2 border-blue-100">
                          <div className="min-w-0">
                            <p className="font-bold text-stone-800 text-sm truncate">{a.title}</p>
                            <p className="text-xs text-stone-500">{cls?.name || "Unknown class"} · {a.wordIds.length} words</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                const knownIds = a.wordIds.filter(id => ALL_WORDS.some(w => w.id === id));
                                const unknownWords: Word[] = (a.words ?? []).filter((w: Word) => !ALL_WORDS.some(aw => aw.id === w.id));
                                setSelectedWords(a.wordIds);
                                setCustomWords(unknownWords);
                                setAssignmentTitle(a.title + " (Copy)");
                                setAssignmentModes(a.allowedModes ?? ["classic","listening","spelling","matching","true-false","flashcards","scramble","reverse","letter-sounds","sentence-builder"]);
                                setAssignmentSentences(a.sentences ?? []);
                                if (knownIds.some(id => BAND_1_WORDS.some(w => w.id === id))) setSelectedLevel("Band 1");
                                else if (unknownWords.length > 0) setSelectedLevel("Custom");
                                else setSelectedLevel("Band 2");
                                setSelectedClass(cls ?? selectedClass);
                                setView("create-assignment");
                              }}
                              className="px-3 py-2 bg-amber-100 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-200 border-2 border-amber-200 transition-all"
                            >
                              📋 Duplicate
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
                                const { error } = await supabase.from('assignments').delete().eq('id', a.id);
                                if (error) { showToast("Failed to delete: " + error.message, "error"); return; }
                                setTeacherAssignments(prev => prev.filter(x => x.id !== a.id));
                                showToast("Assignment deleted", "success");
                              }}
                              className="px-3 py-2 bg-rose-100 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-200 border-2 border-rose-200 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  className="w-full p-3 sm:p-4 text-sm sm:text-base rounded-2xl border-2 border-blue-100 focus:border-blue-300 outline-none"
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
                      const toggleable = ["classic", "listening", "spelling", "matching", "true-false", "scramble", "reverse", "letter-sounds", "sentence-builder"];
                      if (assignmentModes.length >= toggleable.length + 1) {
                        setAssignmentModes(["flashcards"]);
                      } else {
                        setAssignmentModes(["flashcards", ...toggleable]);
                      }
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800"
                  >
                    {assignmentModes.length >= 10 ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"] as const).map(mode => {
                    const modeConfig: Record<string, { emoji: string; activeColor: string; activeBg: string }> = {
                      classic: { emoji: '📝', activeColor: 'text-white', activeBg: 'bg-blue-500' },
                      listening: { emoji: '🎧', activeColor: 'text-white', activeBg: 'bg-purple-500' },
                      spelling: { emoji: '✍️', activeColor: 'text-white', activeBg: 'bg-green-600' },
                      matching: { emoji: '🔗', activeColor: 'text-white', activeBg: 'bg-orange-500' },
                      'true-false': { emoji: '✓', activeColor: 'text-white', activeBg: 'bg-rose-500' },
                      flashcards: { emoji: '🎴', activeColor: 'text-white', activeBg: 'bg-teal-500' },
                      scramble: { emoji: '🔤', activeColor: 'text-white', activeBg: 'bg-amber-500' },
                      reverse: { emoji: '🔄', activeColor: 'text-white', activeBg: 'bg-indigo-500' },
                      'letter-sounds': { emoji: '🔡', activeColor: 'text-white', activeBg: 'bg-pink-500' },
                      'sentence-builder': { emoji: '🧩', activeColor: 'text-white', activeBg: 'bg-cyan-600' },
                    };
                    const cfg = modeConfig[mode];
                    const isFlashcards = mode === "flashcards";
                    return (
                      <button
                        key={mode}
                        onClick={() => !isFlashcards && setAssignmentModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold transition-all active:scale-95 text-xs sm:text-sm ${isFlashcards ? `${cfg.activeBg} ${cfg.activeColor} shadow-md opacity-80 cursor-default` : assignmentModes.includes(mode) ? `${cfg.activeBg} ${cfg.activeColor} shadow-md` : "bg-white text-stone-500 hover:bg-stone-50 border-2 border-stone-200 hover:border-stone-300"}`}
                      >
                        {cfg.emoji} {mode.charAt(0).toUpperCase() + mode.slice(1)} {isFlashcards && <span className="text-[10px] opacity-70">(Always on)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sentences for Sentence Builder mode */}
            {assignmentModes.includes("sentence-builder") && (
              <div className="bg-teal-50 border-2 border-teal-100 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧩</span>
                  <h3 className="font-bold text-teal-900 text-sm">Sentences for Sentence Builder</h3>
                  <span className="text-xs text-teal-600 ml-auto">One sentence per line</span>
                </div>
                {sentencesAutoGenerated && assignmentSentences.filter(s => s.trim()).length > 0 && (
                  <div className="flex items-center gap-2 mb-2 bg-teal-100 rounded-lg px-3 py-1.5">
                    <Zap size={14} className="text-teal-700" />
                    <span className="text-xs text-teal-800 font-medium">
                      Auto-generated {assignmentSentences.filter(s => s.trim()).length} sentences from word bank
                    </span>
                    <button
                      onClick={() => {
                        const allPossibleWords = [...ALL_WORDS, ...customWords];
                        const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
                        const words = uniqueWords.filter(w => selectedWordsSet.has(w.id));
                        setAssignmentSentences(generateSentencesForAssignment(words));
                        setSentencesAutoGenerated(true);
                      }}
                      className="ml-auto text-xs text-teal-700 underline hover:text-teal-900 font-medium"
                    >
                      Regenerate
                    </button>
                  </div>
                )}
                <textarea
                  value={assignmentSentences.join("\n")}
                  onChange={(e) => {
                    setAssignmentSentences(e.target.value.split("\n"));
                    setSentencesAutoGenerated(false);
                  }}
                  placeholder={"Sentences auto-generate when you select words.\nYou can also edit or type your own sentences here.\n\nExamples:\nThe dog runs fast\nShe likes going to school"}
                  className="w-full p-2.5 rounded-xl border border-teal-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                  rows={5}
                />
                <p className="text-xs text-teal-600 mt-1">{assignmentSentences.filter(s => s.trim()).length} sentence(s) added</p>
              </div>
            )}

            {/* ── Add Words ──────────────────────────────────────── */}
            <div className="bg-blue-50 rounded-2xl p-3 mb-3 border-2 border-blue-100 space-y-3">
              <div className="flex items-center gap-1">
                <span className="text-lg">✏️</span>
                <h3 className="font-bold text-blue-900 text-sm">Add Words</h3>
              </div>

              {/* Tag-style single word entry */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type a word and press Enter"
                  className="flex-1 p-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => { if (!tagInput.trim()) return; const w: Word = { id: Date.now(), english: tagInput.trim(), hebrew: "", arabic: "", level: "Custom" }; setCustomWords(prev => [...prev, w]); setSelectedWords(prev => [...prev, w.id]); setSelectedLevel("Custom"); setTagInput(""); }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                >+ Add</button>
              </div>

              {/* Smart Paste textarea */}
              <div>
                <p className="text-xs text-blue-700 font-bold mb-1">📋 Paste a list (comma, newline, tab separated)</p>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={"Paste words here…\nExamples: apple, banana\nOr one per line\nWorks with Excel copy-paste too"}
                  className="w-full p-2.5 rounded-xl border border-blue-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={4}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-blue-600">{pastedText.trim() && `${pastedText.split(/[\n,;\t]+/).filter(w => w.trim()).length} words detected`}</span>
                  <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition-all">Import Words</button>
                </div>
              </div>
            </div>

            {/* ── Import from file or URL ─────────────────────── */}
            <div className="bg-stone-50 rounded-2xl p-3 mb-3 border-2 border-stone-200 space-y-2">
              <p className="text-sm font-black text-blue-700 uppercase tracking-wide bg-blue-50 inline-block px-3 py-1 rounded-lg">Import from file or URL</p>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 text-white rounded-xl font-bold cursor-pointer hover:bg-black text-xs whitespace-nowrap">
                  <Upload size={14} /> .csv / .txt
                  <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
                </label>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-xl font-bold cursor-pointer hover:bg-green-800 text-xs whitespace-nowrap">
                  <Upload size={14} /> Excel (.xlsx)
                  <input type="file" accept=".xlsx" onChange={handleXlsxUpload} className="hidden" />
                </label>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-800 text-xs whitespace-nowrap">
                  <Upload size={14} /> Word (.docx)
                  <input type="file" accept=".docx" onChange={handleDocxUpload} className="hidden" />
                </label>
                <label className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-xl font-bold cursor-pointer text-xs whitespace-nowrap relative overflow-hidden ${isOcrProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Camera size={14} /> {isOcrProcessing ? `Scanning… ${ocrProgress}%` : "Scan (OCR)"}
                  <input type="file" accept="image/*" capture="environment" onChange={handleOcrUpload} className="hidden" disabled={isOcrProcessing} />
                  {isOcrProcessing && <progress className="absolute bottom-0 left-0 h-1 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white/50 [&::-moz-progress-bar]:bg-white/50" max={100} value={toProgressValue(ocrProgress)} />}
                </label>
              </div>
              {/* Google Sheets URL */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={gSheetsUrl}
                  onChange={(e) => setGSheetsUrl(e.target.value)}
                  placeholder="Paste public Google Sheets URL…"
                  className="flex-1 p-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button onClick={handleGSheetsImport} disabled={gSheetsLoading || !gSheetsUrl.trim()} className="px-3 py-2 bg-green-600 text-white rounded-xl font-bold text-xs hover:bg-green-700 disabled:opacity-50 transition-all whitespace-nowrap">
                  {gSheetsLoading ? "Importing…" : "🔗 Import"}
                </button>
              </div>
            </div>

            {/* ── Browse & Pick ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {(["Band 1", "Band 2", "Custom"] as const).map(level => (
                <button key={level} onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all text-xs ${selectedLevel === level ? "bg-blue-700 text-white shadow-lg" : "bg-white text-stone-500 hover:bg-blue-50 border-2 border-blue-200"}`}>
                  {level} {level === "Custom" && customWords.length > 0 && `(${customWords.length})`}
                </button>
              ))}
              <button onClick={() => setShowTopicPacks(true)} className="flex items-center justify-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-all">
                📦 Topic Packs
              </button>
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
                <h3 className="text-2xl font-black mb-4 text-stone-900">Welcome to Vocaband!</h3>
                <p className="text-stone-600 mb-6 text-lg">Create engaging vocabulary assignments with 10 game modes.</p>

                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-bold text-stone-800">Import Words</p>
                      <p className="text-sm text-stone-600">Paste, upload CSV/Excel/Word, scan with OCR, or Google Sheets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                    <span className="text-2xl">🎮</span>
                    <div>
                      <p className="font-bold text-stone-800">10 Game Modes</p>
                      <p className="text-sm text-stone-600">Classic, Listening, Spelling, Matching, Scramble, Letter Sounds & more</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="font-bold text-stone-800">XP & Rewards</p>
                      <p className="text-sm text-stone-600">Students earn XP to unlock avatars, themes, name titles & more</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="font-bold text-stone-800">Track Progress</p>
                      <p className="text-sm text-stone-600">Gradebook with detailed analytics per student and assignment</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setShowAssignmentWelcome(false); try { localStorage.setItem('vocaband_welcome_seen', '1'); } catch {} }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Got it, let's start! →
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Topic Packs Modal ─────────────────────────────── */}
        <AnimatePresence>
          {showTopicPacks && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowTopicPacks(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-black text-stone-900">📦 Topic Packs</h3>
                  <button onClick={() => setShowTopicPacks(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-all">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-sm text-stone-500 mb-5">Click a topic to add its words to your assignment.</p>
                <div className="grid grid-cols-2 gap-3">
                  {TOPIC_PACKS.map(pack => {
                    const alreadyAdded = pack.ids.every(id => selectedWords.includes(id));
                    return (
                      <button
                        key={pack.name}
                        onClick={() => {
                          const newIds = pack.ids.filter(id => !selectedWords.includes(id));
                          setSelectedWords(prev => [...prev, ...newIds]);
                          setSelectedLevel("Band 1");
                          setShowTopicPacks(false);
                        }}
                        disabled={alreadyAdded}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${alreadyAdded ? "border-green-200 bg-green-50 opacity-70 cursor-default" : "border-amber-100 bg-amber-50 hover:bg-amber-100 hover:border-amber-300"}`}
                      >
                        <span className="text-3xl">{pack.icon}</span>
                        <span className="font-bold text-stone-800 text-sm">{pack.name}</span>
                        <span className="text-xs text-stone-500">{pack.ids.length} words</span>
                        {alreadyAdded && <span className="text-xs text-green-600 font-bold">✓ Added</span>}
                      </button>
                    );
                  })}
                </div>
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
      { id: "letter-sounds", name: "Letter Sounds", desc: "Watch each letter light up and hear its sound.", color: "violet", icon: <span className="text-2xl">🔡</span>, tooltip: ["Each letter lights up in color", "Listen to each letter sound", "Type the full word you heard"] },
      { id: "sentence-builder", name: "Sentence Builder", desc: "Tap words in the right order to build the sentence.", color: "teal", icon: <span className="text-2xl">🧩</span>, tooltip: ["Words are shuffled", "Tap them in the correct order", "Build the sentence correctly!"] },
    ];

    const allowedModes = activeAssignment?.allowedModes || modes.map(m => m.id);
    const filteredModes = modes.filter(m => m.id === "flashcards" || allowedModes.includes(m.id));

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

  // "students" view merged into gradebook — redirect if somehow navigated here
  if (view === "students") { setView("gradebook"); fetchScores(); fetchStudents(); }

  if (view === "analytics") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <button onClick={() => setView("teacher-dashboard")} className="text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full">← Back to Dashboard</button>
            <h1 className="text-xl sm:text-3xl font-black text-stone-900">Student Analytics</h1>
          </div>

          {/* Explanation banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-purple-900 text-sm sm:text-base mb-2">How to read this dashboard</h2>
            <ul className="text-purple-700 text-xs sm:text-sm space-y-1.5 list-none">
              <li className="flex items-start gap-2"><span className="mt-0.5">📊</span> <span>Each <strong>column</strong> is an assignment (shown by title). Each <strong>row</strong> is a student.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🔢</span> <span>The <strong>score</strong> in each cell is the student's <strong>latest attempt</strong> on that assignment.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">👆</span> <span>Click a <strong>score cell</strong> to see details: mode played, date, and missed words.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">👤</span> <span>Click a <strong>student name</strong> to see their full profile with score trends.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">📈</span> <span>The <strong>Average</strong> column shows each student's mean score across all assignments.</span></li>
            </ul>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span> 70–89% Good</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-400 inline-block"></span> ★ 90%+ Excellent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span> ⚠️ Below 70%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-100 border border-stone-200 inline-block"></span> — Not attempted</span>
            </div>
          </div>

          {allScores.length === 0 ? (
            <div className="bg-white p-8 rounded-[32px] sm:rounded-[40px] shadow-xl text-center">
              <p className="text-stone-400 italic mb-4 text-base sm:text-sm">No student data yet. Analytics will appear once students complete assignments.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-xs sm:text-sm font-bold uppercase">Students Tracked</p>
              <p className="text-2xl sm:text-3xl font-black text-stone-900">{matrixData.students.length}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-xs sm:text-sm font-bold uppercase">Assignments</p>
              <p className="text-2xl sm:text-3xl font-black text-stone-900">{matrixData.assignments.length}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[30px] shadow-lg">
              <p className="text-stone-400 text-xs sm:text-sm font-bold uppercase">Class Average</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700">
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
                  {matrixData.students.map(student => {
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

          {/* Enrolled Students Without Scores */}
          {(() => {
            const scoredNames = new Set(studentEntries.map(e => e.studentName));
            const noScoreStudents = classStudents.filter(s => !scoredNames.has(s.name));
            if (noScoreStudents.length === 0) return null;
            return (
              <div className="bg-white rounded-3xl shadow-md p-6 mt-6">
                <h3 className="text-lg font-black text-slate-700 mb-1 flex items-center gap-2">
                  <UserCircle size={20} className="text-orange-500" />
                  Enrolled Students ({noScoreStudents.length})
                </h3>
                <p className="text-slate-400 text-xs mb-4">Students who joined but haven't completed any assignments yet.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {noScoreStudents.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 text-sm truncate">{s.name}</p>
                        <p className="text-slate-400 text-xs">{classes.find(c => c.code === s.classCode)?.name || s.classCode}</p>
                      </div>
                      <span className="text-xs text-slate-400">Last: {new Date(s.lastActive).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
  const [introLang, setIntroLang] = useState<"en" | "ar" | "he">("en");
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
    <div className={`min-h-screen ${user?.role === 'student' ? activeThemeConfig.colors.bg : 'bg-stone-100'} flex flex-col items-center p-2 sm:p-8 font-sans`}>
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
      <div className="w-full max-w-5xl flex flex-wrap justify-between items-center gap-2 mb-3 sm:mb-8">
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

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
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
              className={`bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl p-3 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-blue-50 border-4 border-blue-600" : feedback === "wrong" ? "bg-red-50 border-4 border-red-500" : "border-4 border-transparent"}`}
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
                    onClick={() => speak(currentWord?.english)}
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
                      setHiddenOptions(toHide);
                      const newPowerUps = { ...(user.powerUps ?? {}), fifty_fifty: ((user.powerUps ?? {})['fifty_fifty'] ?? 1) - 1 };
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid);
                    }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 border border-amber-200">
                      ✂️ 50/50 <span className="bg-amber-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['fifty_fifty']}</span>
                    </button>
                  )}
                  {((user.powerUps ?? {})['skip'] ?? 0) > 0 && !feedback && (
                    <button onClick={() => {
                      setCurrentIndex(prev => Math.min(prev + 1, gameWords.length - 1));
                      setHiddenOptions([]);
                      const newPowerUps = { ...(user.powerUps ?? {}), skip: ((user.powerUps ?? {})['skip'] ?? 1) - 1 };
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid);
                    }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 border border-blue-200">
                      ⏭️ Skip <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['skip']}</span>
                    </button>
                  )}
                  {(gameMode === "spelling" || gameMode === "letter-sounds") && ((user.powerUps ?? {})['reveal_letter'] ?? 0) > 0 && !feedback && spellingInput.length === 0 && (
                    <button onClick={() => {
                      if (currentWord) setSpellingInput(currentWord.english[0]);
                      const newPowerUps = { ...(user.powerUps ?? {}), reveal_letter: ((user.powerUps ?? {})['reveal_letter'] ?? 1) - 1 };
                      setUser(prev => prev ? { ...prev, powerUps: newPowerUps } : prev);
                      supabase.from('users').update({ power_ups: newPowerUps }).eq('uid', user.uid);
                    }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-all flex items-center gap-1 border border-green-200">
                      💡 Hint <span className="bg-green-200 px-1.5 py-0.5 rounded-md text-[10px]">×{(user.powerUps ?? {})['reveal_letter']}</span>
                    </button>
                  )}
                </div>
              )}

              {gameMode === "classic" || gameMode === "listening" || gameMode === "reverse" ? (
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                  {options.filter(o => !hiddenOptions.includes(o.id)).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option)}
                      className={`py-2.5 px-2 sm:py-6 sm:px-8 rounded-xl sm:rounded-3xl text-sm sm:text-2xl font-bold transition-all duration-300 ${
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
                      const charOffset = allWords.slice(0, wordIdx).reduce((acc, w) => acc + w.length + 1, 0);
                      return (
                        <div key={wordIdx} className="flex justify-center gap-1 sm:gap-2">
                          {word.split("").map((letter, i) => {
                            const globalIdx = charOffset + i;
                            return (
                              <motion.div
                                key={globalIdx}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={globalIdx < revealedLetters ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.15 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="w-8 h-10 sm:w-12 sm:h-14 rounded-xl font-black text-lg sm:text-2xl flex items-center justify-center border-3 sm:border-4 flex-shrink-0"
                                style={{ color: LETTER_COLORS[globalIdx % LETTER_COLORS.length], borderColor: LETTER_COLORS[globalIdx % LETTER_COLORS.length], background: LETTER_COLORS[globalIdx % LETTER_COLORS.length] + "18" }}
                              >
                                {globalIdx < revealedLetters ? letter.toUpperCase() : "?"}
                              </motion.div>
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
                        placeholder="Type the word..."
                        className={`w-full p-3 text-xl font-black text-center border-4 rounded-2xl mb-3 transition-all ${
                          feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                          feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                          "border-stone-100 focus:border-stone-900 outline-none"
                        }`}
                      />
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
                      <p className="text-stone-400 text-xs font-bold uppercase mb-3 text-center">Sentence {sentenceIndex + 1} / {sentences.length}</p>
                      {/* Built sentence area */}
                      <div className={`min-h-[60px] border-4 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center transition-colors ${
                        sentenceFeedback === "correct" ? "border-blue-500 bg-blue-50" :
                        sentenceFeedback === "wrong" ? "border-rose-500 bg-rose-50" :
                        "border-stone-200 bg-stone-50"
                      }`}>
                        {builtSentence.length === 0 && <span className="text-stone-300 text-sm italic w-full text-center">Tap words below to build the sentence</span>}
                        {builtSentence.map((word, i) => (
                          <motion.button
                            key={i}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, false)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-blue-700 active:scale-95 transition-all"
                          >{word}</motion.button>
                        ))}
                      </div>
                      {/* Available words */}
                      <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {availableWords.map((word, i) => (
                          <motion.button
                            key={i}
                            onClick={() => sentenceFeedback === null && handleSentenceWordTap(word, true)}
                            className="px-3 py-1.5 bg-white border-2 border-stone-200 text-stone-800 rounded-xl font-bold text-sm sm:text-base hover:border-blue-400 hover:text-blue-700 active:scale-95 transition-all"
                          >{word}</motion.button>
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
                    placeholder="Type in English..."
                    className={`w-full p-3 sm:p-6 text-lg sm:text-3xl font-black text-center border-4 rounded-2xl sm:rounded-3xl mb-3 sm:mb-6 transition-all ${
                      feedback === "correct" ? "border-blue-600 bg-blue-50 text-blue-700" :
                      feedback === "wrong" ? "border-rose-500 bg-rose-50 text-rose-700" :
                      "border-stone-100 focus:border-stone-900 outline-none"
                    }`}
                  />
                  {gameMode === "spelling" && (
                    <p className="text-stone-400 font-bold mb-4 sm:mb-8 text-sm sm:text-base">Translation: <span className="text-stone-900">{currentWord?.[targetLanguage]}</span></p>
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
