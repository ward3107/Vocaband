import type { ReactNode } from "react";

/**
 * Empty / loading / error placeholder.
 *
 * iOS states these centred and quiet: a large glyph, a title, one line of
 * explanation, and at most one action.  The point is that a screen with
 * nothing on it should still look finished — the ad-hoc versions this
 * replaces ranged from a bare spinner to a full-bleed gradient panel, so
 * the same "nothing here yet" moment felt like a different app each time.
 */
export function IOSEmptyState({
  glyph,
  title,
  message,
  action,
  className = "",
}: {
  /** Emoji, icon node, or spinner rendered above the title. */
  glyph?: ReactNode;
  title: string;
  message?: ReactNode;
  /** A single action — usually an IOSButton. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      {glyph && (
        <div className="text-[44px] leading-none" aria-hidden>
          {glyph}
        </div>
      )}
      <h2 className="ios-title2" style={{ color: "var(--ios-label)" }}>
        {title}
      </h2>
      {message && (
        <p
          className="ios-body max-w-[32ch]"
          style={{ color: "var(--ios-label-secondary)" }}
        >
          {message}
        </p>
      )}
      {action && <div className="mt-2 w-full max-w-[280px]">{action}</div>}
    </div>
  );
}
