import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Target, Star } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";

// "Your Journey to Mastery" — scroll-driven traveler.  As the user
// scrolls past the section, a traveler emoji walks down a curved
// SVG trail; when it reaches each milestone, that stamp activates
// (scales up + colors in + glows).
const LandingJourney: React.FC = () => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];

  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: journeyProgress } = useScroll({
    target: journeyRef,
    offset: ["start 70%", "end 30%"],
  });
  const travelerTop = useTransform(journeyProgress, [0, 1], ["-2%", "100%"]);
  const travelerLeft = useTransform(
    journeyProgress,
    (p) => `${50 - Math.sin(p * Math.PI * 3) * 22}%`,
  );
  const stamp1Scale = useTransform(journeyProgress, [0.10, 0.22], [0.55, 1.1]);
  const stamp1Glow = useTransform(journeyProgress, [0.10, 0.22], [0, 1]);
  const stamp2Scale = useTransform(journeyProgress, [0.43, 0.55], [0.55, 1.1]);
  const stamp2Glow = useTransform(journeyProgress, [0.43, 0.55], [0, 1]);
  const stamp3Scale = useTransform(journeyProgress, [0.76, 0.88], [0.55, 1.1]);
  const stamp3Glow = useTransform(journeyProgress, [0.76, 0.88], [0, 1]);

  return (
    <section id="curriculum" className="py-8 md:py-20 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center mb-8 md:mb-16"
      >
        <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
          {t.curriculumSectionH2}
        </h2>
        <p className="text-lg text-white/80 font-bold" dir={dir}>
          {t.curriculumSectionSubtitle}
        </p>
      </motion.div>

      <div ref={journeyRef} className="max-w-5xl mx-auto relative">
        {/* Curved SVG trail — winds left-right between Set1, Set2,
            Set3 like a video-game level map.  preserveAspectRatio
            "none" lets the path stretch with the container height. */}
        <svg
          className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="journeyTrail" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="M 50 0 C 38 11, 28 8, 28 18 C 28 28, 50 22, 50 33 C 50 44, 72 38, 72 50 C 72 62, 50 56, 50 67 C 50 78, 28 72, 28 83 C 28 94, 50 88, 50 100"
            stroke="url(#journeyTrail)"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeDasharray="0.5 1.2"
            opacity="0.85"
          />
        </svg>

        <motion.div
          className="hidden md:flex absolute z-30 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white items-center justify-center text-3xl shadow-[0_8px_30px_rgba(251,191,36,0.6)] ring-4 ring-amber-400"
          style={{ top: travelerTop, left: travelerLeft }}
          aria-hidden="true"
        >
          🎒
        </motion.div>

        <div className="space-y-8 md:space-y-16">
          {/* Set 1 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col md:flex-row items-center gap-6"
          >
            <div className="md:w-1/2 md:text-right md:pr-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                <Target size={24} />
                <div>
                  <p className="font-black text-lg">{t.set1Title}</p>
                  <p className="text-white/80 text-sm">{t.set1Desc}</p>
                </div>
              </div>
            </div>
            <motion.div
              style={{ scale: stamp1Scale }}
              className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
              <motion.div
                style={{ opacity: stamp1Glow }}
                className="absolute -inset-3 rounded-full bg-emerald-400/50 blur-2xl"
              />
              <motion.div
                style={{ opacity: stamp1Glow }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 ring-4 ring-white shadow-[0_0_40px_rgba(16,185,129,0.8)]"
              />
              <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">1</span>
            </motion.div>
            <div className="md:w-1/2 md:pl-12">
              <div className="p-4 rounded-2xl bg-surface-container-high">
                <div className="flex justify-between mb-2">
                  <span className="font-bold">{t.curriculumProgress}</span>
                  <span className="text-emerald-600 font-black">{t.set1Words}</span>
                </div>
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Set 2 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col md:flex-row-reverse items-center gap-6"
          >
            <div className="md:w-1/2 md:text-left md:pl-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                <Target size={24} />
                <div>
                  <p className="font-black text-lg">{t.set2Title}</p>
                  <p className="text-white/80 text-sm">{t.set2Desc}</p>
                </div>
              </div>
            </div>
            <motion.div
              style={{ scale: stamp2Scale }}
              className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
              <motion.div
                style={{ opacity: stamp2Glow }}
                className="absolute -inset-3 rounded-full bg-blue-400/50 blur-2xl"
              />
              <motion.div
                style={{ opacity: stamp2Glow }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 ring-4 ring-white shadow-[0_0_40px_rgba(59,130,246,0.8)]"
              />
              <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">2</span>
            </motion.div>
            <div className="md:w-1/2 md:pr-12 md:text-right">
              <div className="p-4 rounded-2xl bg-surface-container-high">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-600 font-black">{t.set2Words}</span>
                  <span className="font-bold">{t.curriculumProgress}</span>
                </div>
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "75%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Set 3 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col md:flex-row items-center gap-6"
          >
            <div className="md:w-1/2 md:text-right md:pr-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                <Star size={24} />
                <div>
                  <p className="font-black text-lg">{t.set3Title}</p>
                  <p className="text-white/80 text-sm">{t.set3Desc}</p>
                </div>
              </div>
            </div>
            <motion.div
              style={{ scale: stamp3Scale }}
              className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
              <motion.div
                style={{ opacity: stamp3Glow }}
                className="absolute -inset-3 rounded-full bg-fuchsia-400/50 blur-2xl"
              />
              <motion.div
                style={{ opacity: stamp3Glow }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-4 ring-white shadow-[0_0_40px_rgba(217,70,239,0.8)]"
              />
              <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">3</span>
            </motion.div>
            <div className="md:w-1/2 md:pl-12">
              <div className="p-4 rounded-2xl bg-surface-container-high">
                <div className="flex justify-between mb-2">
                  <span className="font-bold">{t.curriculumProgress}</span>
                  <span className="text-violet-600 font-black">{t.set3Words}</span>
                </div>
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "50%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Summit reward — the destination of the journey.  Springs
              in once the traveler reaches the bottom; floating trophy
              signals "you've arrived." */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.2 }}
            className="relative flex justify-center pt-4"
          >
            <div className="relative p-6 md:px-14 md:py-10 rounded-[2rem] bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white shadow-[0_20px_60px_rgba(251,191,36,0.55)] text-center overflow-hidden max-w-md">
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-6 rounded-[3rem] bg-amber-300/30 blur-3xl -z-10"
              />
              <div className="relative z-10">
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-7xl mb-3 drop-shadow-lg"
                >
                  🏆
                </motion.div>
                <h3 className="text-3xl md:text-4xl font-black mb-2 drop-shadow-md">
                  {t.summitTitle}
                </h3>
                <p className="text-white/95 font-bold text-base md:text-lg" dir={dir}>
                  {t.summitDesc}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingJourney;
