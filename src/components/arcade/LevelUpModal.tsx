/**
 * LevelUpModal — full-screen celebration when a student crosses an
 * XP_TITLES tier boundary.  Mounted at App root and driven by
 * `useLevelUp`'s `pending` tier; this component renders nothing when
 * pending is null.
 *
 * Animations:
 *   - Confetti burst (canvas-confetti) capped at 150 particles, skipped
 *     on reduced-motion.
 *   - Trophy emoji scale-pop via motion/react (entry only — no infinite
 *     loop, keeps cost flat on Android).
 *
 * Audio: playLevelUp() fires once on mount; the SFX is procedural Web
 * Audio (no MP3 ship cost).
 *
 * Localisation in EN/HE/AR/RU; RTL handled via `dir` on the panel.
 */
import { useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";
import { playLevelUp } from "../../hooks/useAudio";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_BUTTON_TOUCH, ARCADE_HERO_GRADIENT, ARCADE_REWARD_GRADIENT } from "./theme";

interface LevelUpModalProps {
  tier: { title: string; emoji: string; min: number } | null;
  onClose: () => void;
}

const STRINGS: Record<Language, {
  headline: string;
  subhead: (title: string) => string;
  cta: string;
}> = {
  en: {
    headline: "LEVEL UP!",
    subhead: (title) => `You're now a ${title}`,
    cta: "Awesome",
  },
  he: {
    headline: "עלית רמה!",
    subhead: (title) => `אתה עכשיו ${title}`,
    cta: "מעולה",
  },
  ar: {
    headline: "ترقية!",
    subhead: (title) => `أنت الآن ${title}`,
    cta: "رائع",
  },
  ru: {
    headline: "НОВЫЙ УРОВЕНЬ!",
    subhead: (title) => `Теперь ты ${title}`,
    cta: "Класс",
  },
};

export default function LevelUpModal({ tier, onClose }: LevelUpModalProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!tier) return;
    playLevelUp();
    if (reduced) return;
    // Two angled bursts — feels like a stage spotlight rather than a single
    // central explosion.  150 particles total split across both calls.
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { x: 0.2, y: 0.6 },
      colors: ["#22d3ee", "#a78bfa", "#f59e0b", "#fb7185"],
    });
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { x: 0.8, y: 0.6 },
      colors: ["#22d3ee", "#a78bfa", "#f59e0b", "#fb7185"],
    });
  }, [tier, reduced]);

  if (!tier) return null;
  const t = STRINGS[language];

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-headline"
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`relative mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-3xl ${ARCADE_HERO_GRADIENT} p-8 text-center text-white shadow-2xl ring-4 ring-amber-300/60`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`${ARCADE_BUTTON_TOUCH} absolute top-3 right-3 rounded-full bg-white/15 p-1.5 text-white/80 hover:bg-white/25`}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <Sparkles className="absolute -top-2 -left-2 h-8 w-8 text-amber-300 drop-shadow" aria-hidden />
        <Sparkles className="absolute -bottom-2 -right-2 h-8 w-8 text-amber-300 drop-shadow" aria-hidden />

        <motion.div
          initial={reduced ? undefined : { scale: 0.4, rotate: -15 }}
          animate={reduced ? undefined : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="text-7xl drop-shadow-lg"
          aria-hidden
        >
          {tier.emoji}
        </motion.div>

        <h2
          id="level-up-headline"
          className="text-3xl font-extrabold tracking-wide drop-shadow-lg sm:text-4xl"
        >
          {t.headline}
        </h2>

        <p className="text-lg font-bold text-white/95">
          {t.subhead(tier.title)}
        </p>

        <button
          type="button"
          onClick={onClose}
          className={`${ARCADE_REWARD_GRADIENT} ${ARCADE_BUTTON_TOUCH} mt-2 rounded-full px-8 py-3 text-base font-extrabold text-amber-950 shadow-lg shadow-amber-900/40 ring-2 ring-white/40`}
        >
          {t.cta}
        </button>
      </motion.div>
    </div>
  );
}
