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
];

export const AVATAR_CATEGORY_UNLOCKS: Record<string, { xpRequired: number; label: string }> = {
  Animals: { xpRequired: 0, label: 'Free' },
  Faces: { xpRequired: 0, label: 'Free' },
  Food: { xpRequired: 50, label: '50 XP' },
  Nature: { xpRequired: 100, label: '100 XP' },
  Sports: { xpRequired: 200, label: '200 XP' },
  Objects: { xpRequired: 400, label: '400 XP' },
  Vehicles: { xpRequired: 600, label: '600 XP' },
  Fantasy: { xpRequired: 1000, label: '1000 XP' },
  Space: { xpRequired: 1500, label: '1500 XP' },
};

// --- SHOP: THEMES ---
export const THEMES = [
  { id: 'default', name: 'Classic', preview: '⬜', colors: { bg: 'bg-stone-100', card: 'bg-white', text: 'text-stone-900', accent: 'blue' }, cost: 0 },
  { id: 'dark', name: 'Dark Mode', preview: '⬛', colors: { bg: 'bg-gray-900', card: 'bg-gray-800', text: 'text-white', accent: 'blue' }, cost: 100 },
  { id: 'ocean', name: 'Ocean', preview: '🌊', colors: { bg: 'bg-cyan-50', card: 'bg-white', text: 'text-stone-900', accent: 'cyan' }, cost: 150 },
  { id: 'sunset', name: 'Sunset', preview: '🌅', colors: { bg: 'bg-orange-50', card: 'bg-white', text: 'text-stone-900', accent: 'orange' }, cost: 150 },
  { id: 'neon', name: 'Neon', preview: '💚', colors: { bg: 'bg-gray-950', card: 'bg-gray-900', text: 'text-green-400', accent: 'green' }, cost: 200 },
  { id: 'forest', name: 'Forest', preview: '🌲', colors: { bg: 'bg-green-50', card: 'bg-white', text: 'text-stone-900', accent: 'green' }, cost: 150 },
  { id: 'royal', name: 'Royal', preview: '👑', colors: { bg: 'bg-purple-50', card: 'bg-white', text: 'text-stone-900', accent: 'purple' }, cost: 200 },
];

// --- SHOP: POWER-UPS & BOOSTERS ---
export const POWER_UP_DEFS = [
  { id: 'skip', name: 'Skip Word', emoji: '⏭️', desc: 'Skip the current word without penalty', cost: 30 },
  { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers', cost: 40 },
  { id: 'reveal_letter', name: 'Reveal Letter', emoji: '💡', desc: 'Reveal the first letter in spelling mode', cost: 25 },
];

export const BOOSTERS_DEFS = [
  { id: 'streak_freeze', name: 'Streak Freeze', emoji: '🧊', desc: 'Protect your streak for 1 missed day', cost: 200 },
  { id: 'lucky_spin', name: 'Lucky Spin Token', emoji: '🎰', desc: 'Spin the wheel for random rewards', cost: 150 },
  { id: 'xp_booster', name: '2x XP Booster', emoji: '🚀', desc: 'Double XP for 24 hours', cost: 300 },
];

// --- SHOP: COSMETICS ---
export const NAME_FRAMES = [
  { id: 'gold', name: 'Gold Frame', preview: '🥇', border: 'ring-4 ring-yellow-400', cost: 200 },
  { id: 'fire', name: 'Fire Frame', preview: '🔥', border: 'ring-4 ring-orange-500', cost: 300 },
  { id: 'diamond', name: 'Diamond Frame', preview: '💎', border: 'ring-4 ring-cyan-400', cost: 500 },
  { id: 'rainbow', name: 'Rainbow Frame', preview: '🌈', border: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-pink-200', cost: 400 },
  { id: 'lightning', name: 'Lightning Frame', preview: '⚡', border: 'ring-4 ring-amber-300 shadow-lg shadow-amber-200', cost: 350 },
  { id: 'crown', name: 'Crown Frame', preview: '👑', border: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-200', cost: 750 },
];

export const NAME_TITLES = [
  { id: 'champion', name: 'Champion', display: 'Champion', cost: 150 },
  { id: 'genius', name: 'Genius', display: 'Genius', cost: 200 },
  { id: 'word_wizard', name: 'Word Wizard', display: 'Word Wizard', cost: 300 },
  { id: 'vocab_king', name: 'Vocab King', display: 'Vocab King', cost: 250 },
  { id: 'vocab_queen', name: 'Vocab Queen', display: 'Vocab Queen', cost: 250 },
  { id: 'speed_demon', name: 'Speed Demon', display: 'Speed Demon', cost: 400 },
  { id: 'legend', name: 'Living Legend', display: 'Living Legend', cost: 500 },
  { id: 'brain', name: 'Big Brain', display: 'Big Brain', cost: 350 },
];

// --- GAME: LETTER COLORS ---
export const LETTER_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F59E0B","#6366F1"];

export type GameMode = "classic" | "listening" | "spelling" | "matching" | "true-false" | "flashcards" | "scramble" | "reverse" | "letter-sounds" | "sentence-builder";
