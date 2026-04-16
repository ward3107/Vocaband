// --- GAME SETTINGS ---
export const MAX_ATTEMPTS_PER_WORD = 3;
export const AUTO_SKIP_DELAY_MS = 500;
export const SHOW_ANSWER_DELAY_MS = 3000;
export const WRONG_FEEDBACK_DELAY_MS = 1500;

export const MOTIVATIONAL_MESSAGES = [
  "Great job! 🎉", "Well done! 👏", "Awesome! 🌟", "Keep it up! 💪",
  "Nailed it! 🎯", "Brilliant! ✨", "You're on fire! 🔥", "Fantastic! 🚀",
  "Way to go! 🏆", "Superstar! ⭐",
];
export const SPEAKABLE_MOTIVATIONS = [
  "Great job!", "Well done!", "Awesome!", "Keep it up!",
  "Nailed it!", "Brilliant!", "You're on fire!", "Fantastic!",
  "Way to go!", "Superstar!", "Amazing!", "Perfect!",
];
export const randomMotivation = () =>
  MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

// --- XP REWARD SYSTEM ---
// Bonus XP for completing a mode for the first time on an assignment
export const FIRST_COMPLETION_BONUS = 50;
// Streak bonus: streak × this value added to each game's XP
export const STREAK_XP_MULTIPLIER = 5;

export const XP_TITLES = [
  { min: 0, title: 'Beginner', emoji: '🌱' },
  { min: 100, title: 'Learner', emoji: '📚' },
  { min: 300, title: 'Scholar', emoji: '🎓' },
  { min: 700, title: 'Expert', emoji: '🏅' },
  { min: 1500, title: 'Master', emoji: '👑' },
  { min: 3000, title: 'Legend', emoji: '🌟' },
];
export const getXpTitle = (xpAmount: number) => XP_TITLES.filter(t => xpAmount >= t.min).pop() ?? XP_TITLES[0];

// --- SHOP: AVATARS ---
export const PREMIUM_AVATARS = [
  { emoji: '🐉', name: 'Dragon', cost: 50 },
  { emoji: '🦅', name: 'Eagle', cost: 50 },
  { emoji: '🐺', name: 'Wolf', cost: 75 },
  { emoji: '🦖', name: 'Dinosaur', cost: 100 },
  { emoji: '🧙‍♂️', name: 'Wizard', cost: 150 },
  { emoji: '🦸', name: 'Superhero', cost: 200 },
  { emoji: '👾', name: 'Alien', cost: 250 },
  { emoji: '🤴', name: 'Prince', cost: 300 },
  { emoji: '👸', name: 'Princess', cost: 300 },
  { emoji: '🦄', name: 'Unicorn', cost: 150 },
  { emoji: '🐲', name: 'Dragon Face', cost: 100 },
  { emoji: '🧛', name: 'Vampire', cost: 200 },
  { emoji: '🧜', name: 'Merperson', cost: 175 },
  { emoji: '🥷', name: 'Ninja', cost: 250 },
  { emoji: '🤖', name: 'Robot', cost: 125 },
  // 2026 additions — popular with kids globally + in Israeli schools.
  { emoji: '🐐', name: 'GOAT', cost: 350 },
  { emoji: '👨‍🚀', name: 'Astronaut', cost: 275 },
  { emoji: '🧑‍💻', name: 'Coder', cost: 225 },
  { emoji: '🧙‍♀️', name: 'Witch', cost: 150 },
  { emoji: '🦹', name: 'Super Villain', cost: 250 },
  { emoji: '🎧', name: 'DJ', cost: 200 },
  { emoji: '🎮', name: 'Pro Gamer', cost: 175 },
  { emoji: '🏆', name: 'Champion', cost: 400 },
  { emoji: '🦾', name: 'Cyborg', cost: 275 },
  { emoji: '🧝', name: 'Elf', cost: 225 },
  { emoji: '🧞', name: 'Genie', cost: 300 },
  { emoji: '🐙', name: 'Kraken', cost: 150 },
  { emoji: '🦉', name: 'Owl Sage', cost: 125 },
  { emoji: '🪐', name: 'Planet Master', cost: 350 },
  { emoji: '⚡', name: 'Lightning', cost: 200 },
];

