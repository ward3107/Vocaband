import React from "react";
import { motion } from "motion/react";
import {
  User,
  Mail,
  Lightbulb,
  Download,
  CircleHelp,
  Presentation,
  FileText,
  BookOpen,
  Zap,
  Gamepad2,
  ShieldCheck,
  Lock,
  Globe,
  ExternalLink,
  Accessibility,
  Activity,
} from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";
import { teacherResourcesT } from "../../locales/student/teacher-resources";

interface LandingFooterProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "resources" | "status") => void;
  onTryDemo?: () => void;
  onTeacherLogin: () => void;
  onOpenFeatureRequest: () => void;
  isAuthenticated?: boolean;
}

const footerItemVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, delay: i * 0.025, ease: "easeOut" as const },
  }),
};

const scrollToFaq = () => {
  const el = document.getElementById("faq");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const LandingFooter: React.FC<LandingFooterProps> = ({
  onNavigate,
  onTryDemo,
  onTeacherLogin,
  onOpenFeatureRequest,
  isAuthenticated,
}) => {
  const { language, dir } = useLanguage();
  const t = landingPageT[language];
  const tr = teacherResourcesT[language];

  return (
    <footer className="pt-16 pb-4 md:pt-24 md:pb-6 px-4 md:px-6 relative bg-slate-950 mt-8 md:mt-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-10 lg:gap-12 pb-10 border-b border-white/10"
        >
          {/* Col 1: Brand + tagline + contact */}
          <div className="col-span-2 md:col-span-1">
            <motion.div
              variants={footerItemVariant}
              custom={0}
              className="flex items-center gap-3 mb-3"
            >
              <div className="w-11 h-11 rounded-xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white text-2xl font-black font-headline italic">V</span>
              </div>
              <span className="text-white font-black text-xl">Vocaband</span>
            </motion.div>
            <motion.p
              variants={footerItemVariant}
              custom={1}
              className="text-white/75 text-sm leading-relaxed mb-5 max-w-xs"
              dir={dir}
            >
              {t.footerTagline}
            </motion.p>
          </div>

          {/* Col 2: Product */}
          <div>
            <motion.h4
              variants={footerItemVariant}
              custom={2}
              className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4"
            >
              {t.footerProduct}
            </motion.h4>
            <ul className="space-y-2.5">
              <motion.li variants={footerItemVariant} custom={3}>
                <button
                  onClick={onTryDemo}
                  type="button"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerTryDemo}
                </button>
              </motion.li>
              {!isAuthenticated && (
                <motion.li variants={footerItemVariant} custom={4}>
                  <button
                    onClick={onTeacherLogin}
                    type="button"
                    className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                  >
                    {t.footerTeacherLogin}
                  </button>
                </motion.li>
              )}
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div>
            <motion.h4
              variants={footerItemVariant}
              custom={5}
              className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4"
            >
              {t.footerResources}
            </motion.h4>
            <ul className="space-y-2.5">
              <motion.li variants={footerItemVariant} custom={6}>
                <a
                  href="/answers/cefr-a1-vocabulary-list.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerCefrVocab}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={7}>
                <a
                  href="/answers/cefr-a1-vs-a2-vocabulary.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerCefrExplained}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={8}>
                <a
                  href="/answers/best-english-vocabulary-app-grade-5.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerBestEsl}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={9}>
                <button
                  type="button"
                  onClick={scrollToFaq}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <CircleHelp size={14} aria-hidden="true" />
                  {t.footerFaq}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={10}>
                <a
                  href="mailto:contact@vocaband.com"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Mail size={14} aria-hidden="true" />
                  {t.footerContact}
                </a>
              </motion.li>
              {/* Private channel for individual teachers — per
                  docs/PRICING-MODEL.md the public face is schools-first;
                  this footer mailto is the casual entry point for solo
                  teachers who want a Pro quote.  The subject line lets
                  sales triage the inbox without a separate form. */}
              <motion.li variants={footerItemVariant} custom={11}>
                <a
                  href="mailto:contact@vocaband.com?subject=Individual%20Teacher"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <User size={14} aria-hidden="true" />
                  {t.footerTeacherInquiry}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={12}>
                <button
                  type="button"
                  onClick={onOpenFeatureRequest}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Lightbulb size={14} aria-hidden="true" />
                  {t.footerFeatureRequest}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={13}>
                <button
                  type="button"
                  onClick={() => onNavigate("resources")}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Download size={14} aria-hidden="true" />
                  {t.footerFreeResources}
                </button>
              </motion.li>
            </ul>
          </div>

          {/* Col 4: Downloads — PDF handouts.  Uses `download` so
              the browser saves directly instead of opening the slow
              PDF.js viewer.  School pitch ships HE/AR; teacher
              handouts ship in the user's UI language. */}
          <div>
            <motion.h4
              variants={footerItemVariant}
              custom={14}
              className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4"
            >
              {t.footerDownloads}
            </motion.h4>
            <ul className="space-y-2.5">
              <motion.li variants={footerItemVariant} custom={15}>
                <a
                  href={
                    language === "he"
                      ? "https://www.canva.com/d/SfnGGC-8GJg19xN"
                      : language === "ar"
                      ? "https://www.canva.com/d/v6rOhUQiFahEsBr"
                      : "https://www.canva.com/d/O_Z26Jkg32JPRlt"
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Presentation size={14} aria-hidden="true" />
                  {t.footerSchoolDeck}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={16}>
                <a
                  href="/Vocaband-Presentation-HE.pdf"
                  download="Vocaband-Presentation-HE.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolPdfHe}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={17}>
                <a
                  href="/Vocaband-Presentation-AR.pdf"
                  download="Vocaband-Presentation-AR.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolPdfAr}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={17.5}>
                <a
                  href="/Vocaband-OnePager-AR.pdf"
                  download="Vocaband-OnePager-AR.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolOnePagerAr}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={17.7}>
                <a
                  href="/Vocaband-Presentation-AR.pptx"
                  download="Vocaband-Presentation-AR.pptx"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Presentation size={14} aria-hidden="true" />
                  {t.footerSchoolPptxAr}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={18}>
                <a
                  href={`/docs/teacher-guide-${language}.pdf`}
                  download={`teacher-guide-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <BookOpen size={14} aria-hidden="true" />
                  {tr.teacherGuideTitle}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={19}>
                <a
                  href={`/docs/quick-start-${language}.pdf`}
                  download={`quick-start-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Zap size={14} aria-hidden="true" />
                  {tr.quickStartTitle}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={20}>
                <a
                  href={`/docs/student-guide-${language}.pdf`}
                  download={`student-guide-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Gamepad2 size={14} aria-hidden="true" />
                  {tr.studentGuideTitle}
                </a>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={21}>
                <a
                  href={`/docs/parent-letter-${language}.pdf`}
                  download={`parent-letter-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Mail size={14} aria-hidden="true" />
                  {tr.parentLetterTitle}
                </a>
              </motion.li>
            </ul>
          </div>

          {/* Col 5: Legal + Trust */}
          <div>
            <motion.h4
              variants={footerItemVariant}
              custom={15}
              className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4"
            >
              {t.footerLegal}
            </motion.h4>
            <ul className="space-y-2.5">
              <motion.li variants={footerItemVariant} custom={16}>
                <button
                  onClick={() => onNavigate("terms")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerTerms}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={17}>
                <button
                  onClick={() => onNavigate("privacy")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <ShieldCheck size={14} aria-hidden="true" />
                  {t.footerPrivacy}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={18}>
                <button
                  onClick={() => onNavigate("security")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Lock size={14} aria-hidden="true" />
                  {t.footerSecurity}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={19}>
                <button
                  onClick={() => onNavigate("accessibility")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Accessibility size={14} aria-hidden="true" />
                  {t.footerAccessibility}
                </button>
              </motion.li>
              <motion.li variants={footerItemVariant} custom={20}>
                <button
                  onClick={() => onNavigate("status")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Activity size={14} aria-hidden="true" />
                  {t.footerStatus}
                </button>
              </motion.li>
            </ul>
          </div>
        </motion.div>

        {/* ── Bottom bar: trust strip + copyright ───────────── */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-white/70 text-xs font-medium order-2 md:order-1" dir={dir}>
            {t.footerCopyright(new Date().getFullYear())}
          </p>

          {/* Trust strip — three small badges showing the things
              we CAN factually claim (SSL Labs grade, TLS 1.3,
              EU hosting).  The SSL Labs badge deep-links to a
              live report so visitors can verify it.  See
              docs/SECURITY-OVERVIEW.md for what we are/are NOT
              claiming. */}
          <div className="flex flex-wrap items-center justify-center gap-2 order-1 md:order-2">
            <a
              href="https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 font-bold text-[11px] transition-colors"
            >
              <ShieldCheck size={11} />
              <span>SSL Labs A+</span>
              <ExternalLink size={9} className="opacity-60" />
            </a>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-200 border border-blue-400/30 font-bold text-[11px]">
              <Lock size={11} />
              TLS 1.3
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/30 font-bold text-[11px]">
              <Globe size={11} />
              EU-hosted
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
