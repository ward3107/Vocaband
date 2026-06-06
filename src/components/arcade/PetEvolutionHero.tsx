/**
 * PetEvolutionHero — the arcade hub centerpiece. Pure presentation: the
 * XP ring (appearance + rewards from the XP ladder) is the focal point,
 * `mood` (passed in, daily-activity) drives only the face, PLAY is the
 * primary CTA. RTL mirrors the mood badge + locked medallion via logical
 * start/end.
 */
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  ARCADE_HERO_GRADIENT,
  ARCADE_REWARD_GRADIENT,
  ARCADE_PLAY_RING,
  ARCADE_BUTTON_TOUCH,
} from "./theme";

type Mood = "happy" | "neutral" | "sad" | "very-sad";

const SIZE = 210;
const STROKE = 12;

const MOOD: Record<Mood, { face: string; halo: string; chip: string }> = {
  happy: { face: "😊", halo: "bg-emerald-400/30", chip: "bg-emerald-400/20 text-emerald-100" },
  neutral: { face: "😐", halo: "bg-amber-400/30", chip: "bg-amber-400/20 text-amber-100" },
  sad: { face: "😟", halo: "bg-rose-400/30", chip: "bg-rose-400/20 text-rose-100" },
  "very-sad": { face: "😢", halo: "bg-rose-600/35", chip: "bg-rose-600/25 text-rose-100" },
};

const STRINGS: Record<Language, {
  playedToday: string;
  daysAway: (n: number) => string;
  toNext: (xpLeft: number, emoji: string, stage: string) => string;
  fullyEvolved: string;
  nextUnlock: (label: string) => string;
  claim: (label: string) => string;
  playToGrow: (stage: string) => string;
}> = {
  en: {
    playedToday: "Played today",
    daysAway: (n) => `${n} day${n === 1 ? "" : "s"} away`,
    toNext: (x, e, s) => `${x} XP → ${e} ${s}`,
    fullyEvolved: "Fully evolved 🎉",
    nextUnlock: (l) => `Next unlock: ${l}`,
    claim: (l) => `🎁 Claim ${l}`,
    playToGrow: (s) => `PLAY to grow your ${s}`,
  },
  he: {
    playedToday: "שיחקת היום",
    daysAway: (n) => `${n} ${n === 1 ? "יום" : "ימים"} בהיעדר`,
    toNext: (x, e, s) => `${x} XP ← ${e} ${s}`,
    fullyEvolved: "התפתח במלואו 🎉",
    nextUnlock: (l) => `פתיחה הבאה: ${l}`,
    claim: (l) => `🎁 אסוף ${l}`,
    playToGrow: (s) => `שחק כדי לגדל את ה־${s}`,
  },
  ar: {
    playedToday: "لعبت اليوم",
    daysAway: (n) => `${n} ${n === 1 ? "يوم" : "أيام"} غياب`,
    toNext: (x, e, s) => `${x} XP ← ${e} ${s}`,
    fullyEvolved: "تطوّر بالكامل 🎉",
    nextUnlock: (l) => `الفتح التالي: ${l}`,
    claim: (l) => `🎁 استلم ${l}`,
    playToGrow: (s) => `العب لتنمية ${s}`,
  },
  ru: {
    playedToday: "Сегодня играл",
    daysAway: (n) => `${n} дн. без игры`,
    toNext: (x, e, s) => `${x} XP → ${e} ${s}`,
    fullyEvolved: "Полностью эволюционировал 🎉",
    nextUnlock: (l) => `Дальше: ${l}`,
    claim: (l) => `🎁 Забрать ${l}`,
    playToGrow: (s) => `ИГРАЙ, чтобы вырастить ${s}`,
  },
};

/** Circular XP-toward-next-evolution ring. Track + gradient arc; the arc
 *  animates its fill (static under reduced motion). */
