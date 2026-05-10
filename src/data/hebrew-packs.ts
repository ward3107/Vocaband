// VocaHebrew — assignment-pack taxonomy.
//
// A "pack" is a Hebrew-native, teacher-pickable group of lemmas for the
// assignment wizard. Packs derive from gradeBand + theme on each lemma
// rather than carrying a new field — a word can belong to multiple packs
// (it's both "5-6" AND "animals") with no data duplication.
//
// Hebrew-only file. Never imports from vocabulary.ts (English source).
// Mirrors no part of "Set 1 / Set 2 / Set 3" — those are English-only.

import type { HebrewGradeBand, HebrewLemma } from "./types-hebrew";
import { HEBREW_LEMMAS } from "./vocabulary-hebrew";

export type HebrewPackKind = "grade" | "theme";

export interface HebrewPack {
  /** Stable slug — never rename, used as React key + URL fragment. */
  id: string;
  kind: HebrewPackKind;
  /** Hebrew display label shown to teachers. */
  labelHe: string;
  /** Visual marker for the wizard tile. */
  emoji: string;
  /** One-line Hebrew description, classroom-appropriate. */
  descriptionHe: string;
  /** Pure predicate over a lemma — no side effects. */
  filter: (lemma: HebrewLemma) => boolean;
}

const gradePack = (
  band: HebrewGradeBand,
  labelHe: string,
  emoji: string,
  descriptionHe: string,
): HebrewPack => ({
  id: `grade-${band}`,
  kind: "grade",
  labelHe,
  emoji,
  descriptionHe,
  filter: (l) => l.gradeBand === band,
});

const themePack = (
  theme: string,
  labelHe: string,
  emoji: string,
  descriptionHe: string,
): HebrewPack => ({
  id: `theme-${theme}`,
  kind: "theme",
  labelHe,
  emoji,
  descriptionHe,
  filter: (l) => l.theme === theme,
});

export const HEBREW_PACKS: readonly HebrewPack[] = [
  // ─── By grade band ─────────────────────────────────────────────
  gradePack("1-2",   "כיתות א–ב",  "🌱", "מילים בסיסיות לקריאה ראשונית"),
  gradePack("3-4",   "כיתות ג–ד",  "📖", "אוצר מילים יסודי – ניקוד מלא"),
  gradePack("5-6",   "כיתות ה–ו",  "🔍", "מורפולוגיה, משקלים והבחנת שורש"),
  gradePack("7-9",   "כיתות ז–ט",  "🎓", "חטיבת ביניים – בניינים וסמיכות"),
  gradePack("10-12", "תיכון",       "🏛", "תנ\"ך, שירה ולשון תקנית"),

  // ─── By theme ──────────────────────────────────────────────────
  themePack("animals",      "חיות",         "🐾", "חיות בית, חיות בר וטבע"),
  themePack("family",       "משפחה",        "👨‍👩‍👧", "אבא, אמא, אחים ואחיות"),
  themePack("school",       "בית ספר",      "🏫", "כיתה, מורה, ספרים ושיעורים"),
  themePack("weather",      "מזג אוויר",    "☁️", "גשם, שמש, רוח ועונות"),
  themePack("feelings",     "רגשות",        "😊", "שמחה, עצב, פחד וכעס"),
  themePack("food",         "אוכל",          "🥖", "מזון, פירות, ירקות וארוחות"),
  themePack("body",         "גוף האדם",     "🦴", "איברים וחלקי גוף"),
  themePack("time",         "זמן",           "⏰", "שעות, ימים, חודשים ועונות"),
  themePack("verbs",        "פעלים",         "🏃", "פעלים נפוצים בשפה היומיומית"),
  themePack("household",    "בית",           "🏠", "חדרים, רהיטים וכלי בית"),
  themePack("nature",       "טבע",           "🌳", "צמחים, נופים ועצמים בטבע"),
  themePack("transport",    "תחבורה",       "🚌", "אוטובוס, רכבת, אופניים"),
  themePack("clothing",     "בגדים",         "👕", "בגדים, אביזרים ומידות"),
];

/** Look up the lemmas inside a pack. Lazy — iterates HEBREW_LEMMAS only
 *  when called, so importing the taxonomy is free. */
export function lemmasInPack(pack: HebrewPack): readonly HebrewLemma[] {
  return HEBREW_LEMMAS.filter(pack.filter);
}

/** Pre-grouped by kind so the wizard can render two sections (grade,
 *  theme) without re-filtering on every render. */
export const HEBREW_PACKS_BY_KIND: Record<HebrewPackKind, readonly HebrewPack[]> = {
  grade: HEBREW_PACKS.filter((p) => p.kind === "grade"),
  theme: HEBREW_PACKS.filter((p) => p.kind === "theme"),
};

/** Find a pack by slug — used when persisting the teacher's selection
 *  to the database (only the slug is stored, not the predicate). */
export function getHebrewPack(id: string): HebrewPack | undefined {
  return HEBREW_PACKS.find((p) => p.id === id);
}
