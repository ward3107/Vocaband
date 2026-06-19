/**
 * Smooth-scroll + brief highlight for a teacher-dashboard section.
 *
 * The StartHerePanel launcher and its HelpAskBox route the teacher to a
 * section by id rather than re-rendering its content, so the existing
 * cards stay the single source of truth. The flash ring is applied via
 * inline style (cleared after the animation) so we don't need a global
 * keyframe and it follows the active theme accent. The ring pulses twice
 * so the landing is obvious even when the section was already on screen.
 *
 * Section ids are owned by EnglishDashboardLayout.
 */
export const DASHBOARD_SECTION = {
  liveGames: "db-live-games",
  classroomTools: "db-classroom-tools",
  management: "db-management",
  myClasses: "db-my-classes",
} as const;

export type DashboardSectionId =
  (typeof DASHBOARD_SECTION)[keyof typeof DASHBOARD_SECTION];

// Offset so the section lands below the fixed TopAppBar instead of
// tucked underneath it.
const TOP_APP_BAR_OFFSET = 88;

export function scrollToDashboardSection(id: DashboardSectionId): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - TOP_APP_BAR_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

  // Accent ring so the teacher sees *which* block they landed on. It
  // pulses on → off → on → off, which reads as a deliberate "here!"
  // flash even when the section was already visible (so a jump button
  // never feels like nothing happened).
  const prevTransition = el.style.transition;
  const prevShadow = el.style.boxShadow;
  const prevRadius = el.style.borderRadius;
  const ring =
    "0 0 0 3px var(--vb-accent), 0 0 0 10px color-mix(in srgb, var(--vb-accent), transparent 70%)";
  el.style.transition = "box-shadow 0.25s ease";
  el.style.borderRadius = prevRadius || "24px";

  const pulses = [0, 700, 1400];
  pulses.forEach((on) => {
    window.setTimeout(() => { el.style.boxShadow = ring; }, on);
    window.setTimeout(() => { el.style.boxShadow = prevShadow; }, on + 350);
  });
  // Restore the original transition/radius after the last pulse settles.
  window.setTimeout(() => {
    el.style.transition = prevTransition;
    el.style.borderRadius = prevRadius;
  }, 1900);
}
