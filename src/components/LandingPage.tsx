import React, { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { lazyWithRetry } from "../utils/lazyWithRetry";
// motion/react was removed from this file (was ~43 kB gz / 133 kB raw).
// The hero used motion.div / motion.h1 / motion.button for entry +
// hover animations; replaced with static layout so the landing page
// hydrates without a separate JS chunk on cold visit. Cards still
// have a subtle `transition-transform` + `hover:scale-105` via
// Tailwind for desktop hover affordance.
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";
import {
  Gamepad2,
  GraduationCap,
  Trophy,
  Flame,
  Gift,
  BookOpen,
  ShieldCheck,
  Globe,
  MapPin,
  LogIn,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import TeacherResourcesSection from "./TeacherResourcesSection";

// The three "request" modals are only opened on click — defer their JS
// to user action so the landing page's first paint doesn't pay for
// code that 99% of visitors never trigger.  Conditional render (not
// just <Suspense>) so the chunks don't even start downloading until
// the user opens the modal the first time.
const SubjectRequestModal = lazyWithRetry(() => import("./SubjectRequestModal"));
const FeatureRequestModal = lazyWithRetry(() => import("./FeatureRequestModal"));
const SchoolInquiryModal = lazyWithRetry(() => import("./SchoolInquiryModal"));

// Below-the-fold sections — lazy so they don't enter the initial
// landing-page chunk.  Each becomes its own JS file, gated by the
// `DeferredSection` IntersectionObserver wrapper below so the eight
// chunks don't all race to download in parallel the moment the hero
// mounts. Without the gate, a post-logout reload sees ~87 background
// requests / ~20 s of network activity even though the user usually
// only ever sees the hero before clicking "Sign in" again.
const LandingStudents = lazyWithRetry(() => import("./landing/LandingStudents"));
const LandingAI = lazyWithRetry(() => import("./landing/LandingAI"));
const LandingTeachers = lazyWithRetry(() => import("./landing/LandingTeachers"));
const LandingJourney = lazyWithRetry(() => import("./landing/LandingJourney"));
const LandingVocas = lazyWithRetry(() => import("./landing/LandingVocas"));
const LandingFinalCTA = lazyWithRetry(() => import("./landing/LandingFinalCTA"));
const LandingFAQ = lazyWithRetry(() => import("./landing/LandingFAQ"));
const LandingFooter = lazyWithRetry(() => import("./landing/LandingFooter"));

// Render `children` only once the placeholder scrolls within `rootMargin`
// of the viewport. Lazy-loaded children won't fetch their JS chunk until
// the placeholder intersects, which staggers the eight below-the-fold
// section chunks based on scroll instead of firing them all in parallel
// on first paint.  `minHeight` reserves space so the page layout doesn't
// jump as sections hydrate — picked per section to roughly match the
// rendered height of each on a phone.
const DeferredSection: React.FC<{
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  // `id` lives on the wrapper (not the lazy child) so nav anchors can
  // resolve before the section mounts. `getElementById("faq")` returns
  // the placeholder, scrollIntoView starts the scroll, the wrapper
  // enters the viewport, the IntersectionObserver fires, and the real
  // section hydrates underneath the same scroll target.
  id?: string;
  className?: string;
}> = ({ children, rootMargin = "600px", minHeight = 400, id, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [show, rootMargin]);

  return (
    <div
      id={id}
      ref={ref}
      className={className}
      style={{ minHeight: show ? undefined : minHeight }}
    >
      {show ? children : null}
    </div>
  );
};

interface LandingPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "resources" | "status") => void;
  onGetStarted: () => void;
  onTeacherLogin: () => void;
  onTryDemo?: () => void;
  isAuthenticated?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onTryDemo, isAuthenticated }) => {
  const { language, dir, isRTL } = useLanguage();
  const t = landingPageT[language];
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);

  // Sticky Teacher Sign-In: a fixed-position twin of the hero button
  // that slides up from the bottom once the user scrolls past the
  // hero.  Lets teachers tap "Sign in" from anywhere on the marketing
  // page on phones AND desktop without scrolling back to the top.
  // Hidden while the hero CTA is in view to avoid a double-button.
  const heroSignInRef = useRef<HTMLButtonElement>(null);
  const [heroSignInVisible, setHeroSignInVisible] = useState(true);
  useEffect(() => {
    const el = heroSignInRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroSignInVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mobile scroll-snap: tag the body while LandingPage is mounted so the
  // matching @media rule in index.css kicks in. Cleaned up on unmount so
  // the rest of the app keeps free scroll behavior.
  useEffect(() => {
    document.body.classList.add("landing-snap");
    return () => {
      document.body.classList.remove("landing-snap");
    };
  }, []);

  // Feature highlights — a compact strip below the sign-in lanes so they
  // no longer compete with the two primary CTAs. Labels via locale.
  const featureItems = [
    { Icon: Gamepad2, name: t.floatingCardModes, color: "from-violet-500/40 to-purple-600/40" },
    { Icon: Trophy, name: t.floatingCardXp, color: "from-blue-500/40 to-cyan-500/40" },
    { Icon: Flame, name: t.floatingCardStreaks, color: "from-amber-500/40 to-orange-500/40" },
    { Icon: Gift, name: t.floatingCardEggs, color: "from-emerald-500/40 to-teal-500/40" },
  ];

  return (
    <div className="min-h-screen signature-gradient overflow-x-hidden">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onTeacherLogin={onTeacherLogin}
        onTryDemo={onTryDemo}
      />

      <main id="main-content">
        {/*
          SEO discovery block — invisible to sighted users, read by
          screen readers and indexed by crawlers. Covers the three
          ways people fail to land on vocaband.com via search:
          - Brand variants / typos: "voca band", "vokaband", etc.
          - Keyboard-layout transliterations: someone typing "vocaband"
            with a HE / AR / RU / FA / EL keyboard layout active hits
            different characters ("הםבשנשמג", "رخؤشلاشىي", "мщсфифтв",
            "رخزشذشدی", "ωοψαβανδ"); we surface those strings here so
            Google can map them back to the canonical brand.
          - Brand transliterated into each script + category keywords
            so non-English speakers searching "learn English" in their
            own language find the app.
          The full keyword bundle also lives in index.html <meta name="keywords">
          and the JSON-LD alternateName array, but having it in the
          rendered DOM strengthens the signal Google actually trusts
          (meta keywords are largely deprecated; on-page content isn't).
        */}
        {/* SR-only SEO block sits BEFORE the hero in DOM order so
            crawlers reach the alt-spelling keywords first. Was an <h2>
            until 2026-05-28; demoted to a strong paragraph because an
            h2 ahead of the page's only <h1> tripped the heading-order
            heuristic (Lighthouse a11y manual check, WCAG 1.3.1).
            SEO impact is negligible — Google indexes the keywords by
            presence in DOM, not by heading level — and the visible
            layout is unchanged because the wrapper is sr-only. */}
        <div className="sr-only" aria-hidden="false">
          <p><strong>Vocaband — also searched as</strong></p>
          <p>
            Vocaband, Voca, Voca Band, VocaBand, voca band, voca-band,
            vocabandapp, vocaband.com, vokaband, vocabend, vocband,
            vocaaband, vocabnd. The English vocabulary app for all ages.
          </p>
          <p>
            Brand spelled in other scripts: ווקאבנד, וקאבנד, ווקה בנד,
            ווקאבאנד, فوكاباند, ڤوكاباند, فوكا باند, вокабанд, вока банд,
            وکابند, βοκαμπαντ, ቮካባንድ, वोकाबैंड, ভোকাব্যান্ড, 보카밴드, ボカバンド,
            โวคาแบนด์, vokabant, wokaband.
          </p>
          <p>
            Keyboard-layout transliterations of vocaband and voca:
            הםבשנשמג, הםבש (Hebrew layout); رخؤشلاشىي, رخؤش (Arabic
            layout); мщсфифтв, мщсف (Russian / Ukrainian layout);
            رخزشذشدی, رخزش (Persian layout); ωοψαβανδ, ωοψα (Greek
            layout); vocqbqnd, vocq (French AZERTY).
          </p>
          <p>
            Learn English vocabulary online for all ages — kids, teens,
            and adults. אנגלית לילדים, משחקי אנגלית, מורה לאנגלית, לימוד
            אנגלית, אוצר מילים אנגלית, אנגלית למבוגרים, שיפור אנגלית,
            אפליקציית אנגלית, תרגול אנגלית, אנגלית אונליין, אנגלית חינם,
            מילון אנגלית, אנגלית מדוברת. تعلم الإنجليزية, مفردات إنجليزية,
            إنجليزي للكبار, إنجليزي للأطفال, تطبيق إنجليزي, ألعاب
            إنجليزية, قاموس انجليزي, محادثة انجليزي. учить английский,
            английский для взрослых, английский для детей, словарный
            запас английский, приложение английский, английский с нуля,
            английский онлайн, бесплатный английский. Aprender inglés,
            vocabulario inglés, inglés gratis. Apprendre l'anglais,
            vocabulaire anglais. Englisch lernen, englisch vokabeln.
            Aprender inglês, imparare inglese, ingilizce öğren.
          </p>
        </div>

        {/* Hero — "pick your lane and sign in." Two equal sign-in lanes:
            staff (teachers + principals; role-routed to the right console
            on login) and students (class code). The live demo is a clear
            secondary action; feature highlights sit below so they don't
            compete with the primary CTAs. Content flows from the top (no
            vertical centering) so the demo + trust strip stay above the
            fold on short laptops without clipping. */}
        <section className="min-h-screen pt-8 pb-12 px-4 md:px-6 relative isolate overflow-hidden">
          {/* Brand-tint backdrop — fully GPU-rendered gradient, no video
              fetch.  The animated mesh below paints the motion that used
              to come from a 2 MB MP4. */}
          <div
            className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900"
            aria-hidden="true"
          />

          {/* Static gradient mesh — three blurred radial blobs placed
              for visual depth. Previously animated via motion.div
              keyframes; static positioning is just as effective behind
              the foreground content and removes the motion runtime. */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            <div className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10 text-center" dir={dir}>
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white/80 mb-4">
              <Sparkles size={13} aria-hidden="true" />
              {t.heroV2.eyebrow}
            </span>

            {/* Headline */}
            <h1 className="relative z-20 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black font-headline italic leading-[1.05] text-balance break-words mb-3">
              <span className="inline-block bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent drop-shadow-2xl">
                {t.heroTitleLine1}
              </span>
              <br />
              <span className="inline-block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                {t.heroTitleLine2}
              </span>
            </h1>

            <p className="text-base md:text-lg text-white/75 max-w-2xl mx-auto mb-6">
              {t.heroSubtitle}
            </p>

            {/* Two sign-in lanes — staff (teachers + principals, role-routed
                on login) and students (class code). Both routes unchanged. */}
            <div className={`grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto ${isRTL ? "text-right" : "text-left"}`}>
              {/* Staff lane */}
              <div className="rounded-[1.75rem] p-8 md:p-10 bg-white/10 backdrop-blur-md border border-white/15 hover:border-violet-300/40 transition-colors flex flex-col">
                <div className="w-[4.5rem] h-[4.5rem] rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/40 mb-5">
                  <GraduationCap size={40} strokeWidth={2.5} className="text-white" aria-hidden="true" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{t.heroV2.staffTitle}</h2>
                <p className="text-sm md:text-base text-white/70 mb-6 flex-1">{t.heroV2.staffDesc}</p>
                <button
                  type="button"
                  onClick={onTeacherLogin}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label={`${t.navSignIn} — ${t.heroV2.staffTitle}`}
                  className="w-full px-6 py-5 rounded-2xl text-xl font-black text-white flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 ring-4 ring-violet-300/30 hover:ring-violet-300/50 shadow-[0_10px_0_0_#581c87,0_22px_44px_rgba(168,85,247,0.45)] active:translate-y-1 active:shadow-[0_4px_0_0_#581c87] transition-all"
                >
                  <LogIn size={24} strokeWidth={2.5} />
                  {t.navSignIn}
                </button>
                <p className="text-center text-sm text-white/55 mt-3">{t.heroV2.staffNote}</p>
              </div>

              {/* Student lane */}
              <div className="rounded-[1.75rem] p-8 md:p-10 bg-white/10 backdrop-blur-md border border-white/15 hover:border-amber-300/40 transition-colors flex flex-col">
                <div className="w-[4.5rem] h-[4.5rem] rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/40 mb-5">
                  <BookOpen size={40} strokeWidth={2.5} className="text-white" aria-hidden="true" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{t.navStudents}</h2>
                <p className="text-sm md:text-base text-white/70 mb-6 flex-1">{t.heroV2.studentDesc}</p>
                <button
                  type="button"
                  onClick={onGetStarted}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label={t.heroV2.studentCta}
                  className="w-full px-6 py-5 rounded-2xl text-xl font-black text-white flex items-center justify-center gap-3 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 ring-4 ring-amber-300/40 hover:ring-amber-300/60 shadow-[0_10px_0_0_#9a3412,0_22px_44px_rgba(251,146,60,0.45)] active:translate-y-1 active:shadow-[0_4px_0_0_#9a3412] transition-all"
                >
                  <LogIn size={24} strokeWidth={2.5} />
                  {t.heroV2.studentCta}
                </button>
                <p className="text-center text-sm text-white/55 mt-3">{t.heroV2.studentNote}</p>
              </div>
            </div>

            {/* Live demo — clear secondary action (only when available). */}
            {onTryDemo && (
              <>
                <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
                  <span className="h-px w-12 bg-white/20" />
                  <span className="text-xs uppercase tracking-widest text-white/40 font-bold">{t.heroV2.or}</span>
                  <span className="h-px w-12 bg-white/20" />
                </div>
                <button
                  type="button"
                  onClick={onTryDemo}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="mt-3 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-base font-bold text-white bg-white/10 border-2 border-white/30 hover:bg-white/15 hover:border-white/50 transition-colors backdrop-blur-sm"
                >
                  <PlayCircle size={22} strokeWidth={2.5} />
                  {t.heroV2.demoCta}
                  <span className="text-xs font-semibold text-white/60">{t.heroV2.demoNote}</span>
                </button>
              </>
            )}

            {/* Hero trust strip — factual claims only. */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2" dir={dir}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-100 border border-amber-400/30 font-bold text-xs backdrop-blur-sm">
                <BookOpen size={12} aria-hidden="true" />
                {t.heroTrustCurriculum}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/15 text-fuchsia-100 border border-fuchsia-400/30 font-bold text-xs backdrop-blur-sm">
                <Globe size={12} aria-hidden="true" />
                {t.heroTrustTrilingual}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/30 font-bold text-xs backdrop-blur-sm">
                <ShieldCheck size={12} aria-hidden="true" />
                {t.heroTrustEu}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 text-sky-100 border border-sky-400/30 font-bold text-xs backdrop-blur-sm">
                <MapPin size={12} aria-hidden="true" />
                {t.heroTrustOrigin}
              </span>
            </div>

            {/* Feature highlights — secondary, below the sign-in lanes. */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {featureItems.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-4 bg-gradient-to-br ${f.color} border border-white/15 backdrop-blur-sm flex flex-col items-center gap-2`}
                >
                  <f.Icon size={26} strokeWidth={2.5} className="text-white" aria-hidden="true" />
                  <span className="text-sm font-bold text-white text-center">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DeferredSection id="students" className="scroll-mt-20" minHeight={800}>
          <Suspense fallback={null}>
            <LandingStudents />
          </Suspense>
        </DeferredSection>

        <DeferredSection id="ai" className="scroll-mt-20" minHeight={600}>
          <Suspense fallback={null}>
            <LandingAI />
          </Suspense>
        </DeferredSection>

        <DeferredSection id="teachers" className="scroll-mt-20" minHeight={700}>
          <Suspense fallback={null}>
            <LandingTeachers />
          </Suspense>
        </DeferredSection>

        <DeferredSection id="curriculum" className="scroll-mt-20" minHeight={600}>
          <Suspense fallback={null}>
            <LandingJourney />
          </Suspense>
        </DeferredSection>

        <DeferredSection id="vocas" className="scroll-mt-20" minHeight={500}>
          <Suspense fallback={null}>
            <LandingVocas onOpenSubjectRequest={() => setIsSubjectModalOpen(true)} />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={500}>
          <Suspense fallback={null}>
            <LandingFinalCTA
              onTryDemo={onTryDemo}
              onTeacherLogin={onTeacherLogin}
              isAuthenticated={isAuthenticated}
            />
          </Suspense>
        </DeferredSection>


        <DeferredSection id="faq" className="scroll-mt-20" minHeight={500}>
          <Suspense fallback={null}>
            <LandingFAQ />
          </Suspense>
        </DeferredSection>

        {/* Teacher resources — card grid linking to the PDFs in /public/docs
            and the existing FAQ page.  Rendered just above the footer so
            teachers evaluating the app can pick up the Teacher Guide /
            Parent Letter / Privacy summary without leaving the landing
            page.  The same section is rendered on /teacher-login under
            the auth card so it is discoverable from both entry points. */}
        <DeferredSection id="guides" className="scroll-mt-20" minHeight={400}>
          <TeacherResourcesSection variant="hero" />
        </DeferredSection>

        <DeferredSection minHeight={400}>
          <Suspense fallback={null}>
            <LandingFooter
              onNavigate={onNavigate}
              onTryDemo={onTryDemo}
              onTeacherLogin={onTeacherLogin}
              onOpenFeatureRequest={() => setIsFeatureModalOpen(true)}
              isAuthenticated={isAuthenticated}
            />
          </Suspense>
        </DeferredSection>
      </main>

      <FloatingButtons />

      {/* Sticky Teacher Sign-In — slides up once the hero CTA scrolls
          out of view so the primary conversion path is always one tap
          away.  Hidden when the hero button is on-screen to avoid
          competing with itself.  Same gradient + iconography as the
          hero so it reads as the same action, just compact.

          PR #708 (perf: strip motion/react from public-landing path)
          removed motion/react from this file's imports. PR #709 then
          added this sticky CTA with <motion.button> + animate={{...}}
          without re-adding the import — production crashed with
          "ReferenceError: motion is not defined", and the page froze
          on "Loading Vocaband..." because LandingPage couldn't
          render. Reimplemented as a plain <button> with a CSS
          transform + opacity transition so the slide effect is
          preserved without re-pulling motion onto the landing chunk. */}
      <button
        type="button"
        onClick={onTeacherLogin}
        aria-label={`${t.navSignIn} — ${t.heroSignInForTeachers}`}
        aria-hidden={heroSignInVisible}
        tabIndex={heroSignInVisible ? -1 : 0}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          pointerEvents: heroSignInVisible ? "none" : "auto",
          opacity: heroSignInVisible ? 0 : 1,
          transform: heroSignInVisible
            ? "translate(-50%, 120px)"
            : "translate(-50%, 0)",
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out",
        }}
        className="fixed left-1/2 z-40 inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl text-base sm:text-lg font-black text-white shadow-[0_10px_0_0_#581c87,0_18px_36px_rgba(168,85,247,0.55)] hover:shadow-[0_12px_0_0_#4c1d95,0_22px_44px_rgba(168,85,247,0.7)] active:translate-y-0.5 active:shadow-[0_4px_0_0_#581c87] bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 ring-4 ring-violet-300/40 hover:ring-violet-300/60"
      >
        <GraduationCap size={20} strokeWidth={2.5} />
        <span className={`flex flex-col leading-tight ${isRTL ? "items-end" : "items-start"}`}>
          <span>{t.navSignIn}</span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100/90">
            {t.heroSignInForTeachers}
          </span>
        </span>
        <LogIn size={18} strokeWidth={2.5} className="opacity-90" />
      </button>

      {isSubjectModalOpen && (
        <Suspense fallback={null}>
          <SubjectRequestModal
            isOpen
            onClose={() => setIsSubjectModalOpen(false)}
          />
        </Suspense>
      )}

      {isFeatureModalOpen && (
        <Suspense fallback={null}>
          <FeatureRequestModal
            isOpen
            onClose={() => setIsFeatureModalOpen(false)}
          />
        </Suspense>
      )}

      {isSchoolModalOpen && (
        <Suspense fallback={null}>
          <SchoolInquiryModal
            isOpen
            onClose={() => setIsSchoolModalOpen(false)}
          />
        </Suspense>
      )}

      {/* The floating accessibility button that used to live here has been
          removed — it duplicated the global one rendered by
          <AccessibilityWidget /> in main.tsx, which is now visible on every
          page. Two triggers at different positions was confusing. */}
    </div>
  );
};

export default LandingPage;
