// iOS Safari refuses to start `speechSynthesis` or Web Audio playback
// outside a user-gesture handler. The audio stack in `useAudio.ts` is
// lazy — howler loads on first speak(), TTS fires from a setTimeout —
// so by the time the first word tries to play, no gesture context is
// active and iOS silently swallows the call. The student sees a word
// they can't hear and concludes the game is broken.
//
// `primeAudio()` is meant to be called from a button onClick (or any
// real user-gesture event handler) BEFORE the game starts. It:
//   - speaks a zero-volume utterance to flip `speechSynthesis` into
//     the "user has interacted" state
//   - resumes any suspended AudioContext (Howler creates one lazily
//     on first play; iOS starts it in `suspended` state)
//
// Idempotent — repeated calls after the first are cheap no-ops.

let primed = false;

export const isAudioPrimed = (): boolean => primed;

export const primeAudio = (): void => {
  if (primed) return;

  try {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(' ');
      utter.volume = 0;
      utter.rate = 10;
      window.speechSynthesis.speak(utter);
    }
  } catch { /* speechSynthesis may throw on locked-down WebViews */ }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === 'suspended') {
        // Async — fire and forget. The gesture context is still
        // active inside this synchronous block, which is what iOS
        // checks for unlock.
        ctx.resume().catch(() => { /* best-effort */ });
      }
      // Close shortly after — we only needed the unlock side-effect.
      setTimeout(() => { ctx.close().catch(() => {}); }, 100);
    }
  } catch { /* Web Audio unsupported or blocked */ }

  primed = true;
};
