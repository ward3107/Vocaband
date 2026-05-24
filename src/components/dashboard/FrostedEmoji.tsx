interface FrostedEmojiProps {
  emoji: string;
  size?: number;
  /** `gradient` reads best on a brand-coloured surface (hero); `frost`
   *  reads best on a pastel tinted card. */
  tone?: "gradient" | "frost";
}

/**
 * Frosted-glass emoji tile shared by the Aurora hero, pastel class
 * cards, and the empty state.  Pure presentational — no state.
 */
export default function FrostedEmoji({ emoji, size = 64, tone = "gradient" }: FrostedEmojiProps) {
  const bg =
    tone === "gradient"
      ? "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.18))"
      : "rgba(255,255,255,0.55)";
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: bg,
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 6px 18px -8px rgba(60,40,120,0.25)",
        fontSize: size * 0.52,
        lineHeight: 1,
      }}
    >
      <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08))" }}>{emoji}</span>
    </div>
  );
}
