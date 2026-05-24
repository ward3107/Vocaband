import { ArrowRight } from "lucide-react";
import FrostedEmoji from "./FrostedEmoji";
import { HERO_AURORA } from "./dashboardAccents";

interface AuroraQuickPlayHeroProps {
  title: string;
  instantBadge: string;
  description: string;
  ctaLabel: string;
  onStart: () => void;
  /** RTL drives chevron flip + start/end auto-positioning of the
   *  decorative blobs.  Defaults to false. */
  isRTL?: boolean;
}

/**
 * Aurora-gradient Quick Play hero — replaces the previous flat
 * indigo→violet→fuchsia hero inside TeacherQuickActions for the
 * English teacher dashboard. Decorative blobs use logical
 * properties so they auto-flip in RTL.
 */
export default function AuroraQuickPlayHero({
  title,
  instantBadge,
  description,
  ctaLabel,
  onStart,
  isRTL = false,
}: AuroraQuickPlayHeroProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      data-tour="quick-play"
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        background: HERO_AURORA,
        boxShadow:
          "0 20px 50px -22px rgba(99,102,241,0.55), 0 8px 22px -10px rgba(217,70,239,0.35)",
      }}
      className="group relative w-full overflow-hidden rounded-[32px] px-6 py-6 sm:px-9 sm:py-8 text-white text-left active:scale-[0.99] transition-transform mb-6"
    >
      {/* Top-end corner blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[60px] -end-[40px] h-[220px] w-[220px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* Bottom-start blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[80px] start-[38%] h-[280px] w-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(244,114,182,0.45) 0%, rgba(244,114,182,0) 70%)",
        }}
      />
      {/* Grain dot overlay */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-[0.08] mix-blend-soft-light"
      >
        <defs>
          <pattern id="vc-hero-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#fff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vc-hero-dots)" />
      </svg>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-[22px]">
        <FrostedEmoji emoji="⚡" size={68} tone="gradient" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <h2 className="m-0 text-[26px] sm:text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em]">
              {title}
            </h2>
            <span className="inline-flex items-center rounded-full border border-white/35 bg-white/20 px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md">
              {instantBadge}
            </span>
          </div>
          <p className="mt-1.5 max-w-[520px] text-[13px] sm:text-[15px] font-medium leading-[1.4] opacity-90">
            {description}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center gap-2 rounded-full bg-white px-[20px] py-[12px] sm:px-[22px] sm:py-[14px] font-bold text-[#5B21B6] text-sm sm:text-base self-stretch sm:self-auto justify-center"
          style={{ boxShadow: "0 10px 24px -8px rgba(91,33,182,0.45)" }}
        >
          <span>{ctaLabel}</span>
          <ArrowRight size={18} className={isRTL ? "-scale-x-100" : ""} />
        </div>
      </div>
    </button>
  );
}
