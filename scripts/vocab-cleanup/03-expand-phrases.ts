/**
 * Phase 3: For every multi-word phrase, ensure each CONTENT word exists
 * as a standalone entry too. Phrases are kept — students still learn the
 * idiom — but they ALSO get the standalone words with proper translations.
 *
 * Input:  tmp/vocabulary-02-deduped.ts
 * Output: tmp/vocabulary-03-expanded.ts + tmp/report-03-expanded.txt
 *
 * Stopwords (skipped — these are function words, not vocabulary):
 *   articles:   a, an, the
 *   prepositions: in, on, at, to, of, for, with, by, from, into, onto, up, off, out, about
 *   conjunctions: and, or, but, nor, yet, so, if, because, as, while, when
 *   pronouns:   i, you, he, she, it, we, they, me, him, her, us, them, my, your, his, hers, its, our, their, this, that, these, those, who, whom, which, what, someone, something, somebody, anyone, anybody, anything, everyone, everything, nobody, nothing
 *   auxiliaries: is, are, was, were, be, been, being, am, do, does, did, have, has, had, will, would, shall, should, can, could, may, might, must
 *   demonstratives/misc: not, very, too, also
 *
 * New single-word entries are translated via Gemini (same key as OCR/TTS).
 * Expect ~200-500 new entries. Cost: a few cents.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Word } from '../../src/data/vocabulary'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '../../tmp')

const STOPWORDS = new Set([
  'a', 'an', 'the',
  'in', 'on', 'at', 'to', 'of', 'for', 'with', 'by', 'from', 'into', 'onto', 'up', 'off', 'out', 'about', 'over', 'under', 'through',
  'and', 'or', 'but', 'nor', 'yet', 'so', 'if', 'because', 'as', 'while', 'when', 'than', 'though',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'hers', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  'who', 'whom', 'which', 'what', 'whose', 'whose',
  'someone', 'something', 'somebody', 'anyone', 'anybody', 'anything', 'everyone', 'everything', 'nobody', 'nothing',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'doing', 'done',
  'have', 'has', 'had', 'having',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'not', 'no', 'very', 'too', 'also', 'just', 'only', 'even', 'still',
  's', 't', 're', 've', 'll', 'd', 'm', // contraction fragments
])

function loadPhase2(): Word[] {
  const p = path.join(OUTPUT_DIR, 'vocabulary-02-deduped.json')
  if (!fs.existsSync(p)) throw new Error('Run phase 2 first.')
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as Word[]
}

function extractContentWords(english: string): string[] {
  return english
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z'-]/g, ''))
    .filter(w => w.length >= 2 && !STOPWORDS.has(w))
}

async function translateBatch(apiKey: string, words: string[]): Promise<Map<string, { hebrew: string; arabic: string }>> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `Translate these English words to Hebrew AND Arabic. Return ONLY a JSON array with this exact shape — no prose, no markdown fences:
[{"english":"word","hebrew":"פירוש","arabic":"ترجمة"},...]

Rules:
- Output order MUST match input order.
- For multi-word phrases, translate the phrase, not word-by-word.
- Preserve grammatical form from the English input.
- Never return an empty string — if unsure, transliterate phonetically.

Input:
${JSON.stringify(words)}`
  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim()
  const parsed = JSON.parse(cleaned) as Array<{ english: string; hebrew: string; arabic: string }>
  const map = new Map<string, { hebrew: string; arabic: string }>()
  words.forEach((w, i) => {
    const item = parsed[i]
    if (item) map.set(w.toLowerCase(), { hebrew: item.hebrew?.trim() || '', arabic: item.arabic?.trim() || '' })
  })
  return map
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const run = async () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_AI_API_KEY missing in .env.local')
    process.exit(1)
  }

  const words = loadPhase2()
  // Existing English → Word map for quick "already exists" lookup
  const existingByEnglish = new Map<string, Word>()
  words.forEach(w => existingByEnglish.set(w.english.toLowerCase().trim(), w))

  // Collect unique content words that don't already exist
  const missingWords = new Set<string>()
  for (const w of words) {
    if (!w.english.includes(' ')) continue // already single word
    const content = extractContentWords(w.english)
    for (const c of content) {
      if (!existingByEnglish.has(c)) missingWords.add(c)
    }
  }
  const toTranslate = Array.from(missingWords).sort()

  console.log(`Phase 3: ${toTranslate.length} new content words to translate via Gemini...`)

  // Batch translate (Gemini handles ~50 words per request comfortably)
  const BATCH_SIZE = 40
  const translations = new Map<string, { hebrew: string; arabic: string }>()
  let nextId = Math.max(...words.map(w => w.id)) + 1
  const failed: string[] = []

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE)
    try {
      const batchTranslations = await translateBatch(apiKey, batch)
      batchTranslations.forEach((v, k) => translations.set(k, v))
      console.log(`  ✓ ${Math.min(i + BATCH_SIZE, toTranslate.length)}/${toTranslate.length}`)
      await sleep(500) // gentle on the API
    } catch (err: any) {
      console.error(`  ✗ Batch ${i}-${i + BATCH_SIZE} failed: ${err?.message || err}`)
      failed.push(...batch)
    }
  }

  // Build expanded list: original words + new ones
  const expanded: Word[] = [...words]
  const added: Word[] = []
  for (const w of toTranslate) {
    const t = translations.get(w)
    if (!t) continue
    const newWord: Word = {
      id: nextId++,
      english: w,
      hebrew: t.hebrew,
      arabic: t.arabic,
      level: 'Set 3', // new additions get Set 3 by default
    }
    expanded.push(newWord)
    added.push(newWord)
  }

  const outPath = path.join(OUTPUT_DIR, 'vocabulary-03-expanded.json')
  fs.writeFileSync(outPath, JSON.stringify(expanded, null, 2) + '\n')

  const reportPath = path.join(OUTPUT_DIR, 'report-03-expanded.txt')
  const lines: string[] = []
  lines.push(`Phase 3 — Expand phrases into standalone content words`)
  lines.push(`======================================================\n`)
  lines.push(`Input: ${words.length} words`)
  lines.push(`Content words missing: ${toTranslate.length}`)
  lines.push(`Successfully translated: ${added.length}`)
  lines.push(`Translation failures: ${failed.length}`)
  lines.push(`Output: ${expanded.length} words\n`)
  if (added.length > 0) {
    lines.push(`--- Added entries (first 50) ---`)
    added.slice(0, 50).forEach(w => {
      lines.push(`  ${w.id}: "${w.english}"  he="${w.hebrew}"  ar="${w.arabic}"`)
    })
    if (added.length > 50) lines.push(`  ... and ${added.length - 50} more`)
  }
  if (failed.length > 0) {
    lines.push(`\n--- Translation failures ---`)
    failed.forEach(f => lines.push(`  "${f}"`))
  }
  fs.writeFileSync(reportPath, lines.join('\n'))

  console.log(`✅ Phase 3 complete`)
  console.log(`   Added: ${added.length} new words | Failed: ${failed.length}`)
  console.log(`   Output: tmp/vocabulary-03-expanded.json`)
  console.log(`   Report: tmp/report-03-expanded.txt`)
}

run().catch(err => { console.error(err); process.exit(1) })
