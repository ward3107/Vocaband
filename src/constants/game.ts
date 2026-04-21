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
// 2026 rebalance — these values were tuned against the target earn curve:
//   casual student ~200 XP/week · regular ~400 · grinder ~700.
// Old values felt either too slow (single flat bonus) or too fast (early
// items were priced below one session's output).  See PR notes for the
// cost/time table this targets.

// Bonus XP for completing a mode for the first time on an assignment
export const FIRST_COMPLETION_BONUS = 50;
// Streak bonus: streak × this value added to each game's XP
// Bumped from 5 → 8 to reward daily habit harder (was ~+50 @ 10-day, now +80).
export const STREAK_XP_MULTIPLIER = 8;

// Streaks worth a confetti + toast celebration.  Hit any of these and
// the save-progress handler fires celebrate('big') + a "X-day streak!"
// toast.  Tuned to reward the weekly cadence (7), the two-week habit
// (14), month-long commitment (30), and the rarer long hauls (50, 100).
export const STREAK_CELEBRATION_MILESTONES: readonly number[] = [7, 14, 30, 50, 100];
// Perfect-score bonus: flat XP for scoring 100/100 on an assignment.  Gives
// strong students a reason to retry a mode after a 90 instead of moving on.
export const PERFECT_SCORE_BONUS = 25;
// First time a word is mastered (≥5 correct attempts across modes).  Tracked
// against the word_attempts table — a student earns this the session it
// crosses the threshold, so mastery feels like a visible reward moment.
export const WORD_MASTERY_BONUS = 5;
// One-shot bonus when the student hits today's daily goal.
export const DAILY_GOAL_BONUS = 30;

// Thresholds used across the shop + pet evolution to gate progression.
export const MASTERY_THRESHOLD = 5; // correct answers before a word counts as "mastered"

// --- TEACHER REWARDS ---
// Teachers can manually reward students for hard work, participation, etc.
// No hard limits (trust teacher judgment), but all rewards are logged for audit.

// XP preset amounts for quick selection
export const TEACHER_XP_PRESETS = [10, 25, 50, 100] as const;

// Special badges teachers can award (recognition for effort/behavior)
export const TEACHER_BADGES = [
  { id: '⭐', label: 'Star Student' },
  { id: '🌟', label: 'Shining Star' },
  { id: '👏', label: 'Great Effort' },
  { id: '🤝', label: 'Helper' },
  { id: '🔥', label: 'On Fire' },
  { id: '💪', label: 'Persistent' },
  { id: '🎯', label: 'Focused' },
  { id: '🚀', label: 'Rising Star' },
  { id: '🦸', label: 'Hero' },
  { id: '👑', label: 'Class Champion' },
] as const;

// Locked avatars teachers can unlock for students
export const LOCKED_AVATARS = [
  '🦸', '🧙', '🧚', '🧜', '🧝', '🧛', '🧟', '🧞', '🦹', '🐉',
  '🦄', '🦋', '🐞', '🦩', '🦚', '🦜', '🐇', '🐼', '🦁', '🐯'
] as const;

// Special titles teachers can award
export const TEACHER_TITLES = [
  'Class Champion', 'Mentor', 'Leader', 'Inspiration',
  'Dedicated', 'Enthusiastic', 'Reliable', 'Creative'
] as const;