export const AVATAR_CATEGORY_UNLOCKS: Record<string, { xpRequired: number; label: string }> = {
  // Starter packs — instant access so new students have something to equip.
  Animals: { xpRequired: 0, label: 'Free' },
  Faces: { xpRequired: 0, label: 'Free' },
  // Early-unlock packs — visible progress in the first few sessions.
  GamerSquad: { xpRequired: 50, label: '50 XP' },
  SnackAttack: { xpRequired: 75, label: '75 XP' },
  FootballStars: { xpRequired: 100, label: '100 XP' },
  Food: { xpRequired: 100, label: '100 XP' },
  Nature: { xpRequired: 150, label: '150 XP' },
  Sports: { xpRequired: 200, label: '200 XP' },
  JurassicMode: { xpRequired: 250, label: '250 XP' },
  CreatorPack: { xpRequired: 300, label: '300 XP' },
  Objects: { xpRequired: 400, label: '400 XP' },
  Vehicles: { xpRequired: 500, label: '500 XP' },
  LabRats: { xpRequired: 600, label: '600 XP' },
  // Rare packs — for committed players.
  WarriorPack: { xpRequired: 800, label: '800 XP' },
  Fantasy: { xpRequired: 900, label: '900 XP' },
  SpaceLegends: { xpRequired: 1200, label: '1200 XP' },
  Space: { xpRequired: 1500, label: '1500 XP' },
};

// --- SHOP: THEMES ---
// Each theme maps to a Tailwind bg class chain + the accent used elsewhere.
// New 2026 themes use richer gradients for a more premium feel; the page
// wrapper picks `colors.bg` directly, so gradient classes are supported.
export const THEMES = [
  { id: 'default', name: 'Classic', preview: '⬜', colors: { bg: 'bg-stone-100', card: 'bg-white', text: 'text-stone-900', accent: 'blue' }, cost: 0 },
  { id: 'dark', name: 'Dark Mode', preview: '🌑', colors: { bg: 'bg-gray-900', card: 'bg-gray-800', text: 'text-white', accent: 'blue' }, cost: 100 },
  { id: 'ocean', name: 'Ocean', preview: '🌊', colors: { bg: 'bg-gradient-to-b from-cyan-50 to-sky-100', card: 'bg-white', text: 'text-stone-900', accent: 'cyan' }, cost: 150 },
  { id: 'sunset', name: 'Sunset', preview: '🌅', colors: { bg: 'bg-gradient-to-b from-orange-100 via-rose-100 to-pink-100', card: 'bg-white', text: 'text-stone-900', accent: 'orange' }, cost: 150 },
  { id: 'neon', name: 'Neon', preview: '💚', colors: { bg: 'bg-gray-950', card: 'bg-gray-900', text: 'text-green-400', accent: 'green' }, cost: 200 },
  { id: 'forest', name: 'Forest', preview: '🌲', colors: { bg: 'bg-gradient-to-b from-green-50 to-emerald-100', card: 'bg-white', text: 'text-stone-900', accent: 'green' }, cost: 150 },
  { id: 'royal', name: 'Royal', preview: '👑', colors: { bg: 'bg-gradient-to-b from-purple-50 to-violet-100', card: 'bg-white', text: 'text-stone-900', accent: 'purple' }, cost: 200 },
  // 2026 additions — each fits a distinct student vibe.
  { id: 'galaxy',  name: 'Galaxy',     preview: '🌌', colors: { bg: 'bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900', card: 'bg-slate-900', text: 'text-violet-100', accent: 'purple' }, cost: 250 },
  { id: 'aurora',  name: 'Aurora',     preview: '🌈', colors: { bg: 'bg-gradient-to-b from-emerald-100 via-teal-100 to-violet-100', card: 'bg-white', text: 'text-stone-900', accent: 'teal' }, cost: 250 },
  { id: 'retro80', name: 'Retro 80s',  preview: '🕹️', colors: { bg: 'bg-gradient-to-b from-fuchsia-200 via-pink-200 to-cyan-200', card: 'bg-white', text: 'text-fuchsia-900', accent: 'pink' }, cost: 300 },
  { id: 'sakura',  name: 'Sakura',     preview: '🌸', colors: { bg: 'bg-gradient-to-b from-pink-50 via-rose-50 to-fuchsia-50', card: 'bg-white', text: 'text-stone-900', accent: 'pink' }, cost: 200 },
  { id: 'chill',   name: 'Chill Mode', preview: '🏖️', colors: { bg: 'bg-gradient-to-b from-sky-100 via-amber-50 to-rose-100', card: 'bg-white', text: 'text-stone-900', accent: 'sky' }, cost: 200 },
  { id: 'esports', name: 'Esports RGB', preview: '⚡', colors: { bg: 'bg-gradient-to-br from-black via-gray-900 to-black', card: 'bg-gray-900', text: 'text-green-400', accent: 'green' }, cost: 350 },
];

