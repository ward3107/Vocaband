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
import { Download, Eye } from "lucide-react";
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
}

type CardKey =
  | "school-pitch"
  | "teacher-guide"
  | "quick-start"
  | "student-guide"
  | "parent-letter"
  | "privacy-sheet";

interface PdfCardSpec {
  key: CardKey;
  emoji: string;
  // Tailwind gradient classes — one palette per card so the row
  // reads as a coloured strip rather than a uniform block.
  gradient: string;
  ring: string;
  iconBg: string;
  draft?: boolean;
  /** Languages that have a generated PDF for this card.  Defaults to
   *  the global AVAILABLE_PDF_LANGUAGES when omitted — set explicitly
   *  for cards that ship fewer languages (e.g. school pitch is HE/AR
   *  only). */
  availableLanguages?: ReadonlySet<PdfLanguage>;
  /** Builds the absolute href for a given language.  Most cards live
   *  under /docs/<key>-<lang>.pdf; the school pitch lives at
   *  /Vocaband-Presentation-<LANG>.pdf so it gets its own builder. */
  hrefFor: (lang: PdfLanguage) => string;
}

const SCHOOL_PITCH_LANGUAGES: ReadonlySet<PdfLanguage> = new Set(["he", "ar"]);

const SCHOOL_CARDS: PdfCardSpec[] = [
  {
    key: "school-pitch",
    emoji: "🏫",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    ring: "ring-sky-300/40",
    iconBg: "from-sky-400 to-blue-500",
    availableLanguages: SCHOOL_PITCH_LANGUAGES,
    hrefFor: (lang) => `/Vocaband-Presentation-${lang.toUpperCase()}.pdf`,
  },
];

const TEACHER_CARDS: PdfCardSpec[] = [
  {
    key: "teacher-guide",
    emoji: "📘",
    gradient: "from-indigo-500 via-violet-600 to-fuchsia-600",
    ring: "ring-indigo-300/40",
    iconBg: "from-indigo-400 to-violet-500",
    hrefFor: (lang) => `/docs/teacher-guide-${lang}.pdf`,
  },
  {
    key: "quick-start",
    emoji: "⚡",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ring: "ring-amber-300/40",
    iconBg: "from-amber-400 to-orange-500",
    hrefFor: (lang) => `/docs/quick-start-${lang}.pdf`,
  },
  {
    key: "student-guide",
    emoji: "🎮",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ring: "ring-emerald-300/40",
    iconBg: "from-emerald-400 to-teal-500",
    hrefFor: (lang) => `/docs/student-guide-${lang}.pdf`,
  },
  {
    key: "parent-letter",
    emoji: "✉️",
    gradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    ring: "ring-pink-300/40",
    iconBg: "from-pink-400 to-fuchsia-500",
    hrefFor: (lang) => `/docs/parent-letter-${lang}.pdf`,
  },
  {
    key: "privacy-sheet",
    emoji: "🛡️",
    gradient: "from-slate-600 via-slate-700 to-slate-900",
    ring: "ring-slate-300/40",
    iconBg: "from-slate-400 to-slate-600",
    draft: true,
    hrefFor: (lang) => `/docs/privacy-sheet-${lang}.pdf`,
  },
];

function titleFor(card: PdfCardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "school-pitch":   return t.schoolPitchTitle;
    case "teacher-guide":  return t.teacherGuideTitle;
    case "quick-start":    return t.quickStartTitle;
    case "student-guide":  return t.studentGuideTitle;
    case "parent-letter":  return t.parentLetterTitle;
    case "privacy-sheet":  return t.privacyTitle;
  }
}

