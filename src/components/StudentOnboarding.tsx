import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import { useLanguage, type Language } from '../hooks/useLanguage';

interface StudentOnboardingProps {
  userName: string;
  onComplete: () => void;
}

type Step = { icon: string; title: string; description: string };

const STEPS_BY_LANG: Record<Language, Step[]> = {
  en: [
    { icon: '👋', title: 'Welcome to Vocaband!', description: "This is your learning dashboard. Here you'll find assignments from your teacher and track your progress." },
    { icon: '📝', title: 'Complete Assignments', description: 'Your teacher will create word assignments. Each one has multiple game modes — pick the one you like!' },
    { icon: '🎮', title: '15 Game Modes', description: 'Classic quiz, Spelling, Matching, Listening, Scramble, and more. Each mode helps you learn in a different way.' },
    { icon: '⚡', title: 'Earn XP & Level Up', description: 'Every game earns you XP. Score 80%+ to keep your streak going! Reach new ranks: Learner → Scholar → Expert → Master → Legend.' },
    { icon: '🛍️', title: 'Visit the Shop', description: 'Spend your XP on avatars, themes, power-ups, and titles. Make your profile unique!' },
  ],
  he: [
    { icon: '👋', title: 'ברוכים הבאים ל-Vocaband!', description: 'זה דאשבורד הלמידה שלכם. כאן תמצאו משימות מהמורה ותעקבו אחרי ההתקדמות.' },
    { icon: '📝', title: 'השלימו משימות', description: 'המורה ייצור משימות מילים. בכל אחת יש כמה מצבי משחק — בחרו את האהוב עליכם!' },
    { icon: '🎮', title: '15 מצבי משחק', description: 'חידון קלאסי, איות, התאמה, האזנה, ערבול ועוד. כל מצב עוזר לכם ללמוד אחרת.' },
    { icon: '⚡', title: 'צברו XP והעפילו', description: 'כל משחק מקנה XP. ציון 80%+ שומר על הרצף! הגיעו לדרגות חדשות: לומד → תלמיד חכם → מומחה → מאסטר → אגדה.' },
    { icon: '🛍️', title: 'בקרו בחנות', description: 'הוציאו את ה-XP על אווטארים, ערכות נושא, חיזוקים ותארים. עיצבו פרופיל ייחודי!' },
  ],
  ar: [
    { icon: '👋', title: 'مرحبًا بك في Vocaband!', description: 'هذه لوحة التعلّم الخاصة بك. ستجد هنا واجبات من معلمك ومتابعة تقدمك.' },
    { icon: '📝', title: 'أكمل الواجبات', description: 'سيُنشئ معلمك واجبات كلمات. لكل واجب عدّة أوضاع لعب — اختر ما تحبّه!' },
    { icon: '🎮', title: '15 أوضاع لعب', description: 'اختبار كلاسيكي، تهجئة، مطابقة، استماع، خلط، والمزيد. كل وضع يساعدك على التعلّم بطريقة مختلفة.' },
    { icon: '⚡', title: 'اكسب XP وارتقِ', description: 'كل لعبة تمنحك XP. سجّل 80%+ للحفاظ على سلسلة الانتصارات! ارتقِ في الرتب: متعلّم → دارس → خبير → ماستر → أسطورة.' },
    { icon: '🛍️', title: 'زُر المتجر', description: 'استخدم XP لشراء أفاتارات وثيمات ومعزّزات وألقاب. اجعل ملفك مميزًا!' },
  ],
};

export default function StudentOnboarding({ userName, onComplete }: StudentOnboardingProps) {
  const { language, dir } = useLanguage();
  const STEPS = STEPS_BY_LANG[language];
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
  const skipAria = language === 'he' ? 'דלגו על האונבורדינג' : language === 'ar' ? 'تخطّي التعريف' : 'Skip onboarding';
  const letsGoLabel = language === 'he' ? 'יוצאים לדרך!' : language === 'ar' ? 'لنبدأ!' : "Let's Go!";
  const nextLabel = language === 'he' ? 'הבא' : language === 'ar' ? 'التالي' : 'Next';
  const heyName = language === 'he' ? `שלום ${userName}!` : language === 'ar' ? `أهلاً ${userName}!` : `Hey ${userName}!`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir={dir}>
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
          className="absolute top-4 end-4 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={skipAria}
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
            {heyName} {current.title.split('!')[0]}!
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
          {step === STEPS.length - 1 ? letsGoLabel : nextLabel}
          {step < STEPS.length - 1 && <ChevronRight size={20} />}
        </button>
      </motion.div>
    </div>
  );
}
