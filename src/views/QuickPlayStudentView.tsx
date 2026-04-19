import { Loader2, QrCode } from "lucide-react";
import { QUICK_PLAY_AVATARS } from "../constants/avatars";
import { shuffle } from "../utils";
import { generateSentencesForAssignment } from "../data/sentence-bank";
import { supabase, type AppUser, type AssignmentData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";

interface QuickPlaySession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
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

                    // Check for duplicate name in this session
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

                    setTimeout(async () => {
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
                      // sentence-builder) work the same as in real assignments.
                      const quickPlaySentences = generateSentencesForAssignment(words, 2);
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
                      setScore(0);
                      setFeedback(null);
                      setIsFinished(false);
                      setMistakes([]);
                      setView("game");
                      setShowModeSelection(true);

                      // Save guest session to localStorage for page refresh recovery
                      try {
                        localStorage.setItem('vocaband_qp_guest', JSON.stringify({
                          sessionId: quickPlayActiveSession.id,
                          sessionCode: quickPlayActiveSession.sessionCode,
                          name: trimmedName,
                          avatar: quickPlayAvatar,
                        }));
                      } catch {}

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
                          avatar: guestUser.avatar || "🦊",
                        });
                        if (error) {
                          console.error('[Quick Play] Failed to record join:', error);
                          showToast(`Couldn't join the leaderboard: ${error.message}`, 'error');
                        }
                      })();
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
