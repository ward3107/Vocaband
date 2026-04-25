/**
 * IdentityHero — full-width "who am I?" card at the top of the
 * redesigned student dashboard.  Upgrades the old IdentitySquare
 * with: bigger avatar (128px), prominent frame ring, larger title
 * badge chip so equipped cosmetics (Crown Frame, GOATed title,
 * etc.) READ clearly at a glance — no more "I bought a frame but
 * I can barely see it" complaints.
 *
 * Replaces the cramped two-column IdentitySquare+ShopSquare pair
 * at the very top.  ShopSquare moves down next to the
 * StructurePreviewTile.
 */
import React from 'react';
import { Flame, Sparkles, Crown } from 'lucide-react';
import type { AppUser } from '../../core/supabase';
import { getXpTitle, NAME_FRAMES, NAME_TITLES } from '../../constants/game';

export interface IdentityHeroProps {
  user: AppUser;
  xp: number;
  streak: number;
}

/**
 * Hero gradient per theme — the IdentityHero card's background
 * reskins when the student equips a shop theme so the whole
 * dashboard (outer bg + hero card) feels coherent.  Each mapping
 * is hand-picked to visually COMPLEMENT the theme's dashboard
 * background colours (not match them), so the hero still pops
 * against whatever backdrop the theme provides.
 *
 * Unknown theme ids fall back to the default warm amber-to-rose
 * gradient, so adding a new theme without updating this map is
 * non-breaking.
 */
const HERO_GRADIENTS: Record<string, string> = {
  default: 'from-amber-400 via-orange-500 to-rose-500',
  dark:    'from-indigo-500 via-violet-600 to-fuchsia-600',
  ocean:   'from-cyan-500 via-sky-500 to-indigo-600',
  sunset:  'from-purple-500 via-pink-500 to-rose-500',
  neon:    'from-green-400 via-emerald-500 to-teal-500',
  forest:  'from-emerald-500 via-lime-500 to-amber-400',
  royal:   'from-amber-400 via-yellow-500 to-orange-500',
  galaxy:  'from-fuchsia-500 via-violet-500 to-indigo-600',
  aurora:  'from-emerald-400 via-cyan-500 to-violet-500',
  retro80: 'from-fuchsia-500 via-pink-500 to-cyan-500',
  sakura:  'from-rose-400 via-pink-400 to-fuchsia-400',
  chill:   'from-sky-400 via-amber-400 to-rose-400',
  esports: 'from-green-500 via-emerald-500 to-teal-600',
};

/**
 * Per-title hero gradient.  When a student equips a title, the WHOLE
 * hero card recolours so it actually reads as "I'm wearing this" — the
 * old behaviour rendered every title in a generic white pill that
 * blended into the theme background.  Equipping a title now wins over
 * the theme gradient, matching teacher feedback that buying a title
 * "should change the rectangle, not just add a tiny chip".
 *
 * Add new title ids here when adding to NAME_TITLES; the fallback
 * (`'default'`) is the original warm amber so missing entries are
 * non-breaking.
 */
const TITLE_GRADIENTS: Record<string, string> = {
  default:        'from-amber-400 via-orange-500 to-rose-500',
  champion:       'from-amber-300 via-yellow-500 to-orange-500',
  genius:         'from-violet-500 via-fuchsia-500 to-pink-500',
  word_wizard:    'from-indigo-500 via-violet-500 to-fuchsia-500',
  vocab_king:     'from-amber-400 via-orange-500 to-red-600',
  vocab_queen:    'from-fuchsia-500 via-pink-500 to-rose-500',
  speed_demon:    'from-red-500 via-orange-500 to-yellow-500',
  legend:         'from-yellow-400 via-amber-500 to-orange-600',
  brain:          'from-cyan-400 via-sky-500 to-blue-600',
  main_character: 'from-pink-500 via-fuchsia-500 to-violet-600',
  goated:         'from-emerald-500 via-yellow-500 to-orange-500',
  aura_farmer:    'from-purple-500 via-violet-500 to-indigo-600',
  final_boss:     'from-rose-600 via-red-700 to-stone-900',
  rizzler:        'from-cyan-400 via-pink-500 to-violet-600',
  chosen_one:     'from-yellow-300 via-amber-400 to-rose-500',
  speedrunner:    'from-lime-400 via-emerald-500 to-cyan-500',
  cracked:        'from-cyan-400 via-blue-500 to-purple-600',
};