function blurbFor(card: PdfCardSpec, t: ReturnType<typeof useLocale>) {
  switch (card.key) {
    case "school-pitch":   return t.schoolPitchBlurb;
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
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = teacherResourcesT[language];

  const isHero = variant === "hero";

  return (
    <section
      id={isHero ? "guides" : undefined}
      dir={dir}
      className={
        isHero
          ? "px-4 md:px-6 py-16 md:py-24 bg-gradient-to-b from-white via-violet-50/40 to-white scroll-mt-20"
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

        {/* "For schools" group — pitch deck first.  Visually separated
            from the teacher handouts below so principals/admins find
            what they need without scanning the whole grid. */}
        <CardGroup heading={t.schoolGroupHeading} cards={SCHOOL_CARDS} t={t} language={language} isRTL={isRTL} />

        {/* "For teachers" group — the day-to-day handouts. */}
        <div className="mt-10 md:mt-12">
          <CardGroup heading={t.teacherGroupHeading} cards={TEACHER_CARDS} t={t} language={language} isRTL={isRTL} />
        </div>

      </div>
    </section>
  );
};

interface CardGroupProps {
  heading: string;
  cards: PdfCardSpec[];
  t: ReturnType<typeof useLocale>;
  language: ReturnType<typeof useLanguage>["language"];
  isRTL: boolean;
}

const CardGroup: React.FC<CardGroupProps> = ({ heading, cards, t, language, isRTL }) => {
  return (
    <div>
      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className={`text-xs md:text-sm font-black text-violet-700 uppercase tracking-[0.18em] mb-4 ${isRTL ? "text-right" : "text-left"}`}
      >
        {heading}
      </motion.h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {cards.map((card, i) => {
          const title = titleFor(card, t);
          const blurb = blurbFor(card, t);
          const availableSet = card.availableLanguages ?? AVAILABLE_PDF_LANGUAGES;

          // Move the user's UI language to the top of the per-card list
          // so the default-language download is always one tap away.
          const orderedLanguages = [...PDF_LANGUAGES].sort((a, b) =>
            a.code === language ? -1 : b.code === language ? 1 : 0,
          );

          // User's UI language card-level preview href — defaults to
          // the first available language if the user's UI language has
          // no PDF for this card (e.g. school pitch has no EN).
          const previewLang = availableSet.has(language as PdfLanguage)
            ? (language as PdfLanguage)
            : orderedLanguages.find((l) => availableSet.has(l.code))?.code;

          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className={`relative overflow-hidden rounded-2xl p-4 md:p-4 h-full bg-gradient-to-br ${card.gradient} text-white shadow-md shadow-violet-500/10 ring-1 ${card.ring} flex flex-col gap-3`}
            >
              {/* Header row — compact: smaller emoji + title side-by-side.
                  Preview eye opens user's language in a new tab for
                  users who want to look before downloading. */}
              <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-lg shadow shadow-black/10 ring-1 ring-white/30 shrink-0`}>
                  <span aria-hidden="true">{card.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <h3 className="text-base md:text-lg font-black leading-tight truncate">
                      {title}
                    </h3>
                    {card.draft && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest shrink-0">
                        {t.privacyDraftPill}
                      </span>
                    )}
                  </div>
                  <p className="text-white/80 text-xs leading-snug line-clamp-2 mt-0.5">
                    {blurb}
                  </p>
                </div>
                {previewLang && (
                  <a
                    href={card.hrefFor(previewLang)}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${title} — ${t.previewLabel}`}
                    title={t.previewLabel}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/25 ring-1 ring-white/20 hover:ring-white/40 flex items-center justify-center transition-colors shrink-0"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                  >
                    <Eye size={16} aria-hidden="true" />
                  </a>
                )}
              </div>

              {/* Language chips — horizontal row, each chip downloads
                  its language directly (bypasses the slow browser PDF
                  viewer).  Recommended chip (user's UI language) is
                  ringed; unavailable languages stay visible but
                  greyed. */}
              <div className={`flex flex-wrap gap-1.5 ${isRTL ? "justify-end" : ""}`}>
                {orderedLanguages.map((lang) => {
                  const available = availableSet.has(lang.code);
                  const isCurrent = lang.code === language;
                  const href = card.hrefFor(lang.code);
                  const downloadName = href.split("/").pop() || `${card.key}-${lang.code}.pdf`;

                  const chip = (
                    <div
                      className={[
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                        available
                          ? "bg-white/15 hover:bg-white/30 active:scale-[0.96]"
                          : "bg-white/5 opacity-60 cursor-not-allowed",
                        isCurrent && available ? "ring-2 ring-white/70" : "ring-1 ring-white/15",
                      ].join(" ")}
                    >
                      <span className="text-sm leading-none" aria-hidden="true">{lang.flag}</span>
                      <span className="uppercase tracking-wide" dir="ltr">{lang.code}</span>
                      {available ? (
                        <Download size={12} aria-hidden="true" className="opacity-90" />
                      ) : (
                        <span className="text-[8px] uppercase tracking-wider opacity-80">
                          {t.comingSoon}
                        </span>
                      )}
                    </div>
                  );

                  return available ? (
                    <a
                      key={lang.code}
                      href={href}
                      download={downloadName}
                      className="inline-block"
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                      aria-label={`${t.downloadInLanguage} ${title} — ${lang.name}`}
                    >
                      {chip}
                    </a>
                  ) : (
                    <div key={lang.code} aria-disabled="true">{chip}</div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherResourcesSection;
