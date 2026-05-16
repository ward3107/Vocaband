import React from "react";
import { motion } from "motion/react";
import { Compass, FileText } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";

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
  const t = landingPageT[language];

  const subjects = [
    { name: t.vocaHistoryName, emoji: "📜", color: "from-amber-500 to-orange-600", tag: t.vocaHistoryTag },
    { name: t.vocaScienceName, emoji: "🔬", color: "from-emerald-500 to-teal-600", tag: t.vocaScienceTag },
    { name: t.vocaHebrewName, emoji: "📖", color: "from-blue-500 to-indigo-600", tag: t.vocaHebrewTag },
    { name: t.vocaArabicName, emoji: "📚", color: "from-rose-500 to-pink-600", tag: t.vocaArabicTag },
    { name: t.vocaMathName, emoji: "🔢", color: "from-violet-500 to-fuchsia-600", tag: t.vocaMathTag },
  ];

  return (
    <section className="py-8 md:py-20 px-4 md:px-6 relative overflow-hidden">
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
            {t.vocaFamilyPill}
          </span>
        </motion.div>
        <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
          {t.vocaFamilyH2}
        </h2>
        <p className="text-lg text-white/80 font-bold max-w-2xl mx-auto" dir={dir}>
          {t.vocaFamilySubtitle}
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
        {subjects.map((subject, i) => (
          <motion.div
            key={subject.name}
            initial={{ opacity: 0, scale: 0.4, rotate: i % 2 === 0 ? -360 : 360 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1.4, delay: 0.1 + i * 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            whileHover={{ y: -8, scale: 1.04 }}
            className="relative group"
          >
            <div className={`h-full p-7 sm:p-5 rounded-3xl bg-gradient-to-br ${subject.color} text-white shadow-lg overflow-hidden`}>
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
        <p className="text-white/70 font-bold text-sm mb-3" dir={dir}>
          {t.vocaFamilyRequestLine}
        </p>
        <motion.button
          onClick={onOpenSubjectRequest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-black transition-colors"
          type="button"
        >
          <FileText size={18} />
          {t.vocaFamilyRequestCta}
        </motion.button>
      </motion.div>
    </section>
  );
};

export default LandingVocas;
