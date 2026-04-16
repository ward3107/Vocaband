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

// Warm female Neural2 voice picked for kid-friendliness. If Google ever removes
// this voice ID, swap to 'en-US-Neural2-C' or 'en-US-Neural2-H'.
export const DEFAULT_VOICE: Voice = {
  languageCode: 'en-US',
  name: 'en-US-Neural2-F',
  ssmlGender: 'FEMALE',
}

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export async function synthesizeSpeechMp3(
  text: string,
  apiKey: string,
  voice: Voice = DEFAULT_VOICE,
): Promise<Buffer> {
  const body = {
    input: { text },
    voice,
    audioConfig: {
      audioEncoding: 'MP3',
      // 0.95 gives a slightly slower, clearer read for vocabulary learning
      // without sounding sluggish.
      speakingRate: 0.95,
      pitch: 0,
    },
  }

  const res = await fetch(`${TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Google TTS ${res.status}: ${errText.slice(0, 300)}`)
  }

  const json = (await res.json()) as { audioContent?: string }
  if (!json.audioContent) {
    throw new Error('Google TTS response missing audioContent')
  }

  return Buffer.from(json.audioContent, 'base64')
}
