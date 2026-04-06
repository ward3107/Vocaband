import React, { useState, useEffect, useCallback } from 'react';
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

export default function DashboardOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const padding = 8;

  // Position tooltip below or above the target
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const spaceBelow = window.innerHeight - rect.bottom;
    const tooltipHeight = 200;
    if (spaceBelow > tooltipHeight + 20) {
      // Below
      return {
        top: rect.bottom + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
      };
    }
    // Above
    return {
      top: rect.top - tooltipHeight - 12,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
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

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-white rounded-2xl shadow-2xl p-5 w-[320px] border border-stone-200"
          style={getTooltipStyle()}
        >
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={onComplete}
              className="text-stone-400 hover:text-stone-600 transition-colors"
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
                  i <= step ? 'bg-blue-500' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">{current.icon}</span>
            <div>
              <h3 className="font-black text-stone-900 text-base">{current.title}</h3>
              <p className="text-stone-600 text-sm mt-1 leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onComplete}
              className="px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-700 transition-colors"
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
