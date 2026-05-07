/**
 * generate-fillblank-sentences.ts
 *
 * Asks Gemini for ONE short, contextually-correct sentence for every unique
 * word ID across all TOPIC_PACKS, then writes a static file the
 * Free Resources fill-in-the-blank generator reads at runtime.
 *
 * Run once:
 *   GOOGLE_AI_API_KEY=... npx tsx scripts/generate-fillblank-sentences.ts
 *
 * Re-run safely: results are cached in
 *   scripts/.fillblank-cache.json
 * so re-running picks up where it left off and only asks for missing IDs.
 *
 * Output:
 *   src/data/sentence-bank-fillblank.ts
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

const CACHE_PATH = path.join(__dirname, '.fillblank-cache.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/sentence-bank-fillblank.ts');
const BATCH_SIZE = 25;
const MODEL = 'gemini-2.5-flash';

// Collect unique word IDs across every pack — fewer API calls when packs
// share words (e.g. "agree" appears in Greetings and Opinions).
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
  [id: string]: string; // wordId → sentence
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
const containsWord = (sentence: string, word: string): boolean =>
  new RegExp(`\\b${escapeRe(word)}\\b`, 'i').test(sentence);

const wordCount = (s: string): number => s.trim().split(/\s+/).length;

// Strong validator: the sentence must literally contain the target word
// (else fill-in-the-blank would have nothing to blank), be a sane length, and
// not awkwardly wrap the target word in quotes / parentheses.
const isValid = (sentence: string, word: string): boolean => {
  if (!sentence || sentence.length > 200) return false;
  const wc = wordCount(sentence);
  if (wc < 4 || wc > 14) return false;
  if (!containsWord(sentence, word)) return false;
  if (/[\"'`]\s*\b/.test(sentence)) return false;
  return true;
};

interface BatchResponse {
  sentences: { id: number; sentence: string }[];
}

const SYSTEM_PROMPT = `You are an EFL teacher writing simple example sentences for Israeli students in grades 4-9.

For each English word given, write ONE short sentence that:
  - is 5-10 words long
  - LITERALLY contains the target word in its given form (do not change tense or spelling)
  - gives a clear contextual hint about what the word means, so a student could fill the word into a blank by understanding the rest of the sentence
  - uses simple, high-frequency vocabulary for the OTHER words
  - ends with a period
  - has NO quotes around the target word
  - has NO translation, NO explanation, NO list markers

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
          sentences: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.INTEGER },
                sentence: { type: SchemaType.STRING },
              },
              required: ['id', 'sentence'],
            },
          },
        },
        required: ['sentences'],
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
        console.warn(`  attempt ${attempt} failed: ${(err as Error).message}; retrying in ${wait}ms`);
        await sleep(wait);
      }
    }
    if (!resp) {
      console.error(`  giving up on batch ${bi + 1}`);
      failed.push(...batch);
      continue;
    }

    const byId = new Map(resp.sentences.map((s) => [s.id, s.sentence.trim()]));
    for (const w of batch) {
      const sentence = byId.get(w.id);
      if (sentence && isValid(sentence, w.english)) {
        cache[String(w.id)] = sentence;
        done++;
      } else {
        // Reject silently — these go to a single retry batch at the end.
        failed.push(w);
      }
    }
    saveCache();
    process.stdout.write(`  ✓ ${done}/${missing.length}`);
    await sleep(400); // gentle on rate limits
  }

  // One retry pass for individual rejected words: ask one at a time so the
  // model focuses on a single tricky entry.
  if (failed.length > 0) {
    console.log(`\nRetrying ${failed.length} rejected words individually…`);
    for (const w of failed) {
      try {
        const resp = await callGemini([w]);
        const got = resp.sentences[0]?.sentence?.trim();
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

  // Write the static TS file consumed by FreeResourcesView.
  const sortedIds = Object.keys(cache).map(Number).sort((a, b) => a - b);
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/generate-fillblank-sentences.ts.');
  lines.push('// Re-run that script (with GOOGLE_AI_API_KEY set) to refresh.');
  lines.push('//');
  lines.push('// Source of truth for fill-in-the-blank sentences in Free Resources.');
  lines.push('// Each entry is one EFL-friendly sentence (5-10 words) that literally');
  lines.push('// contains the target word, validated at generation time.');
  lines.push('');
  lines.push('export const FILLBLANK_SENTENCES = new Map<number, string>([');
  for (const id of sortedIds) {
    const sentenceLiteral = JSON.stringify(cache[String(id)]);
    lines.push(`  [${id}, ${sentenceLiteral}],`);
  }
  lines.push(']);');
  lines.push('');

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'));
  console.log(`\nWrote ${sortedIds.length} sentences to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
