import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/**
 * iOS button styles.
 *
 * iOS has three button weights and uses them consistently: `filled` for the
 * single primary action, `tinted` for secondary actions, `plain` for
 * everything in navigation bars and toolbars. Keeping to those three is
 * most of what makes a screen read as native rather than as a web page.
 */

type Variant = "brand" | "filled" | "tinted" | "plain" | "destructive";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[15px] rounded-[8px]",
  md: "px-4 py-2.5 text-[17px] rounded-[12px]",
  // `lg` is the full-width sheet CTA — 50px tall is Apple's standard.
  lg: "px-5 py-[13px] text-[17px] rounded-[12px] w-full",
};

function variantStyle(variant: Variant, tint: string): CSSProperties {
  switch (variant) {
    // The one hero CTA per screen. Kept distinct from `filled` so the
    // gradient stays scarce — the moment two of these share a screen it
    // stops reading as "the action" and starts reading as decoration.
    case "brand":
      return {
        background: "var(--vb-gradient-brand)",
        color: "#fff",
        fontWeight: 600,
      };
    case "filled":
      return { backgroundColor: tint, color: "#fff", fontWeight: 600 };
    case "tinted":
      // iOS tinted buttons are the accent at ~15% over the card, with the
      // accent itself as the label — not a grey button with colored text.
      return {
        backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)`,
        color: tint,
        fontWeight: 600,
      };
    case "destructive":
      return { backgroundColor: "var(--ios-red)", color: "#fff", fontWeight: 600 };
    case "plain":
      return { backgroundColor: "transparent", color: tint, fontWeight: 400 };
  }
}

export function IOSButton({
  children,
  onClick,
  variant = "filled",
  size = "md",
  /** Defaults to brand accent so buttons stay Vocaband-colored, not Apple-blue. */
  tint = "var(--vb-accent)",
  disabled = false,
  type = "button",
  className = "",
  ariaLabel,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  tint?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  ariaLabel?: string;
  // Remaining button attributes are forwarded so callers keep their
  // `data-*` test hooks and ARIA wiring when they move off a raw <button>.
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "type" | "disabled" | "className" | "style" | "children"
>) {
  return (
    <button
      {...rest}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`ios-pressable inline-flex items-center justify-center gap-2 disabled:opacity-40 ${SIZES[size]} ${className}`}
      style={{
        ...variantStyle(variant, tint),
        letterSpacing: "var(--ios-tracking-body)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}
