import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ALL_WORDS, BAND_2_WORDS, Word } from "./vocabulary";
import {
  Volume2, 
  Languages, 
  Trophy, 
  RefreshCw, 
  LogIn, 
  UserCircle, 
  Users, 
  GraduationCap, 
  Plus, 
  CheckCircle2, 
  BookOpen,
  BarChart3,
  ChevronRight, 
  Calendar,
  Flame,
  Settings,
  Download,
  Upload,
  Image as ImageIcon,
  Smile,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  X,
  Camera,
  Trash2,
  PenTool,
  Zap,
  Layers,
  Shuffle,
  Repeat,
  Copy,
  Check,
  Share2,
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { io, Socket } from "socket.io-client";
import { supabase, OperationType, handleDbError, mapUser, mapUserToDb, mapClass, mapAssignment, mapProgress, mapProgressToDb, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "./supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import Tesseract from 'tesseract.js';
import { shuffle, chunkArray } from './utils';

// --- TYPES ---
// AppUser, ClassData, AssignmentData, ProgressData are imported from ./supabase


const MOTIVATIONAL_MESSAGES = [
  "Great job! 🎉", "Well done! 👏", "Awesome! 🌟", "Keep it up! 💪",
  "Nailed it! 🎯", "Brilliant! ✨", "You're on fire! 🔥", "Fantastic! 🚀",
  "Way to go! 🏆", "Superstar! ⭐",
];
const randomMotivation = () =>
  MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

// Test data for analytics view development
const TEST_ANALYTICS_DATA: ProgressData[] = [
  // Assignment 1 - "Classic Mode"
  { id: "1", studentName: "Ahmed Al-Ahmad", assignmentId: "Classic Mode", classCode: "489409", score: 92, mode: "classic", completedAt: "2025-03-10T10:30:00", mistakes: [5] },
  { id: "2", studentName: "Sara Hassan", assignmentId: "Classic Mode", classCode: "489409", score: 88, mode: "classic", completedAt: "2025-03-10T11:15:00", mistakes: [12, 18] },
  { id: "3", studentName: "Omar Khalid", assignmentId: "Classic Mode", classCode: "489409", score: 65, mode: "classic", completedAt: "2025-03-10T14:20:00", mistakes: [1, 5, 8, 12, 15, 22] },
  { id: "4", studentName: "Layla Mahmoud", assignmentId: "Classic Mode", classCode: "489409", score: 78, mode: "spelling", completedAt: "2025-03-10T15:45:00", mistakes: [3, 7, 11] },
  { id: "5", studentName: "Khalid Rahman", assignmentId: "Classic Mode", classCode: "489409", score: 95, mode: "classic", completedAt: "2025-03-10T16:00:00", mistakes: [] },
  { id: "6", studentName: "Noura Ahmed", assignmentId: "Classic Mode", classCode: "489409", score: 72, mode: "spelling", completedAt: "2025-03-10T17:30:00", mistakes: [2, 9, 13, 14] },
  { id: "7", studentName: "Fahad Ali", assignmentId: "Classic Mode", classCode: "489409", score: 85, mode: "classic", completedAt: "2025-03-10T18:00:00", mistakes: [8, 20] },
  { id: "8", studentName: "Rana Omar", assignmentId: "Classic Mode", classCode: "210443", score: 90, mode: "flashcards", completedAt: "2025-03-11T09:00:00", mistakes: [4] },
  { id: "9", studentName: "Hassan Saeed", assignmentId: "Classic Mode", classCode: "210443", score: 68, mode: "classic", completedAt: "2025-03-11T10:30:00", mistakes: [1, 6, 11, 16, 19, 23] },
  { id: "10", studentName: "Mona Youssef", assignmentId: "Classic Mode", classCode: "210443", score: 82, mode: "spelling", completedAt: "2025-03-11T11:45:00", mistakes: [5, 10] },

  // Assignment 2 - "Listening Mode"
  { id: "11", studentName: "Ahmed Al-Ahmad", assignmentId: "Listening Mode", classCode: "489409", score: 78, mode: "spelling", completedAt: "2025-03-12T09:30:00", mistakes: [15, 21, 28] },
  { id: "12", studentName: "Sara Hassan", assignmentId: "Listening Mode", classCode: "489409", score: 91, mode: "spelling", completedAt: "2025-03-12T10:15:00", mistakes: [17] },
  { id: "13", studentName: "Omar Khalid", assignmentId: "Listening Mode", classCode: "489409", score: 58, mode: "flashcards", completedAt: "2025-03-12T14:00:00", mistakes: [2, 9, 13, 15, 20, 25, 30, 35] },
  { id: "14", studentName: "Layla Mahmoud", assignmentId: "Listening Mode", classCode: "489409", score: 85, mode: "classic", completedAt: "2025-03-12T15:20:00", mistakes: [6] },
  { id: "15", studentName: "Khalid Rahman", assignmentId: "Listening Mode", classCode: "489409", score: 98, mode: "spelling", completedAt: "2025-03-12T16:45:00", mistakes: [] },
  { id: "16", studentName: "Noura Ahmed", assignmentId: "Listening Mode", classCode: "489409", score: 69, mode: "flashcards", completedAt: "2025-03-12T17:00:00", mistakes: [3, 8, 11, 14, 18, 21] },
  { id: "17", studentName: "Fahad Ali", assignmentId: "Listening Mode", classCode: "489409", score: 88, mode: "classic", completedAt: "2025-03-12T18:30:00", mistakes: [7] },
  { id: "18", studentName: "Rana Omar", assignmentId: "Listening Mode", classCode: "210443", score: 93, mode: "flashcards", completedAt: "2025-03-13T08:30:00", mistakes: [] },
  { id: "19", studentName: "Hassan Saeed", assignmentId: "Listening Mode", classCode: "210443", score: 71, mode: "classic", completedAt: "2025-03-13T09:45:00", mistakes: [5, 12, 19] },
  { id: "20", studentName: "Mona Youssef", assignmentId: "Listening Mode", classCode: "210443", score: 86, mode: "spelling", completedAt: "2025-03-13T11:00:00", mistakes: [8, 16] },

  // Assignment 3 - "Spelling Mode" - more challenging!
  { id: "21", studentName: "Ahmed Al-Ahmad", assignmentId: "Spelling Mode", classCode: "489409", score: 85, mode: "flashcards", completedAt: "2025-03-14T09:00:00", mistakes: [4, 11] },
  { id: "22", studentName: "Sara Hassan", assignmentId: "Spelling Mode", classCode: "489409", score: 89, mode: "classic", completedAt: "2025-03-14T10:30:00", mistakes: [9, 22] },
  { id: "23", studentName: "Omar Khalid", assignmentId: "Spelling Mode", classCode: "489409", score: 45, mode: "classic", completedAt: "2025-03-14T14:15:00", mistakes: [1, 2, 5, 6, 8, 10, 11, 13, 14, 15, 17, 19, 21, 24, 26, 28] },
  { id: "24", studentName: "Layla Mahmoud", assignmentId: "Spelling Mode", classCode: "489409", score: 75, mode: "flashcards", completedAt: "2025-03-14T15:40:00", mistakes: [3, 7, 12, 18, 23] },
  { id: "25", studentName: "Khalid Rahman", assignmentId: "Spelling Mode", classCode: "489409", score: 92, mode: "spelling", completedAt: "2025-03-14T17:00:00", mistakes: [5] },
  // Noura didn't complete Assignment 3
  { id: "26", studentName: "Fahad Ali", assignmentId: "Spelling Mode", classCode: "489409", score: 80, mode: "flashcards", completedAt: "2025-03-14T18:15:00", mistakes: [9, 15, 20] },
  { id: "27", studentName: "Rana Omar", assignmentId: "Spelling Mode", classCode: "210443", score: 87, mode: "spelling", completedAt: "2025-03-15T09:15:00", mistakes: [6, 13] },
  { id: "28", studentName: "Hassan Saeed", assignmentId: "Spelling Mode", classCode: "210443", score: 62, mode: "flashcards", completedAt: "2025-03-15T10:30:00", mistakes: [1, 4, 7, 10, 13, 16, 20, 25, 31] },
  { id: "29", studentName: "Mona Youssef", assignmentId: "Spelling Mode", classCode: "210443", score: 79, mode: "classic", completedAt: "2025-03-15T11:45:00", mistakes: [8, 14, 19] },

  // Assignment 4 - "Matching Mode"
  { id: "30", studentName: "Ahmed Al-Ahmad", assignmentId: "Matching Mode", classCode: "489409", score: 88, mode: "classic", completedAt: "2025-03-16T09:20:00", mistakes: [10] },
  { id: "31", studentName: "Sara Hassan", assignmentId: "Matching Mode", classCode: "489409", score: 94, mode: "spelling", completedAt: "2025-03-16T10:45:00", mistakes: [] },
  { id: "32", studentName: "Omar Khalid", assignmentId: "Matching Mode", classCode: "489409", score: 52, mode: "flashcards", completedAt: "2025-03-16T14:30:00", mistakes: [2, 5, 9, 11, 14, 17, 20, 22, 25, 27, 30, 33] },
  { id: "33", studentName: "Layla Mahmoud", assignmentId: "Matching Mode", classCode: "489409", score: 82, mode: "spelling", completedAt: "2025-03-16T15:50:00", mistakes: [7, 13] },
  { id: "34", studentName: "Khalid Rahman", assignmentId: "Matching Mode", classCode: "489409", score: 96, mode: "classic", completedAt: "2025-03-16T17:15:00", mistakes: [] },
  { id: "35", studentName: "Noura Ahmed", assignmentId: "Matching Mode", classCode: "489409", score: 74, mode: "spelling", completedAt: "2025-03-16T17:45:00", mistakes: [4, 8, 11, 15] },
  { id: "36", studentName: "Fahad Ali", assignmentId: "Matching Mode", classCode: "489409", score: 86, mode: "flashcards", completedAt: "2025-03-16T18:30:00", mistakes: [12] },
  { id: "37", studentName: "Rana Omar", assignmentId: "Matching Mode", classCode: "210443", score: 91, mode: "classic", completedAt: "2025-03-17T08:45:00", mistakes: [3] },
  { id: "38", studentName: "Hassan Saeed", assignmentId: "Matching Mode", classCode: "210443", score: 67, mode: "spelling", completedAt: "2025-03-17T10:10:00", mistakes: [6, 12, 18, 21] },
  { id: "39", studentName: "Mona Youssef", assignmentId: "Matching Mode", classCode: "210443", score: 84, mode: "flashcards", completedAt: "2025-03-17T11:30:00", mistakes: [9, 16] },

  // Assignment 5 - "Final Challenge" - most challenging!
  { id: "40", studentName: "Ahmed Al-Ahmad", assignmentId: "True/False", classCode: "489409", score: 90, mode: "spelling", completedAt: "2025-03-18T09:30:00", mistakes: [7] },
  { id: "41", studentName: "Sara Hassan", assignmentId: "True/False", classCode: "489409", score: 97, mode: "flashcards", completedAt: "2025-03-18T11:00:00", mistakes: [] },
  { id: "42", studentName: "Omar Khalid", assignmentId: "True/False", classCode: "489409", score: 38, mode: "classic", completedAt: "2025-03-18T14:45:00", mistakes: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: "43", studentName: "Layla Mahmoud", assignmentId: "True/False", classCode: "489409", score: 79, mode: "classic", completedAt: "2025-03-18T16:00:00", mistakes: [8, 15, 22] },
  { id: "44", studentName: "Khalid Rahman", assignmentId: "True/False", classCode: "489409", score: 94, mode: "spelling", completedAt: "2025-03-18T17:30:00", mistakes: [2] },
  { id: "45", studentName: "Noura Ahmed", assignmentId: "True/False", classCode: "489409", score: 68, mode: "classic", completedAt: "2025-03-18T18:00:00", mistakes: [4, 9, 13, 16, 19, 22] },
  { id: "46", studentName: "Fahad Ali", assignmentId: "True/False", classCode: "489409", score: 83, mode: "flashcards", completedAt: "2025-03-18T18:45:00", mistakes: [11, 18] },
  { id: "47", studentName: "Rana Omar", assignmentId: "True/False", classCode: "210443", score: 89, mode: "spelling", completedAt: "2025-03-19T09:00:00", mistakes: [5] },
  { id: "48", studentName: "Hassan Saeed", assignmentId: "True/False", classCode: "210443", score: 59, mode: "flashcards", completedAt: "2025-03-19T10:15:00", mistakes: [3, 7, 11, 14, 17, 20, 23, 26, 29, 32] },
  { id: "49", studentName: "Mona Youssef", assignmentId: "True/False", classCode: "210443", score: 81, mode: "classic", completedAt: "2025-03-19T11:30:00", mistakes: [10, 17, 24] },

  // Flashcards
  { id: "50", studentName: "Ahmed Al-Ahmad", assignmentId: "Flashcards", classCode: "489409", score: 95, mode: "flashcards", completedAt: "2025-03-20T09:00:00", mistakes: [] },
  { id: "51", studentName: "Sara Hassan", assignmentId: "Flashcards", classCode: "489409", score: 92, mode: "flashcards", completedAt: "2025-03-20T10:30:00", mistakes: [8] },
  { id: "52", studentName: "Omar Khalid", assignmentId: "Flashcards", classCode: "489409", score: 72, mode: "flashcards", completedAt: "2025-03-20T14:00:00", mistakes: [3, 7, 11, 15] },
  { id: "53", studentName: "Layla Mahmoud", assignmentId: "Flashcards", classCode: "489409", score: 88, mode: "flashcards", completedAt: "2025-03-20T15:30:00", mistakes: [5] },
  { id: "54", studentName: "Khalid Rahman", assignmentId: "Flashcards", classCode: "489409", score: 98, mode: "flashcards", completedAt: "2025-03-20T17:00:00", mistakes: [] },
  { id: "55", studentName: "Noura Ahmed", assignmentId: "Flashcards", classCode: "489409", score: 85, mode: "flashcards", completedAt: "2025-03-20T18:30:00", mistakes: [6, 12] },
  { id: "56", studentName: "Fahad Ali", assignmentId: "Flashcards", classCode: "489409", score: 91, mode: "flashcards", completedAt: "2025-03-20T19:00:00", mistakes: [4] },
  { id: "57", studentName: "Rana Omar", assignmentId: "Flashcards", classCode: "210443", score: 94, mode: "flashcards", completedAt: "2025-03-21T09:00:00", mistakes: [] },
  { id: "58", studentName: "Hassan Saeed", assignmentId: "Flashcards", classCode: "210443", score: 78, mode: "flashcards", completedAt: "2025-03-21T10:15:00", mistakes: [2, 9, 14] },
  { id: "59", studentName: "Mona Youssef", assignmentId: "Flashcards", classCode: "210443", score: 89, mode: "flashcards", completedAt: "2025-03-21T11:30:00", mistakes: [7] },

  // Word Scramble
  { id: "60", studentName: "Ahmed Al-Ahmad", assignmentId: "Word Scramble", classCode: "489409", score: 87, mode: "scramble", completedAt: "2025-03-22T09:30:00", mistakes: [10, 16] },
  { id: "61", studentName: "Sara Hassan", assignmentId: "Word Scramble", classCode: "489409", score: 93, mode: "scramble", completedAt: "2025-03-22T11:00:00", mistakes: [5] },
  { id: "62", studentName: "Omar Khalid", assignmentId: "Word Scramble", classCode: "489409", score: 48, mode: "scramble", completedAt: "2025-03-22T14:30:00", mistakes: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27] },
  { id: "63", studentName: "Layla Mahmoud", assignmentId: "Word Scramble", classCode: "489409", score: 76, mode: "scramble", completedAt: "2025-03-22T16:00:00", mistakes: [4, 8, 12, 18, 22] },
  { id: "64", studentName: "Khalid Rahman", assignmentId: "Word Scramble", classCode: "489409", score: 95, mode: "scramble", completedAt: "2025-03-22T17:30:00", mistakes: [2] },
  // Noura skipped Word Scramble
  { id: "65", studentName: "Fahad Ali", assignmentId: "Word Scramble", classCode: "489409", score: 82, mode: "scramble", completedAt: "2025-03-22T19:00:00", mistakes: [6, 13, 19] },
  { id: "66", studentName: "Rana Omar", assignmentId: "Word Scramble", classCode: "210443", score: 88, mode: "scramble", completedAt: "2025-03-23T09:30:00", mistakes: [7] },
  { id: "67", studentName: "Hassan Saeed", assignmentId: "Word Scramble", classCode: "210443", score: 54, mode: "scramble", completedAt: "2025-03-23T10:45:00", mistakes: [1, 4, 7, 10, 13, 16, 20, 24, 28, 31] },
  { id: "68", studentName: "Mona Youssef", assignmentId: "Word Scramble", classCode: "210443", score: 79, mode: "scramble", completedAt: "2025-03-23T12:00:00", mistakes: [8, 15, 21] },

  // Reverse Mode
  { id: "69", studentName: "Ahmed Al-Ahmad", assignmentId: "Reverse Mode", classCode: "489409", score: 82, mode: "reverse", completedAt: "2025-03-24T09:00:00", mistakes: [11, 17, 23] },
  { id: "70", studentName: "Sara Hassan", assignmentId: "Reverse Mode", classCode: "489409", score: 90, mode: "reverse", completedAt: "2025-03-24T10:30:00", mistakes: [6] },
  { id: "71", studentName: "Omar Khalid", assignmentId: "Reverse Mode", classCode: "489409", score: 42, mode: "reverse", completedAt: "2025-03-24T14:15:00", mistakes: [1, 2, 4, 5, 7, 9, 10, 12, 14, 16, 18, 20, 22, 25, 28] },
  { id: "72", studentName: "Layla Mahmoud", assignmentId: "Reverse Mode", classCode: "489409", score: 73, mode: "reverse", completedAt: "2025-03-24T15:45:00", mistakes: [3, 8, 13, 19, 24] },
  { id: "73", studentName: "Khalid Rahman", assignmentId: "Reverse Mode", classCode: "489409", score: 93, mode: "reverse", completedAt: "2025-03-24T17:15:00", mistakes: [4] },
  // Noura skipped Reverse Mode
  { id: "74", studentName: "Fahad Ali", assignmentId: "Reverse Mode", classCode: "489409", score: 79, mode: "reverse", completedAt: "2025-03-24T18:45:00", mistakes: [7, 14, 20] },
  { id: "75", studentName: "Rana Omar", assignmentId: "Reverse Mode", classCode: "210443", score: 86, mode: "reverse", completedAt: "2025-03-25T09:15:00", mistakes: [9] },
  { id: "76", studentName: "Hassan Saeed", assignmentId: "Reverse Mode", classCode: "210443", score: 51, mode: "reverse", completedAt: "2025-03-25T10:30:00", mistakes: [1, 5, 8, 12, 15, 19, 22, 26, 30, 33] },
  { id: "77", studentName: "Mona Youssef", assignmentId: "Reverse Mode", classCode: "210443", score: 77, mode: "reverse", completedAt: "2025-03-25T11:45:00", mistakes: [6, 13, 18, 25] },

  // Some students reattempted for better scores
  { id: "78", studentName: "Omar Khalid", assignmentId: "Classic Mode", classCode: "489409", score: 71, mode: "classic", completedAt: "2025-03-11T20:00:00", mistakes: [1, 5, 8, 12, 15, 22] },
  { id: "79", studentName: "Layla Mahmoud", assignmentId: "Listening Mode", classCode: "489409", score: 90, mode: "listening", completedAt: "2025-03-13T12:00:00", mistakes: [3] },
  { id: "80", studentName: "Ahmed Al-Ahmad", assignmentId: "Spelling Mode", classCode: "489409", score: 96, mode: "spelling", completedAt: "2025-03-15T14:00:00", mistakes: [] },
];

export default function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "game" | "teacher-dashboard" | "student-dashboard" | "create-assignment" | "gradebook" | "live-challenge" | "analytics" | "global-leaderboard" | "students">("landing");
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
    "Weekly Vocabulary Quiz",
    "Band 2 Words Review",
    "Common Nouns Practice",
    "Verbs Challenge",
    "Adjectives Test",
    "Daily Words Assessment",
    "Unit 1 Vocabulary",
    "Unit 2 Vocabulary",
    "Unit 3 Vocabulary",
    "Unit 4 Vocabulary",
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

  const ALL_AVATARS = Object.values(AVATAR_CATEGORIES).flat();

  const [selectedAvatarCategory, setSelectedAvatarCategory] = useState<keyof typeof AVATAR_CATEGORIES>("Animals");

  // --- LIVE CHALLENGE STATE ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState<Record<string, { name: string, score: number }>>({});
  const [isLiveChallenge, setIsLiveChallenge] = useState(false);

  // --- TEACHER DATA STATE ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"Band 2" | "Custom">("Band 2");
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

  // --- PERFORMANCE OPTIMIZATIONS ---
  // Use Set for O(1) lookup instead of array.includes() which is O(n)
  const selectedWordsSet = useMemo(() => new Set(selectedWords), [selectedWords]);

  // --- STUDENT DATA STATE ---
  const [activeAssignment, setActiveAssignment] = useState<AssignmentData | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<AssignmentData[]>([]);
  const [studentProgress, setStudentProgress] = useState<ProgressData[]>([]);
  const [assignmentWords, setAssignmentWords] = useState<Word[]>([]);

  // --- GAME STATE ---
  const [gameMode, setGameMode] = useState<"classic" | "listening" | "spelling" | "matching" | "true-false" | "flashcards" | "scramble" | "reverse">("classic");
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
    s.on("leaderboard-update", (data) => {
      setLeaderboard(data);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // --- AUTH LOGIC ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const supabaseUser = session.user;
          const { data: userRow } = await supabase.from('users').select('*').eq('uid', supabaseUser.id).maybeSingle();
          if (userRow) {
            const userData = mapUser(userRow);
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
      const keys = Object.keys(localStorage).filter(k => k.startsWith("vocaband_retry_"));
      for (const key of keys) {
        try {
          const progress = JSON.parse(localStorage.getItem(key)!);
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
      alert("Failed to create class.");
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
        alert("No words from our vocabulary bank were found in this image.");
      } else {
        // 4. Add the matched words to the Custom tab and select them
        setCustomWords(matchedWords);
        setSelectedLevel("Custom");
        setSelectedWords(matchedWords.map(w => w.id));
        alert(`Found ${matchedWords.length} words from the vocabulary bank!`);
      }
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Error processing image. Please try again.");
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

  // Find matching Band 2 words (exact or partial match)
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
    let words = selectedLevel === "Band 2" ? BAND_2_WORDS : customWords;

    // Apply search filter
    if (wordSearchQuery.trim()) {
      const query = wordSearchQuery.toLowerCase();
      words = words.filter(w =>
        w.english.toLowerCase().includes(query) ||
        w.hebrew.includes(query) ||
        w.arabic.includes(query)
      );
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

    return words;
  }, [selectedLevel, customWords, wordSearchQuery, selectedCore, selectedPos, selectedRecProd]);
  const handleSaveAssignment = async () => {
    if (!selectedClass || selectedWords.length === 0 || !assignmentTitle) {
      alert("Please enter a title and select words.");
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
      alert("Assignment created successfully!");
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
      alert("Please select at least one word to preview.");
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
    if (!window.confirm("Are you sure you want to delete this class? This will also remove access for all students in this class.")) {
      return;
    }

    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;
      setClasses(prev => prev.filter(c => c.id !== classId));
      alert("Class deleted successfully.");
    } catch (error) {
      handleDbError(error, OperationType.DELETE, `classes/${classId}`);
    }
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
        socket.emit("join-challenge", { classCode: code, name, uid: studentUid, token });
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
    const { data } = await supabase
      .from('progress').select('student_name, score, avatar')
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
  }, [currentIndex, currentWord, gameWords]);

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

    const progress: Omit<ProgressData, "id"> = {
      studentName: user.displayName,
      studentUid: user.uid,
      assignmentId: activeAssignment.id,
      classCode: user.classCode || "",
      score: score,
      mode: gameMode,
      completedAt: new Date().toISOString(),
      mistakes: mistakes,
      avatar: user.avatar || "🦊"
    };

    try {
      // Dedup: check for existing progress for this assignment+mode (use UID — name is spoofable)
      const { data: existingRows } = await supabase
        .from('progress').select('*')
        .eq('assignment_id', activeAssignment.id)
        .eq('mode', gameMode)
        .eq('student_uid', user.uid)
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
      // Queue for retry on next load
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.setItem(retryKey, JSON.stringify(mapProgressToDb(progress)));
      setSaveError("Your score couldn't be saved. Check your connection — it will retry automatically.");
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
          socket.emit("update-score", { classCode: user.classCode, uid: user.uid, score: newScore });
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
        socket.emit("update-score", { classCode: user.classCode, uid: user.uid, score: newScore });
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
        socket.emit("update-score", { classCode: user.classCode, uid: user.uid, score: newScore });
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
        socket.emit("update-score", { classCode: user.classCode, uid: user.uid, score: newScore });
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
        socket.emit("update-score", { classCode: user.classCode, uid: user.uid, score: newScore });
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

  // --- ANALYTICS CALCULATIONS ---
  const analyticsData = useMemo(() => {
    if (allScores.length === 0) return null;

    // 1. Difficulty Heatmap
    const mistakeCounts: Record<number, number> = {};
    allScores.forEach(score => {
      score.mistakes?.forEach(wordId => {
        mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
      });
    });

    const heatmap = Object.entries(mistakeCounts)
      .map(([id, count]) => ({
        word: BAND_2_WORDS.find(w => w.id === parseInt(id))?.english || "Unknown",
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 2. Daily Progress
    const dailyScores: Record<string, { total: number, count: number }> = {};
    allScores.forEach(score => {
      const date = new Date(score.completedAt).toLocaleDateString();
      if (!dailyScores[date]) dailyScores[date] = { total: 0, count: 0 };
      dailyScores[date].total += score.score;
      dailyScores[date].count += 1;
    });

    const progress = Object.entries(dailyScores).map(([date, data]) => ({
      date,
      avg: Math.round(data.total / data.count)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Mode Stats
    const modeScores: Record<string, { total: number, count: number }> = {};
    allScores.forEach(score => {
      if (!modeScores[score.mode]) modeScores[score.mode] = { total: 0, count: 0 };
      modeScores[score.mode].total += score.score;
      modeScores[score.mode].count += 1;
    });

    const modes = Object.entries(modeScores).map(([mode, data]) => ({
      mode: mode.charAt(0).toUpperCase() + mode.slice(1),
      avg: Math.round(data.total / data.count)
    }));

    return { heatmap, progress, modes };
  }, [allScores]);

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

    return { students, assignments, matrix, averages, studentMap };
  }, [allScores]);

  // State for selected score detail view
  const [selectedScore, setSelectedScore] = useState<ProgressData | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <RefreshCw className="animate-spin text-blue-700" size={48} />
    </div>;
  }

  if (view === "landing" && !user) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden">
          <div className="bg-blue-700 p-7 sm:p-8 text-center text-white">
            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-4 backdrop-blur-sm overflow-hidden">
              <img src="/logo.webp" alt="Vocaband" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-2">Vocaband</h1>
            <p className="text-blue-100 text-sm sm:text-base font-medium">Israeli English Curriculum - Band II Vocabulary</p>
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
                className={`flex-1 py-4 sm:py-3 rounded-xl font-bold transition-all text-lg sm:text-sm ${landingTab === "teacher" ? "bg-white text-blue-700 shadow-sm" : "text-stone-400 hover:text-ststone-600"}`}
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
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-stone-100 focus:border-blue-600 outline-none transition-colors font-bold text-base"
                      />
                    </div>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        type="text"
                        placeholder="Your Name"
                        id="student-name"
                        className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-stone-100 focus:border-blue-600 outline-none transition-colors font-bold text-base"
                      />
                    </div>

                    <div className="bg-stone-50 p-5 rounded-2xl">
                      <p className="text-xs font-black text-stone-400 uppercase mb-4 tracking-widest">Choose Avatar</p>

                      {/* Category Tabs */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>).map(category => (
                          <button
                            key={category}
                            onClick={() => setSelectedAvatarCategory(category)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              selectedAvatarCategory === category
                                ? "bg-blue-600 text-white"
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
                                ? "bg-blue-600 shadow-lg scale-110"
                                : "bg-white hover:bg-stone-100 hover:scale-105"
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
                        else alert("Please enter both code and name!");
                      }}
                      className="w-full bg-blue-700 text-white py-5 sm:py-5 rounded-2xl font-black text-lg sm:text-xl shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all active:scale-95"
                    >
                      Join Class
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
            <button onClick={() => { setUser(null); setView("landing"); }} className="text-stone-500 font-bold hover:text-red-500 text-base sm:text-sm">Logout</button>
          </div>

          {studentAssignments.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-lg font-bold text-stone-800 mb-3 sm:mb-2">Overall Progress</h3>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-1 h-5 sm:h-4 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-1000"
                    style={{
                      width: `${Math.round((studentAssignments.filter(a => {
                        const allowedModes = a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                        const completedModes = new Set(
                          studentProgress.filter(p => p.assignmentId === a.id).map(p => p.mode)
                        ).size;
                        return completedModes >= allowedModes.length;
                      }).length / studentAssignments.length) * 100)}%`
                    }}
                  />
                </div>
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
                        <div className="h-4 sm:h-3 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${isComplete ? 'bg-blue-600' : 'bg-blue-500'}`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <div>
              <p className="text-base sm:text-sm text-stone-500">Welcome back,</p>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{user?.displayName || "Teacher"}</h1>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-stone-500 font-bold hover:text-red-500 text-base sm:text-sm px-4 py-2 bg-white rounded-xl shadow-sm">Logout</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div className="bg-white p-2 sm:p-8 rounded-3xl shadow-md">
              <div className="flex justify-between items-center mb-2 sm:mb-6">
                <h2 className="text-base sm:text-xl font-bold flex items-center gap-2"><Users className="text-blue-700" size={20} /> My Classes</h2>
                <button onClick={() => setShowCreateClassModal(true)} className="p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100"><Plus size={20} /></button>
              </div>
              {classes.length === 0 ? <p className="text-stone-400 italic text-sm sm:text-sm">No classes yet. Create one to get a code!</p> : (
                <div className="space-y-1">
                  {[...classes].reverse().map(c => (
                    <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 sm:p-4 bg-stone-50 rounded-xl border border-stone-100 hover:shadow-md transition-shadow">
                      <div className="w-full sm:w-auto">
                        <p className="font-bold text-stone-800 text-base sm:text-sm">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                          <p className="text-sm font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg font-bold">{c.code}</p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(c.code);
                                setCopiedCode(c.code);
                                setTimeout(() => setCopiedCode(null), 2000);
                              }}
                              className="p-2 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                              title="Copy Code"
                            >
                              {copiedCode === c.code ? <Check size={18} className="text-blue-700" /> : <Copy size={18} />}
                            </button>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`📚 Join my class "${c.name}" on Vocaband!\n\n🔑 Class Code: ${c.code}\n\nSee you there!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-stone-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Share on WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => { setSelectedClass(c); setView("create-assignment"); }} className="flex-1 sm:flex-none text-blue-700 font-bold text-base sm:text-sm hover:underline">Assign Words</button>
                        <button
                          onClick={() => handleDeleteClass(c.id)}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <RefreshCw className="text-blue-600 mb-4 sm:mb-4" size={52} />
              <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-2">Live Challenge</h2>
              <p className="text-stone-500 mb-6 text-base sm:text-sm">Start a real-time competition for your class.</p>
              <button onClick={() => { 
                if (classes.length === 0) alert("Create a class first!");
                else {
                  setSelectedClass(classes[0]);
                  setView("live-challenge");
                  setIsLiveChallenge(true);
                  if (socket) {
                    supabase.auth.getSession().then(({ data: { session } }) => {
                      const token = session?.access_token ?? "";
                      socket.emit("join-challenge", { classCode: classes[0].code, name: user?.displayName || "Teacher", uid: user?.uid || "", token });
                    });
                  }
                }
              }} className="w-full py-4 sm:py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-base sm:text-sm">Start Challenge</button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <BarChart3 className="text-purple-600 mb-4" size={52} />
              <h2 className="text-lg sm:text-xl font-bold mb-2">Analytics</h2>
              <p className="text-stone-500 mb-6 text-base sm:text-sm">Deep dive into class performance and difficulty.</p>
              <button onClick={() => { fetchScores(); setView("analytics"); }} className="w-full py-4 sm:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-base sm:text-sm">View Insights</button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <UserCircle className="text-orange-600 mb-4" size={52} />
              <h2 className="text-lg sm:text-xl font-bold mb-2">Students</h2>
              <p className="text-stone-500 mb-6 text-base sm:text-sm">Manage and view all students in your classes.</p>
              <button onClick={() => { fetchStudents(); setView("students"); }} className="w-full py-4 sm:py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors text-base sm:text-sm">View Students</button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <Trophy className="text-blue-700 mb-4" size={52} />
              <h2 className="text-lg sm:text-xl font-bold mb-2">Gradebook</h2>
              <p className="text-stone-500 mb-6 text-base sm:text-sm">Track your students' progress and scores.</p>
              <button onClick={() => { fetchScores(); setView("gradebook"); }} className="w-full py-4 sm:py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors text-base sm:text-sm">View Scores</button>
            </div>
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
                  className="w-full px-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-blue-600 outline-none mb-6 font-bold"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCreateClassModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-colors"
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
                    className="py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2 hover:scale-105"
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
      </div>
    );
  }

  if (view === "create-assignment" && selectedClass) {
    return (
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900">← Back to Dashboard</button>
          <div className="bg-white rounded-[40px] shadow-xl p-10">
            <h2 className="text-3xl font-black mb-2 text-stone-900">Assign to {selectedClass.name}</h2>
            <p className="text-stone-500 mb-8">Select a level or upload your own list.</p>

            <div className="space-y-4 mb-8">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Assignment Title"
                  list="assignment-titles"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-stone-200"
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
                    className={`w-full p-4 rounded-2xl border ${assignmentDeadline && assignmentDeadline < new Date().toISOString().split('T')[0] ? 'border-red-500' : 'border-stone-200'}`}
                  />
                  {assignmentDeadline && assignmentDeadline < new Date().toISOString().split('T')[0] && (
                    <p className="text-red-500 text-sm font-bold ml-2">Warning: Deadline is in the past!</p>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-stone-700">Allowed Game Modes:</p>
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
                  {(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAssignmentModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])}
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap ${assignmentModes.includes(mode) ? "bg-blue-700 text-white shadow-md" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Paste Box - NEW */}
            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border-2 border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📋</span>
                <h3 className="font-bold text-blue-900">Quick Paste</h3>
                <span className="text-xs text-blue-600 ml-auto">Paste from PDF, Word, email...</span>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your word list here...

Example formats:
• apple, banana, orange
• One word per line
• Separated by commas or semicolons"
                className="w-full p-3 rounded-xl border border-blue-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-blue-600">
                  {pastedText.trim() && "✓ Text ready to extract"}
                </span>
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Extract Words
                </button>
              </div>
            </div>

            <div className="flex flex-nowrap gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2">
              {(["Band 2", "Custom"] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-bold transition-all text-xs sm:text-sm whitespace-nowrap ${selectedLevel === level ? "bg-blue-700 text-white shadow-lg shadow-blue-100" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
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
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                )}
              </label>
            </div>

            {/* Quick Search */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="🔍 Search words..."
                value={wordSearchQuery}
                onChange={(e) => setWordSearchQuery(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Quick Category Filters - Only show when search or filters active */}
            {(wordSearchQuery || selectedCore || selectedPos || selectedRecProd) && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* Core Filter */}
                  <select
                    value={selectedCore}
                    onChange={(e) => setSelectedCore(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">All Core</option>
                    <option value="Core I">Core I</option>
                    <option value="Core II">Core II</option>
                  </select>

                  {/* Part of Speech Filter */}
                  <select
                    value={selectedPos}
                    onChange={(e) => setSelectedPos(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                    onChange={(e) => setSelectedRecProd(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[300px] overflow-y-auto p-3 bg-stone-50 rounded-2xl border-2 border-stone-100">
              {currentLevelWords.map(word => {
                const isSelected = selectedWordsSet.has(word.id);
                return (
                  <button
                    key={word.id}
                    onClick={() => toggleWordSelection(word.id)}
                    className={`p-3 rounded-xl text-left flex justify-between items-center transition-all ${isSelected ? "bg-blue-600 text-white shadow-md" : "bg-white hover:bg-stone-100 border border-stone-200"}`}
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

            {/* Selection Summary */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-stone-200">
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
                        className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-bold hover:bg-stone-300 transition-all"
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
      </div>
    );
  }

  if (view === "game" && showModeSelection) {
    const modes = [
      { id: "classic", name: "Classic Mode", desc: "See the word, hear the word, pick translation.", color: "emerald", icon: <BookOpen size={24} /> },
      { id: "listening", name: "Listening Mode", desc: "Only hear the word. No English text!", color: "blue", icon: <Volume2 size={24} /> },
      { id: "spelling", name: "Spelling Mode", desc: "Type the English word. Hardest mode!", color: "purple", icon: <PenTool size={24} /> },
      { id: "matching", name: "Matching Mode", desc: "Match Hebrew to English. Fun & fast!", color: "amber", icon: <Zap size={24} /> },
      { id: "true-false", name: "True/False", desc: "Is the translation correct? Quick thinking!", color: "rose", icon: <CheckCircle2 size={24} /> },
      { id: "flashcards", name: "Flashcards", desc: "Review words at your own pace. No pressure.", color: "cyan", icon: <Layers size={24} /> },
      { id: "scramble", name: "Word Scramble", desc: "Unscramble the letters to find the word.", color: "indigo", icon: <Shuffle size={24} /> },
      { id: "reverse", name: "Reverse Mode", desc: "See Hebrew/Arabic, pick the English word.", color: "fuchsia", icon: <Repeat size={24} /> },
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
          <button onClick={handleExitGame} className="absolute top-4 right-4 sm:top-10 sm:right-10 text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 p-3 rounded-full hover:rotate-90 transition-all duration-300">
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
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, translateY: -8 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setGameMode(mode.id as any); setShowModeSelection(false); }}
                  className={`p-8 rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl active:shadow-xl active:scale-95`}
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
    const sortedLeaderboard = (Object.values(leaderboard) as { name: string, score: number }[]).sort((a, b) => b.score - a.score);
    
    return (
      <div className="min-h-screen bg-blue-600 p-6 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black">Live Challenge: {selectedClass.name}</h1>
              <p className="text-blue-100 font-bold mt-2 text-sm sm:text-base">Students join with code: <span className="bg-white text-blue-600 px-3 py-1 rounded-lg font-mono ml-2">{selectedClass.code}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-400" : "bg-red-400 animate-pulse"}`} />
                <span className="text-blue-100">{socketConnected ? "Live" : "Reconnecting..."}</span>
              </div>
              <button onClick={() => { setView("teacher-dashboard"); setIsLiveChallenge(false); }} className="bg-white/20 hover:bg-white/30 px-4 sm:px-6 py-2 rounded-full font-bold transition-colors text-sm sm:text-base">End Challenge</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-[40px] p-8 backdrop-blur-md border border-white/20">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><Trophy /> Leaderboard</h2>
              <div className="space-y-4">
                {sortedLeaderboard.map((entry, idx) => (
                  <motion.div 
                    key={`${entry.name}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex justify-between items-center p-4 bg-white/10 rounded-2xl border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx === 0 ? "bg-yellow-400 text-stone-900" : "bg-white/20"}`}>{idx + 1}</span>
                      <span className="font-bold text-xl">{entry.name}</span>
                    </div>
                    <span className="text-2xl font-black">{entry.score}</span>
                  </motion.div>
                ))}
                {sortedLeaderboard.length === 0 && <p className="text-blue-200 italic">Waiting for students to join...</p>}
              </div>
            </div>

            <div className="flex flex-col justify-center items-center text-center p-8">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <RefreshCw size={64} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Live Competition Active</h3>
              <p className="text-blue-100">Students see their rank in real-time as they play!</p>
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
          <button onClick={() => setView("landing")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900">← Back</button>
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
            <button onClick={() => setView("teacher-dashboard")} className="text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 text-base sm:text-sm">← Back</button>
            <h1 className="text-xl sm:text-3xl font-black text-stone-900">Student Performance Matrix</h1>
            <button
              onClick={() => setAllScores(TEST_ANALYTICS_DATA)}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-sm sm:text-sm"
            >
              Load Test Data
            </button>
          </div>

          {allScores.length === 0 ? (
            <div className="bg-white p-8 rounded-[32px] sm:rounded-[40px] shadow-xl text-center">
              <p className="text-stone-400 italic mb-4 text-base sm:text-sm">No student data yet. Analytics will appear once students complete assignments.</p>
              <button
                onClick={() => {
                  console.log("Loading test data...", TEST_ANALYTICS_DATA.length);
                  console.log("Sample data:", TEST_ANALYTICS_DATA[0]);
                  setAllScores(TEST_ANALYTICS_DATA);
                  console.log("Data loaded, allScores length:", TEST_ANALYTICS_DATA.length);
                }}
                className="px-6 py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors text-base sm:text-sm"
              >
                Load Test Data
              </button>
              <div className="mt-4 p-4 bg-stone-100 rounded text-left text-sm">
                <p className="font-bold">Debug Info:</p>
                <p>allScores.length: {allScores.length}</p>
                <p>matrixData.students: {matrixData.students.length}</p>
                <p>matrixData.assignments: {matrixData.assignments.length}</p>
              </div>
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
                    return (
                      <tr key={student} className="border-t border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-3 font-bold text-stone-800 sticky left-0 bg-white hover:bg-stone-50">
                          {student}
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
                  <button onClick={() => setSelectedScore(null)} className="text-stone-400 hover:text-stone-600">
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
            </>
          )}
        </div>
      </div>
    );
  }
  if (view === "gradebook") {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 text-base sm:text-sm">← Back to Dashboard</button>
          <div className="bg-white rounded-[28px] sm:rounded-3xl shadow-xl p-5 sm:p-8">
            <h2 className="text-2xl font-black mb-6">Student Gradebook</h2>
            {allScores.length === 0 ? <p className="text-stone-400 italic text-base sm:text-sm">No scores recorded yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-400 uppercase text-xs">Student</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-400 uppercase text-xs">Class</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-400 uppercase text-xs">Mode</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-400 uppercase text-xs">Score</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-400 uppercase text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScores.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map(s => (
                      <tr key={s.id} className="border-b border-stone-50">
                        <td className="py-3 px-3 sm:py-4 sm:px-4 font-bold text-stone-800 text-base sm:text-sm">{s.studentName}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-stone-500 text-base sm:text-sm">{s.classCode}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4"><span className="px-2 py-1 bg-stone-100 rounded text-xs font-bold uppercase">{s.mode}</span></td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 font-black text-blue-700 text-base sm:text-sm">{s.score}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-stone-400 text-sm sm:text-sm">{new Date(s.completedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      {saveError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-1 hover:opacity-75"><X size={16} /></button>
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
                console.log(`Rendering item: ${item.text}, key: ${key}`);
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
              <div className="absolute top-0 left-0 h-2 bg-blue-600 transition-all duration-500" style={{ width: `${((currentIndex + 1) / gameWords.length) * 100}%` }} />

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
                  <button onClick={() => speak(currentWord?.english)} className="p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
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
        <div className="bg-white rounded-3xl shadow-md p-6 border border-stone-100 sticky top-6">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> Live Rank</h3>
          <div className="space-y-3">
            {(Object.values(leaderboard) as { name: string, score: number }[])
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((entry, idx) => (
                <div key={`${entry.name}-${idx}`} className={`flex justify-between items-center p-2 rounded-xl ${entry.name === user?.displayName ? "bg-blue-50 border border-blue-100" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-400 w-4">{idx + 1}</span>
                    <span className={`text-sm font-bold ${entry.name === user?.displayName ? "text-blue-700" : "text-stone-600"}`}>{entry.name}</span>
                  </div>
                  <span className="text-sm font-black text-stone-900">{entry.score}</span>
                </div>
              ))}
            {Object.values(leaderboard).length === 0 && <p className="text-xs text-stone-400 italic">No other players yet.</p>}
          </div>
        </div>
      </div>
    </div>

    {gameMode !== "matching" && (
      <div className="w-full max-w-5xl mt-12 flex justify-center">
        <div className="w-full max-w-md">
          <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((currentIndex + 1) / gameWords.length) * 100}%` }} />
          </div>
          <p className="text-center text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Word {currentIndex + 1} of {gameWords.length}</p>
        </div>
      </div>
    )}
  </div>
);
}
