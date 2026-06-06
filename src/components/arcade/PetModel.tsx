/**
 * PetModel — renders an evolution-stage pet as an interactive 3D model
 * (a .glb at `src/assets/pet/{stageKey}.glb`) using Google's <model-viewer>
 * web component. It mirrors PetLottie's golden rule: the pet must NEVER
 * disappear, so the stage's emoji shows while the model + custom element
 * load, and stays if either fails.
 *
 * The model gently auto-rotates so it reads as "3D" at a glance. We do NOT
 * enable camera-controls and we set `pointer-events: none`, so taps fall
 * through to CharacterStage's button (open the pet card) instead of being
 * swallowed by the viewer. Size/bob/scale/halo all still come from the
 * wrappers in CharacterStage — this component only draws the character.
 *
 * The @google/model-viewer module is imported lazily on first use and the
 * promise is shared module-wide, so the (large) 3D runtime is fetched only
 * when a student actually reaches a stage that has a .glb.
 */
import { useEffect, useRef, useState } from "react";

let modelViewerPromise: Promise<unknown> | null = null;
function ensureModelViewer(): Promise<unknown> {
  if (!modelViewerPromise) modelViewerPromise = import("@google/model-viewer");
  return modelViewerPromise;
}

interface PetModelProps {
  /** Lowercase stage key — matches the filename, e.g. 'fox'. */
  stage: string;
  /** Lazy loader that resolves to the bundled .glb URL for this stage. */
  loader: () => Promise<string>;
  /** Shown while loading / if the model or the runtime fails. */
  fallbackEmoji: string;
  /** Sizing for the viewer (it fills this box). */
  className?: string;
  /** Respect the user's reduced-motion preference (no auto-rotate). */
  reduced: boolean;
}

export default function PetModel({ stage, loader, fallbackEmoji, className, reduced }: PetModelProps) {
  const ref = useRef<HTMLElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Resolve the bundled model URL for THIS stage. Re-runs on stage change so
  // the pet swaps cleanly; until it resolves we fall back to the emoji.
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    loader()
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [stage, loader]);

  // Register the <model-viewer> element once (lazy chunk, shared promise).
  useEffect(() => {
    let cancelled = false;
    ensureModelViewer()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // Drive the viewer imperatively — most of model-viewer's behaviour is
  // attribute-based, and setAttribute is unambiguous across React's
  // custom-element handling. Runs once the element is mounted + the URL known.
  useEffect(() => {
    const el = ref.current;
    if (!el || !ready || !src) return;

    el.setAttribute("src", src);
    el.setAttribute("alt", "Your pet in 3D");
    el.setAttribute("interaction-prompt", "none");
    el.setAttribute("disable-zoom", "");
    el.setAttribute("shadow-intensity", "0.35");
    el.setAttribute("shadow-softness", "1");
    el.setAttribute("exposure", "1.05");
    el.setAttribute("camera-orbit", "0deg 80deg 105%");
    el.setAttribute("loading", "eager");

    if (reduced) {
      el.removeAttribute("auto-rotate");
    } else {
      el.setAttribute("auto-rotate", "");
      el.setAttribute("auto-rotate-delay", "0");
      el.setAttribute("rotation-per-second", "22deg");
    }

    const onError = () => setFailed(true);
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [ready, src, reduced]);

  // Hard failure (bad file or runtime) → legacy emoji, like PetLottie.
  if (failed) {
    return <span aria-hidden>{fallbackEmoji}</span>;
  }

  return (
    <div className={className} aria-hidden>
      {(!ready || !src) && (
        <span className="flex h-full w-full items-center justify-center">{fallbackEmoji}</span>
      )}
      {ready && src && (
        <model-viewer
          ref={ref}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            // Let taps reach CharacterStage's button instead of the viewer.
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
