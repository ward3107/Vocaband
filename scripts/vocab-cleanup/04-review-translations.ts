/**
 * Phase 4: Verify Hebrew + Arabic translations using Gemini.
 *
 * Input:  tmp/vocabulary-03-expanded.ts (or 02 / 01 if you skip phase 3)
 * Output: tmp/translation-issues.csv  +  tmp/report-04-review.txt
 *
 * Gemini reviews each entry and flags cases where the translation
 * doesn't match the English meaning. It does NOT auto-correct — that's
 * your call. Output CSV is openable in Excel with columns:
 *   id, english, hebrew, hebrew_ok, hebrew_suggested, arabic, arabic_ok, arabic_suggested, notes
 *
 * You filter for rows where hebrew_ok=false OR arabic_ok=false, review
 * them, decide per-row whether to accept Gemini's suggestion or keep
 * yours, and edit the vocabulary file accordingly.
 *
 * Cost: ~$0.50 for 9K rows via Gemini Flash. Budget-friendly — run it
 * once, review the CSV, fix, done.
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

interface ReviewResult {
  id: number
  english: string
  hebrew: string
  hebrew_ok: boolean
  hebrew_suggested: string
  arabic: string
  arabic_ok: boolean
  arabic_suggested: string
  notes: string
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function loadLatestPhase(): Word[] {
  const candidates = [
    'vocabulary-03-expanded.json',
    'vocabulary-02-deduped.json',
    'vocabulary-01-cleaned.json',
  ]
  for (const name of candidates) {
    const p = path.join(OUTPUT_DIR, name)
    if (fs.existsSync(p)) {
      console.log(`Loading ${name}`)
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as Word[]
    }
  }
  throw new Error('No phase output found. Run at least phase 1 first.')
}

async function reviewBatch(apiKey: string, batch: Word[]): Promise<ReviewResult[]> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are reviewing English→Hebrew and English→Arabic vocabulary translations for an Israeli school app.

For each entry, decide if the Hebrew and Arabic translations correctly match the English word. Return ONLY a JSON array with this exact shape — no prose, no markdown:
[{"id":123,"hebrew_ok":true,"hebrew_suggested":"","arabic_ok":false,"arabic_suggested":"كلمة","notes":""}, ...]

Rules:
- hebrew_ok / arabic_ok: true if the translation accurately conveys the English meaning, false otherwise.
- If false, provide a better translation in hebrew_suggested / arabic_suggested. If true, leave empty string.
- Accept minor variations (synonyms, slightly different forms). Only flag ACTUAL mistakes.
- For multi-word English phrases, the translation should convey the PHRASE meaning, not literal word-by-word.
- notes: optional short reason (e.g. "Arabic is literally 'dog' but English means 'cat'"). Leave empty if no issue.
- Preserve input order and IDs exactly.

Entries to review:
${JSON.stringify(batch.map(w => ({ id: w.id, english: w.english, hebrew: w.hebrew, arabic: w.arabic })))}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim()
  const parsed = JSON.parse(cleaned) as Array<{
    id: number
    hebrew_ok: boolean
    hebrew_suggested: string
    arabic_ok: boolean
    arabic_suggested: string
    notes: string
  }>

  return batch.map(w => {
    const item = parsed.find(p => p.id === w.id)
    return {
      id: w.id,
      english: w.english,
      hebrew: w.hebrew || '',
      hebrew_ok: item?.hebrew_ok ?? true,
      hebrew_suggested: item?.hebrew_suggested || '',
      arabic: w.arabic || '',
      arabic_ok: item?.arabic_ok ?? true,
      arabic_suggested: item?.arabic_suggested || '',
      notes: item?.notes || '',
    }
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const run = async () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_AI_API_KEY missing in .env.local')
    process.exit(1)
  }

  const words = loadLatestPhase()
  console.log(`Reviewing ${words.length} translations via Gemini (this takes a while)...`)

  const BATCH_SIZE = 30
  const allResults: ReviewResult[] = []
  const failed: number[][] = []

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE)
    try {
      const results = await reviewBatch(apiKey, batch)
      allResults.push(...results)
      if ((i + BATCH_SIZE) % 300 === 0 || i + BATCH_SIZE >= words.length) {
        const pct = Math.round(((i + BATCH_SIZE) / words.length) * 100)
        console.log(`  ✓ ${Math.min(i + BATCH_SIZE, words.length)}/${words.length} (${pct}%)`)
      }
      await sleep(800)
    } catch (err: any) {
      console.error(`  ✗ Batch ${i}-${i + BATCH_SIZE} failed: ${err?.message || err}`)
      failed.push(batch.map(w => w.id))
    }
  }

  // Write CSV
  const csvPath = path.join(OUTPUT_DIR, 'translation-issues.csv')
  const csvLines: string[] = [
    'id,english,hebrew,hebrew_ok,hebrew_suggested,arabic,arabic_ok,arabic_suggested,notes',
  ]
  for (const r of allResults) {
    csvLines.push([
      r.id,
      escapeCsv(r.english),
      escapeCsv(r.hebrew),
      r.hebrew_ok,
      escapeCsv(r.hebrew_suggested),
      escapeCsv(r.arabic),
      r.arabic_ok,
      escapeCsv(r.arabic_suggested),
      escapeCsv(r.notes),
    ].join(','))
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'))

  const issues = allResults.filter(r => !r.hebrew_ok || !r.arabic_ok)
  const reportPath = path.join(OUTPUT_DIR, 'report-04-review.txt')
  const lines: string[] = []
  lines.push(`Phase 4 — Translation review`)
  lines.push(`============================\n`)
  lines.push(`Reviewed: ${allResults.length} / ${words.length} words`)
  lines.push(`Flagged for review: ${issues.length}`)
  lines.push(`  Hebrew issues: ${issues.filter(r => !r.hebrew_ok).length}`)
  lines.push(`  Arabic issues: ${issues.filter(r => !r.arabic_ok).length}`)
  lines.push(`Failed batches: ${failed.length}\n`)
  lines.push(`Open tmp/translation-issues.csv in Excel and filter on hebrew_ok=false OR arabic_ok=false.\n`)
  if (issues.length > 0) {
    lines.push(`--- First 20 flagged entries ---`)
    issues.slice(0, 20).forEach(r => {
      lines.push(`\n  ${r.id}: "${r.english}"`)
      if (!r.hebrew_ok) lines.push(`    HE: "${r.hebrew}" → suggested: "${r.hebrew_suggested}"`)
      if (!r.arabic_ok) lines.push(`    AR: "${r.arabic}" → suggested: "${r.arabic_suggested}"`)
      if (r.notes) lines.push(`    note: ${r.notes}`)
    })
  }
  fs.writeFileSync(reportPath, lines.join('\n'))

  console.log(`✅ Phase 4 complete`)
  console.log(`   Flagged: ${issues.length} entries need review`)
  console.log(`   CSV: tmp/translation-issues.csv`)
  console.log(`   Report: tmp/report-04-review.txt`)
}

run().catch(err => { console.error(err); process.exit(1) })
