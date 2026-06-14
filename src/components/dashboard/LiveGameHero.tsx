import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import FrostedEmoji from "./FrostedEmoji";

/** Per-game decorative motion. Each live game gets its own motif so the
 *  four cards read as distinct experiences, not one repeated button. */
export type LiveGameMotif = "ring" | "tiles" | "buzzer" | "arena";

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
  /** Per-game animated motif painted behind the content. */
  motif?: LiveGameMotif;
  /** When true the badge gains a pulsing dot — used for a live/instant
   *  signal. Decorative; real session counts wire in separately. */
  live?: boolean;
  /** Short context chip (e.g. "Best with 8+ players", "Last: 6B · 3d").
   *  Renders in its own row above the CTA, on phones too. */
  hint?: string;
}

/**
 * LiveGameHero — the shared "Live games" tile used by Quick Play,
 * Category Race, Speed Round and Word Hunt Arena on the English teacher
 * dashboard. Rendered in a grid so all four are pixel-identical in
 * layout — frosted icon, badge, title, description, hint, full-width CTA
 * pinned to the bottom — and differ in colour, emoji, copy, and their
 * per-game `motif` animation.
 *
 * Vertical layout so each tile reads cleanly at quarter/half width.
 * `h-full` + the flex-1 description keep tiles the same height with
 * their CTAs aligned even when copy length differs.
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
  motif,
  live = false,
  hint,
}: LiveGameHeroProps) {
  const reduce = useReducedMotion();

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

      {/* Per-game animated motif — sits above the blobs, below content
          (content is `relative`, so it paints on top). Skipped entirely
          for reduced-motion users. */}
      {motif && !reduce && <GameMotif motif={motif} isRTL={isRTL} />}

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
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/20 px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md">
          {live && (
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full bg-white ${reduce ? "" : "animate-pulse"}`}
            />
          )}
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

      {/* Context chip — kept visible on phones too (where the description
          is hidden) so each tile still carries a distinguishing hint. */}
      {hint && (
        <div className="relative mt-2 flex items-center">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-md">
            {hint}
          </span>
        </div>
      )}

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

/** Decorative, per-game looping animation. Pointer-events-none and
 *  aria-hidden throughout — purely visual character for each tile. */
function GameMotif({ motif, isRTL }: { motif: LiveGameMotif; isRTL: boolean }) {
  if (motif === "ring") {
    // Quick Play — a breathing "instant" ring in the top-end corner.
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-10 -end-10 h-40 w-40 rounded-full border-[14px] border-white/20"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  if (motif === "tiles") {
    // Category Race — three letter tiles flipping in sequence.
    return (
      <div aria-hidden className="pointer-events-none absolute top-3.5 end-3.5 flex gap-1.5">
        {["A", "R", "T"].map((ch, i) => (
          <motion.span
            key={ch}
            className="grid h-7 w-[26px] place-items-center rounded-md bg-white/20 text-sm font-black"
            animate={{ rotateX: [0, 0, 180, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
    );
  }

  if (motif === "buzzer") {
    // Speed Round — a charging buzzer that pulses bright.
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-16 end-5 h-14 w-14 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,0.4))" }}
        animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  // Word Hunt Arena — dot-grid map with two runners roaming.
  const dir = isRTL ? -1 : 1;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 2px, transparent 2px)",
          backgroundSize: "22px 22px",
        }}
      />
      <motion.span
        className="absolute h-3 w-3 rounded-full bg-white"
        style={{ top: "30%", left: "15%" }}
        animate={{ x: [0, dir * 90, 0], y: [0, 40, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        className="absolute h-3 w-3 rounded-full bg-white"
        style={{ top: "65%", left: "35%" }}
        animate={{ x: [0, dir * 70, 0], y: [0, -46, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
