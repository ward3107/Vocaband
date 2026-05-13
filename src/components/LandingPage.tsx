import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MotionConfig, motion, useScroll, useTransform } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";
import {
  Gamepad2,
  Coins,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Gift,
  Star,
  Crown,
  Target,
  BookOpen,
  BarChart3,
  Clock,
  CheckCircle2,
  Layers,
  FileText,
  ShieldCheck,
  Globe,
  Wand2,
  Camera,
  Radio,
  Compass,
  MapPin,
  LogIn,
} from "lucide-react";
import Tilt from "react-parallax-tilt";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import CssAnimation from "./CssAnimation";
import TeacherResourcesSection from "./TeacherResourcesSection";
import LazyBgVideo from "./LazyBgVideo";

// The three "request" modals are only opened on click — defer their JS
// to user action so the landing page's first paint doesn't pay for
// code that 99% of visitors never trigger.  Conditional render (not
// just <Suspense>) so the chunks don't even start downloading until
// the user opens the modal the first time.
const SubjectRequestModal = lazy(() => import("./SubjectRequestModal"));
const FeatureRequestModal = lazy(() => import("./FeatureRequestModal"));
const SchoolInquiryModal = lazy(() => import("./SchoolInquiryModal"));

// Below-the-fold sections — lazy so they don't enter the initial
// landing-page chunk.  Each becomes its own JS file, fetched while
// the hero is already on screen.
const LandingFinalCTA = lazy(() => import("./landing/LandingFinalCTA"));
const LandingFAQ = lazy(() => import("./landing/LandingFAQ"));
const LandingFooter = lazy(() => import("./landing/LandingFooter"));

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

  // ── "Why Students Love Vocaband" — scroll-driven parallax ──────────
  // Each card drifts at its own rate as the section scrolls past, so
  // they appear to float at different depths.  Cards alternate +/-
  // direction so the grid stays roughly aligned at mid-scroll.
  const studentsSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: studentsProgress } = useScroll({
    target: studentsSectionRef,
    offset: ["start end", "end start"],
  });
  const cardYBig    = useTransform(studentsProgress, [0, 1], [-40, 40]);
  const cardYLive   = useTransform(studentsProgress, [0, 1], [-20, 20]);
  const cardYShop   = useTransform(studentsProgress, [0, 1], [25, -25]);
  const cardYEggs   = useTransform(studentsProgress, [0, 1], [-30, 30]);
  const cardYBoost  = useTransform(studentsProgress, [0, 1], [25, -25]);
  const cardYPet    = useTransform(studentsProgress, [0, 1], [-20, 20]);
  const cardYStreak = useTransform(studentsProgress, [0, 1], [30, -30]);

  // C1: spotlight follow — mouseMove updates CSS vars on the target.
  // The spotlight overlay reads them via var(--mx) / var(--my).
  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--mx", `${x}%`);
    target.style.setProperty("--my", `${y}%`);
  };

  // ── "Your Journey to Mastery" — scroll-driven traveler ─────────────
  // The journey wraps a curved SVG trail.  As the user scrolls past the
  // section, a traveler 🎒 walks down the trail; when it reaches each
  // milestone, that stamp activates (scales up + colors in + glows).
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: journeyProgress } = useScroll({
    target: journeyRef,
    offset: ["start 70%", "end 30%"],
  });
  // Traveler position — top: 0 → 100%, left: zigzags via sine to mirror
  // the SVG curve through Set1 (left) → Set2 (right) → Set3 (left).
  const travelerTop = useTransform(journeyProgress, [0, 1], ["-2%", "100%"]);
  const travelerLeft = useTransform(
    journeyProgress,
    (p) => `${50 - Math.sin(p * Math.PI * 3) * 22}%`,
  );
  // Milestone stamps — scale + glow snap on as traveler arrives.
  const stamp1Scale = useTransform(journeyProgress, [0.10, 0.22], [0.55, 1.1]);
  const stamp1Glow  = useTransform(journeyProgress, [0.10, 0.22], [0, 1]);
  const stamp2Scale = useTransform(journeyProgress, [0.43, 0.55], [0.55, 1.1]);
  const stamp2Glow  = useTransform(journeyProgress, [0.43, 0.55], [0, 1]);
  const stamp3Scale = useTransform(journeyProgress, [0.76, 0.88], [0.55, 1.1]);
  const stamp3Glow  = useTransform(journeyProgress, [0.76, 0.88], [0, 1]);

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
          {/* Hero background video — silent, looping ambience.  Lazy-
              loaded via IntersectionObserver: even though the hero is
              above the fold, deferring the 2 MB fetch by one frame
              gets the HTML/CSS/text-LCP on screen first, then the
              video paints in.  Tint overlay below pushes the footage
              toward Vocaband's brand palette so a generic clip still
              feels on-brand. */}
          <LazyBgVideo
            src="/hero.mp4"
            className="absolute inset-0 w-full h-full object-cover -z-30"
          />
          <div
            className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-950/75 via-violet-900/65 to-fuchsia-900/75"
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

        {/* Features Section - 3D Bento Grid */}
        <section ref={studentsSectionRef} id="students" className="py-8 md:py-20 px-4 md:px-6 relative scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto mb-8 md:mb-12 text-center"
          >
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              {t.studentsSectionH2}
            </h2>
            <p className="text-lg text-white/80 font-bold" dir={dir}>
              {t.studentsSectionSubtitle}
            </p>
          </motion.div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 15 Game Modes - Large Card */}
            <motion.div style={{ y: cardYBig }} className="lg:col-span-2 row-span-2 h-full">
            <Tilt
              tiltMaxAngleX={6}
              tiltMaxAngleY={6}
              perspective={1400}
              scale={1.02}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.1, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                {/* Spotlight follows the cursor */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  {/* Game Lottie Animation */}
                  <div className="flex justify-center mb-4" style={{ transform: 'translateZ(50px)' }}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CssAnimation type="game" size={100} />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black mb-3 md:mb-4 text-center" style={{ transform: 'translateZ(35px)' }}>{t.gameModesTitle}</h3>
                  <p className="text-white/80 font-bold mb-6 max-w-md mx-auto text-center" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.gameModesDesc}
                  </p>
                  {/* Mode Grid */}
                  <div className="grid grid-cols-6 gap-2" style={{ transform: 'translateZ(25px)' }}>
                    {[
                      { emoji: "📖", nameKey: "classic" },
                      { emoji: "🎧", nameKey: "listen" },
                      { emoji: "✏️", nameKey: "spell" },
                      { emoji: "⚡", nameKey: "match" },
                      { emoji: "🧠", nameKey: "memory" },
                      { emoji: "✅", nameKey: "tf" },
                      { emoji: "🃏", nameKey: "flash" },
                      { emoji: "🔤", nameKey: "scramble" },
                      { emoji: "🔄", nameKey: "reverse" },
                      { emoji: "🔡", nameKey: "letters" },
                      { emoji: "🧩", nameKey: "sentence" },
                      { emoji: "📝", nameKey: "fillBlank" },
                      { emoji: "🔗", nameKey: "wordChains" },
                      { emoji: "🗯️", nameKey: "idiom" },
                      { emoji: "⏱️", nameKey: "speedRound" },
                    ].map((mode) => (
                      <motion.div
                        key={mode.nameKey}
                        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                        className="aspect-square rounded-xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-1 cursor-help"
                        title={t.modeNames[mode.nameKey as keyof typeof t.modeNames]}
                      >
                        <span className="text-2xl md:text-3xl">{mode.emoji}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* Live Challenges */}
            <motion.div style={{ y: cardYLive }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.2, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Trophy size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.liveChallengesTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.liveChallengesDesc}
                  </p>
                  {/* Animated podium with rising trophy */}
                  <div className="mt-4 relative h-20 flex items-end justify-center gap-2" style={{ transform: 'translateZ(25px)' }}>
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-8 h-12 bg-white/30 rounded-t-lg"
                    />
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                      className="w-8 h-16 bg-white/40 rounded-t-lg relative"
                    >
                      <motion.span
                        animate={{ y: [0, -3, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl"
                      >
                        🏆
                      </motion.span>
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      className="w-8 h-10 bg-white/30 rounded-t-lg"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* XP Shop */}
            <motion.div style={{ y: cardYShop }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.3, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Coins size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.xpShopTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.xpShopDesc}
                  </p>
                  {/* Floating coins animation */}
                  <div className="mt-4 relative h-16 flex justify-center items-center gap-2" style={{ transform: 'translateZ(25px)' }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -12, 0],
                          rotate: [0, 360, 0],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.3,
                        }}
                        className="text-3xl"
                      >
                        🪙
                      </motion.div>
                    ))}
                    {/* Sparkle effects */}
                    <motion.span
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-0 right-4 text-lg"
                    >
                      ✨
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                      className="absolute bottom-2 left-4 text-lg"
                    >
                      ✨
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* Mystery Eggs */}
            <motion.div style={{ y: cardYEggs }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.4, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(244,114,182,0.3)] hover:shadow-[0_30px_80px_rgba(244,114,182,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Gift size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.mysteryEggsTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.mysteryEggsDesc}
                  </p>
                  {/* Glowing wobbling egg */}
                  <div className="mt-4 relative flex justify-center" style={{ transform: 'translateZ(25px)' }}>
                    <motion.div
                      animate={{
                        rotate: [-8, 8, -8],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-5xl relative"
                    >
                      🥚
                      {/* Glow effect */}
                      <motion.div
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl -z-10"
                      />
                      {/* Floating stars */}
                      <motion.span
                        animate={{ y: [0, -8, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-4 -right-4 text-xl"
                      >
                        ⭐
                      </motion.span>
                      <motion.span
                        animate={{ y: [0, -6, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute -bottom-2 -left-6 text-lg"
                      >
                        ⭐
                      </motion.span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* Boosters */}
            <motion.div style={{ y: cardYBoost }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.5, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-500 text-white shadow-[0_20px_60px_rgba(99,102,241,0.3)] hover:shadow-[0_30px_80px_rgba(99,102,241,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Zap size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.powerBoostersTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.powerBoostersDesc}
                  </p>
                  {/* Electric lightning animation */}
                  <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      className="text-6xl relative"
                    >
                      ⚡
                      {/* Electric arcs */}
                      {[0, 1].map((dir) => (
                        <motion.span
                          key={dir}
                          animate={{
                            x: dir === 0 ? [0, 15, 0] : [0, -15, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut", delay: dir * 0.3 }}
                          className={`absolute top-1/2 ${dir === 0 ? 'left-full' : 'right-full'} w-8 h-0.5 bg-yellow-300`}
                        />
                      ))}
                    </motion.div>
                    {/* Muscle icon */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [-10, 10, -10] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute text-2xl"
                    >
                      💪
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* Pet Companions */}
            <motion.div style={{ y: cardYPet }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.6, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white shadow-[0_20px_60px_rgba(250,204,21,0.3)] hover:shadow-[0_30px_80px_rgba(250,204,21,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Crown size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.petFriendsTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.petFriendsDesc}
                  </p>
                  {/* Bouncing pet with hearts */}
                  <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                    <motion.div
                      animate={{
                        y: [0, -12, 0],
                        rotate: [-5, 5, -5],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-5xl relative"
                    >
                      🐱
                      {/* Floating hearts */}
                      <motion.span
                        animate={{ y: [0, -16, 0], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute -right-4 top-0 text-xl"
                      >
                        ❤️
                      </motion.span>
                      <motion.span
                        animate={{ y: [0, -12, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
                        className="absolute -left-6 top-2 text-lg"
                      >
                        💕
                      </motion.span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>

            {/* Streaks */}
            <motion.div style={{ y: cardYStreak }} className="h-full">
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.03}
              transitionSpeed={1500}
              glareEnable
              glareMaxOpacity={0.25}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="2rem"
              className="h-full"
            >
            <motion.div
              initial={{ opacity: 0, rotateY: -90, scale: 0.7 }}
              whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.9, delay: 0.7, type: "spring", stiffness: 50, damping: 14 }}
              className="relative group h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0], rotateX: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
              className="h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div onMouseMove={handleSpotlight} className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white shadow-[0_20px_60px_rgba(239,68,68,0.3)] hover:shadow-[0_30px_80px_rgba(239,68,68,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
                  style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.3), transparent 60%)' }}
                />
                <div className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner" style={{ transform: 'translateZ(40px)' }}>
                    <Flame size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2" style={{ transform: 'translateZ(30px)' }}>{t.dailyStreaksTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir} style={{ transform: 'translateZ(20px)' }}>
                    {t.dailyStreaksDesc}
                  </p>
                  {/* Animated flame with rising embers */}
                  <div className="mt-4 relative h-16 flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
                      }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-6xl relative"
                    >
                      🔥
                      {/* Rising embers */}
                      {[
                        { delay: 0, x: -8 },
                        { delay: 0.3, x: 0 },
                        { delay: 0.6, x: 8 },
                      ].map((ember, i) => (
                        <motion.span
                          key={i}
                          animate={{
                            y: [0, -20, 0],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: ember.delay,
                          }}
                          className="absolute -bottom-2 text-sm"
                          style={{ left: `${50 + ember.x}px` }}
                        >
                          ✨
                        </motion.span>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
            </Tilt>
            </motion.div>
          </div>
        </section>

        {/* AI Section - Does All the Heavy Lifting */}
        <section id="ai" className="py-8 md:py-20 px-4 md:px-6 relative isolate overflow-hidden bg-gradient-to-b from-transparent via-violet-950/20 to-transparent scroll-mt-20">
          {/* Ambient video background — silent, looping.  Lazy-loaded
              (source attaches when the section nears the viewport) so
              the 3 MB clip doesn't compete with the hero for bandwidth
              on first paint.  The brand tint overlay below pushes the
              footage toward Vocaband's violet palette so a generic
              clip still feels on-brand. */}
          <LazyBgVideo
            src="/ai-bg.mp4"
            className="absolute inset-0 w-full h-full object-cover -z-30"
          />
          <div
            className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-950/80 via-violet-900/70 to-fuchsia-900/80"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -100 : 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-6xl mx-auto mb-8 md:mb-12 text-center"
          >
            {/* AI Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 backdrop-blur-md border border-violet-400/30 mb-6"
            >
              <Sparkles size={18} className="text-violet-300" />
              <span className="text-sm font-black tracking-widest uppercase text-violet-200">AI-POWERED</span>
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              {t.aiSectionH2}
            </h2>
            <p className="text-xl text-white/80 font-bold mb-12" dir={dir}>
              {t.aiSectionSubtitle}
            </p>
          </motion.div>

          {/* AI Feature Cards */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Zero Prep Work */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/35 via-teal-500/35 to-cyan-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300">
                <div className="relative z-10 text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl mb-6"
                  >
                    ⚡
                  </motion.div>
                  <h3 className="text-2xl font-black mb-4">{t.aiZeroWork}</h3>
                  <p className="text-white/90 font-bold text-lg leading-relaxed">
                    {t.aiZeroWorkDesc}
                  </p>
                </div>
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
              </div>
            </motion.div>

            {/* AI-Generated Content */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-violet-500/35 via-purple-500/35 to-fuchsia-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300">
                <div className="relative z-10 text-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="text-6xl mb-6"
                  >
                    🤖
                  </motion.div>
                  <h3 className="text-2xl font-black mb-4">{t.aiAutoSentences}</h3>
                  <p className="text-white/90 font-bold text-lg leading-relaxed">
                    {t.aiAutoSentencesDesc}
                  </p>
                </div>
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
              </div>
            </motion.div>

            {/* Auto-Grading */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-amber-500/35 via-orange-500/35 to-rose-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300">
                <div className="relative z-10 text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl mb-6"
                  >
                    ✅
                  </motion.div>
                  <h3 className="text-2xl font-black mb-4">{t.aiAutoGrading}</h3>
                  <p className="text-white/90 font-bold text-lg leading-relaxed">
                    {t.aiAutoGradingDesc}
                  </p>
                </div>
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem]" />
              </div>
            </motion.div>
          </div>

          {/* Bottom Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-10 md:mt-16"
          >
            <p className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
              {t.aiJustAssign}
            </p>
          </motion.div>
        </section>

        {/* Teacher Features Section - Why Teachers Love Vocaband */}
        <section id="teachers" className="py-8 md:py-20 px-4 md:px-6 relative scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto mb-8 md:mb-12 text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-sky-500/20 backdrop-blur-md border border-sky-400/30 mb-6"
            >
              <GraduationCap size={24} className="text-sky-300" />
              <span className="text-base font-black tracking-widest uppercase text-sky-200">
                {t.teachersSectionPill}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, scale: 0.35 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 35, damping: 18, delay: 0.4 }}
              className="text-4xl md:text-8xl lg:text-9xl font-black font-headline mb-6 md:mb-8 tracking-tight"
            >
              <motion.span
                animate={{
                  scale: [1, 1.015, 1],
                  filter: [
                    "drop-shadow(0 0 50px rgba(56,189,248,0.55))",
                    "drop-shadow(0 0 80px rgba(56,189,248,0.75))",
                    "drop-shadow(0 0 50px rgba(56,189,248,0.55))",
                  ],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-transparent"
              >
                {t.teachersSectionH2}
              </motion.span>
            </motion.h2>
            <p className="text-lg md:text-xl text-white/80 font-bold" dir={dir}>
              {t.teachersSectionSubtitle}
            </p>
          </motion.div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-Grading - Large Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="relative group md:col-span-2"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)] hover:shadow-[0_30px_80px_rgba(14,165,233,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">{t.autoGradingTitle}</h3>
                    <p className="text-white/80 font-bold text-lg max-w-2xl" dir={dir}>
                      {t.autoGradingDesc}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CssAnimation type="analytics" size={80} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Ready-Made Content */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/35 via-teal-500/35 to-cyan-500/35 backdrop-blur-sm border border-white/15 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Layers size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.useYourOwnWordsTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.useYourOwnWordsDesc}
                  </p>
                  {/* Floating word cards */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    {["apple", "liberty", "journey"].map((word, i) => (
                      <motion.div
                        key={word}
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.6, 1, 0.6],
                          rotate: [-5, 5, -5],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.4,
                        }}
                        className="absolute px-3 py-1 rounded-lg bg-white/20 text-xs font-black"
                        style={{ left: `${15 + i * 30}%` }}
                      >
                        {word}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Real-Time Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <BarChart3 size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.spotStrugglingTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.spotStrugglingDesc}
                  </p>
                  {/* Animated chart bars */}
                  <div className="mt-4 relative h-16 flex items-end justify-center gap-2">
                    {[40, 65, 45, 80, 55, 90].map((height, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [height * 0.3, height, height * 0.5] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.1,
                        }}
                        className="w-6 bg-white/30 rounded-t-lg"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Setup */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Clock size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.quickSetupTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.quickSetupDesc}
                  </p>
                  {/* Clock tick animation */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="text-5xl relative"
                    >
                      ⏱️
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 rounded-full"
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Student Engagement */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(244,114,182,0.3)] hover:shadow-[0_30px_80px_rgba(244,114,182,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.studentEngagementTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.studentEngagementDesc}
                  </p>
                  {/* Sparkle burst */}
                  <div className="mt-4 relative h-16 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      className="text-4xl"
                    >
                      🎮
                    </motion.div>
                    {[0, 1, 2, 3].map((i) => (
                      <motion.span
                        key={i}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          rotate: [0, 180],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeOut",
                          delay: i * 0.3,
                        }}
                        className="absolute text-lg"
                        style={{
                          top: `${20 + Math.sin(i * 1.5) * 20}%`,
                          left: `${30 + i * 15}%`,
                        }}
                      >
                        ✨
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Sentence Builder — power tool. */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.55 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Wand2 size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.aiSentenceBuilderTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.aiSentenceBuilderDesc}
                  </p>
                  <div className="mt-4 px-3 py-2 rounded-xl bg-white/10 text-xs font-bold leading-relaxed">
                    "She <span className="bg-white/30 px-1 rounded">sprinted</span> across the field to catch the ball."
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Camera OCR — power tool. */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -12, scale: 1.03 }}
              className="relative group"
            >
              <div className="h-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-[0_20px_60px_rgba(251,146,60,0.3)] hover:shadow-[0_30px_80px_rgba(251,146,60,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                    <Camera size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t.snapWordlistTitle}</h3>
                  <p className="text-white/80 font-bold text-sm" dir={dir}>
                    {t.snapWordlistDesc}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="text-3xl">📷</div>
                    <ArrowRight size={20} className="text-white/60" />
                    <div className="text-3xl">📋</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Play — full-width spanning card.  No-signup live
                multiplayer is a unique feature worth surfacing
                prominently — students join with just a class code on
                the projected QR, no accounts to manage. */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.65 }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="relative group md:col-span-2"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:shadow-[0_30px_80px_rgba(16,185,129,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <Radio size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">{t.quickPlayTitle}</h3>
                    <p className="text-white/85 font-bold text-lg max-w-2xl" dir={dir}>
                      {t.quickPlayDesc}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm font-mono font-black text-2xl tracking-widest">
                      ABC123
                    </div>
                    <div className="text-xs uppercase tracking-widest opacity-80">{t.quickPlayScanPlay}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Hebrew + Arabic translations — full-width finale of the
                teacher grid.  This is THE differentiator vs. Quizlet,
                Kahoot, Wordwall: every word ships with native HE + AR
                translations baked into the data layer (vocabulary.ts
                tuple format).  Surfaced here as its own card because
                it's the single biggest reason a multilingual classroom
                picks Vocaband over global English-only competitors. */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="relative group md:col-span-2"
            >
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white shadow-[0_20px_60px_rgba(139,92,246,0.3)] hover:shadow-[0_30px_80px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner flex-shrink-0">
                    <Globe size={40} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-3">{t.hebrewArabicTitle}</h3>
                    <p className="text-white/85 font-bold text-lg max-w-2xl" dir={dir}>
                      {t.hebrewArabicDesc}
                    </p>
                  </div>
                  {/* Three-language sample chip cluster.  Each shows the
                      same word in EN/HE/AR so the teacher sees the
                      claim is real, not marketing fluff. */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm">
                      apple
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm" dir="rtl">
                      תפוח
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm font-bold text-sm" dir="rtl">
                      تفاحة
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Interactive Journey Section - Scroll Progress Path */}
        <section id="curriculum" className="py-8 md:py-20 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center mb-8 md:mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black font-headline mb-4 text-white drop-shadow-lg">
              {t.curriculumSectionH2}
            </h2>
            <p className="text-lg text-white/80 font-bold" dir={dir}>
              {t.curriculumSectionSubtitle}
            </p>
          </motion.div>

          {/* 3D Progress Cards with Path */}
          <div ref={journeyRef} className="max-w-5xl mx-auto relative">
            {/* Curved SVG trail — winds left-right between Set1, Set2,
                Set3 like a video-game level map.  preserveAspectRatio
                "none" lets the path stretch with the container height. */}
            <svg
              className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="journeyTrail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                d="M 50 0 C 38 11, 28 8, 28 18 C 28 28, 50 22, 50 33 C 50 44, 72 38, 72 50 C 72 62, 50 56, 50 67 C 50 78, 28 72, 28 83 C 28 94, 50 88, 50 100"
                stroke="url(#journeyTrail)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeDasharray="0.5 1.2"
                opacity="0.85"
              />
            </svg>

            {/* Scroll-driven traveler — walks the trail as user scrolls. */}
            <motion.div
              className="hidden md:flex absolute z-30 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white items-center justify-center text-3xl shadow-[0_8px_30px_rgba(251,191,36,0.6)] ring-4 ring-amber-400"
              style={{ top: travelerTop, left: travelerLeft }}
              aria-hidden="true"
            >
              🎒
            </motion.div>

            <div className="space-y-8 md:space-y-16">
              {/* Set 1 */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative flex flex-col md:flex-row items-center gap-6"
              >
                <div className="md:w-1/2 md:text-right md:pr-12">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <Target size={24} />
                    <div>
                      <p className="font-black text-lg">{t.set1Title}</p>
                      <p className="text-white/80 text-sm">{t.set1Desc}</p>
                    </div>
                  </div>
                </div>
                {/* Milestone 1 — colors in when traveler arrives. */}
                <motion.div
                  style={{ scale: stamp1Scale }}
                  className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
                  <motion.div
                    style={{ opacity: stamp1Glow }}
                    className="absolute -inset-3 rounded-full bg-emerald-400/50 blur-2xl"
                  />
                  <motion.div
                    style={{ opacity: stamp1Glow }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 ring-4 ring-white shadow-[0_0_40px_rgba(16,185,129,0.8)]"
                  />
                  <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">1</span>
                </motion.div>
                <div className="md:w-1/2 md:pl-12">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{t.curriculumProgress}</span>
                      <span className="text-emerald-600 font-black">{t.set1Words}</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Set 2 */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative flex flex-col md:flex-row-reverse items-center gap-6"
              >
                <div className="md:w-1/2 md:text-left md:pl-12">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <Target size={24} />
                    <div>
                      <p className="font-black text-lg">{t.set2Title}</p>
                      <p className="text-white/80 text-sm">{t.set2Desc}</p>
                    </div>
                  </div>
                </div>
                {/* Milestone 2 — colors in when traveler arrives. */}
                <motion.div
                  style={{ scale: stamp2Scale }}
                  className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
                  <motion.div
                    style={{ opacity: stamp2Glow }}
                    className="absolute -inset-3 rounded-full bg-blue-400/50 blur-2xl"
                  />
                  <motion.div
                    style={{ opacity: stamp2Glow }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 ring-4 ring-white shadow-[0_0_40px_rgba(59,130,246,0.8)]"
                  />
                  <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">2</span>
                </motion.div>
                <div className="md:w-1/2 md:pr-12 md:text-right">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-600 font-black">{t.set2Words}</span>
                      <span className="font-bold">{t.curriculumProgress}</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "75%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Set 3 */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative flex flex-col md:flex-row items-center gap-6"
              >
                <div className="md:w-1/2 md:text-right md:pr-12">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <Star size={24} />
                    <div>
                      <p className="font-black text-lg">{t.set3Title}</p>
                      <p className="text-white/80 text-sm">{t.set3Desc}</p>
                    </div>
                  </div>
                </div>
                {/* Milestone 3 — colors in when traveler arrives. */}
                <motion.div
                  style={{ scale: stamp3Scale }}
                  className="hidden md:flex relative w-24 h-24 z-20 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-slate-700/80 ring-2 ring-white/20" />
                  <motion.div
                    style={{ opacity: stamp3Glow }}
                    className="absolute -inset-3 rounded-full bg-fuchsia-400/50 blur-2xl"
                  />
                  <motion.div
                    style={{ opacity: stamp3Glow }}
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-4 ring-white shadow-[0_0_40px_rgba(217,70,239,0.8)]"
                  />
                  <span className="relative z-10 text-white text-3xl font-black drop-shadow-lg">3</span>
                </motion.div>
                <div className="md:w-1/2 md:pl-12">
                  <div className="p-4 rounded-2xl bg-surface-container-high">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{t.curriculumProgress}</span>
                      <span className="text-violet-600 font-black">{t.set3Words}</span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "50%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Summit reward — the destination of the journey.  Springs
                  in once the traveler reaches the bottom; floating trophy
                  signals "you've arrived." */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.2 }}
                className="relative flex justify-center pt-4"
              >
                <div className="relative p-6 md:px-14 md:py-10 rounded-[2rem] bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white shadow-[0_20px_60px_rgba(251,191,36,0.55)] text-center overflow-hidden max-w-md">
                  {/* Glass highlight */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
                  {/* Pulsing halo */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-6 rounded-[3rem] bg-amber-300/30 blur-3xl -z-10"
                  />
                  <div className="relative z-10">
                    <motion.div
                      animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-7xl mb-3 drop-shadow-lg"
                    >
                      🏆
                    </motion.div>
                    <h3 className="text-3xl md:text-4xl font-black mb-2 drop-shadow-md">
                      {t.summitTitle}
                    </h3>
                    <p className="text-white/95 font-bold text-base md:text-lg" dir={dir}>
                      {t.summitDesc}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            ROADMAP SECTION — "The Voca Family"
            ───────────────────────────────────────────────────────────
            Sneak-peek at the multi-subject expansion that's parked in
            CLAUDE.md §11.  The engine is mostly subject-agnostic
            (generalize Word → StudyCard) so the same gameplay loop
            can power history dates, science vocab, math definitions,
            etc.  Surfacing this as a "Coming Soon" teaser does two
            things:

              1. Signals to teachers in OTHER subjects that they're
                 next on the list — converts curiosity into early-
                 access signups even before we ship.
              2. Positions Vocaband as a "learning-game platform"
                 not just a vocab app, which raises the ceiling for
                 school-wide licenses.

            All entries explicitly labelled "Coming soon" so we never
            misrepresent shipped features.  No CTA to buy — just a
            "stay in the loop" mailto link for early-access leads.
            ═══════════════════════════════════════════════════════════ */}
        <section id="vocas" className="py-8 md:py-20 px-4 md:px-6 relative overflow-hidden scroll-mt-20">
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

          {/* Mobile shows ONE card per row (was two — too cramped at
              5 subjects x 2-up).  Tablet steps up to 3, desktop fits
              all 5 across.  Padding + emoji size also scale up on
              mobile so each row reads as a real "feature card" not a
              chip. */}
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {[
              { name: t.vocaHistoryName, emoji: "📜", color: "from-amber-500 to-orange-600", tag: t.vocaHistoryTag },
              { name: t.vocaScienceName, emoji: "🔬", color: "from-emerald-500 to-teal-600", tag: t.vocaScienceTag },
              { name: t.vocaHebrewName, emoji: "📖", color: "from-blue-500 to-indigo-600", tag: t.vocaHebrewTag },
              { name: t.vocaArabicName, emoji: "📚", color: "from-rose-500 to-pink-600", tag: t.vocaArabicTag },
              { name: t.vocaMathName, emoji: "🔢", color: "from-violet-500 to-fuchsia-600", tag: t.vocaMathTag },
            ].map((subject, i) => (
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
                          animationDelay: `${i * 0.1}s`
                        }}
                      >
                        {subject.emoji}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-lg font-black mb-1.5 sm:mb-1">{subject.name}</h3>
                    <p className="text-sm sm:text-xs font-bold text-white/80 leading-tight">{subject.tag}</p>
                  </div>
                  {/* "Coming soon" pill so nobody mistakes this for a
                      shipped feature. */}
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
              onClick={() => setIsSubjectModalOpen(true)}
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

        <Suspense fallback={null}>
          <LandingFinalCTA
            onTryDemo={onTryDemo}
            onTeacherLogin={onTeacherLogin}
            isAuthenticated={isAuthenticated}
          />
        </Suspense>


        <Suspense fallback={null}>
          <LandingFAQ />
        </Suspense>

        {/* Teacher resources — card grid linking to the PDFs in /public/docs
            and the existing FAQ page.  Rendered just above the footer so
            teachers evaluating the app can pick up the Teacher Guide /
            Parent Letter / Privacy summary without leaving the landing
            page.  The same section is rendered on /teacher-login under
            the auth card so it is discoverable from both entry points. */}
        <TeacherResourcesSection variant="hero" />

        <Suspense fallback={null}>
          <LandingFooter
            onNavigate={onNavigate}
            onTryDemo={onTryDemo}
            onTeacherLogin={onTeacherLogin}
            onOpenFeatureRequest={() => setIsFeatureModalOpen(true)}
            isAuthenticated={isAuthenticated}
          />
        </Suspense>
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