// --- CLASS AVATARS (teacher dashboard) ---
// Curated pool teachers pick from when naming/customising a class.
// Selection rules (chosen to meet teaching standards in Israel and
// internationally):
//   - NO religious symbols (Star of David, crescent, cross, om, dharma)
//   - NO national flags (avoids favouritism in mixed-population classes)
//   - NO weapons, alcohol, smoking, gambling, or violent imagery
//   - NO faces / hand gestures (cultural ambiguity — many gestures that
//     are friendly in one culture are offensive in another)
//   - NO political figures or symbols
// What's IN: education tools, science, neutral animals, nature, sports
// (universally played), arts, abstract symbols.  Grouped by theme so
// the picker UI stays scannable.
export const CLASS_AVATAR_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'School',  emojis: ['📚','📖','✏️','📝','🎓','🍎','💡','🔔','📐','🖋️','📏','📓'] },
  { label: 'Science', emojis: ['🌍','🔭','🔬','🧪','🚀','🛰️','🧠','⚛️','🧬','🌌','🧲','🛸'] },
  { label: 'Animals', emojis: ['🦊','🐻','🦁','🐯','🐼','🐰','🦋','🦉','🐢','🐺','🐬','🦒'] },
  { label: 'Nature',  emojis: ['🌳','🌻','🌈','⭐','🌙','☀️','🌊','🏔️','🍀','🌸','🍃','🪴'] },
  { label: 'Sports',  emojis: ['⚽','🏀','🎾','🏊','🚴','🏓','🏐','🥇','🥈','🥉','🏆','🏅'] },
  { label: 'Arts',    emojis: ['🎨','🎭','🎬','🎵','🎲','🎹','🎸','🥁','🎺','🎤','🪄','🎪'] },
];
// Flat list helper for places that want a single iterable.
export const CLASS_AVATARS = CLASS_AVATAR_GROUPS.flatMap(g => g.emojis);

// --- ASSIGNMENT REPLAY CAP (anti-farm) ---
// Students can complete each assignment at most this many ROUNDS,
// where one round = playing every allowed mode once.  So if the
// teacher enables 5 modes on an assignment, the student can play a
// total of 3 × 5 = 15 games before the assignment locks.  Counts
// are tracked client-side in localStorage (see readAssignmentPlays
// in App.tsx) — simple, no schema change, good enough for an
// anti-farm safeguard.
//
// Previously tracked as flat "plays" (3 plays total regardless of
// mode count).  Changed after user clarified: "plays the 5 modes
// three times — 5 + 5 + 5 — then the assignment is locked."
export const MAX_ASSIGNMENT_ROUNDS = 3;
// Back-compat alias — old code still imports MAX_ASSIGNMENT_REPLAYS.
// It now means "rounds" not "total plays"; downstream consumers
// compute total-plays-allowed as MAX_ASSIGNMENT_ROUNDS *
// allowedModes.length.
export const MAX_ASSIGNMENT_REPLAYS = MAX_ASSIGNMENT_ROUNDS;

export const XP_TITLES = [
  { min: 0, title: 'Beginner', emoji: '🌱' },
  { min: 100, title: 'Learner', emoji: '📚' },
  { min: 300, title: 'Scholar', emoji: '🎓' },
  { min: 700, title: 'Expert', emoji: '🏅' },
  { min: 1500, title: 'Master', emoji: '👑' },
  { min: 3000, title: 'Legend', emoji: '🌟' },
  // Endgame tiers added in 2026 — keeps top students with something to chase.
  { min: 6000,  title: 'Mythic',   emoji: '🔮' },
  { min: 12000, title: 'Ascended', emoji: '✨' },
];
export const getXpTitle = (xpAmount: number) => XP_TITLES.filter(t => xpAmount >= t.min).pop() ?? XP_TITLES[0];

