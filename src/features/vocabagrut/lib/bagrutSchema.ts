// Runtime validator for the JSON Claude returns.  Plain TS — no Zod
// dependency to keep the bundle slim.  Mirror of the BagrutTest type.
//
// Returns { ok: true, value } on success, { ok: false, error } on failure
// where error names the exact field path that failed (so retry prompts can
// inject useful feedback).

import type {
  BagrutTest,
  BagrutSection,
  BagrutQuestion,
  BagrutModule,
  BagrutSectionKind,
  BagrutQuestionType,
} from '../types';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MODULES: ReadonlySet<BagrutModule> = new Set(['A', 'B', 'C', 'D', 'E']);
const SECTION_KINDS: ReadonlySet<BagrutSectionKind> = new Set(['reading', 'vocab_in_context', 'writing']);
const QUESTION_TYPES: ReadonlySet<BagrutQuestionType> = new Set(['mc', 'short', 'writing']);
const MC_LETTERS: ReadonlySet<string> = new Set(['A', 'B', 'C', 'D']);

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateQuestion(q: unknown, path: string): Result<BagrutQuestion> {
  if (!isObj(q)) return { ok: false, error: `${path}: expected object` };
  if (!isStr(q.id) || q.id.length === 0) return { ok: false, error: `${path}.id: required string` };
  if (!isStr(q.type) || !QUESTION_TYPES.has(q.type as BagrutQuestionType)) {
    return { ok: false, error: `${path}.type: must be one of mc|short|writing` };
  }
  if (!isStr(q.prompt) || q.prompt.length === 0) return { ok: false, error: `${path}.prompt: required string` };
  if (!isNum(q.points) || q.points < 0) return { ok: false, error: `${path}.points: required positive number` };

  const result: BagrutQuestion = {
    id: q.id,
    type: q.type as BagrutQuestionType,
    prompt: q.prompt,
    points: q.points,
  };

  if (q.type === 'mc') {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { ok: false, error: `${path}.options: mc requires exactly 4 options` };
    }
    const opts = [];
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      if (!isObj(opt) || !isStr(opt.letter) || !MC_LETTERS.has(opt.letter) || !isStr(opt.text)) {
        return { ok: false, error: `${path}.options[${i}]: { letter: A|B|C|D, text: string } required` };
      }
      opts.push({ letter: opt.letter as 'A' | 'B' | 'C' | 'D', text: opt.text });
    }
    result.options = opts;
    if (!isStr(q.correct_answer) || !MC_LETTERS.has(q.correct_answer)) {
      return { ok: false, error: `${path}.correct_answer: required letter A|B|C|D for mc` };
    }
    result.correct_answer = q.correct_answer as 'A' | 'B' | 'C' | 'D';
  }

  if (q.type === 'writing') {
    if (q.word_count_min !== undefined && !isNum(q.word_count_min)) {
      return { ok: false, error: `${path}.word_count_min: number` };
    }
    if (q.word_count_max !== undefined && !isNum(q.word_count_max)) {
      return { ok: false, error: `${path}.word_count_max: number` };
    }
    if (q.word_count_min !== undefined) result.word_count_min = q.word_count_min as number;
    if (q.word_count_max !== undefined) result.word_count_max = q.word_count_max as number;
    if (Array.isArray(q.bullets)) {
      const bullets: string[] = [];
      for (let i = 0; i < q.bullets.length; i++) {
        if (!isStr(q.bullets[i])) return { ok: false, error: `${path}.bullets[${i}]: string` };
        bullets.push(q.bullets[i] as string);
      }
      result.bullets = bullets;
    }
  }

  if (q.explanation !== undefined) {
    if (!isStr(q.explanation)) return { ok: false, error: `${path}.explanation: string` };
    result.explanation = q.explanation;
  }

  return { ok: true, value: result };
}

