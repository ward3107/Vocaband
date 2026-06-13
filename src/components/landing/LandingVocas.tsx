import React from "react";
import { Compass, FileText } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingSectionsT } from "../../locales/student/landing-sections";

interface LandingVocasProps {
  onOpenSubjectRequest: () => void;
}

// Roadmap section — "The Voca Family".  Sneak-peek at the
// multi-subject expansion parked in CLAUDE.md §11.  The engine is
// mostly subject-agnostic so the same gameplay loop can power
// history dates, science vocab, math definitions, etc.  All entries
// labelled "Coming soon" so we never misrepresent shipped features.
const LandingVocas: React.FC<LandingVocasProps> = ({ onOpenSubjectRequest }) => {
  const { language, dir } = useLanguage();
  const t = landingSectionsT[language];

  const subjects = [
    { name: t.vocaHistoryName, emoji: "📜", color: "from-amber-500 to-orange-600", tag: t.vocaHistoryTag },
    { name: t.vocaScienceName, emoji: "🔬", color: "from-emerald-500 to-teal-600", tag: t.vocaScienceTag },
    { name: t.vocaHebrewName, emoji: "📖", color: "from-blue-500 to-indigo-600", tag: t.vocaHebrewTag },
    { name: t.vocaArabicName, emoji: "📚", color: "from-rose-500 to-pink-600", tag: t.vocaArabicTag },
    { name: t.vocaMathName, emoji: "🔢", color: "from-violet-500 to-fuchsia-600", tag: t.vocaMathTag },
  ];

  return (
    <section className="py-8 md:py-20 px-4 md:px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 mb-6">
          <Compass size={16} className="text-amber-300" />
          <span className="text-sm font-black tracking-widest uppercase text-amber-200">
            {t.vocaFamilyPill}
          </span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
          {t.vocaFamilyH2}
        </h2>
        <p className="text-lg text-white/80 font-bold max-w-2xl mx-auto" dir={dir}>
          {t.vocaFamilySubtitle}
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-5">
        {subjects.map((subject, i) => (
          <div
            key={subject.name}
            className="relative group transition-transform duration-200 hover:-translate-y-2 hover:scale-[1.04]"
          >
            <div className={`h-full p-7 sm:p-5 rounded-2xl bg-gradient-to-br ${subject.color} text-white shadow-lg overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <div className="relative z-10 text-center">
                <div className="flex justify-center mb-3 sm:mb-2">
                  <span
                    className="text-6xl sm:text-5xl drop-shadow-lg"
                    style={{
                      animation: 'bounce 2s ease-in-out infinite',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    {subject.emoji}
                  </span>
                </div>
                <h3 className="text-xl sm:text-lg font-black mb-1.5 sm:mb-1">{subject.name}</h3>
                <p className="text-sm sm:text-xs font-bold text-white/80 leading-tight">{subject.tag}</p>
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider">
                {t.vocaFamilyComingSoon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Early-access lead capture — uses the team's existing
          contact@ inbox so we don't need a new email pipeline.
          Subject-line tag makes inbound triaging easy. */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-white/70 font-bold text-sm mb-3" dir={dir}>
          {t.vocaFamilyRequestLine}
        </p>
        <button
          onClick={onOpenSubjectRequest}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-black transition-transform duration-150 hover:scale-105 active:scale-95"
          type="button"
        >
          <FileText size={18} />
          {t.vocaFamilyRequestCta}
        </button>
      </div>
    </section>
  );
};

export default LandingVocas;