function EvolutionRing({ progress, reduced }: { progress: number; reduced: boolean }) {
  const r = (SIZE - STROKE) / 2;
  const c = SIZE / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" aria-hidden>
      <defs>
        <linearGradient id="evoRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} />
      <motion.circle
        cx={c} cy={c} r={r} fill="none"
        stroke="url(#evoRing)" strokeWidth={STROKE} strokeLinecap="round"
        strokeDasharray={circ}
        transform={`rotate(-90 ${c} ${c})`}
        initial={reduced ? false : { strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}

interface PetEvolutionHeroProps {
  xp: number;
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  claimableMilestone: PetMilestone | null;
  mood: Mood;
  streak?: number;
  daysSinceLastActive?: number;
  onPlay: () => void;
  onClaim: (m: PetMilestone) => void;
}

export default function PetEvolutionHero({
  xp, currentStage, nextStage, claimableMilestone, mood,
  streak = 0, daysSinceLastActive = 0, onPlay, onClaim,
}: PetEvolutionHeroProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language] || STRINGS.en;
  const m = MOOD[mood];

  const progress = nextStage
    ? Math.min(1, Math.max(0, (xp - currentStage.xpRequired) / (nextStage.xpRequired - currentStage.xpRequired)))
    : 1;
  const active = daysSinceLastActive <= 0;

  return (
    <section dir={dir} className="flex flex-col items-center gap-3 text-center">
      {/* 1) Ring + pet + mood badge + locked next medallion */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <div aria-hidden className={`absolute inset-7 rounded-full blur-2xl ${m.halo}`} />
        <EvolutionRing progress={progress} reduced={reduced} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span aria-hidden className="text-7xl drop-shadow-lg sm:text-8xl">{currentStage.emoji}</span>
        </div>
        {/* Mood face — bottom-end (mirrors to bottom-start in RTL). */}
        <div className="absolute bottom-2 end-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-lg ring-2 ring-white/70">
          <span aria-hidden>{m.face}</span>
        </div>
        {/* Locked next-evolution medallion — top-end, dashed + desaturated. */}
        {nextStage && (
          <div className="absolute top-2 end-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/45 bg-white/10 text-xl opacity-70 grayscale">
            <span aria-hidden>{nextStage.emoji}</span>
            <span aria-hidden className="absolute -bottom-1 -end-1 text-xs">🔒</span>
          </div>
        )}
      </div>

      {/* 2) Stage name + mood / streak chip */}
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-2xl font-black text-white">{currentStage.stage}</h2>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${m.chip}`}>
          {active
            ? `${m.face} ${t.playedToday}${streak > 0 ? ` · ${streak}🔥` : ""}`
            : t.daysAway(daysSinceLastActive)}
        </span>
      </div>

      {/* 3) Evolution line */}
      <p className="text-sm font-bold tabular-nums text-cyan-100">
        {nextStage ? t.toNext(nextStage.xpRequired - xp, nextStage.emoji, nextStage.stage) : t.fullyEvolved}
      </p>

      {/* 4 / 6) Claimable reward (pulsing) replaces the "next unlock" chip. */}
      {claimableMilestone ? (
        <button
          type="button"
          onClick={() => onClaim(claimableMilestone)}
          className={`${ARCADE_REWARD_GRADIENT} ${ARCADE_BUTTON_TOUCH} min-h-[44px] rounded-full px-4 py-2.5 text-sm font-extrabold text-amber-950 ring-2 ring-white/40 ${reduced ? "" : "animate-pulse"}`}
        >
          {t.claim(claimableMilestone.reward.label)}
        </button>
      ) : nextStage ? (
        <span className={`${ARCADE_REWARD_GRADIENT} rounded-full px-3 py-1 text-xs font-bold text-amber-950`}>
          {t.nextUnlock(nextStage.reward.label)}
        </span>
      ) : null}

      {/* 5) Primary PLAY CTA */}
      <motion.button
        type="button"
        onClick={onPlay}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        className={`${ARCADE_HERO_GRADIENT} ${ARCADE_PLAY_RING} ${ARCADE_BUTTON_TOUCH} mt-1 min-h-[56px] w-full max-w-xs rounded-full px-6 py-4 text-base font-black text-white`}
      >
        {t.playToGrow(currentStage.stage)}
      </motion.button>
    </section>
  );
}
