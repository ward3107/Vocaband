import { useEffect, useRef } from "react";
import { Loader2, QrCode } from "lucide-react";
import { QUICK_PLAY_AVATARS } from "../constants/avatars";
import { shuffle } from "../utils";
import { generateSentencesForAssignment } from "../data/sentence-bank";
import { supabase, type AppUser, type AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { containsProfanity } from "../utils/nicknameProfanity";
import { readQpResumeHint } from "../utils/qpResumeHint";

// ─── Feature flag ──────────────────────────────────────────────────────
// When `VITE_QUICKPLAY_V2=true`, the join flow skips Supabase entirely —
// no signInAnonymously(), no progress-table insert/delete. Students
// connect to the `/quick-play` socket.io namespace with a local UUID
// + the session code + their nickname. When the flag is off (default),
// the legacy path runs unchanged.
//
// Both views (this one + QuickPlayMonitor) must be on the same side of
// the flag in a given deployment, since the student leaderboard lives
// in two different places per flag state.
const QUICKPLAY_V2 = import.meta.env.VITE_QUICKPLAY_V2 === "true";

interface QuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
  aiSentences?: string[];
}

interface QuickPlayStudentViewProps {
  quickPlayActiveSession: QuickPlaySession | null;
  setQuickPlayActiveSession: (s: QuickPlaySession | null) => void;
  quickPlayStudentName: string;
  setQuickPlayStudentName: (name: string) => void;
  quickPlayAvatar: string;
  setQuickPlayAvatar: (avatar: string) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setUser: (user: AppUser | null) => void;
  setAssignmentWords: (words: Word[]) => void;
  setActiveAssignment: (a: AssignmentData | null) => void;
  setCurrentIndex: (n: number) => void;
  setScore: (n: number) => void;
  setFeedback: (f: "correct" | "wrong" | "show-answer" | null) => void;
  setIsFinished: (b: boolean) => void;
  setMistakes: (m: number[]) => void;
  setShowModeSelection: (b: boolean) => void;
  createGuestUser: (name: string, prefix?: string, avatar?: string) => AppUser;
  cleanupSessionData: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** True when the student has already joined this session and is mid-game.
   * Triggers the "Resume playing" resume card. Without it, the body would
   * render empty if the popstate back button sent them here from view=game
   * (session + name both set, but no join-form body to show). */
  userIsActiveGuest?: boolean;
}

