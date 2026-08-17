import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

/**
 * Inset grouped list — the iOS Settings pattern.
 *
 * Cards float on the grouped background; rows inside are separated by true
 * hairlines that inset to align with the row's text rather than its icon.
 * This is the workhorse of an iOS UI: settings, class lists, assignment
 * lists, student rosters all collapse onto it.
 */

export function IOSListSection({
  header,
  footer,
  children,
}: {
  /** Uppercase tertiary label above the card. Omit for a bare card. */
  header?: string;
  /** Explanatory text below the card — iOS uses this instead of tooltips. */
  footer?: string;
  children: ReactNode;
}) {
  const { textAlign } = useLanguage();

  return (
    <section className="mb-8">
      {header && (
        <h2 className={`ios-section-header px-4 pb-2 ${textAlign}`}>
          {header}
        </h2>
      )}
      <div className="ios-list">{children}</div>
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

type IOSListRowProps = {
  /** Emoji or icon node rendered in the leading medallion. */
  icon?: ReactNode;
  /** Medallion tint. Accepts any CSS color — pass an --ios-* system color. */
  iconColor?: string;
  label: string;
  /** Secondary line under the label. */
  sublabel?: string;
  /** Trailing value text, shown before the chevron. */
  value?: string;
  /** Renders a disclosure chevron and makes the row a button. */
  onClick?: () => void;
  /** Trailing control (switch, badge) — replaces value/chevron. */
  accessory?: ReactNode;
  /** Destructive rows use systemRed for the label. */
  destructive?: boolean;
  /** Last row in a card carries no separator. */
  isLast?: boolean;
};

export function IOSListRow({
  icon,
  iconColor = "var(--ios-blue)",
  label,
  sublabel,
  value,
  onClick,
  accessory,
  destructive = false,
  isLast = false,
}: IOSListRowProps) {
  const { isRTL, textAlign } = useLanguage();

  // The disclosure chevron points in the reading direction — it means
  // "forward", not "right", so it flips in Hebrew and Arabic.
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const content = (
    <>
      {icon && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[15px]"
          style={{ backgroundColor: iconColor, color: "#fff" }}
          aria-hidden
        >
          {icon}
        </span>
      )}

      <span className={`min-w-0 flex-1 ${textAlign}`}>
        <span
          className="ios-body block truncate"
          style={{ color: destructive ? "var(--ios-red)" : "var(--ios-label)" }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="ios-footnote block truncate"
            style={{ color: "var(--ios-label-secondary)" }}
          >
            {sublabel}
          </span>
        )}
      </span>

      {accessory ??
        (onClick && (
          <span className="flex shrink-0 items-center gap-1">
            {value && (
              <span
                className="ios-body"
                style={{ color: "var(--ios-label-secondary)" }}
              >
                {value}
              </span>
            )}
            <Chevron
              size={17}
              strokeWidth={2.5}
              style={{ color: "var(--ios-label-tertiary)" }}
              aria-hidden
            />
          </span>
        ))}

      {!onClick && !accessory && value && (
        <span
          className="ios-body shrink-0"
          style={{ color: "var(--ios-label-secondary)" }}
        >
          {value}
        </span>
      )}
    </>
  );

  const rowClass = [
    "ios-row flex w-full items-center gap-3 px-4 py-2.5",
    !isLast && "ios-hairline ios-hairline-inset",
  ]
    .filter(Boolean)
    .join(" ");

  if (!onClick) {
    return <div className={rowClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={rowClass}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {content}
    </button>
  );
}
