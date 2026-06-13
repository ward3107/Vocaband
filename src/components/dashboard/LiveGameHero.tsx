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
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl sm:rounded-[28px] px-3.5 py-3 sm:px-6 sm:py-4 text-white text-start active:scale-[0.99] transition-transform"
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

      {/* Glare softener — the brand gradients peak at very high luminance,
          which teachers told us "shines" uncomfortably on the max-backlight
          monitors in school computer labs.  This thin dark veil sits ABOVE
          the gradient + white blobs but BELOW the content (which is
          `relative`, so it paints on top), pulling the peak brightness down
          a notch without recolouring the seven brand gradients or dimming
          the white text/CTA. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgba(15,23,42,0.12)" }}
      />

      {/* Icon + badge row.  On phones the tiles render two-up and compact,
          so the badge is hidden < sm to keep the header from wrapping. */}
      <div className="relative flex items-center justify-between gap-3 mb-2 sm:mb-3">
        <FrostedEmoji emoji={emoji} size={44} tone="gradient" />
        <span className="hidden sm:inline-flex items-center rounded-full border border-white/35 bg-white/20 px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md">
          {badge}
        </span>
      </div>

      <h2 className="relative m-0 text-[15px] sm:text-2xl md:text-[26px] font-extrabold leading-tight sm:leading-[1.1] tracking-[-0.02em]">
        {title}
      </h2>
      {/* Description is dropped on phones (compact two-up tiles) and shown
          from sm up where each tile has room.  flex-1 only matters there,
          so it keeps the desktop CTAs bottom-aligned across a row. */}
      <p className="relative mt-1.5 hidden sm:block flex-1 text-[13px] sm:text-sm font-medium leading-[1.4] opacity-90">
        {description}
      </p>

      <div
        className="relative mt-2 sm:mt-3.5 flex w-full items-center justify-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-5 sm:py-2.5 font-bold text-xs sm:text-base"
        // The hero is a fixed vivid gradient in every theme, so the CTA pill
        // must stay genuinely white — pin it inline so the global
        // `.bg-white -> var(--vb-surface)` dark remap can't turn it dark
        // (which left the deep-tint label unreadable on dark themes).
        style={{ backgroundColor: "#ffffff", color: accent, boxShadow: ctaShadow }}
      >
        <span>{ctaLabel}</span>
        <ArrowRight size={18} className={isRTL ? "-scale-x-100" : ""} />
      </div>
    </button>
  );
}
