import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Repeat
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { io, Socket } from "socket.io-client";
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, signInAnonymously, orderBy, limit, deleteDoc, getDocWrapped, setDocWrapped, getDocsWrapped, addDocWrapped, deleteDocWrapped, OperationType, handleFirestoreError } from "./firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import Tesseract from 'tesseract.js';

// --- TYPES ---
interface AppUser {
  uid: string;
  email?: string;
  role: "teacher" | "student";
  displayName: string;
  classCode?: string;
  avatar?: string;
  badges?: string[];
}

interface ClassData {
  id: string;
  name: string;
  code: string;
  teacherUid: string;
}

interface AssignmentData {
  id: string;
  classId: string;
  wordIds: number[];
  words?: Word[];
  title: string;
  deadline?: string;
  allowedModes?: string[];
}

interface ProgressData {
  id: string;
  studentName: string;
  studentUid?: string;
  assignmentId: string;
  classCode: string;
  score: number;
  mode: string;
  completedAt: string;
  mistakes?: number[]; // Array of word IDs that were missed
  avatar?: string;
}


function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "game" | "teacher-dashboard" | "student-dashboard" | "create-assignment" | "gradebook" | "live-challenge" | "analytics" | "global-leaderboard" | "students">("landing");
  const [landingTab, setLandingTab] = useState<"student" | "teacher">("student");
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createdClassCode, setCreatedClassCode] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);

  const [studentAvatar, setStudentAvatar] = useState("🦊");
  const AVATARS = ["🦊", "🦁", "🐯", "🐨", "🐼", "🐸", "🐵", "🦄"];

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
        auth.currentUser?.getIdToken().then(token => {
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUser;
          setUser(userData);
          if (userData.role === "teacher") {
            fetchTeacherData(firebaseUser.uid);
            setView("teacher-dashboard");
          }
          // For students, don't change view - handleStudentLogin will do that
        } else {
          // Only auto-create teacher account for Google sign-ins (not anonymous)
          const isGoogleSignIn = firebaseUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleSignIn) {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "teacher",
              displayName: firebaseUser.displayName || "Teacher",
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setUser(newUser);
            setView("teacher-dashboard");
          }
          // For anonymous users (students), don't create doc here - handleStudentLogin will do it
        }
      } else {
        setUser(null);
        setView("landing");
      }
      setLoading(false);
    });
    return unsubscribe;
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
          await addDoc(collection(db, "progress"), progress);
          localStorage.removeItem(key);
        } catch {
          // Still offline — will retry on next load
        }
      }
    };
    retryPending();
  }, []);

  const fetchTeacherData = async (uid: string) => {
    const q = query(collection(db, "classes"), where("teacherUid", "==", uid));
    const querySnapshot = await getDocs(q);
    const classesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
    setClasses(classesList);
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
      const docRef = await addDoc(collection(db, "classes"), newClass);
      setClasses([...classes, { id: docRef.id, ...newClass }]);
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

  const currentLevelWords = useMemo(() => {
    if (selectedLevel === "Band 2") return BAND_2_WORDS;
  
    return customWords;
  }, [selectedLevel, customWords]);
  const handleSaveAssignment = async () => {
    if (!selectedClass || selectedWords.length === 0 || !assignmentTitle) {
      alert("Please enter a title and select words.");
      return;
    }

    const allPossibleWords = [...ALL_WORDS, ...customWords];
    const uniqueWords = Array.from(new Map(allPossibleWords.map(w => [w.id, w])).values());
    const wordsToSave = uniqueWords.filter(w => selectedWords.includes(w.id));
    
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
      await addDoc(collection(db, "assignments"), newAssignment);
      alert("Assignment created successfully!");
      setView("teacher-dashboard");
      setSelectedWords([]);
      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentModes(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "assignments");
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
    const wordsToPreview = uniqueWords.filter(w => selectedWords.includes(w.id));

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
      await deleteDoc(doc(db, "classes", classId));
      setClasses(prev => prev.filter(c => c.id !== classId));
      alert("Class deleted successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${classId}`);
    }
  };

  const handleStudentLogin = async (code: string, name: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    // FIRST: Sign in anonymously to get auth permissions for Firestore queries
    let studentUid = "anonymous-student-" + Date.now();
    try {
      const authResult = await signInAnonymously(auth);
      studentUid = authResult.user.uid;
    } catch (e) {
      console.error("Anonymous auth failed:", e);
      let errorMsg = "Login failed: " + (e instanceof Error ? e.message : String(e));
      try {
        const parsed = JSON.parse(e instanceof Error ? e.message : String(e));
        if (parsed.error) {
          errorMsg = `Login failed: ${parsed.error} (Path: ${parsed.path}, Operation: ${parsed.operationType})`;
        }
      } catch (jsonErr) {
        // Not a JSON error, keep original message
      }
      setError(errorMsg);
      setLoading(false);
      return;
    }

    if (!auth.currentUser) {
      console.error("User not authenticated after signInAnonymously");
      setError("Login failed: User not authenticated");
      setLoading(false);
      return;
    }

    // NOW we can query Firestore with auth
    try {
      const q = query(collection(db, "classes"), where("code", "==", code));
      const classSnap = await getDocs(q);

      if (classSnap.empty) {
        setError("Invalid Class Code!");
        setLoading(false);
        return;
      }

      const classData = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() } as ClassData;
      const aq = query(collection(db, "assignments"), where("classId", "==", classData.id));
      const assignSnap = await getDocs(aq);

      if (assignSnap.empty) {
        setError("No assignments found for this class yet!");
        setLoading(false);
        return;
      }

      const assignments = assignSnap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentData));

      // Use Anonymous Auth for students to allow secure writes.
      // Reuse an existing anonymous session to avoid the 300 accounts/hour rate limit.
      let studentUid: string;
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        studentUid = auth.currentUser.uid;
      } else {
        try {
          const authResult = await signInAnonymously(auth);
          studentUid = authResult.user.uid;
          localStorage.setItem("vocaband_anon_uid", studentUid);
        } catch (e) {
          console.error("Anonymous auth failed:", e);
          let errorMsg = "Login failed: " + (e instanceof Error ? e.message : String(e));
          try {
            const parsed = JSON.parse(e instanceof Error ? e.message : String(e));
            if (parsed.error) {
              errorMsg = `Login failed: ${parsed.error} (Path: ${parsed.path}, Operation: ${parsed.operationType})`;
            }
          } catch (jsonErr) {
            // Not a JSON error, keep original message
          }
          setError(errorMsg);
          setLoading(false);
          return;
        }
      }

      if (!auth.currentUser) {
        console.error("User not authenticated after signInAnonymously");
        setError("Login failed: User not authenticated");
        setLoading(false);
        return;
      }

      let userDoc;
      try {
        userDoc = await getDocWrapped(doc(db, "users", studentUid), "users/" + studentUid);
      } catch (e) {
        throw new Error("Login failed: " + (e instanceof Error ? e.message : String(e)));
      }
      
      let userData: AppUser;
      if (userDoc && userDoc.exists()) {
        userData = userDoc.data() as AppUser;
      } else {
        userData = {
          uid: studentUid,
          role: "student",
          displayName: name,
          classCode: code,
          avatar: studentAvatar,
          badges: []
        };
        try {
          await setDocWrapped(doc(db, "users", studentUid), userData, "users/" + studentUid);
        } catch (e) {
          throw new Error("Login failed: " + (e instanceof Error ? e.message : String(e)));
        }
      }

      const pq = query(collection(db, "progress"), where("classCode", "==", code), where("studentName", "==", name));
      let progSnap;
      try {
        progSnap = await getDocsWrapped(pq, "progress");
      } catch (e) {
        throw new Error("Login failed: " + (e instanceof Error ? e.message : String(e)));
      }
      const progress = progSnap ? progSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProgressData)) : [];
      
      setStudentAssignments(assignments);
      setStudentProgress(progress);
      setUser(userData);
      setBadges(userData.badges || []);
      
      // Join Live Challenge
      if (socket) {
        const token = await auth.currentUser?.getIdToken() ?? "";
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
      await setDoc(doc(db, "users", user.uid), { ...user, badges: newBadges }, { merge: true });
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
    const allDocs: any[] = [];

    for (const chunk of chunks) {
      const q = query(collection(db, "progress"), where("classCode", "in", chunk), limit(5000));
      const snap = await getDocs(q);
      allDocs.push(...snap.docs.map(d => d.data()));
    }

    const studentMap: Record<string, {name: string, classCode: string, lastActive: string}> = {};
    allDocs.forEach(data => {
      const key = `${data.studentName}-${data.classCode}`;
      if (!studentMap[key] || new Date(data.completedAt) > new Date(studentMap[key].lastActive)) {
        studentMap[key] = {
          name: data.studentName,
          classCode: data.classCode,
          lastActive: data.completedAt
        };
      }
    });

    setClassStudents(Object.values(studentMap));
  };
  const fetchGlobalLeaderboard = async () => {
    const q = query(collection(db, "progress"), orderBy("score", "desc"), limit(10));
    const snap = await getDocs(q);
    const scores = snap.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.studentName,
        score: data.score,
        avatar: data.avatar || "🦊"
      };
    });
    setGlobalLeaderboard(scores);
  };
  const fetchScores = async () => {
    if (!user || user.role !== "teacher") return;

    if (classes.length === 0) {
      setAllScores([]);
      setView("gradebook");
      return;
    }

    const codes = classes.map(c => c.code);
    const chunks = chunkArray(codes, 30);
    const allDocs: { id: string; [key: string]: unknown }[] = [];

    for (const chunk of chunks) {
      const q = query(
        collection(db, "progress"),
        where("classCode", "in", chunk),
        orderBy("completedAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      allDocs.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    setAllScores(allDocs as unknown as ProgressData[]);
    setView("gradebook");
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
      // Dedup: check for existing progress for this assignment+mode
      const existingQ = query(
        collection(db, "progress"),
        where("assignmentId", "==", activeAssignment.id),
        where("mode", "==", gameMode),
        where("studentName", "==", user.displayName),
        where("classCode", "==", user.classCode || "")
      );
      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingData = existingDoc.data();
        if (score > existingData.score) {
          await setDoc(existingDoc.ref, progress);
          setStudentProgress(prev =>
            prev.map(p => p.id === existingDoc.id ? { id: existingDoc.id, ...progress } : p)
          );
        }
      } else {
        const docRef = await addDoc(collection(db, "progress"), progress);
        setStudentProgress(prev => [...prev, { id: docRef.id, ...progress }]);
      }

      // Clear any queued retry for this assignment+mode
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.removeItem(retryKey);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error("Error saving score:", error);
      // Queue for retry on next load
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.setItem(retryKey, JSON.stringify(progress));
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <RefreshCw className="animate-spin text-emerald-600" size={48} />
    </div>;
  }

  if (view === "landing" && !user) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
          <div className="bg-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <GraduationCap size={48} />
            </div>
            <h1 className="text-3xl font-black mb-1">Vocaband</h1>
            <p className="text-emerald-100 font-bold">based on the Israeli English curriculum - band 2 vocabulary</p>
          </div>

          <div className="p-8">
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setLandingTab("student")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${landingTab === "student" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                Student
              </button>
              <button 
                onClick={() => setLandingTab("teacher")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${landingTab === "teacher" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
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
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    <div className="relative">
                      <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Class Code" 
                        id="class-code" 
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-emerald-500 outline-none transition-colors font-bold text-lg" 
                      />
                    </div>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Your Name" 
                        id="student-name" 
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-emerald-500 outline-none transition-colors font-bold text-lg" 
                      />
                    </div>
                    
                    <div className="bg-stone-50 p-4 rounded-2xl">
                      <p className="text-xs font-black text-stone-400 uppercase mb-3 tracking-widest">Choose Avatar</p>
                      <div className="flex flex-wrap gap-2">
                        {AVATARS.map(a => (
                          <button 
                            key={a}
                            onClick={() => setStudentAvatar(a)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${studentAvatar === a ? "bg-emerald-500 shadow-lg scale-110" : "bg-white hover:bg-stone-100"}`}
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
                      className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Join Class
                    </button>
                    {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
                    
                    <button 
                      onClick={() => { fetchGlobalLeaderboard(); setView("global-leaderboard"); }}
                      className="w-full flex items-center justify-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors text-sm"
                    >
                      <Trophy size={16} /> View Global Leaderboard
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="teacher"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 text-center"
                >
                  <p className="text-stone-500 font-medium">Manage your classes, create assignments, and track student progress.</p>
                  <button 
                    onClick={() => signInWithPopup(auth, googleProvider).catch((err) => {
                      if (err?.code !== "auth/popup-closed-by-user") {
                        console.error("Google sign-in error:", err);
                        setError("Sign-in failed. Please allow popups and try again.");
                      }
                    })}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-100 py-5 rounded-2xl font-black text-stone-700 hover:bg-stone-50 transition-all active:scale-95 shadow-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
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
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                {user.avatar}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Hello, {user.displayName}!</h1>
                <p className="text-stone-500 font-bold">Class Code: <span className="text-emerald-600">{user.classCode}</span></p>
                {badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {badges.map(badge => (
                      <div key={badge} className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                        <Trophy size={14} />
                        {badge}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => { setUser(null); setView("landing"); }} className="text-stone-500 font-bold hover:text-red-500">Logout</button>
          </div>

          {studentAssignments.length > 0 && (
            <div className="bg-white p-6 rounded-[32px] shadow-sm mb-8">
              <h3 className="text-lg font-bold text-stone-800 mb-2">Overall Progress</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000"
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
                <span className="font-bold text-stone-500">
                  {studentAssignments.filter(a => {
                    const allowedModes = a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];
                    const completedModes = new Set(
                      studentProgress.filter(p => p.assignmentId === a.id).map(p => p.mode)
                    ).size;
                    return completedModes >= allowedModes.length;
                  }).length} / {studentAssignments.length} Assignments
                </span>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[40px] shadow-xl">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><BookOpen className="text-emerald-600" /> Your Assignments</h2>
            
            {studentAssignments.length === 0 ? (
              <p className="text-stone-400 italic text-center py-8">No assignments yet. Check back later!</p>
            ) : (
              <div className="space-y-4">
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
                    <div key={assignment.id} className="bg-stone-50 p-6 rounded-3xl border-2 border-stone-100 hover:border-emerald-200 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-stone-800">{assignment.title}</h3>
                          <p className="text-stone-500 text-sm font-medium mt-1">
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
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                        >
                          {isComplete ? "Play Again" : "Start Learning"}
                        </button>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-stone-500 uppercase tracking-widest">Progress</span>
                          <span className={isComplete ? "text-emerald-600" : "text-stone-500"}>
                            {completedModes} / {totalModes} Modes ({progressPercentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
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
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-stone-900">Teacher Dashboard</h1>
            <button onClick={() => signOut(auth)} className="text-stone-500 font-bold hover:text-red-500">Logout</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-emerald-600" /> My Classes</h2>
                <button onClick={() => setShowCreateClassModal(true)} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><Plus size={20} /></button>
              </div>
              {classes.length === 0 ? <p className="text-stone-400 italic">No classes yet. Create one to get a code!</p> : (
                <div className="space-y-3">
                  {classes.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                      <div>
                        <p className="font-bold text-stone-800">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">CODE: {c.code}</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(c.code);
                              console.log("Class code copied to clipboard!");
                            }}
                            className="text-xs text-stone-500 hover:text-emerald-600 transition-colors"
                            title="Copy Code"
                          >
                            Copy
                          </button>
                          <a 
                            href={`https://wa.me/?text=Join%20my%20class%20on%20Vocaband!%20The%20class%20code%20is:%20${c.code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-stone-500 hover:text-green-500 transition-colors"
                            title="Share on WhatsApp"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => { setSelectedClass(c); setView("create-assignment"); }} className="text-emerald-600 font-bold text-sm hover:underline">Assign Words</button>
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
            
            <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <RefreshCw className="text-blue-600 mb-4" size={48} />
              <h2 className="text-xl font-bold mb-2">Live Challenge</h2>
              <p className="text-stone-500 mb-6">Start a real-time competition for your class.</p>
              <button onClick={() => { 
                if (classes.length === 0) alert("Create a class first!");
                else {
                  setSelectedClass(classes[0]);
                  setView("live-challenge");
                  setIsLiveChallenge(true);
                  if (socket) {
                    auth.currentUser?.getIdToken().then(token => {
                      socket.emit("join-challenge", { classCode: classes[0].code, name: user?.displayName || "Teacher", uid: user?.uid || "", token });
                    });
                  }
                }
              }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Start Challenge</button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <BarChart3 className="text-purple-600 mb-4" size={48} />
              <h2 className="text-xl font-bold mb-2">Analytics</h2>
              <p className="text-stone-500 mb-6">Deep dive into class performance and difficulty.</p>
              <button onClick={() => { fetchScores(); setView("analytics"); }} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors">View Insights</button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <UserCircle className="text-orange-600 mb-4" size={48} />
              <h2 className="text-xl font-bold mb-2">Students</h2>
              <p className="text-stone-500 mb-6">Manage and view all students in your classes.</p>
              <button onClick={() => { fetchStudents(); setView("students"); }} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors">View Students</button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col items-center justify-center text-center">
              <Trophy className="text-emerald-600 mb-4" size={48} />
              <h2 className="text-xl font-bold mb-2">Gradebook</h2>
              <p className="text-stone-500 mb-6">Track your students' progress and scores.</p>
              <button onClick={fetchScores} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">View Scores</button>
            </div>
          </div>
        </div>

        {/* Create Class Modal */}
        <AnimatePresence>
          {showCreateClassModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
              >
                <h2 className="text-2xl font-black mb-2">Create New Class</h2>
                <p className="text-stone-500 mb-6">Enter a name for your class (e.g. Grade 8-B)</p>
                <input 
                  autoFocus
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Class Name"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-emerald-500 outline-none mb-6 font-bold"
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
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
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
                className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2">Class Created!</h2>
                <p className="text-stone-500 mb-6">Share this code with your students so they can join.</p>
                
                <div className="bg-stone-50 p-6 rounded-2xl border-2 border-stone-100 mb-6">
                  <p className="text-4xl font-mono font-black text-emerald-600 tracking-widest">{createdClassCode}</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(createdClassCode);
                      console.log("Class code copied to clipboard!");
                    }}
                    className="w-full py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
                  >
                    Copy Code
                  </button>
                  <a 
                    href={`https://wa.me/?text=Join%20my%20class%20on%20Vocaband!%20The%20class%20code%20is:%20${createdClassCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
                  >
                    Share on WhatsApp
                  </a>
                  <button 
                    onClick={() => setCreatedClassCode(null)}
                    className="w-full py-4 mt-2 text-stone-500 font-bold hover:text-stone-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
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
                  value={assignmentTitle} 
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-stone-200"
                />
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
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {assignmentModes.length === 8 ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setAssignmentModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])}
                      className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-95 ${assignmentModes.includes(mode) ? "bg-emerald-600 text-white shadow-md" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {(["Band 2", "Custom"] as const).map(level => (
                <button 
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${selectedLevel === level ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                >
                  {level}
                </button>
              ))}
              <label className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl font-bold cursor-pointer hover:bg-black transition-all">
                <Upload size={18} />
                Upload CSV
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
              
              <label className={`flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-bold cursor-pointer transition-all relative overflow-hidden ${isOcrProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <Camera size={18} />
                {isOcrProcessing ? `Scanning... ${ocrProgress}%` : "Scan Page (OCR)"}
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

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-700">Words ({currentLevelWords.length})</h3>
              <button 
                onClick={() => {
                  if (selectedWords.length === currentLevelWords.length) {
                    setSelectedWords([]);
                  } else {
                    setSelectedWords(currentLevelWords.map(w => w.id));
                  }
                }}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
              >
                {selectedWords.length === currentLevelWords.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 max-h-[400px] overflow-y-auto p-4 border-2 border-stone-50 rounded-[32px] bg-stone-50/50">
              {currentLevelWords.map(word => (
                <motion.button 
                  key={word.id} 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (selectedWords.includes(word.id)) {
                      setSelectedWords(selectedWords.filter(id => id !== word.id));
                    } else {
                      setSelectedWords([...selectedWords, word.id]);
                    }
                  }} 
                  className={`p-4 rounded-2xl text-left flex justify-between items-center transition-all ${selectedWords.includes(word.id) ? "bg-white border-2 border-emerald-500 shadow-lg" : "bg-white border-2 border-transparent hover:border-stone-200"}`}
                >
                  <div>
                    <p className="font-black text-stone-900">{word.english}</p>
                    <p className="text-xs text-stone-400 font-bold uppercase">{word.hebrew} | {word.arabic}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedWords.includes(word.id) ? "bg-emerald-500 scale-110" : "bg-stone-100"}`}>
                    {selectedWords.includes(word.id) ? <CheckCircle2 size={14} className="text-white" /> : <div className="w-2 h-2 bg-stone-300 rounded-full" />}
                  </div>
                </motion.button>
              ))}
              {currentLevelWords.length === 0 && <p className="col-span-full text-center py-12 text-stone-400 italic">No words found in this level.</p>}
            </div>

            <div className="flex gap-4">
              <button
                disabled={selectedWords.length === 0}
                onClick={handlePreviewAssignment}
                className="flex-1 py-5 bg-stone-200 text-stone-700 rounded-2xl font-black text-xl hover:bg-stone-300 transition-all active:scale-95 disabled:opacity-50"
              >
                👁️ Preview
              </button>
              <button
                disabled={selectedWords.length === 0 || !assignmentTitle}
                onClick={handleSaveAssignment}
                className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:shadow-none hover:bg-emerald-700 transition-all active:scale-95"
              >
                Create Assignment ({selectedWords.length} Words)
              </button>
            </div>
          </div>
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
      emerald: "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-700",
      blue: "bg-blue-50 border-blue-100 hover:bg-blue-100 text-blue-700",
      purple: "bg-purple-50 border-purple-100 hover:bg-purple-100 text-purple-700",
      amber: "bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700",
      rose: "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700",
      cyan: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100 text-cyan-700",
      indigo: "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700",
      fuchsia: "bg-fuchsia-50 border-fuchsia-100 hover:bg-fuchsia-100 text-fuchsia-700",
    };

    const iconColorClasses: Record<string, string> = {
      emerald: "text-emerald-600",
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
          <div className="absolute top-0 left-0 w-full h-3 bg-emerald-500" />
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
                  className={`p-8 rounded-[40px] text-center transition-all border-2 border-transparent flex flex-col items-center ${colorClasses[mode.color]} group relative shadow-sm hover:shadow-xl`}
                >
                  <div className={`w-16 h-16 rounded-[24px] bg-white flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-all ${iconColorClasses[mode.color]} relative`}>
                    {mode.icon}
                    {isCompleted && (
                      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
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
                    <p className="text-2xl font-black text-emerald-600">{entry.score}</p>
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
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900">← Back to Dashboard</button>
          <div className="bg-white rounded-[40px] shadow-xl p-6 sm:p-10">
            <h2 className="text-3xl font-black mb-6 text-stone-900">Class Students</h2>
            <div className="overflow-hidden rounded-3xl border border-stone-100">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="py-4 px-6 font-bold text-stone-400 uppercase text-xs">Student Name</th>
                    <th className="py-4 px-6 font-bold text-stone-400 uppercase text-xs">Class Code</th>
                    <th className="py-4 px-6 font-bold text-stone-400 uppercase text-xs">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => (
                    <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-stone-800">{s.name}</td>
                      <td className="py-4 px-6 text-stone-500">{s.classCode}</td>
                      <td className="py-4 px-6 text-stone-400 text-sm">{new Date(s.lastActive).toLocaleString()}</td>
                    </tr>
                  ))}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-stone-400 italic">No students found for your classes.</td>
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

  if (view === "analytics" && analyticsData) {
    return (
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setView("teacher-dashboard")} className="text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900">← Back</button>
            <h1 className="text-xl sm:text-3xl font-black text-stone-900">Class Insights</h1>
            <div className="w-12 sm:w-24"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Progress Chart */}
            <div className="bg-white p-4 sm:p-8 rounded-[40px] shadow-xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2"><TrendingUp className="text-blue-600" /> Average Score Trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.progress}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mode Performance */}
            <div className="bg-white p-4 sm:p-8 rounded-[40px] shadow-xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2"><LayoutGrid className="text-emerald-600" /> Performance by Mode</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.modes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="mode" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="avg" radius={[10, 10, 0, 0]}>
                      {analyticsData.modes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Difficulty Heatmap */}
          <div className="bg-white p-4 sm:p-8 rounded-[40px] shadow-xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2"><AlertTriangle className="text-rose-600" /> Difficulty Heatmap (Most Missed Words)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analyticsData.heatmap.map((item, idx) => (
                <div key={`${item.word}-${idx}`} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl">
                    {item.count} MISSES
                  </div>
                  <p className="text-lg font-black text-stone-900">{item.word}</p>
                  <p className="text-xs text-stone-400 font-bold uppercase mt-1">Difficulty: {item.count > 5 ? 'High' : 'Medium'}</p>
                </div>
              ))}
              {analyticsData.heatmap.length === 0 && <p className="col-span-full text-center text-stone-400 italic py-12">No mistakes recorded yet. Keep playing!</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (view === "gradebook") {
    return (
      <div className="min-h-screen bg-stone-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setView("teacher-dashboard")} className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900">← Back to Dashboard</button>
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-black mb-6">Student Gradebook</h2>
            {allScores.length === 0 ? <p className="text-stone-400 italic">No scores recorded yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="py-4 font-bold text-stone-400 uppercase text-xs">Student</th>
                      <th className="py-4 font-bold text-stone-400 uppercase text-xs">Class</th>
                      <th className="py-4 font-bold text-stone-400 uppercase text-xs">Mode</th>
                      <th className="py-4 font-bold text-stone-400 uppercase text-xs">Score</th>
                      <th className="py-4 font-bold text-stone-400 uppercase text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScores.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map(s => (
                      <tr key={s.id} className="border-b border-stone-50">
                        <td className="py-4 font-bold text-stone-800">{s.studentName}</td>
                        <td className="py-4 text-stone-500">{s.classCode}</td>
                        <td className="py-4"><span className="px-2 py-1 bg-stone-100 rounded text-xs font-bold uppercase">{s.mode}</span></td>
                        <td className="py-4 font-black text-emerald-600">{s.score}</td>
                        <td className="py-4 text-stone-400 text-sm">{new Date(s.completedAt).toLocaleDateString()}</td>
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
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Trophy className="w-24 h-24 text-yellow-500 mb-4 mx-auto" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-2">Kol Hakavod, {user?.displayName}!</h1>
        <p className="text-xl mb-6">You finished the assignment.</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-lg">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex-1 text-center">
            <p className="text-sm uppercase tracking-widest text-stone-500 mb-1">Final Score</p>
            <p className="text-5xl sm:text-6xl font-black text-emerald-600">{score}</p>
          </div>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md flex-1 text-center">
            <p className="text-sm uppercase tracking-widest text-stone-500 mb-1">Total XP</p>
            <p className="text-5xl sm:text-6xl font-black text-blue-600">{xp}</p>
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
          <div className="bg-emerald-100 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-emerald-700 font-bold text-xs uppercase tracking-widest">XP: {xp}</span>
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
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
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
                  className={`p-6 rounded-2xl shadow-sm font-bold text-lg h-32 flex items-center justify-center transition-all duration-300 ${
                    matchedIds.includes(item.id) 
                      ? "bg-emerald-50 text-emerald-300 shadow-none" 
                      : selectedMatch?.id === item.id && selectedMatch?.type === item.type
                      ? "bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-200"
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
              className={`bg-white rounded-[40px] shadow-2xl p-6 sm:p-12 text-center relative overflow-hidden transition-colors duration-300 ${feedback === "correct" ? "bg-emerald-50 border-4 border-emerald-500" : feedback === "wrong" ? "bg-red-50 border-4 border-red-500" : "border-4 border-transparent"}`}
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 h-2 bg-emerald-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / gameWords.length) * 100}%` }} />

              <div className="mb-6 sm:mb-12">
                <span className="text-stone-300 font-black text-6xl sm:text-8xl opacity-20 absolute top-8 left-1/2 -translate-x-1/2">{currentIndex + 1}</span>
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
                  <h2 className={`text-4xl sm:text-6xl font-black text-stone-900 relative z-10 ${gameMode === "listening" ? "blur-xl select-none opacity-20" : ""}`}>
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
                          ? "bg-emerald-500 text-white scale-105 shadow-xl"
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
                    <button onClick={() => handleTFAnswer(true)} className="py-6 rounded-3xl text-2xl font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">True</button>
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
                    <button onClick={() => handleFlashcardAnswer(true)} className="py-4 rounded-3xl font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">Got It!</button>
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
                      feedback === "correct" ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
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
                <div key={`${entry.name}-${idx}`} className={`flex justify-between items-center p-2 rounded-xl ${entry.name === user?.displayName ? "bg-emerald-50 border border-emerald-100" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-400 w-4">{idx + 1}</span>
                    <span className={`text-sm font-bold ${entry.name === user?.displayName ? "text-emerald-700" : "text-stone-600"}`}>{entry.name}</span>
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
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / gameWords.length) * 100}%` }} />
          </div>
          <p className="text-center text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Word {currentIndex + 1} of {gameWords.length}</p>
        </div>
      </div>
    )}
  </div>
);
}
