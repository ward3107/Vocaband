// Vocabagrut-style hero — full-bleed indigo→violet→fuchsia gradient
// with a frosted icon medallion, big title, and subtitle blurb.
// Used on Teacher Dashboard, SetupWizard, FreeResourcesView, and any
// other teacher tab that should match the Vocabagrut landing pattern.

import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface PageHeroProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Small uppercase eyebrow line above the title (e.g. greeting). */
  eyebrow?: string;
  /** When provided, renders a back button inside the hero. */
  onBack?: () => void;
  backLabel?: string;
  /** Right-side slot for action buttons (e.g. upgrade CTA, badges). */
  trailing?: ReactNode;
  /** Tailwind gradient overrides — defaults to indigo→violet→fuchsia. */
  gradient?: string;
}

export default function PageHero({
  icon,
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  trailing,
  gradient = 'from-indigo-500 via-violet-500 to-fuchsia-500',
}: PageHeroProps) {
  const { dir, isRTL, language } = useLanguage();

  return (
    <div className="vb-content py-5 sm:py-7" dir={dir}>
      <div className="vb-hero">
        {onBack && (
          <button
            onClick={onBack}
            type="button"
            className="text-white/90 hover:text-white inline-flex items-center gap-1.5 text-sm font-medium mb-4"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
          >
            <ArrowLeft size={18} className={isRTL ? 'rotate-180' : undefined} />
            {backLabel ?? (language === 'he' ? 'חזרה' : language === 'ar' ? 'رجوع' : 'Back')}
          </button>
        )}
        <div className="relative z-10 flex items-start gap-4">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/80 mb-1">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
            {subtitle && (
              <p className="text-white/90 text-sm sm:text-base mt-1 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
          {trailing && (
            <div className="shrink-0 hidden sm:flex items-center">
              {trailing}
            </div>
          )}
        </div>
        {trailing && (
          <div className="mt-4 sm:hidden">{trailing}</div>
        )}
      </div>
    </div>
  );
}
