/**
 * raceSfx.ts — tiny synthesized sound effects for Category Race.
 *
 * Deliberately asset-free: short Web Audio tones generated on the fly, so
 * there are no MP3s to ship or cache. Each effect is a few sine/triangle
 * blips with a quick gain envelope — pleasant, not arcade-harsh, and safe
 * to fire on every round.
 *
 * iOS Safari only allows audio after a user gesture; the Category Race
 * "Get Ready" screen calls primeAudio() on tap, which unlocks the same
 * AudioContext stack. We lazily create our context on first play and
 * no-op silently if the browser blocks it.
 *
 * Mute is opt-out via localStorage("vb-race-muted") so a teacher in a
 * quiet room can silence it without code.
 */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (isMuted()) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // A gesture may have unlocked it after a suspend; nudge it awake.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem("vb-race-muted") === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem("vb-race-muted", muted ? "1" : "0");
  } catch {
    /* storage blocked — ignore */
  }
}

/** One note. `at` is an offset (seconds) from now so callers can sequence. */
function note(
  c: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.18,
): void {
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // Quick attack, smooth exponential release — no clicks.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Rising three-note blip — plays when a new round's letter is revealed. */
export function playLetterReveal(): void {
  const c = audioCtx();
  if (!c) return;
  note(c, 523.25, 0, 0.12, "triangle"); // C5
  note(c, 659.25, 0.09, 0.12, "triangle"); // E5
  note(c, 783.99, 0.18, 0.18, "triangle"); // G5
}

/** Bright two-note chime — a good round result. */
export function playGood(): void {
  const c = audioCtx();
  if (!c) return;
  note(c, 659.25, 0, 0.14); // E5
  note(c, 987.77, 0.1, 0.22); // B5
}

/** Soft single note — a low/zero round, so it never feels punishing. */
export function playGentle(): void {
  const c = audioCtx();
  if (!c) return;
  note(c, 392.0, 0, 0.22, "sine", 0.12); // G4, quieter
}

/** Ascending fanfare — the race finished. */
export function playFanfare(): void {
  const c = audioCtx();
  if (!c) return;
  note(c, 523.25, 0, 0.16); // C5
  note(c, 659.25, 0.12, 0.16); // E5
  note(c, 783.99, 0.24, 0.16); // G5
  note(c, 1046.5, 0.36, 0.34, "triangle", 0.22); // C6
}

/**
 * playRoundStart — an upbeat little tune when a round kicks off on the
 * projector. A bouncy major-key run + a held top note, longer than the
 * single blips so it reads as "music, go!" rather than a UI beep. The
 * teacher's "Start round" tap is a user gesture, so this is allowed to
 * play even on first interaction.
 */
export function playRoundStart(): void {
  const c = audioCtx();
  if (!c) return;
  const seq: Array<[number, number]> = [
    [523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36], // C-E-G-C run
    [987.77, 0.5], [1046.5, 0.62], // B-C lift
  ];
  for (const [f, at] of seq) note(c, f, at, 0.16, "triangle", 0.16);
  note(c, 1318.51, 0.78, 0.4, "sine", 0.18); // E6 held finish
}
