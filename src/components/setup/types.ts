import type { Word } from '../../data/vocabulary';
import { SentenceDifficulty } from '../../constants/game';

// --- Wizard Mode ---
export type WizardMode = 'quick-play' | 'assignment';

// --- Game Mode Definitions ---
export interface GameModeDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export const GAME_MODE_LEVELS: Record<string, GameModeDef[]> = {
  beginner: [
    { id: 'flashcards', name: 'Flashcards', emoji: '📇', color: 'from-emerald-400 to-emerald-500' },
    { id: 'matching', name: 'Matching', emoji: '🃏', color: 'from-teal-400 to-teal-500' },
    { id: 'classic', name: 'Classic', emoji: '🎯', color: 'from-blue-400 to-blue-500' },
    { id: 'memory-flip', name: 'Memory Flip', emoji: '🧠', color: 'from-pink-400 to-pink-500' },
  ],
  intermediate: [
    { id: 'listening', name: 'Listening', emoji: '👂', color: 'from-violet-400 to-violet-500' },
    { id: 'true-false', name: 'True/False', emoji: '✅', color: 'from-purple-400 to-purple-500' },
    { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔊', color: 'from-fuchsia-400 to-fuchsia-500' },
    { id: 'idiom', name: 'Idioms', emoji: '💭', color: 'from-sky-400 to-sky-500' },
    { id: 'speed-round', name: 'Speed Round', emoji: '⚡', color: 'from-red-400 to-red-500' },
  ],
  advanced: [
    { id: 'spelling', name: 'Spelling', emoji: '✍️', color: 'from-orange-400 to-orange-500' },
    { id: 'reverse', name: 'Reverse', emoji: '🔁', color: 'from-amber-400 to-amber-500' },
    { id: 'scramble', name: 'Scramble', emoji: '🔤', color: 'from-yellow-400 to-yellow-500' },
    { id: 'fill-blank', name: 'Fill in the Blank', emoji: '✏️', color: 'from-lime-400 to-lime-500' },
    { id: 'word-chains', name: 'Word Chains', emoji: '🔗', color: 'from-orange-400 to-amber-500' },
  ],
  mastery: [
    { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', color: 'from-rose-400 to-rose-500' },
  ],
};

export const ALL_GAME_MODE_IDS = Object.values(GAME_MODE_LEVELS).flat().map(m => m.id);

// Default mode selection for a brand-new assignment — every mode turned
// on EXCEPT Sentence Builder and Fill in the Blank.  Teachers asked for
// this explicitly: the previous default of just `['flashcards']` meant
// they had to hand-tick every other mode before saving, and many shipped
// assignments with only flashcards enabled by accident.  Sentence Builder
// and Fill in the Blank stay opt-in because they require extra
// configuration (sentence difficulty + sentence bank) so we don't want
// to land the teacher in that UI state unless they've asked for it.
export const DEFAULT_ASSIGNMENT_MODE_IDS = ALL_GAME_MODE_IDS.filter(
  id => id !== 'sentence-builder' && id !== 'fill-blank',
);

// ── Difficulty tiers ─────────────────────────────────────────────────────────
// Three-tier difficulty used across every mode picker (assignment, quick
// play, demo) so students + teachers know at a glance how hard a mode is
// before they pick it. Ordered by cognitive load, NOT by how fun the mode
// is — flashcards are "easy" because they're the learning mode with no
// pressure, sentence-builder is "hard" because it needs vocab AND grammar.
export type ModeDifficulty = 'easy' | 'medium' | 'hard';

export const MODE_DIFFICULTY: Record<string, ModeDifficulty> = {
  flashcards:       'easy',      // Learning mode, no testing
  matching:         'easy',      // Pairs visible on screen, pure recognition
  classic:          'easy',      // Multi-choice with audio help
  'memory-flip':    'easy',      // Recognition + short-term memory load
  'true-false':     'easy',      // Binary decision
  listening:        'medium',    // Audio-only recognition
  reverse:          'medium',    // Translation-to-English recognition
  idiom:            'medium',    // Multi-choice on figurative meaning
  'speed-round':    'medium',    // Recognition under 60s timer (penalty for wrong)
  scramble:         'hard',      // Recall with letter hints
  'letter-sounds':  'hard',      // Phonics + spelling
  spelling:         'hard',      // Pure recall + exact spelling
  'sentence-builder': 'hard',    // Vocab + grammar + syntax
  'fill-blank':     'hard',      // Read sentence in L2, infer missing word from context
  'word-chains':    'hard',      // Free-text typing chained on previous letter
};

export const DIFFICULTY_META: Record<ModeDifficulty, {
  label: string;              // localise in the UI by reading these keys
  stars: number;              // how many filled stars out of 3 — telegraphs difficulty visually without needing a legend
  starColor: string;          // tailwind class for the filled star colour
  tint: string;               // ring / border tint if needed
  badgeBg: string;            // small chip background on each tile
  badgeText: string;          // small chip text colour
  description: string;        // one-line explanation for the legend tooltip
}> = {
  easy: {
    label: 'Easy',
    stars: 1,
    starColor: 'text-emerald-500',
    tint: 'ring-emerald-200',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    description: 'Recognition only — the answer is in front of you.',
  },
  medium: {
    label: 'Medium',
    stars: 2,
    starColor: 'text-amber-500',
    tint: 'ring-amber-200',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    description: 'Some clues, but you need to think.',
  },
  hard: {
    label: 'Hard',
    stars: 3,
    starColor: 'text-rose-500',
    tint: 'ring-rose-200',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    description: 'Type or build the answer from memory.',
  },
};

export function getModeDifficulty(modeId: string): ModeDifficulty {
  return MODE_DIFFICULTY[modeId] ?? 'medium';
}

// ── Assignment mode picker sections ──────────────────────────────────────
// Teachers asked for the mode picker to read easy → hard top-to-bottom and
// for the AI-powered modes to stand on their own.  Sentence Builder and
// Fill-in-the-Blank live in their own band because they're the only modes
// that consume a sentence bank, and that sentence bank can be auto-generated
// by the Pro AI feature — so they need extra setup and shouldn't blend in
// with ordinary "hard" recall modes.
export interface AssignmentModeSection {
  id: 'easy' | 'medium' | 'hard' | 'ai';
  label: string;
  description: string;
  stars: number | null;          // 1-3 for difficulty bands, null for AI band
  starColor: string;
  badgeBg: string;
  badgeText: string;
  modes: GameModeDef[];
}

// Ordering within each section is intentional — runs from gentlest to
// hardest mode within the section so the whole picker reads top-down.
const SECTION_MODE_ORDER: Record<AssignmentModeSection['id'], string[]> = {
  easy:   ['flashcards', 'matching', 'classic', 'memory-flip', 'true-false'],
  medium: ['listening', 'reverse', 'idiom', 'speed-round'],
  hard:   ['scramble', 'letter-sounds', 'spelling', 'word-chains'],
  ai:     ['sentence-builder', 'fill-blank'],
};

const ALL_MODES_FLAT = Object.values(GAME_MODE_LEVELS).flat();

function lookupModes(ids: string[]): GameModeDef[] {
  return ids
    .map(id => ALL_MODES_FLAT.find(m => m.id === id))
    .filter((m): m is GameModeDef => m !== undefined);
}

export const ASSIGNMENT_MODE_SECTIONS: AssignmentModeSection[] = [
  {
    id: 'easy',
    label: DIFFICULTY_META.easy.label,
    description: DIFFICULTY_META.easy.description,
    stars: DIFFICULTY_META.easy.stars,
    starColor: DIFFICULTY_META.easy.starColor,
    badgeBg: DIFFICULTY_META.easy.badgeBg,
    badgeText: DIFFICULTY_META.easy.badgeText,
    modes: lookupModes(SECTION_MODE_ORDER.easy),
  },
  {
    id: 'medium',
    label: DIFFICULTY_META.medium.label,
    description: DIFFICULTY_META.medium.description,
    stars: DIFFICULTY_META.medium.stars,
    starColor: DIFFICULTY_META.medium.starColor,
    badgeBg: DIFFICULTY_META.medium.badgeBg,
    badgeText: DIFFICULTY_META.medium.badgeText,
    modes: lookupModes(SECTION_MODE_ORDER.medium),
  },
  {
    id: 'hard',
    label: DIFFICULTY_META.hard.label,
    description: DIFFICULTY_META.hard.description,
    stars: DIFFICULTY_META.hard.stars,
    starColor: DIFFICULTY_META.hard.starColor,
    badgeBg: DIFFICULTY_META.hard.badgeBg,
    badgeText: DIFFICULTY_META.hard.badgeText,
    modes: lookupModes(SECTION_MODE_ORDER.hard),
  },
  {
    id: 'ai',
    label: 'AI-powered',
    description: 'Sentence-based modes — generate with AI or add your own.',
    stars: null,
    starColor: 'text-fuchsia-500',
    badgeBg: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-700',
    modes: lookupModes(SECTION_MODE_ORDER.ai),
  },
];

// --- Wizard Result ---
export interface WizardResult {
  words: Word[];
  modes: string[];
}

// --- Assignment Data (for edit flow) ---
export interface AssignmentData {
  id: string;
  title: string;
  wordIds: number[];
  words?: Word[];
  deadline?: string | null;
  allowedModes?: string[];
  classId: string;
  sentences?: string[];
  sentenceDifficulty?: SentenceDifficulty;
  createdAt?: string;
}

// --- Sub-steps for word input ---
export type WordInputSubStep = 'paste' | 'editor' | 'browse' | 'saved-groups' | 'topic-packs' | 'ocr';

// --- Helper: look up game mode display config by ID ---
export function getGameModeConfig(modeId: string): GameModeDef | undefined {
  return Object.values(GAME_MODE_LEVELS).flat().find(m => m.id === modeId);
}
