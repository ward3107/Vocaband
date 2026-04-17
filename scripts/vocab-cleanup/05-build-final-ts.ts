/**
 * Phase 5 (manual promotion helper): convert the final JSON output back
 * into the proper src/data/vocabulary.ts format, PRESERVING all the
 * non-data code from the original (TOPIC_PACKS, SET_*_WORDS helpers,
 * custom exports, etc.).
 *
 * Input:  tmp/vocabulary-03-expanded.json (falls back to earlier phases)
 *         src/data/vocabulary.ts (as source for the trailing code block)
 * Output: tmp/vocabulary-final.ts — ready to rename to src/data/vocabulary.ts
 *
 * Strategy:
 *   1. Read the ORIGINAL vocabulary.ts to extract the trailing code
 *      (everything after the ALL_WORDS array closing `];`) — this
 *      includes SET_1_WORDS / SET_2_WORDS / SET_3_WORDS exports AND the
 *      TOPIC_PACKS machinery (buildTopicPacks, getTopicPacks, etc.).
 *   2. Emit a fresh header + Word interface + new ALL_WORDS from JSON.
 *   3. Append the preserved trailer.
 *
 * Result is a drop-in replacement — the app keeps working because every
 * symbol that was exported before is still exported, just with cleaned
 * word data.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { Word } from '../../src/data/vocabulary'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '../../tmp')
const ORIGINAL_VOCAB_PATH = path.join(__dirname, '../../src/data/vocabulary.ts')
const BACKUP_VOCAB_PATH = path.join(__dirname, '../../src/data/vocabulary.backup.ts')

function loadLatest(): Word[] {
  const candidates = [
    'vocabulary-03-expanded.json',
    'vocabulary-02-deduped.json',
    'vocabulary-01-cleaned.json',
  ]
  for (const name of candidates) {
    const p = path.join(OUTPUT_DIR, name)
    if (fs.existsSync(p)) {
      console.log(`Using ${name}`)
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as Word[]
    }
  }
  throw new Error('No phase output found.')
}

/**
 * Extract everything AFTER the ALL_WORDS array closes in the source file.
 * This captures TOPIC_PACKS + SET_X_WORDS + any other code the app needs.
 *
 * If the user has already overwritten vocabulary.ts with our stripped-down
 * version (i.e. the current file has no trailer), fall back to the backup.
 */
function extractTrailer(): string {
  const sources = [ORIGINAL_VOCAB_PATH, BACKUP_VOCAB_PATH]
  for (const src of sources) {
    if (!fs.existsSync(src)) continue
    const content = fs.readFileSync(src, 'utf-8')

    // Find the ALL_WORDS array. It opens with "export const ALL_WORDS" and
    // closes with "];" at column 0 (followed by a blank line or next export).
    const arrayStart = content.indexOf('export const ALL_WORDS')
    if (arrayStart === -1) continue

    // Scan for the first "];" at the start of a line after the array start
    // (marks the end of the array literal).
    let i = arrayStart
    const endMarker = '\n];'
    const endIdx = content.indexOf(endMarker, i)
    if (endIdx === -1) continue

    // Trailer = everything after the closing ];
    const trailer = content.substring(endIdx + endMarker.length).trim()
    if (trailer.length < 50) continue // too short to be useful — probably the stripped version

    return trailer
  }
  return ''
}

const run = () => {
  const words = loadLatest()
  const trailer = extractTrailer()

  const set1 = words.filter(w => w.level === 'Set 1').length
  const set2 = words.filter(w => w.level === 'Set 2').length
  const set3 = words.filter(w => w.level === 'Set 3').length
  const custom = words.filter(w => w.level === 'Custom').length

  const header = `// vocabulary.ts
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

export const ALL_WORDS: Word[] = [
${words.map(w => `  ${JSON.stringify(w)},`).join('\n')}
];
`

  const content = trailer
    ? header + '\n' + trailer + '\n'
    : header
      + '\nexport const SET_1_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 1");\n'
      + 'export const SET_2_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 2");\n'
      + 'export const SET_3_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 3");\n'

  const outPath = path.join(OUTPUT_DIR, 'vocabulary-final.ts')
  fs.writeFileSync(outPath, content)

  console.log(`✅ Final TypeScript file ready`)
  console.log(`   Input: ${words.length} words (Set 1: ${set1} | Set 2: ${set2} | Set 3: ${set3}${custom ? ` | Custom: ${custom}` : ''})`)
  console.log(`   Trailer preserved: ${trailer ? `${trailer.length} chars (TOPIC_PACKS, SET_X_WORDS, etc.)` : 'NONE (fallback SET exports emitted)'}`)
  console.log(`   Output: tmp/vocabulary-final.ts`)
  console.log(``)
  console.log(`To promote:`)
  console.log(`   Copy-Item src\\data\\vocabulary.ts src\\data\\vocabulary.backup.ts -Force`)
  console.log(`   Move-Item tmp\\vocabulary-final.ts src\\data\\vocabulary.ts -Force`)
}

run()
