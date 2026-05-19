import { useEffect, useRef, useState } from "react";
import { Loader2, QrCode, Globe } from "lucide-react";
import AvatarPicker from "../components/QPAvatarPicker";
import QuickPlayErrorScreen, { type QuickPlayErrorKind } from "../components/QuickPlayErrorScreen";
import QuickPlayGetReady from "../components/QuickPlayGetReady";
import QuickPlayHelpButton from "../components/QuickPlayHelpButton";
import { shuffle } from "../utils";
import { generateSentencesForAssignment } from "../data/sentence-bank";
import { ALL_GAME_MODES } from "../constants/game";
import { supabase, type AppUser, type AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import { useQuickPlaySocket } from "../hooks/useQuickPlaySocket";
import { containsProfanity } from "../utils/nicknameProfanity";
import { useLanguage, languageNames, ALL_LANGUAGES } from "../hooks/useLanguage";
import { quickPlayT } from "../locales/student/quick-play";

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
  /** Which corpus wordIds reference. When 'hebrew', the synthetic
   *  assignment built at join time is tagged so App.tsx routes the
   *  student to HebrewModeSelectionView + the Hebrew game views. */
  subject?: 'english' | 'hebrew';
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
  /** Flips the app into the proper "You've been removed" KICKED screen
   *  when the server rejects a join with `kicked` (sticky kickedClientIds
   *  inherited via nickname adoption).  Without it, a misclick from the
   *  teacher would silently bounce the student to the public landing
   *  with no path back into the session. */
  setQuickPlayKicked: React.Dispatch<React.SetStateAction<boolean>>;
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
  setQuickPlayKicked,
}: QuickPlayStudentViewProps) {
  // Socket hook for v2 flow. Safe to call unconditionally — when V2
  // flag is off or there's no active session, the hook stays idle and
  // does not open a connection.
  const quickPlaySocket = useQuickPlaySocket({
    sessionCode: quickPlayActiveSession?.sessionCode ?? null,
    enabled: QUICKPLAY_V2,
  });

  // Three-step join flow:
  //   "form"      — student enters name + picks avatar
  //   "language"  — student picks the in-game UI language so mode
  //                 labels + buttons render in EN/HE/AR.  This step
  //                 runs after name validation passes but before
  //                 we hit the server JOIN, so the language picked
  //                 here is the one the student sees the moment the
  //                 game loads.
  //   "get-ready" — friendly handshake that doubles as the iOS
  //                 audio-unlock gesture. The "Start playing" tap
  //                 calls primeAudio() inside the gesture context
  //                 BEFORE the actual STUDENT_JOIN emit, so the
  //                 first word the game speaks isn't swallowed by
  //                 iOS Safari's autoplay block.
  const [joinStep, setJoinStep] = useState<"form" | "language" | "get-ready">("form");
  // Fatal-error gate. When set, the join body is replaced by a
  // friendly full-page error screen instead of a stale form + toast.
  const [fatalError, setFatalError] = useState<QuickPlayErrorKind | null>(null);
  // "Resuming" — true while the student is attempting to re-join an
  // active session via the Continue Playing card.  Drives the button's
  // disabled + loading-spinner state and the lastError-handler reset.
  // State was missing — introduced in the v2 socket-only flow but
  // never declared here, leaving 5 references dangling.
  const [resuming, setResuming] = useState<boolean>(false);
  // True after a resume-card "Continue Playing" tap times out — the
  // server never confirmed adoption back into the existing slot.
  // Drives the resume card into a "Couldn't reconnect" mode with a
  // "Scan a new QR" CTA instead of leaving the kid staring at the
  // optimistic "still active" copy + a Continue button that just
  // failed silently.
  const [resumeFailed, setResumeFailed] = useState<boolean>(false);
  // "Joining" — true after the student taps Start on the Get Ready
  // screen, until either the server's JOINED reply lands (component
  // unmounts on view change) or an error bounces us elsewhere. Keeps
  // the Start button locked + spinning so impatient kids don't tap
  // five times and queue five join emits.
  const [joining, setJoining] = useState<boolean>(false);
  // Validated name captured at form-submit time so the language
  // picker can fire the join with it.  Defaults to empty string
  // and is overwritten when the student clicks Continue on the form.
  // Stored as state (not a ref) because QuickPlayGetReady renders
  // the name in its greeting — refs aren't safe to read during render.
  const [stagedName, setStagedName] = useState<string>("");
  const { language: qpLanguage, setLanguage: setAppLanguage, isRTL: qpIsRTL } = useLanguage();
  const qpT = quickPlayT[qpLanguage] ?? quickPlayT.en;

  // Pending-join intent: when the student clicks Join in V2, we emit
  // STUDENT_JOIN and stash a callback here.  If the server confirms
  // (joinedSessionCode flips), the effect below fires the callback —
  // game UI advance only happens AFTER the server says we're in.
  // If the server rejects (lastError fires above), the ref is cleared
  // and the callback never runs, so the student stays on the join form.
  const pendingJoinRef = useRef<(() => void) | null>(null);

  // Watchdog for the rejoin emit.  Without this, a STUDENT_JOIN that
  // reaches the server but whose JOINED reply never lands (Cloudflare
  // edge dropping the WS frame mid-handshake, Fly VM swap during
  // auto-stop, school firewall buffering — the gotchas behind the
  // teacher's "one student stuck reconnecting while the other nine play
  // fine" report) leaves the student on the language picker or
  // "Reconnecting…" button forever, since `lastError` only fires on
  // protocol-level rejections.  After 8s with no JOINED or error, reset
  // the UI and surface a retry-friendly toast.
  const joinWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disarmJoinWatchdog = () => {
    if (joinWatchdogRef.current) {
      clearTimeout(joinWatchdogRef.current);
      joinWatchdogRef.current = null;
    }
  };
  const armJoinWatchdog = () => {
    disarmJoinWatchdog();
    joinWatchdogRef.current = setTimeout(() => {
      joinWatchdogRef.current = null;
      if (pendingJoinRef.current === null) return;
      pendingJoinRef.current = null;
      const wasResuming = resumingRef.current;
      setResuming(false);
      setJoinStep("form");
      // When the failed attempt came from the resume card (kid tapped
      // "Continue Playing"), pivot the resume card into a "Couldn't
      // reconnect — scan a new QR" state instead of leaving the
      // optimistic Continue button visible behind a fleeting toast.
      // First-time joins still get the same form bounce + toast they
      // had before — no change there.
      if (wasResuming) {
        setResumeFailed(true);
      } else {
        showToast(quickPlayT[qpLanguage]?.toastCantReachGame ?? quickPlayT.en.toastCantReachGame, "error");
      }
    }, 8000);
  };
  // Mirror `resuming` into a ref so the watchdog (closed over at arm
  // time) reads the live value rather than the value at the moment
  // the setTimeout was scheduled.
  const resumingRef = useRef(false);
  useEffect(() => { resumingRef.current = resuming; }, [resuming]);
  // Clear the watchdog on unmount so a slow rejoin attempt doesn't fire
  // its toast after the view is already gone.
  useEffect(() => () => disarmJoinWatchdog(), []);

  // Surface server-side join errors. Recoverable errors (taken name,
  // rate-limited) show as toasts so the student can fix and retry on
  // the same screen. Fatal errors (session gone) take over the whole
  // page with a friendly full-page error screen — a small toast over
  // an empty form was the #1 "is it broken?" report from the field.
  // "kicked" is silenced here because the server pairs it with a
  // KICKED event that flips the app into the dedicated "You've been
  // removed" screen via the onKicked handler below.
  useEffect(() => {
    if (!QUICKPLAY_V2 || !quickPlaySocket.lastError) return;
    const { code, message } = quickPlaySocket.lastError;
    if (code === "kicked") {
      // Intentionally silent: onKicked → setQuickPlayKicked(true) shows
      // the dedicated KICKED screen with a "Rejoin with a different
      // name" button.  A toast would just shout the same thing.
    } else if (code === "nickname_taken") {
      showToast(qpT.toastNameTaken, "error");
      // Bounce back to the name form so they can fix and retry.
      setJoinStep("form");
    } else if (code === "session_inactive") {
      setFatalError("session-ended");
    } else if (code === "session_not_found") {
      setFatalError("session-not-found");
    } else if (code === "rate_limited") {
      showToast(qpT.toastTooManyJoining, "error");
    } else {
      // `message` from the server is plain English; prefer the kid-
      // friendly localized fallback for the generic case.
      showToast(message || qpT.toastGenericJoinFail, "error");
    }
    // A failed join must clear any pending setup so the deferred
    // useEffect doesn't fire when a LATER (successful) join arrives
    // with the same callback baked into the closure.
    pendingJoinRef.current = null;
    disarmJoinWatchdog();
    // Also reset the "Continue Playing" + "Start playing" buttons
    // out of their loading states so the student can retry.
    setResuming(false);
    setJoining(false);
  }, [quickPlaySocket.lastError, showToast]);

  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    if (!quickPlaySocket.joinedSessionCode) return;
    const pending = pendingJoinRef.current;
    if (!pending) return;
    pendingJoinRef.current = null;
    disarmJoinWatchdog();
    pending();
  }, [quickPlaySocket.joinedSessionCode]);

  // Fire the actual server JOIN (or legacy progress insert) for the
  // staged name.  Called from each language-picker button after we
  // setAppLanguage(lang).  Async because the legacy path runs a
  // duplicate-name check against the progress table; v2 path delegates
  // that check to the server via STUDENT_JOIN.
  const runJoin = async (trimmedName: string) => {
    if (!quickPlayActiveSession) {
      showToast(qpT.toastSessionExpired, "error");
      return;
    }
    if (!QUICKPLAY_V2) {
      // ─── Legacy path duplicate-name check ────────────────────────
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
        showToast(qpT.toastNameTaken, "error");
        // Bounce back to form so they can fix the name.
        setJoinStep("form");
        return;
      }
    }

    // Build the UI-advance callback once.  For QP V2 it runs only
    // after the server confirms JOIN (deferred via pendingJoinRef +
    // the useEffect on joinedSessionCode).  For legacy it runs
    // immediately on next tick — no server confirmation flow exists.
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
      // AI sentences live on the qp_sessions row in the ORIGINAL
      // word order from the teacher's wizard, but `words` above
      // was shuffled.  Re-align by looking each shuffled word up
      // in the original session.words array and pulling the matching
      // sentence by that original index.  Template fallback is
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
        allowedModes: quickPlayActiveSession.allowedModes || ALL_GAME_MODES,
        sentences: quickPlaySentences,
        sentenceDifficulty: 2,
        // Forward subject so the mode-selection branch in App.tsx
        // (`activeAssignment?.subject === "hebrew"`) routes the student
        // to HebrewModeSelectionView + the 4 Hebrew game views.
        subject: quickPlayActiveSession.subject ?? 'english',
      });
      setCurrentIndex(0);
      setScore(0);
      setFeedback(null);
      setIsFinished(false);
      setMistakes([]);
      setView("game");
      setShowModeSelection(true);
      try {
        localStorage.setItem('vocaband_qp_guest', JSON.stringify({
          sessionId: quickPlayActiveSession.id,
          sessionCode: quickPlayActiveSession.sessionCode,
          name: trimmedName,
          avatar: quickPlayAvatar,
          lastScore: 0,
          joinedAt: Date.now(),
        }));
      } catch {}
    };

    setTimeout(async () => {
      if (QUICKPLAY_V2) {
        // v2 path: emit STUDENT_JOIN on the /quick-play socket and
        // DEFER the UI advance until the server's JOINED reply
        // arrives.  Without the defer, the optimistic UI raced ahead
        // while the server was rejecting (nickname_taken, session
        // inactive, kicked) and the student "played" a session they
        // were never in.
        pendingJoinRef.current = applyJoinedState;
        armJoinWatchdog();
        quickPlaySocket.joinAsStudent(trimmedName, quickPlayAvatar);
      } else {
        // Legacy doesn't have a server-confirmation flow — fire the
        // UI advance immediately, same as the original behaviour.
        applyJoinedState();
        (async () => {
          let authUid: string | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              authUid = session.user.id;
              break;
            }
            await supabase.auth.signInAnonymously().catch(() => {});
            await new Promise(r => setTimeout(r, 300));
          }
          if (!authUid) {
            console.error('[Quick Play] No auth session after retries — cannot record join');
            showToast(qpT.toastConnectionLost, 'error');
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
            showToast(qpT.toastCantJoinLeaderboard, 'error');
          }
        })();
      }
    }, 100);
  };

  // KICKED + SESSION_ENDED — without these listeners the server emits
  // the events but the student's tab keeps the game running.  Symptom
  // teachers reported: "I kick a student and they vanish from my
  // podium but their phone keeps playing."
  //
  // KICKED flips into the dedicated "You've been removed" screen via
  // setQuickPlayKicked(true) — that screen offers a "Rejoin with a
  // different name" path (sticky kickedClientIds only blocks the same
  // nickname).  The previous behaviour silently bounced the student to
  // the public landing, which trapped them: no rejoin option, just a
  // confusing toast and the QR they'd already scanned out of view.
  // App.tsx now renders the kicked screen BEFORE the studentAuthRoute
  // so this works whether the student was on the join form, the resume
  // card, or mid-game when the kick arrived.
  //
  // SESSION_ENDED keeps the bounce-to-landing flow — there's no
  // recovery action so a toast + landing is the right answer.
  useEffect(() => {
    if (!QUICKPLAY_V2) return;
    const offKicked = quickPlaySocket.onKicked(() => {
      // Cancel any in-flight rejoin watchdog — the kicked screen
      // supersedes the language picker / resume card.
      disarmJoinWatchdog();
      pendingJoinRef.current = null;
      setResuming(false);
      setQuickPlayKicked(true);
    });
    const offEnded = quickPlaySocket.onSessionEnded(() => {
      showToast(qpT.toastTeacherEnded, "info");
      cleanupSessionData();
      setQuickPlayActiveSession(null);
      setView("public-landing");
    });
    return () => {
      offKicked();
      offEnded();
    };
  }, [quickPlaySocket, cleanupSessionData, setQuickPlayActiveSession, setView, showToast, setQuickPlayKicked]);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="w-full sticky top-0 bg-surface flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
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
          {qpIsRTL ? '→' : '←'} {qpT.back}
        </button>
      </header>

      {/* Reconnecting banner — shown when the socket drops mid-session
          so the student knows their attempts aren't reaching the
          teacher instead of silently failing.  Auto-hides once the
          socket reconnects. */}
      {quickPlayActiveSession && quickPlaySocket.status === "disconnected" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-amber-950 font-bold text-sm shadow-lg animate-pulse"
        >
          <span className="w-2 h-2 rounded-full bg-amber-900" />
          {qpT.reconnecting}
        </div>
      )}

      <main id="main-content" className="flex-grow flex flex-col items-center px-4 py-3 sm:py-6 max-w-4xl mx-auto w-full">
          {fatalError ? (
            // Fatal-error short-circuit. Replaces the entire join body
            // so the student isn't staring at a stale form behind a
            // toast that just told them the session is gone.
            <QuickPlayErrorScreen
              kind={fatalError}
              onPrimary={() => {
                cleanupSessionData();
                try { localStorage.removeItem('vocaband_qp_guest'); } catch { /* storage unavailable */ }
                setQuickPlayActiveSession(null);
                setQuickPlayStudentName('');
                setUser(null);
                window.history.replaceState({}, '', window.location.pathname);
                setFatalError(null);
                setView('public-landing');
              }}
            />
          ) : !quickPlayActiveSession ? (
            <div className="text-center py-12 sm:py-20">
              <Loader2 className="mx-auto animate-spin text-primary mb-4 w-9 h-9 sm:w-12 sm:h-12" />
              <p className="text-on-surface-variant font-bold text-sm sm:text-base">{qpT.loadingSession}</p>
              {/* Manual escape — the bootstrap has a 15s timeout that
                  auto-bounces to landing, but on a phone holding the
                  loader for 15s feels broken.  A visible escape link
                  reassures the student they can recover even before
                  the timeout fires. */}
              <button
                type="button"
                onClick={() => {
                  cleanupSessionData();
                  try { localStorage.removeItem('vocaband_qp_guest'); } catch { /* storage unavailable */ }
                  setQuickPlayActiveSession(null);
                  setQuickPlayStudentName('');
                  setUser(null);
                  window.history.replaceState({}, '', window.location.pathname);
                  setView('public-landing');
                }}
                className="mt-6 text-sm font-bold text-on-surface-variant underline hover:text-on-surface"
              >
                {qpT.cancelAndGoBack}
              </button>
            </div>
          ) : userIsActiveGuest && quickPlayStudentName ? (
            // Resume card: reached when the mobile back button pops the
            // in-game history entry and lands the student back on
            // quick-play-student with both session + name still set.
            // Before this branch the body rendered empty — students saw a
            // mysterious white page with only the "Vocaband / Back"
            // header. Give them a one-tap path back into the game.
            //
            // `resumeFailed` flips the optimistic "still active + Continue"
            // copy into an honest "Couldn't reconnect — scan a new QR"
            // state when the join watchdog timed out. Without it the
            // Continue button would just re-fire the same dead rejoin
            // until the kid gives up.
            <div className="w-full max-w-md text-center py-8">
              <div className="text-6xl mb-4">{quickPlayAvatar}</div>
              {resumeFailed ? (
                <>
                  <h1 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                    {qpT.resumeFailedTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-on-surface-variant font-bold mb-6">
                    {qpT.resumeFailedBody}
                  </p>
                  <button
                    onClick={() => {
                      cleanupSessionData();
                      try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
                      setQuickPlayActiveSession(null);
                      setQuickPlayStudentName("");
                      setUser(null);
                      window.history.replaceState({}, '', window.location.pathname);
                      setResumeFailed(false);
                      setView("public-landing");
                    }}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg"
                  >
                    {qpT.scanNewQr}
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                    {/* <bdi> isolates the LTR nickname inside the RTL
                        layout so the trailing "!" lands at the visual end
                        of the name, not the start. */}
                    {qpT.welcomeBackPrefix}<bdi>{quickPlayStudentName}</bdi>!
                  </h1>
                  <p className="text-sm sm:text-base text-on-surface-variant font-bold mb-6">
                    {qpT.sessionStillActive}
                  </p>
                  <button
                    disabled={resuming}
                    onClick={() => {
                      // Resume = re-emit STUDENT_JOIN with the same nickname
                      // so the server adopts this socket back into the
                      // existing slot (server-side: same-nickname adoption,
                      // see server.ts:810 + CLAUDE.md §12).  Without this
                      // re-emit, the new socket has `<none>` ownership and
                      // every subsequent score update fails with
                      // [QP SCORE owner-mismatch socketOwnsClient=<none>].
                      //
                      // Defer the actual navigate until joinedSessionCode
                      // confirms, using the same pendingJoinRef pattern as
                      // the first-time join — otherwise we'd render the
                      // game screen before the server knows we're back.
                      const advance = () => {
                        setResuming(false);
                        setShowModeSelection(true);
                        setView("game");
                      };
                      if (QUICKPLAY_V2 && quickPlayActiveSession && quickPlayStudentName) {
                        setResuming(true);
                        pendingJoinRef.current = advance;
                        armJoinWatchdog();
                        quickPlaySocket.joinAsStudent(quickPlayStudentName, quickPlayAvatar);
                      } else {
                        advance();
                      }
                    }}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resuming ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        {qpT.reconnecting}
                      </>
                    ) : (
                      <>{qpT.continuePlaying} {qpIsRTL ? '←' : '→'}</>
                    )}
                  </button>
                </>
              )}
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
                {qpT.leaveQuickPlay}
              </button>
            </div>
          ) : !quickPlayStudentName && joinStep === "language" ? (
            // ─── Language picker step ─────────────────────────────────
            // Runs after name+avatar are validated, before the actual
            // server JOIN.  Picks the in-game UI language so mode
            // labels + buttons render in EN / HE / AR for the rest
            // of the session.
            <div className="w-full max-w-md">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-3xl sm:text-4xl font-black">Aa</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-on-surface mb-2">Pick a language</h1>
                <p className="text-sm sm:text-base text-on-surface-variant font-bold">
                  Buttons + mode names will be in this language
                </p>
              </div>

              <div className="space-y-3">
                {ALL_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setAppLanguage(lang);
                      if (!stagedName) {
                        setJoinStep("form");
                        return;
                      }
                      // Move to the Get Ready screen instead of firing
                      // the join immediately. The next tap (Start
                      // playing) primes iOS audio inside the gesture
                      // context and THEN calls runJoin.
                      setJoinStep("get-ready");
                    }}
                    className="w-full py-4 sm:py-5 bg-surface-container hover:bg-surface-container-high active:scale-[0.98] rounded-xl font-black text-lg sm:text-xl transition-all shadow-md flex items-center justify-center gap-3 border-2 border-surface-container-highest"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
                  >
                    <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-on-surface-variant" strokeWidth={2} aria-hidden />
                    <span className="text-on-surface">{languageNames[lang]}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setJoinStep("form")}
                className="mt-5 w-full py-2 text-sm text-on-surface-variant hover:text-on-surface font-bold"
              >
                {qpIsRTL ? '→' : '←'} Back
              </button>
            </div>
          ) : !quickPlayStudentName && joinStep === "get-ready" ? (
            // ─── Get Ready handshake ──────────────────────────────────
            // The "Start playing" tap inside QuickPlayGetReady primes
            // iOS audio (speechSynthesis + Web Audio) inside the user
            // gesture context, THEN we fire the staged join. Without
            // the prime, the first word the game speaks on iOS Safari
            // is silently swallowed by the autoplay block.
            <QuickPlayGetReady
              name={stagedName}
              avatar={quickPlayAvatar}
              joining={joining}
              joinedCount={quickPlaySocket.leaderboard.length}
              onStart={() => {
                if (!stagedName) {
                  setJoinStep("form");
                  return;
                }
                setJoining(true);
                runJoin(stagedName);
              }}
            />
          ) : !quickPlayStudentName ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <QrCode className="text-white w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                {(() => {
                  // Localize so the headline + subhead don't bidi-flip
                  // into "!Quick Play" / "words • No login needed 11"
                  // when the student picks Hebrew/Arabic before naming
                  // themselves. Inline ternaries match the existing
                  // pattern in this file (no quick-play.ts locale
                  // module yet).
                  const wordsCount = quickPlayActiveSession.words.length;
                  const headline =
                    qpLanguage === "he"
                      ? "משחק מהיר!"
                      : qpLanguage === "ar"
                      ? "لعب سريع!"
                      : "Quick Play!";
                  const subhead =
                    qpLanguage === "he"
                      ? `${wordsCount} מילים · אין צורך בהתחברות`
                      : qpLanguage === "ar"
                      ? `${wordsCount} كلمات · لا حاجة لتسجيل الدخول`
                      : `${wordsCount} words • No login needed`;
                  return (
                    <>
                      <h1 className="text-2xl sm:text-4xl font-black text-on-surface mb-2">{headline}</h1>
                      <p className="text-sm sm:text-base text-on-surface-variant font-bold">{subhead}</p>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Tabbed avatar picker — group tabs across the top,
                    grid below.  Avatars are emoji except the "Geometric"
                    tab which uses lucide-react vector icons (see
                    QPAvatar render helper).  Selected state persists
                    across tab switches via quickPlayAvatar. */}
                <AvatarPicker
                  selected={quickPlayAvatar}
                  onSelect={setQuickPlayAvatar}
                />


                <div className="relative">
                  <label className="absolute -top-2.5 start-4 px-2 bg-surface text-primary font-black text-xs z-10">
                    {qpLanguage === "he" ? "השם שלך" : qpLanguage === "ar" ? "اسمك" : "YOUR NAME"}
                  </label>
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
                          className="w-full px-4 py-3 sm:py-4 bg-surface-container border-4 border-stone-200 rounded-xl text-base sm:text-lg font-black text-on-surface cursor-not-allowed opacity-70"
                        />
                        <p className="text-xs text-on-surface-variant mt-1 text-center">
                          {qpLanguage === "he" ? (
                            <>כבר הצטרפת בשם <strong><bdi>{lockedName}</bdi></strong></>
                          ) : qpLanguage === "ar" ? (
                            <>لقد انضممت بالفعل باسم <strong><bdi>{lockedName}</bdi></strong></>
                          ) : (
                            <>You already joined as <strong><bdi>{lockedName}</bdi></strong></>
                          )}
                        </p>
                      </>
                    ) : (
                      <input
                        id="quick-play-name-input"
                        name="nickname"
                        type="text"
                        inputMode="text"
                        autoCapitalize="words"
                        autoComplete="off"
                        // Keep auto-correct + spellcheck off so the
                        // phone keyboard doesn't "fix" the kid's
                        // nickname into something else mid-type
                        // (Marwa → Marwha, Eitan → Eaten, etc.).
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={30}
                        defaultValue={quickPlayStudentName}
                        placeholder={qpLanguage === 'he' ? 'הכניסו כינוי...' : qpLanguage === 'ar' ? 'أدخل اسمك المستعار...' : 'Enter your nickname...'}
                        className="w-full px-4 py-3 sm:py-4 bg-transparent border-4 border-stone-200 rounded-xl text-base sm:text-lg font-black text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    );
                  })()}
                </div>

                <button
                  data-quick-play-join
                  onClick={() => {
                    const input = document.getElementById('quick-play-name-input') as HTMLInputElement;
                    const trimmedName = input?.value.trim() || "";

                    if (!trimmedName) {
                      showToast(qpT.toastTypeNameFirst, "error");
                      return;
                    }
                    // Profanity gate — best-effort filter for obvious
                    // slurs in EN/HE/AR.  Teachers asked because the
                    // nickname renders on the classroom projector and
                    // an inappropriate display name embarrasses the
                    // class.  Server-side validation catches anything
                    // the client bypasses.
                    if (containsProfanity(trimmedName)) {
                      showToast(qpT.toastPickDifferentName, "error");
                      return;
                    }
                    if (!quickPlayActiveSession) {
                      showToast(qpT.toastSessionExpired, "error");
                      return;
                    }
                    // Check if this name was kicked from this session
                    try {
                      const kickedKey = `vocaband_kicked_${quickPlayActiveSession.id}`;
                      const kickedNames: string[] = JSON.parse(localStorage.getItem(kickedKey) || '[]');
                      if (kickedNames.includes(trimmedName)) {
                        showToast(qpT.toastNameRemovedByTeacher, "error");
                        return;
                      }
                    } catch {}
                    if (!quickPlayActiveSession.words || quickPlayActiveSession.words.length === 0) {
                      showToast(qpT.toastNoWordsInSession, "error");
                      return;
                    }
                    // All synchronous validation passed — stage the
                    // name and switch to the language picker step.
                    // The actual server JOIN + UI advance fires only
                    // when the language picker button is tapped, so
                    // the language is set BEFORE the game loads.
                    setStagedName(trimmedName);
                    setJoinStep("language");
                  }}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg"
                >
                  {qpLanguage === "he" ? "המשך" : qpLanguage === "ar" ? "متابعة" : "Continue"} {qpIsRTL ? '←' : '→'}
                </button>
              </div>

              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-surface-container-low rounded-xl border-2 border-surface-container-highest">
                <p className="text-xs sm:text-sm text-on-surface-variant text-center">
                  {qpLanguage === "he"
                    ? "ℹ️ ההתקדמות שלך לא תישמר (מצב אורח). פתחו חשבון כדי לעקוב אחר הנקודות ולפתוח אפשרויות נוספות!"
                    : qpLanguage === "ar"
                    ? "ℹ️ لن يتم حفظ تقدمك (وضع الضيف). أنشئ حسابًا لتتبع نقاطك وفتح ميزات إضافية!"
                    : "ℹ️ Your progress won't be saved (guest mode). Create an account to track your XP and unlock features!"}
                </p>
              </div>
            </div>
          ) : null}
      </main>

      {/* Floating help button — visible across every join step + the
          resume card so a stuck student always has a one-tap escape
          hatch. Hidden once we've left the join surface (the in-game
          mount lives in App.tsx alongside QpReactionBar). The teacher
          alert path uses sendReaction so kids on the join screen who
          can't figure out the name field can ping the projector. */}
      {quickPlayActiveSession && !fatalError && (
        <QuickPlayHelpButton
          onAlertTeacher={QUICKPLAY_V2 ? () => quickPlaySocket.sendReaction('🙋') : undefined}
          onLeave={() => {
            cleanupSessionData();
            try { localStorage.removeItem('vocaband_qp_guest'); } catch { /* storage unavailable */ }
            setQuickPlayActiveSession(null);
            setQuickPlayStudentName('');
            setUser(null);
            setView('public-landing');
          }}
        />
      )}
    </div>
  );
}
