import React from "react";
import { motion } from "motion/react";
import { Rocket, Sparkles, GraduationCap } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";

interface LandingFinalCTAProps {
  onTryDemo?: () => void;
  onTeacherLogin: () => void;
  isAuthenticated?: boolean;
}

const LandingFinalCTA: React.FC<LandingFinalCTAProps> = ({ onTryDemo, onTeacherLogin, isAuthenticated }) => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];

  return (
    <section className="py-8 md:py-24 px-4 md:px-6 bg-violet-950 relative overflow-hidden">
      {/* Cosmic backdrop — pure CSS gradient + animated mesh replaces the
          old 4.5 MB MP4 with GPU-cheap motion. */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950" aria-hidden="true" />
      <div className="absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, 120, 0], x: [0, 60, 0], y: [0, -40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-32 w-[28rem] h-[28rem] bg-gradient-to-br from-fuchsia-500/25 to-violet-500/25 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -120, 0], x: [0, -60, 0], y: [0, 40, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/25 to-cyan-500/25 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-5xl mx-auto relative z-10"
      >
        <div className="relative p-6 md:p-20 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-violet-600/40 via-purple-600/40 to-fuchsia-600/40 backdrop-blur-sm border border-white/15 text-white text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <motion.div
              animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle, #fff 2px, transparent 2px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_2px_20px_rgba(255,255,255,0.2)]" />

          <div className="relative z-10">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-7xl md:text-8xl mb-6"
            >
              🏆
            </motion.div>

            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black font-headline mb-6 tracking-tight">
              {t.finalCtaH2Line1}
              <span className="inline-block pr-4 pb-2 mt-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                {t.finalCtaH2Line2}
              </span>
            </h2>

            <p className="text-xl text-white/80 font-bold mb-6 md:mb-10 max-w-2xl mx-auto" dir={dir}>
              {t.finalCtaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onTryDemo}
                className="group relative px-10 py-5 rounded-2xl text-xl font-black text-white shadow-[0_10px_0_0_#6d28d9,0_25px_50px_rgba(139,92,246,0.5)] hover:shadow-[0_14px_0_0_#5b21b6,0_35px_60px_rgba(139,92,246,0.6)] active:shadow-[0_4px_0_0_#6d28d9,0_12px_25px_rgba(139,92,246,0.4)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 overflow-hidden"
              >
                <Rocket size={24} className="relative z-10" />
                <span className="relative z-10">{t.finalCtaStart}</span>
                <Sparkles size={24} className="relative z-10" fill="currentColor" />
              </motion.button>

              {!isAuthenticated && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onTeacherLogin}
                  className="group relative px-8 py-5 rounded-2xl text-lg font-bold text-purple-600 shadow-[0_10px_0_0_#4c1d95,0_25px_50px_rgba(76,29,149,0.3)] hover:shadow-[0_14px_0_0_#3b0764,0_35px_60px_rgba(76,29,149,0.4)] active:shadow-[0_4px_0_0_#4c1d95,0_12px_25px_rgba(76,29,149,0.3)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-white overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-white to-gray-50" />
                  <GraduationCap size={22} className="relative z-10" />
                  <span className="relative z-10">{t.finalCtaTeacher}</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingFinalCTA;
