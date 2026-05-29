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
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ARCADE_BUTTON_TOUCH } from "./theme";

interface CharacterStageProps {
  currentStage: PetMilestone;
  hasClaimable?: boolean;
  onTap?: () => void;
  displayName?: string;
}

import type { Language } from "../../hooks/useLanguage";

const STRINGS: Record<Language, { greeting: string; rewardWaiting: string }> = {
  en: { greeting: "Hi", rewardWaiting: "Reward waiting" },
  he: { greeting: "היי", rewardWaiting: "פרס מחכה" },
  ar: { greeting: "أهلاً", rewardWaiting: "مكافأة في الانتظار" },
  ru: { greeting: "Привет", rewardWaiting: "Награда ждёт" },
};

export default function CharacterStage({
  currentStage,
  hasClaimable,
  onTap,
  displayName,
}: CharacterStageProps) {
  const { language, isRTL } = useLanguage();
  const reduced = useReducedMotion();
  const t = STRINGS[language];
  const interactive = Boolean(onTap);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!interactive}
      className={`${ARCADE_BUTTON_TOUCH} group relative flex flex-col items-center gap-1`}
    >
      {/* Soft halo behind the pet */}
      <div
        aria-hidden
        className="absolute top-1 h-24 w-24 rounded-full bg-amber-300/30 blur-2xl sm:h-28 sm:w-28"
      />

      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-24 w-24 items-center justify-center text-6xl drop-shadow-lg sm:h-28 sm:w-28 sm:text-7xl"
      >
        {currentStage.emoji}
        {hasClaimable && (
          <span
            className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-extrabold text-amber-950 ring-2 ring-white shadow-lg`}
            aria-label={t.rewardWaiting}
          >
            !
          </span>
        )}
      </motion.div>

      {displayName && (
        <span className="text-sm font-semibold text-white/80">
          {t.greeting}, {displayName}
        </span>
      )}
    </button>
  );
}
