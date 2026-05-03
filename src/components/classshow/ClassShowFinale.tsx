/**
 * ClassShowFinale — full-screen "Show complete!" celebration with
 * Play another / Back to dashboard buttons.  No scoring, no rankings.
 */
import { motion } from 'motion/react';
import { Sparkles, RotateCcw, Home } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';

interface ClassShowFinaleProps {
  questionsCovered: number;
  onPlayAnother: () => void;
  onBackToDashboard: () => void;
}

export default function ClassShowFinale({ questionsCovered, onPlayAnother, onBackToDashboard }: ClassShowFinaleProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl p-8 sm:p-12 text-center"
      >
        <div
          className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"
        >
          <Sparkles size={40} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-3" style={{ color: 'var(--vb-text-primary)' }}>
          {t.showComplete}
        </h1>
        <p className="text-lg sm:text-xl mb-10" style={{ color: 'var(--vb-text-secondary)' }}>
          {t.showCompleteSubtitle(questionsCovered)}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-secondary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="px-6 py-4 rounded-2xl font-bold border-2 inline-flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
          >
            <Home size={20} />
            {t.backToDashboard}
          </button>
          <button
            type="button"
            onClick={onPlayAnother}
            style={{
              backgroundColor: 'var(--vb-accent)',
              color: 'var(--vb-accent-text)',
            }}
            className="px-6 py-4 rounded-2xl font-black inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw size={20} />
            {t.playAnother}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
