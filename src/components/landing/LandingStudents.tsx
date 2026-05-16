import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Trophy, Coins, Gift, Zap, Crown, Flame } from "lucide-react";
import Tilt from "react-parallax-tilt";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";
import CssAnimation from "../CssAnimation";

// "Why Students Love Vocaband" — scroll-driven parallax.  Each card
// drifts at its own rate as the section scrolls past, so they appear
// to float at different depths.  Cards alternate +/- direction so
// the grid stays roughly aligned at mid-scroll.
const LandingStudents: React.FC = () => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const cardYBig = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const cardYLive = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const cardYShop = useTransform(scrollYProgress, [0, 1], [25, -25]);
  const cardYEggs = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const cardYBoost = useTransform(scrollYProgress, [0, 1], [25, -25]);
  const cardYPet = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const cardYStreak = useTransform(scrollYProgress, [0, 1], [30, -30]);

  // Spotlight follow — mouseMove updates CSS vars on the target.
  // The spotlight overlay reads them via var(--mx) / var(--my).
  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--mx", `${x}%`);
    target.style.setProperty("--my", `${y}%`);
  };

  return (
    <section ref={sectionRef} className="py-8 md:py-20 px-4 md:px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto mb-8 md:mb-12 text-center"
      >
        <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
          {t.studentsSectionH2}
        </h2>
        <p className="text-lg text-white/80 font-bold" dir={dir}>
          {t.studentsSectionSubtitle}
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 15 Game Modes - Large Card */}
        <motion.div style={{ y: cardYBig }} className="lg:col-span-2 row-span-2 h-full">
          <Tilt
            tiltMaxAngleX={6}
            tiltMaxAngleY={6}
            perspective={1400}
            scale={1.02}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.1, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="flex justify-center mb-4" style={{ transform: 'translateZ(50px)' }}>
                      <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }}>
                        <CssAnimation type="game" size={100} />
                      </motion.div>
                    </div>
                    <h3 className="text-2xl md:text-4xl font-black mb-3 md:mb-4 text-center" style={{ transform: 'translateZ(35px)' }}>{t.gameModesTitle}</h3>
                    <p className="text-white/80 font-bold mb-6 max-w-md mx-auto text-center" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.gameModesDesc}
                    </p>
                    <div className="grid grid-cols-6 gap-2" style={{ transform: 'translateZ(25px)' }}>
                      {[
                        { emoji: "📖", nameKey: "classic" },
                        { emoji: "🎧", nameKey: "listen" },
                        { emoji: "✏️", nameKey: "spell" },
                        { emoji: "⚡", nameKey: "match" },
                        { emoji: "🧠", nameKey: "memory" },
                        { emoji: "✅", nameKey: "tf" },
                        { emoji: "🃏", nameKey: "flash" },
                        { emoji: "🔤", nameKey: "scramble" },
                        { emoji: "🔄", nameKey: "reverse" },
                        { emoji: "🔡", nameKey: "letters" },
                        { emoji: "🧩", nameKey: "sentence" },
                        { emoji: "📝", nameKey: "fillBlank" },
                        { emoji: "🔗", nameKey: "wordChains" },
                        { emoji: "🗯️", nameKey: "idiom" },
                        { emoji: "⏱️", nameKey: "speedRound" },
                      ].map((mode) => (
                        <motion.div
                          key={mode.nameKey}
                          whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.3 }}
                          className="aspect-square rounded-xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-1 cursor-help"
                          title={t.modeNames[mode.nameKey as keyof typeof t.modeNames]}
                        >
                          <span className="text-2xl md:text-3xl">{mode.emoji}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* Live Challenges */}
        <motion.div style={{ y: cardYLive }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.2, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Trophy size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.liveChallengesTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.liveChallengesDesc}
                    </p>
                    <div className="mt-4 relative h-20 flex items-end justify-center gap-2" style={{ transform: 'translateZ(25px)' }}>
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-8 h-12 bg-white/30 rounded-t-lg"
                      />
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                        className="w-8 h-16 bg-white/40 rounded-t-lg relative"
                      >
                        <motion.span
                          animate={{ y: [0, -3, 0], scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl"
                        >
                          🏆
                        </motion.span>
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-8 h-10 bg-white/30 rounded-t-lg"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* XP Shop */}
        <motion.div style={{ y: cardYShop }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.3, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Coins size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.xpShopTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.xpShopDesc}
                    </p>
                    <div className="mt-4 relative h-16 flex justify-center items-center gap-2" style={{ transform: 'translateZ(25px)' }}>
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -12, 0], rotate: [0, 360, 0], scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                          className="text-3xl"
                        >
                          🪙
                        </motion.div>
                      ))}
                      <motion.span
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 right-4 text-lg"
                      >
                        ✨
                      </motion.span>
                      <motion.span
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                        className="absolute bottom-2 left-4 text-lg"
                      >
                        ✨
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* Mystery Eggs */}
        <motion.div style={{ y: cardYEggs }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.4, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(244,114,182,0.3)] hover:shadow-[0_30px_80px_rgba(244,114,182,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Gift size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.mysteryEggsTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.mysteryEggsDesc}
                    </p>
                    <div className="mt-4 relative flex justify-center" style={{ transform: 'translateZ(25px)' }}>
                      <motion.div
                        animate={{ rotate: [-8, 8, -8], scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-5xl relative"
                      >
                        🥚
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl -z-10"
                        />
                        <motion.span
                          animate={{ y: [0, -8, 0], opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -top-4 -right-4 text-xl"
                        >
                          ⭐
                        </motion.span>
                        <motion.span
                          animate={{ y: [0, -6, 0], opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                          className="absolute -bottom-2 -left-6 text-lg"
                        >
                          ⭐
                        </motion.span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* Boosters */}
        <motion.div style={{ y: cardYBoost }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.5, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-500 text-white shadow-[0_20px_60px_rgba(99,102,241,0.3)] hover:shadow-[0_30px_80px_rgba(99,102,241,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Zap size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.powerBoostersTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.powerBoostersDesc}
                    </p>
                    <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        className="text-6xl relative"
                      >
                        ⚡
                        {[0, 1].map((arcSide) => (
                          <motion.span
                            key={arcSide}
                            animate={{
                              x: arcSide === 0 ? [0, 15, 0] : [0, -15, 0],
                              opacity: [0, 1, 0],
                            }}
                            transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut", delay: arcSide * 0.3 }}
                            className={`absolute top-1/2 ${arcSide === 0 ? 'left-full' : 'right-full'} w-8 h-0.5 bg-yellow-300`}
                          />
                        ))}
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [-10, 10, -10] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute text-2xl"
                      >
                        💪
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* Pet Companions */}
        <motion.div style={{ y: cardYPet }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.6, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white shadow-[0_20px_60px_rgba(250,204,21,0.3)] hover:shadow-[0_30px_80px_rgba(250,204,21,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Crown size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.petFriendsTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.petFriendsDesc}
                    </p>
                    <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                      <motion.div
                        animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-5xl relative"
                      >
                        🐱
                        <motion.span
                          animate={{ y: [0, -16, 0], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                          className="absolute -right-4 top-0 text-xl"
                        >
                          ❤️
                        </motion.span>
                        <motion.span
                          animate={{ y: [0, -12, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
                          className="absolute -left-6 top-2 text-lg"
                        >
                          💕
                        </motion.span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>

        {/* Streaks */}
        <motion.div style={{ y: cardYStreak }} className="h-full">
          <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            scale={1.03}
            transitionSpeed={1500}
            glareEnable
            glareMaxOpacity={0.25}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="2rem"
            className="h-full"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.7, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                className="h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white shadow-[0_20px_60px_rgba(239,68,68,0.3)] hover:shadow-[0_30px_80px_rgba(239,68,68,0.4)] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                    style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                  />
                  <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                      <Flame size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.dailyStreaksTitle}</h3>
                    <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                      {t.dailyStreaksDesc}
                    </p>
                    <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 1],
                          filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
                        }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-6xl relative"
                      >
                        🔥
                        {[
                          { delay: 0, x: -8 },
                          { delay: 0.3, x: 0 },
                          { delay: 0.6, x: 8 },
                        ].map((ember, i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -20, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: ember.delay }}
                            className="absolute -bottom-2 text-sm"
                            style={{ left: `${50 + ember.x}px` }}
                          >
                            ✨
                          </motion.span>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingStudents;
