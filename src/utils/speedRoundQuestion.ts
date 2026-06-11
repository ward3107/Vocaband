/**
 * speedRoundQuestion — pure, client-side Speed Round question builder.
 *
 * The server has NO vocabulary (see docs/speed-round-design.md §3), so the
 * teacher's HOST screen authors each word's {prompt, options, correctIndex}
 * here and sends it on SPEED_START. The server stores correctIndex privately
 * and scores by index — these functions never run on the server.
 *
 * Distractor selection reuses the SAME rules as the regular game
 * (useGameRoundOptions): unique by id, different English text, and different
 * L1 (Hebrew/Arabic) translation so the option grid never shows the same
 * answer twice. Factored out as a pure helper so both call sites agree.
 */
import type { Word } from "../data/vocabulary";
import { shuffle, secureRandomInt } from "../utils";
import type { QpSpeedMode, QpSpeedPromptKind } from "../core/quickPlayProtocol";

/** The shape the host sends on SPEED_START (minus the transport fields). */
export interface SpeedQuestion {
  mode: QpSpeedMode;
  prompt: string;
  promptKind: QpSpeedPromptKind;
  options: string[];
  correctIndex: number;
}

/** Which translation column a session reads for its non-English answers. */
export type L1 = "he" | "ar";

const l1Of = (w: Word, l1: L1): string => (l1 === "he" ? w.hebrew : w.arabic) || "";

/** Two words "collide" if they share English text or an L1 translation —
 *  the same filter useGameRoundOptions uses so distractors never duplicate
 *  the correct answer's glyph. */
function collides(a: Word, b: Word, l1: L1): boolean {
  if (a.id === b.id) return true;
  if (a.english.trim().toLowerCase() === b.english.trim().toLowerCase()) return true;
  const av = l1Of(a, l1).trim();
  const bv = l1Of(b, l1).trim();
  return !!av && av === bv;
}

/**
 * Pick up to `count` distractor words for `correct`, drawing first from the
 * session's own `pool`, then topping up from `fallback` (the full vocab) —
 * mirroring useGameRoundOptions' two-tier strategy.
 */
export function pickDistractors(
  correct: Word,
  pool: Word[],
  fallback: Word[],
  count: number,
  l1: L1,
): Word[] {
  const usable = (w: Word) => !collides(w, correct, l1);
  const chosen: Word[] = [];
  const seenIds = new Set<number>([correct.id]);
  const seenL1 = new Set<string>([l1Of(correct, l1).trim()].filter(Boolean));

  for (const w of [...shuffle(pool.filter(usable)), ...shuffle(fallback.filter(usable))]) {
    if (chosen.length >= count) break;
    if (seenIds.has(w.id)) continue;
    const v = l1Of(w, l1).trim();
    if (v && seenL1.has(v)) continue;
    chosen.push(w);
    seenIds.add(w.id);
    if (v) seenL1.add(v);
  }
  return chosen;
}

/** Place `correct` at a random index among `distractorTexts`, returning the
 *  shuffled option list + the index the correct answer landed on. */
function placeCorrect(correctText: string, distractorTexts: string[]): { options: string[]; correctIndex: number } {
  const options = [...distractorTexts];
  const correctIndex = secureRandomInt(options.length + 1);
  options.splice(correctIndex, 0, correctText);
  return { options, correctIndex };
}

export interface BuildSpeedQuestionParams {
  mode: QpSpeedMode;
  /** The word this question is about. */
  word: Word;
  /** The session's words (preferred distractor source). */
  pool: Word[];
  /** Full vocabulary fallback when the pool is too small. */
  fallback: Word[];
  /** Which L1 column to read for translations. */
  l1: L1;
  /** Localised "True" / "False" labels for true-false mode. */
  trueFalseLabels: { yes: string; no: string };
}

/**
 * Build one Speed Round question for the given word + mode. Returns null if
 * the word can't produce a sensible question (e.g. no L1 translation for a
 * translation-based mode) so the caller can skip to the next word.
 */
export function buildSpeedQuestion(params: BuildSpeedQuestionParams): SpeedQuestion | null {
  const { mode, word, pool, fallback, l1, trueFalseLabels } = params;
  const translation = l1Of(word, l1).trim();

  switch (mode) {
    // True/False: show "english = <translation>?" and ask if it's right.
    // Half the time we swap in a wrong translation (a distractor's) so the
    // answer is genuinely 50/50.
    case "true-false": {
      if (!translation) return null;
      const showCorrect = secureRandomInt(2) === 0;
      let shown = translation;
      if (!showCorrect) {
        const [d] = pickDistractors(word, pool, fallback, 1, l1);
        const dv = d ? l1Of(d, l1).trim() : "";
        if (!dv) return null; // can't form a believable false — skip
        shown = dv;
      }
      return {
        mode, promptKind: "text",
        prompt: `${word.english} = ${shown}`,
        options: [trueFalseLabels.yes, trueFalseLabels.no],
        correctIndex: showCorrect ? 0 : 1,
      };
    }

    // Classic / idiom: show the English word (or phrase), pick the correct
    // translation from four. Idiom is the same shape — it just tends to run
    // on phrase words.
    case "classic":
    case "idiom": {
      if (!translation) return null;
      const distractors = pickDistractors(word, pool, fallback, 3, l1)
        .map((d) => l1Of(d, l1).trim())
        .filter(Boolean);
      if (distractors.length < 1) return null;
      const { options, correctIndex } = placeCorrect(translation, distractors);
      return { mode, promptKind: "text", prompt: word.english, options, correctIndex };
    }

    // Reverse: show the translation, pick the correct English word.
    case "reverse": {
      if (!translation) return null;
      const distractors = pickDistractors(word, pool, fallback, 3, l1).map((d) => d.english.trim());
      if (distractors.length < 1) return null;
      const { options, correctIndex } = placeCorrect(word.english.trim(), distractors);
      return { mode, promptKind: "text", prompt: translation, options, correctIndex };
    }

    // Listening: speak the English word (promptKind: audio), pick the correct
    // translation. The student device TTS-speaks the prompt instead of showing
    // it. Falls back to a classic shape if there's no translation.
    case "listening": {
      if (!translation) return null;
      const distractors = pickDistractors(word, pool, fallback, 3, l1)
        .map((d) => l1Of(d, l1).trim())
        .filter(Boolean);
      if (distractors.length < 1) return null;
      const { options, correctIndex } = placeCorrect(translation, distractors);
      return { mode, promptKind: "audio", prompt: word.english, options, correctIndex };
    }

    // Letter Sounds: "Which letter does <word> start with?" — pick the first
    // letter from four distinct letters.
    case "letter-sounds": {
      const correctLetter = word.english.trim().charAt(0).toUpperCase();
      if (!correctLetter || !/[A-Z]/.test(correctLetter)) return null;
      const letters = new Set<string>([correctLetter]);
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      while (letters.size < 4) {
        const cand = alphabet[secureRandomInt(alphabet.length)];
        letters.add(cand);
      }
      const distractors = [...letters].filter((l) => l !== correctLetter).slice(0, 3);
      const { options, correctIndex } = placeCorrect(correctLetter, distractors);
      return {
        mode, promptKind: "text",
        prompt: `🔊 ${word.english.charAt(0)}…`,
        options, correctIndex,
      };
    }

    default:
      return null;
  }
}
