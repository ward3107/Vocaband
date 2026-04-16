import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ALL_WORDS } from '../src/data/vocabulary'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { synthesizeSpeechMp3 } from '../tts-common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_KEY = process.env.GOOGLE_AI_API_KEY
if (!API_KEY) {
  console.error('GOOGLE_AI_API_KEY missing in .env.local — needed for Google Cloud TTS.')
  process.exit(1)
}

const OUTPUT_DIR = path.join(__dirname, '../temp-audio')
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Concurrency controls Google Cloud TTS quota usage. Default Neural2 limit is
// 1000 requests/minute → running 10 in parallel with a tiny gap is well under.
const CONCURRENCY = 10

const run = async () => {
  let done = 0, skipped = 0
  const failed: { id: number; english: string; reason: string }[] = []
  console.log(`Generating audio for ${ALL_WORDS.length} words via Google Cloud TTS (Neural2-F)...`)

  for (let i = 0; i < ALL_WORDS.length; i += CONCURRENCY) {
    const batch = ALL_WORDS.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (word) => {
      const dest = path.join(OUTPUT_DIR, `${word.id}.mp3`)
      if (fs.existsSync(dest)) {
        skipped++
        return
      }
      try {
        const mp3 = await synthesizeSpeechMp3(word.english, API_KEY!)
        fs.writeFileSync(dest, mp3)
        done++
      } catch (err: any) {
        failed.push({ id: word.id, english: word.english, reason: (err?.message || String(err)).substring(0, 120) })
      }
    }))
    if ((done + skipped) % 200 === 0 || i + CONCURRENCY >= ALL_WORDS.length) {
      console.log(`✓ ${done + skipped + failed.length}/${ALL_WORDS.length} (new=${done}, skipped=${skipped}, failed=${failed.length})`)
    }
    // Gap between batches so we stay well under the per-minute quota.
    await sleep(60)
  }

  console.log(`\n✅ Done! Generated: ${done} | Skipped: ${skipped} | Failed: ${failed.length}`)
  if (failed.length > 0) {
    console.log(`First 5 failures:`, failed.slice(0, 5))
    console.log(`All failed IDs: ${failed.map(f => f.id).join(', ')}`)
  }
}

run()