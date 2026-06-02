/**
 * AchievementToast — renders the queue of unlocked-achievement
 * notifications from `useAchievements.toasts`.  Mounted at App root.
 *
 * Visual: vibrant pill that slides down from the top with the
 * achievement emoji, name, and "+XP" reward badge.  Each toast plays
 * `playAchievement()` on mount (soft chime, rate-limited).
 *
 * Stacks vertically when multiple unlocks fire in the same event
 * (e.g. crossing both "first_game" and "perfect_1" in a single
 * finish).  Each item auto-dismisses via useAchievements' timer; the
 * tap-to-dismiss is a nice-to-have.
 */
import { AnimatePresence, motion } from "motion/react";
import { Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AchievementToastItem } from "../../hooks/useAchievements";
import { playAchievement } from "../../hooks/useAudio";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_BUTTON_TOUCH, ARCADE_REWARD_GRADIENT } from "./theme";

interface AchievementToastProps {
  toasts: AchievementToastItem[];
  onDismiss: (id: string) => void;
}

const STRINGS: Record<Language, { unlocked: string }> = {
  en: { unlocked: "Achievement unlocked!" },
  he: { unlocked: "הישג נפתח!" },
  ar: { unlocked: "تم فتح إنجاز!" },
  ru: { unlocked: "Достижение!" },
};

export default function AchievementToast({ toasts, onDismiss }: AchievementToastProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language];
  // Fire the chime once per new toast id, not per render.
  const playedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const toast of toasts) {
      if (!playedIds.current.has(toast.id)) {
        playedIds.current.add(toast.id);
        playAchievement();
      }
    }
  }, [toasts]);

  return (
    <div
      dir={dir}
      className="pointer-events-none fixed top-3 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-3"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => onDismiss(toast.id)}
            initial={reduced ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.9 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={`${ARCADE_REWARD_GRADIENT} ${ARCADE_BUTTON_TOUCH} pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-amber-950 shadow-2xl shadow-amber-900/40 ring-2 ring-white/40`}
            aria-label={`${t.unlocked} ${toast.name}`}
          >
            <span className="text-3xl drop-shadow" aria-hidden>
              {toast.emoji}
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-start text-start">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {t.unlocked}
              </span>
              <span className="truncate text-base font-extrabold">{toast.name}</span>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-950/20 px-2 py-1 text-xs font-extrabold">
              <Trophy className="h-3 w-3" aria-hidden />
              +{toast.xpReward}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
