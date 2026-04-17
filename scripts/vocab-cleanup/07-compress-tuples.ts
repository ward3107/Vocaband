/**
 * Convert src/data/vocabulary.ts from verbose JSON-object format to
 * compact tuple format, cutting bundle size ~45-50%.
 *
 * Before:
 *   {"id":1,"english":"in a hurry","hebrew":"למהר","arabic":"يستعجل","level":"Set 1"}
 *   (~80 chars per word)
 *
 * After:
 *   [1,"in a hurry","למהר","يستعجل",1]
 *   (~35 chars per word)
 *
 * The decoder at the top of the new file rehydrates tuples into full
 * Word objects at module load. Consumers see the EXACT same API —
 * ALL_WORDS, SET_1_WORDS, SET_2_WORDS, SET_3_WORDS, TOPIC_PACKS, Word
 * interface — nothing changes for them.
 *
 * Level encoding: 1 = Set 1, 2 = Set 2, 3 = Set 3, 0 = Custom.
 *
 * Input:  src/data/vocabulary.ts  (current object-format file)
 * Output: tmp/vocabulary-compressed.ts  (new tuple-format file)
 *
 * Non-destructive — writes to tmp/ until you manually promote.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT = path.join(__dirname, '../../src/data/vocabulary.ts')
const OUTPUT_DIR = path.join(__dirname, '../../tmp')
const OUTPUT = path.join(OUTPUT_DIR, 'vocabulary-compressed.ts')

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const LEVEL_TO_CODE: Record<string, number> = {
  "Custom": 0,
  "Set 1": 1,
  "Set 2": 2,
  "Set 3": 3,
}

interface Word {
  id: number
  english: string
  hebrew: string
  arabic: string
  level: "Set 1" | "Set 2" | "Set 3" | "Custom"
}

function extractWords(source: string): Word[] {
  // Matches both { id: 1, english: "..." } AND {"id":1,"english":"..."}
  const regex = /\{\s*"?id"?\s*:\s*(-?\d+)\s*,\s*"?english"?\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"?hebrew"?\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"?arabic"?\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"?level"?\s*:\s*"(Set 1|Set 2|Set 3|Custom)"/g
  const words: Word[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(source)) !== null) {
    words.push({
      id: parseInt(match[1], 10),
      english: match[2],
      hebrew: match[3],
      arabic: match[4],
      level: match[5] as Word["level"],
    })
  }
  return words
}

function extractTrailer(source: string): string {
  // Everything after the ALL_WORDS array closes ([...]) — keeps TOPIC_PACKS,
  // SET_X_WORDS exports, helper functions intact.
  const arrayStart = source.indexOf('export const ALL_WORDS')
  if (arrayStart === -1) return ''
  const endIdx = source.indexOf('\n];', arrayStart)
  if (endIdx === -1) return ''
  return source.substring(endIdx + '\n];'.length).trim()
}

function escapeJsString(s: string): string {
  // Escape for double-quoted JS string literal
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function tupleLiteral(w: Word): string {
  const code = LEVEL_TO_CODE[w.level] ?? 0
  return `[${w.id},"${escapeJsString(w.english)}","${escapeJsString(w.hebrew)}","${escapeJsString(w.arabic)}",${code}]`
}

const run = () => {
  console.log('Reading current vocabulary.ts...')
  const source = fs.readFileSync(INPUT, 'utf-8')
  const words = extractWords(source)
  const trailer = extractTrailer(source)

  console.log(`  Parsed ${words.length} words`)
  console.log(`  Trailer preserved: ${trailer.length} chars`)

  const set1 = words.filter(w => w.level === 'Set 1').length
  const set2 = words.filter(w => w.level === 'Set 2').length
  const set3 = words.filter(w => w.level === 'Set 3').length
  const custom = words.filter(w => w.level === 'Custom').length

  const tuples = words.map(tupleLiteral).join(',\n  ')

  const header = `// vocabulary.ts (compressed tuple format — see compress-vocabulary.ts)
// Set 1: ${set1} words | Set 2: ${set2} words | Set 3: ${set3} words${custom ? ` | Custom: ${custom}` : ''} | Total: ${words.length} words

export interface Word {
  id: number
  english: string
  hebrew: string
  arabic: string
  level: "Set 1" | "Set 2" | "Set 3" | "Custom"
  imageUrl?: string
  sentence?: string
  example?: string
  recProd?: "Rec" | "Prod"
}

// Compact tuple format: [id, english, hebrew, arabic, levelCode]
// levelCode: 0=Custom, 1=Set 1, 2=Set 2, 3=Set 3
// Decoded once at module load — consumers still see the full Word interface.
type WordTuple = readonly [number, string, string, string, number]

const _LEVEL_CODE_TO_STRING: Record<number, Word["level"]> = {
  0: "Custom",
  1: "Set 1",
  2: "Set 2",
  3: "Set 3",
}

const _ALL_TUPLES: readonly WordTuple[] = [
  ${tuples}
] as const;

export const ALL_WORDS: Word[] = _ALL_TUPLES.map(([id, english, hebrew, arabic, lvl]) => ({
  id,
  english,
  hebrew,
  arabic,
  level: _LEVEL_CODE_TO_STRING[lvl],
}))
`

  const content = trailer
    ? header + '\n' + trailer + '\n'
    : header
      + '\nexport const SET_1_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 1");\n'
      + 'export const SET_2_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 2");\n'
      + 'export const SET_3_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 3");\n'

  fs.writeFileSync(OUTPUT, content)

  const before = fs.statSync(INPUT).size
  const after = fs.statSync(OUTPUT).size
  const saved = before - after
  const pct = ((saved / before) * 100).toFixed(1)

  console.log(`\n✅ Compression complete`)
  console.log(`   Input:  ${(before / 1024).toFixed(1)} KB`)
  console.log(`   Output: ${(after / 1024).toFixed(1)} KB`)
  console.log(`   Saved:  ${(saved / 1024).toFixed(1)} KB (${pct}%)`)
  console.log(`   Output written to: tmp/vocabulary-compressed.ts`)
  console.log(``)
  console.log(`To promote:`)
  console.log(`   Copy-Item src\\data\\vocabulary.ts src\\data\\vocabulary.pre-compress.ts -Force`)
  console.log(`   Move-Item tmp\\vocabulary-compressed.ts src\\data\\vocabulary.ts -Force`)
  console.log(`   npx vite build  # verify bundle size shrank`)
}

run()
