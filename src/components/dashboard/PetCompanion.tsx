import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Sparkles, X, Gift } from "lucide-react";
import { PET_MILESTONES, type PetMilestone } from "../../constants/game";

interface PetCompanionProps {
  /** Student's current XP — drives pet level. */
  xp: number;
  /** Student's display name, used in the nudge copy. */
  displayName: string;
  /** The current pet stage (from useRetention so source of truth is shared). */
  currentStage: PetMilestone;
  /** The next stage the student is working toward, if any. */
  nextStage: PetMilestone | null;
  /** A reached-but-unclaimed milestone, or null. */
  claimableMilestone: PetMilestone | null;
  /** Callback when the student taps "Claim reward" on the pet. */
  onClaim: (milestone: PetMilestone) => void;
}

/**
 * A persistent little "pet" that sits on the dashboard as a floating
 * companion bubble in the bottom-right corner. Tap it → opens a small
 * card showing the pet's current species, level progress, and — crucially
 * — a "Claim reward" button the moment the student crosses an evolution
 * threshold.  Each milestone grants XP, a free avatar, a free title, or
 * a free frame (per PET_MILESTONES in constants).
 *
 * Evolution is pure client-side derivation from XP; claims are persisted
 * via useRetention (localStorage, scoped per user).
 */
export default function PetCompanion({
  xp, displayName, currentStage, nextStage, claimableMilestone, onClaim,
}: PetCompanionProps) {
  const [open, setOpen] = useState(false);

  // Gradient glow per stage — cycled deterministically from stage index
  // so students see a different vibe at every evolution.
  const stageIdx = PET_MILESTONES.findIndex(m => m.stage === currentStage.stage);
  const glows = [
    'from-stone-200 to-stone-300',
    'from-yellow-200 to-amber-200',
    'from-orange-200 to-amber-300',
    'from-sky-200 to-indigo-200',
    'from-fuchsia-300 to-violet-300',
    'from-pink-300 to-purple-300',
    'from-violet-300 to-indigo-400',
    'from-amber-200 to-pink-300',
  ];
  const glow = glows[Math.max(0, stageIdx) % glows.length];

  const pct = nextStage
    ? Math.min(100, Math.round(((xp - currentStage.xpRequired) / (nextStage.xpRequired - currentStage.xpRequired)) * 100))
    : 100;

  // Auto-open the card when a new reward becomes claimable — students
  // shouldn't miss an unlock moment.
  const [autoOpened, setAutoOpened] = useState(false);
  if (claimableMilestone && !autoOpened && !open) {
    setAutoOpened(true);
    setOpen(true);
  }

  return (
    <>
      {/* Floating bubble — fixed, bottom-right, above FloatingButtons */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        type="button"
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        style={{ touchAction: 'manipulation' }}
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${glow} shadow-lg flex items-center justify-center border-2 border-white`}
        aria-label="Open pet companion"
        title={currentStage.stage}
      >
        <motion.span
          animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-2xl sm:text-3xl"
        >
          {currentStage.emoji}
        </motion.span>
        {/* Reward-pending indicator — pulsing red dot */}
        {claimableMilestone && (
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 border-2 border-white"
          />
        )}
        {/* Ambient pulse ring */}
        <span className="absolute inset-0 rounded-full bg-white/50 animate-ping opacity-20" />
      </motion.button>

      {/* Detail card */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="pet-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="fixed bottom-40 right-4 sm:bottom-28 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-4"
          >
            <button
              onClick={() => setOpen(false)}
              type="button"
              aria-label="Close"
              className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${glow} flex items-center justify-center text-3xl shadow-sm`}>
                {currentStage.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Your companion</p>
                <h4 className="text-lg font-black text-stone-900 leading-tight truncate">{currentStage.stage}</h4>
                <p className="text-xs text-stone-500">Level {stageIdx + 1}</p>
              </div>
            </div>

            {/* Claimable reward banner — appears the instant a milestone is crossed */}
            {claimableMilestone && (
              <motion.button
                onClick={() => { onClaim(claimableMilestone); setOpen(false); setAutoOpened(false); }}
                type="button"
                style={{ touchAction: 'manipulation' }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full mb-3 relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-left text-white shadow-md"
              >
                <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 bg-yellow-200/40 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                    <Gift size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/85">Evolution reward</p>
                    <p className="font-black text-sm truncate">{claimableMilestone.reward.label}</p>
                  </div>
                  <span className="shrink-0 bg-white/25 backdrop-blur-sm px-2 py-1 rounded-lg font-black text-xs border border-white/30">Claim</span>
                </div>
              </motion.button>
            )}

            {/* Evolution progress */}
            {nextStage ? (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-500">Next: {nextStage.emoji} {nextStage.stage}</span>
                  <span className="text-xs font-bold text-stone-500 tabular-nums">{xp} / {nextStage.xpRequired} XP</span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  {displayName}, earn {nextStage.xpRequired - xp} more XP — next unlock: <span className="font-bold">{nextStage.reward.label}</span>
                </p>
              </>
            ) : (
              <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-fuchsia-200 rounded-xl p-3 flex items-center gap-2">
                <Heart size={16} className="text-fuchsia-600 fill-fuchsia-300" />
                <p className="text-xs font-semibold text-fuchsia-800">
                  Maxed out! You and {currentStage.stage} are unstoppable.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
