import React, { useState, useEffect } from "react";
import {
  Rocket,
  Gamepad2,
  Users,
  Coins,
  ArrowRight,
  ArrowUp,
  MessageCircle,
} from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent("Check out Vocaband - the fun way to master English vocabulary for Israeli EFL students!");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-surface">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-20 px-6 signature-gradient text-on-primary relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -ml-32 -mb-32" />

          <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
            {/* Logo and Badge */}
            <div className="mb-6 flex flex-col items-center">
              <div className="w-24 h-24 bg-surface-container-lowest rounded-xl shadow-xl flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
                <span className="text-6xl font-black text-primary font-headline">V</span>
              </div>
              <p className="text-sm font-black tracking-widest uppercase opacity-90">
                Israeli English Curriculum • Bands Vocabulary
              </p>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-8xl font-black font-headline leading-none tracking-tighter mb-6 max-w-4xl">
              Level Up Your Vocabulary
            </h1>

            <p className="text-xl md:text-2xl font-bold opacity-90 mb-12 max-w-2xl leading-relaxed">
              The digital playground for Israeli EFL students. Master your bands vocabulary through play.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
              <button
                onClick={onGetStarted}
                className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-xl text-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Start Learning
                <Rocket size={24} />
              </button>
              <button
                onClick={onGetStarted}
                className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-xl text-xl font-bold hover:bg-surface-container-lowest/20 transition-all"
              >
                Teacher Login
              </button>
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
            <div className="md:col-span-8 bg-surface-container-low rounded-xl p-10 flex flex-col justify-between relative overflow-hidden group">
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
              <div className="mt-12 flex gap-4 overflow-hidden flex-wrap">
                <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-2 transition-transform duration-300">
                  Flashcards
                </div>
                <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-4 transition-transform duration-500 delay-75">
                  Speed Match
                </div>
                <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-1 transition-transform duration-400 delay-150">
                  Vocab Tower
                </div>
              </div>
            </div>

            {/* Live Classroom Challenges */}
            <div className="md:col-span-4 bg-secondary-container rounded-xl p-10 flex flex-col items-center text-center">
              <div className="bg-surface-container-lowest text-secondary w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-xl">
                <Users size={40} />
              </div>
              <h3 className="text-3xl font-black font-headline mb-4 text-on-secondary-container">
                Live Classroom Challenges
              </h3>
              <p className="text-lg font-bold text-on-secondary-container/80">
                Battle your classmates in real-time. Who will top the weekly leaderboard?
              </p>
            </div>

            {/* XP-Based Shop */}
            <div className="md:col-span-6 bg-tertiary-container rounded-xl p-10 flex flex-row items-center gap-8 overflow-hidden">
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
            </div>

            {/* Avatar Preview Section */}
            <div className="md:col-span-6 bg-surface-container-high rounded-xl p-10 flex flex-col">
              <h3 className="text-3xl font-black font-headline mb-8">
                Unlock Your Identity
              </h3>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-surface-container-lowest rounded-full border-4 border-primary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-3xl">
                    🐉
                  </div>
                  <div className="w-20 h-20 bg-surface-container-lowest rounded-full border-4 border-secondary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-3xl">
                    🦅
                  </div>
                  <div className="w-20 h-20 bg-surface-container-lowest rounded-full border-4 border-tertiary p-1 shadow-xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-3xl">
                    🐺
                  </div>
                </div>
                <button
                  onClick={onGetStarted}
                  className="bg-on-surface text-surface px-6 py-3 rounded-full font-black flex items-center gap-2 hover:scale-105 transition-all"
                >
                  View All
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Visualization (The Pulse) */}
        <section className="py-20 bg-surface-container-lowest px-6 overflow-hidden">
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
            <div className="space-y-4">
              <div className="flex justify-between items-end font-black">
                <span className="text-2xl">Band I (Foundation)</span>
                <span className="text-primary">85% Complete</span>
              </div>
              <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
                <div className="h-full bg-primary rounded-full w-[85%] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center -mr-5 border-2 border-primary">
                    <span className="text-xl">⭐</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Band II */}
            <div className="space-y-4 opacity-70">
              <div className="flex justify-between items-end font-black">
                <span className="text-2xl">Band II (Intermediate)</span>
                <span className="text-on-surface-variant">42% In Progress</span>
              </div>
              <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
                <div className="h-full bg-secondary rounded-full w-[42%] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center -mr-5 border-2 border-secondary">
                    <span className="text-xl">⚡</span>
                  </div>
                </div>
              </div>
            </div>
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
            <h2 className="text-4xl md:text-7xl font-black font-headline text-on-primary mb-8 relative z-10 tracking-tighter">
              Ready to become a Vocab Legend?
            </h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center relative z-10">
              <button
                onClick={onGetStarted}
                className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-xl text-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Start Learning
                <Rocket size={24} />
              </button>
              <button
                onClick={onGetStarted}
                className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-xl text-xl font-bold hover:bg-surface-container-lowest/20 transition-all"
              >
                Teacher Login
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-stone-100 dark:bg-stone-900 w-full py-8">
          <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 max-w-7xl mx-auto gap-4">
            <p className="text-stone-500 dark:text-stone-400 font-bold text-sm text-center md:text-left">
                © 2026 Vocaband • All rights reserved.
            </p>
            <div className="flex gap-8">
              <button
                onClick={() => onNavigate("playground")}
                className="text-stone-500 dark:text-stone-400 font-bold hover:text-blue-500 transition-colors"
              >
                Features
              </button>
              <button className="text-stone-500 dark:text-stone-400 font-bold hover:text-blue-500 transition-colors">
                Methodology
              </button>
              <button className="text-stone-500 dark:text-stone-400 font-bold hover:text-blue-500 transition-colors">
                Support
              </button>
              <button
                onClick={() => onNavigate("privacy")}
                className="text-stone-500 dark:text-stone-400 font-bold hover:text-blue-500 transition-colors"
              >
                Privacy
              </button>
            </div>
          </div>
        </footer>
      </main>

      <MobileNav currentPage="home" onNavigate={onNavigate} />

      {/* Floating Social Sidebar - Desktop only */}
      <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
        {/* WhatsApp */}
        <button
          onClick={shareOnWhatsApp}
          className="w-12 h-12 bg-stone-800/60 dark:bg-stone-200/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-green-500/80 transition-all hover:scale-110"
          title="Share on WhatsApp"
        >
          <MessageCircle size={22} className="text-white dark:text-stone-800" />
        </button>

        {/* Back to Top - only shows when scrolled down */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="w-12 h-12 bg-stone-800/60 dark:bg-stone-200/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary/80 transition-all hover:scale-110"
            title="Back to top"
          >
            <ArrowUp size={22} className="text-white dark:text-stone-800" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
