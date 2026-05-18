/**
 * Batch-translates every curated word in `src/data/vocabulary.ts`
 * into Russian via Gemini, then bakes the result into
 * `src/data/vocabulary-ru.ts` so `ALL_WORDS[i].russian` is populated
 * at module load.
 *
 * Idempotent + resumable: progress is checkpointed to
 * `src/data/vocabulary-ru.json` after every batch.  Re-running picks
 * up where the previous run left off — only untranslated ids are
 * sent to Gemini.
 *
 * Usage:
 *   GOOGLE_CLOUD_API_KEY=… npx tsx scripts/translate-vocabulary-to-russian.ts
 *
 * Optional flags:
 *   --batch=80          batch size (default 80)
 *   --limit=500         translate at most N untranslated words then stop
 *                       (useful for a metered first pass)
 *   --concurrency=2     parallel batches in flight
 *   --dry-run           list pending counts, don't call Gemini
 *
 * One batch ≈ 80 words ≈ 2 cents on gemini-2.5-flash-lite at current
 * pricing; the full 6.5k corpus runs ~$1.50 worst case.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PROGRESS_JSON = path.join(ROOT, "src", "data", "vocabulary-ru.json");
const BAKED_TS = path.join(ROOT, "src", "data", "vocabulary-ru.ts");
const VOCABULARY_TS = path.join(ROOT, "src", "data", "vocabulary.ts");

interface Args {
  batch: number;
  limit: number;
  concurrency: number;
  dryRun: boolean;
}

const parseArgs = (): Args => {
  const a: Args = { batch: 80, limit: Infinity, concurrency: 2, dryRun: false };
  for (const raw of process.argv.slice(2)) {
    if (raw === "--dry-run") a.dryRun = true;
    else if (raw.startsWith("--batch=")) a.batch = parseInt(raw.slice(8), 10);
    else if (raw.startsWith("--limit=")) a.limit = parseInt(raw.slice(8), 10);
    else if (raw.startsWith("--concurrency=")) a.concurrency = parseInt(raw.slice(14), 10);
  }
  return a;
};

interface WordRow {
  id: number;
  english: string;
  hebrew: string;
}

// Pull the tuples straight from vocabulary.ts via regex — avoids
// importing the full module (which carries 7000+ lines of TS that
// have to typecheck before they evaluate).  Tuple shape:
// [id, english, hebrew, arabic, levelCode]
const loadAllWords = (): WordRow[] => {
  const text = fs.readFileSync(VOCABULARY_TS, "utf-8");
  const start = text.indexOf("const _ALL_TUPLES");
  if (start < 0) throw new Error("Could not locate _ALL_TUPLES in vocabulary.ts");
  // Walk past the type annotation (`readonly WordTuple[]`) to the
  // initializer's opening bracket.
  const equalsIdx = text.indexOf("=", start);
  const arrayStart = text.indexOf("[", equalsIdx);
  // Walk to the matching closing bracket of the outer array.
  let depth = 0;
  let end = -1;
  for (let i = arrayStart; i < text.length; i++) {
    const c = text[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error("Unterminated _ALL_TUPLES array");
  const arrayText = text.substring(arrayStart, end + 1);

  // Each inner tuple is a single line of the form:
  //   [123,"english","hebrew","arabic",1]
  // Strings may contain commas, so we parse character by character.
  const rows: WordRow[] = [];
  const rowRe = /\[\s*(\d+)\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(arrayText)) !== null) {
    const id = parseInt(m[1], 10);
    // Walk forward to extract the next two quoted strings (english, hebrew).
    let i = m.index + m[0].length;
    const fields: string[] = [];
    while (fields.length < 2 && i < arrayText.length) {
      // Skip whitespace.
      while (arrayText[i] === " " || arrayText[i] === "\t") i++;
      const quote = arrayText[i];
      if (quote !== '"' && quote !== "'") break;
      i++;
      let s = "";
      while (i < arrayText.length && arrayText[i] !== quote) {
        if (arrayText[i] === "\\" && i + 1 < arrayText.length) {
          s += arrayText[i + 1];
          i += 2;
        } else {
          s += arrayText[i];
          i++;
        }
      }
      i++; // skip closing quote
      fields.push(s);
      // Skip the comma + whitespace before the next field.
      while (arrayText[i] === "," || arrayText[i] === " ") i++;
    }
    if (fields.length === 2) rows.push({ id, english: fields[0], hebrew: fields[1] });
  }
  return rows;
};

const loadProgress = (): Record<string, string> => {
  if (!fs.existsSync(PROGRESS_JSON)) return {};
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_JSON, "utf-8"));
  } catch (e) {
    console.warn(`[translate-ru] Existing progress file is unreadable, starting fresh: ${(e as Error).message}`);
    return {};
  }
};

const saveProgress = (progress: Record<string, string>) => {
  // Pretty-print so progress diffs are reviewable in git.
  fs.writeFileSync(PROGRESS_JSON, JSON.stringify(progress, null, 2) + "\n", "utf-8");
};

const writeBakedTs = (progress: Record<string, string>) => {
  const ids = Object.keys(progress)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const lines: string[] = [
    "// Auto-generated by scripts/translate-vocabulary-to-russian.ts.",
    "// Do not hand-edit — re-run the script to update.",
    "//",
    "// Maps vocabulary word id → Russian translation.  vocabulary.ts",
    "// hydrates ALL_WORDS[i].russian from this map at module load.",
    "",
    "export const RUSSIAN_TRANSLATIONS: Record<number, string> = {",
  ];
  for (const id of ids) {
    const v = progress[String(id)];
    if (!v) continue;
    lines.push(`  ${id}: ${JSON.stringify(v)},`);
  }
  lines.push("};", "");
  fs.writeFileSync(BAKED_TS, lines.join("\n"), "utf-8");
};

const PROMPT_TEMPLATE = (rows: WordRow[]): string => `Translate these English words into Russian.  The Hebrew gloss is included as a disambiguation hint when an English word has multiple senses — pick the Russian translation that matches the Hebrew sense.

Return ONLY a JSON array.  No prose, no markdown fences, no commentary.
Schema: [{"id":123,"russian":"перевод"},...]

Rules:
- Output order MUST match input order.
- One JSON entry per input row.
- For multi-word phrases, translate the phrase as a unit, not word-by-word.
- For idioms, prefer the closest natural Russian equivalent over a literal calque.
- Preserve grammatical form (verb infinitive stays infinitive, plural stays plural, etc).
- If the English word is a proper noun, brand, or already used as-is in Russian (e.g. "TV", "internet"), transliterate or copy as a native Russian speaker would write it.
- Never return an empty string.  If you're truly uncertain, transliterate phonetically using Cyrillic.

Input:
${JSON.stringify(rows.map((r) => ({ id: r.id, english: r.english, hebrew: r.hebrew })))}`;

const runBatch = async (
  model: any,
  rows: WordRow[],
  attempt = 0
): Promise<Map<number, string>> => {
  const prompt = PROMPT_TEMPLATE(rows);
  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
  } catch (e) {
    if (attempt < 3) {
      const wait = 1000 * 2 ** attempt;
      console.warn(`[translate-ru] Gemini error (${(e as Error).message}); retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      return runBatch(model, rows, attempt + 1);
    }
    throw e;
  }
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  let parsed: Array<{ id: number | string; russian: string }>;
  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch (e) {
    if (attempt < 2) {
      console.warn(`[translate-ru] Unparseable response; retrying.  Head: ${raw.slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 500));
      return runBatch(model, rows, attempt + 1);
    }
    throw new Error(`Unparseable Gemini response after retries: ${raw.slice(0, 200)}`);
  }
  const out = new Map<number, string>();
  for (const item of parsed) {
    const id = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
    const ru = (item.russian || "").trim();
    if (Number.isFinite(id) && ru) out.set(id, ru);
  }
  return out;
};

const main = async () => {
  const args = parseArgs();
  const apiKey = (process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
  if (!apiKey && !args.dryRun) {
    console.error("GOOGLE_CLOUD_API_KEY (or GOOGLE_AI_API_KEY) is required.  Re-run with the key set.");
    process.exit(1);
  }

  const allWords = loadAllWords();
  const progress = loadProgress();
  const pending = allWords.filter((w) => !progress[String(w.id)]);
  console.log(`[translate-ru] ${allWords.length} curated words; ${Object.keys(progress).length} already translated; ${pending.length} pending.`);

  if (args.dryRun) {
    console.log(`[translate-ru] Dry run — first 5 pending: ${pending.slice(0, 5).map((w) => `${w.id}:${w.english}`).join(", ")}`);
    return;
  }
  if (pending.length === 0) {
    console.log("[translate-ru] Nothing to do — corpus is fully translated.  Re-baking .ts file.");
    writeBakedTs(progress);
    return;
  }

  const queue = pending.slice(0, args.limit === Infinity ? pending.length : args.limit);
  console.log(`[translate-ru] Translating ${queue.length} words in batches of ${args.batch} with ${args.concurrency} in flight.`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const batches: WordRow[][] = [];
  for (let i = 0; i < queue.length; i += args.batch) batches.push(queue.slice(i, i + args.batch));

  let completed = 0;
  const startedAt = Date.now();
  let cursor = 0;
  const workers: Promise<void>[] = [];
  const runWorker = async () => {
    while (cursor < batches.length) {
      const idx = cursor++;
      const batch = batches[idx];
      try {
        const result = await runBatch(model, batch);
        for (const [id, ru] of result) progress[String(id)] = ru;
        completed += batch.length;
        saveProgress(progress);
        writeBakedTs(progress);
        const rate = completed / ((Date.now() - startedAt) / 1000);
        const eta = (queue.length - completed) / Math.max(rate, 0.01);
        console.log(`[translate-ru] batch ${idx + 1}/${batches.length} done (${result.size}/${batch.length} translated) — ${completed}/${queue.length} total, ETA ${Math.round(eta)}s`);
      } catch (e) {
        console.error(`[translate-ru] batch ${idx + 1} failed: ${(e as Error).message}`);
      }
    }
  };
  for (let i = 0; i < args.concurrency; i++) workers.push(runWorker());
  await Promise.all(workers);

  console.log(`[translate-ru] Done.  Wrote ${BAKED_TS}.`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
