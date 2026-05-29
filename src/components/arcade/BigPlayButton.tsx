/**
 * BigPlayButton — the hero CTA of the arcade hub.  Tap launches the
 * student's most-relevant next assignment via the same
 * `launchNextAssignment` picker the legacy `NextUpCard` uses, so we
 * don't fork the "what should the student do next" logic.
 *
 * Visual: a large round gradient button with a subtle pulse halo.  The
 * pulse uses a CSS `@keyframes`-style animation (Tailwind's
 * `animate-pulse` on a sibling) rather than a `motion.div` infinite
 * loop — keeps the cost flat (one compositor layer, no RAF callback).
 * On reduced-motion the halo is rendered static.
 *
 * Disabled state surfaces when the picker returns nothing (no
 * assignments yet / all locked); we render a calmer "All caught up!"
 * pill instead so the slot doesn't read as broken.
 */
import { Play, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ARCADE_BUTTON_TOUCH, ARCADE_HERO_GRADIENT, ARCADE_PLAY_RING } from "./theme";

interface BigPlayButtonProps {
  onPlay?: () => void;
  /** When provided, replaces the default "PLAY" label — e.g. the
   *  caller can pass the next assignment's title to make the CTA more
   *  concrete ("PLAY: Animals (Set 1)"). */
  label?: string;
}

import type { Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { play: string; allCaught: string }> = {
  en: { play: "PLAY", allCaught: "All caught up!" },
  he: { play: "שחק", allCaught: "סיימת הכול 🎉" },
  ar: { play: "العب", allCaught: "أنجزت كل شيء!" },
  ru: { play: "ИГРАТЬ", allCaught: "Всё готово!" },
};

export default function BigPlayButton({ onPlay, label }: BigPlayButtonProps) {
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language];

  if (!onPlay) {
    return (
      <div className="rounded-full bg-white/15 px-6 py-4 text-base font-bold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
        {t.allCaught}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Pulsing halo — CSS-only, no JS loop.  Disabled on reduced-motion. */}
      {!reduced && (
        <div
          aria-hidden
          className="absolute inset-0 -m-3 animate-ping rounded-full bg-cyan-400/30"
        />
      )}
      <motion.button
        type="button"
        onClick={onPlay}
        whileHover={reduced ? undefined : { scale: 1.04 }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className={`${ARCADE_HERO_GRADIENT} ${ARCADE_PLAY_RING} ${ARCADE_BUTTON_TOUCH} relative flex h-40 w-40 items-center justify-center rounded-full text-white sm:h-48 sm:w-48`}
        aria-label={label ?? t.play}
      >
        <div className="flex flex-col items-center gap-1">
          <Play className="h-12 w-12 fill-white sm:h-14 sm:w-14" aria-hidden />
          <span className="text-xl font-extrabold tracking-wider sm:text-2xl">
            {label ?? t.play}
          </span>
        </div>
        {/* Decorative sparkles in the corner */}
        <Sparkles
          className="absolute -right-2 -top-2 h-7 w-7 text-amber-300 drop-shadow"
          aria-hidden
        />
      </motion.button>
    </div>
  );
}
