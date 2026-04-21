/**
 * StructureKindPicker — first-run modal that lets a student pick what
 * they'd like to build: a garden, a city, a rocket, or a castle.
 *
 * Renders only when `open` is true.  On pick, calls onPick(kind).  The
 * caller (StudentDashboardView) passes open=true on the first load
 * where useStructure reports no chosen kind.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { STRUCTURE_KINDS, type StructureKind } from '../../constants/game';

export interface StructureKindPickerProps {
  open: boolean;
  onPick: (kind: StructureKind) => void;
}

const GRADIENTS: Record<StructureKind, string> = {
  garden: 'from-emerald-400 via-lime-400 to-yellow-300',
  city:   'from-indigo-500 via-sky-500 to-cyan-400',
  rocket: 'from-slate-700 via-indigo-700 to-fuchsia-600',
  castle: 'from-amber-500 via-rose-500 to-purple-600',
};

export const StructureKindPicker: React.FC<StructureKindPickerProps> = ({ open, onPick }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-stone-900/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="structure-picker-title"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-5 sm:p-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black uppercase tracking-widest mb-3">
                <Sparkles size={14} />
                Welcome!
              </div>
              <h2 id="structure-picker-title" className="text-2xl sm:text-3xl font-black text-stone-900">
                Pick what you'd like to build.
              </h2>
              <p className="mt-2 text-sm sm:text-base text-stone-600">
                As you master words and earn perfect scores, pieces of your creation unlock — one by one.
                Pick a style you'll love to see grow.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STRUCTURE_KINDS.map(kind => (
                <button
                  key={kind.kind}
                  onClick={() => onPick(kind.kind)}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className={`group relative overflow-hidden rounded-2xl p-4 text-white text-left transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95 bg-gradient-to-br ${GRADIENTS[kind.kind]}`}
                >
                  <div className="text-4xl sm:text-5xl mb-2 drop-shadow-sm" aria-hidden="true">{kind.emoji}</div>
                  <div className="text-lg font-black drop-shadow-sm">{kind.label}</div>
                  <div className="text-xs opacity-90 leading-snug mt-1">{kind.tagline}</div>
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-xs text-stone-500">
              Don't worry — you can change later.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
