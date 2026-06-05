import { motion, AnimatePresence } from "motion/react";
import { Heart, Sparkles, X, Gift } from "lucide-react";
import { PET_MILESTONES, type PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

interface PetCompanionProps {
  /** Whether the info card is open — controlled by the parent (the
   *  central orbital pet's tap toggles it; a claimable reward auto-opens
   *  it). */
  open: boolean;
  /** Close the card (backdrop tap / X / after claiming). */
  onClose: () => void;
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
 * The pet's info/claim card.  No longer a floating corner companion —
 * the orbital hub's centre pet IS the bubble now, so this is just the
 * detail surface it opens: current species, level progress, and — when a
 * milestone is crossed — a "Claim reward" button.  Rendered as a centred
 * popover over a dim backdrop so it reads as opening "from" the pet tap.
 *
 * Evolution is pure client-side derivation from XP; claims are persisted
 * via useRetention (localStorage, scoped per user).
 */
export default function PetCompanion({
  open, onClose, xp, displayName, currentStage, nextStage, claimableMilestone, onClaim,
}: PetCompanionProps) {
  const { language, dir } = useLanguage();
  const t = studentDashboardT[language];

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pet-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          dir={dir}
        >
          <motion.div
            key="pet-card"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="relative w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              type="button"
              aria-label={t.close}
              className="absolute top-3 end-3 flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={14} />
            </button>

            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${glow} text-3xl shadow-sm`}>
                {currentStage.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t.yourCompanion}</p>
                <h4 className="truncate text-lg font-black leading-tight text-stone-900">{currentStage.stage}</h4>
                <p className="text-xs text-stone-500">{t.petLevel(stageIdx + 1)}</p>
              </div>
            </div>

            {/* Claimable reward banner — appears the instant a milestone is crossed */}
            {claimableMilestone && (
              <motion.button
                onClick={() => { onClaim(claimableMilestone); onClose(); }}
                type="button"
                style={{ touchAction: 'manipulation' }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative mb-3 w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-start text-white shadow-md"
              >
                <div aria-hidden className="pointer-events-none absolute -top-4 -end-4 h-20 w-20 rounded-full bg-yellow-200/40 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/25 backdrop-blur-sm">
                    <Gift size={18} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/85">{t.evolutionReward}</p>
                    <p className="truncate text-sm font-black">{claimableMilestone.reward.label}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-white/30 bg-white/25 px-2 py-1 text-xs font-black backdrop-blur-sm">{t.petClaim}</span>
                </div>
              </motion.button>
            )}

            {/* Evolution progress */}
            {nextStage ? (
              <>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">{t.petNext(nextStage.emoji, nextStage.stage)}</span>
                  <span className="text-xs font-bold tabular-nums text-stone-500">{t.petXpProgress(xp, nextStage.xpRequired)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: pct / 100 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                    className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                  />
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                  <Sparkles size={12} className="text-amber-500" />
                  {t.petEvolutionTip(displayName, nextStage.xpRequired - xp, nextStage.reward.label)}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-3">
                <Heart size={16} className="fill-fuchsia-300 text-fuchsia-600" />
                <p className="text-xs font-semibold text-fuchsia-800">
                  {t.petMaxedOut(currentStage.stage)}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
