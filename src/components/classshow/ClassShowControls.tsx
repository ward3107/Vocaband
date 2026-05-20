/**
 * ClassShowControls — bottom action bar inside the active round.
 *
 * The Reveal button is gone: teachers now tap the answer directly on
 * the projected screen to reveal it, matching the click-driven flow
 * students get in the regular game.  The bar keeps Choose-Different-
 * Mode (back to setup) · Skip · Next.
 */
import { SkipForward, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';

interface ClassShowControlsProps {
  revealed: boolean;
  isLast: boolean;
  onSkip: () => void;
  onNext: () => void;
  /** Back to the setup screen — labelled "Choose different mode" now. */
  onChooseDifferentMode: () => void;
  /** Counter line shown above the buttons. */
  currentIndex: number;
  total: number;
}

export default function ClassShowControls({
  revealed, isLast, onSkip, onNext, onChooseDifferentMode, currentIndex, total,
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
            onClick={onChooseDifferentMode}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-secondary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="px-5 py-3 rounded-xl font-bold border-2 inline-flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            {t.chooseDifferentMode}
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              backgroundColor: 'var(--vb-surface-alt)',
              color: 'var(--vb-text-secondary)',
            }}
            className="px-5 py-3 rounded-xl font-bold inline-flex items-center gap-2"
          >
            <SkipForward size={18} />
            {t.skip}
          </button>
          {revealed && (
            <button
              type="button"
              onClick={onNext}
              style={{
                backgroundColor: 'var(--vb-accent)',
                color: 'var(--vb-accent-text)',
              }}
              className="px-8 py-4 rounded-xl font-black text-lg shadow-lg inline-flex items-center gap-2"
            >
              {isLast ? t.chooseDifferentMode : t.next}
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
