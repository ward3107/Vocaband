/**
 * useGameFinish — game-end side of the orchestrator pulled out of App.tsx.
 *
 * Owns two handlers:
 *   - `saveScore(scoreOverride?)` — persist the final score for a finished
 *     game. Branches on whether the player is a Quick Play guest (in v2,
 *     leaderboard lives in socket memory; in legacy, queue a progress row)
 *     or a real student in a class assignment (anti-farm cap, booster
 *     multipliers, streak handling, badge checks, optimistic save with
 *     retry queue).
 *   - `handleExitGame()` — tear down all per-game React state and route the
 *     user back to the right "home" view depending on their role.
 *
 * Mechanical extraction: same behaviour as the inline App.tsx versions,
 * just owned by the hook now. The hook params interface is wide because
 * game-finish touches a lot of state — same trade-off as
 * useGameModeActions and useTeacherActions.
 *
 * Cross-hook callbacks (awardBadge, queueSaveOperation, cleanupSessionData,
 * cleanupQuickPlayGuest) live in App.tsx and are passed in. Same for the
 * retention + boosters APIs — those are returned from their own hooks
 * called in App.tsx, so passing them through keeps the orchestrator the
 * single owner of those subscriptions.
 */
import React from "react";
import {
  supabase,
  type AppUser,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import {
  MAX_ASSIGNMENT_ROUNDS,
  STREAK_CELEBRATION_MILESTONES,
} from "../constants/game";
import {
  enqueueQuickPlaySave,
  enqueueAssignmentSave,
} from "../core/saveQueue";
import {
  incrementAssignmentPlays,
  isAssignmentLocked,
  resolveAssignmentPlays,
} from "./useAssignmentPlays";
import { celebrate } from "../utils/celebrate";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";

// ─── Param shapes ──────────────────────────────────────────────────────

/** Subset of useBoosters() return surface that saveScore actually calls. */
export interface BoosterApi {
  consumeLuckyCharm: () => boolean;
  xpMultiplier: () => number;
  tryConsumeStreakFreeze: () => boolean;
}

/** Subset of useRetention() return surface that saveScore touches. */
export interface RetentionApi {
  recordPlay: () => void;
}

/** Minimum fields saveScore reads from a Quick Play session. App.tsx's
 *  full session shape is wider; the hook only reads `id`, so an index
 *  signature lets callers pass their richer object without casting. */
interface QuickPlaySession {
  id: string;
  sessionCode: string;
  [k: string]: unknown;
}

export interface UseGameFinishParams {
  // ─── Identity / auth ────────────────────────────────────────────
  user: AppUser | null;

  // ─── Active game state (read) ───────────────────────────────────
  score: number;
  gameMode: string;
  gameWords: Word[];
  mistakes: number[];
  wordAttemptBatch: Array<{ word_id: number; is_correct: boolean }>;
  activeAssignment: AssignmentData | null;

  // ─── Quick Play context ─────────────────────────────────────────
  quickPlayActiveSession: QuickPlaySession | null;
  /** True when the v2 socket-only Quick Play flow is active (no progress
   *  table writes). Same flag App.tsx already reads from VITE_QUICKPLAY_V2. */
  quickPlayV2: boolean;
  /** updateScore on the /quick-play socket. Wired through so the hook
   *  doesn't need to import the socket hook directly. */
  quickPlaySocketUpdateScore: (score: number) => void;

  // ─── Per-student progression ────────────────────────────────────
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  streak: number;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  badges: string[];
  studentProgress: ProgressData[];
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;

  // ─── Save lifecycle ─────────────────────────────────────────────
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  setQuickPlayCompletedModes: React.Dispatch<React.SetStateAction<Set<string>>>;

  // ─── Cross-hook collaborators ───────────────────────────────────
  retention: RetentionApi;
  boosters: BoosterApi;

  // ─── App.tsx callbacks ──────────────────────────────────────────
  showToast: (message: string, type: "success" | "error" | "info") => void;
  awardBadge: (badge: string) => Promise<void>;
  queueSaveOperation: (operation: () => Promise<void>) => void;

  // ─── handleExitGame state ───────────────────────────────────────
  setView: React.Dispatch<React.SetStateAction<View>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setMistakes: React.Dispatch<React.SetStateAction<number[]>>;
  setWordAttemptBatch: React.Dispatch<React.SetStateAction<Array<{ word_id: number; is_correct: boolean }>>>;
  setFeedback: React.Dispatch<React.SetStateAction<"correct" | "wrong" | "show-answer" | null>>;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  setMatchedIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedMatch: React.Dispatch<React.SetStateAction<{ id: number; type: "english" | "arabic" } | null>>;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  setRevealedLetters: React.Dispatch<React.SetStateAction<number>>;
  setSentenceIndex: React.Dispatch<React.SetStateAction<number>>;
  setAvailableWords: React.Dispatch<React.SetStateAction<string[]>>;
  setBuiltSentence: React.Dispatch<React.SetStateAction<string[]>>;
  setSentenceFeedback: React.Dispatch<React.SetStateAction<"correct" | "wrong" | null>>;
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;
  showModeSelection: boolean;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickPlayActiveSession: React.Dispatch<React.SetStateAction<QuickPlaySession | null>>;
  setQuickPlayStudentName: React.Dispatch<React.SetStateAction<string>>;
  cleanupSessionData: () => void;
  cleanupQuickPlayGuest: () => Promise<void>;
}

export function useGameFinish(params: UseGameFinishParams) {
  const {
    user, score, gameMode, gameWords, mistakes, wordAttemptBatch, activeAssignment,
    quickPlayActiveSession, quickPlayV2, quickPlaySocketUpdateScore,
    xp, setXp, streak, setStreak, badges, studentProgress, setStudentProgress,
    setIsSaving, setSaveError, setQuickPlayCompletedModes,
    retention, boosters,
    showToast, awardBadge, queueSaveOperation,
    setView, setUser, setIsFinished, setCurrentIndex, setScore, setMistakes,
    setWordAttemptBatch, setFeedback, setSpellingInput, setMatchedIds,
    setSelectedMatch, setIsFlipped, setRevealedLetters, setSentenceIndex,
    setAvailableWords, setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    showModeSelection, setShowModeSelection,
    setQuickPlayActiveSession, setQuickPlayStudentName,
    cleanupSessionData, cleanupQuickPlayGuest,
  } = params;

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
      if (quickPlayV2) {
        quickPlaySocketUpdateScore(Math.max(0, finalScore));
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
          avatar: user.avatar || "🦊"
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

  return { saveScore, handleExitGame };
}
