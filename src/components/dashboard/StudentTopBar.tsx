import { LogOut } from "lucide-react";
import { supabase } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";
import StudentLangButton from "../StudentLangButton";

/**
 * Top bar for the student dashboard.  Carries the always-available
 * language switcher + the logout affordance.  Students can land on the
 * "wrong" UI language (an HE/AR reader stuck on English, or vice-versa),
 * so the switcher rides along on every in-app screen — this bar is where
 * it sits on the home hub.
 *
 * `onRequestLogout` — when supplied, the logout button asks App.tsx
 * to show the friendly student soft-landing modal ("See you tomorrow,
 * [name]!") instead of calling supabase.auth.signOut() directly.  Kids
 * 9–14 frequently tap the icon by accident; the hardware back button
 * already routes through this confirmation modal, so the top-bar
 * affordance now matches the back-button protection.
 * Falls back to direct signOut if the prop is absent (older callers
 * or contexts where the confirmation modal isn't mounted).
 */
interface StudentTopBarProps {
  onRequestLogout?: () => void;
}

export default function StudentTopBar({ onRequestLogout }: StudentTopBarProps = {}) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];

  return (
    <div className="flex justify-end items-center gap-2">
      {/* Always-reachable language switcher — the dashboard no longer
          locks the UI language after login. */}
      <StudentLangButton />
      <button
        onClick={() => {
          if (onRequestLogout) onRequestLogout();
          else supabase.auth.signOut();
        }}
        type="button"
        style={{ touchAction: 'manipulation' }}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ios-fill-tertiary)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ios-label-secondary)] transition-colors hover:bg-[var(--ios-fill-secondary)] hover:text-[color:var(--ios-label)] sm:text-sm"
        title={t.signOut}
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">{t.logout}</span>
      </button>
    </div>
  );
}
