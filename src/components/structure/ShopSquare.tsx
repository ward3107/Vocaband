/**
 * ShopSquare — the shop-access card on the top-right of the
 * redesigned student dashboard.  Sits next to IdentitySquare so
 * "who I am" + "what I can buy" are the two primary tiles above
 * the garden scene.
 *
 * Cool magenta gradient (indigo → fuchsia) intentionally contrasts
 * the warm IdentitySquare so they read as a matched-but-distinct
 * pair.  Under the name the card teases the category icons (🥚
 * eggs, ⚡ power-ups, 🎭 avatars) so the student knows roughly
 * what's inside before tapping.
 */
import React from 'react';
import { ShoppingBag } from 'lucide-react';

export interface ShopSquareProps {
  xp: number;
  onOpen: () => void;
}

export const ShopSquare: React.FC<ShopSquareProps> = ({ xp, onOpen }) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ touchAction: 'manipulation' }}
      className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl ring-1 ring-white/10 p-4 sm:p-5 text-left hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] transition-all"
    >
      {/* Decorative blobs matching IdentitySquare's treatment */}
      <div aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15 blur-xl" />
      <div aria-hidden className="absolute -bottom-8 -left-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/30">
          <ShoppingBag size={36} className="text-white drop-shadow" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
            Shop
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-black leading-tight truncate">
            Spend XP
          </p>
          <p className="text-xs sm:text-sm font-bold opacity-90 leading-snug mt-0.5 truncate">
            🥚 Eggs · ⚡ Power-ups · 🎭 Avatars
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-black">
          {xp.toLocaleString()} XP in wallet
        </span>
        <span className="text-[11px] font-bold opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          Open →
        </span>
      </div>
    </button>
  );
};
