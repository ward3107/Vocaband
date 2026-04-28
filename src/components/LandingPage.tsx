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
  FileText,
  ShieldCheck,
  Accessibility,
  Lock,
  Globe,
  ExternalLink,
  Wand2,
  Camera,
  Radio,
  Compass,
} from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security") => void;
  onGetStarted: () => void;
  onTeacherLogin: () => void;
  onTryDemo?: () => void;
  isAuthenticated?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onTryDemo, isAuthenticated }) => {
  // Floating 3D cards data for hero
  const floatingCards = [
    { icon: <Gamepad2 size={24} />, name: "11 Game Modes", color: "from-violet-500 to-purple-600", delay: 0 },
    { icon: <Trophy size={24} />, name: "Earn XP", color: "from-blue-500 to-cyan-500", delay: 0.2 },
    { icon: <Flame size={24} />, name: "Daily Streaks", color: "from-amber-500 to-orange-500", delay: 0.4 },
    { icon: <Gift size={24} />, name: "Mystery Eggs", color: "from-emerald-500 to-teal-500", delay: 0.6 },
  ];

  return (
    <div className="min-h-screen signature-gradient overflow-x-hidden">
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
                  The vocabulary game students worldwide actually want to play — and the easiest classroom tool teachers will use all year.
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
                    <p className="text-white/60 text-xs">Learning English worldwide</p>
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
                  <h3 className="text-3xl md:text-4xl font-black mb-4">11 Game Modes</h3>
                  <p className="text-white/80 font-bold mb-6 max-w-md">
                    From Classic to Sentence Builder — every mode teaches differently. Find your favorite!
                  </p>
                  {/* Mode Grid */}
                  <div className="grid grid-cols-6 gap-2">
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
                      { emoji: "📝", name: "Fill Blank" },
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
              The Easiest Tool You'll Use All Year
            </h2>
            <p className="text-lg text-white/80 font-bold">
              Zero prep, zero paperwork, zero learning curve. Teach more, click less.
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
                  <h3 className="text-2xl font-black mb-2">AI Sentence Builder</h3>
                  <p className="text-white/80 font-bold text-sm">
                    One click, 10 example sentences per word — at the right level for your grade.
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
                  <h3 className="text-2xl font-black mb-2">Snap a Wordlist</h3>
                  <p className="text-white/80 font-bold text-sm">
                    Take a photo of any printed list — handwriting, textbook page, board — words extracted in seconds.
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
              <div className="h-full p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <Radio size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">Quick Play — No-Signup Live Game</h3>
                    <p className="text-white/85 font-bold text-lg max-w-2xl">
                      Project a QR on the board, students join with their phones — no accounts, no class code typing, no setup. Live podium, real-time scores, ready in 10 seconds.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm font-mono font-black text-2xl tracking-widest">
                      ABC123
                    </div>
                    <div className="text-xs uppercase tracking-widest opacity-80">scan & play</div>
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
              <div className="h-full p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <Globe size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">Hebrew + Arabic, built in</h3>
                    <p className="text-white/85 font-bold text-lg max-w-2xl">
                      Every word ships with native Hebrew AND Arabic translations — no second app, no copy-paste.
                      RTL layouts handled automatically.  More languages on the roadmap.
                    </p>
                  </div>
                  {/* Three-language sample chip cluster.  Each shows the
                      same word in EN/HE/AR so the teacher sees the
                      claim is real, not marketing fluff. */}
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
              Aligned with CEFR A1 to B2 — three comprehensive vocabulary sets covering 6,500+ words.
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

        {/* ═══════════════════════════════════════════════════════════
            ROADMAP SECTION — "The Voca Family"
            ───────────────────────────────────────────────────────────
            Sneak-peek at the multi-subject expansion that's parked in
            CLAUDE.md §11.  The engine is mostly subject-agnostic
            (generalize Word → StudyCard) so the same gameplay loop
            can power history dates, science vocab, math definitions,
            etc.  Surfacing this as a "Coming Soon" teaser does two
            things:

              1. Signals to teachers in OTHER subjects that they're
                 next on the list — converts curiosity into early-
                 access signups even before we ship.
              2. Positions Vocaband as a "learning-game platform"
                 not just a vocab app, which raises the ceiling for
                 school-wide licenses.

            All entries explicitly labelled "Coming soon" so we never
            misrepresent shipped features.  No CTA to buy — just a
            "stay in the loop" mailto link for early-access leads.
            ═══════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4 md:px-6 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto text-center mb-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 mb-6"
            >
              <Compass size={16} className="text-amber-300" />
              <span className="text-sm font-black tracking-widest uppercase text-amber-200">
                Coming Soon
              </span>
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              The Voca Family
            </h2>
            <p className="text-lg text-white/80 font-bold max-w-2xl mx-auto">
              We're starting with English vocabulary — but the same gameplay engine teaches anything.
              Subjects on the roadmap, by teacher demand:
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: "VocaHistory", emoji: "📜", color: "from-amber-500 to-orange-600", tag: "Dates · figures · events" },
              { name: "VocaScience", emoji: "🔬", color: "from-emerald-500 to-teal-600", tag: "Terms · concepts · diagrams" },
              { name: "VocaHebrew", emoji: "📖", color: "from-blue-500 to-indigo-600", tag: "Hebrew vocabulary" },
              { name: "VocaArabic", emoji: "📚", color: "from-rose-500 to-pink-600", tag: "Arabic vocabulary" },
              { name: "VocaMath", emoji: "🔢", color: "from-violet-500 to-fuchsia-600", tag: "Definitions · formulas" },
            ].map((subject, i) => (
              <motion.div
                key={subject.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -8, scale: 1.04 }}
                className="relative group"
              >
                <div className={`h-full p-5 rounded-3xl bg-gradient-to-br ${subject.color} text-white shadow-lg overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-2">{subject.emoji}</div>
                    <h3 className="text-base sm:text-lg font-black mb-1">{subject.name}</h3>
                    <p className="text-[11px] sm:text-xs font-bold text-white/80 leading-tight">{subject.tag}</p>
                  </div>
                  {/* "Coming soon" pill so nobody mistakes this for a
                      shipped feature. */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider">
                    Soon
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Early-access lead capture — uses the team's existing
              contact@ inbox so we don't need a new email pipeline.
              Subject-line tag makes inbound triaging easy. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto mt-12 text-center"
          >
            <p className="text-white/70 font-bold text-sm mb-3">
              Teach a different subject? Tell us which Voca to build next:
            </p>
            <a
              href="mailto:contact@vocaband.com?subject=Voca%20Roadmap%20%E2%80%93%20Subject%20Request"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-black transition-colors"
            >
              <FileText size={18} />
              Request a subject
            </a>
          </motion.div>
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
                  Join thousands of students leveling up their English — one word at a time.
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
                    Aligned with CEFR A1–B2
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

              {/* Legal Links — four matching pill buttons.
                  See the Security button: opens the /security page
                  (PublicSecurityPage) which is our user-facing
                  technical-trust summary in EN/HE/AR. */}
              <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label="Legal and accessibility">
                <button
                  onClick={() => onNavigate("terms")}
                  type="button"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white font-bold text-sm transition-all shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <FileText size={16} className="text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                  <span>Terms of Service</span>
                </button>
                <button
                  onClick={() => onNavigate("privacy")}
                  type="button"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white font-bold text-sm transition-all shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ShieldCheck size={16} className="text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                  <span>Privacy Policy</span>
                </button>
                <button
                  onClick={() => onNavigate("security")}
                  type="button"
                  title="Security & Trust"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white font-bold text-sm transition-all shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Lock size={16} className="text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => onNavigate("accessibility")}
                  type="button"
                  title="Accessibility Statement"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white font-bold text-sm transition-all shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Accessibility size={16} className="text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                  <span>Accessibility</span>
                </button>
              </nav>
            </div>

            {/* Trust strip — three small badges showing the things we
                CAN factually claim (TLS, SSL Labs grade, EU hosting).
                The SSL Labs badge deep-links to a live report so any
                visitor can verify it themselves. See docs/SECURITY-OVERVIEW.md
                for what we are/are NOT claiming and why this list is
                conservative (no GDPR/COPPA self-declaration). */}
            <div className="pt-6 pb-2 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs">
              <a
                href="https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 font-bold transition-colors"
              >
                <ShieldCheck size={13} />
                <span>SSL Labs A+</span>
                <ExternalLink size={10} className="opacity-60" />
              </a>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-200 border border-blue-400/30 font-bold">
                <Lock size={13} />
                TLS 1.3
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/30 font-bold">
                <Globe size={13} />
                EU-hosted (Frankfurt)
              </span>
            </div>

            {/* Teacher resources — subtle internal links to the /answers
                guides. Not a hero section; just enough to give Google's
                crawler + AI assistants the internal-link signal that
                these pages are real first-party content, and to help
                teachers already browsing the footer discover them. */}
            <div className="pt-8 pb-4 border-t border-white/10">
              <p className="text-white/50 text-xs font-black uppercase tracking-[0.2em] text-center mb-3">
                Teacher resources
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
                <a href="/answers/cefr-a1-vocabulary-list.html" className="text-white/70 hover:text-white transition-colors">CEFR A1 vocabulary</a>
                <a href="/answers/cefr-a1-vs-a2-vocabulary.html" className="text-white/70 hover:text-white transition-colors">A1 vs A2</a>
                <a href="/answers/best-english-vocabulary-app-grade-5.html" className="text-white/70 hover:text-white transition-colors">Best for school ESL — Grades 1 to 12</a>
              </div>
            </div>

            {/* Copyright */}
            <div className="pt-6 text-center">
              <p className="text-white text-sm font-bold">
                © {new Date().getFullYear()} Vocaband. Made with <span className="text-blue-400">💙</span> for English learners everywhere.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <FloatingButtons />

      {/* The floating accessibility button that used to live here has been
          removed — it duplicated the global one rendered by
          <AccessibilityWidget /> in main.tsx, which is now visible on every
          page. Two triggers at different positions was confusing. */}
    </div>
  );
};

export default LandingPage;
