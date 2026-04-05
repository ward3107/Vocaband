import { ALL_WORDS } from '../src/data/vocabulary'
import googleTTS from 'google-tts-api'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '../temp-audio')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const download = (url: string, dest: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', err => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const run = async () => {
  let done = 0, skipped = 0, failed: number[] = []
  console.log(`Generating audio for ${ALL_WORDS.length} words...`)

  for (const word of ALL_WORDS) {
    const dest = path.join(OUTPUT_DIR, `${word.id}.mp3`)

    if (fs.existsSync(dest)) {
      skipped++
      continue
    }

    try {
      const url = googleTTS.getAudioUrl(word.english, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
      })

      await download(url, dest)
      done++

      if (done % 50 === 0) {
        console.log(`✓ ${done + skipped}/${ALL_WORDS.length} — "${word.english}"`)
      }

      await sleep(350)

    } catch (err) {
      console.error(`✗ Failed ID ${word.id}: "${word.english}"`)
      failed.push(word.id)
    }
  }

  console.log(`\n✅ Done! Generated: ${done} | Skipped: ${skipped} | Failed: ${failed.length}`)
  if (failed.length > 0) console.log(`Failed IDs: ${failed.join(', ')}`)
}

run()