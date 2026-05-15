import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";

const LandingAI: React.FC = () => {
  const { language, dir, isRTL } = useLanguage();
  const t = landingPageT[language];

  return (
    <section id="ai" className="py-8 md:py-20 px-4 md:px-6 relative isolate overflow-hidden bg-gradient-to-b from-transparent via-violet-950/20 to-transparent scroll-mt-20">
      {/* Brand-tint backdrop + animated gradient mesh — replaces the
          3 MB MP4 with pure GPU motion. */}
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900"
        aria-hidden="true"
      />
      <div className="absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.25, 1], rotate: [0, 90, 0], x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0], x: [0, -80, 0], y: [0, 60, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 -left-32 w-[28rem] h-[28rem] bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 rounded-full blur-3xl"
        />
      </div>
      <motion.div
        initial={{ opacity: 0, x: isRTL ? -100 : 100 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-6xl mx-auto mb-8 md:mb-12 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 backdrop-blur-md border border-violet-400/30 mb-6"
        >
          <Sparkles size={18} className="text-violet-300" />
          <span className="text-sm font-black tracking-widest uppercase text-violet-200">AI-POWERED</span>
        </motion.div>
        <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
          {t.aiSectionH2}
        </h2>
        <p className="text-xl text-white/80 font-bold mb-12" dir={dir}>
          {t.aiSectionSubtitle}
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Zero Prep Work */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="relative group"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/35 via-teal-500/35 to-cyan-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300">
            <div className="relative z-10 text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-6"
              >
                ⚡
              </motion.div>
              <h3 className="text-2xl font-black mb-4">{t.aiZeroWork}</h3>
              <p className="text-white/90 font-bold text-lg leading-relaxed">
                {t.aiZeroWorkDesc}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
          </div>
        </motion.div>

        {/* AI-Generated Content */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="relative group"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-violet-500/35 via-purple-500/35 to-fuchsia-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300">
            <div className="relative z-10 text-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="text-6xl mb-6"
              >
                🤖
              </motion.div>
              <h3 className="text-2xl font-black mb-4">{t.aiAutoSentences}</h3>
              <p className="text-white/90 font-bold text-lg leading-relaxed">
                {t.aiAutoSentencesDesc}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
          </div>
        </motion.div>

        {/* Auto-Grading */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="relative group"
        >
          <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-amber-500/35 via-orange-500/35 to-rose-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300">
            <div className="relative z-10 text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-6"
              >
                ✅
              </motion.div>
              <h3 className="text-2xl font-black mb-4">{t.aiAutoGrading}</h3>
              <p className="text-white/90 font-bold text-lg leading-relaxed">
                {t.aiAutoGradingDesc}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-10 md:mt-16"
      >
        <p className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
          {t.aiJustAssign}
        </p>
      </motion.div>
    </section>
  );
};

export default LandingAI;
