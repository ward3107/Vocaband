/**
 * Smooth-scroll + brief highlight for a teacher-dashboard section.
 *
 * Both the StartHerePanel launcher and the TeacherHelpAssistant route
 * the teacher to a section by id rather than re-rendering its content,
 * so the existing cards stay the single source of truth. The flash ring
 * is applied via inline style (cleared after the animation) so we don't
 * need a global keyframe and it follows the active theme accent.
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

  // Brief accent ring so the teacher sees *which* block they landed on.
  const prevTransition = el.style.transition;
  const prevShadow = el.style.boxShadow;
  const prevRadius = el.style.borderRadius;
  el.style.transition = "box-shadow 0.3s ease";
  el.style.borderRadius = prevRadius || "24px";
  el.style.boxShadow =
    "0 0 0 3px var(--vb-accent), 0 0 0 9px color-mix(in srgb, var(--vb-accent), transparent 72%)";
  window.setTimeout(() => {
    el.style.boxShadow = prevShadow;
    window.setTimeout(() => {
      el.style.transition = prevTransition;
      el.style.borderRadius = prevRadius;
    }, 320);
  }, 1500);
}
