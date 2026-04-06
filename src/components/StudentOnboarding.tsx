import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';

interface StudentOnboardingProps {
  userName: string;
  onComplete: () => void;
}

const STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Vocaband!',
    description: 'This is your learning dashboard. Here you\'ll find assignments from your teacher and track your progress.',
  },
  {
    icon: '📝',
    title: 'Complete Assignments',
    description: 'Your teacher will create word assignments. Each one has multiple game modes — pick the one you like!',
  },
  {
    icon: '🎮',
    title: '10 Game Modes',
    description: 'Classic quiz, Spelling, Matching, Listening, Scramble, and more. Each mode helps you learn in a different way.',
  },
  {
    icon: '⚡',
    title: 'Earn XP & Level Up',
    description: 'Every game earns you XP. Score 80%+ to keep your streak going! Reach new ranks: Learner → Scholar → Expert → Master → Legend.',
  },
  {
    icon: '🛍️',
    title: 'Visit the Shop',
    description: 'Spend your XP on avatars, themes, power-ups, and titles. Make your profile unique!',
  },
];

export default function StudentOnboarding({ userName, onComplete }: StudentOnboardingProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('vocaband_student_onboarding_done', '1');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('vocaband_student_onboarding_done', '1');
    onComplete();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center relative"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="Skip onboarding"
        >
          <X size={20} />
        </button>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-blue-600' : i < step ? 'w-4 bg-blue-300' : 'w-4 bg-stone-200'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-5xl mb-4">{current.icon}</div>

        {/* Content */}
        {step === 0 ? (
          <h2 className="text-2xl font-black mb-2 text-stone-900">
            Hey {userName}! {current.title.split('!')[0]}!
          </h2>
        ) : (
          <h2 className="text-xl font-black mb-2 text-stone-900">{current.title}</h2>
        )}
        <p className="text-stone-500 mb-8 text-sm leading-relaxed">{current.description}</p>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {step === STEPS.length - 1 ? "Let's Go!" : 'Next'}
          {step < STEPS.length - 1 && <ChevronRight size={20} />}
        </button>
      </motion.div>
    </div>
  );
}