function validateSection(s: unknown, path: string): Result<BagrutSection> {
  if (!isObj(s)) return { ok: false, error: `${path}: expected object` };
  if (!isStr(s.kind) || !SECTION_KINDS.has(s.kind as BagrutSectionKind)) {
    return { ok: false, error: `${path}.kind: must be reading|vocab_in_context|writing` };
  }
  if (!isStr(s.title)) return { ok: false, error: `${path}.title: string required` };
  if (!isNum(s.total_points)) return { ok: false, error: `${path}.total_points: number required` };
  if (!Array.isArray(s.questions)) return { ok: false, error: `${path}.questions: array required` };

  const questions: BagrutQuestion[] = [];
  for (let i = 0; i < s.questions.length; i++) {
    const r = validateQuestion(s.questions[i], `${path}.questions[${i}]`);
    if (!r.ok) return r;
    questions.push(r.value);
  }

  const result: BagrutSection = {
    kind: s.kind as BagrutSectionKind,
    title: s.title,
    total_points: s.total_points,
    questions,
  };

  if (s.passage !== undefined) {
    if (!isStr(s.passage)) return { ok: false, error: `${path}.passage: string` };
    result.passage = s.passage;
  } else if (s.kind === 'reading' || s.kind === 'vocab_in_context') {
    return { ok: false, error: `${path}.passage: required for ${s.kind}` };
  }

  return { ok: true, value: result };
}

export function validateBagrutTest(raw: unknown): Result<BagrutTest> {
  if (!isObj(raw)) return { ok: false, error: 'root: expected object' };
  if (!isStr(raw.module) || !MODULES.has(raw.module as BagrutModule)) {
    return { ok: false, error: 'module: required A|B|C|D|E' };
  }
  if (!isStr(raw.title) || raw.title.length === 0) return { ok: false, error: 'title: required string' };
  if (!Array.isArray(raw.source_words)) return { ok: false, error: 'source_words: array required' };
  for (let i = 0; i < raw.source_words.length; i++) {
    if (!isStr(raw.source_words[i])) return { ok: false, error: `source_words[${i}]: string` };
  }
  if (!isNum(raw.total_points)) return { ok: false, error: 'total_points: number required' };
  if (!isNum(raw.time_minutes)) return { ok: false, error: 'time_minutes: number required' };
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) {
    return { ok: false, error: 'sections: non-empty array required' };
  }

  const sections: BagrutSection[] = [];
  for (let i = 0; i < raw.sections.length; i++) {
    const r = validateSection(raw.sections[i], `sections[${i}]`);
    if (!r.ok) return r;
    sections.push(r.value);
  }

  return {
    ok: true,
    value: {
      module: raw.module as BagrutModule,
      title: raw.title,
      source_words: raw.source_words as string[],
      total_points: raw.total_points,
      time_minutes: raw.time_minutes,
      sections,
    },
  };
}

// Strip correct_answer + explanation before sending the test to a student.
export function stripAnswerKey(test: BagrutTest): BagrutTest {
  return {
    ...test,
    sections: test.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => {
        const stripped: BagrutQuestion = {
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          points: q.points,
        };
        if (q.options) stripped.options = q.options;
        if (q.word_count_min !== undefined) stripped.word_count_min = q.word_count_min;
        if (q.word_count_max !== undefined) stripped.word_count_max = q.word_count_max;
        if (q.bullets) stripped.bullets = q.bullets;
        return stripped;
      }),
    })),
  };
}

// Sum the max possible MC points (used to populate mc_max on response insert).
export function computeMcMax(test: BagrutTest): number {
  let total = 0;
  for (const s of test.sections) {
    for (const q of s.questions) {
      if (q.type === 'mc') total += q.points;
    }
  }
  return total;
}

// Score a student's answers against the canonical test.  Returns earned MC points.
export function scoreMcAnswers(test: BagrutTest, answers: Record<string, string>): number {
  let earned = 0;
  for (const s of test.sections) {
    for (const q of s.questions) {
      if (q.type === 'mc' && q.correct_answer) {
        if (answers[q.id] === q.correct_answer) {
          earned += q.points;
        }
      }
    }
  }
  return earned;
}
