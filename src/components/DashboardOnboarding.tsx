import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles } from 'lucide-react';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  icon: string;
}

const STEPS: TourStep[] = [
  {
    target: 'quick-play',
    title: 'Quick Online Challenge',
    description: 'Create a QR code for instant vocabulary games — students scan and play, no login needed.',
    icon: '📱',
  },
  {
    target: 'analytics',
    title: 'Classroom Analytics',
    description: 'See scores, trends, most-missed words, and which students need extra help.',
    icon: '📊',
  },
  {
    target: 'gradebook',
    title: 'Students & Grades',
    description: 'Track every student\'s progress, scores, and detailed mistake history.',
    icon: '🏆',
  },
  {
    target: 'approvals',
    title: 'Student Approvals',
    description: 'When students sign up with your class code, approve or reject them here.',
    icon: '👤',
  },
  {
    target: 'my-classes',
    title: 'Your Classes',
    description: 'Create classes, get shareable codes, assign vocabulary, and manage students.',
    icon: '📚',
  },
  {
    target: 'new-class',
    title: 'Create Your First Class',
    description: 'Start here — create a class to get a code you can share with your students.',
    icon: '✨',
  },
];

interface Props {
  onComplete: () => void;
}

// Breakpoint below which we use the mobile layout (card anchored to the
// bottom of the screen instead of floating next to the target). 640px
// matches Tailwind's `sm:` so the behaviour flips at the same width the
// rest of the UI changes.
const MOBILE_BREAKPOINT = 640;

export default function DashboardOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );

  const updateRect = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  // On every step change scroll the target into view so the spotlight
  // isn't pointing at something the teacher has to hunt for.  Without
  // this the tooltip was correctly drawn at the target's position but
  // the target itself could be below the fold on mobile.
  useEffect(() => {
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    const onResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      updateRect();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const padding = 8;

  // Tooltip positioning — mobile anchors the card to the bottom of the
  // screen (like Duolingo / Airbnb tours) so it never gets cut off.
  // Desktop floats it next to the target as before.
  const getTooltipStyle = (): React.CSSProperties => {
    if (isMobile) {
      // Bottom-sheet style: full-width card with comfortable side margins.
      // Safe-area inset handles iPhone home indicators.
      return {
        left: 12,
        right: 12,
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        width: 'auto',
      };
    }
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    // Desktop: use the tooltip's real measured height instead of a
    // guessed 200px — prevents clipping when the card grows (e.g.
    // long description + multi-line title).
    const measuredHeight = tooltipRef.current?.offsetHeight ?? 220;
    const cardWidth = Math.min(320, window.innerWidth - 32);
    const spaceBelow = window.innerHeight - rect.bottom;
    const verticalGap = 12;
    const horizontalMargin = 16;
    const left = Math.max(
      horizontalMargin,
      Math.min(rect.left, window.innerWidth - cardWidth - horizontalMargin)
    );
    if (spaceBelow > measuredHeight + verticalGap) {
      return { top: rect.bottom + verticalGap, left, width: cardWidth };
    }
    return {
      top: Math.max(horizontalMargin, rect.top - measuredHeight - verticalGap),
      left,
      width: cardWidth,
    };
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight border glow */}
      {rect && (
        <div
          className="absolute rounded-2xl ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            pointerEvents: 'none',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}

      {/* Tooltip card — width comes from getTooltipStyle() so desktop
          and mobile can size it differently (fixed 320px near the
          target on desktop; full-width minus 24px margin, anchored to
          the bottom of the screen on mobile). */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-[var(--vb-surface)] rounded-2xl shadow-2xl p-5 border border-[var(--vb-border)] max-w-[calc(100vw-24px)]"
          style={getTooltipStyle()}
        >
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--vb-text-muted)] uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={onComplete}
              className="text-[var(--vb-text-muted)] hover:text-[var(--vb-text-secondary)] transition-colors"
              title="Skip tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-blue-500' : 'bg-[var(--vb-surface-alt)]'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">{current.icon}</span>
            <div>
              <h3 className="font-black text-[var(--vb-text-primary)] text-base">{current.title}</h3>
              <p className="text-[var(--vb-text-secondary)] text-sm mt-1 leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onComplete}
              className="px-3 py-2 text-xs font-bold text-[var(--vb-text-muted)] hover:text-[var(--vb-text-secondary)] transition-colors"
            >
              Skip All
            </button>
            <div className="flex-1" />
            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-200"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-200"
              >
                <Sparkles size={14} />
                Got it!
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
