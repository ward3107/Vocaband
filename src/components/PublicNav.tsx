import React, { useState, useEffect } from "react";
import { Menu, X, LogIn, GraduationCap } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { landingPageT } from "../locales/student/landing-page";
import NavLanguageToggle from "./NavLanguageToggle";
import SchoolInquiryModal from "./SchoolInquiryModal";

// The nav lives across two surfaces:
//
//   - Anchor links (Features, Pricing) — scroll to sections within the
//     SAME landing page via the URL hash.  They only make sense when
//     `currentPage === 'home'`; on /faq, /resources, /privacy etc. the
//     anchors are absent so the link must hop home first.
//
//   - Page links (Resources, FAQ) — go to dedicated SPA routes via the
//     `onNavigate` callback the host already wires up.
type NavPage =
  | "home"
  | "terms"
  | "privacy"
  | "accessibility"
  | "security"
  | "faq"
  | "resources"
  | "status";

interface PublicNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onGetStarted: () => void;
  /** Open the teacher sign-in flow.  Optional — page hosts that don't
   *  surface a teacher login (e.g. mid-game) can omit it and the
   *  "Sign in" button is hidden. */
  onTeacherLogin?: () => void;
}

const PublicNav: React.FC<PublicNavProps> = ({
  currentPage,
  onNavigate,
  onGetStarted,
  onTeacherLogin,
}) => {
  const { language, isRTL } = useLanguage();
  const t = landingPageT[language];
  const [mobileOpen, setMobileOpen] = useState(false);
  // Local modal — every page that mounts PublicNav gets a "For Schools"
  // CTA in the nav.  Owning the modal here avoids threading a callback
  // through every sub-page (Terms, FAQ, Privacy, Status, etc.).  The
  // landing page's pricing-card "Get a quote" CTA still uses its own
  // separate instance — at most one of the two ever renders visibly.
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);

  // Lock body scroll when the mobile drawer is open — otherwise long
  // landings let the user scroll the page underneath, which makes the
  // backdrop feel disconnected.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Anchor jump that works from /faq, /resources, etc. — onNavigate
  // back to home first, then scroll once the section mounts.  If we're
  // already home, just update the hash so anchorScroll fires.
  const goToAnchor = (id: string) => {
    setMobileOpen(false);
    if (currentPage === "home") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Update the URL so the user can bookmark / share the section.
        history.replaceState(null, "", `#${id}`);
      }
      return;
    }
    onNavigate("home");
    // Defer until the home page mounts.  Two RAFs is cheap and
    // overrides the home page's own scrollTo(0,0) restore.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const goToPage = (page: NavPage) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  const openSchoolModal = () => {
    setMobileOpen(false);
    setSchoolModalOpen(true);
  };

  // Reused for desktop + mobile so copy + accessibility live in one place.
  //
  // ORDER MATTERS — anchors are listed in the same order the matching
  // sections appear on the landing page, so a left-to-right scan of the
  // nav reads the same as a top-to-bottom scroll.  Adding a new section
  // means adding it BOTH to the page AND to this array in the right
  // slot; the rule of thumb is "if you can't see it on the page in
  // that order, it doesn't belong in this slot."
  //
  // "For Schools" is an action (opens inquiry modal), not an anchor or
  // page — schools have no public price page per docs/PRICING-MODEL.md.
  // It and the page links sit AFTER the section anchors so the section
  // group reads as a contiguous in-page table-of-contents.
  const navItems: Array<
    | { kind: "anchor"; id: string; label: string }
    | { kind: "page"; page: NavPage; label: string }
    | { kind: "action"; id: string; label: string; onClick: () => void; icon?: React.ReactNode }
  > = [
    { kind: "anchor", id: "students",   label: t.navStudents },
    { kind: "anchor", id: "ai",         label: t.navAi },
    { kind: "anchor", id: "teachers",   label: t.navTeachers },
    { kind: "anchor", id: "curriculum", label: t.navCurriculum },
    { kind: "anchor", id: "vocas",      label: t.navVocas },
    { kind: "anchor", id: "pricing",    label: t.navPricing },
    { kind: "action", id: "schools",    label: t.navForSchools, onClick: openSchoolModal, icon: <GraduationCap size={14} /> },
    { kind: "page",   page: "resources", label: t.navResources },
    { kind: "page",   page: "faq",       label: t.navFaq },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 w-full z-50 bg-stone-100/80 backdrop-blur-md border-b border-stone-200/50"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-6 py-2 gap-4">
          {/* Brand — always tappable, returns home from any sub-page. */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 flex-shrink-0"
            type="button"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg signature-gradient flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white text-base md:text-lg font-black font-headline italic">V</span>
            </div>
            <span className="text-lg md:text-xl font-black text-primary font-headline tracking-tight">
              Vocaband
            </span>
            <span className="hidden lg:inline-block px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
              {t.navCefrBadge}
            </span>
          </button>

          {/* Desktop links — collapse to hamburger below md. */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => {
              if (item.kind === "anchor") {
                return (
                  <button
                    key={item.id}
                    onClick={() => goToAnchor(item.id)}
                    className="px-3 py-2 text-sm font-bold text-stone-700 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              }
              if (item.kind === "action") {
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="px-3 py-2 text-sm font-bold text-stone-700 hover:text-primary transition-colors rounded-lg hover:bg-primary/5 inline-flex items-center gap-1.5"
                    type="button"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              }
              return (
                <button
                  key={item.page}
                  onClick={() => goToPage(item.page)}
                  className={`px-3 py-2 text-sm font-bold transition-colors rounded-lg hover:bg-primary/5 ${
                    currentPage === item.page
                      ? "text-primary"
                      : "text-stone-700 hover:text-primary"
                  }`}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side — desktop CTAs + lang.  On mobile, lang only;
              the hamburger holds the rest.  gap-3 on mobile keeps the
              Globe button and the hamburger far enough apart that a
              fingertip near the boundary can't miss-tap into the wrong
              control (the previous gap-2 + the Globe's hover-scale
              animation made the language popover open when the user
              meant the hamburger). */}
          <div className="flex items-center gap-3 md:gap-2 flex-shrink-0 mr-12 md:mr-0">
            <NavLanguageToggle />
            {onTeacherLogin && (
              <button
                onClick={onTeacherLogin}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-stone-700 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                type="button"
              >
                <LogIn size={15} />
                {t.navSignIn}
              </button>
            )}
            {/* Primary CTA — "Start free" is the freemium top-of-funnel
                for TEACHERS (the buyer audience), so it routes to teacher
                signup, not student signup.  Falls back to onGetStarted
                only if a host page hasn't wired onTeacherLogin yet — that
                way we degrade gracefully instead of rendering a dead
                button on those pages. */}
            <button
              onClick={onTeacherLogin ?? onGetStarted}
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-lg shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
              type="button"
            >
              {t.navStartFree}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={t.navMenuOpen}
              aria-expanded={mobileOpen}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-700 hover:bg-primary/5"
              type="button"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — full-screen overlay so the user can't scroll
          the page underneath.  Slides from the leading edge so RTL
          opens from the right naturally. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel — anchored to the trailing edge so the close button
              sits at the user's reading-edge regardless of language. */}
          <div className={`absolute top-0 bottom-0 ${isRTL ? "left-0" : "right-0"} w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="text-lg font-black text-primary font-headline tracking-tight">
                Vocaband
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={t.navMenuClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100"
                type="button"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {navItems.map(item => {
                if (item.kind === "anchor") {
                  return (
                    <button
                      key={item.id}
                      onClick={() => goToAnchor(item.id)}
                      className="w-full text-start px-3 py-3 text-base font-bold text-stone-800 hover:bg-primary/5 rounded-lg transition-colors"
                      type="button"
                    >
                      {item.label}
                    </button>
                  );
                }
                if (item.kind === "action") {
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className="w-full text-start px-3 py-3 text-base font-bold text-stone-800 hover:bg-primary/5 rounded-lg transition-colors inline-flex items-center gap-2"
                      type="button"
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={item.page}
                    onClick={() => goToPage(item.page)}
                    className={`w-full text-start px-3 py-3 text-base font-bold rounded-lg transition-colors ${
                      currentPage === item.page
                        ? "text-primary bg-primary/5"
                        : "text-stone-800 hover:bg-primary/5"
                    }`}
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-stone-200 p-4 space-y-2">
              {onTeacherLogin && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onTeacherLogin();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  type="button"
                >
                  <LogIn size={16} />
                  {t.navSignIn}
                </button>
              )}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  // Teacher signup is the freemium target, with student
                  // signup only as a degraded fallback — see desktop CTA.
                  (onTeacherLogin ?? onGetStarted)();
                }}
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg shadow-md shadow-violet-500/20"
                type="button"
              >
                {t.navStartFree}
              </button>
            </div>
          </div>
        </div>
      )}

      <SchoolInquiryModal
        isOpen={schoolModalOpen}
        onClose={() => setSchoolModalOpen(false)}
      />
    </>
  );
};

export default PublicNav;
