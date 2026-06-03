/**
 * CharacterStage — the pet/avatar centerpiece that sits above the
 * BigPlayButton.  Reads `currentPetStage` from `useRetention` (same
 * data path PetCompanion uses), so the character on the hub matches
 * the one in the corner companion modal.
 *
 * Visual: big emoji on a soft glow disc with a gentle CSS idle bob.
 * Tap to open the existing pet companion modal — we don't re-implement
 * the claim flow; we just hand the click upward.
 *
 * If a claimable pet milestone is pending, a small amber "!" badge
 * surfaces so the student notices there's a reward waiting.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, type TargetAndTransition } from "motion/react";
import confetti from "canvas-confetti";
import type { PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { playAchievement, playLevelUp } from "../../hooks/useAudio";
import { petLines } from "../../locales/student/student-dashboard";
import PetLottie from "./PetLottie";
import { ARCADE_BUTTON_TOUCH } from "./theme";

interface CharacterStageProps {
  currentStage: PetMilestone;
  /** Next milestone (null at the final tier). Together with `xp` this
   *  drives how far through the current tier the pet is. */
  nextStage: PetMilestone | null;
  /** Student's total XP — positioned within the current tier to size
   *  the pet (base at the floor, +40% just before evolving). */
  xp: number;
  /** True on the render where the student crossed a tier (same signal
   *  as LevelUpModal). On the rising edge the pet plays its one-shot
   *  collapse → confetti burst → reveal transformation. */
  evolutionPending?: boolean;
  hasClaimable?: boolean;
  onTap?: () => void;
  displayName?: string;
}

