/**
 * Phase 5 (manual promotion helper): convert the final JSON output back
 * into the proper src/data/vocabulary.ts format.
 *
 * Input:  tmp/vocabulary-03-expanded.json (falls back to earlier phases)
 * Output: tmp/vocabulary-final.ts — ready to rename to src/data/vocabulary.ts
 *
 * Preserves the exact file structure of the original vocabulary.ts:
 *  - header comment with set counts
 *  - Word interface export
 *  - ALL_WORDS export
 *  - SET_1_WORDS / SET_2_WORDS / SET_3_WORDS filtered exports
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { Word } from '../../src/data/vocabulary'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '../../tmp')

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

const run = () => {
  const words = loadLatest()

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

export const SET_1_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 1");
export const SET_2_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 2");
export const SET_3_WORDS: Word[] = ALL_WORDS.filter(w => w.level === "Set 3");
`

  const outPath = path.join(OUTPUT_DIR, 'vocabulary-final.ts')
  fs.writeFileSync(outPath, header)

  console.log(`✅ Final TypeScript file ready`)
  console.log(`   Input: ${words.length} words (Set 1: ${set1} | Set 2: ${set2} | Set 3: ${set3}${custom ? ` | Custom: ${custom}` : ''})`)
  console.log(`   Output: tmp/vocabulary-final.ts`)
  console.log(``)
  console.log(`To promote:`)
  console.log(`   Copy-Item src\\data\\vocabulary.ts src\\data\\vocabulary.backup.ts`)
  console.log(`   Move-Item tmp\\vocabulary-final.ts src\\data\\vocabulary.ts -Force`)
}

run()
