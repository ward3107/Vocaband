import type { ReactNode } from "react";
import { useLanguage } from "../../hooks/useLanguage";

/**
 * Grouped card — the free-form sibling of IOSListSection.
 *
 * IOSListSection owns the Settings-style pattern where every child is a row
 * separated by hairlines.  Plenty of screens need the same floating card but
 * with arbitrary content inside (a form, a hero, a stat block), and before
 * this component each of those hand-rolled its own radius/shadow/border trio
 * — which is how the codebase ended up with eight different card treatments.
 *
 * Elevation is carried by the card's background against the grouped
 * backdrop, not by a drop shadow.  That is the single biggest difference
 * between an iOS surface and the Material-style cards this replaces, so the
 * `elevated` variant stays reserved for surfaces that genuinely float above
 * the page (sheets, popovers) rather than being the default.
 */
export function IOSCard({
  children,
  header,
  footer,
  padded = true,
  elevated = false,
  className = "",
}: {
  children: ReactNode;
  /** Uppercase tertiary label above the card, matching IOSListSection. */
  header?: string;
  /** Explanatory text below the card — iOS uses this instead of tooltips. */
  footer?: string;
  /** Set false when the child manages its own padding (e.g. a full-bleed image). */
  padded?: boolean;
  /** Adds a soft shadow for surfaces that float above the page. */
  elevated?: boolean;
  className?: string;
}) {
  const { textAlign } = useLanguage();

  return (
    <section className={className}>
      {header && (
        <h2 className={`ios-section-header px-4 pb-2 ${textAlign}`}>{header}</h2>
      )}
      <div
        className={padded ? "p-4" : ""}
        style={{
          background: "var(--ios-grouped-card)",
          borderRadius: "var(--ios-radius-card)",
          boxShadow: elevated ? "var(--vb-shadow-elevated)" : "var(--vb-shadow)",
        }}
      >
        {children}
      </div>
      {footer && (
        <p
          className={`ios-footnote px-4 pt-2 ${textAlign}`}
          style={{ color: "var(--ios-label-secondary)" }}
        >
          {footer}
        </p>
      )}
    </section>
  );
}
