import React from "react";
import { Rocket, Users, Gamepad2 } from "lucide-react";
import MobileNav from "./MobileNav";

interface PlaygroundPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({
  onNavigate,
  onGetStarted,
}) => {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-[#fff5ee]/90 backdrop-blur-md shadow-xl shadow-stone-900/5 fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-20">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-blue-600 text-3xl">
            auto_stories
          </span>
          <span className="text-xl md:text-2xl font-black text-blue-600 font-headline tracking-tighter">
            Vocaband
          </span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigate("home")}
            className="text-stone-600 font-bold hover:text-primary transition-colors"
          >
            Home
          </button>
          <button className="text-blue-700 border-b-4 border-blue-600 font-bold pb-1">
            Games
          </button>
          <span className="text-stone-400 font-bold">Bands</span>
        </div>
        <button
          onClick={onGetStarted}
          className="bg-primary text-white px-4 md:px-6 py-2 rounded-full font-black text-sm md:text-base"
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 signature-gradient text-on-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-surface-container-lowest rounded-3xl shadow-xl flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-6xl font-black text-primary font-headline">
                V
              </span>
            </div>
            <p className="text-sm font-black tracking-widest uppercase opacity-90">
              Israeli English Curriculum • Bands Vocabulary
            </p>
          </div>
          <h1 className="text-5xl md:text-8xl font-black font-headline leading-none tracking-tighter mb-6 max-w-4xl">
            Level Up Your Vocabulary
          </h1>
          <p className="text-xl md:text-2xl font-bold opacity-90 mb-12 max-w-2xl leading-relaxed">
            The digital playground for Israeli EFL students. Master your bands vocabulary through play.
          </p>
          <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
            <button
              onClick={onGetStarted}
              className="bg-tertiary-container text-on-tertiary-container px-12 py-5 rounded-2xl text-xl md:text-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
            >
              Start Learning <Rocket size={24} />
            </button>
            <button
              onClick={onGetStarted}
              className="bg-surface-container-lowest/10 border-2 border-surface-container-lowest/30 backdrop-blur-sm text-on-primary px-10 py-5 rounded-2xl text-lg md:text-xl font-bold"
            >
              Teacher Login
            </button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />
      </section>

      {/* Game Modes Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 bg-surface-container-low rounded-[3rem] p-10 md:p-12 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="bg-primary-container text-on-primary-container w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <Gamepad2 size={32} />
              </div>
              <h3 className="text-3xl md:text-4xl font-black font-headline mb-4">
                10 Fun Game Modes
              </h3>
              <p className="text-xl font-bold text-on-surface-variant max-w-md leading-relaxed">
                From "Word War" to "Grammar Galaxy," we turn every vocabulary list into an epic quest.
              </p>
            </div>
            <div className="mt-12 flex gap-4 overflow-hidden flex-wrap">
              <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-2 transition-transform">
                Flashcards
              </div>
              <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-4 transition-transform delay-75">
                Speed Match
              </div>
              <div className="px-6 py-3 bg-surface-container-lowest rounded-full font-black shadow-sm group-hover:-translate-y-6 transition-transform delay-150">
                Listening
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-secondary-container rounded-[3rem] p-10 flex flex-col items-center text-center">
            <div className="bg-surface-container-lowest text-secondary w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-xl">
              <Users size={40} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black font-headline mb-4 text-on-secondary-container">
              Live Classroom
            </h3>
            <p className="text-lg font-bold text-on-secondary-container/80">
              Battle classmates in real-time. Who will top the weekly leaderboard?
            </p>
          </div>
        </div>
      </section>

      {/* Band Levels Section */}
      <section className="py-20 bg-surface-container-lowest px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">
            Master Your Band Levels
          </h2>
          <p className="text-lg text-on-surface-variant font-medium">
            Track your progress through the Israeli Ministry of Education curriculum
          </p>
        </div>
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Band 1 */}
          <div className="space-y-4">
            <div className="flex justify-between items-end font-black">
              <span className="text-xl md:text-2xl">Band I (Foundation)</span>
              <span className="text-primary">85% Complete</span>
            </div>
            <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
              <div className="h-full bg-primary rounded-full w-[85%]" />
            </div>
          </div>

          {/* Band 2 */}
          <div className="space-y-4">
            <div className="flex justify-between items-end font-black">
              <span className="text-xl md:text-2xl">Band II (Intermediate)</span>
              <span className="text-secondary">60% Complete</span>
            </div>
            <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
              <div className="h-full bg-secondary rounded-full w-[60%]" />
            </div>
          </div>

          {/* Band 3 */}
          <div className="space-y-4">
            <div className="flex justify-between items-end font-black">
              <span className="text-xl md:text-2xl">Band III (Academic)</span>
              <span className="text-tertiary">25% Complete</span>
            </div>
            <div className="h-8 bg-surface-container-high rounded-full overflow-hidden relative border-4 border-surface-container-high">
              <div className="h-full bg-tertiary rounded-full w-[25%]" />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-16 text-center">
          <button
            onClick={onGetStarted}
            className="signature-gradient text-white font-black text-lg px-12 py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-100 py-12 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 max-w-7xl mx-auto gap-8">
          <span className="text-lg font-black text-stone-800 font-headline">
            Vocaband
          </span>
          <div className="flex gap-8">
            <button
              onClick={() => onNavigate("privacy")}
              className="text-stone-500 font-bold hover:text-primary transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => onNavigate("terms")}
              className="text-stone-500 font-bold hover:text-primary transition-colors"
            >
              Terms
            </button>
          </div>
        </div>
      </footer>

      <MobileNav currentPage="playground" onNavigate={onNavigate} />
    </div>
  );
};

export default PlaygroundPage;
