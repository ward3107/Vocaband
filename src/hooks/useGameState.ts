import React, { useState, useEffect, useMemo, useRef } from "react";
import { ALL_WORDS, SET_2_WORDS, Word } from "../data/vocabulary";
import { shuffle, addUnique, removeKey } from "../utils";
import { SOCKET_EVENTS } from "../core/types";
import {
  MAX_ATTEMPTS_PER_WORD,
  AUTO_SKIP_DELAY_MS,
  SHOW_ANSWER_DELAY_MS,
  WRONG_FEEDBACK_DELAY_MS,
  FIRST_COMPLETION_BONUS,
  STREAK_XP_MULTIPLIER,
  type GameMode,
} from "../constants/game";
import {
  supabase,
  mapProgressToDb,
  type AppUser,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import { loadConfetti } from "../utils/lazyLoad";
import { useAudio } from "./useAudio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unbiased secure random integer in [0, max). */
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

// ---------------------------------------------------------------------------
// Hook params
// ---------------------------------------------------------------------------

export interface UseGameStateParams {
  view: string;
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: (v: string) => void;
  socket: any;
  assignmentWords: Word[];
  activeAssignment: AssignmentData | null;
  speakWord: (id?: number, english?: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  xp: number;
  setXp: (v: number) => void;
  streak: number;
  setStreak: (v: number) => void;
  awardBadge: (badge: string) => Promise<void>;
  badges: string[];
  setBadges: (v: string[]) => void;
  studentProgress: ProgressData[];
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  quickPlayActiveSession: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null;
  quickPlayCompletedModes: Set<string>;
  setQuickPlayCompletedModes: React.Dispatch<React.SetStateAction<Set<string>>>;
  isLiveChallenge: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameState(params: UseGameStateParams) {
  const {
    view,
    user,
    setUser,
    setView,
    socket,
    assignmentWords,
    activeAssignment,
    showToast,
    xp,
    setXp,
    streak,
    setStreak,
    awardBadge,
    setStudentProgress,
    quickPlayActiveSession,
    setQuickPlayCompletedModes,
  } = params;

  // Audio
  const {
    playMotivational: playMotivationalRaw,
    getMotivationalLabel,
    playWrong,
  } = useAudio();

  const isQuickPlayGuest = !!user?.isGuest;
  const playMotivational = (...args: Parameters<typeof playMotivationalRaw>): string => {
    if (isQuickPlayGuest) return "";
    return playMotivationalRaw(...args);
  };

  // -------------------------------------------------------------------------
  // Language preference (moved from App.tsx)
  // -------------------------------------------------------------------------
  const [targetLanguage, setTargetLanguage] = useState<"hebrew" | "arabic">(() => {
    try {
      return (localStorage.getItem("vocaband_target_lang") as "hebrew" | "arabic") || "hebrew";
    } catch {
      return "hebrew";
    }
  });
  const [hasChosenLanguage, setHasChosenLanguage] = useState(() => {
    try {
      return !!localStorage.getItem("vocaband_target_lang");
    } catch {
      return false;
    }
  });

  // -------------------------------------------------------------------------
  // Core game state
  // -------------------------------------------------------------------------
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [showModeIntro, setShowModeIntro] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "show-answer" | null>(null);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [wordAttempts, setWordAttempts] = useState<Record<number, number>>({});
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  // New modes state
  const [tfOption, setTfOption] = useState<Word | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Matching mode state
  const [matchingPairs, setMatchingPairs] = useState<{ id: number; text: string; type: "english" | "arabic" }[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{ id: number; type: "english" | "arabic" } | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);

  // Letter sounds mode state
  const [revealedLetters, setRevealedLetters] = useState(0);

  // Sentence builder mode state
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);

  // Reliability state
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Timeout ref for feedback cleanup
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cached voice ref for TTS consistency
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // -------------------------------------------------------------------------
  // Derived / computed values
  // -------------------------------------------------------------------------
  const gameWords = view === "game" && assignmentWords.length > 0 ? assignmentWords : SET_2_WORDS;
  const currentWord = gameWords[currentIndex];

  const options = useMemo(() => {
    if (!currentWord) return [];
    const correct = currentWord;

    let possibleDistractors = gameWords.filter((w) => w.id !== correct.id);

    if (possibleDistractors.length < 3) {
      const allPossibleWords = [...ALL_WORDS, ...gameWords];
      const uniqueOthers = Array.from(new Map(allPossibleWords.map((w) => [w.id, w])).values()).filter(
        (w) => w.id !== correct.id
      );
      possibleDistractors = uniqueOthers;
    }

    const shuffledOthers = shuffle(possibleDistractors).slice(0, 3);
    return shuffle([...shuffledOthers, correct]);
  }, [currentWord, gameWords]);

  const scrambledWord = useMemo(() => {
    if (!currentWord) return "";
    let scrambled = shuffle(currentWord.english.split("")).join("");
    while (scrambled === currentWord.english && currentWord.english.length > 1) {
      scrambled = shuffle(currentWord.english.split("")).join("");
    }
    return scrambled;
  }, [currentWord]);

  // -------------------------------------------------------------------------
  // Voice helpers
  // -------------------------------------------------------------------------
  const getVoice = () => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    const picked =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Natural") ||
            v.name.includes("Neural"))
      ) || voices.find((v) => v.lang.startsWith("en-US"));
    if (picked) cachedVoiceRef.current = picked;
    return picked ?? null;
  };

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

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Re-cache voice when voices load asynchronously
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const onVoicesChanged = () => {
      cachedVoiceRef.current = null;
      getVoice();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    getVoice();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear motivational message when feedback clears
  useEffect(() => {
    if (feedback === null) setMotivationalMessage(null);
  }, [feedback]);

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // T/F option — randomise when word changes
  useEffect(() => {
    if (currentWord) {
      if (secureRandomInt(2) === 0) {
        setTfOption(currentWord);
      } else {
        let possibleDistractors = gameWords.filter((w) => w.id !== currentWord.id);
        if (possibleDistractors.length === 0) {
          const allPossibleWords = [...ALL_WORDS, ...gameWords];
          possibleDistractors = Array.from(
            new Map(allPossibleWords.map((w) => [w.id, w])).values()
          ).filter((w) => w.id !== currentWord.id);
        }
        setTfOption(possibleDistractors[secureRandomInt(possibleDistractors.length)]);
      }
      setIsFlipped(false);
    }
  }, [currentIndex, currentWord, gameWords]);

  // Auto-speak word when entering a new card (classic / spelling / etc.)
  // Excluded: matching (12 cards at once, no single "current word") and
  // sentence-builder (sentences, not individual words).
  useEffect(() => {
    if (
      view === "game" &&
      !isFinished &&
      currentWord &&
      !showModeSelection &&
      !showModeIntro &&
      gameMode !== "sentence-builder" &&
      gameMode !== "matching"
    ) {
      params.speakWord(currentWord.id, currentWord.english);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isFinished, view, currentWord, showModeSelection, showModeIntro, gameMode]);

  // Matching mode: build pairs when mode / game starts
  useEffect(() => {
    if (view === "game" && !showModeSelection && gameMode === "matching") {
      const shuffled = shuffle(gameWords).slice(0, 6);
      const pairs = shuffle([
        ...shuffled.map((w) => ({ id: w.id, text: w.english, type: "english" as const })),
        ...shuffled.map((w) => ({
          id: w.id,
          text: w[targetLanguage] || w.arabic || w.hebrew || w.english,
          type: "arabic" as const,
        })),
      ]);
      setMatchingPairs(pairs);
      setMatchedIds([]);
      setSelectedMatch(null);
    }
  }, [view, showModeSelection, gameMode, gameWords, targetLanguage]);

  // Letter sounds: reveal one letter at a time and speak it
  useEffect(() => {
    if (
      view !== "game" ||
      showModeSelection ||
      showModeIntro ||
      gameMode !== "letter-sounds" ||
      !currentWord ||
      isFinished
    )
      return;

    setRevealedLetters(0);
    const word = currentWord.english;
    let cancelled = false;

    const revealNext = (idx: number) => {
      if (cancelled || idx >= word.length) return;
      setRevealedLetters(idx + 1);
      setTimeout(() => {
        if (cancelled) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word[idx]);
        utter.rate = 0.8;
        const fallbackTimer = setTimeout(() => {
          if (!cancelled) revealNext(idx + 1);
        }, 1500);
        utter.onend = () => {
          clearTimeout(fallbackTimer);
          if (!cancelled) setTimeout(() => revealNext(idx + 1), 200);
        };
        window.speechSynthesis.speak(utter);
      }, 250);
    };

    const startTimer = setTimeout(() => revealNext(0), 400);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, view, showModeSelection, showModeIntro, gameMode, currentWord, isFinished]);

  // Sentence builder: load sentences from active assignment
  useEffect(() => {
    if (
      view !== "game" ||
      showModeSelection ||
      showModeIntro ||
      gameMode !== "sentence-builder" ||
      !activeAssignment
    )
      return;

    const sentences = (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter((s) => s.trim().length > 0);
    if (validSentences.length > 0) {
      setSentenceIndex(0);
      const words = shuffle(validSentences[0].split(" ").filter(Boolean));
      setAvailableWords(words);
      setBuiltSentence([]);
      setSentenceFeedback(null);
      setTimeout(() => speak(validSentences[0]), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, showModeSelection, showModeIntro, gameMode, activeAssignment]);

  // Congratulatory speech when a mode is finished
  useEffect(() => {
    if (isFinished && user?.displayName && view === "game") {
      const phrases = [
        `Kol Hakavod ${user.displayName}! You did amazing!`,
        `Excellent work ${user.displayName}! You're a superstar!`,
        `Wow ${user.displayName}! That was fantastic!`,
        `Great job ${user.displayName}! Keep going!`,
        `Well done ${user.displayName}! You're getting better and better!`,
      ];
      const phrase = phrases[secureRandomInt(phrases.length)];
      setTimeout(() => speak(phrase), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  // -------------------------------------------------------------------------
  // saveScore
  // -------------------------------------------------------------------------
  const saveScore = async (scoreOverride?: number) => {
    const finalScore = scoreOverride !== undefined ? scoreOverride : score;
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    // Quick Play (guest) mode
    if (user.isGuest && quickPlayActiveSession) {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const authUid = authSession?.user?.id || user.uid;
        const progress: Omit<ProgressData, "id"> = {
          studentName: user.displayName,
          studentUid: authUid,
          assignmentId: quickPlayActiveSession.id,
          classCode: "QUICK_PLAY",
          score: Math.max(0, finalScore),
          mode: gameMode,
          completedAt: new Date().toISOString(),
          mistakes: mistakes,
          avatar: user.avatar || "\uD83E\uDD8A",
        };

        const { error } = await supabase.from("progress").insert({
          student_name: progress.studentName,
          student_uid: progress.studentUid,
          assignment_id: progress.assignmentId,
          class_code: progress.classCode,
          score: progress.score,
          mode: progress.mode,
          completed_at: progress.completedAt,
          mistakes: Array.isArray(mistakes) ? mistakes : [],
          avatar: progress.avatar,
        });

        if (error) {
          console.error("[Quick Play] Failed to save progress:", error);
        } else {
          setQuickPlayCompletedModes((prev) => new Set([...prev, gameMode]));
        }

        setIsSaving(false);
        return;
      } catch (err) {
        console.error("[Quick Play] Error saving progress:", err);
        setIsSaving(false);
        return;
      }
    }

    // Regular assignment mode
    if (!activeAssignment) return;

    const maxPossible = gameWords.length * 10;
    const cappedScore = Math.min(Math.max(0, finalScore), maxPossible);

    // --- XP Calculation with bonuses ---
    let xpEarned = cappedScore;

    // Streak bonus: streak × 5 XP (rewards daily play)
    const streakBonus = streak * STREAK_XP_MULTIPLIER;
    if (streakBonus > 0) xpEarned += streakBonus;

    // First-completion bonus: +50 XP for completing a mode on this
    // assignment for the first time (encourages trying all modes)
    const alreadyCompleted = params.studentProgress.some(
      p => p.assignmentId === activeAssignment.id && p.mode === gameMode
    );
    if (!alreadyCompleted) xpEarned += FIRST_COMPLETION_BONUS;

    const newXp = xp + xpEarned;
    const newStreak = cappedScore >= 80 ? streak + 1 : 0;
    setXp(newXp);
    setStreak(newStreak);

    // Show bonus breakdown in toast
    const bonusParts: string[] = [];
    if (streakBonus > 0) bonusParts.push(`+${streakBonus} streak`);
    if (!alreadyCompleted) bonusParts.push(`+${FIRST_COMPLETION_BONUS} first clear`);
    if (bonusParts.length > 0) {
      showToast(`${xpEarned} XP earned! (${cappedScore} base ${bonusParts.join(', ')})`, "success");
    }

    if (cappedScore === 100) await awardBadge("🎯 Perfect Score");
    if (newStreak >= 5) await awardBadge("🔥 Streak Master");
    if (newXp >= 500) await awardBadge("💎 XP Hunter");
    if (newXp >= 1000) await awardBadge("🏆 XP Champion");

    const streakMilestones = [7, 14, 30, 50, 100];
    if (streakMilestones.includes(newStreak)) {
      loadConfetti().then((confettiModule) => {
        const confetti = confettiModule.default || confettiModule;
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.2, y: 0.5 } }), 300);
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { x: 0.8, y: 0.5 } }), 600);
      });
      showToast(`🔥 ${newStreak}-day streak! Amazing dedication!`, "success");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const sessionUid = session?.user?.id;

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
      avatar: user.avatar || "🦊",
    };

    try {
      const [{ data: progressId, error: rpcError }] = await Promise.all([
        supabase.rpc("save_student_progress", {
          p_student_name: user.displayName,
          p_student_uid: studentUid,
          p_assignment_id: activeAssignment.id,
          p_class_code: user.classCode || "",
          p_score: cappedScore,
          p_mode: gameMode,
          p_mistakes: Array.isArray(mistakes) ? mistakes.length : (typeof mistakes === 'number' ? mistakes : 0),
          p_avatar: user.avatar || "🦊",
        }),
        supabase.from("users").update({ xp: newXp, streak: newStreak }).eq("uid", user.uid),
      ]);

      if (rpcError) throw rpcError;

      const newProgress = { id: progressId, ...progress };

      setStudentProgress((prev) => {
        const existingIndex = prev.findIndex(
          (p) =>
            p.assignmentId === activeAssignment.id &&
            p.mode === gameMode &&
            p.studentUid === studentUid
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newProgress;
          return updated;
        }
        return [...prev, newProgress];
      });

      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.removeItem(retryKey);

      loadConfetti().then((confettiModule) => {
        const confetti = confettiModule.default || confettiModule;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      });
    } catch (error) {
      console.error("Error saving score:", error);
      if (error && typeof error === "object" && "message" in error) {
        console.error("Supabase error details:", error);
      }
      const retryKey = `vocaband_retry_${activeAssignment.id}_${gameMode}`;
      localStorage.setItem(retryKey, JSON.stringify(mapProgressToDb(progress)));
      setSaveError(
        "Your score couldn't be saved. Check your connection — it will retry automatically."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Quick Play guest cleanup
  // -------------------------------------------------------------------------
  const cleanupQuickPlayGuest = async () => {
    if (!user?.isGuest || !quickPlayActiveSession) return;
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const authUid = authSession?.user?.id;
      if (authUid) {
        await supabase
          .from("progress")
          .delete()
          .eq("assignment_id", quickPlayActiveSession.id)
          .eq("student_uid", authUid);
      }
    } catch {}
    try {
      localStorage.removeItem("vocaband_qp_guest");
    } catch {}
    setQuickPlayCompletedModes(new Set());
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSentenceWordTap = (word: string, fromAvailable: boolean) => {
    if (fromAvailable) {
      setAvailableWords((prev) => {
        const idx = prev.indexOf(word);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      setBuiltSentence((prev) => [...prev, word]);
    } else {
      setBuiltSentence((prev) => {
        const idx = prev.indexOf(word);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      setAvailableWords((prev) => [...prev, word]);
    }
  };

  const handleSentenceCheck = () => {
    const sentences =
      (activeAssignment as AssignmentData & { sentences?: string[] }).sentences || [];
    const validSentences = sentences.filter((s) => s.trim().length > 0);
    const target = validSentences[sentenceIndex]?.trim().toLowerCase();
    const built = builtSentence.join(" ").toLowerCase();

    if (built === target) {
      setSentenceFeedback("correct");
      speak(validSentences[sentenceIndex]);
      const newScore = score + 20;
      setScore(newScore);

      if (socket && user?.classCode) {
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
            classCode: user.classCode,
            uid: user.uid,
            score: newScore,
          });
        }, 0);
      }

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
          setTimeout(() => speak(validSentences[next]), 400);
        }
      }, 1800);
    } else {
      setSentenceFeedback("wrong");
      setTimeout(() => {
        setBuiltSentence([]);
        setAvailableWords(
          shuffle(validSentences[sentenceIndex].split(" ").filter(Boolean))
        );
        setSentenceFeedback(null);
      }, 1200);
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
    } else if (user?.isGuest) {
      setShowModeSelection(true);
    } else {
      setUser(null);
      setView("public-landing");
    }
  };

  const handleMatchClick = (item: { id: number; type: "english" | "arabic" }) => {
    if (matchedIds.includes(item.id)) return;

    // Only pronounce when clicking English cards — clicking Hebrew/Arabic
    // cards should not trigger English audio (confusing for students)
    if (item.type === "english") {
      const matchWord = gameWords.find((w) => w.id === item.id);
      setTimeout(() => {
        params.speakWord(item.id, matchWord?.english);
      }, 0);
    }

    if (!selectedMatch) {
      setSelectedMatch(item);
    } else {
      if (selectedMatch.type !== item.type && selectedMatch.id === item.id) {
        const newMatchedIds = [...matchedIds, item.id];
        setMatchedIds(newMatchedIds);
        const newScore = score + 15;
        setScore(newScore);

        if (socket && user?.classCode) {
          setTimeout(() => {
            socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
              classCode: user.classCode,
              uid: user.uid,
              score: newScore,
            });
          }, 0);
        }

        setSelectedMatch(null);

        if (newMatchedIds.length === matchingPairs.length / 2) {
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

      setWordAttempts((prev) => {
        const newState = { ...prev };
        delete newState[currentWord.id];
        return newState;
      });

      if (socket && user?.classCode) {
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
            classCode: user.classCode,
            uid: user.uid,
            score: newScore,
          });
        }, 0);
      }

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
      const currentAttempts = (wordAttempts[currentWord.id] || 0) + 1;
      setWordAttempts((prev) => ({ ...prev, [currentWord.id]: currentAttempts }));

      if (currentAttempts >= MAX_ATTEMPTS_PER_WORD) {
        setFeedback("show-answer");
        setMistakes((prev) => addUnique(prev, currentWord.id));

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (currentIndex < gameWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFeedback(null);
            setHiddenOptions([]);
            setWordAttempts((prev) => removeKey(prev, currentWord.id));
          } else {
            setIsFinished(true);
            saveScore();
          }
        }, SHOW_ANSWER_DELAY_MS);
      } else {
        setFeedback("wrong");
        playWrong();
        setMotivationalMessage(`Try again (${currentAttempts}/${MAX_ATTEMPTS_PER_WORD})`);

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
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
            classCode: user.classCode,
            uid: user.uid,
            score: newScore,
          });
        }, 0);
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
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
            classCode: user.classCode,
            uid: user.uid,
            score: currentScore,
          });
        }, 0);
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
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, {
            classCode: user.classCode,
            uid: user.uid,
            score: newScore,
          });
        }, 0);
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

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    // Language preference
    targetLanguage,
    setTargetLanguage,
    hasChosenLanguage,
    setHasChosenLanguage,

    // Core state
    gameMode,
    setGameMode,
    showModeSelection,
    setShowModeSelection,
    showModeIntro,
    setShowModeIntro,
    spellingInput,
    setSpellingInput,
    currentIndex,
    setCurrentIndex,
    score,
    setScore,
    mistakes,
    setMistakes,
    feedback,
    setFeedback,
    motivationalMessage,
    setMotivationalMessage,
    isFinished,
    setIsFinished,
    wordAttempts,
    setWordAttempts,
    hiddenOptions,
    setHiddenOptions,

    // New modes state
    tfOption,
    setTfOption,
    isFlipped,
    setIsFlipped,

    // Matching state
    matchingPairs,
    setMatchingPairs,
    selectedMatch,
    setSelectedMatch,
    matchedIds,
    setMatchedIds,

    // Letter sounds
    revealedLetters,
    setRevealedLetters,

    // Sentence builder
    sentenceIndex,
    setSentenceIndex,
    availableWords,
    setAvailableWords,
    builtSentence,
    setBuiltSentence,
    sentenceFeedback,
    setSentenceFeedback,

    // Reliability
    saveError,
    setSaveError,
    isSaving,
    setIsSaving,

    // Computed
    gameWords,
    currentWord,
    options,
    scrambledWord,

    // Voice
    speak,

    // Handlers
    handleSentenceWordTap,
    handleSentenceCheck,
    handleExitGame,
    saveScore,
    cleanupQuickPlayGuest,
    handleMatchClick,
    handleAnswer,
    handleTFAnswer,
    handleFlashcardAnswer,
    handleSpellingSubmit,
  };
}
