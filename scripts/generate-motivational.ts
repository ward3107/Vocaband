import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

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

// English motivational phrases only
export const MOTIVATIONAL_PHRASES: { key: string; text: string; lang: string }[] = [
  { key: "great-job", text: "Great job!", lang: "en" },
  { key: "well-done", text: "Well done!", lang: "en" },
  { key: "awesome", text: "Awesome!", lang: "en" },
  { key: "keep-it-up", text: "Keep it up!", lang: "en" },
  { key: "nailed-it", text: "Nailed it!", lang: "en" },
  { key: "brilliant", text: "Brilliant!", lang: "en" },
  { key: "youre-on-fire", text: "You are on fire!", lang: "en" },
  { key: "fantastic", text: "Fantastic!", lang: "en" },
  { key: "way-to-go", text: "Way to go!", lang: "en" },
  { key: "superstar", text: "Superstar!", lang: "en" },
  { key: "amazing", text: "Amazing!", lang: "en" },
  { key: "perfect", text: "Perfect!", lang: "en" },
  { key: "excellent", text: "Excellent!", lang: "en" },
  { key: "outstanding", text: "Outstanding!", lang: "en" },
  { key: "incredible", text: "Incredible!", lang: "en" },
  { key: "wonderful", text: "Wonderful!", lang: "en" },
  { key: "spectacular", text: "Spectacular!", lang: "en" },
  { key: "terrific", text: "Terrific!", lang: "en" },
  { key: "superb", text: "Superb!", lang: "en" },
  { key: "magnificent", text: "Magnificent!", lang: "en" },
  { key: "you-got-it", text: "You got it!", lang: "en" },
  { key: "thats-right", text: "That is right!", lang: "en" },
  { key: "correct", text: "Correct!", lang: "en" },
  { key: "spot-on", text: "Spot on!", lang: "en" },
  { key: "exactly-right", text: "Exactly right!", lang: "en" },
  { key: "you-rock", text: "You rock!", lang: "en" },
  { key: "keep-going", text: "Keep going!", lang: "en" },
  { key: "dont-stop", text: "Do not stop now!", lang: "en" },
  { key: "youre-amazing", text: "You are amazing!", lang: "en" },
  { key: "good-thinking", text: "Good thinking!", lang: "en" },
  { key: "nice-work", text: "Nice work!", lang: "en" },
  { key: "good-work", text: "Good work!", lang: "en" },
  { key: "you-did-it", text: "You did it!", lang: "en" },
  { key: "first-try", text: "First try!", lang: "en" },
  { key: "like-a-pro", text: "Like a pro!", lang: "en" },
  { key: "you-are-a-champion", text: "You are a champion!", lang: "en" },
  { key: "unstoppable", text: "Unstoppable!", lang: "en" },
  { key: "on-point", text: "On point!", lang: "en" },
  { key: "crushing-it", text: "Crushing it!", lang: "en" },
  { key: "legend", text: "Legend!", lang: "en" },
  { key: "genius", text: "Genius!", lang: "en" },
  { key: "word-master", text: "Word master!", lang: "en" },
  { key: "vocab-hero", text: "Vocabulary hero!", lang: "en" },
  { key: "language-champion", text: "Language champion!", lang: "en" },
  { key: "english-star", text: "English star!", lang: "en" },
  { key: "you-smashed-it", text: "You smashed it!", lang: "en" },
  { key: "top-of-the-class", text: "Top of the class!", lang: "en" },
  { key: "gold-star", text: "Gold star!", lang: "en" },
  { key: "hat-trick", text: "Hat trick!", lang: "en" },
  { key: "level-up", text: "Level up!", lang: "en" },
  { key: "new-high-score", text: "New high score!", lang: "en" },
  { key: "on-a-roll", text: "You are on a roll!", lang: "en" },
  { key: "keep-the-streak", text: "Keep the streak alive!", lang: "en" },
  { key: "nothing-can-stop-you", text: "Nothing can stop you!", lang: "en" },
  { key: "youre-growing", text: "You are growing every day!", lang: "en" },
  { key: "brain-power", text: "Brain power!", lang: "en" },
  { key: "sharp-as-a-tack", text: "Sharp as a tack!", lang: "en" },
  { key: "quick-learner", text: "Quick learner!", lang: "en" },
  { key: "smart-cookie", text: "Smart cookie!", lang: "en" },
  { key: "you-inspire-me", text: "You inspire me!", lang: "en" },
  { key: "proud-of-you", text: "Proud of you!", lang: "en" },
  { key: "you-should-be-proud", text: "You should be proud of yourself!", lang: "en" },
  { key: "hard-work-pays-off", text: "Hard work pays off!", lang: "en" },
  { key: "practice-makes-perfect", text: "Practice makes perfect!", lang: "en" },
  { key: "every-word-counts", text: "Every word counts!", lang: "en" },
  { key: "building-your-future", text: "Building your future one word at a time!", lang: "en" },
  { key: "knowledge-is-power", text: "Knowledge is power!", lang: "en" },
  { key: "youre-becoming-fluent", text: "You are becoming fluent!", lang: "en" },
  { key: "english-unlocked", text: "English unlocked!", lang: "en" },
  { key: "new-word-learned", text: "New word learned!", lang: "en" },
  { key: "vocabulary-growing", text: "Vocabulary growing!", lang: "en" },
  { key: "one-step-closer", text: "One step closer!", lang: "en" },
  { key: "making-progress", text: "Making progress!", lang: "en" },
  { key: "moving-forward", text: "Moving forward!", lang: "en" },
  { key: "never-give-up", text: "Never give up!", lang: "en" },
  { key: "believe-in-yourself", text: "Believe in yourself!", lang: "en" },
  { key: "you-can-do-it", text: "You can do it!", lang: "en" },
  { key: "sky-is-the-limit", text: "The sky is the limit!", lang: "en" },
  { key: "dream-big", text: "Dream big!", lang: "en" },
  { key: "full-marks", text: "Full marks!", lang: "en" },
  { key: "ten-out-of-ten", text: "Ten out of ten!", lang: "en" },
  { key: "hundred-percent", text: "One hundred percent!", lang: "en" },
  { key: "flawless", text: "Flawless!", lang: "en" },
  { key: "impeccable", text: "Impeccable!", lang: "en" },
  { key: "immaculate", text: "Immaculate!", lang: "en" },
  { key: "marvelous", text: "Marvelous!", lang: "en" },
  { key: "exceptional", text: "Exceptional!", lang: "en" },
  { key: "elite", text: "Elite!", lang: "en" },
  { key: "top-tier", text: "Top tier!", lang: "en" },
  { key: "first-class", text: "First class!", lang: "en" },
  { key: "above-and-beyond", text: "Above and beyond!", lang: "en" },
  { key: "blowing-my-mind", text: "You are blowing my mind!", lang: "en" },
  { key: "impressed", text: "I am impressed!", lang: "en" },
  { key: "wow", text: "Wow!", lang: "en" },
  { key: "unbelievable", text: "Unbelievable!", lang: "en" },
  { key: "speechless", text: "I am speechless!", lang: "en" },
  { key: "mic-drop", text: "Mic drop!", lang: "en" },
  { key: "that-was-beautiful", text: "That was beautiful!", lang: "en" },
  { key: "pure-talent", text: "Pure talent!", lang: "en" },
]

