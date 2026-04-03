/**
 * Generate 7 instrumental background music loops as WAV files
 * Each track has a distinct mood using different tempos, scales, and patterns
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
const SAMPLE_RATE = 22050;
const DURATION = 32; // seconds per loop
const NUM_SAMPLES = SAMPLE_RATE * DURATION;

// ─── Musical note frequencies ─────────────────────────────────────────────────
const NOTE_FREQ: Record<string, number> = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
  'Eb3': 155.56, 'Bb3': 233.08, 'Eb4': 311.13, 'Ab4': 415.30, 'Bb4': 466.16,
  'F#3': 185.00, 'F#4': 369.99,
};

// ─── WAV file writer ──────────────────────────────────────────────────────────
function writeWav(filename: string, samples: Float32Array) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM
  buffer.writeUInt16LE(1, 22);           // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);           // block align
  buffer.writeUInt16LE(16, 34);          // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Audio data
  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`  Generated: ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
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

// Soft envelope (attack-sustain-release)
function envelope(t: number, noteStart: number, noteDur: number, attack = 0.02, release = 0.1): number {
  const elapsed = t - noteStart;
  if (elapsed < 0 || elapsed > noteDur) return 0;
  if (elapsed < attack) return elapsed / attack;
  if (elapsed > noteDur - release) return (noteDur - elapsed) / release;
  return 1;
}

// Simple low-pass filter (exponential moving average)
function lowPass(samples: Float32Array, alpha: number): Float32Array {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
}

// Soft noise (filtered white noise for lo-fi texture)
function noise(): number {
  return (Math.random() * 2 - 1);
}

// Mix multiple sample arrays
function mix(arrays: Float32Array[], volumes: number[]): Float32Array {
  const out = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < arrays.length; i++) {
    const vol = volumes[i];
    const arr = arrays[i];
    for (let j = 0; j < NUM_SAMPLES; j++) {
      out[j] += arr[j] * vol;
    }
  }
  return out;
}

// ─── Track generators ─────────────────────────────────────────────────────────

// 1. Steady Focus: Calm lo-fi beat with soft marimba tones
function generateSteadyFocus(): Float32Array {
  const bpm = 90;
  const beatDur = 60 / bpm;
  const melody = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const hihat = new Float32Array(NUM_SAMPLES);

  const scale = ['C4', 'E4', 'G4', 'A4', 'C5', 'E4', 'G4', 'D5'];
  const bassNotes = ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'F3', 'F3'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const noteIdx = beat % scale.length;
    const noteStart = beat * beatDur;
    const noteDur = beatDur * 0.7;

    // Marimba-like tone (triangle + fast decay)
    const env = envelope(t, noteStart, noteDur, 0.005, 0.3);
    const freq = NOTE_FREQ[scale[noteIdx]];
    melody[i] = triangle(freq, t) * env * 0.3 + sine(freq * 2, t) * env * 0.1;

    // Soft bass
    if (beat % 2 === 0) {
      const bassFreq = NOTE_FREQ[bassNotes[beat % bassNotes.length]];
      const bassEnv = envelope(t, noteStart, beatDur * 1.5, 0.01, 0.5);
      bass[i] = sine(bassFreq, t) * bassEnv * 0.25;
    }

    // Hi-hat every beat
    const hihatEnv = envelope(t, noteStart, 0.05, 0.001, 0.04);
    hihat[i] = noise() * hihatEnv * 0.08;
  }

  return lowPass(mix([melody, bass, hihat], [1, 1, 1]), 0.3);
}

// 2. Upbeat Energy: Bright bouncy melody
function generateUpbeatEnergy(): Float32Array {
  const bpm = 120;
  const beatDur = 60 / bpm;
  const melody = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const perc = new Float32Array(NUM_SAMPLES);

  const scale = ['E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4',
                 'E4', 'F#4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4'];
  const bassPattern = ['E3', 'E3', 'A3', 'A3', 'D3', 'D3', 'G3', 'G3'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const noteStart = beat * beatDur;

    // Bright melody
    const noteIdx = beat % scale.length;
    const env = envelope(t, noteStart, beatDur * 0.5, 0.01, 0.15);
    const freq = NOTE_FREQ[scale[noteIdx]];
    melody[i] = sine(freq, t) * env * 0.25 + triangle(freq, t) * env * 0.15;

    // Bouncy bass
    const bassFreq = NOTE_FREQ[bassPattern[beat % bassPattern.length]];
    const bassEnv = envelope(t, noteStart, beatDur * 0.8, 0.01, 0.3);
    bass[i] = sine(bassFreq, t) * bassEnv * 0.3;

    // Kick on beats 0,2 and snare on 1,3
    if (beat % 4 < 2) {
      const kickEnv = envelope(t, noteStart, 0.15, 0.001, 0.1);
      perc[i] += sine(60 * Math.exp(-(t - noteStart) * 20), t) * kickEnv * 0.3;
    }
    if (beat % 4 >= 2) {
      const snareEnv = envelope(t, noteStart, 0.08, 0.001, 0.06);
      perc[i] += noise() * snareEnv * 0.12;
    }
  }

  return mix([melody, bass, perc], [1, 1, 1]);
}

// 3. Chill Vibes: Warm pads with slow arpeggios
function generateChillVibes(): Float32Array {
  const bpm = 80;
  const beatDur = 60 / bpm;
  const pad = new Float32Array(NUM_SAMPLES);
  const arp = new Float32Array(NUM_SAMPLES);

  const chords = [
    ['C4', 'E4', 'G4'],
    ['A3', 'C4', 'E4'],
    ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'],
  ];
  const arpNotes = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'D4',
                    'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'C4'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const chord = chords[measure % chords.length];
    const noteStart = beat * beatDur;

    // Warm pad (layered sines)
    for (const note of chord) {
      const freq = NOTE_FREQ[note];
      pad[i] += sine(freq, t) * 0.08 + sine(freq * 1.002, t) * 0.06; // slight detune for warmth
    }

    // Gentle arpeggio
    const arpFreq = NOTE_FREQ[arpNotes[beat % arpNotes.length]];
    const arpEnv = envelope(t, noteStart, beatDur * 0.6, 0.02, 0.25);
    arp[i] = triangle(arpFreq, t) * arpEnv * 0.15;
  }

  return lowPass(mix([pad, arp], [1, 1]), 0.25);
}

// 4. Adventure Quest: Marching rhythm with ascending patterns
function generateAdventureQuest(): Float32Array {
  const bpm = 110;
  const beatDur = 60 / bpm;
  const melody = new Float32Array(NUM_SAMPLES);
  const bass = new Float32Array(NUM_SAMPLES);
  const drum = new Float32Array(NUM_SAMPLES);

  const scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4',
                 'F4', 'G4', 'A4', 'C5', 'D5', 'C5', 'A4', 'G4'];
  const bassLine = ['C3', 'C3', 'F3', 'F3', 'G3', 'G3', 'C3', 'C3'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const noteStart = beat * beatDur;

    // Bold melody
    const freq = NOTE_FREQ[scale[beat % scale.length]];
    const env = envelope(t, noteStart, beatDur * 0.6, 0.01, 0.2);
    melody[i] = (sine(freq, t) * 0.2 + square(freq, t, 0.3) * 0.08) * env;

    // Strong bass
    const bassFreq = NOTE_FREQ[bassLine[beat % bassLine.length]];
    const bassEnv = envelope(t, noteStart, beatDur, 0.01, 0.4);
    bass[i] = sine(bassFreq, t) * bassEnv * 0.25;

    // March drum
    const kickEnv = envelope(t, noteStart, 0.12, 0.001, 0.08);
    drum[i] = sine(80 * Math.exp(-(t - noteStart) * 15), t) * kickEnv * 0.25;
    if (beat % 2 === 1) {
      const snareDur = 0.06;
      const snareEnv = envelope(t, noteStart, snareDur, 0.001, 0.05);
      drum[i] += noise() * snareEnv * 0.1;
    }
  }

  return mix([melody, bass, drum], [1, 1, 1]);
}

// 5. Funky Groove: Syncopated bass with playful rhythm
function generateFunkyGroove(): Float32Array {
  const bpm = 105;
  const beatDur = 60 / bpm;
  const halfBeat = beatDur / 2;
  const bass = new Float32Array(NUM_SAMPLES);
  const keys = new Float32Array(NUM_SAMPLES);
  const hat = new Float32Array(NUM_SAMPLES);

  // Syncopated bass pattern (16th-note feel)
  const bassPattern = [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0];
  const bassNotes = ['E3', 'E3', 'G3', 'A3', 'E3', 'G3', 'A3', 'B3',
                     'E3', 'E3', 'D3', 'E3', 'G3', 'A3', 'G3', 'E3'];
  const keyChords = [['E4', 'G4', 'B4'], ['A3', 'C4', 'E4'], ['D4', 'F#4', 'A4'], ['G3', 'B3', 'D4']];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const sixteenth = Math.floor(t / (beatDur / 4));
    const beat = Math.floor(t / beatDur);
    const noteStart16 = sixteenth * (beatDur / 4);
    const noteStartBeat = beat * beatDur;

    // Funky bass
    const patIdx = sixteenth % bassPattern.length;
    if (bassPattern[patIdx]) {
      const bassFreq = NOTE_FREQ[bassNotes[patIdx]];
      const env = envelope(t, noteStart16, beatDur / 4 * 0.8, 0.005, 0.05);
      bass[i] = sawtooth(bassFreq, t) * env * 0.2;
    }

    // Stab chords on off-beats
    if (beat % 2 === 1) {
      const chord = keyChords[Math.floor(beat / 2) % keyChords.length];
      const chordEnv = envelope(t, noteStartBeat, beatDur * 0.3, 0.005, 0.1);
      for (const note of chord) {
        keys[i] += square(NOTE_FREQ[note], t, 0.4) * chordEnv * 0.06;
      }
    }

    // Hi-hat pattern
    const hatEnv = envelope(t, noteStart16, 0.03, 0.001, 0.025);
    hat[i] = noise() * hatEnv * 0.06;
  }

  return lowPass(mix([bass, keys, hat], [1, 1, 1]), 0.4);
}

// 6. Space Explorer: Dreamy synth pads with ethereal arpeggios
function generateSpaceExplorer(): Float32Array {
  const bpm = 75;
  const beatDur = 60 / bpm;
  const pad = new Float32Array(NUM_SAMPLES);
  const shimmer = new Float32Array(NUM_SAMPLES);

  const chords = [
    ['C4', 'Eb4', 'G4'],
    ['Ab4', 'C4', 'Eb4'],
    ['Bb3', 'D4', 'F4'],
    ['G3', 'Bb3', 'D4'],
  ];
  const shimmerNotes = ['G4', 'Bb4', 'C5', 'Eb4', 'G4', 'D5', 'C5', 'Bb4'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const measure = Math.floor(beat / 4);
    const chord = chords[measure % chords.length];
    const noteStart = beat * beatDur;

    // Warm evolving pad
    for (const note of chord) {
      const freq = NOTE_FREQ[note];
      // Slow LFO modulation for movement
      const lfo = 1 + 0.003 * Math.sin(2 * Math.PI * 0.2 * t);
      pad[i] += sine(freq * lfo, t) * 0.07;
      pad[i] += sine(freq * 2.001, t) * 0.03; // octave shimmer
    }

    // Ethereal arpeggio
    const shimFreq = NOTE_FREQ[shimmerNotes[beat % shimmerNotes.length]] || 440;
    const shimEnv = envelope(t, noteStart, beatDur * 0.8, 0.05, 0.5);
    shimmer[i] = sine(shimFreq, t) * shimEnv * 0.1 + sine(shimFreq * 2, t) * shimEnv * 0.04;
  }

  return lowPass(mix([pad, shimmer], [1, 1]), 0.2);
}

// 7. Victory March: Triumphant chords with uplifting progression
function generateVictoryMarch(): Float32Array {
  const bpm = 130;
  const beatDur = 60 / bpm;
  const chords = new Float32Array(NUM_SAMPLES);
  const melody = new Float32Array(NUM_SAMPLES);
  const drum = new Float32Array(NUM_SAMPLES);

  const chordProg = [
    ['C4', 'E4', 'G4'],
    ['F4', 'A4', 'C5'],
    ['G4', 'B4', 'D5'],
    ['C4', 'E4', 'G4'],
    ['A3', 'C4', 'E4'],
    ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'],
    ['C4', 'E4', 'G4'],
  ];
  const melodyNotes = ['E5', 'D5', 'C5', 'E5', 'G5', 'E5', 'D5', 'C5',
                       'A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'G4', 'C5'];

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const beat = Math.floor(t / beatDur);
    const noteStart = beat * beatDur;

    // Power chords
    const chord = chordProg[Math.floor(beat / 2) % chordProg.length];
    const chordEnv = envelope(t, noteStart, beatDur * 1.5, 0.01, 0.5);
    for (const note of chord) {
      const freq = NOTE_FREQ[note];
      chords[i] += (sine(freq, t) * 0.12 + square(freq, t, 0.3) * 0.04) * chordEnv;
    }

    // Bright melody
    const melFreq = NOTE_FREQ[melodyNotes[beat % melodyNotes.length]];
    const melEnv = envelope(t, noteStart, beatDur * 0.6, 0.01, 0.15);
    melody[i] = triangle(melFreq, t) * melEnv * 0.2;

    // Energetic drums
    if (beat % 2 === 0) {
      const kickEnv = envelope(t, noteStart, 0.1, 0.001, 0.08);
      drum[i] += sine(100 * Math.exp(-(t - noteStart) * 25), t) * kickEnv * 0.3;
    }
    if (beat % 2 === 1) {
      const snareEnv = envelope(t, noteStart, 0.06, 0.001, 0.05);
      drum[i] += noise() * snareEnv * 0.15;
    }
    // Hi-hat every beat
    const hatEnv = envelope(t, noteStart, 0.03, 0.001, 0.025);
    drum[i] += noise() * hatEnv * 0.05;
  }

  return mix([chords, melody, drum], [1, 1, 1]);
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
  const samples = generator();
  writeWav(filename, samples);
}

console.log(`\nDone! Files saved to ${OUTPUT_DIR}`);
