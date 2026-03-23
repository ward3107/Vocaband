import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Rocket,
  Gamepad2,
  Users,
  Coins,
  ArrowRight,
  ArrowUp,
  MessageCircle,
  Share2,
  X,
  Linkedin,
  Mail,
  Link2,
  Check,
} from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close share widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [shareOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareUrl = window.location.href;
  const shareText = "Check out Vocaband - the fun way to master English vocabulary for Israeli EFL students!";

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500",
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "X",
      icon: X,
      color: "bg-black",
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-blue-600",
      action: () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-red-500",
      action: () => {
        window.open(`mailto:?subject=${encodeURIComponent("Vocaband - Learn English Vocabulary")}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, "_blank");
      },
    },
    {
      name: "Copy Link",
      icon: copied ? Check : Link2,
      color: copied ? "bg-green-500" : "bg-stone-600",
      action: async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main>
        {/* Hero Section */}
        <section className="pt-32 md:pt-40 pb-20 px-6 signature-gradient text-on-primary relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -ml-32 - mb-32" />

          <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-sm font-black tracking-widest uppercase opacity-90 mb-4"
            >
              Israeli English Curriculum • Bands Vocabulary
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-5xl md:text-8xl font-black font-headline italic leading-none tracking-tighter mb-6 max-w-4xl"
            >
              Level Up Your Vocabulary
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="text-xl md:text-2xl font-bold opacity-90 mb-12 max-w-2xl leading-relaxed"
            >
              The digital playground for Israeli EFL students. Master your bands vocabulary through play.
            </motion.p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                onClick={onGetStarted}
                className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-xl text-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Start Learning
                <Rocket size={24} />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.4 }}
                onClick={onGetStarted}
                className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-xl text-xl font-bold hover:bg-surface-container-lowest/20 transition-all"
              >
                Teacher Login
              </motion.button>
            </div>

            {/* Social Proof */}
            <div className="mt-16 flex flex-col items-center gap-4">
              <div className="flex -space-x-4">
                <div className="w-12 h-12 rounded-full border-4 border-surface bg-primary/20 flex items-center justify-center text-lg font-bold">
                  🦊
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-surface bg-secondary/20 flex items-center justify-center text-lg font-bold">
                  🦁
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-surface bg-tertiary/20 flex items-center justify-center text-lg font-bold">
                  🐯
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-surface bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                  +10k
                </div>
              </div>
              <p className="font-bold text-lg">Join 10,000+ students across Israel</p>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* 10 Fun Game Modes - Large Card */}
            <div className="md:col-span-8 bg-surface-container-low rounded-[3rem] p-10 md:p-12 flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <div className="bg-primary-container text-on-primary-container w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                  <Gamepad2 size={32} />
                </div>
                <h3 className="text-4xl font-black font-headline mb-4">
                  10 Fun Game Modes
                </h3>
                <p className="text-xl font-bold text-on-surface-variant max-w-md">
                  From "Word War" to "Grammar Galaxy," we turn every vocabulary list into an epic quest.
                </p>
              </div>
              {/* Game Modes - Two columns, animate from both sides */}
              <div className="mt-12 grid grid-cols-2 gap-3">
                {/* Left column - slide from left */}
                <div className="flex flex-col gap-3">
                  {["📝 Classic", "🎧 Listening", "✍️ Spelling", "🔗 Matching", "✓ True-false"].map((mode, i) => (
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                      className="px-4 py-2 bg-surface-container-lowest rounded-full font-black text-sm shadow-sm text-center"
                    >
                      {mode}
                    </motion.div>
                  ))}
                </div>
                {/* Right column - slide from right */}
                <div className="flex flex-col gap-3">
                  {["🎴 Flashcards", "🔤 Scramble", "🔄 Reverse", "🔡 Letter-sounds", "🧩 Sentence-builder"].map((mode, i) => (
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, x: 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                      className="px-4 py-2 bg-surface-container-lowest rounded-full font-black text-sm shadow-sm text-center"
                    >
                      {mode}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Classroom Challenges - Animates from UP */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="md:col-span-4 bg-secondary-container rounded-[3rem] p-10 flex flex-col items-center text-center"
            >
              <div className="bg-surface-container-lowest text-secondary w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-xl">
                <Users size={40} />
              </div>
              <h3 className="text-3xl font-black font-headline mb-4 text-on-secondary-container">
                Live Classroom Challenges
              </h3>
              <p className="text-lg font-bold text-on-secondary-container/80">
                Battle your classmates in real-time. Who will top the weekly leaderboard?
              </p>
            </motion.div>

            {/* XP-Based Shop - Animates from DOWN */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="md:col-span-6 bg-tertiary-container rounded-[3rem] p-10 flex flex-row items-center gap-8 overflow-hidden"
            >
              <div className="flex-1">
                <h3 className="text-3xl font-black font-headline mb-4 text-on-tertiary-container">
                  XP-Based Shop
                </h3>
                <p className="text-lg font-bold text-on-tertiary-container/80">
                  Earn XP for every word you learn. Spend it on legendary gear and exclusive power-ups.
                </p>
              </div>
              <div className="relative">
                <div className="w-32 h-32 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                  <Coins size={64} className="text-tertiary-fixed-dim" />
                </div>
              </div>
            </motion.div>

            {/* Avatar Preview Section - Unlock Animation */}
            <div className="md:col-span-6 bg-surface-container-high rounded-[3rem] p-6 md:p-10 flex flex-col overflow-hidden">
              {/* Title with chain unlocking effect */}
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <motion.div
                  initial={{ rotate: 0, x: 0 }}
                  whileInView={{ rotate: -15, x: -5 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-3xl md:text-4xl"
                >
                  <Link2 size={32} className="text-on-surface-variant" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-2xl md:text-3xl font-black font-headline"
                >
                  Unlock Your Identity
                </motion.h3>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-3 md:gap-4">
                  {/* Icon 1 - Breaks free from chain */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                    className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-lowest rounded-full border-4 border-primary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-2xl md:text-3xl relative"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      🐉
                    </motion.span>
                    {/* Chain breaking effect */}
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      whileInView={{ opacity: 0, scale: 2, x: 30, y: -30 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.8 }}
                      className="absolute -top-2 -right-2 text-xl"
                    >
                      🔗
                    </motion.div>
                  </motion.div>

                  {/* Icon 2 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: 180 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.5 }}
                    className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-lowest rounded-full border-4 border-secondary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-2xl md:text-3xl relative"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                    >
                      🦅
                    </motion.span>
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      whileInView={{ opacity: 0, scale: 2, x: -30, y: -30 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 1 }}
                      className="absolute -top-2 -left-2 text-xl"
                    >
                      🔗
                    </motion.div>
                  </motion.div>

                  {/* Icon 3 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.7 }}
                    className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-lowest rounded-full border-4 border-tertiary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-2xl md:text-3xl relative"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9, duration: 0.3 }}
                    >
                      🐺
                    </motion.span>
                    <motion.div
                      initial={{ opacity: 1, scale: 1 }}
                      whileInView={{ opacity: 0, scale: 2, x: 30, y: 30 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 1.2 }}
                      className="absolute -bottom-2 -right-2 text-xl"
                    >
                      🔗
                    </motion.div>
                  </motion.div>
                </div>

                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 1.4 }}
                  onClick={onGetStarted}
                  className="bg-on-surface text-surface px-5 py-2.5 md:px-6 md:py-3 rounded-full font-black text-sm md:text-base flex items-center gap-2 hover:scale-105 transition-all"
                >
                  View All
                  <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Visualization ( The Pulse) */}
        <section className="py-20 pb-40 md:pb-20 bg-surface-container-lowest px-6 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">
              Master Your Band Levels
            </h2>
            <p className="text-xl font-bold text-on-surface-variant">
              We align perfectly with the Israeli EFL curriculum for Bands I, II, and III.
            </p>
          </div>
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Band I */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end font-black">
                <span className="text-2xl">Band I (Foundation)</span>
                <span className="text-primary">85% Complete</span>
              </div>
              <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "85%" }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full relative"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: 1.5, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center -mr-5 border-2 border-primary"
                  >
                    <span className="text-xl">⭐</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Band II */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end font-black">
                <span className="text-2xl">Band II (Intermediate)</span>
                <span className="text-secondary">60% In Progress</span>
              </div>
              <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "60%" }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-secondary rounded-full relative"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: 1.7, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center -mr-5 border-2 border-secondary"
                  >
                    <span className="text-xl">⚡</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Band III */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end font-black">
                <span className="text-2xl">Band III (Academic)</span>
                <span className="text-tertiary">25% Started</span>
              </div>
              <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "25%" }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                  className="h-full bg-tertiary rounded-full relative"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.9, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center -mr-5 border-2 border-tertiary"
                  >
                    <span className="text-xl">🎓</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto bg-primary rounded-xl p-12 md:p-20 text-center relative overflow-hidden">
            {/* Dot pattern background */}
            <div
              className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Heading - Pop in */}
            <motion.h2
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="text-4xl md:text-7xl font-black font-headline text-on-primary mb-8 relative z-10 tracking-tighter"
            >
              Ready to become a Vocab Legend?
            </motion.h2>

            <div className="flex flex-col md:flex-row gap-6 justify-center relative z-10">
              {/* Start Learning Button - Pop in */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                onClick={onGetStarted}
                className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-xl text-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Start Learning
                <Rocket size={24} />
              </motion.button>

              {/* Teacher Login Button - Pop in */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
                onClick={onGetStarted}
                className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-xl text-xl font-bold hover:bg-surface-container-lowest/20 transition-all"
              >
                Teacher Login
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      <MobileNav currentPage="home" onNavigate={onNavigate} />

      {/* Share Widget - Visible on all devices */}
      <div ref={shareRef} className="fixed left-3 bottom-28 md:left-4 md:bottom-28 z-40 flex flex-col gap-2 md:gap-3">
        <button
          onClick={() => setShareOpen(!shareOpen)}
          className={`w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg ${
            shareOpen ? "bg-primary text-white" : "bg-stone-800 dark:bg-stone-200"
          }`}
          title="Share"
        >
          <Share2 size={22} className="text-white dark:text-stone-800" />
        </button>

        {/* Expanded options - Vertical on mobile */}
        {shareOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 bg-white dark:bg-stone-800 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-stone-200 dark:border-stone-700">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    if (option.name !== "Copy Link") setShareOpen(false);
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${option.color} text-white`}
                  title={option.name}
                >
                  <Icon size={22} strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
        )}

        {/* Back to Top */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="w-12 h-12 bg-stone-800 dark:bg-stone-200 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary transition-all hover:scale-110 shadow-lg"
            title="Back to top"
          >
            <ArrowUp size={22} strokeWidth={2.5} className="text-white dark:text-stone-800" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
