/**
 * One mode-island medallion on the picker map. Pure presentation — the
 * parent decides position and state. Keeps each mode's own gradient per
 * the project's "each item gets its own gradient" rule.
 */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Lock, Star } from "lucide-react";
import type { IslandPos } from "./islandLayout";
import { ARCADE_BUTTON_TOUCH } from "./theme";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";

export type IslandState = "done" | "next" | "todo" | "locked";

// Localized accessibility strings for each supported language.
// The hook uses a global singleton and returns 'en' outside a provider,
// so this map must always include 'en' as the safe default.
const A11Y: Record<Language, { done: string; next: string; todo: string; locked: string; stars: (n: number) => string }> = {
  en: { done: "completed", next: "recommended next", todo: "to play", locked: "locked", stars: (n) => `${n} of 3 stars` },
  he: { done: "הושלם", next: "הבא המומלץ", todo: "לשחק", locked: "נעול", stars: (n) => `${n} מתוך 3 כוכבים` },
  ar: { done: "مكتمل", next: "التالي المقترح", todo: "للعب", locked: "مقفل", stars: (n) => `${n} من 3 نجوم` },
  ru: { done: "пройдено", next: "рекомендуется далее", todo: "играть", locked: "заблокировано", stars: (n) => `${n} из 3 звёзд` },
};

interface ModeIslandProps {
  name: string;
  emoji: ReactNode;
  gradient: string;
  state: IslandState;
  mastery: number; // 0..3
  pos: IslandPos;
  onTap: () => void;
  reduced: boolean;
}

export default function ModeIsland({
  name, emoji, gradient, state, mastery, pos, onTap, reduced,
}: ModeIslandProps) {
  const locked = state === "locked";
  const done = state === "done";
  const next = state === "next";

  // useLanguage uses a global singleton — safe outside a LanguageProvider
  // (returns 'en' as the default when no provider wraps the component).
  const { language } = useLanguage();
  const L = A11Y[language] ?? A11Y.en;

  const stateWord =
    state === "done" ? L.done :
    state === "next" ? L.next :
    state === "locked" ? L.locked : L.todo;

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.xPct}%`, top: `${pos.y}px` }}
    >
      <motion.button
        type="button"
        disabled={locked}
        onClick={() => { if (!locked) onTap(); }}
        aria-label={`${name} — ${stateWord}${done ? `, ${L.stars(mastery)}` : ""}`}
        whileTap={reduced || locked ? undefined : { scale: 0.92 }}
        whileHover={reduced || locked ? undefined : { scale: 1.06 }}
        className={`${ARCADE_BUTTON_TOUCH} relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-4xl shadow-lg sm:h-28 sm:w-28 sm:text-5xl ${
          done ? "ring-[3px] ring-amber-300" :
          next ? "ring-4 ring-amber-300/50 shadow-cyan-500/40" :
          "ring-2 ring-white/25"
        } ${locked ? "opacity-50 grayscale" : ""}`}
      >
        <span aria-hidden className="drop-shadow">{emoji}</span>

        {next && !reduced && (
          <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-400/30" />
        )}

        {/* Show earned stars whenever mastery > 0, including replay-round
            islands where state="next" but the mode was already completed. */}
        {mastery > 0 && (
          <span aria-hidden className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star key={i} size={12} strokeWidth={2}
                className={i < mastery ? "text-amber-300" : "text-white/25"}
                fill={i < mastery ? "currentColor" : "none"} />
            ))}
          </span>
        )}

        {done && <Check aria-hidden size={18} strokeWidth={3} className="absolute -bottom-1 -end-1 rounded-full bg-emerald-500 p-0.5 text-white" />}
        {locked && <Lock aria-hidden size={16} className="absolute -bottom-1 -end-1 text-white/70" />}
      </motion.button>

      <span className="pointer-events-none absolute left-1/2 top-full mt-2 w-28 -translate-x-1/2 text-center text-xs font-bold leading-tight text-white/90 drop-shadow">
        {name}
      </span>
    </div>
  );
}
