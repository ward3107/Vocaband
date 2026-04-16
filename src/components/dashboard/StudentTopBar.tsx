import { LogOut } from "lucide-react";
import { supabase } from "../../core/supabase";

/**
 * Top bar for the student dashboard.  Now just a logout affordance;
 * Shop moved into StudentGreetingCard beside the XP (per user feedback
 * "put the shop beside the XP") so the student's identity card is a
 * single coloured rectangle containing everything they need.
 * Privacy settings link was also removed earlier at the user's request.
 */
export default function StudentTopBar() {
  return (
    <div className="flex justify-end items-center mb-4">
      <button
        onClick={() => supabase.auth.signOut()}
        type="button"
        style={{ touchAction: 'manipulation' }}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-stone-400 hover:text-rose-600 hover:bg-white/60 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        title="Sign out"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
