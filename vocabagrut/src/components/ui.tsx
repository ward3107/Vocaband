import type { ReactNode } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import type { UnitLevel } from '../core/types';

// Shared presentational primitives — the "big gradient card" aesthetic
// borrowed from Vocaband, kept dependency-free (no motion lib).

export const GradientCard = ({
  gradient,
  emoji,
  title,
  subtitle,
  onClick,
}: {
  gradient: string;
  emoji: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) => {
  const { textAlign } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`group w-full rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg shadow-black/10 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] ${textAlign}`}
    >
      <div className="flex items-center gap-4 rtl-flip">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm">
          {emoji}
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-bold">{title}</span>
          {subtitle && <span className="mt-1 block text-sm text-white/90">{subtitle}</span>}
        </span>
      </div>
    </button>
  );
};

export const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 ${className}`}>
    {children}
  </div>
);

export const LevelBadge = ({ level }: { level: UnitLevel }) => {
  const { language } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
      {level} {t(language, 'units')}
    </span>
  );
};

export const BandBadge = ({ band }: { band: 'I' | 'II' | 'III' }) => (
  <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
    Band {band}
  </span>
);

export const FreqBadge = ({ freq }: { freq: 'high' | 'medium' | 'low' }) => {
  const { language } = useLanguage();
  const styles = {
    high: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
  }[freq];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {t(language, 'frequency')}: {t(language, `freq_${freq}`)}
    </span>
  );
};

export const BackBar = ({ onBack, title }: { onBack: () => void; title: string }) => {
  const { language, isRTL } = useLanguage();
  return (
    <div className="mb-5 flex items-center gap-3 rtl-flip">
      <button
        type="button"
        onClick={onBack}
        style={{ touchAction: 'manipulation' }}
        className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
        aria-label={t(language, 'back')}
      >
        {isRTL ? '→' : '←'}
      </button>
      <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
    </div>
  );
};

export const Primary = ({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-bold text-white shadow-md shadow-indigo-500/20 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);
