import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { faqT } from "../locales/student/faq";
import { ChevronDown, CircleHelp, Mail, GraduationCap, Users, Globe, ArrowLeft } from "lucide-react";
import PublicNav from "../components/PublicNav";

interface FaqViewProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "faq") => void;
  onGetStarted: () => void;
  onBack: () => void;
}

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, isOpen, onToggle }) => {
  const { dir, textAlign } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <CircleHelp size={22} className="text-violet-400 flex-shrink-0" />
        <span className="flex-1 font-bold text-white text-lg">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={24} className="text-white/60" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-0">
              <div className="pl-9 text-white/80 leading-relaxed" dir={dir} style={{ textAlign }}>
                {answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FaqView: React.FC<FaqViewProps> = ({ onNavigate, onGetStarted, onBack }) => {
  const { language, dir, textAlign, isRTL } = useLanguage();
  const t = faqT[language];
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all group"
            >
              <ArrowLeft size={20} className={`transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-violet-500/20 border border-violet-400/30 mb-6">
              <CircleHelp size={20} className="text-violet-300" />
              <span className="text-violet-200 font-bold text-sm">FAQ</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-headline">
              {t.title}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto" dir={dir} style={{ textAlign }}>
              {t.subtitle}
            </p>
          </motion.div>

          {/* Teacher Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <GraduationCap size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t.teacherSection}</h2>
            </div>
            <div className="space-y-4">
              <FaqItem question={t.q1} answer={t.a1} isOpen={openItem === "q1"} onToggle={() => toggleItem("q1")} />
              <FaqItem question={t.q2} answer={t.a2} isOpen={openItem === "q2"} onToggle={() => toggleItem("q2")} />
              <FaqItem question={t.q3} answer={t.a3} isOpen={openItem === "q3"} onToggle={() => toggleItem("q3")} />
              <FaqItem question={t.q4} answer={t.a4} isOpen={openItem === "q4"} onToggle={() => toggleItem("q4")} />
              <FaqItem question={t.q5} answer={t.a5} isOpen={openItem === "q5"} onToggle={() => toggleItem("q5")} />
              <FaqItem question={t.q6} answer={t.a6} isOpen={openItem === "q6"} onToggle={() => toggleItem("q6")} />
            </div>
          </motion.div>

          {/* Student Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t.studentSection}</h2>
            </div>
            <div className="space-y-4">
              <FaqItem question={t.q7} answer={t.a7} isOpen={openItem === "q7"} onToggle={() => toggleItem("q7")} />
              <FaqItem question={t.q8} answer={t.a8} isOpen={openItem === "q8"} onToggle={() => toggleItem("q8")} />
              <FaqItem question={t.q9} answer={t.a9} isOpen={openItem === "q9"} onToggle={() => toggleItem("q9")} />
              <FaqItem question={t.q10} answer={t.a10} isOpen={openItem === "q10"} onToggle={() => toggleItem("q10")} />
            </div>
          </motion.div>

          {/* General Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Globe size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t.generalSection}</h2>
            </div>
            <div className="space-y-4">
              <FaqItem question={t.q11} answer={t.a11} isOpen={openItem === "q11"} onToggle={() => toggleItem("q11")} />
              <FaqItem question={t.q12} answer={t.a12} isOpen={openItem === "q12"} onToggle={() => toggleItem("q12")} />
              <FaqItem question={t.q13} answer={t.a13} isOpen={openItem === "q13"} onToggle={() => toggleItem("q13")} />
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10"
          >
            <Mail size={32} className="text-violet-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t.cta}</h3>
            <a
              href="mailto:contact@vocaband.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
            >
              {t.ctaButton}
            </a>
          </motion.div>

          {/* Back Button - Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex justify-center"
          >
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 font-bold transition-all border border-white/20 hover:border-white/30"
            >
              <ArrowLeft size={20} className={`transition-transform ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default FaqView;
