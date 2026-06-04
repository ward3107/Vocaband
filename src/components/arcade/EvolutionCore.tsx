/**
 * EvolutionCore — the arcade hub's hero. Makes pet EVOLUTION the focal point
 * by combining the app's two pet systems:
 *
 *   - Appearance + rewards = the XP ladder (PET_MILESTONES via useRetention),
 *     passed in as currentStage / nextStage / xp / claimableMilestone. This
 *     is the ONLY source of how the pet looks and what it unlocks.
 *   - Mood = daily activity (usePetEvolution → petMoodFor), used ONLY for the
 *     mood face + the "played today / N days away" chip, never for appearance.
 *
 * Composition (top → bottom):
 *   EvolutionRing (pet + XP ring + mood + next-evolution preview)
 *   → stage name → mood/streak chip → "X XP → next" → reward (claim or
 *   preview) → PLAY-to-grow pill → EvolutionLadder (the full journey).
 *
 * Owns the PLAY action now (passed `onPlay`), so the hub no longer renders a
 * separate BigPlayButton — playing and growing the pet are one and the same.
 */
import { usePetEvolution, petMoodFor, type PetMood } from "../../hooks/usePetEvolution";
import type { PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_REWARD_GRADIENT, ARCADE_PLAY_RING, ARCADE_BUTTON_TOUCH } from "./theme";
import EvolutionRing from "./EvolutionRing";
import EvolutionLadder from "./EvolutionLadder";

const MOOD_FACE: Record<PetMood, string> = { happy: "😊", neutral: "😐", sad: "😟", "very-sad": "😢" };
const MOOD_CHIP: Record<PetMood, string> = {
  happy: "bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950",
  neutral: "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950",
  sad: "bg-gradient-to-r from-rose-400 to-rose-500 text-white",
  "very-sad": "bg-gradient-to-r from-rose-500 to-rose-700 text-white",
};

const STRINGS: Record<Language, {
  mood: Record<PetMood, string>;
  playedToday: string;
  daysAway: (n: number) => string;
  nextUnlock: string;
  playToGrow: (stage: string) => string;
  play: string;
  maxStage: string;
  claim: string;
}> = {
  en: {
    mood: { happy: "Happy", neutral: "Doing OK", sad: "Missing you", "very-sad": "Lonely" },
    playedToday: "played today",
    daysAway: (n) => `${n}d away`,
    nextUnlock: "Next unlock",
    playToGrow: (s) => `PLAY to grow your ${s}`,
    play: "PLAY",
    maxStage: "Top form! ✨",
    claim: "Claim",
  },
  he: {
    mood: { happy: "שמח", neutral: "בסדר", sad: "מתגעגע", "very-sad": "בודד" },
    playedToday: "שיחקת היום",
    daysAway: (n) => `לפני ${n} ימים`,
    nextUnlock: "פתיחה הבאה",
    playToGrow: (s) => `שחק כדי לפתח את ${s}`,
    play: "שחק",
    maxStage: "בשיא! ✨",
    claim: "אסוף",
  },
  ar: {
    mood: { happy: "سعيد", neutral: "بخير", sad: "يشتاق إليك", "very-sad": "وحيد" },
    playedToday: "لعبت اليوم",
    daysAway: (n) => `منذ ${n} أيام`,
    nextUnlock: "الفتح التالي",
    playToGrow: (s) => `العب لتنمية ${s}`,
    play: "العب",
    maxStage: "في القمة! ✨",
    claim: "استلم",
  },
  ru: {
    mood: { happy: "Рад", neutral: "Нормально", sad: "Скучает", "very-sad": "Одинок" },
    playedToday: "играл сегодня",
    daysAway: (n) => `${n} дн. назад`,
    nextUnlock: "Следующая награда",
    playToGrow: (s) => `Играй, чтобы вырастить ${s}`,
    play: "ИГРАТЬ",
    maxStage: "На пике! ✨",
    claim: "Забрать",
  },
};

interface EvolutionCoreProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  evolutionPending: boolean;
  claimableMilestone: PetMilestone | null;
  onClaim: (milestone: PetMilestone) => void;
  /** Launches the next assignment — the PLAY pill lives here now. */
  onPlay?: () => void;
  streak?: number;
}

export default function EvolutionCore({
  currentStage,
  nextStage,
  xp,
  evolutionPending,
  claimableMilestone,
  onClaim,
  onPlay,
  streak = 0,
}: EvolutionCoreProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;

  // Mood is daily-activity ONLY (drives the face + chip). The hook lives here
  // because EvolutionCore mounts solely inside the arcade hub.
  const { state } = usePetEvolution({ enabled: true });
  const daysSince = state?.daysSinceLastActive ?? 0;
  const mood = petMoodFor(daysSince);
  const activity = daysSince === 0 ? t.playedToday : t.daysAway(daysSince);

  // Progress within the current XP tier (this stage's floor → next floor).
  const floor = currentStage.xpRequired;
  const ceil = nextStage ? nextStage.xpRequired : floor + 1;
  const pct = Math.min(100, Math.max(0, ((xp - floor) / (ceil - floor)) * 100));
  const remaining = nextStage ? Math.max(0, nextStage.xpRequired - xp) : 0;

  return (
    <section dir={dir} className="flex w-full flex-col items-center gap-3">
      <EvolutionRing
        currentStage={currentStage}
        nextStage={nextStage}
        xp={xp}
        evolutionPending={evolutionPending}
        mood={mood}
        pct={pct}
      />

      <div className="flex items-center gap-2 text-2xl font-extrabold text-white">
        <span aria-hidden>{currentStage.emoji}</span>
        {currentStage.stage}
      </div>

      <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold ${MOOD_CHIP[mood]}`}>
        <span aria-hidden className="text-sm leading-none">{MOOD_FACE[mood]}</span>
        {t.mood[mood]} · {activity}{streak > 0 ? ` · ${streak}🔥` : ""}
      </span>

      {nextStage ? (
        <p className="text-base font-bold text-white">
          <span className="tabular-nums">{remaining} XP</span> {isRTL ? "←" : "→"}{" "}
          <span aria-hidden>{nextStage.emoji}</span> {nextStage.stage}
        </p>
      ) : (
        <p className="text-sm font-bold text-cyan-100">{t.maxStage}</p>
      )}

      {claimableMilestone ? (
        <button
          type="button"
          onClick={() => onClaim(claimableMilestone)}
          className={`${ARCADE_REWARD_GRADIENT} ${ARCADE_PLAY_RING} ${ARCADE_BUTTON_TOUCH} flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-extrabold text-amber-950`}
        >
          🎁 {t.claim}: {claimableMilestone.reward.label}
        </button>
      ) : nextStage ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-xs font-bold text-amber-200">
          🎁 {t.nextUnlock}: {nextStage.reward.label}
        </div>
      ) : null}

      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          className={`bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 ${ARCADE_PLAY_RING} ${ARCADE_BUTTON_TOUCH} mt-0.5 flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-extrabold text-slate-900`}
        >
          <span aria-hidden>▶</span> {nextStage ? t.playToGrow(currentStage.stage) : t.play}
        </button>
      )}

      <EvolutionLadder xp={xp} currentStage={currentStage} nextStage={nextStage} />
    </section>
  );
}
