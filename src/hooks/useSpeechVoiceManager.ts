/**
 * useSpeechVoiceManager — picks and caches the best English voice from
 * the browser's SpeechSynthesis voice list.
 *
 * Browsers load voices asynchronously; calling getVoices() too early
 * returns [].  We cache the selection once it's available and watch
 * the `voiceschanged` event so the cache stays fresh if the list
 * updates (e.g. a Chrome extension installs new voices mid-session).
 *
 * Returns a getVoice() callback the caller can invoke right before
 * each utterance.  The hook handles the event listener lifecycle and
 * cleans up on unmount.
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

  return { getVoice };
}
