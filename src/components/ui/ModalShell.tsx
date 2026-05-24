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
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export type ModalVariant = "brand" | "success" | "danger" | "calm";

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
}

const HEADER_GRADIENT: Record<ModalVariant, string> = {
  brand:   "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
  success: "linear-gradient(110deg, #2E8E60 0%, #3FA689 50%, #5EC9A6 100%)",
  danger:  "linear-gradient(110deg, #C2554F 0%, #D87874 50%, #F08D87 100%)",
  calm:    "linear-gradient(110deg, #4A3B7A 0%, #6E5BAE 100%)",
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
}: ModalShellProps) {
  // Esc-to-close — matches the legacy modal conventions across the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
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
            dir={dir}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full overflow-hidden rounded-[28px] bg-white flex flex-col ${
              wide ? "max-w-[560px]" : "max-w-[480px]"
            }`}
            style={{
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.4), 0 12px 26px -10px rgba(60,40,120,0.35)",
            }}
          >
            {/* Header */}
            <div
              className="relative overflow-hidden flex items-center gap-3.5 px-5 sm:px-6 py-[18px] sm:py-[22px] text-white"
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
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {icon}
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="text-[16px] sm:text-[18px] font-extrabold leading-[1.2] tracking-[-0.01em] truncate">
                  {title}
                </div>
                {subtitle && (
                  <div className="mt-0.5 text-[12px] opacity-85 truncate">{subtitle}</div>
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
                className="relative z-10 grid h-8 w-8 place-items-center rounded-[10px] text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className="px-5 sm:px-6 py-5 sm:py-[22px] text-[14px] leading-[1.55] overflow-y-auto"
              style={{ color: "#4A3B7A", maxHeight: "60vh" }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className="flex items-center gap-2 px-5 sm:px-6 py-[14px] border-t"
                style={{ borderColor: "rgba(99,102,241,0.10)", background: "#FAF7FF" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
export function ModalQuietButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
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
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold text-[#8B5CF6] hover:text-[#6D28D9] transition-colors ${className}`}
    />
  );
}

export function ModalPrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        background: "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
        boxShadow: "0 12px 26px -10px rgba(139,92,246,0.55)",
        ...style,
      }}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function ModalDangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent" as never,
        background: "linear-gradient(110deg, #D24A41, #E07A75)",
        boxShadow: "0 12px 26px -10px rgba(216,120,116,0.55)",
        ...style,
      }}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
