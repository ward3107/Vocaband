import type { ReadingPassage, ReadingQuestion, UnitLevel, WritingPrompt } from '../core/types';
import { AiNotConfiguredError } from './wordImport';
import { authHeader } from './supabase';

// AI exam generation — turns a set of words into a full practice paper
// (reading passage + questions + writing task) via POST /api/words. The
// server holds the Gemini key; here we just map the JSON onto app types.

export interface GeneratedExam {
  passage: ReadingPassage;
  writing: WritingPrompt;
}

let n = 0;
const uid = (p: string) => `ai-${p}-${Date.now().toString(36)}-${n++}`;

const QUESTION_TYPES = ['multiple-choice', 'open', 'hots'] as const;
const WRITING_TYPES = ['essay', 'opinion', 'article', 'letter', 'summary', 'story'] as const;

function toQuestion(raw: any): ReadingQuestion {
  const type = QUESTION_TYPES.includes(raw?.type) ? raw.type : 'open';
  const options = Array.isArray(raw?.options) ? raw.options.map(String) : undefined;
  return {
    id: uid('q'),
    prompt: String(raw?.prompt ?? '').trim(),
    type,
    options: type === 'multiple-choice' ? options : undefined,
    answerIndex: typeof raw?.answerIndex === 'number' ? raw.answerIndex : undefined,
    sampleAnswer: raw?.sampleAnswer ? String(raw.sampleAnswer) : undefined,
    points: Number(raw?.points) || 5,
  };
}

export async function generateExam(words: string[], level: UnitLevel): Promise<GeneratedExam> {
  const res = await fetch('/api/words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ mode: 'exam', words, level }),
  });
  if (res.status === 503) throw new AiNotConfiguredError();
  if (!res.ok) throw new Error(`Request failed (${res.status})`);

  const { exam } = (await res.json()) as { exam?: any };
  if (!exam?.passage || !exam?.writing) throw new Error('empty exam');

  const text = String(exam.passage.text ?? '').trim();
  const passage: ReadingPassage = {
    id: uid('passage'),
    title: String(exam.passage.title ?? 'Reading').trim(),
    level,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    text,
    source: 'AI-generated practice passage',
    questions: (Array.isArray(exam.passage.questions) ? exam.passage.questions : []).map(toQuestion),
  };

  const w = exam.writing;
  const writing: WritingPrompt = {
    id: uid('writing'),
    level,
    type: WRITING_TYPES.includes(w?.type) ? w.type : 'article',
    title: String(w?.title ?? 'Writing task').trim(),
    prompt: String(w?.prompt ?? '').trim(),
    minWords: Number(w?.minWords) || (level >= 5 ? 120 : level === 4 ? 100 : 80),
    maxWords: Number(w?.maxWords) || (level >= 5 ? 180 : level === 4 ? 150 : 120),
    rubric: (Array.isArray(w?.rubric) ? w.rubric : []).map((c: any) => ({
      name: String(c?.name ?? '').trim(),
      maxPoints: Number(c?.maxPoints) || 10,
      description: String(c?.description ?? '').trim(),
    })),
  };

  return { passage, writing };
}
