import { useEffect, useState, type CSSProperties, type FC } from "react";

// Google's <model-viewer> is a custom element. Type it as a component so TSX
// accepts the attributes we use without a global JSX augmentation. The
// library itself is bundled via @google/model-viewer (dynamic import below) —
// CSP-safe (no CDN); the existing policy already allows the GLB fetch
// (connect-src 'self') and its decoder worker (worker-src blob:).
const ModelViewer = "model-viewer" as unknown as FC<{
  src?: string;
  alt?: string;
  ar?: string;
  "ar-modes"?: string;
  "camera-controls"?: string;
  "auto-rotate"?: string;
  "rotation-per-second"?: string;
  "interaction-prompt"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  "touch-action"?: string;
  style?: CSSProperties;
}>;

interface Pet3DModelProps {
  /** URL of the .glb model (served from /public). */
  src: string;
  alt?: string;
  /** Pixel height of the viewer; width fills the container. */
  height?: number;
}

/**
 * Lazy 3D model viewer for the student's pet. `@google/model-viewer` is
 * dynamically imported on mount so its weight never lands in the main student
 * bundle; until it's ready (or if it fails to load) a soft fallback keeps the
 * card from ever going blank.
 */
export default function Pet3DModel({ src, alt = "Your 3D pet", height = 260 }: Pet3DModelProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@google/model-viewer")
      .then(() => { if (alive) setReady(true); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-7xl" role="img" aria-label={alt}>
        🥚
      </div>
    );
  }
  if (!ready) {
    return <div style={{ height }} className="animate-pulse rounded-xl bg-white/50" aria-hidden />;
  }

  return (
    <ModelViewer
      src={src}
      alt={alt}
      camera-controls=""
      auto-rotate=""
      rotation-per-second="22deg"
      interaction-prompt="none"
      shadow-intensity="0.6"
      exposure="1.05"
      touch-action="pan-y"
      ar=""
      ar-modes="webxr scene-viewer quick-look"
      style={{ width: "100%", height }}
    />
  );
}