export default function QuickPlayStudentView({
  quickPlayActiveSession,
  setQuickPlayActiveSession,
  quickPlayStudentName,
  setQuickPlayStudentName,
  quickPlayAvatar,
  setQuickPlayAvatar,
  setView,
  setUser,
  setAssignmentWords,
  setActiveAssignment,
  setCurrentIndex,
  setScore,
  setFeedback,
  setIsFinished,
  setMistakes,
  setShowModeSelection,
  createGuestUser,
  cleanupSessionData,
  showToast,
  userIsActiveGuest,
}: QuickPlayStudentViewProps) {
  // Socket hook for v2 flow. Safe to call unconditionally — when V2
  // flag is off or there's no active session, the hook stays idle and
  // does not open a connection.
  const quickPlaySocket = useQuickPlaySocket({
    sessionCode: quickPlayActiveSession?.sessionCode ?? null,
    enabled: QUICKPLAY_V2,
  });

  // Surface server-side join errors as toasts so the student isn't
  // stuck staring at the join screen. "nickname_taken" has its own
  // friendly copy to match the legacy behavior.
  useEffect(() => {
    if (!QUICKPLAY_V2 || !quickPlaySocket.lastError) return;
    const { code, message } = quickPlaySocket.lastError;
    if (code === "nickname_taken") {
      showToast("This name is already taken. Please choose a different one.", "error");
    } else if (code === "session_inactive" || code === "session_not_found") {
      showToast("This Quick Play session is no longer active.", "error");
    } else if (code === "rate_limited") {
      showToast("Too many people joining at once — wait a moment and try again.", "error");
    } else {
      showToast(message || "Couldn't join the session. Please try again.", "error");
    }
    // A failed join must clear any pending setup so the deferred
    // useEffect doesn't fire when a LATER (successful) join arrives
    // with the same callback baked into the closure.
    pendingJoinRef.current = null;
  }, [quickPlaySocket.lastError, showToast]);

  // Pending-join intent: when the student clicks Join in V2, we emit
  // STUDENT_JOIN and stash a callback here.  If the server confirms
  // (joinedSessionCode flips), the effect below fires the callback —
  // game UI advance only happens AFTER the server says we're in.
  // If the server rejects (lastError fires above), the ref is cleared
  // and the callback never runs, so the student stays on the join form.
  const pendingJoinRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    if (!quickPlaySocket.joinedSessionCode) return;
    const pending = pendingJoinRef.current;
    if (!pending) return;
    pendingJoinRef.current = null;
    pending();
  }, [quickPlaySocket.joinedSessionCode]);

  // KICKED + SESSION_ENDED — without these listeners the server emits
  // the events but the student's tab keeps the game running.  Symptom
  // teachers reported: "I kick a student and they vanish from my
  // podium but their phone keeps playing."  Subscribe both events to
  // cleanly tear down the local session and bounce back to landing.
  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    const offKicked = quickPlaySocket.onKicked(() => {
      showToast("Your teacher removed you from the session.", "info");
      cleanupSessionData();
      setQuickPlayActiveSession(null);
      setView("public-landing");
    });
    const offEnded = quickPlaySocket.onSessionEnded(() => {
      showToast("The teacher ended the session.", "info");
      cleanupSessionData();
      setQuickPlayActiveSession(null);
      setView("public-landing");
    });
    return () => {
      offKicked();
      offEnded();
    };
  }, [quickPlaySocket, cleanupSessionData, setQuickPlayActiveSession, setView, showToast]);

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
          ) : userIsActiveGuest && quickPlayStudentName ? (
            // Resume card: reached when the mobile back button pops the
            // in-game history entry and lands the student back on
            // quick-play-student with both session + name still set.
            // Before this branch the body rendered empty — students saw a
            // mysterious white page with only the "Vocaband / Back"
            // header. Give them a one-tap path back into the game.
            <div className="w-full max-w-md text-center py-8">
              <div className="text-6xl mb-4">{quickPlayAvatar}</div>
              <h1 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                Welcome back, {quickPlayStudentName}!
              </h1>
              <p className="text-sm sm:text-base text-on-surface-variant font-bold mb-6">
                Your Quick Play session is still active.
              </p>
              <button
                onClick={() => {
                  setShowModeSelection(true);
                  setView("game");
                }}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg"
              >
                Continue Playing →
              </button>
              <button
                onClick={() => {
                  cleanupSessionData();
                  try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
                  setQuickPlayActiveSession(null);
                  setQuickPlayStudentName("");
                  setUser(null);
                  setView("public-landing");
                }}
                className="mt-3 text-sm text-on-surface-variant font-bold hover:text-on-surface"
              >
                Leave Quick Play
              </button>
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
                          name="nickname"
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
                        name="nickname"
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

                    // Profanity gate — best-effort filter for obvious
                    // slurs in EN/HE/AR.  Teachers asked because the
                    // nickname renders on the classroom projector and
                    // an inappropriate display name embarrasses the
                    // class.  Server-side validation catches anything
                    // the client bypasses.
                    if (containsProfanity(trimmedName)) {
                      showToast("Please pick a different name.", "error");
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

                    if (!QUICKPLAY_V2) {
                      // ─── Legacy path ────────────────────────────────
                      // Check for duplicate name in this session via
                      // progress-table snooping, clean up stale rows.
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
                    }
                    // v2 path: name-uniqueness check happens server-side
                    // when we emit STUDENT_JOIN. The hook's useEffect
                    // above surfaces "nickname_taken" as a toast.

                    // Build the UI-advance callback once.  For QP V2 it
                    // runs only after the server confirms JOIN (deferred
                    // via pendingJoinRef + the useEffect on
                    // joinedSessionCode).  For legacy it runs immediately
                    // on next tick — no server confirmation flow exists.
                    const applyJoinedState = () => {
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
                      // sentence-builder + fill-blank) work the same as in real
                      // assignments.  Prefer AI-generated sentences populated on
                      // the qp_sessions row at teacher-create time (see
                      // generateAndStoreQuickPlayAiSentences) — they're context-
                      // rich and Fill-in-the-Blank-friendly.  Fall back to the
                      // POS-template library when the AI call hasn't completed
                      // yet OR failed; templates are good enough for Sentence
                      // Builder but lazier for Fill in the Blank.
                      //
                      // Important alignment detail: AI sentences are stored on
                      // the qp_sessions row in the ORIGINAL word order from the
                      // teacher's wizard, but `words` above was shuffled.  We
                      // need the i-th sentence to match the i-th word, otherwise
                      // Fill in the Blank shows a sentence about "run" but
                      // expects the student to fill in "apple".  Re-align by
                      // looking each shuffled word up in the original
                      // session.words array and pulling the matching sentence
                      // by that original index.  The template fallback is
                      // computed AFTER the shuffle so it's already aligned.
                      const aiFromSession = quickPlayActiveSession.aiSentences;
                      const haveValidAi = Array.isArray(aiFromSession)
                        && aiFromSession.length === quickPlayActiveSession.words.length;
                      const quickPlaySentences: string[] = haveValidAi
                        ? words.map(w => {
                            const originalIdx = quickPlayActiveSession.words.findIndex(o => o.id === w.id);
                            return originalIdx >= 0 ? aiFromSession![originalIdx] : `I like the word ${w.english}.`;
                          })
                        : generateSentencesForAssignment(words, 2);
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
                      // Resume detection: if the localStorage hint
                      // matches the session + nickname AND has a
                      // non-zero score within the 90-min TTL, this
                      // is a re-join after the kid closed the tab.
                      // Carry the score forward locally so the kid's
                      // visible score doesn't snap to 0 AND so future
                      // updateScore emits stay above the server's
                      // monotonic floor (server preserves the
                      // cumulative on adopt; emitting 0+newScore
                      // would be rejected as a regression).
                      const resumeHint = readQpResumeHint();
                      const isResume =
                        resumeHint
                        && resumeHint.sessionCode === quickPlayActiveSession.sessionCode
                        && resumeHint.name === trimmedName
                        && typeof resumeHint.lastScore === 'number'
                        && resumeHint.lastScore > 0;
                      const resumedScore = isResume ? (resumeHint!.lastScore as number) : 0;
                      setScore(resumedScore);
                      setFeedback(null);
                      setIsFinished(false);
                      setMistakes([]);
                      setView("game");
                      setShowModeSelection(true);

                      // Save guest session to localStorage for page refresh recovery
                      // AND for the 90-min resume banner that surfaces on a fresh
                      // landing-page mount (see src/components/QuickPlayResumeBanner.tsx).
                      // joinedAt is the TTL anchor — refreshed on every score
                      // update via App.tsx's emitScoreUpdate so an active player
                      // never sees the banner; only kids who walked away see it.
                      // On resume we preserve the existing lastScore so the
                      // hint doesn't get zeroed mid-session.
                      try {
                        localStorage.setItem('vocaband_qp_guest', JSON.stringify({
                          sessionId: quickPlayActiveSession.id,
                          sessionCode: quickPlayActiveSession.sessionCode,
                          name: trimmedName,
                          avatar: quickPlayAvatar,
                          lastScore: resumedScore,
                          joinedAt: Date.now(),
                        }));
                      } catch {}
                    };

                    setTimeout(async () => {
                      if (QUICKPLAY_V2) {
                        // v2 path: emit STUDENT_JOIN on the /quick-play
                        // socket and DEFER the UI advance until the
                        // server's JOINED reply arrives.  Without the
                        // defer, the optimistic UI raced ahead while the
                        // server was rejecting (nickname_taken, session
                        // inactive, kicked) and the student "played" a
                        // session they were never in — scores were
                        // emitted with a clientId the server never
                        // registered, surfacing as silently-dropped
                        // updates on the teacher's podium.  With the
                        // defer, lastError → toast → user retries with a
                        // different name.
                        pendingJoinRef.current = applyJoinedState;
                        quickPlaySocket.joinAsStudent(trimmedName, quickPlayAvatar);
                      } else {
                        // ─── Legacy path ────────────────────────────
                        // Legacy doesn't have a server-confirmation
                        // flow — fire the UI advance immediately, same
                        // as the original behaviour.  V2 is the only
                        // path that defers via pendingJoinRef.
                        applyJoinedState();
                        // Record that student joined — so teacher sees them in live stats immediately.
                        // Run with retries + surface failures via showToast: errors previously
                        // only hit the console (invisible to the student) and on the teacher
                        // side showed up as an empty monitor with no hint why.
                        (async () => {
                          let authUid: string | null = null;
                          for (let attempt = 0; attempt < 3; attempt++) {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.user?.id) {
                              authUid = session.user.id;
                              break;
                            }
                            // Session not ready yet — sign in anonymously, wait, retry.
                            await supabase.auth.signInAnonymously().catch(() => {});
                            await new Promise(r => setTimeout(r, 300));
                          }
                          if (!authUid) {
                            console.error('[Quick Play] No auth session after retries — cannot record join');
                            showToast('Could not connect to the session. Please refresh and try again.', 'error');
                            return;
                          }
                          const { error } = await supabase.from('progress').insert({
                            student_name: trimmedName,
                            student_uid: authUid,
                            assignment_id: quickPlayActiveSession.id,
                            class_code: "QUICK_PLAY",
                            score: 0,
                            mode: "joined",
                            completed_at: new Date().toISOString(),
                            mistakes: [],
                            avatar: quickPlayAvatar || "🦊",
                          });
                          if (error) {
                            console.error('[Quick Play] Failed to record join:', error);
                            showToast(`Couldn't join the leaderboard: ${error.message}`, 'error');
                          }
                        })();
                      }
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
