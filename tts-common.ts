// Shared Google Cloud Text-to-Speech helper.
// Used by server.ts (runtime custom-word TTS) and the scripts/ batch generators.
//
// Uses the REST API with an API key rather than the Node SDK + service account
// because we already have GOOGLE_AI_API_KEY in the environment (same key that
// powers Gemini OCR) and avoiding the service-account JSON dance keeps deploy
// simple. The Cloud Text-to-Speech API just needs to be enabled on the same
// Google Cloud project.

export type Voice = {
  languageCode: string
  name: string
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL'
}

// Studio voices are Google's highest-quality tier, designed for long-form
// content like audiobooks — the most human-sounding option. Studio-O is
// female; swap to Studio-Q for male. Free-tier limit is 100K chars/month,
// which comfortably fits our 9,159-word + 99-phrase corpus (~57K chars).
export const DEFAULT_VOICE: Voice = {
  languageCode: 'en-US',
  name: 'en-US-Studio-O',
  ssmlGender: 'FEMALE',
}

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// POS (part-of-speech) grammatical markers that appear in the vocabulary —
// stripped entirely because TTS pronouncing "happy parenthesis a d j
// parenthesis" is nonsense to a student. Anything else in parens
// (e.g. "(be) in a hurry", "knock (someone) out") keeps its CONTENT and
// loses the parens so the phrase stays natural and grammatical.
const POS_TAG_REGEX = /\s*\((?:n|v|adj|adv|prep|conj|pron|art|interj|num)\)\s*/gi

export function cleanWordForTts(text: string): string {
  return text
    // 1. Remove POS tags entirely: "happy (adj)" → "happy"
    .replace(POS_TAG_REGEX, ' ')
    // 2. For any remaining parens, keep the content but drop the parens:
    //    "(be) in a hurry" → "be in a hurry"
    .replace(/\(([^)]*)\)/g, '$1')
    // 3. Trim leading/trailing quotes (single, double, or smart)
    .replace(/^["'\u2018\u2019\u201C\u201D]+|["'\u2018\u2019\u201C\u201D]+$/g, '')
    // 4. Collapse all whitespace into single spaces
    .replace(/\s+/g, ' ')
    .trim()
}

export async function synthesizeSpeechMp3(
  text: string,
  apiKey: string,
  voice: Voice = DEFAULT_VOICE,
): Promise<Buffer> {
  // Always clean text so "(be) in a hurry" doesn't get read as a literal
  // open-paren — callers don't need to remember to do this.
  const cleanText = cleanWordForTts(text)
  // Journey voices don't support speakingRate or pitch — passing them fails.
  const isJourney = voice.name.includes('Journey')
  const audioConfig: Record<string, unknown> = { audioEncoding: 'MP3' }
  if (!isJourney) {
    // 0.95 gives a slightly slower, clearer read for vocabulary learning
    // without sounding sluggish. Only applied to voices that support it.
    audioConfig.speakingRate = 0.95
    audioConfig.pitch = 0
  }

  const body = {
    input: { text: cleanText },
    voice,
    audioConfig,
  }

  // Retry on 429 (rate limit) with exponential backoff. Studio voices have
  // a strict per-minute quota — a single batch can trigger it briefly and
  // the request will succeed a few seconds later. Fail on non-429 errors
  // immediately so we don't mask real problems.
  const MAX_RETRIES = 4
  const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const json = (await res.json()) as { audioContent?: string }
      if (!json.audioContent) {
        throw new Error('Google TTS response missing audioContent')
      }
      return Buffer.from(json.audioContent, 'base64')
    }

    const errText = await res.text().catch(() => '')
    // Only 429 retries — other errors (401/403/400/500) are not transient.
    if (res.status !== 429 || attempt === MAX_RETRIES) {
      throw new Error(`Google TTS ${res.status}: ${errText.slice(0, 300)}`)
    }
    await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]))
  }

  // Unreachable — the loop either returns or throws.
  throw new Error('Google TTS retries exhausted')
}
