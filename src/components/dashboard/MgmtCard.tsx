import { ChevronRight } from "lucide-react";

interface MgmtCardProps {
  emoji: string;
  title: string;
  sub: string;
  onClick: () => void;
  /** Optional notification count rendered as a red dot + number on the
   *  end side (replaces the chevron). Used for Approvals. */
  badge?: number;
  /** Flip chevron in RTL contexts. */
  isRTL?: boolean;
  /** Forwarded so dashboard tour selectors keep working. */
  tour?: string;
}

/**
 * One management tile — Classroom / Worksheets / Library / Approvals.
 * Indigo→violet gradient card (cooler than the warm Live-games cards),
 * frosted emoji tile on the start side, chevron on the end. Hover lift
 * is pure transform so we don't pay a layout cost.
 */
export default function MgmtCard({
  emoji,
  title,
  sub,
  onClick,
  badge,
  isRTL = false,
  tour,
}: MgmtCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tour}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        // Single-hue accent gradient so the tile follows the active theme
        // (indigo on Daylight/Midnight, amber on Graphite) instead of a
        // fixed brand purple that clashed on warm dark themes.
        background:
          "linear-gradient(135deg, var(--vb-accent) 0%, color-mix(in srgb, var(--vb-accent), #000 30%) 100%)",
        color: "var(--vb-accent-text)",
        // Keep the top inset highlight (the tile's crisp edge) but swap the
        // coloured drop halo for a soft NEUTRAL one so the tile lifts calmly
        // instead of glowing in the accent hue ("Cool Paper" direction).
        boxShadow:
          "0 1px 0 color-mix(in srgb, var(--vb-accent-text), transparent 75%) inset, 0 12px 28px -16px rgba(15,23,42,0.45)",
      }}
      className="group flex w-full items-center gap-[18px] rounded-3xl px-[18px] sm:px-[22px] py-5 text-start hover:-translate-y-0.5 transition-transform"
    >
      <div
        className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] text-[28px] leading-none backdrop-blur-sm"
        style={{
          background: "color-mix(in srgb, var(--vb-accent-text), transparent 80%)",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--vb-accent-text), transparent 65%)",
        }}
      >
        <span>{emoji}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[16px] sm:text-[17px] font-bold tracking-[-0.01em]"
          style={{ color: "var(--vb-accent-text)" }}
        >
          {title}
        </div>
        <div
          className="mt-0.5 text-[12px] sm:text-[13px] font-medium"
          style={{ color: "color-mix(in srgb, var(--vb-accent-text), transparent 18%)" }}
        >
          {sub}
        </div>
      </div>

      {badge != null && badge > 0 ? (
        <span
          className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold text-white"
          style={{ backgroundColor: "var(--vb-danger)" }}
        >
          {badge}
        </span>
      ) : (
        <ChevronRight
          size={20}
          className={isRTL ? "-scale-x-100" : ""}
          style={{ color: "var(--vb-accent-text)", opacity: 0.7 }}
        />
      )}
    </button>
  );
}
