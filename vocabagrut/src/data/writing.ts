import type { WritingPrompt } from '../core/types';

// Bagrut-style writing tasks. The rubric mirrors the official scoring
// dimensions used by the MoE (content/relevance, organisation, vocabulary,
// grammar/mechanics) — adjust the weights to the exact level guidelines.
const STANDARD_RUBRIC = [
  { name: 'Content & relevance', maxPoints: 40, description: 'Answers the task fully and stays on topic' },
  { name: 'Organisation', maxPoints: 20, description: 'Clear paragraphs, logical flow, linking words' },
  { name: 'Vocabulary', maxPoints: 20, description: 'Range and accuracy of word choice' },
  { name: 'Grammar & mechanics', maxPoints: 20, description: 'Sentence structure, tenses, spelling, punctuation' },
];

export const PROMPTS: WritingPrompt[] = [
  {
    id: 'w-social-media',
    level: 4,
    type: 'opinion',
    title: 'Social media: help or harm?',
    prompt:
      'Some people believe social media brings young people closer together, ' +
      'while others think it makes them more isolated. Write an opinion essay ' +
      'in which you state your view and support it with reasons and examples.',
    minWords: 120,
    maxWords: 160,
    rubric: STANDARD_RUBRIC,
  },
  {
    id: 'w-school-trip',
    level: 3,
    type: 'letter',
    title: 'A letter about a school trip',
    prompt:
      'Your class is planning a one-day trip. Write a letter to your teacher ' +
      'suggesting a place to visit. Explain where you want to go and give two ' +
      'reasons why it would be a good choice.',
    minWords: 80,
    maxWords: 120,
    rubric: STANDARD_RUBRIC,
  },
  {
    id: 'w-future-work',
    level: 5,
    type: 'essay',
    title: 'How technology is changing the world of work',
    prompt:
      'Write an essay discussing how new technology is changing the kinds of ' +
      'jobs people do. Consider both the opportunities and the challenges, and ' +
      'reach a clear conclusion.',
    minWords: 150,
    maxWords: 200,
    rubric: STANDARD_RUBRIC,
  },
];

export const promptsForLevel = (level: 3 | 4 | 5): WritingPrompt[] =>
  PROMPTS.filter((p) => p.level <= level);
