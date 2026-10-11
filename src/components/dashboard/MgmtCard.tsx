import { ChevronRight } from "lucide-react";

interface MgmtCardProps {
  emoji: string;
  title: string;
  sub: string;
  onClick: () => void;
  badge?: number;
  isRTL?: boolean;
  tour?: string;
}

export default function MgmtCard({ emoji, title, sub, onClick, badge, isRTL, tour }: MgmtCardProps) {
  return (
    <button type="button" onClick={onClick} data-tour={tour}
      className="vb-card vb-interactive-card flex w-full items-center gap-4 p-5">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--vb-accent-soft)] text-2xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--vb-text-secondary)]">{sub}</span>
      </span>
      {badge != null && badge > 0 ?
        <span className="rounded-full bg-[var(--vb-danger)] px-2.5 py-1 text-xs font-bold text-white">{badge}</span> :
        <ChevronRight size={18} className={`shrink-0 text-[var(--vb-text-muted)] ${isRTL ? "rotate-180" : ""}`} aria-hidden />}
    </button>
  );
}
