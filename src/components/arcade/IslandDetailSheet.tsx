/**
 * Rich bottom sheet that rises when a mode-island is tapped: medallion,
 * name, difficulty, best score, the 3-star target, an XP-on-finish chip,
 * and Play. Dialog over a dim backdrop; honours dir/RTL.
 */
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, X } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_BUTTON_TOUCH } from "./theme";

export interface IslandSheetMode {
  name: string;
  desc: string;
  emoji: ReactNode;
  gradient: string;
  /** Difficulty stars (1..3) + localized label. */
  difficultyStars: number;
  difficultyLabel: string;
  /** Best score 0..100, or null if never played. */
  best: number | null;
}

interface IslandDetailSheetProps {
  open: boolean;
  mode: IslandSheetMode | null;
  onClose: () => void;
  onPlay: () => void;
  reduced: boolean;
}

const STR: Record<Language, {
  play: string; bestNone: string; bestLabel: string; starTarget: string; xpOnFinish: string; close: string;
}> = {
  en: { play: "Play", bestNone: "none yet", bestLabel: "Best", starTarget: "Beat 90% for 3★", xpOnFinish: "+XP on finish", close: "Close" },
  he: { play: "שחק", bestNone: "עדיין אין", bestLabel: "שיא", starTarget: "90% ל-3★", xpOnFinish: "+XP בסיום", close: "סגור" },
  ar: { play: "العب", bestNone: "لا شيء بعد", bestLabel: "الأفضل", starTarget: "90% لـ 3★", xpOnFinish: "+XP عند الإنهاء", close: "إغلاق" },
  ru: { play: "Играть", bestNone: "пока нет", bestLabel: "Рекорд", starTarget: "90% для 3★", xpOnFinish: "+XP в конце", close: "Закрыть" },
};

export default function IslandDetailSheet({ open, mode, onClose, onPlay, reduced }: IslandDetailSheetProps) {
  const { language, dir } = useLanguage();
  const s = STR[language] ?? STR.en;

  return (
    <AnimatePresence>
      {open && mode && (
        <>
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label={mode.name} dir={dir}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl bg-[var(--ios-grouped-bg)] p-6 pb-8 shadow-2xl ring-1 ring-[color:var(--ios-separator)]"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button
              type="button" onClick={onClose} aria-label={s.close}
              className={`${ARCADE_BUTTON_TOUCH} absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ios-fill-tertiary)] text-[color:var(--ios-label)]`}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${mode.gradient} text-3xl shadow`}>
                {mode.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-black text-[color:var(--ios-label)]">{mode.name}</p>
                <p className="text-sm font-bold text-amber-500">
                  {"★".repeat(mode.difficultyStars)}{"☆".repeat(Math.max(0, 3 - mode.difficultyStars))} {mode.difficultyLabel}
                </p>
              </div>
            </div>

            <p className="mt-4 text-base font-medium text-[color:var(--ios-label-secondary)]">{mode.desc}</p>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-[var(--ios-fill-tertiary)] p-3 text-center text-xs font-bold text-sky-600">🎯 {s.starTarget}</div>
              <div className="rounded-xl bg-[var(--ios-fill-tertiary)] p-3 text-center text-xs font-bold text-amber-600">
                ⭐ {s.bestLabel}<br />{mode.best == null ? s.bestNone : `${mode.best}%`}
              </div>
              <div className="rounded-xl bg-[var(--ios-fill-tertiary)] p-3 text-center text-xs font-bold text-emerald-600">✨ {s.xpOnFinish}</div>
            </div>

            <button
              type="button" onClick={onPlay}
              className={`${ARCADE_BUTTON_TOUCH} signature-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black text-white shadow-lg`}
            >
              <Play size={20} className="fill-white" /> {s.play}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
