import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { modalBackStack } from "../../utils/modalBackStack";

/**
 * Sheet — one overlay for the whole app.
 *
 * The codebase currently carries 61 distinct `fixed inset-0` scrim strings:
 * the dim ranges over black/50 to black/80 across three different tints, and
 * the z-index ladder is uncoordinated.  Every one of those is this component.
 *
 * Presentation follows the platform rather than the breakpoint alone: on a
 * phone it is a bottom sheet that slides up from the edge it is anchored to,
 * on a wide screen a centred dialog.  That split is what iOS does, and it is
 * also the reason the sheet is anchored with `items-end sm:items-center`
 * instead of being centred everywhere — a centred dialog on a phone puts the
 * primary action under the user's thumb only by accident.
 *
 * Dismissal is wired to all three affordances a student will actually try:
 * the scrim, the Escape key, and the hardware back button (via the shared
 * modalBackStack, so back closes the sheet instead of leaving the app).
 */
export function IOSSheet({
  open,
  onClose,
  title,
  children,
  footer,
  /** Sits above page chrome by default; raise it to stack over another sheet. */
  zIndex = 50,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  /** Centred title in the sheet's grabber row. Omit for a bare sheet. */
  title?: string;
  children: ReactNode;
  /** Actions pinned under the content, clear of the home indicator. */
  footer?: ReactNode;
  zIndex?: number;
  /** False for a sheet the user must resolve with an explicit action. */
  dismissible?: boolean;
}) {
  // Read onClose through a ref so the back-stack entry keeps a stable
  // identity across renders — push and remove must match by reference.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const entry = () => onCloseRef.current();
    modalBackStack.push(entry);
    return () => modalBackStack.remove(entry);
  }, [open, dismissible]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex,
          }}
          onClick={dismissible ? onClose : undefined}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            // The phone sheet rises from the bottom edge; the desktop dialog
            // is already centred, so it only needs the scale-in. One variant
            // set covers both because the y-offset reads as a subtle lift
            // rather than a slide once the element is centred.
            initial={{ y: "100%", opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            // Only the top corners round on a phone, where the sheet is flush
            // with the bottom edge; the centred desktop dialog rounds fully.
            className="ios-scroll flex w-full max-w-[520px] flex-col overflow-y-auto rounded-t-[var(--ios-radius-sheet)] sm:rounded-[var(--ios-radius-sheet)]"
            style={{
              background: "var(--ios-grouped-bg)",
              boxShadow: "var(--vb-shadow-elevated)",
              maxHeight: "min(90vh, 720px)",
              paddingBottom: "var(--ios-safe-bottom)",
            }}
          >
            <div className="flex flex-col items-center gap-2 px-4 pb-2 pt-2.5">
              {dismissible && (
                <span
                  aria-hidden
                  className="h-[5px] w-9 rounded-full"
                  style={{ background: "var(--ios-fill-secondary)" }}
                />
              )}
              {title && (
                <h2
                  className="ios-headline text-center"
                  style={{ color: "var(--ios-label)" }}
                >
                  {title}
                </h2>
              )}
            </div>

            <div className="flex-1 px-4 pb-4">{children}</div>

            {footer && (
              <div className="flex flex-col gap-2 px-4 pb-4">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
