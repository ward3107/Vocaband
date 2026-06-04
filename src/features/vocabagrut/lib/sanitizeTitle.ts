// Strip Ministry-of-Education-adjacent vocabulary from any AI-supplied
// title before it reaches a printed/exported paper.
//
// This is a teacher-made PRACTICE paper, not an official MoE document, so
// the title must not carry "Bagrut", the app brand "Vocabagrut", or any
// phrasing implying MoE endorsement. The generation prompt already avoids
// these tokens; this is defence-in-depth for cached tests made before the
// prompt update.
export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/\bvocabagrut\b/gi, 'Practice')
    .replace(/\bpractice\s+bagrut\b/gi, 'Practice Test')
    .replace(/\bbagrut[-\s]?style\b/gi, 'mock')
    .replace(/\bbagrut\b/gi, 'Practice Test')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Practice Test';
}
