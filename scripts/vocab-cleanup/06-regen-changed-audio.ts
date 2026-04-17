/**
 * Selective audio regeneration helper.
 *
 * After the vocab cleanup, ~1,871 words had their English text changed
 * (parens stripped, POS tags removed). The MP3s in Supabase are still the
 * pre-cleanup versions — a word whose text changed from "(be) in a hurry"
 * to "in a hurry" still plays audio that says "be in a hurry".
 *
 * This script:
 *   1. Reads current src/data/vocabulary.ts — the cleaned list
 *   2. Reads src/data/vocabulary.backup.ts — the pre-cleanup list
 *   3. Identifies word IDs whose English text is different
 *   4. Deletes those MP3s from temp-audio/ so generate-audio.ts will
 *      regenerate ONLY the mismatched ones
 *
 * After running this, run:
 *   npx tsx scripts/generate-audio.ts
 *   npx tsx scripts/upload-audio.ts
 * Only the changed words get regenerated + re-uploaded, keeping cost
 * near zero instead of regenerating all 6,482 words.
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CURRENT_VOCAB = path.join(__dirname, '../../src/data/vocabulary.ts')
const BACKUP_VOCAB = path.join(__dirname, '../../src/data/vocabulary.backup.ts')
const TEMP_AUDIO = path.join(__dirname, '../../temp-audio')

/**
 * Extract (id, english) pairs from a vocabulary.ts file by regex, without
 * importing it — avoids ESM dynamic-import issues on Windows and handles
 * both hand-formatted (key: "value") and JSON-style ("key": "value") shapes.
 */
function extractPairs(filePath: string): Map<number, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const map = new Map<number, string>()
  // Matches both { id: 1, english: "..." } AND {"id":1,"english":"..."}
  const regex = /\{\s*"?id"?\s*:\s*(-?\d+)\s*,\s*"?english"?\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const id = parseInt(match[1], 10)
    const english = match[2].replace(/\\"/g, '"')
    map.set(id, english)
  }
  return map
}

const run = () => {
  console.log('Scanning vocabulary files...')
  const current = extractPairs(CURRENT_VOCAB)
  const backup = extractPairs(BACKUP_VOCAB)
  console.log(`  Current: ${current.size} words`)
  console.log(`  Backup:  ${backup.size} words`)

  if (!fs.existsSync(TEMP_AUDIO)) {
    fs.mkdirSync(TEMP_AUDIO, { recursive: true })
    console.log(`Created empty ${TEMP_AUDIO}`)
  }

  // Find IDs where English text CHANGED between backup and current.
  // New IDs (from phase 3 expansion) aren't in backup — they'll be missing
  // MP3s naturally, so generate-audio will pick them up regardless.
  const changed: { id: number; old: string; new: string }[] = []
  for (const [id, englishNow] of current) {
    const englishBefore = backup.get(id)
    if (englishBefore !== undefined && englishBefore !== englishNow) {
      changed.push({ id, old: englishBefore, new: englishNow })
    }
  }

  console.log(`\nFound ${changed.length} words with changed English text.\n`)

  // Delete the matching MP3s so generate-audio regenerates them
  let deleted = 0
  let missing = 0
  for (const { id } of changed) {
    const mp3 = path.join(TEMP_AUDIO, `${id}.mp3`)
    if (fs.existsSync(mp3)) {
      fs.unlinkSync(mp3)
      deleted++
    } else {
      missing++
    }
  }

  console.log(`Deleted ${deleted} local MP3s (will be regenerated).`)
  console.log(`${missing} MP3s were already missing (no local cache — will be generated fresh).`)

  // Preview what generate-audio will do
  console.log(`\n--- First 10 changes preview ---`)
  changed.slice(0, 10).forEach(c => {
    console.log(`  ${c.id}: "${c.old}"  →  "${c.new}"`)
  })
  if (changed.length > 10) console.log(`  ... and ${changed.length - 10} more`)

  console.log(`\n✅ Ready. Run next:`)
  console.log(`   npx tsx scripts/generate-audio.ts    # regenerates ${changed.length} changed words`)
  console.log(`   npx tsx scripts/upload-audio.ts      # upserts them to Supabase (overwrites old)`)
}

run()
