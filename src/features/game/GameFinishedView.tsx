import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useUI } from "../../shared/contexts/UIContext";
import { ErrorTrackingPanel } from "../../shared/components/ErrorTrackingPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameFinishedViewProps {
  /** Current user display name */
  displayName: string | undefined;
  score: number;
  xp: number;
  streak: number;
  badges: string[];
  isSaving: boolean;
  saveError: string | null;
  /** Called when user clicks "Choose Another Mode" */
  onExitGame: () => void;
  /** Called when user clicks "Back to Dashboard" */
  onBackToDashboard: () => void;
}

// ---------------------------------------------------------------------------
// Celebration messages (stable arrays, no re-render randomness issues)
// ---------------------------------------------------------------------------

const CONGRATS_MESSAGES = [
  (name: string) => `Kol Hakavod, ${name}!`,
  (name: string) => `Amazing work, ${name}!`,
  (name: string) => `You crushed it, ${name}!`,
  (name: string) => `${name}, you're a star!`,
  (name: string) => `Incredible, ${name}!`,
  (name: string) => `Way to go, ${name}!`,
  (name: string) => `${name} is on fire!`,
  (name: string) => `Bravo, ${name}!`,
];

const SUBTITLE_MESSAGES = [
  "You finished the assignment!",
  "Another challenge conquered!",
  "Your vocabulary is growing!",
  "Keep this momentum going!",
  "You're making great progress!",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GameFinishedView: React.FC<GameFinishedViewProps> = ({
  displayName,
  score,
  xp,
  streak,
  badges,
  isSaving,
  saveError,
  onExitGame,
  onBackToDashboard,
}) => {
  const { toasts, confirmDialog, setConfirmDialog } = useUI();

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
        CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)](displayName ?? "")
      }</h1>
      <p className="text-lg sm:text-xl mb-6">{
        SUBTITLE_MESSAGES[Math.floor(Math.random() * SUBTITLE_MESSAGES.length)]
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
          onClick={onExitGame}
          disabled={isSaving}
          className="bg-black text-white px-12 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >Choose Another Mode</button>
        <button
          onClick={onBackToDashboard}
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

      {/* Error Tracking Panel (Debug Mode) */}
      <ErrorTrackingPanel />

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
};
