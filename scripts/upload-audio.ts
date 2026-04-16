import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AUDIO_DIR = path.join(__dirname, '../temp-audio')
const BUCKET = 'sound'
const run = async () => {
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'))
  console.log(`Uploading ${files.length} files to Supabase bucket: ${BUCKET}`)

  let done = 0, failed: string[] = []

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(AUDIO_DIR, file))

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file, buffer, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (error) {
      console.error(`✗ Failed: ${file} — ${error.message}`)
      failed.push(file)
    } else {
      done++
      if (done % 50 === 0) console.log(`✓ ${done}/${files.length} uploaded`)
    }
  }

  console.log(`\n✅ Upload complete! Uploaded: ${done} | Failed: ${failed.length}`)
}

run()