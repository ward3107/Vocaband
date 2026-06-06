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
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-label={mode.name} dir={dir}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl bg-gradient-to-b from-indigo-950 to-violet-900 p-5 shadow-2xl ring-1 ring-white/10"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button
              type="button" onClick={onClose} aria-label={s.close}
              className={`${ARCADE_BUTTON_TOUCH} absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white`}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${mode.gradient} text-2xl shadow`}>
                {mode.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-black text-white">{mode.name}</p>
                <p className="text-xs font-bold text-amber-300">
                  {"★".repeat(mode.difficultyStars)}{"☆".repeat(Math.max(0, 3 - mode.difficultyStars))} {mode.difficultyLabel}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm font-medium text-indigo-100/90">{mode.desc}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-cyan-200">🎯 {s.starTarget}</div>
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-amber-200">
                ⭐ {s.bestLabel}<br />{mode.best == null ? s.bestNone : `${mode.best}%`}
              </div>
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-emerald-200">{s.xpOnFinish}</div>
            </div>

            <button
              type="button" onClick={onPlay}
              className={`${ARCADE_BUTTON_TOUCH} mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-base font-black text-indigo-950 shadow`}
            >
              <Play size={18} className="fill-indigo-950" /> {s.play}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
