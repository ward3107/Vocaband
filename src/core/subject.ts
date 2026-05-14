/**
 * Subject ("Voca") identity used across the teacher experience.  Each
 * teacher account belongs to exactly one Voca (users.subject); admin
 * accounts get entry to all Vocas regardless of their own users.subject
 * value, so the developer can manage every Voca from one login.
 *
 * Centralising the type + helpers here lets every leaf component that
 * branches on subject (dashboard sections, class card labels, gradebook
 * word-lookup, etc.) import a single source of truth instead of redeclaring
 * the union or duplicating the entitlement logic.
 */

import type { AppUser } from "./supabase";

export type VocaId = "english" | "hebrew";

export const SUBJECTS: readonly VocaId[] = ["english", "hebrew"];

/** Where activeVoca is persisted across same-tab refreshes.  Only used
 *  for admins (the only role that can switch Vocas in-session). */
export const ACTIVE_VOCA_KEY = "vocaband:activeVoca";

export const isVocaId = (value: unknown): value is VocaId =>
  value === "english" || value === "hebrew";

/**
 * Which Vocas a user can enter.
 *
 * - admin → all Vocas (developer needs entry to every Voca)
 * - teacher → exactly one Voca, taken from users.subject (defaults to 'english')
 * - everyone else → []
 *
 * The teacher case always returns a length-1 array, which makes the
 * activeVoca routing in App.tsx auto-skip the picker for them.  The
 * picker only renders for callers where this returns length >= 2,
 * i.e. admins.
 */
export const getEntitledVocas = (u: AppUser | null): VocaId[] => {
  if (!u) return [];
  if (u.role === "admin") return [...SUBJECTS];
  if (u.role !== "teacher") return [];
  const s = u.subject;
  return [isVocaId(s) ? s : "english"];
};
