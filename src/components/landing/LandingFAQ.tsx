import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CircleHelp, GraduationCap, Users, Globe, ChevronDown, Mail } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { faqT } from "../../locales/student/faq";

const LandingFAQ: React.FC = () => {
  const { language, dir, isRTL } = useLanguage();
  const fq = faqT[language];

  const [openFaqItem, setOpenFaqItem] = useState<string | null>(null);
  const toggleFaq = (id: string) => setOpenFaqItem(prev => (prev === id ? null : id));

  const groups = [
    {
      section: fq.teacherSection,
      icon: <GraduationCap size={20} className="text-white" />,
      iconBg: "from-violet-500 to-fuchsia-500",
      iconShadow: "shadow-violet-500/30",
      items: [
        { id: "q1", q: fq.q1, a: fq.a1 },
        { id: "q2", q: fq.q2, a: fq.a2 },
        { id: "q3", q: fq.q3, a: fq.a3 },
        { id: "q4", q: fq.q4, a: fq.a4 },
        { id: "q5", q: fq.q5, a: fq.a5 },
        { id: "q6", q: fq.q6, a: fq.a6 },
      ],
    },
    {
      section: fq.studentSection,
      icon: <Users size={20} className="text-white" />,
      iconBg: "from-sky-500 to-cyan-500",
      iconShadow: "shadow-sky-500/30",
      items: [
        { id: "q7", q: fq.q7, a: fq.a7 },
        { id: "q8", q: fq.q8, a: fq.a8 },
        { id: "q9", q: fq.q9, a: fq.a9 },
        { id: "q10", q: fq.q10, a: fq.a10 },
      ],
    },
    {
      section: fq.generalSection,
      icon: <Globe size={20} className="text-white" />,
      iconBg: "from-amber-500 to-orange-500",
      iconShadow: "shadow-amber-500/30",
      items: [
        { id: "q11", q: fq.q11, a: fq.a11 },
        { id: "q12", q: fq.q12, a: fq.a12 },
        { id: "q13", q: fq.q13, a: fq.a13 },
      ],
    },
  ];

  return (
    <section className="py-12 md:py-24 px-4 md:px-6 relative bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-violet-500/20 border border-violet-400/30 mb-6">
            <CircleHelp size={20} className="text-violet-300" />
            <span className="text-violet-200 font-bold text-sm">FAQ</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 font-headline drop-shadow-lg">
            {fq.title}
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto text-center" dir={dir}>
            {fq.subtitle}
          </p>
        </motion.div>

        {groups.map((group, gi) => (
          <motion.div
            key={group.section}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + gi * 0.05 }}
            className="mb-10 md:mb-12"
          >
            <div className={`flex items-center gap-3 mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.iconBg} flex items-center justify-center shadow-lg ${group.iconShadow}`}>
                {group.icon}
              </div>
              <h3 className="text-2xl font-bold text-white">{group.section}</h3>
            </div>
            <div className="space-y-3 md:space-y-4">
              {group.items.map(item => {
                const isOpen = openFaqItem === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      aria-expanded={isOpen}
                      className={`w-full px-5 md:px-6 py-4 md:py-5 flex items-center gap-4 hover:bg-white/5 transition-colors ${isRTL ? "flex-row-reverse text-right" : "text-left"}`}
                    >
                      <CircleHelp size={22} className="text-violet-400 flex-shrink-0" />
                      <span className="flex-1 font-bold text-white text-base md:text-lg">{item.q}</span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown size={24} className="text-white/60" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 md:px-6 pb-5 pt-0">
                            <div className={`text-white/80 leading-relaxed ${isRTL ? "pr-9 text-right" : "pl-9 text-left"}`} dir={dir}>
                              {item.a}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10"
        >
          <Mail size={32} className="text-violet-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-4">{fq.cta}</h3>
          <a
            href="mailto:contact@vocaband.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            {fq.ctaButton}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingFAQ;