// --- SHOP: POWER-UPS & BOOSTERS ---
// Power-ups consume on use (inventory count) — students stack them.
// Boosters are one-shot buffs with a duration (handled in App.tsx).
export const POWER_UP_DEFS = [
  { id: 'skip', name: 'Skip Word', emoji: '⏭️', desc: 'Skip the current word without penalty', cost: 30 },
  { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers', cost: 40 },
  { id: 'reveal_letter', name: 'Reveal Letter', emoji: '💡', desc: 'Reveal the first letter in spelling mode', cost: 25 },
  // 2026 additions
  { id: 'double_points', name: 'Double Points', emoji: '2️⃣', desc: 'Next correct answer = 2× XP', cost: 50 },
  { id: 'time_freeze', name: 'Time Freeze', emoji: '⏰', desc: 'Add 10 seconds on timed modes', cost: 40 },
  { id: 'peek', name: 'Peek', emoji: '👁️', desc: 'Reveal the correct answer for 1 second', cost: 45 },
];

export const BOOSTERS_DEFS = [
  { id: 'streak_freeze', name: 'Streak Freeze', emoji: '🧊', desc: 'Protect your streak for 1 missed day', cost: 200 },
  { id: 'lucky_spin', name: 'Lucky Spin Token', emoji: '🎰', desc: 'Spin the wheel for random rewards', cost: 150 },
  { id: 'xp_booster', name: '2× XP Booster', emoji: '🚀', desc: 'Double XP for 24 hours', cost: 300 },
  // 2026 additions
  { id: 'lucky_charm', name: 'Lucky Charm', emoji: '🍀', desc: 'Your first wrong answer in the next game is forgiven', cost: 180 },
  { id: 'focus_mode', name: 'Focus Mode', emoji: '🎯', desc: 'Distraction-free theme for 1 hour', cost: 120 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', emoji: '📅', desc: '2× XP for an entire weekend', cost: 400 },
];

// --- SHOP: COSMETICS ---
export const NAME_FRAMES = [
  { id: 'gold', name: 'Gold Frame', preview: '🥇', border: 'ring-4 ring-yellow-400', cost: 200 },
  { id: 'fire', name: 'Fire Frame', preview: '🔥', border: 'ring-4 ring-orange-500', cost: 300 },
  { id: 'diamond', name: 'Diamond Frame', preview: '💎', border: 'ring-4 ring-cyan-400', cost: 400 },
  { id: 'rainbow', name: 'Rainbow Frame', preview: '🌈', border: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-pink-200', cost: 350 },
  { id: 'lightning', name: 'Lightning Frame', preview: '⚡', border: 'ring-4 ring-amber-300 shadow-lg shadow-amber-200', cost: 300 },
  { id: 'crown', name: 'Crown Frame', preview: '👑', border: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-200', cost: 500 },
  // 2026 additions — all use Tailwind classes interpreted by the avatar ring
  { id: 'neon_glow', name: 'Neon Glow', preview: '💚', border: 'ring-4 ring-green-400 shadow-lg shadow-green-400/50 animate-pulse', cost: 350 },
  { id: 'galaxy', name: 'Galaxy', preview: '🌌', border: 'ring-4 ring-violet-500 ring-offset-2 ring-offset-indigo-900 shadow-lg shadow-violet-500/50', cost: 450 },
  { id: 'pixel', name: 'Pixel 8-bit', preview: '🕹️', border: 'ring-4 ring-fuchsia-400 shadow-md', cost: 275 },
  { id: 'holographic', name: 'Holographic', preview: '✨', border: 'ring-4 ring-cyan-300 shadow-lg shadow-pink-300/40', cost: 550 },
];

export const NAME_TITLES = [
  { id: 'champion', name: 'Champion', display: 'Champion', cost: 150 },
  { id: 'genius', name: 'Genius', display: 'Genius', cost: 200 },
  { id: 'word_wizard', name: 'Word Wizard', display: 'Word Wizard', cost: 300 },
  { id: 'vocab_king', name: 'Vocab King', display: 'Vocab King', cost: 250 },
  { id: 'vocab_queen', name: 'Vocab Queen', display: 'Vocab Queen', cost: 250 },
  { id: 'speed_demon', name: 'Speed Demon', display: 'Speed Demon', cost: 350 },
  { id: 'legend', name: 'Living Legend', display: 'Living Legend', cost: 400 },
  { id: 'brain', name: 'Big Brain', display: 'Big Brain', cost: 300 },
  // 2026 slang titles — what kids actually call each other in chats.
  { id: 'main_character', name: 'Main Character', display: 'Main Character', cost: 350 },
  { id: 'goated', name: 'GOATed', display: '🐐 GOATed', cost: 400 },
  { id: 'aura_farmer', name: 'Aura Farmer', display: 'Aura Farmer', cost: 300 },
  { id: 'final_boss', name: 'Final Boss', display: 'Final Boss', cost: 500 },
  { id: 'rizzler', name: 'Rizzler', display: 'The Rizzler', cost: 350 },
  { id: 'chosen_one', name: 'Chosen One', display: 'The Chosen One', cost: 450 },
  { id: 'speedrunner', name: 'Speedrunner', display: 'Speedrunner', cost: 300 },
  { id: 'cracked', name: 'Cracked', display: 'Cracked', cost: 275 },
];

// --- GAME: LETTER COLORS ---
export const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

// --- SENTENCE DIFFICULTY LEVELS ---
export type SentenceDifficulty = 1 | 2 | 3 | 4;

export const DIFFICULTY_CONFIG: Record<SentenceDifficulty, {
  label: string;
  description: string;
  minWords: number;
  maxWords: number;
  emoji: string;
}> = {
  1: { label: 'Beginner', description: '3-5 words, simple present', minWords: 3, maxWords: 5, emoji: '🌱' },
  2: { label: 'Elementary', description: '5-7 words, basic tenses', minWords: 5, maxWords: 7, emoji: '🌿' },
  3: { label: 'Intermediate', description: '7-10 words, varied grammar', minWords: 7, maxWords: 10, emoji: '🌳' },
  4: { label: 'Advanced', description: '10-15 words, complex structures', minWords: 10, maxWords: 15, emoji: '🏔️' },
};

export type GameMode = "classic" | "listening" | "spelling" | "matching" | "true-false" | "flashcards" | "scramble" | "reverse" | "letter-sounds" | "sentence-builder";
