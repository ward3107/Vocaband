import React from "react";
import { ArrowRight } from "lucide-react";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  description: string;
  buttonText: string;
  // Kept for backwards-compat — no longer renders different colors, just a single
  // modern neutral button. The per-card accent is conveyed through the icon tile.
  buttonVariant?: "primary" | "secondary" | "rose" | "orange-green" | "qr-purple" | "live-green" | "analytics-blue" | "gradebook-amber";
  onClick: () => void;
  badge?: number;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  buttonText,
  onClick,
  badge,
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: 'var(--vb-surface)',
        borderColor: 'var(--vb-border)',
      }}
      className="group relative w-full h-full rounded-2xl p-5 sm:p-6 text-left border shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
    >
      {badge != null && badge > 0 && (
        <span className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center shadow-sm">
          {badge}
        </span>
      )}
      <div className="flex items-start gap-4 mb-4 sm:mb-5">
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3
            style={{ color: 'var(--vb-text-primary)' }}
            className="text-base sm:text-lg font-bold leading-tight mb-1"
          >
            {title}
          </h3>
          <p
            style={{ color: 'var(--vb-text-secondary)' }}
            className="text-xs sm:text-sm leading-snug"
          >
            {description}
          </p>
        </div>
      </div>
      <div
        style={{ color: 'var(--vb-text-secondary)' }}
        className="flex items-center justify-between transition-colors group-hover:text-[var(--vb-accent)]"
      >
        <span className="text-sm font-semibold">{buttonText}</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};

export default ActionCard;
