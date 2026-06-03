/**
 * CombosOverlay — in-game chain counter that surfaces at 3+ consecutive
 * correct answers and escalates the visual at 5× and 8×.  Renders
 * absolute-positioned inside GameActiveView so it floats over the
 * answer cards without changing layout.
 *
 * Audio cues (playComboTick on increment, playComboBreak on reset) are
 * fired here rather than from `useCombo` to keep the hook pure.  The
 * SFX functions self-rate-limit, so an auto-skip that re-fires the
 * effect twice within ~80 ms won't stack.
 */
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import {
  playComboBreak,
  playComboTick,
} from "../../hooks/useAudio";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_COMBO_GRADIENT } from "./theme";

interface CombosOverlayProps {
  chain: number;
  multiplier: number;
}

const STRINGS: Record<Language, { combo: string; mega: string }> = {
  en: { combo: "COMBO", mega: "MEGA COMBO!" },
  he: { combo: "קומבו", mega: "מגה קומבו!" },
  ar: { combo: "كومبو", mega: "ميجا كومبو!" },
  ru: { combo: "КОМБО", mega: "МЕГА-КОМБО!" },
};

export default function CombosOverlay({ chain, multiplier }: CombosOverlayProps) {
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language];
  const prevChain = useRef(0);

  useEffect(() => {
    if (chain > prevChain.current && chain >= 3) {
      playComboTick(chain);
    } else if (chain === 0 && prevChain.current >= 3) {
      playComboBreak();
    }
    prevChain.current = chain;
  }, [chain]);

  const visible = chain >= 3;
  const mega = chain >= 8;

  return (
    <div className="pointer-events-none fixed right-3 top-20 z-40 sm:right-6 sm:top-24">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="combo"
            initial={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0, rotate: -8 }}
            animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className={`${ARCADE_COMBO_GRADIENT} flex items-center gap-2 rounded-full px-4 py-2 text-white shadow-lg shadow-amber-500/40 ring-2 ring-white/40`}
          >
            <Zap className="h-5 w-5 fill-white" aria-hidden />
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-extrabold tabular-nums">
                {chain}×
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {mega ? t.mega : t.combo}
              </span>
            </div>
            {multiplier > 1 && (
              <span className="rounded-full bg-white/30 px-2 py-0.5 text-xs font-extrabold backdrop-blur">
                {multiplier}× XP
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
