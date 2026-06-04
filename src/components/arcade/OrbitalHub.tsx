/**
 * OrbitalHub — the circular student dashboard hero.  The pet-evolution
 * core sits in the centre; the student's destinations orbit around it as
 * tappable circular medallions arranged on a ring.  A slow decorative
 * dashed ring spins behind them to sell the "orbit" feel without ever
 * moving the tap targets (the buttons themselves are static — only the
 * ornament rotates).
 *
 * The hub owns the *catalogue* (emoji, gradient, localized label per
 * destination) so callers only wire up behaviour: a `key`, an `onClick`,
 * an optional count `badge`, and whether the circle is `disabled`.  This
 * keeps each destination's look in one place per the project's
 * "each item gets its own gradient" rule.
 *
 * Positioning uses trig — every circle is placed by angle around the
 * ring, starting at the top and going clockwise.  Because there's no
 * Tailwind class for an arbitrary angle, the per-circle left/top is the
 * one legitimately dynamic style here.
 */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ARCADE_BUTTON_TOUCH } from "./theme";

export type OrbitKey =
  | "play"
  | "tasks"
  | "shop"
  | "leaderboard"
  | "practice"
  | "missions"
  | "boosters"
  | "badges";

export interface OrbitItem {
  key: OrbitKey;
  onClick: () => void;
  /** Optional count chip on the medallion (e.g. due reviews, # tasks). */
  badge?: number;
  /** Greys the circle + blocks the tap (e.g. Play with nothing queued). */
  disabled?: boolean;
}

interface OrbitalHubProps {
  /** The pet-evolution core rendered dead-centre of the ring. */
  center: ReactNode;
  items: OrbitItem[];
}

/** Per-destination look. Emoji + its own gradient (CLAUDE.md UI rule). */
const CATALOGUE: Record<OrbitKey, { emoji: string; gradient: string }> = {
  play: { emoji: "🎮", gradient: "bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500" },
  tasks: { emoji: "📋", gradient: "bg-gradient-to-br from-emerald-400 to-teal-500" },
  shop: { emoji: "🛍️", gradient: "bg-gradient-to-br from-fuchsia-400 via-pink-500 to-rose-500" },
  leaderboard: { emoji: "🏆", gradient: "bg-gradient-to-br from-amber-300 to-orange-500" },
  practice: { emoji: "⚡", gradient: "bg-gradient-to-br from-sky-400 to-blue-500" },
  missions: { emoji: "🎯", gradient: "bg-gradient-to-br from-indigo-400 to-violet-500" },
  boosters: { emoji: "🚀", gradient: "bg-gradient-to-br from-rose-400 to-orange-400" },
  badges: { emoji: "🎖️", gradient: "bg-gradient-to-br from-yellow-300 to-amber-500" },
};

const LABELS: Record<Language, Record<OrbitKey, string>> = {
  en: { play: "Play", tasks: "Tasks", shop: "Shop", leaderboard: "Ranks", practice: "Practice", missions: "Missions", boosters: "Boosts", badges: "Badges" },
  he: { play: "שחק", tasks: "משימות", shop: "חנות", leaderboard: "דירוג", practice: "תרגול", missions: "אתגרים", boosters: "בוסטים", badges: "תגים" },
  ar: { play: "العب", tasks: "المهام", shop: "المتجر", leaderboard: "الترتيب", practice: "تدريب", missions: "مهام", boosters: "معززات", badges: "أوسمة" },
  ru: { play: "Играть", tasks: "Задания", shop: "Магазин", leaderboard: "Рейтинг", practice: "Практика", missions: "Миссии", boosters: "Бусты", badges: "Значки" },
};

export default function OrbitalHub({ center, items }: OrbitalHubProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const labels = LABELS[language] || LABELS.en;

  const n = items.length;
  const step = n > 0 ? 360 / n : 0;
  // Ring radius as a % of the (square) container's half-size. Tuned so
  // the medallions + their labels clear the centre pet and don't spill
  // past the container edge on a narrow phone.
  const R = 37;

  return (
    <div
      dir={dir}
      className="relative mx-auto aspect-square w-[min(92vw,30rem)] select-none"
    >
      {/* Decorative orbit path — a dashed ring that slowly rotates. Pure
          ornament (pointer-events-none); the tap targets never move. */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-white/15"
        style={{ width: `${R * 2}%`, height: `${R * 2}%`, x: "-50%", y: "-50%" }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 80, repeat: Infinity, ease: "linear" }}
      />

      {/* Pet-evolution core — dead centre of the ring. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {center}
      </div>

      {/* Orbiting destination circles. */}
      {items.map((item, i) => {
        const angle = (-90 + i * step) * (Math.PI / 180);
        const x = 50 + R * Math.cos(angle);
        const y = 50 + R * Math.sin(angle);
        const { emoji, gradient } = CATALOGUE[item.key];
        const isPlay = item.key === "play";
        const size = isPlay
          ? "h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 text-3xl sm:text-4xl"
          : "h-14 w-14 sm:h-16 sm:w-16 text-2xl sm:text-3xl";

        return (
          <motion.div
            key={item.key}
            className="absolute flex flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 20, delay: 0.06 * i }}
          >
            <motion.button
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              aria-label={labels[item.key]}
              whileHover={reduced || item.disabled ? undefined : { scale: 1.08 }}
              whileTap={reduced || item.disabled ? undefined : { scale: 0.92 }}
              className={`${gradient} ${ARCADE_BUTTON_TOUCH} relative flex ${size} items-center justify-center rounded-full shadow-lg ring-2 ${
                isPlay ? "ring-amber-300/70 shadow-cyan-500/40" : "ring-white/30"
              } ${item.disabled ? "opacity-40 grayscale" : ""}`}
            >
              <span aria-hidden className="drop-shadow">{emoji}</span>
              {/* Soft pulse halo behind the Play circle so the primary
                  action reads as the hero even out on the ring. */}
              {isPlay && !item.disabled && !reduced && (
                <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-400/30" />
              )}
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white shadow">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </motion.button>
            <span className="mt-1 w-16 text-center text-[10px] font-bold leading-tight text-white/90 sm:text-xs">
              {labels[item.key]}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
