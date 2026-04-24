/**
 * useSpeechVoiceManager — picks and caches the best English voice from
 * the browser's SpeechSynthesis voice list, and exposes a `speak()`
 * helper that uses it.
 *
 * Browsers load voices asynchronously; calling getVoices() too early
 * returns [].  We cache the selection once it's available and watch
 * the `voiceschanged` event so the cache stays fresh if the list
 * updates (e.g. a Chrome extension installs new voices mid-session).
 *
 * Returns:
 *   - `getVoice()` — the picked voice (or null in non-supporting envs).
 *   - `speak(text)` — utility that cancels any in-flight speech, cleans
 *     parenthetical markers like "(n)" / "(adj)" out of `text`, and
 *     speaks at a slightly slower rate (0.7×) for school-age clarity.
 *     Used for full-sentence speech (sentence-builder, mode intros,
 *     etc.); per-word speech goes through the heavier useAudio /
 *     Neural2 path instead.
 */
import { useEffect, useRef, useCallback } from "react";

export function useSpeechVoiceManager() {
  // The picked voice is cached between calls so speak() uses the same
  // voice consistently within a session.  Cleared on `voiceschanged`
  // so a freshly-loaded voice list is re-evaluated.
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (cachedVoiceRef.current) return cachedVoiceRef.current;
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const picked =
      voices.find(v =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Natural") ||
          v.name.includes("Neural"))
      ) || voices.find(v => v.lang.startsWith("en-US"));
    if (picked) cachedVoiceRef.current = picked;
    return picked ?? null;
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean up text for better pronunciation (remove grammatical markers)
    const cleanText = text
      .replace(/\s*\([nva]\)\s*/gi, ' ')   // Remove (n), (v), (adj)
      .replace(/\s*\([^)]*?\)\s*/g, ' ')    // Remove other parenthetical content
      .replace(/^['"]+|['"]+$/g, '')         // Remove quotes
      .replace(/\s+/g, ' ')
      .trim();

    // Speak the whole phrase smoothly - no word-by-word pauses
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.7;   // Slower for clarity (0.7×)
    utterance.pitch = 1.0;  // Neutral pitch
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }, [getVoice]);

  // Re-cache when voices load (they load asynchronously in some browsers).
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const onVoicesChanged = () => {
      cachedVoiceRef.current = null;
      getVoice();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    getVoice();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, [getVoice]);

  return { getVoice, speak };
}
