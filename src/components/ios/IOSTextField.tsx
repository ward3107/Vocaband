import type { InputHTMLAttributes, ReactNode } from "react";
import { useLanguage } from "../../hooks/useLanguage";

/**
 * Text field on a grouped-card row.
 *
 * iOS does not draw a box around a text field inside a grouped list — the
 * card is the box, and the field is a row in it with the label on the
 * leading edge.  The heavy `border-4` / `border-2` inputs this replaces were
 * the loudest non-native element on the student join screen.
 *
 * Every input attribute is forwarded, because the callers here rely on a
 * long tail of them (`autoCorrect`, `dir="auto"`, `inputMode`, a focus
 * handler that re-centres the field above the Android soft keyboard) and
 * silently dropping any one of those would regress typing behaviour on the
 * phones most students use.
 */
export function IOSTextField({
  label,
  hint,
  trailing,
  className = "",
  ...inputProps
}: {
  /** Leading label. Omit for a bare full-width field. */
  label?: string;
  /** Footnote under the field — validation copy or an explanation. */
  hint?: ReactNode;
  /** Trailing accessory inside the row (a clear button, a unit). */
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const { textAlign } = useLanguage();

  return (
    <div>
      <div
        className="flex items-center gap-3 px-2.5"
        style={{ minHeight: "44px" }}
      >
        {label && (
          <span
            className="ios-body shrink-0 ps-1.5"
            style={{ color: "var(--ios-label)" }}
          >
            {label}
          </span>
        )}
        {/* Rounded so the app's global WCAG focus ring (a 3px outline at a
            3px offset, set !important in index.css) traces a pill around the
            field instead of a hard rectangle butting into the card's edge. */}
        <input
          {...inputProps}
          className={`ios-body min-w-0 flex-1 rounded-[8px] bg-transparent px-1.5 py-2.5 outline-none disabled:opacity-40 ${className}`}
          style={{
            color: "var(--ios-label)",
            // 16px minimum, or iOS Safari zooms the whole page on focus.
            fontSize: "max(1rem, var(--ios-text-body))",
            ...inputProps.style,
          }}
        />
        {trailing}
      </div>
      {hint && (
        <p
          className={`ios-footnote px-4 pb-2.5 ${textAlign}`}
          style={{ color: "var(--ios-label-secondary)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
