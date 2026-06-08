import type { ExamPaper } from '../core/types';

// Past-exam bank. These entries describe the *structure* of recent papers
// so students can practise section-by-section. `officialUrl` should point
// to the real PDF on the Ministry of Education site once verified — the
// placeholders below are intentionally left undefined so the UI shows a
// "link coming soon" state rather than a broken link.
export const EXAMS: ExamPaper[] = [
  {
    id: 'e-2024-summer-f',
    year: 2024,
    season: 'summer',
    level: 5,
    moduleCode: 'Module F (016582)',
    title: 'Summer 2024 — 5 units, Module F',
    durationMinutes: 105,
    totalPoints: 100,
    sections: [
      { name: 'Section A — Access to Information', description: 'Read a long text and answer comprehension + HOTS questions', points: 50, passageId: 'r-volunteering' },
      { name: 'Section B — Written Presentation', description: 'Write a 150–200 word essay on a given topic', points: 25 },
      { name: 'Section C — Appreciation of Literature', description: 'Answer on a studied literature piece / log', points: 25 },
    ],
  },
  {
    id: 'e-2024-winter-e',
    year: 2024,
    season: 'winter',
    level: 4,
    moduleCode: 'Module E (016481)',
    title: 'Winter 2024 — 4 units, Module E',
    durationMinutes: 90,
    totalPoints: 100,
    sections: [
      { name: 'Section A — Access to Information', description: 'Comprehension questions on an exam-style passage', points: 60, passageId: 'r-screen-time' },
      { name: 'Section B — Written Presentation', description: 'Write a 120–160 word text on a given topic', points: 40 },
    ],
  },
  {
    id: 'e-2023-summer-d',
    year: 2023,
    season: 'summer',
    level: 3,
    moduleCode: 'Module D (016381)',
    title: 'Summer 2023 — 3 units, Module D',
    durationMinutes: 75,
    totalPoints: 100,
    sections: [
      { name: 'Section A — Access to Information', description: 'Short passages with multiple-choice questions', points: 70 },
      { name: 'Section B — Written Presentation', description: 'Write a short guided text (80–120 words)', points: 30 },
    ],
  },
];

export const examsForLevel = (level: 3 | 4 | 5): ExamPaper[] =>
  // Show the chosen level and everything below it (good for revision).
  EXAMS.filter((e) => e.level <= level).sort((a, b) => b.year - a.year);
