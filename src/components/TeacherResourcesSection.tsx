/**
 * TeacherResourcesSection — public-facing card grid linking to the
 * generated teacher PDFs (and the FAQ page).
 *
 * Mounted in two places:
 *   - <LandingPage /> above the footer            → variant="hero"
 *   - <TeacherLoginView /> below the login card   → variant="compact"
 *
 * The PDFs themselves are produced by scripts/teacher-pdfs/build.mjs
 * and served as static files from /docs/<key>-<lang>.pdf via the
 * Cloudflare Worker.
 *
 * Each card carries its own gradient so the grid reads as a colour
 * palette rather than a list — matches the in-app shop / arcade
 * design grammar (one gradient per item).
 */

import React from "react";
import { motion } from "motion/react";
import { BookOpen, Zap, Gamepad2, Mail, ShieldCheck, CircleHelp, Download, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { teacherResourcesT } from "../locales/student/teacher-resources";

interface TeacherResourcesSectionProps {
  /** "hero" — big section with eyebrow + heading + subtitle (landing page).
   *  "compact" — slim variant with just the cards (teacher login screen). */
  variant?: "hero" | "compact";
  /** Optional click handler for the FAQ card — when not provided, the
   *  card falls back to a regular anchor link to "/faq".  Landing
   *  page provides this to keep navigation within the SPA. */
  onOpenFaq?: () => void;
}

interface CardSpec {
  key: "teacher-guide" | "quick-start" | "student-guide" | "parent-letter" | "privacy-sheet" | "faq";
  icon: LucideIcon;
  emoji: string;
  // Tailwind gradient classes — one palette per card so the row
  // reads as a coloured strip rather than a uniform block.
  gradient: string;
  ring: string;
  iconBg: string;
  draft?: boolean;
  isFaq?: boolean;
}

const CARDS: CardSpec[] = [
  {
    key: "teacher-guide",
    icon: BookOpen,
    emoji: "📘",
    gradient: "from-indigo-500 via-violet-600 to-fuchsia-600",
    ring: "ring-indigo-300/40",
    iconBg: "from-indigo-400 to-violet-500",
  },
  {
    key: "quick-start",
    icon: Zap,
    emoji: "⚡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ring: "ring-amber-300/40",
    iconBg: "from-amber-400 to-orange-500",
  },
  {
    key: "student-guide",
    icon: Gamepad2,
    emoji: "🎮",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ring: "ring-emerald-300/40",
    iconBg: "from-emerald-400 to-teal-500",
  },
  {
    key: "parent-letter",
    icon: Mail,
    emoji: "✉️",
    gradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    ring: "ring-pink-300/40",
    iconBg: "from-pink-400 to-fuchsia-500",
  },
  {
    key: "privacy-sheet",
    icon: ShieldCheck,
    emoji: "🛡️",
    gradient: "from-slate-600 via-slate-700 to-slate-900",
    ring: "ring-slate-300/40",
    iconBg: "from-slate-400 to-slate-600",
    draft: true,
  },
  {
    key: "faq",
    icon: CircleHelp,
    emoji: "❓",
    gradient: "from-sky-500 via-blue-600 to-indigo-600",
    ring: "ring-sky-300/40",
    iconBg: "from-sky-400 to-blue-500",
    isFaq: true,
  },
];

function titleFor(card: CardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "teacher-guide":  return t.teacherGuideTitle;
    case "quick-start":    return t.quickStartTitle;
    case "student-guide":  return t.studentGuideTitle;
    case "parent-letter":  return t.parentLetterTitle;
    case "privacy-sheet":  return t.privacyTitle;
    case "faq":            return t.faqTitle;
  }
}

function blurbFor(card: CardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "teacher-guide":  return t.teacherGuideBlurb;
    case "quick-start":    return t.quickStartBlurb;
    case "student-guide":  return t.studentGuideBlurb;
    case "parent-letter":  return t.parentLetterBlurb;
    case "privacy-sheet":  return t.privacyBlurb;
    case "faq":            return t.faqBlurb;
  }
}

// Tiny indirection so the helpers above can be typed against the
// locale shape without re-importing it everywhere.
function useLocale() {
  const { language } = useLanguage();
  return teacherResourcesT[language];
}

const TeacherResourcesSection: React.FC<TeacherResourcesSectionProps> = ({
  variant = "hero",
  onOpenFaq,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = teacherResourcesT[language];

  const isHero = variant === "hero";

  return (
    <section
      dir={dir}
      className={
        isHero
          ? "px-4 md:px-6 py-16 md:py-24 bg-gradient-to-b from-white via-violet-50/40 to-white"
          : "px-4 py-8"
      }
    >
      <div className="max-w-6xl mx-auto">
        {/* Hero header — landing page only */}
        {isHero && (
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-black uppercase tracking-[0.15em] mb-4"
            >
              {t.sectionEyebrow}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.05 }}
              className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight mb-3"
            >
              {t.sectionHeading}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.1 }}
              className="text-stone-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed"
            >
              {t.sectionSubtitle}
            </motion.p>
          </div>
        )}

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            const title = titleFor(card, t);
            const blurb = blurbFor(card, t);
            const href = card.isFaq ? undefined : `/docs/${card.key}-${language}.pdf`;
            const cta = card.isFaq ? t.openFaq : t.downloadPdf;
            const CtaIcon = card.isFaq ? ArrowRight : Download;

            const inner = (
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05 }}
                className={`group relative overflow-hidden rounded-3xl p-5 md:p-6 h-full bg-gradient-to-br ${card.gradient} text-white shadow-lg shadow-violet-500/10 ring-1 ${card.ring}`}
              >
                {/* Frosted emoji medallion */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-2xl shadow-md shadow-black/10 ring-1 ring-white/30`}>
                    <span aria-hidden="true">{card.emoji}</span>
                  </div>
                  {card.draft && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest">
                      {t.privacyDraftPill}
                    </span>
                  )}
                </div>

                <h3 className="text-lg md:text-xl font-black mb-1.5 leading-tight">
                  {title}
                </h3>
                <p className="text-white/85 text-sm leading-relaxed mb-5 line-clamp-3">
                  {blurb}
                </p>

                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-sm font-bold transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{cta}</span>
                  <CtaIcon size={14} className={isRTL ? "rotate-180" : ""} aria-hidden="true" />
                </div>
              </motion.div>
            );

            // Anchor-vs-button: PDFs open in a new tab; the FAQ card
            // either calls the prop or falls back to a regular href.
            if (card.isFaq) {
              if (onOpenFaq) {
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={onOpenFaq}
                    className="text-start"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <a
                  key={card.key}
                  href="/faq"
                  className="block"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                >
                  {inner}
                </a>
              );
            }

            return (
              <a
                key={card.key}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="block"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {inner}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TeacherResourcesSection;
