/**
 * iOS primitives, shared by the teacher and student sides.
 *
 * Pair these with the CSS layer in `src/styles/ios.css` — the components
 * carry structure and RTL logic, the stylesheet carries the tokens and the
 * material/hairline/type primitives that plain markup can also reach for.
 *
 * Reach for these before hand-rolling a surface.  Every treatment below
 * exists because the same thing had been written inline a dozen different
 * ways; adding a thirteenth undoes the point.
 */
export { IOSListSection, IOSListRow } from "./IOSList";
export { IOSButton } from "./IOSButton";
export { IOSNavBar } from "./IOSNavBar";
export { IOSCard } from "./IOSCard";
export { IOSBadge } from "./IOSBadge";
export { IOSTextField } from "./IOSTextField";
export { IOSSheet } from "./IOSSheet";
export { IOSEmptyState } from "./IOSEmptyState";
