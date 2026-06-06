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

export type IslandState = "done" | "next" | "todo" | "locked";

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

  const stateWord =
    state === "done" ? "completed" :
    state === "next" ? "recommended next" :
    state === "locked" ? "locked" : "to play";

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.xPct}%`, top: `${pos.y}px` }}
    >
      <motion.button
        type="button"
        disabled={locked}
        onClick={() => { if (!locked) onTap(); }}
        aria-label={`${name} — ${stateWord}${done ? `, ${mastery} of 3 stars` : ""}`}
        whileTap={reduced || locked ? undefined : { scale: 0.92 }}
        whileHover={reduced || locked ? undefined : { scale: 1.06 }}
        className={`${ARCADE_BUTTON_TOUCH} relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-2xl shadow-lg sm:h-16 sm:w-16 ${
          done ? "ring-[3px] ring-amber-300" :
          next ? "ring-4 ring-amber-300/50 shadow-cyan-500/40" :
          "ring-2 ring-white/25"
        } ${locked ? "opacity-50 grayscale" : ""}`}
      >
        <span aria-hidden className="drop-shadow">{emoji}</span>

        {next && !reduced && (
          <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-400/30" />
        )}

        {done && (
          <span aria-hidden className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star key={i} size={9} strokeWidth={2}
                className={i < mastery ? "text-amber-300" : "text-white/25"}
                fill={i < mastery ? "currentColor" : "none"} />
            ))}
          </span>
        )}

        {done && <Check aria-hidden size={14} strokeWidth={3} className="absolute -bottom-1 -end-1 rounded-full bg-emerald-500 p-0.5 text-white" />}
        {locked && <Lock aria-hidden size={13} className="absolute -bottom-1 -end-1 text-white/70" />}
      </motion.button>

      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-20 -translate-x-1/2 text-center text-[10px] font-bold leading-tight text-white/90 drop-shadow">
        {name}
      </span>
    </div>
  );
}
