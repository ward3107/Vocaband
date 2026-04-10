import { Word } from '../../data/vocabulary';
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
  ],
  intermediate: [
    { id: 'listening', name: 'Listening', emoji: '👂', color: 'from-violet-400 to-violet-500' },
    { id: 'true-false', name: 'True/False', emoji: '✅', color: 'from-purple-400 to-purple-500' },
    { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔊', color: 'from-fuchsia-400 to-fuchsia-500' },
  ],
  advanced: [
    { id: 'spelling', name: 'Spelling', emoji: '✍️', color: 'from-orange-400 to-orange-500' },
    { id: 'reverse', name: 'Reverse', emoji: '🔁', color: 'from-amber-400 to-amber-500' },
    { id: 'scramble', name: 'Scramble', emoji: '🔤', color: 'from-yellow-400 to-yellow-500' },
  ],
  mastery: [
    { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', color: 'from-rose-400 to-rose-500' },
  ],
};

export const ALL_GAME_MODE_IDS = Object.values(GAME_MODE_LEVELS).flat().map(m => m.id);

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
export type WordInputSubStep = 'landing' | 'paste' | 'editor' | 'browse' | 'saved-groups' | 'topic-packs';

// --- Helper: look up game mode display config by ID ---
export function getGameModeConfig(modeId: string): GameModeDef | undefined {
  return Object.values(GAME_MODE_LEVELS).flat().find(m => m.id === modeId);
}
