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
import { getTitleStyle } from '../../constants/titleStyles';
import { useLanguage } from '../../hooks/useLanguage';
import { structureT } from '../../locales/student/structure';

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

export const IdentityHero: React.FC<IdentityHeroProps> = ({ user, xp, streak }) => {
  const { language } = useLanguage();
  const t = structureT[language];
  const firstName = user.displayName?.split(' ')[0] ?? t.identityFriendFallback;
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
  // Equipped-title visuals come from the shared shop catalogue so the
  // hero card matches what the student saw before buying.
  const titleStyleEntry = getTitleStyle(equippedTitle?.id);
  const titleGradient = equippedTitle ? titleStyleEntry.gradient : null;
  const heroGradient = titleGradient ?? themeGradient;

  return (
    <section
      aria-label={t.identityProfileAria}
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
          {/* Pill background = equipped title's signature gradient
              (same record the shop card uses).  Text inherits the
              shop-defined font + weight + tracking + custom CSS so
              equipping a title mirrors the shop preview exactly. */}
          <div className={`inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r ${titleStyleEntry.gradient} text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 shadow-2xl ring-2 ring-white/40`}>
            <Crown size={18} className="text-white fill-white/90 drop-shadow" aria-hidden />
            <span
              className={`leading-none ${titleStyleEntry.titleFont} ${titleStyleEntry.titleWeight} ${titleStyleEntry.titleExtra ?? ''}`}
              style={titleStyleEntry.titleStyle}
            >
              {equippedTitle.display}
            </span>
            <Crown size={18} className="text-white fill-white/90 drop-shadow scale-x-[-1]" aria-hidden />
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
            {t.identityHello}
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
          {t.identityXpLabel(xp.toLocaleString())}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-black shadow-sm">
          <Flame size={15} className={streak > 0 ? 'text-amber-100' : 'text-white/60'} />
          {streak > 0 ? t.identityStreakLabel(streak) : t.identityNoStreak}
        </span>
      </div>
    </section>
  );
};
