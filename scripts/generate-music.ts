/**
 * Generate 7 instrumental background music loops as WAV files
 * Enhanced version with reverb, humanization, richer harmonics, and better envelopes
 *
 * Usage: npx tsx scripts/generate-music.ts
 * Output: public/music/*.wav
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/music');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── Audio constants ──────────────────────────────────────────────────────────
const SAMPLE_RATE = 44100;
const DURATION = 48; // seconds per loop
const NUM_SAMPLES = SAMPLE_RATE * DURATION;

// ─── Musical note frequencies (C2 to C6 with sharps/flats) ───────────────────
const NOTE_FREQ: Record<string, number> = {};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_MAP: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' };
for (let oct = 2; oct <= 6; oct++) {
  for (let i = 0; i < 12; i++) {
    const semitones = (oct - 4) * 12 + (i - 9); // A4 = 440Hz
    NOTE_FREQ[`${NOTE_NAMES[i]}${oct}`] = 440 * Math.pow(2, semitones / 12);
  }
}
// Add flat note aliases
for (let oct = 2; oct <= 6; oct++) {
  for (const [flat, sharp] of Object.entries(FLAT_MAP)) {
    NOTE_FREQ[`${flat}${oct}`] = NOTE_FREQ[`${sharp}${oct}`] || 440;
  }
}

// Seeded random for reproducible output
let seed = 42;
function seededRandom(): number {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ─── WAV file writer ──────────────────────────────────────────────────────────
function writeWav(filename: string, samples: Float32Array) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);           // PCM
  buffer.writeUInt16LE(1, 22);           // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`  Generated: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
}

// ─── Audio synthesis helpers ──────────────────────────────────────────────────

function sine(freq: number, t: number): number {
  return Math.sin(2 * Math.PI * freq * t);
}

function triangle(freq: number, t: number): number {
  const p = (freq * t) % 1;
  return 4 * Math.abs(p - 0.5) - 1;
}

function square(freq: number, t: number, duty = 0.5): number {
  return ((freq * t) % 1) < duty ? 0.8 : -0.8;
}

function sawtooth(freq: number, t: number): number {
  return 2 * ((freq * t) % 1) - 1;
}

function noise(): number {
  return Math.random() * 2 - 1;
}

// Exponential decay envelope (more natural than linear)
function expEnv(t: number, start: number, dur: number, attack = 0.01, decay = 0.3): number {
  const elapsed = t - start;
  if (elapsed < 0 || elapsed > dur) return 0;
  if (elapsed < attack) return elapsed / attack;
  return Math.exp(-elapsed / decay);
}

// ADSR envelope with exponential curves
function adsr(t: number, start: number, dur: number, a: number, d: number, s: number, r: number): number {
  const elapsed = t - start;
  if (elapsed < 0 || elapsed > dur) return 0;
  if (elapsed < a) return elapsed / a;
  if (elapsed < a + d) return 1 - (1 - s) * ((elapsed - a) / d);
  if (elapsed < dur - r) return s;
  return s * ((dur - elapsed) / r);
}

// Piano-like tone: multiple harmonics with independent decay rates
function pianoTone(freq: number, t: number, start: number, dur: number, vol = 0.2): number {
  const elapsed = t - start;
  if (elapsed < 0 || elapsed > dur) return 0;
  const attack = Math.min(1, elapsed / 0.005);
  const h1 = sine(freq, t) * Math.exp(-elapsed / 1.2) * 1.0;
  const h2 = sine(freq * 2, t) * Math.exp(-elapsed / 0.6) * 0.5;
  const h3 = sine(freq * 3, t) * Math.exp(-elapsed / 0.3) * 0.2;
  const h4 = sine(freq * 4, t) * Math.exp(-elapsed / 0.15) * 0.1;
  return (h1 + h2 + h3 + h4) * attack * vol;
}

// Warm pad: multiple detuned oscillators
function warmPad(freq: number, t: number, vol = 0.06): number {
  const detune = 1.003;
  const lfo = 1 + 0.002 * sine(0.3, t); // slow vibrato
  return (
    sine(freq * lfo, t) * vol +
    sine(freq * detune, t) * vol * 0.7 +
    sine(freq / detune, t) * vol * 0.7 +
    sine(freq * 2.001, t) * vol * 0.3 // octave shimmer
  );
}

// Brass-like: sawtooth with harmonics, bandpass feel
function brassTone(freq: number, t: number, start: number, dur: number, vol = 0.15): number {
  const env = adsr(t, start, dur, 0.03, 0.1, 0.7, 0.15);
  const vibrato = 1 + 0.004 * sine(5, t); // 5Hz vibrato
  const raw = sawtooth(freq * vibrato, t) * 0.5 + sine(freq * vibrato, t) * 0.5;
  return raw * env * vol;
}

// ─── Low-pass filter ─────────────────────────────────────────────────────────
function lowPass(samples: Float32Array, alpha: number): Float32Array {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
}

// Time-varying low-pass filter (for wah/sweep effects)
function sweepFilter(samples: Float32Array, freqStart: number, freqEnd: number, period: number): Float32Array {
  const out = new Float32Array(samples.length);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const phase = (t % period) / period;
    const cutoff = freqStart + (freqEnd - freqStart) * (0.5 + 0.5 * Math.sin(2 * Math.PI * phase));
    const alpha = Math.min(1, (2 * Math.PI * cutoff) / SAMPLE_RATE);
    prev = prev + alpha * (samples[i] - prev);
    out[i] = prev;
  }
  return out;
}

// ─── Reverb (Schroeder-style) ─────────────────────────────────────────────────
function reverb(samples: Float32Array, wetMix = 0.25, roomSize = 0.7): Float32Array {
  const out = new Float32Array(samples.length);
  // 4 comb filters at different prime-ish delay times
  const combDelays = [
    Math.round(0.0297 * SAMPLE_RATE),
    Math.round(0.0371 * SAMPLE_RATE),
    Math.round(0.0411 * SAMPLE_RATE),
    Math.round(0.0437 * SAMPLE_RATE),
  ];
  const combBuffers = combDelays.map(d => new Float32Array(d));
  const combIndices = [0, 0, 0, 0];
  const feedback = roomSize * 0.85;

  // 2 allpass filters
  const apDelays = [Math.round(0.005 * SAMPLE_RATE), Math.round(0.0017 * SAMPLE_RATE)];
  const apBuffers = apDelays.map(d => new Float32Array(d));
  const apIndices = [0, 0];
  const apGain = 0.5;

  for (let i = 0; i < samples.length; i++) {
    let wet = 0;

    // Sum comb filter outputs
    for (let c = 0; c < 4; c++) {
      const buf = combBuffers[c];
      const idx = combIndices[c];
      const delayed = buf[idx];
      buf[idx] = samples[i] + delayed * feedback;
      combIndices[c] = (idx + 1) % buf.length;
      wet += delayed;
    }
    wet *= 0.25;

    // Run through allpass filters
    for (let a = 0; a < 2; a++) {
      const buf = apBuffers[a];
      const idx = apIndices[a];
      const delayed = buf[idx];
      const input = wet + delayed * apGain;
      buf[idx] = wet - delayed * apGain;
      apIndices[a] = (idx + 1) % buf.length;
      wet = input;
    }

    out[i] = samples[i] * (1 - wetMix) + wet * wetMix;
  }
  return out;
}

// Mix multiple sample arrays
function mix(arrays: Float32Array[], volumes: number[]): Float32Array {
  const len = arrays[0]?.length || NUM_SAMPLES;
  const out = new Float32Array(len);
  for (let i = 0; i < arrays.length; i++) {
    const vol = volumes[i];
    const arr = arrays[i];
    for (let j = 0; j < len; j++) {
      out[j] += arr[j] * vol;
    }
  }
  return out;
}

// Humanize: add slight random timing offset to note start
function humanize(beat: number, beatDur: number, amount = 0.012): number {
  seed = (seed * 1664525 + 1013904223 + beat * 7919) & 0x7fffffff;
  const jitter = ((seed / 0x7fffffff) - 0.5) * amount;
  return beat * beatDur + jitter;
}

// Soft limiter to prevent clipping
function softLimit(samples: Float32Array): Float32Array {
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    samples[i] = x / (1 + Math.abs(x)) * 1.2; // soft saturation
  }
  return samples;
}

// ─── Track generators ─────────────────────────────────────────────────────────

// 1. Steady Focus: Lo-fi chill with piano, pads, vinyl texture
function generateSteadyFocus(): Float32Array {
  const bpm = 88;
  const beatDur = 60 / bpm;
  const piano = new Float32Array(NUM_SAMPLES);
  const pad = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const drums = new Float32Array(NUM_SAMPLES);
  const vinyl = new Float32Array(NUM_SAMPLES);

  const chords = [
    ['C4', 'E4', 'G4', 'B4'],   // Cmaj7
    ['A3', 'C4', 'E4', 'G4'],   // Am7
    ['F3', 'A3', 'C4', 'E4'],   // Fmaj7
    ['G3', 'B3', 'D4', 'F4'],   // G7
  ];
  const bassNotes = ['C3', 'C3', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2'];
  const melodyA = ['E5', 'D5', 'C5', 'B4', 'G4', 'A4', 'B4', 'C5'];
  const melodyB = ['G4', 'A4', 'C5', 'D5', 'E5', 'D5', 'B4', 'G4'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const chord = chords[measure % chords.length];
    const noteStart = humanize(beat, beatDur, 0.015);

    // Piano melody (alternating phrases every 8 bars)
    const melody = (Math.floor(beat / 8) % 2 === 0) ? melodyA : melodyB;
    const melIdx = beat % melody.length;
    const melFreq = NOTE_FREQ[melody[melIdx]] || 440;
    piano[i] += pianoTone(melFreq, t, noteStart, beatDur * 1.8, 0.12);

    // Piano chord hits every 2 beats
    if (beat % 2 === 0) {
      for (const note of chord) {
        piano[i] += pianoTone(NOTE_FREQ[note] || 261, t, noteStart, beatDur * 3, 0.04);
      }
    }

    // Warm background pad
    for (const note of chord) {
      pad[i] += warmPad(NOTE_FREQ[note] || 261, t, 0.025);
    }

    // Sub bass
    const bassFreq = NOTE_FREQ[bassNotes[beat % bassNotes.length]] || 65;
    bass[i] = sine(bassFreq, t) * 0.15 * adsr(t, noteStart, beatDur * 1.5, 0.02, 0.1, 0.8, 0.3);

    // Drums: soft kick + brushed hi-hat
    if (beat % 2 === 0) {
      const kickElapsed = t - noteStart;
      if (kickElapsed >= 0 && kickElapsed < 0.2) {
        drums[i] += sine(55 * Math.exp(-kickElapsed * 15), t) * Math.exp(-kickElapsed / 0.08) * 0.2;
      }
    }
    // Hi-hat on every beat with ghost notes on off-beats
    const hatStart = humanize(beat, beatDur, 0.008);
    const hatElapsed = t - hatStart;
    if (hatElapsed >= 0 && hatElapsed < 0.04) {
      const hatVol = beat % 2 === 0 ? 0.04 : 0.025;
      drums[i] += noise() * Math.exp(-hatElapsed / 0.012) * hatVol;
    }

    // Vinyl crackle (sparse random pops)
    if (Math.random() < 0.002) {
      vinyl[i] = (Math.random() - 0.5) * 0.02;
    }
  }

  let result = mix([piano, pad, bass, drums, vinyl], [1, 1, 1, 1, 1]);
  result = lowPass(result, 0.35); // lo-fi warmth
  result = reverb(result, 0.2, 0.5);
  return softLimit(result);
}

// 2. Upbeat Energy: Bright bouncy pop with punchy drums
function generateUpbeatEnergy(): Float32Array {
  const bpm = 120;
  const beatDur = 60 / bpm;
  const melody = new Float32Array(NUM_SAMPLES);
  const chords = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const drums = new Float32Array(NUM_SAMPLES);

  const scaleA = ['E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4',
                  'E4', 'F#4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4'];
  const scaleB = ['B4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4',
                  'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'G4', 'B4'];
  const chordProg = [
    ['E4', 'G#4', 'B4'], ['A3', 'C#4', 'E4'],
    ['D4', 'F#4', 'A4'], ['B3', 'D#4', 'F#4'],
  ];
  const bassLine = ['E2', 'E2', 'A2', 'A2', 'D2', 'D2', 'B2', 'B2'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const noteStart = humanize(beat, beatDur, 0.008);

    // Bright plucky melody (alternate phrases every 16 beats)
    const scale = (Math.floor(beat / 16) % 2 === 0) ? scaleA : scaleB;
    const noteIdx = beat % scale.length;
    const freq = NOTE_FREQ[scale[noteIdx]] || 440;
    const melElapsed = t - noteStart;
    if (melElapsed >= 0 && melElapsed < beatDur * 0.6) {
      const env = Math.exp(-melElapsed / 0.12) * Math.min(1, melElapsed / 0.005);
      melody[i] = (sine(freq, t) * 0.6 + triangle(freq, t) * 0.3 + sine(freq * 2, t) * 0.15) * env * 0.18;
    }

    // Chord stabs on off-beats with pump effect
    const chord = chordProg[measure % chordProg.length];
    if (beat % 2 === 1) {
      const chordEnv = adsr(t, noteStart, beatDur * 0.4, 0.005, 0.1, 0.5, 0.1);
      for (const note of chord) {
        const cf = NOTE_FREQ[note] || 330;
        chords[i] += (sine(cf, t) * 0.5 + square(cf, t, 0.3) * 0.2) * chordEnv * 0.05;
      }
    }

    // Bouncy bass with sidechain-like pumping
    const bassFreq = NOTE_FREQ[bassLine[beat % bassLine.length]] || 82;
    const beatPhase = (t - Math.floor(t / beatDur) * beatDur) / beatDur;
    const pump = Math.min(1, beatPhase * 4); // fast attack, stays at 1
    bass[i] = sine(bassFreq, t) * 0.2 * pump * adsr(t, noteStart, beatDur * 0.9, 0.01, 0.1, 0.8, 0.15);

    // Drums: punchy kick, crisp snare, shaker
    // Kick on 1 and 3
    if (beat % 2 === 0) {
      const kE = t - noteStart;
      if (kE >= 0 && kE < 0.15) {
        drums[i] += sine(60 * Math.exp(-kE * 25), t) * Math.exp(-kE / 0.06) * 0.3;
        drums[i] += sine(40, t) * Math.exp(-kE / 0.1) * 0.15; // sub thump
      }
    }
    // Snare on 2 and 4
    if (beat % 2 === 1) {
      const sE = t - noteStart;
      if (sE >= 0 && sE < 0.1) {
        drums[i] += noise() * Math.exp(-sE / 0.03) * 0.15;
        drums[i] += sine(200, t) * Math.exp(-sE / 0.02) * 0.08; // snare body
      }
    }
    // 16th note shaker
    const sixteenth = Math.floor(t / (beatDur / 4));
    const shakerStart = sixteenth * (beatDur / 4);
    const shakerE = t - shakerStart;
    if (shakerE >= 0 && shakerE < 0.02) {
      drums[i] += noise() * Math.exp(-shakerE / 0.008) * 0.03;
    }
  }

  let result = mix([melody, chords, bass, drums], [1, 1, 1, 1]);
  result = reverb(result, 0.15, 0.4);
  return softLimit(result);
}

// 3. Chill Vibes: Ambient pads with gentle arpeggios
function generateChillVibes(): Float32Array {
  const bpm = 76;
  const beatDur = 60 / bpm;
  const pad = new Float32Array(NUM_SAMPLES);
  const arp = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const texture = new Float32Array(NUM_SAMPLES);

  const chords = [
    ['C4', 'E4', 'G4', 'B4'],
    ['A3', 'C4', 'E4', 'G4'],
    ['D4', 'F4', 'A4', 'C5'],
    ['G3', 'B3', 'D4', 'F4'],
  ];
  const arpA = ['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4'];
  const arpB = ['A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'];
  const bassNotes = ['C3', 'C3', 'A2', 'A2', 'D3', 'D3', 'G2', 'G2'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const chord = chords[measure % chords.length];
    const noteStart = humanize(beat, beatDur, 0.02);

    // Lush evolving pad with filter sweep
    for (const note of chord) {
      const freq = NOTE_FREQ[note] || 261;
      pad[i] += warmPad(freq, t, 0.035);
    }

    // Gentle arpeggio (alternate patterns)
    const arpNotes = (Math.floor(beat / 8) % 2 === 0) ? arpA : arpB;
    const arpFreq = NOTE_FREQ[arpNotes[beat % arpNotes.length]] || 261;
    const arpE = t - noteStart;
    if (arpE >= 0 && arpE < beatDur * 1.2) {
      arp[i] = sine(arpFreq, t) * Math.exp(-arpE / 0.8) * Math.min(1, arpE / 0.03) * 0.08;
      arp[i] += sine(arpFreq * 2, t) * Math.exp(-arpE / 0.4) * Math.min(1, arpE / 0.03) * 0.03;
    }

    // Very soft sub bass
    const bassFreq = NOTE_FREQ[bassNotes[beat % bassNotes.length]] || 65;
    bass[i] = sine(bassFreq, t) * 0.1 * adsr(t, noteStart, beatDur * 2, 0.05, 0.2, 0.6, 0.5);

    // Subtle noise texture (filtered)
    if (Math.random() < 0.5) {
      texture[i] = noise() * 0.003;
    }
  }

  let result = mix([pad, arp, bass, texture], [1, 1, 1, 1]);
  result = sweepFilter(result, 400, 4000, 8.0); // slow filter sweep
  result = reverb(result, 0.35, 0.8); // lots of reverb
  return softLimit(result);
}

// 4. Adventure Quest: Epic march with brass and timpani
function generateAdventureQuest(): Float32Array {
  const bpm = 112;
  const beatDur = 60 / bpm;
  const brass = new Float32Array(NUM_SAMPLES);
  const melody = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const drums = new Float32Array(NUM_SAMPLES);

  const chordProg = [
    ['C4', 'E4', 'G4'], ['C4', 'E4', 'G4'],
    ['F3', 'A3', 'C4'], ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'], ['G3', 'B3', 'D4'],
    ['A3', 'C4', 'E4'], ['G3', 'B3', 'D4'],
  ];
  const melA = ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'D5', 'C5',
                'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5', 'C5'];
  const melB = ['E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'A4', 'B4',
                'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'C5', 'B4'];
  const bassLine = ['C3', 'C3', 'F2', 'F2', 'G2', 'G2', 'A2', 'G2'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 2);
    const noteStart = humanize(beat, beatDur, 0.005);

    // Brass chord stabs
    const chord = chordProg[measure % chordProg.length];
    for (const note of chord) {
      brass[i] += brassTone(NOTE_FREQ[note] || 261, t, noteStart, beatDur * 1.8, 0.07);
    }

    // Bold melody (alternate phrases)
    const mel = (Math.floor(beat / 16) % 2 === 0) ? melA : melB;
    const melFreq = NOTE_FREQ[mel[beat % mel.length]] || 440;
    melody[i] = brassTone(melFreq, t, noteStart, beatDur * 0.7, 0.12);

    // Driving eighth-note bass
    const eighthBeat = Math.floor(t / (beatDur / 2));
    const eighthStart = eighthBeat * (beatDur / 2);
    const bassFreq = NOTE_FREQ[bassLine[beat % bassLine.length]] || 65;
    const bassE = t - eighthStart;
    if (bassE >= 0 && bassE < beatDur / 2 * 0.8) {
      bass[i] = sine(bassFreq, t) * Math.exp(-bassE / 0.15) * Math.min(1, bassE / 0.01) * 0.2;
    }

    // Drums: march-style kick + snare with reverb
    // Kick on every beat
    const kickE = t - noteStart;
    if (kickE >= 0 && kickE < 0.15) {
      drums[i] += sine(80 * Math.exp(-kickE * 18), t) * Math.exp(-kickE / 0.05) * 0.25;
    }
    // Snare on 2 and 4
    if (beat % 2 === 1) {
      if (kickE >= 0 && kickE < 0.12) {
        drums[i] += noise() * Math.exp(-kickE / 0.04) * 0.18;
        drums[i] += sine(180, t) * Math.exp(-kickE / 0.02) * 0.06;
      }
    }
    // Timpani-like hit on measure downbeats
    if (beat % 4 === 0) {
      if (kickE >= 0 && kickE < 0.3) {
        drums[i] += sine(65 * Math.exp(-kickE * 5), t) * Math.exp(-kickE / 0.15) * 0.15;
      }
    }
  }

  let result = mix([brass, melody, bass, drums], [1, 1, 1, 1]);
  result = reverb(result, 0.2, 0.5);
  return softLimit(result);
}

// 5. Funky Groove: Syncopated funk with wah chords
function generateFunkyGroove(): Float32Array {
  const bpm = 105;
  const beatDur = 60 / bpm;
  const bass = new Float32Array(NUM_SAMPLES);
  const keys = new Float32Array(NUM_SAMPLES);
  const drums = new Float32Array(NUM_SAMPLES);
  const lead = new Float32Array(NUM_SAMPLES);

  const bassPattern = [1,0,1,0, 0,1,1,0, 1,0,0,1, 0,1,1,0];
  const bassNotes = ['E2','E2','G2','A2', 'E2','G2','A2','B2',
                     'E2','E2','D2','E2', 'G2','A2','G2','E2'];
  const chordProg = [
    ['E3','G#3','B3'], ['A3','C#4','E4'],
    ['D3','F#3','A3'], ['G3','B3','D4'],
  ];
  const leadNotes = ['E4','G4','A4','B4', 'E5','D5','B4','A4',
                     'G4','A4','B4','D5', 'E5','D5','B4','G4'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const sixteenth = Math.floor(t / (beatDur / 4));
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const noteStart16 = humanize(sixteenth, beatDur / 4, 0.006);

    // Funky slap bass (filtered sawtooth with fast decay)
    const patIdx = sixteenth % bassPattern.length;
    if (bassPattern[patIdx]) {
      const bassFreq = NOTE_FREQ[bassNotes[patIdx]] || 82;
      const bE = t - noteStart16;
      if (bE >= 0 && bE < beatDur / 4 * 0.8) {
        const env = Math.exp(-bE / 0.06) * Math.min(1, bE / 0.003);
        bass[i] = sawtooth(bassFreq, t) * env * 0.18;
      }
    }

    // Wah-like chord stabs on off-beats (chords through sweep filter added later)
    if (beat % 2 === 1) {
      const chord = chordProg[measure % chordProg.length];
      const chordStart = humanize(beat, beatDur, 0.01);
      const cE = t - chordStart;
      if (cE >= 0 && cE < beatDur * 0.35) {
        const env = Math.exp(-cE / 0.08) * Math.min(1, cE / 0.005);
        for (const note of chord) {
          const cf = NOTE_FREQ[note] || 330;
          keys[i] += (square(cf, t, 0.4) * 0.4 + sawtooth(cf, t) * 0.3) * env * 0.04;
        }
      }
    }

    // Funky lead (every other measure)
    if (Math.floor(beat / 8) % 2 === 1) {
      const lFreq = NOTE_FREQ[leadNotes[beat % leadNotes.length]] || 440;
      const lStart = humanize(beat, beatDur, 0.01);
      const lE = t - lStart;
      if (lE >= 0 && lE < beatDur * 0.5) {
        const env = Math.exp(-lE / 0.15) * Math.min(1, lE / 0.005);
        lead[i] = sine(lFreq, t) * 0.6 * env * 0.1 + sine(lFreq * 2, t) * 0.3 * env * 0.05;
      }
    }

    // Drums: tight kit
    const beatStart = humanize(beat, beatDur, 0.004);
    const bkE = t - beatStart;
    // Kick on 1 and 3
    if (beat % 2 === 0 && bkE >= 0 && bkE < 0.12) {
      drums[i] += sine(55 * Math.exp(-bkE * 20), t) * Math.exp(-bkE / 0.05) * 0.25;
    }
    // Clap on 2 and 4
    if (beat % 2 === 1 && bkE >= 0 && bkE < 0.08) {
      drums[i] += noise() * Math.exp(-bkE / 0.025) * 0.12;
    }
    // Hi-hat 16ths with ghost notes
    const hatE = t - noteStart16;
    if (hatE >= 0 && hatE < 0.025) {
      const accent = (sixteenth % 4 === 0) ? 0.05 : (sixteenth % 2 === 0) ? 0.03 : 0.018;
      drums[i] += noise() * Math.exp(-hatE / 0.008) * accent;
    }
  }

  let result = mix([bass, keys, lead, drums], [1, 1, 1, 1]);
  // Apply wah sweep to the keys
  const keysWah = sweepFilter(keys, 300, 3000, beatDur * 4);
  result = mix([bass, keysWah, lead, drums], [1, 1, 1, 1]);
  result = lowPass(result, 0.5);
  result = reverb(result, 0.12, 0.3);
  return softLimit(result);
}

// 6. Space Explorer: Deep ambient with shimmering arpeggios
function generateSpaceExplorer(): Float32Array {
  const bpm = 70;
  const beatDur = 60 / bpm;
  const pad = new Float32Array(NUM_SAMPLES);
  const shimmer = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const sparkle = new Float32Array(NUM_SAMPLES);

  const chords = [
    ['C4', 'Eb4', 'G4', 'Bb4'],
    ['Ab3', 'C4', 'Eb4', 'G4'],
    ['Bb3', 'D4', 'F4', 'Ab4'],
    ['G3', 'Bb3', 'D4', 'F4'],
  ];
  const shimNotes = ['G4', 'Bb4', 'C5', 'Eb5', 'G5', 'Eb5', 'C5', 'Bb4',
                     'D5', 'F5', 'Ab5', 'F5', 'D5', 'Bb4', 'G4', 'F4'];
  const bassNotes = ['C2', 'C2', 'Ab2', 'Ab2', 'Bb2', 'Bb2', 'G2', 'G2'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const chord = chords[measure % chords.length];
    const noteStart = humanize(beat, beatDur, 0.025);

    // Deep evolving pad with multiple voices
    for (const note of chord) {
      const freq = NOTE_FREQ[note] || 261;
      const lfo1 = 1 + 0.003 * sine(0.15, t);
      const lfo2 = 1 + 0.004 * sine(0.23, t + 1.5);
      pad[i] += sine(freq * lfo1, t) * 0.04;
      pad[i] += sine(freq * lfo2 * 1.002, t) * 0.03;
      pad[i] += triangle(freq * 0.5, t) * 0.015; // sub-octave body
    }

    // Shimmering arpeggio with long tail
    const shimFreq = NOTE_FREQ[shimNotes[beat % shimNotes.length]] || 440;
    const sE = t - noteStart;
    if (sE >= 0 && sE < beatDur * 2) {
      const env = Math.exp(-sE / 1.5) * Math.min(1, sE / 0.04);
      shimmer[i] = sine(shimFreq, t) * env * 0.06;
      shimmer[i] += sine(shimFreq * 2, t) * env * 0.025;
      shimmer[i] += sine(shimFreq * 3, t) * env * 0.01;
    }

    // Deep sub-bass pulses
    const bassFreq = NOTE_FREQ[bassNotes[beat % bassNotes.length]] || 32;
    bass[i] = sine(bassFreq, t) * 0.12 * adsr(t, noteStart, beatDur * 2, 0.1, 0.3, 0.5, 0.8);

    // Random sparkle (high-pitched pings)
    seed = (seed * 1664525 + 1013904223 + i * 13) & 0x7fffffff;
    if ((seed & 0xffff) < 8) { // very sparse
      const sparkFreq = 2000 + (seed % 3000);
      sparkle[i] = sine(sparkFreq, t) * 0.015;
    }
  }

  let result = mix([pad, shimmer, bass, sparkle], [1, 1, 1, 1]);
  result = reverb(result, 0.4, 0.9); // very wet reverb
  result = lowPass(result, 0.2); // dreamy
  return softLimit(result);
}

// 7. Victory March: Triumphant with soaring lead and power chords
function generateVictoryMarch(): Float32Array {
  const bpm = 132;
  const beatDur = 60 / bpm;
  const chordTrack = new Float32Array(NUM_SAMPLES);
  const melody = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const drums = new Float32Array(NUM_SAMPLES);

  const chordProg = [
    ['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'],
    ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4'],
    ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'], ['G3', 'B3', 'D4'],
  ];
  const melA = ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5',
                'C5', 'C5', 'D5', 'E5', 'E5', 'D5', 'D5', 'D5'];
  const melB = ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5',
                'C5', 'C5', 'D5', 'E5', 'D5', 'C5', 'C5', 'C5'];
  const bassLine = ['C3', 'C3', 'F2', 'F2', 'G2', 'G2', 'C3', 'C3',
                    'A2', 'A2', 'F2', 'F2', 'G2', 'G2', 'G2', 'G2'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const halfBeat = Math.floor(beat / 2);
    const noteStart = humanize(beat, beatDur, 0.005);

    // Power chords with rich harmonics
    const chord = chordProg[halfBeat % chordProg.length];
    const chordEnv = adsr(t, noteStart, beatDur * 1.8, 0.01, 0.15, 0.7, 0.3);
    for (const note of chord) {
      const freq = NOTE_FREQ[note] || 261;
      chordTrack[i] += (sine(freq, t) * 0.5 + sine(freq * 2, t) * 0.2 +
                        square(freq, t, 0.3) * 0.15 + sine(freq * 3, t) * 0.08) * chordEnv * 0.06;
    }

    // Soaring lead with vibrato (alternate phrases)
    const mel = (Math.floor(beat / 16) % 2 === 0) ? melA : melB;
    const melFreq = NOTE_FREQ[mel[beat % mel.length]] || 440;
    const vibrato = 1 + 0.005 * sine(5.5, t); // 5.5Hz vibrato
    const melEnv = adsr(t, noteStart, beatDur * 0.75, 0.01, 0.08, 0.8, 0.12);
    melody[i] = (sine(melFreq * vibrato, t) * 0.5 + triangle(melFreq * vibrato, t) * 0.3 +
                 sine(melFreq * vibrato * 2, t) * 0.15) * melEnv * 0.14;

    // Strong bass
    const bassFreq = NOTE_FREQ[bassLine[beat % bassLine.length]] || 65;
    bass[i] = sine(bassFreq, t) * 0.2 * adsr(t, noteStart, beatDur * 0.9, 0.01, 0.05, 0.9, 0.1);
    bass[i] += sine(bassFreq * 0.5, t) * 0.08 * adsr(t, noteStart, beatDur * 0.9, 0.01, 0.1, 0.7, 0.15); // sub

    // Energetic drums
    const kickE = t - noteStart;
    // Heavy kick on 1 and 3
    if (beat % 2 === 0 && kickE >= 0 && kickE < 0.15) {
      drums[i] += sine(70 * Math.exp(-kickE * 22), t) * Math.exp(-kickE / 0.05) * 0.3;
      drums[i] += sine(35, t) * Math.exp(-kickE / 0.1) * 0.12; // sub drop
    }
    // Snare on 2 and 4 with march rolls
    if (beat % 2 === 1 && kickE >= 0 && kickE < 0.1) {
      drums[i] += noise() * Math.exp(-kickE / 0.03) * 0.2;
      drums[i] += sine(200, t) * Math.exp(-kickE / 0.015) * 0.08;
    }
    // March roll fill every 8 beats
    if (beat % 8 === 7) {
      const roll16 = Math.floor(t / (beatDur / 4));
      const rollStart = roll16 * (beatDur / 4);
      const rollE = t - rollStart;
      if (rollE >= 0 && rollE < 0.04) {
        drums[i] += noise() * Math.exp(-rollE / 0.015) * 0.1;
      }
    }
    // Hi-hat on every 8th note
    const eighth = Math.floor(t / (beatDur / 2));
    const eighthStart = eighth * (beatDur / 2);
    const hatE = t - eighthStart;
    if (hatE >= 0 && hatE < 0.03) {
      drums[i] += noise() * Math.exp(-hatE / 0.01) * 0.045;
    }
  }

  let result = mix([chordTrack, melody, bass, drums], [1, 1, 1, 1]);
  result = reverb(result, 0.18, 0.45);
  return softLimit(result);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const tracks: [string, () => Float32Array][] = [
  ['bgm-steady-focus.wav', generateSteadyFocus],
  ['bgm-upbeat-energy.wav', generateUpbeatEnergy],
  ['bgm-chill-vibes.wav', generateChillVibes],
  ['bgm-adventure-quest.wav', generateAdventureQuest],
  ['bgm-funky-groove.wav', generateFunkyGroove],
  ['bgm-space-explorer.wav', generateSpaceExplorer],
  ['bgm-victory-march.wav', generateVictoryMarch],
];

console.log(`Generating ${tracks.length} background music tracks...`);
console.log(`Sample rate: ${SAMPLE_RATE}Hz, Duration: ${DURATION}s\n`);

for (const [filename, generator] of tracks) {
  seed = 42; // Reset seed per track for reproducibility
  const samples = generator();
  writeWav(filename, samples);
}

console.log(`\nDone! Files saved to ${OUTPUT_DIR}`);
