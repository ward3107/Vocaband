/**
 * Subject ("Voca") identity used across the teacher experience.  A teacher
 * can be entitled to one or more subjects via users.subjects_taught; the
 * activeVoca state in App.tsx narrows that to the one currently in use.
 *
 * Centralising the type + helpers here lets every leaf component that
 * branches on subject (dashboard sections, class card labels, gradebook
 * word-lookup, etc.) import a single source of truth instead of redeclaring
 * the union or duplicating the entitlement logic.
 */

import type { AppUser } from "./supabase";

export type VocaId = "english" | "hebrew";

export const SUBJECTS: readonly VocaId[] = ["english", "hebrew"];

/** Where activeVoca is persisted across same-tab refreshes. */
export const ACTIVE_VOCA_KEY = "vocaband:activeVoca";

export const isVocaId = (value: unknown): value is VocaId =>
  value === "english" || value === "hebrew";

/**
 * Which subjects a teacher is entitled to.  Defaults to ['english'] for
 * legacy rows where subjects_taught is null.  Students get an empty array;
 * the picker / activeVoca state are teacher-only concepts.
 */
export const getEntitledVocas = (u: AppUser | null): VocaId[] => {
  if (!u || u.role !== "teacher") return [];
  const raw = (u.subjectsTaught ?? ["english"]) as string[];
  return raw.filter(isVocaId);
};
