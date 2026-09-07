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
import { Suspense, lazy, useEffect, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// lottie-react (~55 kB gz) only ever renders once a stage actually ships a
// JSON animation. CharacterStage (and therefore this component) mounts on
// the normal student dashboard, so a static import would drag lottie-web
// into that hot chunk for every student even though the pet dir is empty
// today and every stage falls back to the emoji. Lazy-load it instead:
// while there is no JSON the chunk is never fetched, and when a file is
// added it loads on demand for that stage only. React.lazy needs a default
// export, so adapt lottie-react's named { Lottie }.
const LazyLottie = lazy(() =>
  import("lottie-react").then((m) => ({ default: m.Lottie })),
);

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
  // Cache the loaded JSON together with the stage it belongs to. Deriving
  // `data` from a stage match — instead of nulling state inside the effect
  // on every stage change — avoids a synchronous setState-in-effect: when
  // the stage changes the cached art simply stops matching, so the emoji
  // shows until the new file resolves. The pet never flashes stale art.
  const [entry, setEntry] = useState<{ stage: string; data: object } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = PET_LOTTIE[`../../assets/pet/${stage}.json`];
    if (!loader) return; // no file for this stage → emoji fallback
    loader()
      .then((m) => { if (!cancelled) setEntry({ stage, data: m.default }); })
      .catch(() => { if (!cancelled) setEntry(null); }); // missing / bad JSON → emoji
    return () => { cancelled = true; };
  }, [stage]);


  // Only show art that belongs to the CURRENT stage; otherwise fall back to
  // the emoji (loading, missing file, failed parse, or mid stage-change).
  const data = entry && entry.stage === stage ? entry.data : null;

  // Loading, missing, or failed → legacy emoji. It inherits the parent's
  // font size, so the fallback matches the pre-Lottie look exactly.
  if (!data) {
    return <span aria-hidden>{fallbackEmoji}</span>;
  }

  // Reduced motion → freeze on the first frame (still the character, just
  // not animating). Otherwise loop the idle animation. The emoji stays as
  // the Suspense fallback so the pet never disappears while lottie-web's
  // chunk loads on first use.
  return (
    <Suspense fallback={<span aria-hidden>{fallbackEmoji}</span>}>
      <LazyLottie
        src={data}
        loop={!reduced}
        autoplay={!reduced}
        className={className}
        aria-hidden
      />
    </Suspense>
  );
}
