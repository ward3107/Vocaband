import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────
// POST /api/words — VocaBagrut AI helper.
//
//   { mode: 'enhance', words: string[], level } — enrich bare English words.
//   { mode: 'ocr',     image: dataURL,  level } — read words from a photo.
//   { mode: 'exam',    words: string[], level } — generate a full exam paper
//                                                 (reading passage + questions
//                                                 + writing task) from words.
//
// The Gemini key is read from the server env (GEMINI_API_KEY) and never
// reaches the browser. With no key set we answer 503 so the client can fall
// back to paste-only / official-bank mode.
// ─────────────────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ── Schemas ───────────────────────────────────────────────────────────────
const WORD_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      word: { type: 'STRING' },
      partOfSpeech: { type: 'STRING', enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'connector'] },
      definition: { type: 'STRING' },
      he: { type: 'STRING' },
      ar: { type: 'STRING' },
      example: { type: 'STRING' },
      band: { type: 'STRING', enum: ['I', 'II', 'III'] },
      frequency: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    },
    required: ['word', 'partOfSpeech', 'definition', 'he', 'ar', 'example', 'band', 'frequency'],
  },
} as const;

const EXAM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    passage: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        text: { type: 'STRING' },
        questions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              prompt: { type: 'STRING' },
              type: { type: 'STRING', enum: ['multiple-choice', 'open'] },
              options: { type: 'ARRAY', items: { type: 'STRING' } },
              answerIndex: { type: 'INTEGER' },
              sampleAnswer: { type: 'STRING' },
              points: { type: 'INTEGER' },
            },
            required: ['prompt', 'type', 'points'],
          },
        },
      },
      required: ['title', 'text', 'questions'],
    },
    writing: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        type: { type: 'STRING', enum: ['essay', 'opinion', 'article', 'letter', 'summary', 'story'] },
        prompt: { type: 'STRING' },
        minWords: { type: 'INTEGER' },
        maxWords: { type: 'INTEGER' },
        rubric: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              maxPoints: { type: 'INTEGER' },
              description: { type: 'STRING' },
            },
            required: ['name', 'maxPoints', 'description'],
          },
        },
      },
      required: ['title', 'type', 'prompt', 'minWords', 'maxWords', 'rubric'],
    },
  },
  required: ['passage', 'writing'],
} as const;

// ── Prompts ─────────────────────────────────────────────────────────────
const wordInstruction = (level: number) =>
  `You are a vocabulary assistant for the Israeli English Bagrut (matriculation) exam ` +
  `at the ${level}-unit level. For each English word or phrase, return: its part of speech; ` +
  `a short, clear English definition appropriate for a ${level}-unit student; an accurate ` +
  `Hebrew translation (he); an accurate Arabic translation (ar); one natural example sentence ` +
  `using the word; the MoE 2020 vocabulary band (I, II, or III); and a rough exam-frequency ` +
  `(high/medium/low). Keep the original spelling of each word.`;

// Level-appropriate reading length, mirroring real Bagrut module lengths.
const passageLength = (level: number) =>
  level >= 5 ? '350–450 words' : level === 4 ? '250–320 words' : '150–220 words';

const examInstruction = (level: number, words: string[]) =>
  `You are an item-writer for the Israeli English Bagrut (matriculation) exam, Curriculum 2020 (CEFR). ` +
  `Write ONE complete, original ${level}-unit practice paper that naturally uses as many of the target ` +
  `words below as possible.\n\n` +
  `READING: write a coherent, age-appropriate passage of ${passageLength(level)} on a single topic, then ` +
  `5–6 questions. Mix 'multiple-choice' (each with exactly 4 options and a 0-based answerIndex) and 'open' ` +
  `questions (each with a concise sampleAnswer). Higher levels include at least one higher-order-thinking ` +
  `(inference/opinion) question. Assign whole-number points totalling about 50.\n\n` +
  `WRITING: one task (article, opinion essay, letter, or story) suited to ${level} units, with a clear ` +
  `prompt, minWords/maxWords appropriate to the level, and a 3-criterion rubric (Content & Organization, ` +
  `Vocabulary, Language) whose maxPoints total about 30.\n\n` +
  `Keep language at the right CEFR level and ensure questions are answerable strictly from the passage.\n\n` +
  `Target words:\n${words.join(', ')}`;

interface Body {
  mode?: 'enhance' | 'ocr' | 'exam';
  words?: unknown;
  image?: unknown;
  level?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'ai_not_configured' });
    return;
  }

  const body: Body = typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {});
  const level = Number(body.level) || 4;
  const words = Array.isArray(body.words)
    ? body.words.map(String).map((w) => w.trim()).filter(Boolean).slice(0, 60)
    : [];

  // Assemble the Gemini request (parts + schema) for the requested mode.
  let parts: Record<string, unknown>[];
  let schema: unknown;

  if (body.mode === 'ocr') {
    const image = typeof body.image === 'string' ? body.image : '';
    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'bad_image' });
      return;
    }
    parts = [
      {
        text:
          `${wordInstruction(level)} This image shows a list of English vocabulary (it may include ` +
          `translations or numbering). Extract every English word or phrase, ignore non-vocabulary ` +
          `text, and return the enriched list.`,
      },
      { inlineData: { mimeType: match[1], data: match[2] } },
    ];
    schema = WORD_SCHEMA;
  } else if (body.mode === 'exam') {
    if (!words.length) {
      res.status(400).json({ error: 'no_words' });
      return;
    }
    parts = [{ text: examInstruction(level, words) }];
    schema = EXAM_SCHEMA;
  } else {
    if (!words.length) {
      res.status(400).json({ error: 'no_words' });
      return;
    }
    parts = [{ text: `${wordInstruction(level)}\n\nWords:\n${words.join('\n')}` }];
    schema = WORD_SCHEMA;
  }

  try {
    const result = await callGemini(key, parts, schema);
    if (body.mode === 'exam') {
      res.status(200).json({ exam: result && typeof result === 'object' ? result : null });
    } else {
      res.status(200).json({ words: Array.isArray(result) ? result : [] });
    }
  } catch (err) {
    const msg = String(err);
    const code = msg.startsWith('upstream:') ? 502 : 500;
    res.status(code).json({ error: code === 502 ? 'ai_upstream' : 'server_error', detail: msg.slice(0, 300) });
  }
}

// Single place that talks to Gemini with structured output.
async function callGemini(key: string, parts: unknown[], schema: unknown): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 },
    }),
  });
  if (!r.ok) throw new Error(`upstream:${(await r.text()).slice(0, 200)}`);
  const json = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return safeParse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null');
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
