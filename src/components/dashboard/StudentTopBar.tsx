import { LogOut } from "lucide-react";
import { supabase } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

/**
 * Top bar for the student dashboard.  Logout affordance only — the
 * language switcher was removed: students pick their instruction
 * language once at login (StudentAccountLoginView / Quick Play join)
 * and it stays locked, so mid-flow screens no longer offer a change.
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

  // The language switcher was removed from the dashboard: students pick
  // their instruction language once at login (StudentAccountLoginView /
  // Quick Play join) and it stays locked, so mid-flow screens no longer
  // offer a way to change it. Only the logout affordance remains here.
  return (
    <div className="flex justify-end items-center gap-2">
      <button
        onClick={() => {
          if (onRequestLogout) onRequestLogout();
          else supabase.auth.signOut();
        }}
        type="button"
        style={{ touchAction: 'manipulation' }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white sm:text-sm"
        title={t.signOut}
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">{t.logout}</span>
      </button>
    </div>
  );
}