const OUTPUT_DIR = path.join(__dirname, '../temp-motivational')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const run = async () => {
  let done = 0, skipped = 0, failed: string[] = []
  console.log(`Generating ${MOTIVATIONAL_PHRASES.length} motivational phrases via Google Cloud TTS (Neural2-F)...`)

  for (const phrase of MOTIVATIONAL_PHRASES) {
    const dest = path.join(OUTPUT_DIR, `${phrase.key}.mp3`)

    if (fs.existsSync(dest)) {
      skipped++
      continue
    }

    try {
      const mp3 = await synthesizeSpeechMp3(phrase.text, API_KEY!)
      fs.writeFileSync(dest, mp3)
      done++
      if (done % 10 === 0) console.log(`✓ ${done + skipped}/${MOTIVATIONAL_PHRASES.length}`)
      // Small gap between calls to stay well under the 1000 QPM quota.
      await sleep(80)
    } catch (err: any) {
      console.error(`✗ Failed: ${phrase.key} — ${err?.message || err}`)
      failed.push(phrase.key)
    }
  }

  console.log(`\n✅ Done! Generated: ${done} | Skipped: ${skipped} | Failed: ${failed.length}`)
  if (failed.length > 0) console.log(`Failed: ${failed.join(', ')}`)
  console.log(`\nNext: npx tsx scripts/upload-motivational.ts`)
}

run()
