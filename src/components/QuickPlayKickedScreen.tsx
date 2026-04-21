import { motion } from 'motion/react';

interface QuickPlayKickedScreenProps {
  onGoHome: () => void;
  onRejoin?: () => void;
}

export default function QuickPlayKickedScreen({
  onGoHome,
  onRejoin,
}: QuickPlayKickedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl text-center"
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl">🚫</span>
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-black text-gray-900 mb-3"
        >
          You've been removed
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 mb-6 text-sm sm:text-base leading-relaxed"
        >
          Your teacher removed you from this Quick Play session.
          {onRejoin && ' If this was a mistake, you can rejoin with a different name.'}
        </motion.p>

        {/* Rejoin button — only when we still have the session context to
            re-enter. Keeps the student in-flow instead of bouncing them
            back to the landing page and making them re-scan the QR. */}
        {onRejoin && (
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRejoin}
            type="button"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-indigo-200 hover:shadow-xl transition-all mb-3"
          >
            Rejoin with a different name
          </motion.button>
        )}

        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: onRejoin ? 0.55 : 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoHome}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={
            onRejoin
              ? 'w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm sm:text-base hover:bg-slate-200 transition-all'
              : 'w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-indigo-200 hover:shadow-xl transition-all'
          }
        >
          {onRejoin ? 'Leave Quick Play' : 'Back to Home Page'}
        </motion.button>
      </motion.div>
    </div>
  );
}
