import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────
// POST /api/words — custom-word AI helper for VocaBagrut.
//
//   { mode: 'enhance', words: string[], level } — enrich bare English words.
//   { mode: 'ocr',     image: dataURL,  level } — read words from a photo.
//
// Returns { words: VocabWord[] }. The Gemini key is read from the server
// env (GEMINI_API_KEY) and never reaches the browser. With no key set we
// answer 503 so the client can fall back to paste-only.
// ─────────────────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Structured-output schema so Gemini returns clean JSON we can map directly.
const WORD_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      word: { type: 'STRING' },
      partOfSpeech: {
        type: 'STRING',
        enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'connector'],
      },
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

const instruction = (level: number) =>
  `You are a vocabulary assistant for the Israeli English Bagrut (matriculation) exam ` +
  `at the ${level}-unit level. For each English word or phrase, return: its part of speech; ` +
  `a short, clear English definition appropriate for a ${level}-unit student; an accurate ` +
  `Hebrew translation (he); an accurate Arabic translation (ar); one natural example sentence ` +
  `using the word; the MoE 2020 vocabulary band (I, II, or III); and a rough exam-frequency ` +
  `(high/medium/low). Keep the original spelling of each word.`;

interface Body {
  mode?: 'enhance' | 'ocr';
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

  // Build the Gemini "parts" for the requested mode.
  const parts: Record<string, unknown>[] = [];
  if (body.mode === 'ocr') {
    const image = typeof body.image === 'string' ? body.image : '';
    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'bad_image' });
      return;
    }
    parts.push({
      text:
        `${instruction(level)} This image shows a list of English vocabulary (it may include ` +
        `translations or numbering). Extract every English word or phrase, ignore non-vocabulary ` +
        `text, and return the enriched list.`,
    });
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  } else {
    const words = Array.isArray(body.words)
      ? body.words.map(String).map((w) => w.trim()).filter(Boolean).slice(0, 60)
      : [];
    if (!words.length) {
      res.status(400).json({ error: 'no_words' });
      return;
    }
    parts.push({ text: `${instruction(level)}\n\nWords:\n${words.join('\n')}` });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const gemini = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: WORD_SCHEMA,
          temperature: 0.2,
        },
      }),
    });

    if (!gemini.ok) {
      const detail = await gemini.text();
      res.status(502).json({ error: 'ai_upstream', detail: detail.slice(0, 300) });
      return;
    }

    const json = (await gemini.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const words = safeParse(text);
    res.status(200).json({ words: Array.isArray(words) ? words : [] });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 300) });
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
