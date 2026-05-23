/**
 * dreidel.ts — shared constants for the Dreidel live blitz mode.
 *
 * Imported by both the client (lobby + game views) and the server
 * (state machine).  Keep this file pure: no React, no Node, no
 * socket imports.
 */

import type { DreidelConfig } from "./types";

/** Rare letters that pay 2× points to reward risk. */
export const DREIDEL_RARE_LETTERS = ["J", "Q", "X", "Z"] as const;

/** Letters used in normal rounds — full A-Z. */
export const DREIDEL_ALL_LETTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Letters used in sudden death — only rare ones, drops timer too. */
export const DREIDEL_SUDDEN_DEATH_LETTERS = [...DREIDEL_RARE_LETTERS];

/** Minimum word length students may submit. Blocks "I", "an", etc. */
export const DREIDEL_MIN_WORD_LEN = 3;

/** Base points for a correct answer; doubled on rare letters. */
export const DREIDEL_POINTS_PER_CORRECT = 10;

/** Bonus life every Nth correct streak (per player). */
export const DREIDEL_LIFE_STREAK = 10;

/** Steal-a-life triggers when winner answers within this window. */
export const DREIDEL_STEAL_WINDOW_MS = 2000;

/** Sudden-death timer cap (seconds). */
export const DREIDEL_SUDDEN_DEATH_SECONDS = 4;

/** Spin animation duration before the letter is revealed. */
export const DREIDEL_SPIN_DURATION_MS = 2200;

/** Brief window after a round to show the winner before the next spin. */
export const DREIDEL_ROUND_END_MS = 2200;

/** Power-up XP costs and effects. */
export const DREIDEL_POWERUPS = {
  skip:      { id: "skip" as const,      emoji: "⏭️", labelKey: "skip",      xpCost: 50 },
  peek:      { id: "peek" as const,      emoji: "💡", labelKey: "peek",      xpCost: 60 },
  extraTime: { id: "extraTime" as const, emoji: "⏱️", labelKey: "extraTime", xpCost: 40 },
} as const;

/** Default teacher-config — used to pre-fill the lobby form. */
export const DEFAULT_DREIDEL_CONFIG: DreidelConfig = {
  startingLives: 3,
  timerSeconds: 8,
  topicMode: false,
  powerUpsEnabled: true,
  suddenDeath: true,
  stealOnFast: true,
};

/** Topic pool for topicMode. Drawn at random per round when enabled. */
export const DREIDEL_TOPICS = [
  "animals",
  "food",
  "sports",
  "colors",
  "clothing",
  "school",
  "verbs",
  "feelings",
  "nature",
  "household",
  "jobs",
  "transport",
] as const;

export type DreidelTopic = typeof DREIDEL_TOPICS[number];

export function isRareLetter(letter: string): boolean {
  return DREIDEL_RARE_LETTERS.includes(letter.toUpperCase() as typeof DREIDEL_RARE_LETTERS[number]);
}

export function pointsForLetter(letter: string): number {
  return isRareLetter(letter) ? DREIDEL_POINTS_PER_CORRECT * 2 : DREIDEL_POINTS_PER_CORRECT;
}
