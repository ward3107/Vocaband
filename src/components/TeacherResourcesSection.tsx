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
import { CircleHelp, Download, ArrowRight } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { teacherResourcesT } from "../locales/student/teacher-resources";

// PDF download languages. Independent of the UI Language type so we can
// offer Russian PDFs (for Russian-speaking parents in mixed classrooms)
// without dragging Russian through the rest of the app's i18n surface.
type PdfLanguage = "en" | "he" | "ar" | "ru";

interface PdfLangSpec {
  code: PdfLanguage;
  name: string;
  flag: string;
  /** "rtl" so Hebrew / Arabic names render with the right shaping
   *  even when the surrounding card is LTR. */
  dir: "ltr" | "rtl";
}

const PDF_LANGUAGES: PdfLangSpec[] = [
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "he", name: "עברית",   flag: "🇮🇱", dir: "rtl" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "ru", name: "Русский", flag: "🇷🇺", dir: "ltr" },
];

// Languages that actually have a generated PDF in public/docs/.
const AVAILABLE_PDF_LANGUAGES: ReadonlySet<PdfLanguage> = new Set(["en", "he", "ar", "ru"]);

interface TeacherResourcesSectionProps {
  /** "hero" — big section with eyebrow + heading + subtitle (landing page).
   *  "compact" — slim variant with just the cards (teacher login screen). */
  variant?: "hero" | "compact";
  /** Optional click handler for the FAQ card — when not provided, the
   *  card falls back to a regular anchor link to "/faq".  Landing
   *  page provides this to keep navigation within the SPA. */
  onOpenFaq?: () => void;
}

interface PdfCardSpec {
  key: "teacher-guide" | "quick-start" | "student-guide" | "parent-letter" | "privacy-sheet";
  emoji: string;
  // Tailwind gradient classes — one palette per card so the row
  // reads as a coloured strip rather than a uniform block.
  gradient: string;
  ring: string;
  iconBg: string;
  draft?: boolean;
}

const PDF_CARDS: PdfCardSpec[] = [
  {
    key: "teacher-guide",
    emoji: "📘",
    gradient: "from-indigo-500 via-violet-600 to-fuchsia-600",
    ring: "ring-indigo-300/40",
    iconBg: "from-indigo-400 to-violet-500",
  },
  {
    key: "quick-start",
    emoji: "⚡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ring: "ring-amber-300/40",
    iconBg: "from-amber-400 to-orange-500",
  },
  {
    key: "student-guide",
    emoji: "🎮",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ring: "ring-emerald-300/40",
    iconBg: "from-emerald-400 to-teal-500",
  },
  {
    key: "parent-letter",
    emoji: "✉️",
    gradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    ring: "ring-pink-300/40",
    iconBg: "from-pink-400 to-fuchsia-500",
  },
  {
    key: "privacy-sheet",
    emoji: "🛡️",
    gradient: "from-slate-600 via-slate-700 to-slate-900",
    ring: "ring-slate-300/40",
    iconBg: "from-slate-400 to-slate-600",
    draft: true,
  },
];

function titleFor(card: PdfCardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "teacher-guide":  return t.teacherGuideTitle;
    case "quick-start":    return t.quickStartTitle;
    case "student-guide":  return t.studentGuideTitle;
    case "parent-letter":  return t.parentLetterTitle;
    case "privacy-sheet":  return t.privacyTitle;
  }
}

