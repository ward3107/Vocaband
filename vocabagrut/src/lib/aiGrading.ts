import type { WritingPrompt, WritingFeedback } from '../core/types';

// ─────────────────────────────────────────────────────────────────────────
// AI writing feedback — STUB.
//
// This runs entirely client-side and returns a deterministic, heuristic
// "grade" so the app is fully usable with zero secrets or backend. It is
// NOT a real assessment.
//
// To make it real, replace the body of `gradeWriting` with a call to a
// serverless function (Supabase Edge Function / Cloudflare Worker / Fly
// route) that holds the API key server-side and prompts a model — e.g.
// Claude or Gemini — with the rubric. Never ship the key to the browser.
// Suggested server contract:
//   POST /api/grade-writing  { promptId, text }  ->  WritingFeedback
// ─────────────────────────────────────────────────────────────────────────

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Heuristic placeholder grade — swap for a real model call (see above). */
export async function gradeWriting(
  prompt: WritingPrompt,
  text: string,
): Promise<WritingFeedback> {
  // Simulate network latency so the loading state is visible.
  await new Promise((r) => setTimeout(r, 700));

  const words = countWords(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const hasLinkers = /\b(however|moreover|furthermore|in addition|therefore|for example|on the other hand)\b/i.test(text);
  const inRange = words >= prompt.minWords && words <= prompt.maxWords;
  const avgSentenceLen = sentences ? words / sentences : words;

  const scores = prompt.rubric.map((c) => {
    let ratio = 0.6; // neutral baseline
    if (c.name.startsWith('Content')) ratio = inRange ? 0.85 : words >= prompt.minWords * 0.6 ? 0.65 : 0.4;
    if (c.name.startsWith('Organisation')) ratio = hasLinkers && sentences >= 4 ? 0.85 : 0.6;
    if (c.name.startsWith('Vocabulary')) ratio = new Set(text.toLowerCase().match(/[a-z']+/g) ?? []).size > words * 0.55 ? 0.8 : 0.6;
    if (c.name.startsWith('Grammar')) ratio = avgSentenceLen > 6 && avgSentenceLen < 28 ? 0.8 : 0.6;
    return { criterion: c.name, awarded: Math.round(c.maxPoints * ratio), max: c.maxPoints };
  });

  const totalAwarded = scores.reduce((s, x) => s + x.awarded, 0);
  const totalMax = scores.reduce((s, x) => s + x.max, 0);

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (inRange) strengths.push('Your answer is within the required length.');
  else improvements.push(`Aim for ${prompt.minWords}–${prompt.maxWords} words (you wrote ${words}).`);
  if (hasLinkers) strengths.push('Good use of linking words to connect ideas.');
  else improvements.push('Add linking words (however, moreover, for example) to improve flow.');
  if (sentences >= 4) strengths.push('Ideas are split into several sentences.');
  else improvements.push('Break your answer into more, clearer sentences.');

  return {
    scores,
    totalAwarded,
    totalMax,
    strengths,
    improvements,
    summary:
      `Heuristic estimate: ${totalAwarded}/${totalMax}. ` +
      'This is automated practice feedback, not an official Bagrut grade. ' +
      'Connect a model in src/lib/aiGrading.ts for real rubric-based assessment.',
  };
}
