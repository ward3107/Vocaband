import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Rocket,
  Gamepad2,
  Users,
  Coins,
  ArrowRight,
  Link2,
  GraduationCap,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Gift,
  Star,
  Crown,
  Target,
  BookOpen,
  Volume2,
  PenTool,
  BarChart3,
  Clock,
  CheckCircle2,
  Layers,
  Accessibility,
  X,
} from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  onTeacherLogin: () => void;
  onTryDemo?: () => void;
  isAuthenticated?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onTryDemo, isAuthenticated }) => {
  // Floating 3D cards data for hero
  const floatingCards = [
    { icon: <Gamepad2 size={24} />, name: "10 Game Modes", color: "from-violet-500 to-purple-600", delay: 0 },
    { icon: <Trophy size={24} />, name: "Earn XP", color: "from-blue-500 to-cyan-500", delay: 0.2 },
    { icon: <Flame size={24} />, name: "Daily Streaks", color: "from-amber-500 to-orange-500", delay: 0.4 },
    { icon: <Gift size={24} />, name: "Mystery Eggs", color: "from-emerald-500 to-teal-500", delay: 0.6 },
  ];

  // Allow users to dismiss the floating accessibility button for the
  // current session — it returns on next session (sessionStorage). The
  // a11y panel itself is still reachable via the nav bar's A11y icon.
  const [a11yButtonHidden, setA11yButtonHidden] = useState<boolean>(() => {
    try { return sessionStorage.getItem('a11y_button_hidden') === '1'; } catch { return false; }
  });
  const hideA11yButton = () => {
    try { sessionStorage.setItem('a11y_button_hidden', '1'); } catch { /* ignore */ }
    setA11yButtonHidden(true);
  };

  return (
    // `data-landing-ready` is the signal `scripts/prerender.ts` waits on
    // before capturing the rendered HTML.  Removing it will silently
    // break the post-build prerender step.
    <div className="min-h-screen signature-gradient overflow-x-hidden" data-landing-ready>
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onTryDemo={onTryDemo}
      />

      <main>
        {/* Hero Section - Floating 3D Cards + Gradient Mesh */}
        <section className="min-h-screen pt-20 pb-12 px-4 md:px-6 relative flex items-center justify-center">
          {/* Animated Gradient Mesh Background */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0],
                x: [0, -100, 0],
                y: [0, 50, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-1/4 -left-32 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                x: [50, -50, 50],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl"
            />
          </div>

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                {/* Main Headline - 3D Text Effect */}
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative z-20 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-headline italic leading-tight break-words mb-6"
                >
                  <span className="inline-block pr-4 pb-2 bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent drop-shadow-2xl">
                    Level Up
                  </span>
                  <br />
                  <span className="inline-block pr-4 pb-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                    Your Vocabulary
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/80 mb-8 max-w-xl"
                >
                  The digital playground where Israeli students become vocabulary legends through play.
                </motion.p>

                {/* 3D CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  {/* Start Learning - 3D Purple */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                    onClick={onGetStarted}
                    style={{ touchAction: 'manipulation' }}
                    className="group relative px-8 py-4 rounded-2xl text-xl font-black text-white shadow-[0_10px_0_0_#6d28d9,0_20px_40px_rgba(139,92,246,0.4)] hover:shadow-[0_14px_0_0_#5b21b6,0_25px_50px_rgba(139,92,246,0.5)] active:shadow-[0_3px_0_0_#6d28d9,0_8px_20px_rgba(139,92,246,0.3)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                    <Sparkles size={22} className="relative z-10" fill="currentColor" />
                    <span className="relative z-10">Start Learning</span>
                    <Rocket size={22} className="relative z-10" />
                  </motion.button>

                  {!isAuthenticated && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                      onClick={onTeacherLogin}
                      style={{ touchAction: 'manipulation' }}
                      className="group relative px-6 py-4 rounded-2xl text-lg font-bold text-white shadow-[0_10px_0_0_#0369a1,0_20px_40px_rgba(14,165,233,0.4)] hover:shadow-[0_14px_0_0_#0284c7,0_25px_50px_rgba(14,165,233,0.5)] active:shadow-[0_3px_0_0_#0369a1,0_8px_20px_rgba(14,165,233,0.3)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
                      <GraduationCap size={20} className="relative z-10" />
                      <span className="relative z-10">Teacher Login</span>
                    </motion.button>
                  )}
                </div>

                {/* Social Proof - Glass Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-8 inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20"
                >
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-lg">🦊</div>
                    <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-lg">🦁</div>
                    <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg">🐯</div>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">10,000+ Students</p>
                    <p className="text-white/60 text-xs">Learning across Israel</p>
                  </div>
                </motion.div>
              </div>

              {/* Right - Floating 3D Cards Grid */}
              <div className="hidden lg:grid grid-cols-2 gap-4 relative">
                {floatingCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, rotate: -20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: card.delay,
                      y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: card.delay },
                    }}
                    whileHover={{
                      scale: 1.05,
                      rotateX: 5,
                      rotateY: 5,
                      z: 50,
                    }}
                    className="relative"
                  >
                    {/* Glassmorphism Card with 3D Depth */}
                    <div className={`p-5 rounded-3xl bg-gradient-to-br ${card.color} shadow-2xl backdrop-blur-sm border border-white/20`}>
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-3 shadow-inner">
                        {card.icon}
                      </div>
                      <p className="text-white font-black text-sm leading-tight">{card.name}</p>
                    </div>
                    {/* Floating shadow */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-full blur-xl" />
                  </motion.div>
                ))}

                {/* Center Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 rounded-full blur-3xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - 3D Bento Grid */}
        <section className="py-20 px-4 md:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto mb-12 text-center"
          >
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              Why Students Love Vocaband
            </h2>
            <p className="text-lg text-white/80 font-bold">
              Everything you need to master vocabulary, gamified.
            </p>
          </motion.div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 10 Game Modes - Large Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -12, scale: 1.02, rotateX: 2, rotateY: 2 }}
              className="lg:col-span-2 row-span-2 relative group perspective-1000"
            >
              <div className="h-full p-8 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner">
                    <Gamepad2 size={32} />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black mb-4">10 Game Modes</h3>
                  <p className="text-white/80 font-bold mb-6 max-w-md">
                    From Classic to Sentence Builder — every mode teaches differently. Find your favorite!
                  </p>
                  {/* Mode Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { emoji: "📖", name: "Classic" },
                      { emoji: "🎧", name: "Listen" },
                      { emoji: "✏️", name: "Spell" },
                      { emoji: "⚡", name: "Match" },
                      { emoji: "✅", name: "T/F" },
                      { emoji: "🃏", name: "Flash" },
                      { emoji: "🔤", name: "Scramble" },
                      { emoji: "🔄", name: "Reverse" },
                      { emoji: "🔡", name: "Letters" },
                      { emoji: "🧩", name: "Sentence" },
                    ].map((mode, i) => (
                      <motion.div
                        key={mode.name}
                        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                        className="aspect-square rounded-xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-1 cursor-help"
                        title={mode.name}
                      >
                        <span className="text-2xl md:text-3xl">{mode.emoji}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Live Challenges */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Trophy size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Live Challenges</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Battle classmates in real-time podiums!
                  </p>
                  {/* Animated podium with rising trophy */}
                  <div className="mt-4 relative h-20 flex items-end justify-center gap-2">
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

            {/* XP Shop */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Coins size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">XP Shop</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Earn XP, spend on avatars, frames & power-ups!
                  </p>
                  {/* Floating coins animation */}
                  <div className="mt-4 relative h-16 flex justify-center items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -12, 0],
                          rotate: [0, 360, 0],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.3,
                        }}
                        className="text-3xl"
                      >
                        🪙
                      </motion.div>
                    ))}
                    {/* Sparkle effects */}
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

            {/* Mystery Eggs */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(244,114,182,0.3)] hover:shadow-[0_30px_80px_rgba(244,114,182,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Gift size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Mystery Eggs</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Crack eggs to unlock legendary avatars!
                  </p>
                  {/* Glowing wobbling egg */}
                  <div className="mt-4 relative flex justify-center">
                    <motion.div
                      animate={{
                        rotate: [-8, 8, -8],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-5xl relative"
                    >
                      🥚
                      {/* Glow effect */}
                      <motion.div
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl -z-10"
                      />
                      {/* Floating stars */}
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

            {/* Boosters */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-500 text-white shadow-[0_20px_60px_rgba(99,102,241,0.3)] hover:shadow-[0_30px_80px_rgba(99,102,241,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Power Boosters</h3>
                  <p className="text-white/80 font-bold text-sm">
                    XP multipliers, streak freeze & more!
                  </p>
                  {/* Electric lightning animation */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      className="text-6xl relative"
                    >
                      ⚡
                      {/* Electric arcs */}
                      {[0, 1].map((dir) => (
                        <motion.span
                          key={dir}
                          animate={{
                            x: dir === 0 ? [0, 15, 0] : [0, -15, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut", delay: dir * 0.3 }}
                          className={`absolute top-1/2 ${dir === 0 ? 'left-full' : 'right-full'} w-8 h-0.5 bg-yellow-300`}
                        />
                      ))}
                    </motion.div>
                    {/* Muscle icon */}
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

            {/* Pet Companions */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white shadow-[0_20px_60px_rgba(250,204,21,0.3)] hover:shadow-[0_30px_80px_rgba(250,204,21,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Crown size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Pet Friends</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Unlock cute pets that cheer you on!
                  </p>
                  {/* Bouncing pet with hearts */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    <motion.div
                      animate={{
                        y: [0, -12, 0],
                        rotate: [-5, 5, -5],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-5xl relative"
                    >
                      🐱
                      {/* Floating hearts */}
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

            {/* Streaks */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white shadow-[0_20px_60px_rgba(239,68,68,0.3)] hover:shadow-[0_30px_80px_rgba(239,68,68,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Flame size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Daily Streaks</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Keep the flame burning! Earn rewards.
                  </p>
                  {/* Animated flame with rising embers */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
                      }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-6xl relative"
                    >
                      🔥
                      {/* Rising embers */}
                      {[
                        { delay: 0, x: -8 },
                        { delay: 0.3, x: 0 },
                        { delay: 0.6, x: 8 },
                      ].map((ember, i) => (
                        <motion.span
                          key={i}
                          animate={{
                            y: [0, -20, 0],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: ember.delay,
                          }}
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
          </div>
        </section>

        {/* Teacher Features Section - Why Teachers Love Vocaband */}
        <section className="py-20 px-4 md:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto mb-12 text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/20 backdrop-blur-md border border-sky-400/30 mb-6"
            >
              <GraduationCap size={16} className="text-sky-300" />
              <span className="text-sm font-black tracking-widest uppercase text-sky-200">
                For Teachers
              </span>
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              Why Teachers Love Vocaband
            </h2>
            <p className="text-lg text-white/80 font-bold">
              Engage your class with zero prep time.
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
              <div className="h-full p-8 rounded-[2rem] bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)] hover:shadow-[0_30px_80px_rgba(14,165,233,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">Auto-Grading</h3>
                    <p className="text-white/80 font-bold text-lg max-w-2xl">
                      Every practice session graded instantly. No worksheets to collect, no stacks to review. Focus on teaching, not paperwork.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-6xl">✅</div>
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
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Layers size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Use Your Own Words</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Upload your custom vocabulary lists. Assign any words you need.
                  </p>
                  {/* Floating word cards */}
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
                  <h3 className="text-2xl font-black mb-2">Spot Who's Struggling</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Real-time analytics show exactly who needs help — before the test.
                  </p>
                  {/* Animated chart bars */}
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
                  <h3 className="text-2xl font-black mb-2">Setup in 30 Seconds</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Create class → Share code → Students join. That's it.
                  </p>
                  {/* Clock tick animation */}
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
                  <h3 className="text-2xl font-black mb-2">They Actually Want to Practice</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Game modes, XP, streaks — students voluntarily study at home.
                  </p>
                  {/* Sparkle burst */}
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
          </div>
        </section>

        {/* Interactive Journey Section - Scroll Progress Path */}
        <section className="py-20 px-4 md:px-6 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              Your Journey to Mastery
            </h2>
            <p className="text-lg text-white/80 font-bold">
              Aligned with the Israeli English curriculum — three comprehensive vocabulary sets.
            </p>
          </motion.div>

          {/* 3D Progress Cards with Path */}
          <div className="max-w-5xl mx-auto relative">
            {/* Connecting Path Line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-blue-500 to-violet-500 -translate-x-1/2 rounded-full" />

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
                      <p className="font-black text-lg">Set 1 — Foundation</p>
                      <p className="text-white/80 text-sm">Beginner vocabulary</p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/50 items-center justify-center text-white text-2xl font-black z-10">
                  1
                </div>
                <div className="md:w-1/2 md:pl-12">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">Progress</span>
                      <span className="text-emerald-600 font-black">~2000 words</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "out" }}
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
                      <p className="font-black text-lg">Set 2 — Intermediate</p>
                      <p className="text-white/80 text-sm">Building complexity</p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-2xl shadow-blue-500/50 items-center justify-center text-white text-2xl font-black z-10">
                  2
                </div>
                <div className="md:w-1/2 md:pr-12 md:text-right">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-600 font-black">~2500 words</span>
                      <span className="font-bold">Progress</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "75%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "out" }}
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
                      <p className="font-black text-lg">Set 3 — Academic</p>
                      <p className="text-white/80 text-sm">Advanced mastery</p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-2xl shadow-violet-500/50 items-center justify-center text-white text-2xl font-black z-10">
                  3
                </div>
                <div className="md:w-1/2 md:pl-12">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">Progress</span>
                      <span className="text-violet-600 font-black">~3000 words</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "50%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "out" }}
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA - Epic 3D Card */}
        <section className="py-24 px-4 md:px-6 bg-surface">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="max-w-5xl mx-auto relative"
          >
            {/* 3D Card with multiple shadow layers */}
            <div className="relative p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white text-center overflow-hidden">
              {/* Animated background pattern */}
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

              {/* Glow orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

              {/* 3D Depth shadow layers */}
              <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_2px_20px_rgba(255,255,255,0.2)]" />

              <div className="relative z-10">
                {/* Floating trophy */}
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="text-7xl md:text-8xl mb-6"
                >
                  🏆
                </motion.div>

                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black font-headline mb-6 tracking-tight">
                  Ready to Become a
                  <span className="inline-block pr-4 pb-2 mt-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                    Vocabulary Legend?
                  </span>
                </h2>

                <p className="text-xl text-white/80 font-bold mb-10 max-w-2xl mx-auto">
                  Join thousands of Israeli students leveling up their English — one word at a time.
                </p>

                {/* 3D Buttons */}
                <div className="flex flex-col sm:flex-row gap-5 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onTryDemo}
                    className="group relative px-10 py-5 rounded-2xl text-xl font-black text-white shadow-[0_10px_0_0_#6d28d9,0_25px_50px_rgba(139,92,246,0.5)] hover:shadow-[0_14px_0_0_#5b21b6,0_35px_60px_rgba(139,92,246,0.6)] active:shadow-[0_4px_0_0_#6d28d9,0_12px_25px_rgba(139,92,246,0.4)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                    <Rocket size={24} className="relative z-10" />
                    <span className="relative z-10">Start Learning Free</span>
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
                      <span className="relative z-10">Teacher Login</span>
                    </motion.button>
                  )}
                </div>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="mt-12 flex flex-wrap justify-center gap-6 text-white/60 text-sm font-bold"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Aligned with Ministry of Education
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Loved by Schools
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    GDPR Compliant
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer - Privacy, Terms, Accessibility */}
        <footer className="py-12 px-4 md:px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
              {/* Logo/Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  V
                </div>
                <span className="text-white font-black text-xl">Vocaband</span>
              </div>

              {/* Legal Links */}
              <nav className="flex flex-wrap items-center justify-center gap-6">
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-white/70 hover:text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <span>Terms of Service</span>
                </button>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white/70 hover:text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <span>Privacy Policy</span>
                </button>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-white/70 hover:text-white font-bold text-sm transition-colors flex items-center gap-2"
                  title="Accessibility Statement"
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">Aa</span>
                  <span>Accessibility</span>
                </button>
              </nav>
            </div>

            {/* Copyright */}
            <div className="pt-8 text-center">
              <p className="text-white text-sm font-bold">
                © {new Date().getFullYear()} Vocaband. Made with <span className="text-blue-400">💙</span> for Israeli students.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <FloatingButtons />

      {/* Floating A11y Button — opens global widget. Has a small X in the
          top-right corner for users who don't need it; dismissing stores
          a session-only flag so the button returns on next visit. The
          panel is still reachable via the nav bar A11y icon. */}
      {!a11yButtonHidden && (
        <div className="fixed bottom-28 right-6 z-50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-a11y-panel'))}
            aria-label="Open accessibility options"
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-lg transition-all hover:bg-white/30"
            type="button"
          >
            <Accessibility size={22} strokeWidth={2.5} aria-hidden="true" />
          </motion.button>
          <button
            onClick={hideA11yButton}
            aria-label="Hide accessibility button"
            type="button"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-900 text-white border border-white/40 shadow-md flex items-center justify-center hover:bg-stone-700 hover:scale-110 transition-all"
          >
            <X size={10} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
