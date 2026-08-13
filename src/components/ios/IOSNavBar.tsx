import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

/**
 * iOS navigation bar with a collapsing large title.
 *
 * The behaviour being reproduced: the screen opens with a 34pt large title
 * below a bare translucent bar; as the user scrolls, the large title slides
 * away and the same text fades into the bar's centre, and a hairline appears
 * under the bar. Getting this right is most of the "feels native" signal on
 * a scrolling screen.
 *
 * The scroll position is read from the window, so the page must scroll the
 * document rather than an inner container. Views that scroll internally
 * should pass their own `scrollElement`.
 */
export function IOSNavBar({
  title,
  onBack,
  backLabel,
  trailing,
  scrollElement,
}: {
  title: string;
  /** Omit to render a bar with no back affordance (root of a tab). */
  onBack?: () => void;
  /** Text next to the back chevron — iOS shows the previous screen's title. */
  backLabel?: string;
  /** Trailing action(s), e.g. an Edit or Done button. */
  trailing?: ReactNode;
  scrollElement?: HTMLElement | null;
}) {
  const { isRTL, textAlign } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const largeTitleRef = useRef<HTMLHeadingElement>(null);

  // Back chevron points *backwards* in the reading direction, so it flips
  // for Hebrew and Arabic — a left-pointing chevron in an RTL layout reads
  // as "forward" to a native reader.
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  useEffect(() => {
    const target: HTMLElement | Window = scrollElement ?? window;

    const read = () =>
      scrollElement ? scrollElement.scrollTop : window.scrollY;

    // Collapse once the large title has scrolled most of the way out.
    // Threshold is the title's own height so it works at any font scale
    // (the a11y font-size control can make this considerably taller).
    const onScroll = () => {
      const threshold = (largeTitleRef.current?.offsetHeight ?? 41) * 0.8;
      setCollapsed(read() > threshold);
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [scrollElement]);

  return (
    <>
      <header
        className={`ios-material sticky top-0 z-40 ios-safe-top ${
          collapsed ? "ios-hairline" : ""
        }`}
      >
        <div
          className="flex items-center gap-1 px-2"
          style={{ minHeight: "var(--ios-navbar-height)" }}
        >
          <div className="flex min-w-0 flex-1 items-center">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="ios-pressable -ms-1 flex items-center gap-0.5 py-1 pe-2 ps-1"
                style={{
                  color: "var(--vb-accent)",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <BackChevron size={22} strokeWidth={2.5} aria-hidden />
                {backLabel && (
                  <span className="ios-body truncate max-w-[8rem]">
                    {backLabel}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Centre title — cross-fades in as the large title leaves. It is
              aria-hidden because the large title below already carries the
              heading; announcing both would read the screen name twice. */}
          <h1
            aria-hidden
            className="ios-headline flex-1 truncate text-center transition-opacity duration-200"
            style={{
              color: "var(--ios-label)",
              opacity: collapsed ? 1 : 0,
            }}
          >
            {title}
          </h1>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {trailing}
          </div>
        </div>
      </header>

      <h1
        ref={largeTitleRef}
        className={`ios-large-title px-4 pb-2 pt-1 ${textAlign}`}
        style={{ color: "var(--ios-label)" }}
      >
        {title}
      </h1>
    </>
  );
}
