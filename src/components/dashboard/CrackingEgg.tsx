import { useState } from "react";

// egg-0 (pristine) … egg-5 (about to hatch). Art lives in public/pets/egg/;
// drop replacement frames at the same /pets/egg/egg-N.svg paths to reskin
// the egg (e.g. with photoreal art) without touching this component.
const EGG_FRAMES = 6;

interface CrackingEggProps {
  /** 0–1 progress toward hatching — picks which crack frame to show. */
  progress: number;
  /** Square pixel size. */
  size?: number;
  /** Accessible label (usually the stage name). */
  alt?: string;
  className?: string;
}

/**
 * The Egg pet stage, drawn as a progressively cracking shell: the closer a
 * student is to hatching, the more cracked the egg.  Falls back to the 🥚
 * emoji if the art ever fails to load, so the pet is never blank.
 */
export default function CrackingEgg({ progress, size = 32, alt = "Egg", className = "" }: CrackingEggProps) {
  const [failed, setFailed] = useState(false);
  const frame = Math.min(EGG_FRAMES - 1, Math.max(0, Math.floor(progress * EGG_FRAMES)));

  if (failed) {
    return (
      <span role="img" aria-label={alt} style={{ fontSize: size * 0.9, lineHeight: 1 }}>🥚</span>
    );
  }

  return (
    <img
      src={`/pets/egg/egg-${frame}.svg`}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
      style={{ objectFit: "contain", userSelect: "none", display: "block" }}
    />
  );
}
