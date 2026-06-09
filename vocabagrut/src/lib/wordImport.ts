import type { UnitLevel, VocabWord } from '../core/types';
import { authHeader } from './supabase';

// ─────────────────────────────────────────────────────────────────────────
// Custom-word import — three ways to add your own vocabulary:
//   1. parsePastedWords  — pure client-side, parses a pasted list.
//   2. enhanceWords      — server (Gemini) fills HE/AR/definition/example.
//   3. ocrWords          — server (Gemini) reads words from a photo.
// 2 & 3 call POST /api/words; the API key lives only on the server. When
// no key is configured the endpoint returns 503 and we surface a friendly
// notice while paste keeps working.
// ─────────────────────────────────────────────────────────────────────────

const PART_OF_SPEECH: VocabWord['partOfSpeech'][] = [
  'noun', 'verb', 'adjective', 'adverb', 'phrase', 'connector',
];

/** Thrown when the AI endpoint has no key configured (HTTP 503). */
export class AiNotConfiguredError extends Error {}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

let counter = 0;
const newId = (word: string) => `cw-${slug(word) || 'word'}-${Date.now().toString(36)}-${counter++}`;

/** Coerce a loose record (pasted field or AI JSON) into a valid VocabWord. */
function toVocabWord(
  raw: Partial<VocabWord> & { word: string },
  level: UnitLevel,
): VocabWord {
  const pos = PART_OF_SPEECH.includes(raw.partOfSpeech as VocabWord['partOfSpeech'])
    ? (raw.partOfSpeech as VocabWord['partOfSpeech'])
    : 'noun';
  const band = (['I', 'II', 'III'] as const).includes(raw.band as 'I')
    ? (raw.band as VocabWord['band'])
    : 'I';
  const frequency = (['high', 'medium', 'low'] as const).includes(raw.frequency as 'high')
    ? (raw.frequency as VocabWord['frequency'])
    : 'medium';
  return {
    id: newId(raw.word),
    word: raw.word.trim(),
    partOfSpeech: pos,
    definition: (raw.definition ?? '').trim(),
    he: (raw.he ?? '').trim(),
    ar: (raw.ar ?? '').trim(),
    example: (raw.example ?? '').trim(),
    level,
    band,
    frequency,
  };
}

/**
 * Parse a pasted block of text into words — no network. Each line is one
 * word; optional translations/definition follow, separated by tab, `|`,
 * comma, or " - ". Accepted shapes (most → least fields):
 *   word | he | ar | definition | example
 *   word, he, ar
 *   word - תרגום
 *   word
 */
export function parsePastedWords(raw: string, level: UnitLevel): VocabWord[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|\s*\|\s*|\s+-\s+|,/).map((p) => p.trim()).filter(Boolean);
      const [word, he = '', ar = '', definition = '', example = ''] = parts;
      return word ? toVocabWord({ word, he, ar, definition, example }, level) : null;
    })
    .filter((w): w is VocabWord => w !== null);
}

interface ApiResult {
  words?: (Partial<VocabWord> & { word: string })[];
  error?: string;
}

async function callWordsApi(
  body: Record<string, unknown>,
  level: UnitLevel,
): Promise<VocabWord[]> {
  const res = await fetch('/api/words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (res.status === 503) throw new AiNotConfiguredError();
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as ApiResult;
  return (data.words ?? [])
    .filter((w) => w && typeof w.word === 'string' && w.word.trim())
    .map((w) => toVocabWord(w, level));
}

/** Send bare English words; AI returns them enriched with HE/AR/etc. */
export function enhanceWords(words: string[], level: UnitLevel): Promise<VocabWord[]> {
  return callWordsApi({ mode: 'enhance', words, level }, level);
}

/** Send a photo (data URL); AI extracts and enriches the words it finds. */
export function ocrWords(imageDataUrl: string, level: UnitLevel): Promise<VocabWord[]> {
  return callWordsApi({ mode: 'ocr', image: imageDataUrl, level }, level);
}