export const IdentityHero: React.FC<IdentityHeroProps> = ({ user, xp, streak }) => {
  const firstName = user.displayName?.split(' ')[0] ?? 'Friend';
  const avatar = user.avatar || '🦊';

  const equippedFrame = user.activeFrame
    ? NAME_FRAMES.find(f => f.id === user.activeFrame)
    : null;
  const equippedTitle = user.activeTitle
    ? NAME_TITLES.find(t => t.id === user.activeTitle)
    : null;
  const xpTitle = getXpTitle(xp);
  const frameRingClass = equippedFrame?.border ?? 'ring-2 ring-white/50';

  // Title gradient WINS over theme gradient.  Equipping a title is a
  // bigger statement than picking a theme (it's something you EARNED
  // by spending XP), so the whole rectangle recolours when one is
  // active.  Falls back to the theme gradient when no title is
  // equipped, then the default if the theme is also unknown.
  const themeId = user.activeTheme ?? 'default';
  const themeGradient = HERO_GRADIENTS[themeId] ?? HERO_GRADIENTS.default;
  const titleGradient = equippedTitle
    ? (TITLE_GRADIENTS[equippedTitle.id] ?? TITLE_GRADIENTS.default)
    : null;
  const heroGradient = titleGradient ?? themeGradient;

  return (
    <section
      aria-label="Your profile"
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient} text-white shadow-xl ring-1 ring-white/10 p-5 sm:p-7 mb-4`}
    >
      {/* Decorative corner blobs — soft atmosphere, not busy */}
      <div aria-hidden className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden className="absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-white/10 blur-3xl" />

      {/* TITLE BANNER — only when a title is equipped.  Sits ABOVE the
          name as a fabulous trophy ribbon, big enough to read from
          across the room.  Teachers asked for "more fabulous"; this is
          the answer: the title gets its own row, its own gradient,
          its own crown icon, and the entire hero rectangle behind it
          is recoloured to match. */}
      {equippedTitle && (
        <div className="relative mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/95 text-stone-900 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 shadow-2xl ring-2 ring-white/40">
            <Crown size={18} className="text-amber-500 fill-amber-300 drop-shadow" aria-hidden />
            <span className="text-base sm:text-xl font-black tracking-wide leading-none">
              {equippedTitle.display}
            </span>
            <Crown size={18} className="text-amber-500 fill-amber-300 drop-shadow scale-x-[-1]" aria-hidden />
          </div>
        </div>
      )}

      <div className="relative flex items-center gap-4 sm:gap-6">
        {/* AVATAR MEDALLION — 96px on mobile, 128px on desktop.  Frame
            ring classes wrap it so equipped cosmetics are instantly
            visible.  Ring-offset-2 gives every frame a breathing gap
            so the colour reads even on the warm gradient behind. */}
        {/* ring-offset-transparent lets the hero gradient show through
            the 2px offset gap; avoids the ring reading as an orange
            "collar" when the theme is cool-toned (Ocean, Galaxy, …). */}
        <div className={`shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white flex items-center justify-center shadow-2xl ${frameRingClass} ring-offset-2 ring-offset-transparent`}>
          <span className="text-6xl sm:text-7xl" aria-hidden>{avatar}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
            Hello,
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black leading-tight truncate drop-shadow-sm">
            {firstName}
          </h1>

          {/* When NO title is equipped, fall back to the XP-derived
              level chip in-line.  When a title IS equipped, the big
              banner above already shows it — no need for a duplicate
              chip here. */}
          {!equippedTitle && (
            <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-bold">
              <span aria-hidden>{xpTitle.emoji}</span>
              {xpTitle.title}
            </div>
          )}
        </div>
      </div>

      {/* Stats row — XP + streak at the bottom of the hero so the
          numbers feel anchored to the identity, not floating. */}
      <div className="relative mt-4 sm:mt-5 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-black shadow-sm">
          <Sparkles size={15} className="text-yellow-100" />
          {xp.toLocaleString()} XP
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-black shadow-sm">
          <Flame size={15} className={streak > 0 ? 'text-amber-100' : 'text-white/60'} />
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </span>
      </div>
    </section>
  );
};
