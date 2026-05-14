// Shop catalogue translations — names + descriptions for every item in
// `src/constants/game.ts`. Keyed by stable item id so the source-of-truth
// constants can be reordered without breaking translations.
//
// EN is the canonical source. HE / AR are AI-drafted by
// `scripts/translate-catalog.ts` (Phase 2 of the shop redesign) and
// later polished by native speakers. Missing entries fall back to EN
// via `catalogName` / `catalogDesc` helpers below.

import type { Language } from '../../hooks/useLanguage';

interface Entry {
  name: string;
  desc?: string;
  display?: string;
}

export type CatalogSection =
  | 'avatars'
  | 'themes'
  | 'eggs'
  | 'powerUps'
  | 'boosters'
  | 'frames'
  | 'titles'
  | 'categories';

type Catalog = Partial<Record<CatalogSection, Record<string, Entry>>>;

const en: Catalog = {
  avatars: {
    dragon:         { name: 'Dragon' },
    eagle:          { name: 'Eagle' },
    wolf:           { name: 'Wolf' },
    dinosaur:       { name: 'Dinosaur' },
    wizard:         { name: 'Wizard' },
    superhero:      { name: 'Superhero' },
    alien:          { name: 'Alien' },
    prince:         { name: 'Prince' },
    princess:       { name: 'Princess' },
    unicorn:        { name: 'Unicorn' },
    dragon_face:    { name: 'Dragon Face' },
    vampire:        { name: 'Vampire' },
    merperson:      { name: 'Merperson' },
    ninja:          { name: 'Ninja' },
    robot:          { name: 'Robot' },
    goat:           { name: 'GOAT' },
    astronaut:      { name: 'Astronaut' },
    coder:          { name: 'Coder' },
    witch:          { name: 'Witch' },
    super_villain:  { name: 'Super Villain' },
    dj:             { name: 'DJ' },
    pro_gamer:      { name: 'Pro Gamer' },
    champion:       { name: 'Champion' },
    cyborg:         { name: 'Cyborg' },
    elf:            { name: 'Elf' },
    genie:          { name: 'Genie' },
    kraken:         { name: 'Kraken' },
    owl_sage:       { name: 'Owl Sage' },
    planet_master:  { name: 'Planet Master' },
    lightning:      { name: 'Lightning' },
  },

  themes: {
    default:  { name: 'Classic' },
    dark:     { name: 'Dark Mode' },
    ocean:    { name: 'Ocean' },
    sunset:   { name: 'Sunset' },
    neon:     { name: 'Neon' },
    forest:   { name: 'Forest' },
    royal:    { name: 'Royal' },
    galaxy:   { name: 'Galaxy' },
    aurora:   { name: 'Aurora' },
    retro80:  { name: 'Retro 80s' },
    sakura:   { name: 'Sakura' },
    chill:    { name: 'Chill Mode' },
    esports:  { name: 'Esports RGB' },
  },

  eggs: {
    starter_egg:    { name: 'Starter Egg',    desc: 'A simple egg. Drops 25-80 XP — roughly break-even.' },
    golden_egg:     { name: 'Golden Egg',     desc: 'Sparkles gold. Drops 80-220 XP + a chance of a rare avatar.' },
    dragon_egg:     { name: 'Dragon Egg',     desc: 'Something mighty inside. Drops 200-550 XP.' },
    treasure_chest: { name: 'Treasure Chest', desc: 'Premium loot. Drops 350-800 XP + guaranteed cosmetic.' },
    cosmic_egg:     { name: 'Cosmic Egg',     desc: 'Made of stardust. Drops 600-1400 XP + a premium title.' },
    rainbow_egg:    { name: 'Rainbow Egg',    desc: 'The rarest egg. Drops 1200-2600 XP + a random premium avatar.' },
  },

  powerUps: {
    skip:          { name: 'Skip Word',     desc: 'Skip the current word without penalty' },
    fifty_fifty:   { name: '50/50',         desc: 'Remove 2 wrong answers' },
    reveal_letter: { name: 'Reveal Letter', desc: 'Reveal the first letter in spelling mode' },
  },

  boosters: {
    streak_freeze:   { name: 'Streak Freeze',   desc: 'Protect your streak for 1 missed day' },
    xp_booster:      { name: '2× XP Booster',   desc: 'Double XP for 24 hours' },
    lucky_charm:     { name: 'Lucky Charm',     desc: 'Your first wrong answer in the next game is forgiven' },
    weekend_warrior: { name: 'Weekend Warrior', desc: '2× XP for an entire weekend' },
  },

  frames: {
    gold:        { name: 'Gold Frame' },
    fire:        { name: 'Fire Frame' },
    diamond:     { name: 'Diamond Frame' },
    rainbow:     { name: 'Rainbow Frame' },
    lightning:   { name: 'Lightning Frame' },
    crown:       { name: 'Crown Frame' },
    neon_glow:   { name: 'Neon Glow' },
    galaxy:      { name: 'Galaxy' },
    pixel:       { name: 'Pixel 8-bit' },
    holographic: { name: 'Holographic' },
  },

  titles: {
    champion:       { name: 'Champion',       display: 'Champion' },
    genius:         { name: 'Genius',         display: 'Genius' },
    word_wizard:    { name: 'Word Wizard',    display: 'Word Wizard' },
    vocab_king:     { name: 'Vocab King',     display: 'Vocab King' },
    vocab_queen:    { name: 'Vocab Queen',    display: 'Vocab Queen' },
    speed_demon:    { name: 'Speed Demon',    display: 'Speed Demon' },
    legend:         { name: 'Living Legend',  display: 'Living Legend' },
    brain:          { name: 'Big Brain',      display: 'Big Brain' },
    main_character: { name: 'Main Character', display: 'Main Character' },
    goated:         { name: 'GOATed',         display: '🐐 GOATed' },
    aura_farmer:    { name: 'Aura Farmer',    display: 'Aura Farmer' },
    final_boss:     { name: 'Final Boss',     display: 'Final Boss' },
    rizzler:        { name: 'Rizzler',        display: 'The Rizzler' },
    chosen_one:     { name: 'Chosen One',     display: 'The Chosen One' },
    speedrunner:    { name: 'Speedrunner',    display: 'Speedrunner' },
    cracked:        { name: 'Cracked',        display: 'Cracked' },
  },

  categories: {
    Animals:        { name: 'Animals' },
    Faces:          { name: 'Faces' },
    GamerSquad:     { name: 'Gamer Squad' },
    SnackAttack:    { name: 'Snack Attack' },
    FootballStars:  { name: 'Football Stars' },
    Food:           { name: 'Food' },
    Nature:         { name: 'Nature' },
    Sports:         { name: 'Sports' },
    JurassicMode:   { name: 'Jurassic Mode' },
    CreatorPack:    { name: 'Creator Pack' },
    Objects:        { name: 'Objects' },
    Vehicles:       { name: 'Vehicles' },
    LabRats:        { name: 'Lab Rats' },
    WarriorPack:    { name: 'Warrior Pack' },
    Fantasy:        { name: 'Fantasy' },
    SpaceLegends:   { name: 'Space Legends' },
    Space:          { name: 'Space' },
    Free:           { name: 'Free' },
  },
};

// Populated by `scripts/translate-catalog.ts` in Phase 2. Until then,
// helpers fall back to EN. Keep this stub typed so type-checks pass.
const he: Catalog = {};
const ar: Catalog = {};

export const shopCatalog: Record<Language, Catalog> = { en, he, ar };

export function catalogName(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.name ?? en[section]?.[id]?.name ?? fallback;
}

export function catalogDesc(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.desc ?? en[section]?.[id]?.desc ?? fallback;
}

export function catalogDisplay(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.display ?? en[section]?.[id]?.display ?? fallback;
}
