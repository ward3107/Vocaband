/**
 * PickerSheet — the shared modal chrome for the four word-source
 * panels in the Create-Assignment flow (My Library, Topic Packs,
 * Saved Groups, Scan & Upload).
 *
 * Why this exists: each panel used to hand-roll its own overlay +
 * header + scroll container, with slightly different radii, gradients
 * and mobile behaviour. This unifies them on one modern shell:
 *
 *   - Bottom-sheet on phones (slides up from the edge, has a grabber),
 *     a centred card on tablets/desktop.
 *   - A tall, frosted-medallion gradient header matching the paste-area
 *     and option-card design language.
 *   - A single scroll body + optional sticky footer, so long lists
 *     never push the action button off-screen.
 *   - RTL-aware via useLanguage().
 *
 * Panels supply only their content + (optionally) a footer.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export interface PickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Big bold header line. On a drill-down view pass the child title. */
  title: string;
  /** Optional second line under the title (e.g. "12 packs"). */
  subtitle?: string;
  /** Frosted emoji medallion shown at the start of the header. */
  emoji?: string;
  /** Tailwind gradient stops for the header, e.g. "from-emerald-400 to-teal-500". */
  gradient: string;
  /** When supplied, a back arrow appears before the medallion. */
  onBack?: () => void;
  /** Sticky footer (typically a primary action). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Desktop max width. Defaults to a roomy 2xl. */
  maxWidthClass?: string;
  closeAria?: string;
  backAria?: string;
  /** Stacking context — bump for nested sheets (default z-50). */
  zClass?: string;
}

const frostedMedallion: React.CSSProperties = {
  background: 'rgba(255,255,255,0.22)',
  border: '1px solid rgba(255,255,255,0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const PickerSheet: React.FC<PickerSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  emoji,
  gradient,
  onBack,
  footer,
  children,
  maxWidthClass = 'sm:max-w-2xl',
  closeAria = 'Close',
  backAria = 'Back',
  zClass = 'z-50',
}) => {
  const { isRTL, dir } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={dir}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`fixed inset-0 ${zClass} flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4`}
        >
          <motion.div
            initial={{ y: 28, opacity: 0.5, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative flex w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--vb-surface)] shadow-2xl sm:rounded-[28px] ${maxWidthClass} max-h-[92vh] sm:max-h-[88vh]`}
          >
            {/* Grabber — phone-only affordance that this sheet drags/closes */}
            <div className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden">
              <div className="h-1.5 w-11 rounded-full bg-black/15" />
            </div>

            {/* Header */}
            <div
              className={`flex shrink-0 items-center gap-3 bg-gradient-to-r px-5 py-4 text-white sm:px-6 sm:py-5 ${gradient}`}
            >
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={backAria}
                  className="-ms-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              )}
              {emoji && (
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[22px]"
                  style={frostedMedallion}
                  aria-hidden
                >
                  {emoji}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold tracking-[-0.01em]">{title}</div>
                {subtitle && <div className="truncate text-sm font-medium text-white/85">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeAria}
                className="-me-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {/* Sticky footer */}
            {footer && (
              <div className="shrink-0 border-t border-[var(--vb-border)] bg-[var(--vb-surface)]">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PickerSheet;
