import type { WritingPrompt, RubricCriterion } from '../core/types';

// Writing tasks aligned to the MoE module specs:
//   • 3-point & 4-point → Module C: 1 composition, 70–90 words
//     (description, informal letter, story, email)
//   • 5-point → Module G: 1 composition, 120–140 words
//     (opinion, for-and-against, description, email, story, formal letter)
//
// Rubrics reproduce the official criteria — Content & Organization,
// Vocabulary, Language — from the Module C / Module G writing rubrics in the
// Bagrut handbooks (descriptors: fully / partially / minimally / not).

const MODULE_C_RUBRIC: RubricCriterion[] = [
  { name: 'Content & Organization', maxPoints: 40, description: 'On topic, task elements addressed, organized and coherent' },
  { name: 'Vocabulary', maxPoints: 30, description: 'Correct, appropriate use of words' },
  { name: 'Language', maxPoints: 30, description: 'Basic grammar, word order, spelling' },
];

const MODULE_G_RUBRIC: RubricCriterion[] = [
  { name: 'Content & Organization', maxPoints: 40, description: 'Fully on topic, fully developed (main idea + supporting details), all task elements addressed, well-organized and coherent' },
  { name: 'Vocabulary', maxPoints: 30, description: 'Varied, rich vocabulary; appropriate language chunks and phrases' },
  { name: 'Language', maxPoints: 30, description: 'Correct connecting words/phrases; grammar, tenses, spelling' },
];

export const PROMPTS: WritingPrompt[] = [
  // ── Module C (3-point) ──
  {
    id: 'w-school-trip',
    level: 3,
    type: 'letter',
    title: 'Module C · Informal letter — a school trip',
    prompt:
      'Your class is planning a one-day trip. Write a letter to your teacher ' +
      'suggesting a place to visit. Say where you want to go and give two ' +
      'reasons why it would be a good choice.',
    minWords: 70,
    maxWords: 90,
    rubric: MODULE_C_RUBRIC,
  },
  // ── Module C (4-point) ──
  {
    id: 'w-free-time',
    level: 4,
    type: 'article',
    title: 'Module C · Description — how you spend your free time',
    prompt:
      'Write a short text describing how you spend your free time. Include ' +
      'what you do, who you do it with, and why you enjoy it.',
    minWords: 70,
    maxWords: 90,
    rubric: MODULE_C_RUBRIC,
  },
  // ── Module G (5-point) ──
  {
    id: 'w-social-media',
    level: 5,
    type: 'opinion',
    title: 'Module G · Opinion — social media: help or harm?',
    prompt:
      'Some people believe social media brings young people closer together, ' +
      'while others think it makes them more isolated. Write an opinion essay ' +
      'in which you state your view and support it with reasons and examples.',
    minWords: 120,
    maxWords: 140,
    rubric: MODULE_G_RUBRIC,
  },
  {
    id: 'w-future-work',
    level: 5,
    type: 'opinion',
    title: 'Module G · For and against — technology and the world of work',
    prompt:
      'New technology is changing the kinds of jobs people do. Write a ' +
      'for-and-against composition presenting both the opportunities and the ' +
      'challenges, and end with your own conclusion.',
    minWords: 120,
    maxWords: 140,
    rubric: MODULE_G_RUBRIC,
  },
];

export const promptsForLevel = (level: 3 | 4 | 5): WritingPrompt[] =>
  PROMPTS.filter((p) => p.level <= level);
