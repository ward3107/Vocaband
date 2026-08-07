import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { quickPlayT } from '../locales/student/quick-play';
import type { Language } from '../hooks/useLanguage';

interface Props {
  language: Language;
  handRaised: boolean;
  onRaiseHand: () => void;
  onReplayAudio: () => void;
  onForceReconnect: () => void;
  onToggleTranslation: () => void;
}

// Fixed bottom-right floating 🆘 button. Mounted ONLY during Quick Play
// gameplay phase — see docs/superpowers/specs/2026-08-07-quick-play-help
// -button-design.md. `data-quick-play-help` lets future stacked-corner
// components detect + offset (mirroring the existing data-floating-buttons
// pattern in FloatingButtons.tsx).
export function QuickPlayHelpButton({
  language, handRaised,
  onRaiseHand, onReplayAudio, onForceReconnect, onToggleTranslation,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = quickPlayT[language] ?? quickPlayT.en;

  const doAction = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div data-quick-play-help className="fixed bottom-4 right-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute bottom-16 right-0 w-64 rounded-2xl bg-white p-3 shadow-2xl"
          >
            <div className="mb-2 px-2 text-sm font-black text-stone-800">
              {t.helpMenuTitle}
            </div>
            <button
              type="button"
              onClick={doAction(onReplayAudio)}
              className="mb-1 w-full rounded-xl bg-amber-100 px-3 py-2 text-left text-sm font-bold text-amber-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpCantHearWord}
            </button>
            <button
              type="button"
              onClick={doAction(onForceReconnect)}
              className="mb-1 w-full rounded-xl bg-blue-100 px-3 py-2 text-left text-sm font-bold text-blue-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpGameFrozen}
            </button>
            <button
              type="button"
              onClick={doAction(onToggleTranslation)}
              className="mb-1 w-full rounded-xl bg-emerald-100 px-3 py-2 text-left text-sm font-bold text-emerald-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpCantRead}
            </button>
            <button
              type="button"
              onClick={doAction(onRaiseHand)}
              disabled={handRaised}
              className="w-full rounded-xl bg-pink-100 px-3 py-2 text-left text-sm font-bold text-pink-900 disabled:opacity-50"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {handRaised ? t.helpHandRaisedStatePill : t.helpShowTeacher}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t.helpButtonAria}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-white shadow-lg ${
          handRaised
            ? 'bg-gradient-to-br from-stone-400 to-stone-500'
            : 'bg-gradient-to-br from-red-500 to-rose-600'
        }`}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        {handRaised ? '✓' : '🆘'}
      </motion.button>
    </div>
  );
}
