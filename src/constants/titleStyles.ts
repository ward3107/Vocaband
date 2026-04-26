/**
 * Single source of truth for student title visuals.
 *
 * Each title has a unique gradient + font + weight + extra styling so
 * "Champion" looks like a podium and "Final Boss" looks like a boss
 * fight intro card.  Both the shop catalogue (where students preview
 * the title before buying) AND the dashboard banner (where the equipped
 * title is celebrated above the student's name) import this file so
 * the equipped title looks identical to its shop preview.
 *
 * Previously the shop defined these locally and the dashboard had a
 * stripped-down `TITLE_GRADIENTS` map with gradients only — equipping
 * a title gave you the right colour but the wrong font / weight / case.
 * Teachers + students reported "the title looks different on my
 * dashboard than in the shop" — fixed by making both sides read the
 * same record.
 */
import type { CSSProperties } from 'react';

export interface TitleStyle {
  /** Tailwind gradient classes WITHOUT the `bg-gradient-*` prefix.
   *  Consumers compose the prefix (`bg-gradient-to-r ${gradient}`). */
  gradient: string;
  /** Tailwind classes for the title text font (family + size). */
  titleFont: string;
  /** Tailwind classes for the title text weight. */
  titleWeight: string;
  /** Optional extra Tailwind classes (tracking, transforms, etc.). */
  titleExtra?: string;
  /** Inline CSS for properties Tailwind can't express (e.g.
   *  fontVariant: 'small-caps'). */
  titleStyle?: CSSProperties;
  /** Short flavour blurb shown under the title in shop cards. */
  vibe: string;
}

export const TITLE_STYLES: Record<string, TitleStyle> = {
  _default:        { gradient: 'from-stone-600 to-stone-800',                       titleFont: 'font-sans text-3xl sm:text-4xl',                            titleWeight: 'font-black',                                                                                  vibe: 'A classic flex.' },
  champion:        { gradient: 'from-amber-500 via-orange-500 to-yellow-500',       titleFont: 'font-sans text-3xl sm:text-4xl uppercase tracking-wider',  titleWeight: 'font-black',                                                                                  vibe: 'Stand on the podium.' },
  genius:          { gradient: 'from-sky-500 via-blue-600 to-indigo-700',           titleFont: 'font-serif italic text-3xl sm:text-4xl',                   titleWeight: 'font-semibold',                                                                               vibe: 'For the quiet ones who know.' },
  word_wizard:     { gradient: 'from-emerald-500 via-teal-500 to-cyan-600',         titleFont: 'font-serif italic text-2xl sm:text-3xl',                   titleWeight: 'font-bold',                                                                                   vibe: 'Spells cast in English.' },
  vocab_king:      { gradient: 'from-yellow-500 via-amber-500 to-orange-600',       titleFont: 'font-serif text-3xl sm:text-4xl',                          titleWeight: 'font-black',                            titleExtra: 'tracking-tight',                         vibe: 'Rule over the dictionary.' },
  vocab_queen:     { gradient: 'from-pink-400 via-rose-500 to-fuchsia-600',         titleFont: 'font-serif italic text-3xl sm:text-4xl',                   titleWeight: 'font-black',                                                                                  vibe: 'Royal vocabulary energy.' },
  speed_demon:     { gradient: 'from-rose-600 via-red-600 to-orange-600',           titleFont: 'font-sans italic text-3xl sm:text-4xl uppercase',          titleWeight: 'font-black',                            titleExtra: 'tracking-tight skew-x-[-6deg]',          vibe: 'Nothing beats your WPM.' },
  legend:          { gradient: 'from-indigo-700 via-violet-700 to-purple-800',      titleFont: 'font-serif text-3xl sm:text-4xl',                          titleWeight: 'font-black',                                                                                  vibe: "They'll tell stories about you." },
  brain:           { gradient: 'from-emerald-500 via-green-600 to-lime-500',        titleFont: 'font-sans text-3xl sm:text-4xl',                           titleWeight: 'font-black',                            titleExtra: 'tracking-tight',                         vibe: 'Big thoughts only.' },
  main_character:  { gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',         titleFont: 'font-serif italic text-3xl sm:text-4xl',                   titleWeight: 'font-black',                                                                                  vibe: 'The story revolves around you.' },
  goated:          { gradient: 'from-amber-400 via-yellow-500 to-orange-600',       titleFont: 'font-sans text-3xl sm:text-4xl uppercase',                 titleWeight: 'font-black',                            titleExtra: 'tracking-widest',                        vibe: 'Greatest Of All Time.' },
  aura_farmer:     { gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',       titleFont: 'font-sans italic text-3xl sm:text-4xl',                    titleWeight: 'font-light',                            titleExtra: 'tracking-wide',                          vibe: 'Your aura is farmable.' },
  final_boss:      { gradient: 'from-red-700 via-rose-800 to-black',                titleFont: 'font-mono uppercase text-2xl sm:text-3xl',                 titleWeight: 'font-black',                            titleExtra: 'tracking-widest',                        vibe: 'End of the rainbow.' },
  rizzler:         { gradient: 'from-pink-500 via-rose-500 to-red-500',             titleFont: 'font-serif italic text-3xl sm:text-4xl',                   titleWeight: 'font-black',                                                                                  vibe: 'Charisma meter: maxed.' },
  chosen_one:      { gradient: 'from-amber-300 via-yellow-400 to-amber-600',        titleFont: 'font-serif text-3xl sm:text-4xl',                          titleWeight: 'font-black',                                                                                  titleStyle: { fontVariant: 'small-caps' }, vibe: 'Prophecy fulfilled.' },
  speedrunner:     { gradient: 'from-lime-400 via-emerald-500 to-green-600',        titleFont: 'font-mono uppercase text-2xl sm:text-3xl',                 titleWeight: 'font-black',                            titleExtra: 'tracking-tight',                         vibe: 'Any%. No hits. No mercy.' },
  cracked:         { gradient: 'from-orange-500 via-red-600 to-rose-700',           titleFont: 'font-mono uppercase text-2xl sm:text-3xl',                 titleWeight: 'font-black',                            titleExtra: 'tracking-[0.25em]',                      vibe: 'Cooking with gas.' },
};

/** Look up a title style by id with a safe fallback. */
export function getTitleStyle(titleId: string | null | undefined): TitleStyle {
  if (!titleId) return TITLE_STYLES._default;
  return TITLE_STYLES[titleId] ?? TITLE_STYLES._default;
}
