import React from 'react';
import { motion } from 'motion/react';

interface QuickPlayKickedScreenProps {
  onGoHome: () => void;
}

export default function QuickPlayKickedScreen({ onGoHome }: QuickPlayKickedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-white rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-2xl text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl">{"\uD83D\uDEAB"}</span>
        </motion.div>

        {/* Message */}
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
          className="text-gray-500 mb-8 text-sm sm:text-base leading-relaxed"
        >
          The teacher has removed you from this Quick Play session. If you think this was a mistake, please speak with your teacher.
        </motion.p>

        {/* Button */}
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoHome}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
        >
          Back to Home Page
        </motion.button>
      </motion.div>
    </div>
  );
}
