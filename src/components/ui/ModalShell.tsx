import { BackLayerContext } from "../../hooks/BackLayerContext";
/**
 * ModalShell — the shared modal chrome from Modals v1.
 *
 * Locked structure:
 *   [gradient header — frosted emoji icon, title + sub, close button]
 *   [white body — scrollable when content overflows]
 *   [tinted footer — quiet button on start, primary on end]
 *
 * Variants change ONLY the header gradient (never the structure):
 *   brand   — indigo→violet→fuchsia (default, most modals)
 *   success — green (positive actions: share, save, create)
 *   danger  — coral (destructive: delete, remove, kick)
 *   calm    — deep violet (legal copy, low-key updates)
 *
 * The caller owns open/close state.  `footer` is optional — when
 * omitted (e.g. for view-only modals) the foot bar is hidden.
 */
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useBackLayer } from "../../hooks/useBackLayer";
export type ModalVariant = "brand" | "success" | "danger" | "calm" | "paper";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  /** Emoji or small icon node rendered inside the frosted header tile. */
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Modal body — caller owns the inner layout / form fields. */
  children: ReactNode;
  /** Footer actions — usually `<button class="quiet">…</button><Spacer/><button class="primary">…</button>`.
   *  Omit to hide the footer entirely (view-only modals). */
  footer?: ReactNode;
  /** Wider variant (560px) for content-heavy modals.  Default 480px. */
  wide?: boolean;
  /** Dir attribute pass-through so RTL flips at the modal root. */
  dir?: "ltr" | "rtl";
  /** z-index of the scrim — defaults to 50 so it sits above page
   *  chrome.  Bump above kebab-portal modals (z-[60]) when stacking
   *  one modal over another. */
  zIndex?: number;
  /** Accessibility label for the close button.  Defaults to "Close". */
  closeAriaLabel?: string;
  /** Override the body's max-height.  Default "60vh" keeps long
   *  modals scrollable; pass a calc()/larger value when the modal
   *  must fit on one screen without internal scroll. */
  bodyMaxHeight?: string;
  /** Override the body wrapper className.  Useful when the default
   *  px-5 sm:px-6 py-5 sm:py-[22px] padding eats too much vertical
   *  room for a one-screen modal.  When provided, the caller is
   *  responsible for the full className (text color/size, padding,
   *  overflow). */
  bodyClassName?: string;
}

const HEADER_GRADIENT: Record<ModalVariant, string> = {
  brand:   "var(--vb-gradient-brand)",
  success: "linear-gradient(110deg, #065f46, #047857)",
  danger:  "linear-gradient(110deg, #9f1239, #be123c)",
  calm:    "linear-gradient(110deg, #4A3B7A 0%, #6E5BAE 100%)",
  paper:   "#f4f7e9",
};

export default function ModalShell({
  open,
  onClose,
  variant = "brand",
  icon,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  dir,
  zIndex = 50,
  closeAriaLabel = "Close",
  bodyMaxHeight = "60vh",
  bodyClassName,
}: ModalShellProps) {
  const backPriority = useBackLayer(onClose, { enabled: open, priority: zIndex });

  // Focus management — move focus into the dialog on open and restore it to
  // the element that opened the modal on close, so keyboard/screen-reader
  // users aren't stranded on the page behind the modal.
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panel).focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Keep Tab focus inside the dialog (aria-modal alone doesn't trap focus).
  const trapFocus = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) { e.preventDefault(); last.focus(); }
    } else if (active === last || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <BackLayerContext.Provider value={backPriority}>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{
            background: "rgba(15,5,40,0.55)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex,
          }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onKeyDown={trapFocus}
            dir={dir}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-[28px] bg-white flex flex-col outline-none ${
              wide ? "max-w-[560px] md:max-w-[680px]" : "max-w-[480px] md:max-w-[580px]"
            }`}
            style={{
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.4), 0 12px 26px -10px rgba(60,40,120,0.35)",
            }}
          >
            {/* Header */}
            <div
              className={`relative shrink-0 overflow-hidden flex items-center gap-3.5 px-5 sm:px-6 py-[18px] sm:py-[22px] ${variant === 'paper' ? 'border-b border-[#e1e5d6] text-[#1d2940]' : 'text-white'}`}
              style={{ background: HEADER_GRADIENT[variant] }}
            >
              {/* Decorative top-end highlight blob (per mockup) */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-[40%] -end-[10%] w-[60%] h-[140%]"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)",
                }}
              />
              <div
                className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-[20px]"
                style={{
                  background: variant === 'paper' ? '#d8f36a' : "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {icon}
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="text-lg sm:text-xl font-extrabold leading-snug tracking-tight">
                  {title}
                </div>
                {subtitle && (
                  <div className="mt-1 text-sm leading-relaxed opacity-90">{subtitle}</div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeAriaLabel}
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent" as never,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
                className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-[10px] ${variant === 'paper' ? 'text-[#1d2940]' : 'text-white'}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className={
                bodyClassName ??
                "min-h-0 px-5 sm:px-6 py-5 sm:py-[22px] text-[14px] leading-[1.55] overflow-y-auto"
              }
              style={{ color: "var(--vb-text-secondary)", maxHeight: bodyMaxHeight }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className="flex shrink-0 items-center gap-2 px-5 sm:px-6 py-[14px] border-t"
                style={{ borderColor: "var(--vb-border)", background: "var(--vb-surface-alt)" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </BackLayerContext.Provider>
  );
}

/** Small spacer for use inside `footer` so the primary action sits at the trailing edge. */
export function ModalFootSpacer() {
  return <div className="flex-1" aria-hidden />;
}

/**
 * Buttons styled to match the modal foot — use these instead of
 * hand-rolling pills so every modal's actions look the same.
 */
export function ModalQuietButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        ...style,
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold text-[var(--vb-accent)] hover:opacity-80 transition-colors ${className}`}
    />
  );
}

export function ModalPrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        background: "var(--vb-gradient-brand)",
        boxShadow: "0 12px 26px -10px rgba(139,92,246,0.55)",
        ...style,
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function ModalDangerButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        background: "var(--vb-danger)",
        boxShadow: "0 12px 26px -10px rgba(216,120,116,0.55)",
        ...style,
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
