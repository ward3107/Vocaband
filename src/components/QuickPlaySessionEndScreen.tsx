import React from 'react';
import { motion } from 'motion/react';

interface QuickPlaySessionEndScreenProps {
  studentName: string;
  finalScore: number;
  onGoHome: () => void;
}

export default function QuickPlaySessionEndScreen({
  studentName,
  finalScore,
  onGoHome,
}: QuickPlaySessionEndScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-white rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-2xl text-center"
      >
        {/* Confetti-like decoration */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="text-5xl sm:text-6xl mb-4"
        >
          {"\uD83C\uDF89"}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-black text-gray-900 mb-2"
        >
          Session Complete!
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-gray-500 mb-6"
        >
          Great job, <strong>{studentName}</strong>!
        </motion.p>

        {/* Score display */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-100"
        >
          <div className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1">Your Final Score</div>
          <div className="text-5xl sm:text-6xl font-black text-indigo-600">
            {finalScore}
          </div>
          <div className="text-sm text-indigo-400 font-bold mt-1">points</div>
        </motion.div>

        {/* Sign up prompt */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 rounded-2xl p-4 mb-6 border-2 border-amber-200"
        >
          <p className="text-amber-700 text-sm font-medium">
            {"\u2B50"} Sign up to save your progress, earn XP, and compete on leaderboards!
          </p>
        </motion.div>

        {/* Button */}
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
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
