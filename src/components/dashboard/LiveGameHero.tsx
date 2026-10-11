import { ArrowRight } from "lucide-react";

interface LiveGameHeroProps {
  emoji: string;
  title: string;
  badge: string;
  description: string;
  ctaLabel: string;
  onStart: () => void;
  background: string;
  accent: string;
  isRTL?: boolean;
  dataTour?: string;
  live?: boolean;
  hint?: string;
}

/** Activity colors identify the game; the surface and hierarchy stay shared. */
export default function LiveGameHero({ emoji, title, badge, description, ctaLabel,
  onStart, background, accent, isRTL = false, dataTour, live, hint }: LiveGameHeroProps) {
  return (
    <button type="button" onClick={onStart} data-tour={dataTour}
      className="vb-card vb-interactive-card group relative flex h-full w-full flex-col overflow-hidden p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background }} />
      <span className="mb-5 flex w-full items-center justify-between gap-2">
        <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background }} aria-hidden>{emoji}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--vb-surface-alt)] px-2.5 py-1 text-xs font-bold text-[var(--vb-text-secondary)]">
          {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />}{badge}
        </span>
      </span>
      <h2 className="text-xl font-extrabold leading-snug tracking-tight">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">{description}</p>
      {hint && <span className="mt-4 text-xs font-semibold text-[var(--vb-text-muted)]">{hint}</span>}
      <span className="mt-5 flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accent }}>
        {ctaLabel}<ArrowRight size={17} className={isRTL ? "rotate-180" : undefined} aria-hidden />
      </span>
    </button>
  );
}
