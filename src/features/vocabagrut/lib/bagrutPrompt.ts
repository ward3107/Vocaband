// Server-only module-aware prompt + tool schema for Claude.  This file lives
// in the feature folder for typing convenience but is imported only from
// `server.ts`.  Do not import from client code (no secrets, but no point
// shipping it in the bundle).

import type { BagrutModule } from '../types';
import { MODULE_SPECS } from './moduleMap';

export interface PromptInput {
  module: BagrutModule;
  words: string[];      // sanitised, deduped target word list
}

const SYSTEM_INTRO = `You are an Israeli Ministry of Education curriculum expert generating mock English Bagrut exams for junior-high teachers (grades 7–9) to give their students FORMAT FAMILIARITY with the real Bagrut paper.

The Bagrut is structured by modules (A, B, C, D, E, F, G).  Each module has its own difficulty and point program.  You will be told which module to write for; tune passage length, sentence complexity, and inference depth accordingly.

Hard rules — every test you generate must satisfy ALL of these:
1. Every target word from the input list MUST appear in the reading passage or the vocabulary-in-context section, used in authentic sentence context.
2. Do NOT generate questions of the form "What does X mean?" or "Define X".  Vocabulary questions must require INFERENCE from context — e.g., "In line 12, the writer says 'X'.  Which of the following best describes the meaning of X in the passage?"
3. Reading passages must be coherent narratives or expository pieces, not a string of disconnected sentences crammed with target words.
4. Multiple-choice questions have exactly 4 options labelled A, B, C, D.  Exactly one option is correct.  Distractors must be plausible — not obviously wrong.
5. Output ONLY the structured tool call.  Do not write any prose outside the tool call.

Failure modes to avoid:
- Don't pad the passage with filler so target words "appear".  Each target word must serve the meaning.
- Don't repeat the same question structure across all MCQs — vary detail / inference / vocab questions.
- Don't ask grammar-isolation questions ("Which is the past tense of X?").  This exam is reading + vocab + writing, not grammar drills.`;

export function buildSystemPrompt(input: PromptInput): string {
  const spec = MODULE_SPECS[input.module];
  return `${SYSTEM_INTRO}

You are writing for: ${spec.label} (${spec.pointTrack}-point program, CEFR ${spec.cefr}, suggested grade ${spec.gradeBand}).

Module-specific budget:
- Reading passage: ${spec.passageWords.min}–${spec.passageWords.max} words.
- Writing prompt target: ${spec.writingWords.min}–${spec.writingWords.max} words from the student.
- Total seat time: ${spec.timeMinutes} minutes.
- Total points: 100 (split across the three sections).

Three required sections in this order:
- PART I — READING COMPREHENSION (40 points): one passage, then 5–7 questions mixing MC and short-answer.
- PART II — VOCABULARY IN CONTEXT (20 points): 2–3 short paragraphs (each 60–100 words) that use the remaining target words in authentic context, then 4–5 MC questions that test inference of meaning from context.
- PART III — WRITTEN PRESENTATION (40 points): one writing prompt with 3 required content bullets, scoped to the module's writing word range.

For MC questions: shuffle distractors so the correct answer is roughly evenly distributed across A/B/C/D across the whole exam.  In the explanation field, briefly justify why the correct answer is correct (1–2 sentences) — this is for the teacher's answer key.

Question IDs: use stable kebab-case strings like "rc-1", "rc-2", "vic-1", "wp-1".`;
}

export function buildUserMessage(input: PromptInput): string {
  return `Generate a Bagrut-style mock exam for Module ${input.module}.

Target word list (every word must appear in PART I or PART II in authentic context):
${input.words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Title the test "Practice Bagrut — Module ${input.module}: <a 3–6 word topic phrase you choose based on the words>".

Return ONLY the bagrut_test tool call.  No prose.`;
}

// JSON Schema for the Anthropic tool_use API.  Claude returns its answer
// inside a tool call matching this schema, which is far more reliable than
// asking it to produce free-form JSON.
export const BAGRUT_TOOL = {
  name: 'bagrut_test',
  description: 'Submit the generated Bagrut-style mock exam.',
  input_schema: {
    type: 'object',
    required: ['module', 'title', 'source_words', 'total_points', 'time_minutes', 'sections'],
    properties: {
      module: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
      title: { type: 'string' },
      source_words: { type: 'array', items: { type: 'string' } },
      total_points: { type: 'number' },
      time_minutes: { type: 'number' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['kind', 'title', 'total_points', 'questions'],
          properties: {
            kind: { type: 'string', enum: ['reading', 'vocab_in_context', 'writing'] },
            title: { type: 'string' },
            total_points: { type: 'number' },
            passage: { type: 'string' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'type', 'prompt', 'points'],
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['mc', 'short', 'writing'] },
                  prompt: { type: 'string' },
                  points: { type: 'number' },
                  options: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['letter', 'text'],
                      properties: {
                        letter: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                        text: { type: 'string' },
                      },
                    },
                  },
                  correct_answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                  word_count_min: { type: 'number' },
                  word_count_max: { type: 'number' },
                  bullets: { type: 'array', items: { type: 'string' } },
                  explanation: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
