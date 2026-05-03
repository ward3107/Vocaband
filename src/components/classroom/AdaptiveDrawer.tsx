/**
 * AdaptiveDrawer — the drill-shell for the v2 Classroom.
 *
 * Adaptive = two layouts in one component, chosen by breakpoint:
 *   - Desktop (≥lg, 1024 px): right-side drawer, 40 % width (clamped to
 *     max-w-xl), dim backdrop; the list behind stays visible so the
 *     teacher can jump between rows without losing context.
 *   - Mobile / tablet (<lg): full-screen page with a sticky header and
 *     a back button; the small screen stays uncramped.
 *
 * Animation: slide-in from the right (feels "next page" on mobile,
 * "details panel" on desktop — same motion, different framing).
 *
 * Close triggers: backdrop click (desktop), back button (both), Esc key.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowLeft } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherClassroomT } from "../../locales/teacher/classroom";

interface AdaptiveDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Big title in the header (e.g. student display name). */
  title: string;
  /** Optional small line under the title (e.g. "3 plays · avg 82%"). */
  subtitle?: string;
  /** Optional emoji shown to the left of the title. */
  avatar?: string;
  children: React.ReactNode;
  /** Optional trailing slot for header-level action buttons (e.g. reward). */
  headerRight?: React.ReactNode;
}

export default function AdaptiveDrawer({
  open, onClose, title, subtitle, avatar, children, headerRight,
}: AdaptiveDrawerProps) {
  const { language } = useLanguage();
  const t = teacherClassroomT[language];
  // Esc key closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open so the list behind doesn't scroll under
  // the drill.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Desktop backdrop — clicking it closes. Hidden on mobile
              since the drill occupies the whole viewport there. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="hidden lg:block fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
            className="fixed inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-1/2 lg:max-w-3xl bg-white z-50 shadow-2xl flex flex-col"
          >
            <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 bg-white sticky top-0 z-10">
              <button
                type="button"
                onClick={onClose}
                aria-label={t.closeDetailsAria}
                className="w-10 h-10 rounded-xl hover:bg-stone-100 flex items-center justify-center shrink-0 text-stone-600"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
              >
                {/* Back-arrow feels right on mobile; on desktop it still
                    reads as "close panel". */}
                <ArrowLeft size={20} className="lg:hidden" />
                <X size={20} className="hidden lg:block" />
              </button>

              {avatar && (
                <span className="text-3xl shrink-0" aria-hidden>{avatar}</span>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-lg text-stone-900 truncate">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-stone-500 font-medium truncate">{subtitle}</p>
                )}
              </div>
              {headerRight}
            </header>

            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
