import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, AlertTriangle, CheckCircle2, Info, Home, Grid3X3, LogOut } from "lucide-react";
import type { AppUser } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import { THEMES } from "../constants/game";
import { ErrorTrackingPanel } from "../components/ErrorTrackingPanel";
import RatingPrompt from "../components/RatingPrompt";
import { useLanguage } from "../hooks/useLanguage";
import { gameFinishedT } from "../locales/student/game-finished";
import type { View } from "../core/views";

// Unbiased secure random integer in [0, max).
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}

interface ConfirmDialogState {
  show: boolean;
  message: string;
  onConfirm: () => void;
}

interface GameFinishedViewProps {
  user: AppUser | null;
  score: number;
  xp: number;
  streak: number;
  badges: string[];
  mistakes: number[];
  gameWords: Word[];
  isSaving: boolean;
  saveError: string | null;
  /** Optional Quick Play context. When the player is a QP guest, this
   *  carries the active session_code so the rating prompt can write to
   *  public.quick_play_ratings instead of users.first_rating (guests
   *  have no users row). Caller passes undefined for non-QP games. */
  quickPlaySessionCode?: string;
  toasts: Toast[];
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setMistakes: React.Dispatch<React.SetStateAction<number[]>>;
  setFeedback: React.Dispatch<React.SetStateAction<"correct" | "wrong" | "show-answer" | null>>;
  setWordAttempts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  setHiddenOptions: React.Dispatch<React.SetStateAction<number[]>>;
  setSpellingInput: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  /** Exit Quick Play entirely — only used for guest users. */
  onQuickPlayExit?: () => void;
}

