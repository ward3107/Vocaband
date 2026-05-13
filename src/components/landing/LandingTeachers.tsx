import React from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  CheckCircle2,
  Layers,
  BarChart3,
  Clock,
  Sparkles,
  Wand2,
  Camera,
  ArrowRight,
  Radio,
  Globe,
} from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";
import CssAnimation from "../CssAnimation";

const LandingTeachers: React.FC = () => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];

  return (
    <section id="teachers" className="py-8 md:py-20 px-4 md:px-6 relative scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto mb-8 md:mb-12 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-sky-500/20 backdrop-blur-md border border-sky-400/30 mb-6"
        >
          <GraduationCap size={24} className="text-sky-300" />
          <span className="text-base font-black tracking-widest uppercase text-sky-200">
            {t.teachersSectionPill}
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, scale: 0.35 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 35, damping: 18, delay: 0.4 }}
          className="text-4xl md:text-8xl lg:text-9xl font-black font-headline mb-6 md:mb-8 tracking-tight"
        >
          <motion.span
            animate={{
              scale: [1, 1.015, 1],
              filter: [
                "drop-shadow(0 0 50px rgba(56,189,248,0.55))",
                "drop-shadow(0 0 80px rgba(56,189,248,0.75))",
                "drop-shadow(0 0 50px rgba(56,189,248,0.55))",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-transparent"
          >
            {t.teachersSectionH2}
          </motion.span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/80 font-bold" dir={dir}>
          {t.teachersSectionSubtitle}
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Auto-Grading - Large Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ y: -12, scale: 1.02 }}
          className="relative group md:col-span-2"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)] hover:shadow-[0_30px_80px_rgba(14,165,233,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                <CheckCircle2 size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black mb-3">{t.autoGradingTitle}</h3>
                <p className="text-white/80 font-bold text-lg max-w-2xl" dir={dir}>
                  {t.autoGradingDesc}
                </p>
              </div>
              <div className="flex-shrink-0">
                <CssAnimation type="analytics" size={80} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ready-Made Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/35 via-teal-500/35 to-cyan-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <Layers size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.useYourOwnWordsTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.useYourOwnWordsDesc}
              </p>
              <div className="mt-4 relative h-16 flex items-center justify-center">
                {["apple", "liberty", "journey"].map((word, i) => (
                  <motion.div
                    key={word}
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.6, 1, 0.6],
                      rotate: [-5, 5, -5],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                    className="absolute px-3 py-1 rounded-lg bg-white/20 text-xs font-black"
                    style={{ left: `${15 + i * 30}%` }}
                  >
                    {word}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Real-Time Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <BarChart3 size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.spotStrugglingTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.spotStrugglingDesc}
              </p>
              <div className="mt-4 relative h-16 flex items-end justify-center gap-2">
                {[40, 65, 45, 80, 55, 90].map((height, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [height * 0.3, height, height * 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                    className="w-6 bg-white/30 rounded-t-lg"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Setup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <Clock size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.quickSetupTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.quickSetupDesc}
              </p>
              <div className="mt-4 relative h-16 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="text-5xl relative"
                >
                  ⏱️
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 rounded-full"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Student Engagement */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(244,114,182,0.3)] hover:shadow-[0_30px_80px_rgba(244,114,182,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <Sparkles size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.studentEngagementTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.studentEngagementDesc}
              </p>
              <div className="mt-4 relative h-16 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  className="text-4xl"
                >
                  🎮
                </motion.div>
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 180],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.3,
                    }}
                    className="absolute text-lg"
                    style={{
                      top: `${20 + Math.sin(i * 1.5) * 20}%`,
                      left: `${30 + i * 15}%`,
                    }}
                  >
                    ✨
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Sentence Builder — power tool. */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.55 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <Wand2 size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.aiSentenceBuilderTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.aiSentenceBuilderDesc}
              </p>
              <div className="mt-4 px-3 py-2 rounded-xl bg-white/10 text-xs font-bold leading-relaxed">
                "She <span className="bg-white/30 px-1 rounded">sprinted</span> across the field to catch the ball."
              </div>
            </div>
          </div>
        </motion.div>

        {/* Camera OCR — power tool. */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="relative group"
        >
          <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <Camera size={28} />
              </div>
              <h3 className="text-2xl font-black mb-2">{t.snapWordlistTitle}</h3>
              <p className="text-white/80 font-bold text-sm" dir={dir}>
                {t.snapWordlistDesc}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="text-3xl">📷</div>
                <ArrowRight size={20} className="text-white/60" />
                <div className="text-3xl">📋</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Play — full-width spanning card.  No-signup live
            multiplayer is a unique feature worth surfacing
            prominently — students join with just a class code on
            the projected QR, no accounts to manage. */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.65 }}
          whileHover={{ y: -12, scale: 1.02 }}
          className="relative group md:col-span-2"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                <Radio size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black mb-3">{t.quickPlayTitle}</h3>
                <p className="text-white/85 font-bold text-lg max-w-2xl" dir={dir}>
                  {t.quickPlayDesc}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm font-mono font-black text-2xl tracking-widest">
                  ABC123
                </div>
                <div className="text-xs uppercase tracking-widest opacity-80">{t.quickPlayScanPlay}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hebrew + Arabic translations — full-width finale of the
            teacher grid.  This is THE differentiator vs. Quizlet,
            Kahoot, Wordwall: every word ships with native HE + AR
            translations baked into the data layer (vocabulary.ts
            tuple format).  Surfaced here as its own card because
            it's the single biggest reason a multilingual classroom
            picks Vocaband over global English-only competitors. */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ y: -12, scale: 1.02 }}
          className="relative group md:col-span-2"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                <Globe size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black mb-3">{t.hebrewArabicTitle}</h3>
                <p className="text-white/85 font-bold text-lg max-w-2xl" dir={dir}>
                  {t.hebrewArabicDesc}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm">
                  apple
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm" dir="rtl">
                  תפוח
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm" dir="rtl">
                  تفاحة
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingTeachers;