import type { Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { greeting: string; rewardWaiting: string; evolved: string }> = {
  en: { greeting: "Hi", rewardWaiting: "Reward waiting", evolved: "Evolved!" },
  he: { greeting: "היי", rewardWaiting: "פרס מחכה", evolved: "התפתח!" },
  ar: { greeting: "أهلاً", rewardWaiting: "مكافأة في الانتظار", evolved: "تطور!" },
  ru: { greeting: "Привет", rewardWaiting: "Награда ждёт", evolved: "Эволюция!" },
};

type StageKey =
  | "egg" | "hatchling" | "fox" | "eagle"
  | "dragon" | "unicorn" | "mythic" | "ascended";

// One distinct idle motion per evolution stage so a student instantly
// reads "I evolved — my pet moves differently now". `repeatType: 'loop'`
// is explicit per the project's animation rule; motion/react cancels
// each loop on unmount, and only the CURRENT stage's variant is ever
// passed to `animate`, so there's a single managed loop at a time.
const STAGE_IDLE: Record<StageKey, TargetAndTransition> = {
  egg: {
    rotate: [0, -4, 4, -2, 0],
    transition: { duration: 0.6, repeat: Infinity, repeatType: "loop", repeatDelay: 3.4, ease: "easeInOut" },
  },
  hatchling: {
    rotate: [-3, 3, -3],
    transition: { duration: 1.8, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  fox: {
    y: [0, -10, 0],
    transition: { duration: 1.1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  eagle: {
    scaleX: [1, 0.92, 1.05, 1],
    transition: { duration: 0.9, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  dragon: {
    y: [0, -6, 0],
    rotate: [-2, 2, -2],
    transition: { duration: 2.4, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  unicorn: {
    y: [-4, 4, -4],
    transition: { duration: 3.2, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  mythic: {
    y: [0, -5, 0],
    scale: [1, 1.04, 1],
    transition: { duration: 2.8, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
  ascended: {
    rotate: [0, 3, -3, 0],
    scale: [1, 1.06, 1],
    transition: { duration: 3.6, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
  },
};

// PET_MILESTONES uses capitalised display names ('Fox Kit' etc.); map
// them to the idle-variant keys here so the constants stay the single
// source of truth for the XP economy.
const STAGE_KEY: Record<string, StageKey> = {
  Egg: "egg",
  Hatchling: "hatchling",
  "Fox Kit": "fox",
  Eagle: "eagle",
  Dragon: "dragon",
  Unicorn: "unicorn",
  Mythic: "mythic",
  Ascended: "ascended",
};

export default function CharacterStage({
  currentStage,
  nextStage,
  xp,
  evolutionPending = false,
  hasClaimable,
  onTap,
  displayName,
}: CharacterStageProps) {
  const { language, isRTL } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language];
  const interactive = Boolean(onTap);

  // --- Evolution transformation (fires alongside LevelUpModal) ---
  const emojiControls = useAnimationControls();
  const haloControls = useAnimationControls();
  const petRef = useRef<HTMLDivElement>(null);
  const petRectRef = useRef<DOMRect | null>(null);
  const firedRef = useRef(false); // one-shot guard for the current crossing
  const [isEvolving, setIsEvolving] = useState(false);
  const [showCaption, setShowCaption] = useState(false);

  // Confetti needs the pet's screen position — capture on mount and keep
  // it fresh on resize (cheap, and the layout rarely moves otherwise).
  useEffect(() => {
    const measure = () => {
      if (petRef.current) petRectRef.current = petRef.current.getBoundingClientRect();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Run the transformation once on the rising edge of evolutionPending.
  // The flag stays true until the student dismisses LevelUpModal, so the
  // edge guard keeps the same tier from re-triggering; a later crossing
  // (after dismiss → flag false) produces a fresh edge.
  useEffect(() => {
    if (evolutionPending && !firedRef.current) {
      firedRef.current = true;
      void runEvolution();
    } else if (!evolutionPending) {
      firedRef.current = false;
    }
    // runEvolution is recreated each render with fresh `reduced`; we only
    // want to fire on the boolean edge, so depend on evolutionPending alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evolutionPending]);

  const fireConfetti = () => {
    const rect = petRectRef.current;
    const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
    const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;
    void confetti({
      particleCount: 80,
      spread: 360,
      startVelocity: 28,
      origin: { x, y },
      colors: ["#fde047", "#22d3ee", "#f472b6", "#fbbf24"],
    });
  };

  const flashCaption = () => {
    setShowCaption(true);
    window.setTimeout(() => setShowCaption(false), 1000);
  };

  const runEvolution = async () => {
    // Yield once so the initial setState isn't synchronous inside the
    // triggering effect (keeps the set-state-in-effect lint happy).
    await Promise.resolve();
    setIsEvolving(true);

    if (reduced) {
      // 200ms crossfade, emoji swap at the midpoint (the parent prop has
      // already updated to the new stage by now). No confetti.
      await emojiControls.start({ opacity: 0, transition: { duration: 0.1 } });
      flashCaption();
      await emojiControls.start({ opacity: 1, transition: { duration: 0.1 } });
      setIsEvolving(false);
      return;
    }

    // Phase 1 — collapse into a glowing ball (0 → 0.6s).
    void haloControls.start({
      scale: 2,
      opacity: 1,
      backgroundColor: "rgba(255,255,255,0.8)",
      transition: { duration: 0.6, ease: "easeOut" },
    });
    await emojiControls.start({ scale: 0.1, opacity: 0, transition: { duration: 0.6, ease: "easeIn" } });

    // Phase 2 — particle burst (0.6 → 0.9s).
    fireConfetti();
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    // Phase 3 — reveal the (already-updated) new stage emoji (0.9 → 1.4s).
    flashCaption();
    void haloControls.start({
      scale: 1,
      opacity: 0.6,
      backgroundColor: "rgba(252,211,77,0.6)",
      transition: { duration: 0.5, ease: "easeOut" },
    });
    await emojiControls.start({
      scale: [0.1, 1.3, 1],
      opacity: [0, 1, 1],
      transition: { duration: 0.5, ease: "easeOut" },
    });
    setIsEvolving(false);
  };

  // Pet size = how far through the current evolution tier the student
  // is: base scale at the tier floor, +40% just before the next tier.
  const floor = currentStage.xpRequired;
  const ceil = nextStage ? nextStage.xpRequired : floor + 1;
  const progress = Math.min(1, Math.max(0, (xp - floor) / (ceil - floor)));
  const scale = 1 + progress * 0.4; // 1.00 → 1.40 across the tier

  // Progress-driven "about to evolve" halo. Bigger + brighter as the
  // student nears the next tier; pulses at the very end. The pulse is a
  // Tailwind CSS keyframe (GPU, no RAF) and drops under reduced motion —
  // the brighter/bigger halo alone still signals "ready".
  const haloIntensity =
    progress >= 0.95 ? "high"
    : progress >= 0.75 ? "mid"
    : progress >= 0.5 ? "low"
    : "none";
  const haloClass =
    haloIntensity === "high"
      ? `h-36 w-36 rounded-full bg-amber-300/60 blur-3xl${reduced ? "" : " animate-pulse"}`
      : haloIntensity === "mid"
        ? "h-32 w-32 rounded-full bg-amber-300/40 blur-3xl"
        : haloIntensity === "low"
          ? "h-28 w-28 rounded-full bg-amber-300/20 blur-2xl"
          : "";

  // Accessory emojis that pop in around the pet at within-tier
  // thresholds — "I got something new" beats between evolutions. The
  // Egg (clean by design) and the Ascended Phoenix (own particle
  // treatment) opt out entirely. Logical start/end keep them RTL-correct.
  const stageKey: StageKey = STAGE_KEY[currentStage.stage] ?? "egg";
  const showAccessories = stageKey !== "egg" && stageKey !== "ascended";
  const accessories: Array<{ key: string; emoji: string; cls: string }> = [];
  if (showAccessories) {
    if (progress >= 0.25) accessories.push({ key: "spark-end", emoji: "✨", cls: "top-1 end-1 text-xl" });
    if (progress >= 0.5) accessories.push({ key: "spark-start", emoji: "✨", cls: "top-1 start-1 text-xl" });
    if (progress >= 0.75) accessories.push({ key: "star", emoji: "⭐", cls: "-top-2 left-1/2 -translate-x-1/2 text-2xl" });
    if (progress >= 0.95) {
      accessories.push({ key: "fire-start", emoji: "🔥", cls: "bottom-1 start-2 text-lg" });
      accessories.push({ key: "fire-end", emoji: "🔥", cls: "bottom-1 end-2 text-lg" });
    }
  }

  // --- Idle encouragement bubbles — stage-keyed phrases the pet speaks
  // every 35–65s (first after ~30s), never overlapping. Implicitly
  // arcade-gated: CharacterStage only mounts inside the arcade hub. ---
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  // Latest pool, read at fire time so a language/stage change is picked
  // up by the NEXT bubble without resetting the cadence.
  const poolRef = useRef<string[]>([]);
  poolRef.current = petLines[language]?.[stageKey] ?? petLines.en[stageKey] ?? [];

  useEffect(() => {
    let cancelled = false;
    const jitter = () => 35000 + Math.random() * 30000;
    const scheduleNext = (delay: number) => {
      bubbleTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        const pool = poolRef.current;
        if (pool.length === 0) {
          scheduleNext(jitter());
          return;
        }
        setBubble(pool[Math.floor(Math.random() * pool.length)]);
        // Auto-dismiss after 4s, then schedule the next (no overlap —
        // we only queue the next bubble once this one is gone).
        dismissTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setBubble(null);
          scheduleNext(jitter());
        }, 4000);
      }, delay);
    };
    scheduleNext(30000);
    return () => {
      cancelled = true;
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // --- Tap delight (additive — never replaces onTap) ---
  // Floating hearts + a happy bounce on each tap; three quick taps
  // (within 1.2s of each other) trigger a giggle wiggle + fanfare.
  const [hearts, setHearts] = useState<Array<{ id: number; dx: number }>>([]);
  const heartIdRef = useRef(0);
  // Burst counter is internal-only (never rendered), so a ref beats
  // state: it updates synchronously (no stale read on rapid taps) and
  // avoids a re-render per tap.
  const tapCountRef = useRef(0);
  const tapResetRef = useRef<number | null>(null);
  useEffect(() => () => { if (tapResetRef.current) window.clearTimeout(tapResetRef.current); }, []);

  const emitHearts = (offsets: number[]) => {
    setHearts((prev) => [...prev, ...offsets.map((dx) => ({ id: heartIdRef.current++, dx }))]);
  };

  const handleTap = () => {
    // Existing behaviour first — opening PetCompanion still fires every tap.
    onTap?.();
    if (tapResetRef.current) window.clearTimeout(tapResetRef.current);
    tapCountRef.current += 1;
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      if (!reduced) void emojiControls.start({ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5, ease: "easeInOut" } });
      emitHearts([-8, 0, 8]);
      playLevelUp();
    } else {
      if (!reduced) void emojiControls.start({ scale: [1, 1.18, 1], transition: { duration: 0.25, ease: "easeOut" } });
      emitHearts([0]);
      playAchievement();
      // No taps for 1.2s → the burst resets.
      tapResetRef.current = window.setTimeout(() => { tapCountRef.current = 0; }, 1200);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={!interactive}
      className={`${ARCADE_BUTTON_TOUCH} group relative flex flex-col items-center gap-1`}
    >
      {/* During the evolution transformation a controlled halo blooms to
          white then settles back; otherwise the A2 progress-driven halo
          shows. `absolute top-1` (no left/right) self-centres → RTL-safe. */}
      {isEvolving && !reduced ? (
        <motion.div
          aria-hidden
          className="absolute top-1 h-28 w-28 rounded-full blur-3xl"
          initial={{ scale: 1, opacity: 0.3, backgroundColor: "rgba(252,211,77,0.3)" }}
          animate={haloControls}
        />
      ) : haloIntensity !== "none" ? (
        <div aria-hidden className={`absolute top-1 ${haloClass}`} />
      ) : null}

      {/* Scale wrapper — the pet swells 1.0 → 1.4 across the tier so the
          student SEES it preparing to evolve. A static transform, so it
          applies even under reduced motion (no per-frame cost). petRef
          gives the confetti burst its screen origin. */}
      <motion.div
        ref={petRef}
        className="relative"
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        {/* Per-stage idle motion lives INSIDE the scale wrapper so its
            amplitude grows with the pet. Only the current stage's variant
            is mounted; skipped under reduced motion AND while evolving. */}
        <motion.div
          animate={reduced || isEvolving ? undefined : STAGE_IDLE[stageKey]}
          className="relative flex h-24 w-24 items-center justify-center text-6xl drop-shadow-lg sm:h-28 sm:w-28 sm:text-7xl"
        >
          {/* Character wrapper — collapses to a ball then re-expands as
              the new stage during the evolution sequence. Renders the
              stage's Lottie when its JSON exists, else the legacy emoji
              (PetLottie owns that fallback, so the pet never vanishes). */}
          <motion.div initial={{ scale: 1, opacity: 1 }} animate={emojiControls} className="leading-none">
            <PetLottie
              stage={stageKey}
              fallbackEmoji={currentStage.emoji}
              className="h-24 w-24 sm:h-28 sm:w-28"
            />
          </motion.div>
          {hasClaimable && (
            <span
              className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-extrabold text-amber-950 ring-2 ring-white shadow-lg`}
              aria-label={t.rewardWaiting}
            >
              !
            </span>
          )}

          {/* Within-tier accessory pops. Each unmounts when progress
              drops below its threshold (e.g. crossing a tier resets to
              0), so AnimatePresence plays the exit. Decorative + non-
              interactive so they never block the tap target. */}
          <AnimatePresence>
            {accessories.map((a) => (
              <motion.span
                key={a.key}
                aria-hidden
                className={`pointer-events-none absolute select-none ${a.cls}`}
                initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -90, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 18 }}
              >
                {a.emoji}
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Tap hearts — float up from the pet then self-remove. Static
              fade under reduced motion (opacity only). */}
          {hearts.map((h) => (
            <motion.span
              key={h.id}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-2 select-none text-2xl"
              style={{ x: "-50%", marginLeft: h.dx }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={reduced ? { opacity: 0 } : { y: -28, opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              onAnimationComplete={() => setHearts((prev) => prev.filter((x) => x.id !== h.id))}
            >
              💖
            </motion.span>
          ))}
        </motion.div>

        {/* Ascended-only fire particles — three flames rising in sequence
            above the pet. Sit outside the idle-motion div so they don't
            inherit its rotation/scale, but inside the scale wrapper so
            they grow with the pet. Not rendered under reduced motion. */}
        {stageKey === "ascended" && !reduced &&
          [-10, 0, 10].map((dx, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute -top-4 left-1/2 select-none text-base"
              style={{ x: "-50%", marginLeft: dx }}
              animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: "loop", ease: "easeInOut", delay: i * 0.4 }}
            >
              🔥
            </motion.span>
          ))}
      </motion.div>

      {/* Idle encouragement bubble — stage-keyed phrase next to the pet.
          aria-live polite so screen readers announce it without
          interrupting. Single logical inset-inline-end auto-mirrors in
          RTL; the CSS-triangle tail (border-e) points back at the pet. */}
      <AnimatePresence>
        {bubble && (
          <motion.div
            aria-live="polite"
            style={{ insetInlineEnd: -120 }}
            className="pointer-events-none absolute top-1 w-32 rounded-2xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-900 ring-1 ring-slate-200 shadow-lg before:absolute before:top-3 before:-start-1.5 before:h-0 before:w-0 before:border-y-[6px] before:border-y-transparent before:border-e-[6px] before:border-e-white/90 before:content-['']"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Evolved!" caption — flashes for ~1s on transformation. Centred
          above the pet; opacity-only entrance under reduced motion. */}
      <AnimatePresence>
        {showCaption && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-sm font-extrabold text-amber-950 shadow-lg"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 18 }}
          >
            {t.evolved}
          </motion.span>
        )}
      </AnimatePresence>

      {displayName && (
        <span className="text-sm font-semibold text-white/80">
          {t.greeting}, {displayName}
        </span>
      )}
    </button>
  );
}
