import React from "react";
import {
  User,
  Mail,
  Lightbulb,
  Download,
  CircleHelp,
  Presentation,
  FileText,
  BookOpen,
  Gamepad2,
  ShieldCheck,
  Lock,
  Globe,
  ExternalLink,
  Accessibility,
  Activity,
  Users,
} from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingSectionsT } from "../../locales/student/landing-sections";
import { teacherResourcesT } from "../../locales/student/teacher-resources";

interface LandingFooterProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "resources" | "status") => void;
  onTryDemo?: () => void;
  onTeacherLogin: () => void;
  onOpenFeatureRequest: () => void;
  isAuthenticated?: boolean;
}

const scrollToFaq = () => {
  const el = document.getElementById("faq");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// motion/react was removed from this footer — the only animation was a
// staggered fade-in on scroll, not worth dragging the ~43 kB runtime
// onto the landing chunk for a section that sits at the very bottom.
// Links keep their `transition-colors` hover affordance via Tailwind.
const LandingFooter: React.FC<LandingFooterProps> = ({
  onNavigate,
  onTryDemo,
  onTeacherLogin,
  onOpenFeatureRequest,
  isAuthenticated,
}) => {
  const { language, dir } = useLanguage();
  const t = landingSectionsT[language];
  const tr = teacherResourcesT[language];

  return (
    <footer className="pt-16 pb-4 md:pt-24 md:pb-6 px-4 md:px-6 relative bg-slate-950 mt-8 md:mt-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-8 md:gap-10 lg:gap-12 pb-10 border-b border-white/10">
          {/* Col 1: Brand + tagline + contact */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white text-2xl font-black font-headline italic">V</span>
              </div>
              <span className="text-white font-black text-xl">Vocaband</span>
            </div>
            <p className="text-white/75 text-sm leading-relaxed mb-5 max-w-xs" dir={dir}>
              {t.footerTagline}
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4">
              {t.footerProduct}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={onTryDemo}
                  type="button"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerTryDemo}
                </button>
              </li>
              {!isAuthenticated && (
                <li>
                  <button
                    onClick={onTeacherLogin}
                    type="button"
                    className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                  >
                    {t.footerTeacherLogin}
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div>
            <h4 className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4">
              {t.footerResources}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/answers/cefr-a1-vocabulary-list.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerCefrVocab}
                </a>
              </li>
              <li>
                <a
                  href="/answers/cefr-a1-vs-a2-vocabulary.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerCefrExplained}
                </a>
              </li>
              <li>
                <a
                  href="/answers/best-english-vocabulary-app-grade-5.html"
                  className="text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  {t.footerBestEsl}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToFaq}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <CircleHelp size={14} aria-hidden="true" />
                  {t.footerFaq}
                </button>
              </li>
              <li>
                <a
                  href="mailto:contact@vocaband.com"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Mail size={14} aria-hidden="true" />
                  {t.footerContact}
                </a>
              </li>
              {/* Private channel for individual teachers — per
                  docs/PRICING-MODEL.md the public face is schools-first;
                  this footer mailto is the casual entry point for solo
                  teachers who want a Pro quote.  The subject line lets
                  sales triage the inbox without a separate form. */}
              <li>
                <a
                  href="mailto:contact@vocaband.com?subject=Individual%20Teacher"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <User size={14} aria-hidden="true" />
                  {t.footerTeacherInquiry}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenFeatureRequest}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Lightbulb size={14} aria-hidden="true" />
                  {t.footerFeatureRequest}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate("resources")}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Download size={14} aria-hidden="true" />
                  {t.footerFreeResources}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Downloads — PDF handouts.  Uses `download` so
              the browser saves directly instead of opening the slow
              PDF.js viewer.  School pitch ships HE/AR; teacher
              handouts ship in the user's UI language. */}
          <div>
            <h4 className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4">
              {t.footerDownloads}
            </h4>
            <ul className="space-y-2.5">
              <li>
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
              </li>
              <li>
                <a
                  href="/Vocaband-Presentation-HE.pdf"
                  download="Vocaband-Presentation-HE.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolPdfHe}
                </a>
              </li>
              <li>
                <a
                  href="/Vocaband-Presentation-AR.pdf"
                  download="Vocaband-Presentation-AR.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolPdfAr}
                </a>
              </li>
              <li>
                <a
                  href="/Vocaband-OnePager-AR.pdf"
                  download="Vocaband-OnePager-AR.pdf"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerSchoolOnePagerAr}
                </a>
              </li>
              <li>
                <a
                  href="/Vocaband-Presentation-AR.pptx"
                  download="Vocaband-Presentation-AR.pptx"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Presentation size={14} aria-hidden="true" />
                  {t.footerSchoolPptxAr}
                </a>
              </li>
              {(language === "he" || language === "ar") && (
                <li>
                  <a
                    href={`/Vocaband-Teacher-OnePager-${language.toUpperCase()}.pdf`}
                    download={`Vocaband-Teacher-OnePager-${language.toUpperCase()}.pdf`}
                    className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                  >
                    <BookOpen size={14} aria-hidden="true" />
                    {tr.teacherGuideTitle}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`/docs/student-guide-${language}.pdf`}
                  download={`student-guide-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Gamepad2 size={14} aria-hidden="true" />
                  {tr.studentGuideTitle}
                </a>
              </li>
              <li>
                <a
                  href={`/docs/parent-letter-${language}.pdf`}
                  download={`parent-letter-${language}.pdf`}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Mail size={14} aria-hidden="true" />
                  {tr.parentLetterTitle}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Legal + Trust */}
          <div>
            <h4 className="text-white/50 text-[12px] font-bold uppercase tracking-[0.12em] mb-4">
              {t.footerLegal}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  {t.footerTerms}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <ShieldCheck size={14} aria-hidden="true" />
                  {t.footerPrivacy}
                </button>
              </li>
              {/* "For Parents" — static HTML pages localized at build time
                  by scripts/generate-parents-html.ts.  Plain <a> (not the
                  onNavigate SPA router) because the parent-facing pages
                  are intentionally framework-free and printable. */}
              <li>
                <a
                  href={
                    language === "he" ? "/parents-he.html"
                    : language === "ar" ? "/parents-ar.html"
                    : language === "ru" ? "/parents-ru.html"
                    : "/parents.html"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Users size={14} aria-hidden="true" />
                  {t.footerForParents}
                </a>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("security")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Lock size={14} aria-hidden="true" />
                  {t.footerSecurity}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("accessibility")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Accessibility size={14} aria-hidden="true" />
                  {t.footerAccessibility}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("status")}
                  type="button"
                  className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-semibold transition-colors"
                >
                  <Activity size={14} aria-hidden="true" />
                  {t.footerStatus}
                </button>
              </li>
            </ul>
          </div>
        </div>

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
