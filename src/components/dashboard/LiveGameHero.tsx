import { ArrowRight } from "lucide-react";
import LiveGameArtwork from "./LiveGameArtwork";

interface LiveGameHeroProps {
  title: string;
  badge: string;
  description: string;
  ctaLabel: string;
  onStart: () => void;
  accent: string;
  artwork: "quick" | "race" | "speed" | "arena";
  isRTL?: boolean;
  dataTour?: string;
  hint?: string;
}

/** Every live game uses the same card layout and action; colour identifies the mode. */
export default function LiveGameHero({
  title, badge, description, ctaLabel, onStart, accent, artwork,
  isRTL = false, dataTour, hint,
}: LiveGameHeroProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      data-tour={dataTour}
      data-game={artwork}
      style={{ outlineColor: accent }}
      className="vb-card vb-interactive-card group relative flex h-full min-h-[320px] w-full flex-col overflow-hidden p-0 text-start focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="relative block h-[132px] w-full shrink-0 overflow-hidden">
        <LiveGameArtwork game={artwork} />
        <span className="absolute end-3 top-3 inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/60 bg-white/95 px-3 py-1 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
          {badge}
        </span>
      </span>

      <span className="flex w-full flex-1 flex-col px-5 pb-5 pt-5">
        <span className="text-xl font-extrabold leading-tight tracking-tight text-[var(--vb-text-primary)]">{title}</span>
        <span className="mt-2 flex-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">{description}</span>
        {hint && <span className="mt-4 text-xs font-semibold leading-snug text-[var(--vb-text-muted)]">{hint}</span>}
        <span
          className="mt-5 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-active:translate-y-0"
          style={{ backgroundColor: accent }}
        >
          {ctaLabel}
          <ArrowRight size={18} className={isRTL ? "rotate-180" : undefined} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
