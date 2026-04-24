/**
 * Request the server to generate + upload Neural2 MP3s for a batch of
 * custom words (OCR, paste, quick-play). Students will then hear a
 * natural voice instead of the robotic browser SpeechSynthesis fallback.
 *
 * Fire-and-forget: callers should `void` this. Never await — generating
 * audio for a big list can take 5–10s, and we don't want the teacher
 * UI to block on it.
 *
 * Silent on failure: students still get browser TTS as a fallback, so
 * a failed request is non-fatal. We log a warning for debugging but
 * never surface this to the teacher.
 */
import { supabase } from "../core/supabase";

export async function requestCustomWordAudio(
  words: { id: number; english: string }[],
): Promise<void> {
  if (words.length === 0) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await fetch('/api/tts/custom-words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        words: words.map(w => ({ id: w.id, english: w.english })),
      }),
    });
  } catch (err) {
    // Non-critical: if this fails, students just hear browser TTS.
    console.warn('[TTS] Custom-word audio request failed:', err);
  }
}
