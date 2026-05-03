/**
 * ClassShowControls — bottom action bar inside the active round.
 * Reveal · Skip · Next · End.  Reveal toggles to "Next" automatically
 * once the answer is shown so the teacher's flow is one big button per
 * question.
 */
import { Eye, SkipForward, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';

interface ClassShowControlsProps {
  revealed: boolean;
  isLast: boolean;
  onReveal: () => void;
  onSkip: () => void;
  onNext: () => void;
  onEnd: () => void;
  /** Counter line shown above the buttons. */
  currentIndex: number;
  total: number;
}

export default function ClassShowControls({
  revealed, isLast, onReveal, onSkip, onNext, onEnd, currentIndex, total,
}: ClassShowControlsProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  return (
    <div className="w-full px-4 sm:px-8 pb-6 pt-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-3">
        <div className="text-center text-sm sm:text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
          {t.questionOf(currentIndex + 1, total)}
        </div>
        <div className="flex flex-wrap justify-center items-center gap-3">
          <button
            type="button"
            onClick={onEnd}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-secondary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="px-5 py-3 rounded-2xl font-bold border-2 inline-flex items-center gap-2"
          >
            <X size={18} />
            {t.endShow}
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              backgroundColor: 'var(--vb-surface-alt)',
              color: 'var(--vb-text-secondary)',
            }}
            className="px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"
          >
            <SkipForward size={18} />
            {t.skip}
          </button>
          {!revealed ? (
            <button
              type="button"
              onClick={onReveal}
              style={{
                backgroundColor: 'var(--vb-accent)',
                color: 'var(--vb-accent-text)',
              }}
              className="px-8 py-4 rounded-2xl font-black text-lg shadow-lg inline-flex items-center gap-2"
            >
              <Eye size={20} />
              {t.reveal}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              style={{
                backgroundColor: 'var(--vb-accent)',
                color: 'var(--vb-accent-text)',
              }}
              className="px-8 py-4 rounded-2xl font-black text-lg shadow-lg inline-flex items-center gap-2"
            >
              {isLast ? t.endShow : t.next}
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
