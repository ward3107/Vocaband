import { useState } from "react";

const readFlag = (key: string): boolean => {
  try { return !localStorage.getItem(key); } catch { return true; }
};

/**
 * The three "is this user new" gates that decide whether to show the
 * onboarding overlays:
 *
 * - `showAssignmentWelcome` — first-time-on-create-assignment popup
 * - `showOnboarding` — teacher dashboard onboarding
 * - `showStudentOnboarding` — student dashboard onboarding
 *
 * Each defaults to `true` if the corresponding localStorage flag is
 * missing (or localStorage is blocked).
 */
export function useOnboardingFlags() {
  const [showAssignmentWelcome, setShowAssignmentWelcome] = useState(() => readFlag("vocaband_welcome_seen"));
  const [showOnboarding, setShowOnboarding] = useState(() => readFlag("vocaband_onboarding_done"));
  const [showStudentOnboarding, setShowStudentOnboarding] = useState(() => readFlag("vocaband_student_onboarding_done"));
  return {
    showAssignmentWelcome, setShowAssignmentWelcome,
    showOnboarding, setShowOnboarding,
    showStudentOnboarding, setShowStudentOnboarding,
  };
}
