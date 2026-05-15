import React, { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";
import {
  Gamepad2,
  GraduationCap,
  Sparkles,
  Trophy,
  Flame,
  Gift,
  BookOpen,
  ShieldCheck,
  Globe,
  MapPin,
  LogIn,
} from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import TeacherResourcesSection from "./TeacherResourcesSection";

// The three "request" modals are only opened on click — defer their JS
// to user action so the landing page's first paint doesn't pay for
// code that 99% of visitors never trigger.  Conditional render (not
// just <Suspense>) so the chunks don't even start downloading until
// the user opens the modal the first time.
const SubjectRequestModal = lazy(() => import("./SubjectRequestModal"));
const FeatureRequestModal = lazy(() => import("./FeatureRequestModal"));
const SchoolInquiryModal = lazy(() => import("./SchoolInquiryModal"));

// Below-the-fold sections — lazy so they don't enter the initial
// landing-page chunk.  Each becomes its own JS file, gated by the
// `DeferredSection` IntersectionObserver wrapper below so the eight
// chunks don't all race to download in parallel the moment the hero
// mounts. Without the gate, a post-logout reload sees ~87 background
// requests / ~20 s of network activity even though the user usually
// only ever sees the hero before clicking "Sign in" again.
const LandingStudents = lazy(() => import("./landing/LandingStudents"));
const LandingAI = lazy(() => import("./landing/LandingAI"));
const LandingTeachers = lazy(() => import("./landing/LandingTeachers"));
const LandingJourney = lazy(() => import("./landing/LandingJourney"));
const LandingVocas = lazy(() => import("./landing/LandingVocas"));
const LandingFinalCTA = lazy(() => import("./landing/LandingFinalCTA"));
const LandingFAQ = lazy(() => import("./landing/LandingFAQ"));
const LandingFooter = lazy(() => import("./landing/LandingFooter"));

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
}> = ({ children, rootMargin = "600px", minHeight = 400 }) => {
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
    <div ref={ref} style={{ minHeight: show ? undefined : minHeight }}>
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

  // Mobile scroll-snap: tag the body while LandingPage is mounted so the
  // matching @media rule in index.css kicks in. Cleaned up on unmount so
  // the rest of the app keeps free scroll behavior.
  useEffect(() => {
    document.body.classList.add("landing-snap");
    return () => {
      document.body.classList.remove("landing-snap");
    };
  }, []);

  // Floating 3D cards data for hero — labels translated via locale.
  const floatingCards = [
    { icon: <Gamepad2 size={42} />, name: t.floatingCardModes, color: "from-violet-500/50 to-purple-600/50", delay: 0 },
    { icon: <Trophy size={42} />, name: t.floatingCardXp, color: "from-blue-500/50 to-cyan-500/50", delay: 0.2 },
    { icon: <Flame size={42} />, name: t.floatingCardStreaks, color: "from-amber-500/50 to-orange-500/50", delay: 0.4 },
    { icon: <Gift size={42} />, name: t.floatingCardEggs, color: "from-emerald-500/50 to-teal-500/50", delay: 0.6 },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen signature-gradient overflow-x-hidden">
      <PublicNav
        currentPage="home"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onTeacherLogin={onTeacherLogin}
      />

      <main id="main-content">
        {/* Hero Section - Floating 3D Cards + Gradient Mesh */}
        <section className="min-h-screen pt-20 pb-12 px-4 md:px-6 relative isolate flex items-center justify-center overflow-hidden">
          {/* Brand-tint backdrop — fully GPU-rendered gradient, no video
              fetch.  The animated mesh below paints the motion that used
              to come from a 2 MB MP4. */}
          <div
            className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900"
            aria-hidden="true"
          />

          {/* Animated Gradient Mesh Background */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0],
                x: [0, -100, 0],
                y: [0, 50, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-1/4 -left-32 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                x: [50, -50, 50],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl"
            />
          </div>

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                {/* Main Headline - 3D Text Effect */}
                <motion.h1
                  initial={{ opacity: 0, x: isRTL ? 50 : -50, y: 30 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative z-20 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-headline italic leading-tight break-words mb-6"
                >
                  <span className="inline-block pr-4 pb-2 bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent drop-shadow-2xl">
                    {t.heroTitleLine1}
                  </span>
                  <br />
                  <span className="inline-block pr-4 pb-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                    {t.heroTitleLine2}
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/80 mb-8 max-w-xl"
                  dir={dir}
                >
                  {t.heroSubtitle}
                </motion.p>

                {/* Hero CTAs — dominant Teacher Sign In with a small
                    secondary "Start free" link beneath it.  Same OAuth
                    flow on click (Google account picker handles new vs
                    returning); the smaller affordance just reassures
                    teachers that the free tier really is free.
                    Students don't browse the marketing site — they
                    arrive via a teacher-shared link or `/student`. */}
                <div className="flex flex-col items-center lg:items-start gap-3">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                    whileHover={{ scale: 1.03 }}
                    onClick={onTeacherLogin}
                    style={{ touchAction: 'manipulation' }}
                    type="button"
                    aria-label={`${t.navSignIn} — ${t.heroSignInForTeachers}`}
                    className="group relative w-full sm:w-auto px-10 md:px-14 py-6 md:py-7 rounded-3xl text-2xl md:text-3xl font-black text-white shadow-[0_14px_0_0_#581c87,0_28px_60px_rgba(168,85,247,0.55)] hover:shadow-[0_18px_0_0_#4c1d95,0_32px_70px_rgba(168,85,247,0.7)] active:shadow-[0_4px_0_0_#581c87,0_12px_28px_rgba(168,85,247,0.45)] active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 ring-4 ring-violet-300/40 hover:ring-violet-300/60"
                  >
                    <GraduationCap size={32} strokeWidth={2.5} className="relative z-10" />
                    <div className={`relative z-10 flex flex-col ${isRTL ? "items-end" : "items-start"} leading-tight`}>
                      <span>{t.navSignIn}</span>
                      <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.18em] text-violet-100/90 mt-0.5">
                        {t.heroSignInForTeachers}
                      </span>
                    </div>
                    <LogIn size={26} strokeWidth={2.5} className="relative z-10 opacity-90 group-hover:translate-x-1 transition-transform" />
                  </motion.button>

                  {/* Secondary — small, quiet "Start free" reassurance
                      pill.  Same OAuth target; smaller padding + ghost
                      outline so it sits visually below the dominant
                      Sign In without competing with it. */}
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={onTeacherLogin}
                    style={{ touchAction: 'manipulation' }}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white/90 hover:text-white bg-white/5 hover:bg-white/15 border border-white/25 hover:border-white/40 backdrop-blur-sm transition-colors"
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    <span>{t.navStartFree}</span>
                    <span className="text-white/60 text-xs">·</span>
                    <span className="text-white/70 text-xs font-semibold">{t.pricingFreeFeature1}</span>
                  </motion.button>
                </div>

                {/* Hero trust strip — factual claims only.
                    Curriculum alignment, language coverage, EU
                    hosting, and country of origin are all things we
                    can defend in writing.  Engagement / endorsement
                    stats live elsewhere (or wait for real data).
                    See docs/PRICING-MODEL.md for positioning. */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className={`mt-8 flex flex-wrap items-center gap-2 ${isRTL ? "justify-center lg:justify-end" : "justify-center lg:justify-start"}`}
                  dir={dir}
                >
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
                </motion.div>
              </div>

              {/* Right - Hero Lottie + Floating 3D Cards Grid */}
              <div className="hidden lg:flex flex-col gap-6 relative items-center">
                {/* Try Demo Icon - 3D Gamepad + Book + Text */}
                {onTryDemo && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex items-center gap-8 cursor-pointer"
                    dir={dir}
                    onClick={onTryDemo}
                  >
                    {/* "Play it" text - connected for Arabic/Hebrew, wavy letters for English */}
                    {language === "en" ? (
                      <div className="flex gap-0.5" dir={dir}>
                        {t.heroPlayItWord.split("").map((letter, i) => (
                          <motion.span
                            key={`play-${i}`}
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.1
                            }}
                            className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                            style={{
                              textShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(244, 114, 182, 0.4)'
                            }}
                          >
                            {letter}
                          </motion.span>
                        ))}
                      </div>
                    ) : (
                      <motion.span
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                        style={{
                          textShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(244, 114, 182, 0.4)'
                        }}
                      >
                        {t.heroPlayItWord}
                      </motion.span>
                    )}

                    {/* Animated 3D Icon */}
                    <motion.div
                      animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-24 h-24 flex-shrink-0"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {/* 3D shadow layer */}
                      <motion.div
                        animate={{ y: [0, 10, 0], scale: [1, 0.85, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        className="absolute inset-2 bg-gradient-to-br from-primary/50 to-fuchsia-600/50 rounded-3xl blur-xl"
                      />

                      {/* Main icon container */}
                      <div className="relative w-full h-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 rounded-3xl shadow-2xl shadow-primary/40 flex items-center justify-center overflow-hidden">
                        {/* Shine sweep */}
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        />

                        {/* Gamepad icon */}
                        <Gamepad2 size={42} strokeWidth={2.5} className="relative z-10 text-white" />

                        {/* Book icon overlay - bottom right */}
                        <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg">
                          <BookOpen size={14} strokeWidth={2.5} className="text-primary" />
                        </div>
                      </div>
                    </motion.div>

                    {/* "Learn it" text - connected for Arabic/Hebrew, wavy letters for English */}
                    {language === "en" ? (
                      <div className="flex gap-0.5" dir={dir}>
                        {t.heroLearnItWord.split("").map((letter, i) => (
                          <motion.span
                            key={`learn-${i}`}
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: (i + 4) * 0.1
                            }}
                            className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                            style={{
                              textShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(244, 114, 182, 0.4)'
                            }}
                          >
                            {letter}
                          </motion.span>
                        ))}
                      </div>
                    ) : (
                      <motion.span
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                        style={{
                          textShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(244, 114, 182, 0.4)'
                        }}
                      >
                        {t.heroLearnItWord}
                      </motion.span>
                    )}
                  </motion.div>
                )}

                {/* Cards Grid - Large Rectangular Cards.
                    Mobile: single column, taller aspect, larger icon
                    + text so the hero remains a full visual on phones
                    instead of small thumbnail-sized cards.
                    Desktop: two columns at 4:3. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto relative">
                {floatingCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, rotate: -20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: card.delay,
                      y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: card.delay },
                    }}
                    whileHover={{
                      scale: 1.05,
                      rotateX: 5,
                      rotateY: 5,
                      z: 50,
                    }}
                    className="relative"
                  >
                    {/* Large Rectangular Card.
                        Mobile: 5:4 aspect with bigger padding and icon
                        so the card feels substantial on a phone screen
                        (was 4:3 with tighter sizing — read as small).
                        Tablet+: original 4:3 / p-8 / smaller icon. */}
                    <div className={`p-10 sm:p-6 md:p-8 rounded-[2rem] bg-gradient-to-br ${card.color} shadow-2xl backdrop-blur-sm border border-white/20 aspect-[5/4] sm:aspect-[4/3]`}>
                      <div className="h-full flex flex-col items-center justify-center gap-5 sm:gap-4">
                        <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                          {card.icon}
                        </div>
                        <p className="text-white font-black text-3xl sm:text-2xl text-center leading-tight drop-shadow-lg">{card.name}</p>
                      </div>
                    </div>
                    {/* Floating shadow */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-full blur-xl" />
                  </motion.div>
                ))}

                {/* Center Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 rounded-full blur-3xl -z-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <DeferredSection minHeight={800}>
          <Suspense fallback={null}>
            <LandingStudents />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={600}>
          <Suspense fallback={null}>
            <LandingAI />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={700}>
          <Suspense fallback={null}>
            <LandingTeachers />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={600}>
          <Suspense fallback={null}>
            <LandingJourney />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={500}>
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


        <DeferredSection minHeight={500}>
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
        <DeferredSection minHeight={400}>
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
    </MotionConfig>
  );
};

export default LandingPage;