export default function GameFinishedView({
  user, score, xp, streak, badges, mistakes, gameWords,
  isSaving, saveError, quickPlaySessionCode, toasts, confirmDialog, setConfirmDialog,
  setIsFinished, setScore, setCurrentIndex, setMistakes, setFeedback,
  setWordAttempts, setHiddenOptions, setSpellingInput,
  setAssignmentWords, setShowModeSelection, setView,
  onQuickPlayExit,
}: GameFinishedViewProps) {
  const isGuest = !!user?.isGuest;

  // ─── Rating prompt for students ────────────────────────────────────
  //
  // AUTHENTICATED student: fire ONCE at the moment of success — first
  // game with a passing score (≥70).  Skip if already rated or dismissed
  // within the last 7 days.  Writes to users.first_rating.
  //
  // QUICK PLAY GUEST: fire after EVERY game finished in QP (still
  // gated on score ≥ 70 to capture happy-moment ratings).  Writes to
  // quick_play_ratings.  Per-session dismiss tracked in localStorage
  // so we don't re-prompt the same guest twice in the same session.
  const [ratingDismissedThisSession, setRatingDismissedThisSession] = useState(false);

  // Localstorage key for guest "I already dismissed in this QP session".
  const guestRatingKey = quickPlaySessionCode && user?.displayName
    ? `vocaband_qp_rated_${quickPlaySessionCode}`
    : null;
  const guestAlreadyHandled = (() => {
    if (!guestRatingKey) return false;
    try { return localStorage.getItem(guestRatingKey) === "1"; } catch { return false; }
  })();

  // QP guests are by definition a single-session experience, so we don't
  // gate the rating on a "happy moment" score >= 70 the way we do for
  // signed-up students.  A QP guest who plays one game and never returns
  // is exactly who we need feedback from — we'd rather have a low rating
  // than no signal at all.  The localStorage flag (vocaband_qp_rated_<code>)
  // still prevents nagging within the same session.
  const eligibleForGuestRating =
    !!user &&
    isGuest &&
    !!quickPlaySessionCode &&
    !ratingDismissedThisSession &&
    !guestAlreadyHandled;

  const eligibleForUserRating =
    !!user &&
    !isGuest &&
    user.firstRating == null &&
    score >= 70 &&
    !ratingDismissedThisSession &&
    (!user.ratingDismissedAt ||
      Date.now() - new Date(user.ratingDismissedAt).getTime() > 7 * 24 * 60 * 60 * 1000);

  // Shared reset used by every action button below — clears per-round
  // state so the next mode starts clean.
  const resetRound = () => {
    setIsFinished(false);
    setScore(0);
    setCurrentIndex(0);
    setMistakes([]);
    setFeedback(null);
    setWordAttempts({});
    setHiddenOptions([]);
    setSpellingInput("");
  };
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];
  const t = activeThemeConfig.colors;
  const isDark = t.bg.includes('gray-9') || t.bg.includes('gray-950');

  // i18n strings — all visible chrome lives in the locale file.
  // Uses `tt` to avoid colliding with the existing theme variable `t`.
  const { language, dir } = useLanguage();
  const tt = gameFinishedT[language];
  const displayName = user?.displayName || "";
  const fillName = (template: string) => template.replace("{name}", displayName);

  return (
    <div dir={dir} className={`min-h-screen ${t.bg} flex flex-col items-center justify-center p-4 sm:p-6 text-center`}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Trophy className="w-20 h-20 sm:w-24 sm:h-24 text-yellow-500 mb-4 mx-auto" />
      </motion.div>
      <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${t.text}`}>
        {fillName(tt.headlines[secureRandomInt(tt.headlines.length)])}
      </h1>
      <p className={`text-lg sm:text-xl mb-6 ${isDark ? 'text-gray-300' : 'text-stone-600'}`}>
        {tt.subtitles[secureRandomInt(tt.subtitles.length)]}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-lg">
        <div className={`${t.card} p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center`}>
          <p className={`text-xs sm:text-sm uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-stone-500'} mb-1`}>{tt.finalScore}</p>
          <p className="text-4xl sm:text-6xl font-black text-blue-500">{score}</p>
        </div>
        <div className={`${t.card} p-5 sm:p-8 rounded-3xl shadow-md flex-1 text-center`}>
          <p className={`text-xs sm:text-sm uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-stone-500'} mb-1`}>{tt.totalXp}</p>
          <p className="text-4xl sm:text-6xl font-black text-blue-600">{xp}</p>
        </div>
        {streak > 0 && (
          <div className={`${t.card} p-6 sm:p-8 rounded-3xl shadow-md border-2 border-orange-100 flex-1 text-center`}>
            <p className="text-sm uppercase tracking-widest text-orange-500 mb-1">{tt.streak}</p>
            <p className="text-5xl sm:text-6xl font-black text-orange-600">{streak} 🔥</p>
          </div>
        )}
      </div>
      {/* Accuracy summary */}
      {gameWords.length > 0 && (
        <div className={`${t.card} rounded-2xl shadow-sm px-6 py-3 mb-6 ${isDark ? 'text-gray-300' : 'text-stone-600'}`}>
          {tt.correctOf(gameWords.length - mistakes.length, gameWords.length)}
          {mistakes.length > 0 && <span className="ml-2 text-rose-500 font-bold">{tt.toReview(mistakes.length)}</span>}
        </div>
      )}
      {badges.length > 0 && (
        <div className="mb-8">
          <p className={`text-xs font-black ${isDark ? 'text-gray-500' : 'text-stone-400'} uppercase mb-4 tracking-widest`}>{tt.badgesEarned}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {badges.map(badge => (
              <motion.div
                key={badge}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`${t.card} px-6 py-3 rounded-2xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-stone-100'} flex items-center gap-2`}
              >
                <span className="text-xl">{badge.split(' ')[0]}</span>
                <span className={`font-bold ${t.text}`}>{badge.split(' ').slice(1).join(' ')}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {isSaving ? (
        <div className="flex items-center gap-2 text-yellow-600 mb-4">
          <RefreshCw className="animate-spin" size={18} />
          <span className="font-semibold">{tt.savingScore}</span>
        </div>
      ) : saveError ? (
        <div className="flex items-center gap-2 text-red-500 mb-4">
          <AlertTriangle size={18} />
          <span className="text-sm">{saveError}</span>
        </div>
      ) : null}
      {/* "What's next?" action panel — designed to feel like a popup card
          so students see their three options at once instead of having
          to scroll through a cramped button stack.  Primary (Try Again)
          is the big filled button.  Secondary (Choose Another Mode) is
          the new path the user asked for — stays inside the assignment,
          just goes back to mode selection without detouring through the
          dashboard.  Tertiary (Back to Dashboard) is the low-weight
          escape hatch. */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.3 }}
        className={`${t.card} rounded-[28px] shadow-2xl border ${isDark ? 'border-gray-700' : 'border-stone-200'} p-5 sm:p-6 w-full max-w-md`}
      >
        <p className={`text-[11px] font-black uppercase tracking-widest text-center mb-3 ${isDark ? 'text-gray-400' : 'text-stone-400'}`}>
          {tt.whatsNext}
        </p>

        {/* Phase-1 redesign (2026-04-30): collapsed from 4 buttons
            (Try Again / Choose Another Mode / Review / Back to
            Dashboard) to ONE big primary "Back to Modes" + an
            optional Review ghost button + a tiny "Exit to dashboard"
            text link.  The kid always knows which one to tap.

            "Try Again" was removed — replaying the same mode now
            requires Back-to-Modes → tap the same mode card again.
            One extra tap, but eliminates the "wait, did I press the
            right one?" hesitation teachers reported. */}
        <div className="flex flex-col gap-3">
          {isGuest ? (
            // Quick Play guest layout — same shape as authenticated
            // students: one big primary button + tiny exit link below.
            <>
              <button
                onClick={() => {
                  resetRound();
                  setShowModeSelection(true);
                }}
                disabled={isSaving}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white px-6 py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Grid3X3 size={22} />
                {tt.backToModes}
              </button>
              <button
                onClick={() => {
                  resetRound();
                  if (onQuickPlayExit) onQuickPlayExit();
                }}
                disabled={isSaving}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'}`}
              >
                <LogOut size={12} />
                {tt.exitQuickPlay}
              </button>
            </>
          ) : (
            <>
              {/* PRIMARY — Back to Modes.  Filling 100% width, py-5,
                  emoji, large font.  This is the only tap target a kid
                  needs to find. */}
              <button
                onClick={() => {
                  resetRound();
                  setShowModeSelection(true);
                }}
                disabled={isSaving}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white px-6 py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Grid3X3 size={22} />
                {tt.backToModes}
              </button>

              {/* OPTIONAL — Review missed words (only when there are
                  mistakes).  Ghost button between the primary and the
                  exit link so it's visible but doesn't compete. */}
              {mistakes.length > 0 && (
                <button
                  onClick={() => {
                    const missedWords = gameWords.filter(w => mistakes.includes(w.id));
                    if (missedWords.length > 0) {
                      setAssignmentWords(missedWords);
                    }
                    resetRound();
                  }}
                  disabled={isSaving}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 ${isDark ? 'bg-rose-900/40 text-rose-200 hover:bg-rose-900/60' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'}`}
                >
                  {tt.reviewMissedWord(mistakes.length)}
                </button>
              )}

              {/* TINY SECONDARY — Exit to dashboard.  Discoverable but
                  visually de-emphasised so kids gravitate to the big
                  primary button instead. */}
              <button
                onClick={() => {
                  resetRound();
                  setShowModeSelection(true);
                  setView("student-dashboard");
                }}
                disabled={isSaving}
                type="button"
                style={{ touchAction: 'manipulation' }}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'}`}
              >
                <Home size={12} />
                {tt.exitToDashboard}
              </button>
            </>
          )}
        </div>
      </motion.div>

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
              <span className="flex-1">{toast.message}</span>
              {toast.action && (
                <button onClick={toast.action.onClick} className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error Tracking Panel (Debug Mode) */}
      <ErrorTrackingPanel />

      {/* Rating prompt — two paths:
          - AUTHENTICATED student: writes to users.first_rating.
          - QUICK PLAY GUEST: writes to quick_play_ratings keyed by
            (session_code, nickname).  Per-session dismiss in
            localStorage so we don't nag during the same QP. */}
      {(eligibleForUserRating || eligibleForGuestRating) && user && (
        <RatingPrompt
          user={user}
          kind="student"
          guestStorage={
            eligibleForGuestRating && quickPlaySessionCode && guestRatingKey
              ? {
                  sessionCode: quickPlaySessionCode,
                  nickname: user.displayName || "Anonymous",
                  dismissedKey: guestRatingKey,
                }
              : undefined
          }
          onDone={() => setRatingDismissedThisSession(true)}
        />
      )}

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
