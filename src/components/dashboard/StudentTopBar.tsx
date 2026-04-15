import { supabase } from "../../core/supabase";

interface StudentTopBarProps {
  onPrivacyClick: () => void;
  onShopClick: () => void;
}

export default function StudentTopBar({ onPrivacyClick, onShopClick }: StudentTopBarProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <button
        onClick={onPrivacyClick}
        className="px-3 py-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all"
        title="Privacy Settings"
      >
        Privacy
      </button>
      <button
        onClick={onShopClick}
        className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-xl hover:from-pink-500 hover:to-rose-600 transition-all text-base flex items-center gap-2 shadow-lg shadow-pink-500/30 animate-pulse"
      >
        🛍️ Shop
      </button>
      <button
        onClick={() => supabase.auth.signOut()}
        className="px-4 py-2 text-stone-500 font-bold hover:text-red-500 hover:bg-red-50 rounded-xl text-sm transition-all"
      >
        Logout
      </button>
    </div>
  );
}
