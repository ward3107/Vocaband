import { ShoppingBag, LogOut } from "lucide-react";
import { supabase } from "../../core/supabase";

interface StudentTopBarProps {
  onShopClick: () => void;
}

/**
 * Top bar for the student dashboard. Shop button is the visual hero of the
 * row — a gradient pill with a subtle wobble and a soft "glow" halo so
 * students notice it without the jarring pulse animation used previously.
 * Logout is a de-emphasised icon-first tertiary button on the right.
 * The Privacy settings link that used to sit top-left was removed at the
 * user's request — privacy settings are still reachable from the profile
 * flow, they just don't need a permanent dashboard slot.
 */
export default function StudentTopBar({ onShopClick }: StudentTopBarProps) {
  return (
    <div className="flex justify-end items-center mb-4 gap-2">
      {/* Shop — the hero CTA of the top bar */}
      <div className="relative mr-auto sm:mr-0">
        {/* Soft ambient glow behind the button */}
        <div aria-hidden className="pointer-events-none absolute -inset-1.5 bg-gradient-to-r from-fuchsia-400/30 via-pink-400/30 to-amber-400/30 blur-xl rounded-full" />
        <button
          onClick={onShopClick}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="relative inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 text-white font-black rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 active:scale-95 transition-all text-sm sm:text-base border border-white/30"
        >
          <ShoppingBag size={16} className="sm:w-5 sm:h-5" />
          <span>Shop</span>
          {/* "NEW" micro-badge to draw attention to the expanded inventory */}
          <span className="hidden sm:inline-flex items-center gap-0.5 bg-yellow-300 text-rose-700 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white/50 ml-1">
            NEW
          </span>
        </button>
      </div>

      {/* Logout — tertiary icon button */}
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
