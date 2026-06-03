import { ArrowRight } from "lucide-react";
import FrostedEmoji from "./FrostedEmoji";

interface LiveGameHeroProps {
  emoji: string;
  title: string;
  badge: string;
  description: string;
  ctaLabel: string;
  onStart: () => void;
  /** CSS background (gradient) for the card. */
  background: string;
  /** CSS box-shadow for the card's coloured lift. */
  boxShadow: string;
  /** CTA pill text colour — a deep tint of the card's hue. */
  accent: string;
  /** CTA pill drop-shadow. */
  ctaShadow: string;
  /** RTL flips the CTA chevron + auto-positions the decorative blobs. */
  isRTL?: boolean;
  /** Optional product-tour anchor. */
  dataTour?: string;
}

/**
 * LiveGameHero — the shared "Live games" tab used by BOTH Quick Play and
 * Category Race on the English teacher dashboard. Rendered two-up in a
 * grid (side by side on desktop, stacked on mobile), so the two are
 * pixel-identical in layout — frosted icon, badge, title, description,
 * full-width CTA pinned to the bottom, decorative blobs, radius — and
 * differ ONLY in colour, emoji, and copy.
 *
 * Vertical layout (not the old wide row) so each tab reads cleanly at
 * half width. `h-full` + the flex-1 description keep both tabs the same
 * height with their CTAs aligned even when the copy length differs.
 */
export default function LiveGameHero({
  emoji,
  title,
  badge,
  description,
  ctaLabel,
  onStart,
  background,
  boxShadow,
  accent,
  ctaShadow,
  isRTL = false,
  dataTour,
}: LiveGameHeroProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      data-tour={dataTour}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        background,
        boxShadow,
      }}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-[28px] p-6 text-white text-start active:scale-[0.99] transition-transform"
    >
      {/* Top-end corner blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[60px] -end-[40px] h-[200px] w-[200px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* Bottom-start blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[70px] start-[30%] h-[240px] w-[240px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      {/* Grain dot overlay */}
      <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.08] mix-blend-soft-light">
        <defs>
          <pattern id="vc-hero-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#fff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vc-hero-dots)" />
      </svg>

      {/* Icon + badge row */}
      <div className="relative flex items-center justify-between gap-3 mb-4">
        <FrostedEmoji emoji={emoji} size={60} tone="gradient" />
        <span className="inline-flex items-center rounded-full border border-white/35 bg-white/20 px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md">
          {badge}
        </span>
      </div>

      <h2 className="relative m-0 text-2xl sm:text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
        {title}
      </h2>
      <p className="relative mt-1.5 flex-1 text-[13px] sm:text-sm font-medium leading-[1.4] opacity-90">
        {description}
      </p>

      <div
        className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-sm sm:text-base"
        style={{ color: accent, boxShadow: ctaShadow }}
      >
        <span>{ctaLabel}</span>
        <ArrowRight size={18} className={isRTL ? "-scale-x-100" : ""} />
      </div>
    </button>
  );
}
