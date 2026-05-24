import { useEffect, useState } from "react";

// Matches Tailwind's `sm` breakpoint so JS-driven mobile layouts flip
// at the same width as the CSS `sm:` utilities. 639.98px (rather than
// 639) closes the fractional-width gap on zoomed/HiDPI viewports.
const MOBILE_MAX_WIDTH = 639.98;

/**
 * True while the viewport is narrower than the `sm` breakpoint (640px).
 *
 * Several v2 dashboard surfaces (roster, classroom Today, worksheet
 * rows) ship a dedicated compact layout behind a `mobile` prop; this
 * hook is how a parent feeds them the live viewport state instead of
 * leaving that prop stuck at its `false` default.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