function blurbFor(card: PdfCardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "teacher-guide":  return t.teacherGuideBlurb;
    case "quick-start":    return t.quickStartBlurb;
    case "student-guide":  return t.studentGuideBlurb;
    case "parent-letter":  return t.parentLetterBlurb;
    case "privacy-sheet":  return t.privacyBlurb;
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

        {/* Card grid — five downloadable PDFs.  The FAQ used to live in
            this grid too, but it's an in-app navigation (not a file
            download) so it now sits in its own strip below where the
            different affordance reads correctly. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {PDF_CARDS.map((card, i) => {
            const title = titleFor(card, t);
            const blurb = blurbFor(card, t);

            // Move the user's UI language to the top of the per-card
            // list so the default-language download is always one tap
            // away even though all four options stay visible.
            const orderedLanguages = [...PDF_LANGUAGES].sort((a, b) =>
              a.code === language ? -1 : b.code === language ? 1 : 0,
            );

            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05 }}
                className={`relative overflow-hidden rounded-3xl p-5 md:p-6 h-full bg-gradient-to-br ${card.gradient} text-white shadow-lg shadow-violet-500/10 ring-1 ${card.ring} flex flex-col`}
              >
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
                <p className="text-white/85 text-sm leading-relaxed mb-4 line-clamp-3">
                  {blurb}
                </p>

                <div className="mt-auto pt-3 border-t border-white/20">
                  <p className={`text-white/70 text-[10px] font-black uppercase tracking-[0.15em] mb-2 ${isRTL ? "text-right" : "text-left"}`}>
                    {t.downloadInLanguage}
                  </p>
                  <ul className="space-y-1.5">
                    {orderedLanguages.map((lang) => {
                      const available = AVAILABLE_PDF_LANGUAGES.has(lang.code);
                      const isCurrent = lang.code === language;
                      const href = `/docs/${card.key}-${lang.code}.pdf`;

                      const row = (
                        <div
                          className={[
                            "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all",
                            available
                              ? "bg-white/10 border-white/20 hover:bg-white/25 hover:border-white/40 active:scale-[0.98]"
                              : "bg-white/5 border-white/10 cursor-not-allowed",
                            isCurrent && available ? "ring-2 ring-white/60" : "",
                            isRTL ? "flex-row-reverse" : "",
                          ].join(" ")}
                        >
                          <span className="text-base leading-none" aria-hidden="true">{lang.flag}</span>
                          <span className={`${available ? "" : "opacity-60"}`} dir={lang.dir}>
                            {lang.name}
                          </span>
                          {isCurrent && available && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/25 text-[9px] font-black uppercase tracking-wider">
                              {t.recommendedPill}
                            </span>
                          )}
                          <span className="flex-1" />
                          {available ? (
                            <Download size={14} aria-hidden="true" className="opacity-90" />
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[9px] font-black uppercase tracking-wider">
                              {t.comingSoon}
                            </span>
                          )}
                        </div>
                      );

                      return (
                        <li key={lang.code}>
                          {available ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="block"
                              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                              aria-label={`${title} — ${lang.name} (PDF)`}
                            >
                              {row}
                            </a>
                          ) : (
                            <div aria-disabled="true">{row}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ strip — separate from the download grid because it's an
            in-app navigation, not a file download.  Wider, shorter card
            so the different affordance is visually obvious. */}
        <FaqStrip
          title={t.faqTitle}
          blurb={t.faqBlurb}
          openFaqLabel={t.openFaq}
          onOpenFaq={onOpenFaq}
          isRTL={isRTL}
        />
      </div>
    </section>
  );
};

interface FaqStripProps {
  title: string;
  blurb: string;
  openFaqLabel: string;
  onOpenFaq?: () => void;
  isRTL: boolean;
}

const FaqStrip: React.FC<FaqStripProps> = ({ title, blurb, openFaqLabel, onOpenFaq, isRTL }) => {
  const inner = (
    <motion.div
      whileHover={{ scale: 1.005, y: -1 }}
      whileTap={{ scale: 0.995 }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className={`mt-6 md:mt-8 relative overflow-hidden rounded-3xl p-5 md:p-6 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-sky-500/15 ring-1 ring-sky-300/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isRTL ? "md:flex-row-reverse" : ""}`}
    >
      <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-2xl shadow-md shadow-black/10 ring-1 ring-white/30 shrink-0">
          <span aria-hidden="true">❓</span>
        </div>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h3 className="text-lg md:text-xl font-black mb-1 leading-tight">{title}</h3>
          <p className="text-white/85 text-sm leading-relaxed">{blurb}</p>
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-sm font-bold transition-colors self-start md:self-auto ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <CircleHelp size={14} aria-hidden="true" />
        <span>{openFaqLabel}</span>
        <ArrowRight size={14} className={isRTL ? "rotate-180" : ""} aria-hidden="true" />
      </div>
    </motion.div>
  );

  if (onOpenFaq) {
    return (
      <button
        type="button"
        onClick={onOpenFaq}
        className="block w-full text-start"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
      >
        {inner}
      </button>
    );
  }
  return (
    <a
      href="/faq"
      className="block w-full"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
    >
      {inner}
    </a>
  );
};

export default TeacherResourcesSection;