// --- SHOP: AVATARS ---
// Tiering (2026): common 50-150, rare 200-350, epic 400-700.
// Dragon/Eagle were absurdly cheap — pushed them up so they feel earned.
export const PREMIUM_AVATARS = [
  { emoji: '🐉', name: 'Dragon', cost: 150 },
  { emoji: '🦅', name: 'Eagle', cost: 125 },
  { emoji: '🐺', name: 'Wolf', cost: 150 },
  { emoji: '🦖', name: 'Dinosaur', cost: 175 },
  { emoji: '🧙‍♂️', name: 'Wizard', cost: 225 },
  { emoji: '🦸', name: 'Superhero', cost: 275 },
  { emoji: '👾', name: 'Alien', cost: 275 },
  { emoji: '🤴', name: 'Prince', cost: 325 },
  { emoji: '👸', name: 'Princess', cost: 325 },
  { emoji: '🦄', name: 'Unicorn', cost: 500 },
  { emoji: '🐲', name: 'Dragon Face', cost: 200 },
  { emoji: '🧛', name: 'Vampire', cost: 275 },
  { emoji: '🧜', name: 'Merperson', cost: 250 },
  { emoji: '🥷', name: 'Ninja', cost: 300 },
  { emoji: '🤖', name: 'Robot', cost: 175 },
  // 2026 additions — popular with kids globally + in Israeli schools.
  { emoji: '🐐', name: 'GOAT', cost: 600 },
  { emoji: '👨‍🚀', name: 'Astronaut', cost: 325 },
  { emoji: '🧑‍💻', name: 'Coder', cost: 275 },
  { emoji: '🧙‍♀️', name: 'Witch', cost: 225 },
  { emoji: '🦹', name: 'Super Villain', cost: 300 },
  { emoji: '🎧', name: 'DJ', cost: 225 },
  { emoji: '🎮', name: 'Pro Gamer', cost: 250 },
  { emoji: '🏆', name: 'Champion', cost: 550 },
  { emoji: '🦾', name: 'Cyborg', cost: 325 },
  { emoji: '🧝', name: 'Elf', cost: 275 },
  { emoji: '🧞', name: 'Genie', cost: 350 },
  { emoji: '🐙', name: 'Kraken', cost: 225 },
  { emoji: '🦉', name: 'Owl Sage', cost: 175 },
  { emoji: '🪐', name: 'Planet Master', cost: 450 },
  { emoji: '⚡', name: 'Lightning', cost: 275 },
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
  // 2026 rebalance: compressed the top end so these stop feeling
  // unreachable (Space was 1500, ~3-5 weeks of consistent play).
  WarriorPack: { xpRequired: 800, label: '800 XP' },
  Fantasy: { xpRequired: 700, label: '700 XP' },
  SpaceLegends: { xpRequired: 900, label: '900 XP' },
  Space: { xpRequired: 1200, label: '1200 XP' },
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

// --- SHOP: MYSTERY EGGS & CHESTS ---
// Eggs and chests give students a gamified XP-sink + reward loop. Each
// defines a cost, a description, and a random-drop payload range. The
// client opens them via a dedicated RPC (open_mystery_egg) which rolls
// the reward server-side so it can't be spoofed. Fallback for a missing
// RPC: open_mystery_egg can be added in a later migration — until then
// the UI surfaces the shop entries and the open action will just show
// a coming-soon toast. No behavioural breakage.
export const MYSTERY_EGGS = [
  // 2026 rebalance: eggs now average near break-even on XP — students
  // open them for the excitement of a rare drop, not guaranteed profit.
  // Rainbow is the 2-month endgame goal at 2000 XP.
  {
    id: 'starter_egg',
    name: 'Starter Egg',
    emoji: '🥚',
    desc: 'A simple egg. Drops 15-40 XP.',
    cost: 50,
    rarity: 'common' as const,
    minXp: 15, maxXp: 40,
  },
  {
    id: 'golden_egg',
    name: 'Golden Egg',
    emoji: '🐣',
    desc: 'Sparkles gold. Drops 50-120 XP + a small chance of a rare avatar.',
    cost: 150,
    rarity: 'rare' as const,
    minXp: 50, maxXp: 120,
  },
  {
    id: 'dragon_egg',
    name: 'Dragon Egg',
    emoji: '🐉',
    desc: 'Something mighty inside. Drops 150-280 XP.',
    cost: 350,
    rarity: 'epic' as const,
    minXp: 150, maxXp: 280,
  },
  {
    id: 'treasure_chest',
    name: 'Treasure Chest',
    emoji: '🎁',
    desc: 'Premium loot. Drops 300-500 XP + guaranteed cosmetic.',
    cost: 600,
    rarity: 'legendary' as const,
    minXp: 300, maxXp: 500,
  },
  {
    id: 'cosmic_egg',
    name: 'Cosmic Egg',
    emoji: '🌟',
    desc: 'Made of stardust. Drops 600-900 XP + a premium title.',
    cost: 1000,
    rarity: 'legendary' as const,
    minXp: 600, maxXp: 900,
  },
  {
    id: 'rainbow_egg',
    name: 'Rainbow Egg',
    emoji: '🌈',
    desc: 'The rarest egg. Drops 1200-1800 XP + a random premium avatar.',
    cost: 2000,
    rarity: 'mythic' as const,
    minXp: 1200, maxXp: 1800,
  },
];

// --- SHOP: POWER-UPS & BOOSTERS ---
// Power-ups consume on use (inventory count) — students stack them.
// Boosters are one-shot buffs with a duration (handled in App.tsx).
// 2026 rebalance: power-ups were too cheap (25-50) — one assignment
// bought 3 of them, making games trivial.  Bumped across the board.
export const POWER_UP_DEFS = [
  { id: 'skip', name: 'Skip Word', emoji: '⏭️', desc: 'Skip the current word without penalty', cost: 50 },
  { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers', cost: 60 },
  { id: 'reveal_letter', name: 'Reveal Letter', emoji: '💡', desc: 'Reveal the first letter in spelling mode', cost: 40 },
  { id: 'double_points', name: 'Double Points', emoji: '2️⃣', desc: 'Next correct answer = 2× XP', cost: 80 },
  { id: 'time_freeze', name: 'Time Freeze', emoji: '⏰', desc: 'Add 10 seconds on timed modes', cost: 60 },
  { id: 'peek', name: 'Peek', emoji: '👁️', desc: 'Reveal the correct answer for 1 second', cost: 70 },
];

// 2026 rebalance: streak_freeze dropped (it's defensive), xp_booster
// bumped (it's very strong at 2×), weekend_warrior bumped (full weekend).
export const BOOSTERS_DEFS = [
  { id: 'streak_freeze', name: 'Streak Freeze', emoji: '🧊', desc: 'Protect your streak for 1 missed day', cost: 150 },
  { id: 'lucky_spin', name: 'Lucky Spin Token', emoji: '🎰', desc: 'Spin the wheel for random rewards', cost: 150 },
  { id: 'xp_booster', name: '2× XP Booster', emoji: '🚀', desc: 'Double XP for 24 hours', cost: 400 },
  { id: 'lucky_charm', name: 'Lucky Charm', emoji: '🍀', desc: 'Your first wrong answer in the next game is forgiven', cost: 180 },
  { id: 'focus_mode', name: 'Focus Mode', emoji: '🎯', desc: 'Distraction-free theme for 1 hour', cost: 120 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', emoji: '📅', desc: '2× XP for an entire weekend', cost: 500 },
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

// 2026 rebalance: Champion + Genius bumped a little so they aren't
// instant-grabs in the first week.
export const NAME_TITLES = [
  { id: 'champion', name: 'Champion', display: 'Champion', cost: 200 },
  { id: 'genius', name: 'Genius', display: 'Genius', cost: 275 },
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

// --- RETENTION: PET EVOLUTION REWARDS ---
// The dashboard PetCompanion evolves through XP thresholds (egg → dragon).
// Each evolution is also a one-shot reward: the student either gets a
// chunk of bonus XP or unlocks a special shop item tied to that stage.
// Rewards are claimed on the dashboard when the student crosses the
// threshold and persist in localStorage to prevent re-claim spam.
export type PetRewardKind = 'xp' | 'unlock_avatar' | 'unlock_title' | 'unlock_frame';
export interface PetMilestone {
  stage: string;       // name of the evolution stage
  emoji: string;       // the pet emoji at this stage
  xpRequired: number;  // cumulative XP to reach this stage
  reward: {
    kind: PetRewardKind;
    value: number | string; // XP amount OR item id
    label: string;      // human-readable reward description
  };
}

export const PET_MILESTONES: PetMilestone[] = [
  { stage: 'Egg',       emoji: '🥚',  xpRequired: 0,    reward: { kind: 'xp',            value: 0,              label: 'Starting out' } },
  { stage: 'Hatchling', emoji: '🐣',  xpRequired: 100,  reward: { kind: 'xp',            value: 50,             label: '+50 XP bonus' } },
  { stage: 'Fox Kit',   emoji: '🦊',  xpRequired: 300,  reward: { kind: 'unlock_avatar', value: '🦊',            label: 'Free Fox avatar' } },
  { stage: 'Eagle',     emoji: '🦅',  xpRequired: 700,  reward: { kind: 'xp',            value: 150,            label: '+150 XP bonus' } },
  { stage: 'Dragon',    emoji: '🐉',  xpRequired: 1500, reward: { kind: 'unlock_frame',  value: 'gold',         label: 'Free Gold Frame' } },
  { stage: 'Unicorn',   emoji: '🦄',  xpRequired: 3000, reward: { kind: 'unlock_title',  value: 'legend',       label: 'Free "Living Legend" title' } },
  { stage: 'Mythic',    emoji: '🔮',  xpRequired: 6000, reward: { kind: 'unlock_avatar', value: '🦄',            label: 'Free Unicorn avatar' } },
  { stage: 'Ascended',  emoji: '✨',  xpRequired: 12000, reward: { kind: 'unlock_frame', value: 'holographic',  label: 'Free Holographic Frame' } },
];

// --- RETENTION: DAILY / WEEKLY / COMEBACK / LIMITED ---
// Daily chest reward ranges — cycles gently to feel varied but never
// feels like "less than yesterday".  A weekly challenge multiplier
// kicks in after 5 plays in a calendar week.
export const DAILY_CHEST_XP = { min: 20, max: 60 };
export const WEEKLY_CHALLENGE_PLAYS = 5;      // plays required
export const WEEKLY_CHALLENGE_REWARD_XP = 100; // + a free common egg (granted via RPC)
export const COMEBACK_AFTER_DAYS = 3;          // offline this many days → free golden egg on return
export const LIMITED_ITEM_ROTATION_DAYS = 7;   // limited cosmetic rotates weekly

// Rotating limited-time items (one visible at a time).  The active item
// is picked from this pool modulo current ISO-week so all students see
// the same "hot drop" at once.  Items are regular shop SKUs priced at
// ~20% off — the scarcity itself drives the FOMO, not a custom price.
export const LIMITED_ROTATION: { kind: 'avatar' | 'frame' | 'title' | 'theme'; itemId: string; discount: number; tagline: string }[] = [
  { kind: 'avatar', itemId: '🐉',            discount: 0.2, tagline: 'Week of the Dragon' },
  { kind: 'frame',  itemId: 'holographic',    discount: 0.2, tagline: 'Holo Week' },
  { kind: 'title',  itemId: 'goated',         discount: 0.2, tagline: 'GOATed Drop' },
  { kind: 'theme',  itemId: 'galaxy',         discount: 0.2, tagline: 'Galaxy Week' },
  { kind: 'avatar', itemId: '🦄',            discount: 0.2, tagline: 'Unicorn Season' },
  { kind: 'frame',  itemId: 'crown',          discount: 0.2, tagline: 'Reign Week' },
  { kind: 'title',  itemId: 'final_boss',     discount: 0.2, tagline: 'Final Boss Week' },
  { kind: 'avatar', itemId: '🐐',            discount: 0.2, tagline: 'GOAT Energy' },
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
