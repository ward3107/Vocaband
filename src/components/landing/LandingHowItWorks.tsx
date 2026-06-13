import React from "react";
import { UserPlus, Gamepad2, LineChart } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingSectionsT } from "../../locales/student/landing-sections";

// Condensed "How it works" band — the single overview that replaces the
// old Students / AI / Teachers / Journey deep sections (Version B redesign).
// Deliberately motion/react-free: a marketing band this far down the page
// doesn't justify pulling the animation runtime onto its chunk. Hover/entry
// affordance comes from Tailwind transitions only, matching the hero.
const LandingHowItWorks: React.FC = () => {
  const { language, dir, isRTL } = useLanguage();
  const t = landingSectionsT[language].howItWorks;

  const steps = [
    { Icon: UserPlus, title: t.step1Title, desc: t.step1Desc, grad: "from-indigo-500 to-violet-600" },
    { Icon: Gamepad2, title: t.step2Title, desc: t.step2Desc, grad: "from-fuchsia-500 to-pink-600" },
    { Icon: LineChart, title: t.step3Title, desc: t.step3Desc, grad: "from-amber-400 to-orange-500" },
  ];

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 bg-violet-950 relative overflow-hidden" dir={dir}>
      {/* GPU-cheap backdrop — matches the hero/final-CTA gradient language
          without any video fetch or motion runtime. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950" aria-hidden="true" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl -z-10" aria-hidden="true" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <h2 className="text-3xl md:text-5xl font-black font-headline text-white tracking-tight mb-3">
          {t.h2}
        </h2>
        <p className="text-base md:text-lg text-white/65 max-w-2xl mx-auto mb-12">
          {t.subtitle}
        </p>

        <ol className="grid md:grid-cols-3 gap-5 md:gap-6 list-none">
          {steps.map((s, i) => (
            <li
              key={i}
              className={`group rounded-3xl p-7 bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.08] transition-colors ${isRTL ? "text-right" : "text-left"}`}
            >
              <div className="flex items-center gap-4 mb-5">
                <span
                  className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-105`}
                >
                  <s.Icon size={24} strokeWidth={2.5} className="text-white" aria-hidden="true" />
                </span>
                <span className="text-5xl font-black text-white/15 leading-none tabular-nums">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">{s.title}</h3>
              <p className="text-sm md:text-[15px] text-white/70 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
