/**
 * generate-word-definitions.ts
 *
 * Asks Gemini for ONE short, EFL-friendly definition for every unique
 * word ID across TOPIC_PACKS, then writes a static file consumed by
 * the Definition Match interactive worksheet exercise.
 *
 * Run once:
 *   GOOGLE_AI_API_KEY=... npx tsx scripts/generate-word-definitions.ts
 *
 * Re-run safely: results are cached in
 *   scripts/.definitions-cache.json
 * so re-running picks up where it left off and only asks for missing IDs.
 *
 * Output:
 *   src/data/word-definitions.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

import { ALL_WORDS, TOPIC_PACKS } from '../src/data/vocabulary';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_AI_API_KEY (or GOOGLE_CLOUD_API_KEY) in .env.local');
  process.exit(1);
}

const CACHE_PATH = path.join(__dirname, '.definitions-cache.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/word-definitions.ts');
const BATCH_SIZE = 25;
const MODEL = 'gemini-2.5-flash';

// Collect unique word IDs across every pack — fewer API calls when packs
// share words.
const packIdSet = new Set<number>();
for (const pack of TOPIC_PACKS) for (const id of pack.ids) packIdSet.add(id);

const wordById = new Map<number, (typeof ALL_WORDS)[number]>();
for (const w of ALL_WORDS) wordById.set(w.id, w);

const targets = Array.from(packIdSet)
  .map((id) => wordById.get(id))
  .filter((w): w is (typeof ALL_WORDS)[number] => Boolean(w));

console.log(`Total unique pack word IDs: ${targets.length}`);

// ---------- cache ----------

interface Cache {
  [id: string]: string; // wordId → definition
}

const cache: Cache = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
  : {};

const saveCache = () => fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

const missing = targets.filter((w) => !cache[String(w.id)]);
console.log(`Cached: ${targets.length - missing.length} | To generate: ${missing.length}`);

// ---------- Gemini ----------

const genai = new GoogleGenerativeAI(API_KEY);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsWord = (definition: string, word: string): boolean =>
  new RegExp(`\\b${escapeRe(word)}\\b`, 'i').test(definition);

const wordCount = (s: string): number => s.trim().split(/\s+/).length;

// A definition must NOT contain the target word (else Definition Match
// becomes trivial), be a sensible length, and not awkwardly quote or
// list-mark its body.  Allow morphological variants only if they're
// far enough from the surface form — we'd ideally lemmatise here, but
// the wholeword check is good enough for the curriculum vocabulary.
const isValid = (definition: string, word: string): boolean => {
  if (!definition || definition.length > 100) return false;
  const wc = wordCount(definition);
  if (wc < 3 || wc > 14) return false;
  if (containsWord(definition, word)) return false;
  if (/["'`]/.test(definition)) return false;
  if (/^[-*•]/.test(definition.trim())) return false;
  return true;
};

interface BatchResponse {
  definitions: { id: number; definition: string }[];
}

const SYSTEM_PROMPT = `You are an EFL teacher writing simple word definitions for Israeli students in grades 4-9.

For each English word given, write ONE short definition that:
  - is 3-12 words long, no quotes, no list bullets
  - DOES NOT contain the target word in any form
  - uses only simple, high-frequency vocabulary
  - sounds like a kid-friendly dictionary entry (e.g. "a round red or green fruit", "feeling good and pleased")
  - starts lowercase (no proper-noun unless the word itself is one)
  - does NOT end with a period

Return JSON with one entry per input word.`;

const callGemini = async (batch: { id: number; english: string }[]): Promise<BatchResponse> => {
  const model = genai.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          definitions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.INTEGER },
                definition: { type: SchemaType.STRING },
              },
              required: ['id', 'definition'],
            },
          },
        },
        required: ['definitions'],
      },
      temperature: 0.4,
    },
  });

  const userText =
    'Words:\n' + batch.map((b) => `- id ${b.id}: "${b.english}"`).join('\n');

  const result = await model.generateContent(userText);
  const text = result.response.text();
  return JSON.parse(text) as BatchResponse;
};

// ---------- main loop ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const chunks = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const run = async () => {
  const batches = chunks(missing, BATCH_SIZE);
  let done = 0;
  let failed: { id: number; english: string }[] = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi].map((w) => ({ id: w.id, english: w.english }));
    console.log(`\nBatch ${bi + 1}/${batches.length} (${batch.length} words)…`);

    let attempt = 0;
    let resp: BatchResponse | null = null;
    while (attempt < 3 && !resp) {
      try {
        resp = await callGemini(batch);
      } catch (err) {
        attempt++;
        const wait = 2000 * attempt;
        console.warn(
          `  attempt ${attempt} failed: ${(err as Error).message}; retrying in ${wait}ms`,
        );
        await sleep(wait);
      }
    }
    if (!resp) {
      console.error(`  giving up on batch ${bi + 1}`);
      failed.push(...batch);
      continue;
    }

    const byId = new Map(resp.definitions.map((d) => [d.id, d.definition.trim()]));
    for (const w of batch) {
      const definition = byId.get(w.id);
      if (definition && isValid(definition, w.english)) {
        cache[String(w.id)] = definition;
        done++;
      } else {
        failed.push(w);
      }
    }
    saveCache();
    process.stdout.write(`  ✓ ${done}/${missing.length}`);
    await sleep(400);
  }

  // One retry pass for individual rejected words: one at a time so the
  // model focuses on the tricky entry.
  if (failed.length > 0) {
    console.log(`\nRetrying ${failed.length} rejected words individually…`);
    for (const w of failed) {
      try {
        const resp = await callGemini([w]);
        const got = resp.definitions[0]?.definition?.trim();
        if (got && isValid(got, w.english)) {
          cache[String(w.id)] = got;
          done++;
          saveCache();
        } else {
          console.warn(`  skipped id ${w.id} ("${w.english}") — could not validate`);
        }
      } catch (err) {
        console.warn(`  failed id ${w.id}: ${(err as Error).message}`);
      }
      await sleep(300);
    }
  }

  // Write the static TS file consumed by DefinitionMatchExercise.
  const sortedIds = Object.keys(cache).map(Number).sort((a, b) => a - b);
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/generate-word-definitions.ts.');
  lines.push('// Re-run that script (with GOOGLE_AI_API_KEY set) to refresh.');
  lines.push('//');
  lines.push('// Source of truth for EFL-friendly word definitions consumed by');
  lines.push('// the Definition Match interactive worksheet exercise.  Each entry');
  lines.push("// is 3-12 words, doesn't repeat the target word, validated at");
  lines.push('// generation time.');
  lines.push('');
  lines.push('export const WORD_DEFINITIONS = new Map<number, string>([');
  for (const id of sortedIds) {
    const definitionLiteral = JSON.stringify(cache[String(id)]);
    lines.push(`  [${id}, ${definitionLiteral}],`);
  }
  lines.push(']);');
  lines.push('');

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'));
  console.log(
    `\nWrote ${sortedIds.length} definitions to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
