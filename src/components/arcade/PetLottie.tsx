/**
 * PetLottie — renders the evolution-stage pet as a Lottie character,
 * with the legacy emoji as a guaranteed fallback. The pet must NEVER
 * disappear: while the JSON loads, when no file exists for the stage,
 * or if a file fails to parse, the emoji shows instead.
 *
 * Drop a Lottie file at `src/assets/pet/{stageKey}.json` (stageKey =
 * the lowercase keys CharacterStage already uses: egg · hatchling ·
 * fox · eagle · dragon · unicorn · mythic · ascended). That stage then
 * animates; every stage without a file keeps its emoji. Only the
 * current stage's chunk is fetched — the glob loaders are lazy.
 *
 * Reduced motion → the character is frozen on its first frame
 * (loop + autoplay off), no per-frame cost.
 */
import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Build-time map of any pet Lottie files present. Empty (→ all emoji)
// until files are added. import.meta.glob is build-stable even when the
// directory holds no JSON, and keeps each stage in its own lazy chunk —
// nothing is fetched until a stage's loader is actually called.
const PET_LOTTIE = import.meta.glob<{ default: object }>("../../assets/pet/*.json");

interface PetLottieProps {
  /** Lowercase stage key — matches the filename, e.g. 'egg'. */
  stage: string;
  /** Shown while loading / when no JSON exists for the stage. */
  fallbackEmoji: string;
  /** Sizing for the Lottie canvas (the emoji inherits the parent font). */
  className?: string;
}

export default function PetLottie({ stage, fallbackEmoji, className }: PetLottieProps) {
  const reduced = useReducedMotion();
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null); // reset on stage change so we never flash the old art
    const loader = PET_LOTTIE[`../../assets/pet/${stage}.json`];
    if (!loader) return; // no file for this stage → emoji fallback
    loader()
      .then((m) => { if (!cancelled) setData(m.default); })
      .catch(() => { if (!cancelled) setData(null); }); // missing / bad JSON → emoji
    return () => { cancelled = true; };
  }, [stage]);

  // Loading, missing, or failed → legacy emoji. It inherits the parent's
  // font size, so the fallback matches the pre-Lottie look exactly.
  if (!data) {
    return <span aria-hidden>{fallbackEmoji}</span>;
  }

  // Reduced motion → freeze on the first frame (still the character, just
  // not animating). Otherwise loop the idle animation.
  return (
    <Lottie
      animationData={data}
      loop={!reduced}
      autoplay={!reduced}
      className={className}
      aria-hidden
    />
  );
}
