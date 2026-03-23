import React from "react";
import { ArrowRight, Sparkles, Zap, Flame, Play, ExternalLink } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted }) => {
  return (
    <div className="min-h-screen bg-surface">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="pt-24 pb-32">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-12 lg:py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full">
              <Sparkles className="text-primary" size={16} />
              <span className="text-sm font-black text-on-surface-variant uppercase tracking-tighter">
                New Game Mode: Lyric Master
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] text-on-surface font-headline">
              Turn Vocab Into{" "}
              <span className="text-primary italic">Your Rhythm.</span>
            </h1>

            <p className="text-xl text-on-surface-variant font-medium leading-relaxed max-w-xl">
              Master the Israeli Ministry of Education English curriculum through interactive music-based learning. Built for students who find textbooks boring and music essential.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => onNavigate("playground")}
                className="signature-gradient text-white font-black text-lg px-8 py-5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                Start Learning Free
                <ArrowRight size={20} />
              </button>
              <button
                onClick={onGetStarted}
                className="bg-surface-container-lowest border-2 border-outline-variant/20 text-on-surface font-black text-lg px-8 py-5 rounded-xl hover:bg-surface-container-low transition-all"
              >
                View Curriculum
              </button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="lg:w-1/2 relative">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Main card */}
              <div className="absolute inset-0 bg-primary-container rounded-[3rem] rotate-3 shadow-2xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary-container via-secondary-container/50 to-tertiary-container/30" />
              </div>

              {/* XP Reward floating card */}
              <div className="absolute -top-4 -right-4 bg-surface-container-lowest p-6 rounded-3xl shadow-xl shadow-stone-900/10 -rotate-3 border border-surface-container-high animate-pulse-subtle">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center">
                    <Zap className="text-on-tertiary-container" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-stone-400">
                      Streak Reward
                    </div>
                    <div className="text-xl font-black text-on-surface">
                      +450 XP
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress floating card */}
              <div className="absolute -bottom-8 -left-8 bg-surface-container-lowest p-6 rounded-3xl shadow-xl shadow-stone-900/10 rotate-2 border border-surface-container-high w-64">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-black text-sm">Lyric Progress</span>
                  <span className="text-primary font-black">82%</span>
                </div>
                <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full signature-gradient w-[82%] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center">
                      <Flame className="text-orange-500" size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Ministry Approved - Large card */}
            <div className="md:col-span-8 bg-surface-container-low rounded-[3rem] p-12 flex flex-col justify-between min-h-[400px]">
              <div className="max-w-md">
                <h3 className="text-3xl font-black mb-4 font-headline">
                  Ministry Approved <br /> Content Library
                </h3>
                <p className="text-on-surface-variant font-medium text-lg leading-relaxed">
                  Every song, activity, and assessment is meticulously aligned with the Israeli Band 1, 2, and 3 vocabulary requirements.
                </p>
              </div>
              <div className="flex gap-4 mt-8 flex-wrap">
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-primary shadow-sm">
                  Band 1 Beginner
                </span>
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-secondary shadow-sm">
                  Band 2 Intermediate
                </span>
                <span className="px-6 py-3 bg-surface-container-lowest rounded-full font-black text-tertiary shadow-sm">
                  Band 3 Academic
                </span>
              </div>
            </div>

            {/* Auditory Focus */}
            <div className="md:col-span-4 bg-secondary-container rounded-[3rem] p-10 flex flex-col items-center text-center justify-center gap-6">
              <div className="w-20 h-20 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-4xl text-secondary">
                  hearing
                </span>
              </div>
              <h3 className="text-2xl font-black text-on-secondary-container font-headline">
                Auditory Focus
              </h3>
              <p className="text-on-secondary-container/80 font-bold">
                Listen, record, and perfect your pronunciation with AI-driven feedback.
              </p>
            </div>

            {/* Smart Spacing */}
            <div className="md:col-span-4 bg-surface-container-high rounded-[3rem] p-10 flex flex-col justify-between">
              <span className="material-symbols-outlined text-4xl text-on-surface opacity-20">
                auto_awesome
              </span>
              <div>
                <h3 className="text-2xl font-black mb-2 font-headline">Smart Spacing</h3>
                <p className="text-on-surface-variant font-bold">
                  Scientifically proven intervals for long-term memory retention.
                </p>
              </div>
            </div>

            {/* Teacher Dashboard */}
            <div className="md:col-span-8 bg-surface-container-lowest border-2 border-surface-container rounded-[3rem] p-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/3 aspect-video bg-surface-container-high rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-primary shadow-lg">
                    <Play size={24} />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-3 font-headline">Teacher Dashboards</h3>
                <p className="text-on-surface-variant font-medium">
                  Real-time tracking of student progress, common struggles, and curriculum coverage.
                </p>
                <button className="inline-flex items-center gap-2 text-primary font-black mt-4 hover:underline">
                  Explore LMS Features{" "}
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-12">
          <div className="signature-gradient rounded-[3.5rem] p-12 lg:p-24 text-center relative overflow-hidden">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 relative z-10 font-headline">
              Ready to break the silence?
            </h2>
            <p className="text-on-primary font-bold text-xl mb-12 max-w-2xl mx-auto relative z-10">
              Join over 50,000 Israeli students learning English through the power of music and kinetic play.
            </p>
            <div className="flex justify-center gap-6 relative z-10">
              <button
                onClick={onGetStarted}
                className="bg-white text-primary font-black text-xl px-12 py-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </section>
      </main>

      <MobileNav currentPage="home" onNavigate={onNavigate} />
    </div>
  );
};

export default LandingPage;
