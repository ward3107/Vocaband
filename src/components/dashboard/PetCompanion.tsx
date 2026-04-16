import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Sparkles, X } from "lucide-react";

interface PetCompanionProps {
  /** Student's current XP — drives pet level. */
  xp: number;
  /** Student's display name, used in the nudge copy. */
  displayName: string;
}

// Pet species the student unlocks as they level up. Emoji keeps it zero-
// asset for now; easy to swap to an image sprite later.
const PET_STAGES: Array<{ minXp: number; emoji: string; name: string; vibe: string; glow: string }> = [
  { minXp: 0,    emoji: '🥚', name: 'Mystery Egg',    vibe: 'Keep playing to hatch it!', glow: 'from-stone-200 to-stone-300' },
  { minXp: 50,   emoji: '🐣', name: 'Tiny Hatchling',  vibe: 'Just hatched — say hi!',    glow: 'from-yellow-200 to-amber-200' },
  { minXp: 200,  emoji: '🦊', name: 'Fox Buddy',       vibe: 'Curious and clever',        glow: 'from-orange-200 to-amber-300' },
  { minXp: 500,  emoji: '🦅', name: 'Sky Hawk',        vibe: 'Ready to soar',              glow: 'from-sky-200 to-indigo-200' },
  { minXp: 1000, emoji: '🐉', name: 'Dragon Friend',   vibe: 'Legendary!',                 glow: 'from-fuchsia-300 to-violet-300' },
  { minXp: 2500, emoji: '🦄', name: 'Mystic Unicorn',  vibe: 'Rare + mythical',            glow: 'from-pink-300 to-purple-300' },
];

/**
 * A persistent little "pet" that sits on the dashboard as a floating
 * companion bubble in the bottom-right corner. Tap it → opens a small
 * card showing the pet's current species, level progress, and a cute
 * line. It evolves as the student earns XP, so students have a visible
 * milestone independent from the XP number.
 *
 * Pure client-side derivation from XP — no schema change, no extra
 * fetches. If we later want pet customisation (names, colors, feeding),
 * that becomes its own migration + table.
 */
export default function PetCompanion({ xp, displayName }: PetCompanionProps) {
  const [open, setOpen] = useState(false);

  const { stage, nextStage, pct } = useMemo(() => {
    // Find current stage = highest entry where minXp ≤ xp.
    let currentIdx = 0;
    for (let i = PET_STAGES.length - 1; i >= 0; i--) {
      if (xp >= PET_STAGES[i].minXp) { currentIdx = i; break; }
    }
    const current = PET_STAGES[currentIdx];
    const next = PET_STAGES[currentIdx + 1] ?? null;
    const progress = next
      ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
      : 100;
    return { stage: current, nextStage: next, pct: progress };
  }, [xp]);

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
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${stage.glow} shadow-lg flex items-center justify-center border-2 border-white`}
        aria-label="Open pet companion"
        title={stage.name}
      >
        <motion.span
          animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-2xl sm:text-3xl"
        >
          {stage.emoji}
        </motion.span>
        {/* Pulse ring to draw attention the first time */}
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
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stage.glow} flex items-center justify-center text-3xl shadow-sm`}>
                {stage.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Your companion</p>
                <h4 className="text-lg font-black text-stone-900 leading-tight truncate">{stage.name}</h4>
                <p className="text-xs text-stone-500">{stage.vibe}</p>
              </div>
            </div>

            {/* Evolution progress */}
            {nextStage ? (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-500">Next: {nextStage.emoji} {nextStage.name}</span>
                  <span className="text-xs font-bold text-stone-500 tabular-nums">{xp} / {nextStage.minXp} XP</span>
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
                  {displayName}, earn {nextStage.minXp - xp} more XP to evolve!
                </p>
              </>
            ) : (
              <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-fuchsia-200 rounded-xl p-3 flex items-center gap-2">
                <Heart size={16} className="text-fuchsia-600 fill-fuchsia-300" />
                <p className="text-xs font-semibold text-fuchsia-800">
                  Maxed out! You and {stage.name} are unstoppable.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
