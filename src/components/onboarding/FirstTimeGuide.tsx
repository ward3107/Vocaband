/**
 * FirstTimeGuide — generic 1..N step modal walkthrough.
 *
 * Each major teacher page mounts this once (driven by useFirstTimeGuide)
 * to give brand-new teachers a brief, dismissible tour of what each
 * piece of the page does.  After dismissal the hook stops auto-opening
 * it; the page's `?` trigger button can re-open it on demand.
 *
 * Visual: centered dialog with a dim backdrop, numbered progress dots,
 * short title + body per step, and Next / Got it controls.  Uses the
 * shared theme tokens (var(--vb-*)) so it picks up the teacher's
 * dashboard palette automatically.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherGuidesT } from "../../locales/teacher/guides";

export interface GuideStep {
  title: string;
  body: string;
  /** Optional emoji or short icon character to lead the bubble. */
  icon?: string;
}

interface FirstTimeGuideProps {
  isOpen: boolean;
  steps: GuideStep[];
  onDone: () => void;
  /** Heading at the top — usually the page name. */
  heading: string;
  /** Optional sub-line under the heading. */
  subheading?: string;
}

export default function FirstTimeGuide({
  isOpen,
  steps,
  onDone,
  heading,
  subheading,
}: FirstTimeGuideProps) {
  const { language, dir } = useLanguage();
  const t = teacherGuidesT[language].common;
  const [index, setIndex] = useState(0);

  // Reset to step 0 every time the guide re-opens so a teacher who
  // dismissed mid-flow and re-triggered later starts from the top
  // instead of resuming on the last step they saw.
  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  if (!steps.length) return null;
  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex(i => Math.min(i + 1, steps.length - 1));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={dir}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={heading}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            style={{ backgroundColor: "var(--vb-surface)", borderColor: "var(--vb-border)" }}
            className="relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
          >
            {/* Skip — corner X.  Calls onDone (writes seen + closes). */}
            <button
              type="button"
              onClick={onDone}
              aria-label={t.skip}
              className={`absolute top-3 ${dir === "rtl" ? "left-3" : "right-3"} p-1.5 rounded-full hover:bg-black/5 transition-colors`}
              style={{ color: "var(--vb-text-muted)" }}
            >
              <X size={16} />
            </button>

            {/* Heading */}
            <div className="px-6 pt-6 pb-3">
              <h2
                className="text-xl sm:text-2xl font-black"
                style={{ color: "var(--vb-text-primary)" }}
              >
                {heading}
              </h2>
              {subheading && (
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--vb-text-secondary)" }}
                >
                  {subheading}
                </p>
              )}
            </div>

            {/* Step body — animated swap so going Next feels like
                turning a page instead of a hard text flip. */}
            <div className="px-6 pb-5 min-h-[170px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={safeIndex}
                  initial={{ opacity: 0, x: dir === "rtl" ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir === "rtl" ? 16 : -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex gap-3 items-start"
                >
                  {step.icon && (
                    <div
                      className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: "var(--vb-surface-alt)" }}
                      aria-hidden
                    >
                      {step.icon}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: "var(--vb-text-muted)" }}
                    >
                      {t.progress(safeIndex + 1, steps.length)}
                    </p>
                    <h3
                      className="text-base sm:text-lg font-bold mb-1.5"
                      style={{ color: "var(--vb-text-primary)" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--vb-text-secondary)" }}
                    >
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer — progress dots + primary action.  Skip link is
                a separate text button next to the dots so an impatient
                teacher can bail without searching for the corner X. */}
            <div
              className="px-6 py-4 flex items-center justify-between gap-3 border-t"
              style={{ borderColor: "var(--vb-border)" }}
            >
              <div className="flex items-center gap-1.5" aria-hidden>
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === safeIndex
                        ? "w-6 bg-indigo-500"
                        : i < safeIndex
                        ? "w-3 bg-indigo-300"
                        : "w-3"
                    }`}
                    style={i > safeIndex ? { backgroundColor: "var(--vb-border)" } : undefined}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    type="button"
                    onClick={onDone}
                    className="text-xs sm:text-sm font-semibold hover:underline transition-colors"
                    style={{ color: "var(--vb-text-muted)" }}
                  >
                    {t.skip}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors active:scale-95"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                >
                  {isLast ? t.gotIt : t.next}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
