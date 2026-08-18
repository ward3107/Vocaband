import type { ReactNode } from "react";

/**
 * Status pill.
 *
 * Replaces the three incompatible chip treatments that grew across the
 * student views (`bg-white/20 border`, `bg-white/10 ring-1`, and a solid
 * amber variant), each with its own radius and weight.
 *
 * The tint is expressed the way iOS expresses a non-critical status: the
 * accent colour at low opacity behind the accent colour itself, rather than
 * a saturated fill.  `solid` is the exception for a badge that must survive
 * on top of a coloured surface, where a translucent tint would mix with
 * whatever is behind it and lose contrast.
 */
export function IOSBadge({
  children,
  tint = "var(--vb-accent)",
  solid = false,
  className = "",
}: {
  children: ReactNode;
  /** Any CSS colour — pass an --ios-* system colour for semantic states. */
  tint?: string;
  /** Filled instead of tinted, for badges sitting on a coloured surface. */
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`ios-footnote inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${className}`}
      style={
        solid
          ? { backgroundColor: tint, color: "#fff" }
          : {
              backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)`,
              color: tint,
            }
      }
    >
      {children}
    </span>
  );
}
