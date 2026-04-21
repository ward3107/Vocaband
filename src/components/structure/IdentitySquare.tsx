/**
 * IdentitySquare — the "who am I?" card on the top-left of the
 * redesigned student dashboard.  Shows the student's equipped
 * avatar at full presence (so a student who bought the Goat
 * actually SEES the Goat every day), their name, current XP
 * title, and quick-stats chips for XP + streak.
 *
 * Designed as a bright colourful square (warm amber→rose
 * gradient) so it feels like an "identity" slab, not a list item.
 * The shop square on the other side uses a cool-magenta gradient
 * — together they frame the garden below.
 *
 * In Phase C the title + frame come in: title text renders under
 * the name, frame is a coloured ring around the avatar medallion.
 * For now both are plumbed but display the legacy fallbacks.
 */
import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import type { AppUser } from '../../core/supabase';
import { getXpTitle } from '../../constants/game';

export interface IdentitySquareProps {
  user: AppUser;
  xp: number;
  streak: number;
}

export const IdentitySquare: React.FC<IdentitySquareProps> = ({ user, xp, streak }) => {
  const title = getXpTitle(xp);
  // First name only — keeps the card tidy on mobile when full names
  // run long (e.g. "Mohammed Abdul Rahman").
  const firstName = user.displayName?.split(' ')[0] ?? 'Friend';
  const avatar = user.avatar || '🦊';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-xl ring-1 ring-white/10 p-4 sm:p-5">
      {/* Decorative sparkle blob top-right */}
      <div aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15 blur-xl" />
      <div aria-hidden className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        {/* Big avatar medallion — the Goat / Fox / Whatever visibly lives here.
            Phase C will wrap this in a frame ring when a frame is equipped. */}
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/90 flex items-center justify-center shadow-lg ring-2 ring-white/40">
          <span className="text-4xl sm:text-5xl" aria-hidden>{avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
            Hello,
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-black leading-tight truncate">
            {firstName}
          </p>
          {/* Title — phase C swaps this for the student's equipped title
              if they own one; today renders the XP title (Beginner /
              Scholar / Legend / …). */}
          <p className="text-xs sm:text-sm font-bold opacity-90 truncate leading-snug mt-0.5">
            <span aria-hidden className="mr-1">{title.emoji}</span>
            {title.title}
          </p>
        </div>
      </div>

      {/* Stats chips — XP + streak side by side below the avatar row */}
      <div className="relative mt-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-black">
          <Sparkles size={13} className="text-yellow-100" />
          {xp.toLocaleString()} XP
        </span>
        <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-black">
          <Flame size={13} className={streak > 0 ? 'text-amber-100' : 'text-white/60'} />
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </span>
      </div>
    </div>
  );
};
