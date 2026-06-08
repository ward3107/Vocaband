import type { UnitLevel } from '../core/types';

// ─────────────────────────────────────────────────────────────────────────
// Israeli MoE English Bagrut — authoritative reference
//
// Source: State of Israel, Ministry of Education, Pedagogical Secretariat,
// English Language Education — the 3-/4-/5-Point Bagrut Handbooks (2025) and
// the Literature Pedagogy Handbook, all based on the **English Curriculum
// 2020** (CEFR-aligned "Revised Curriculum").
//
// Past exams + scoring guides: English Inspectorate Bagrut archive
//   https://pop.education.gov.il/tchumey_daat/english/chativa-elyona/bagrut-exam/
//
// The Bagrut is MODULAR: a student accumulates module exams. Each level is a
// fixed set of modules (some shared between levels) plus an oral exam.
// ─────────────────────────────────────────────────────────────────────────

/** CEFR exit level per Bagrut level (English Curriculum 2020). */
export interface CefrInfo {
  cefr: 'A2' | 'B1' | 'B2';
  name: string;        // MoE label
  exit: string;        // where this proficiency is expected
}

export const CEFR_BY_LEVEL: Record<UnitLevel, CefrInfo> = {
  3: { cefr: 'A2', name: 'Basic User II', exit: 'end of Junior High School' },
  4: { cefr: 'B1', name: 'Independent User I', exit: 'end of High School' },
  5: { cefr: 'B2', name: 'Independent User II', exit: 'end of High School' },
};

export interface ModuleSection {
  name: string;            // e.g. "Reading Comprehension"
  percentOfModule: number; // share of this module's grade
  detail: string;          // official table-of-specifications detail
}

export interface BagrutModule {
  code: string;            // official exam number (מספר שאלון)
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  name: string;
  internal?: boolean;      // school-assessed (literature) rather than a written paper
  timeMinutes?: number;    // written-exam duration
  notes?: string;
  sections: ModuleSection[];
}

// Canonical module definitions (shared across levels by their real codes).
export const MODULES: Record<string, BagrutModule> = {
  A: {
    code: '016381', letter: 'A', name: 'Module A — Reading Comprehension', timeMinutes: 75,
    sections: [
      { name: 'Reading Comprehension', percentOfModule: 100, detail: '2 short texts, 180–200 words each · 15 questions (6–7 multiple-choice, 8–9 open-ended / fill-ins)' },
    ],
  },
  B: {
    code: '016383', letter: 'B', name: 'Module B — Literature Log', internal: true,
    sections: [
      { name: 'Literature Log', percentOfModule: 80, detail: '2 short stories (internal program)' },
      { name: 'Extensive Reading', percentOfModule: 20, detail: '2 book reports' },
    ],
  },
  C: {
    code: '016382', letter: 'C', name: 'Module C — Reading Comprehension & Writing', timeMinutes: 90,
    notes: 'Shared by the 3-point and 4-point levels.',
    sections: [
      { name: 'Reading Comprehension', percentOfModule: 70, detail: '1 text up to 300 words · 8–10 questions' },
      { name: 'Writing', percentOfModule: 30, detail: '1 composition, 70–90 words · description, informal letter, story, email' },
    ],
  },
  D: {
    code: '016483', letter: 'D', name: 'Module D — Literature Program', internal: true,
    sections: [
      { name: 'Literature Program', percentOfModule: 80, detail: 'Approved literary texts + Bridging Text & Context (HOTS)' },
      { name: 'Extensive Reading', percentOfModule: 20, detail: '4 book reports' },
    ],
  },
  E: {
    code: '016471', letter: 'E', name: 'Module E — Reading Comprehension & Vocabulary', timeMinutes: 75,
    notes: 'Shared by the 4-point and 5-point levels. No dictionary; a glossary is provided for words outside the bands.',
    sections: [
      { name: 'Reading Comprehension', percentOfModule: 70, detail: '1 text up to 400 words · 8–10 questions' },
      { name: 'Vocabulary', percentOfModule: 30, detail: '5 questions (Bands I, II & III / Core 1) · fill-ins, multiple-choice, matching' },
    ],
  },
  F: {
    code: '016583', letter: 'F', name: 'Module F — Literature Program', internal: true,
    sections: [
      { name: 'Literature Program', percentOfModule: 80, detail: '1 novel/play, 3 short stories, 2 poems + Bridging Text & Context (HOTS)' },
      { name: 'Extensive Reading', percentOfModule: 20, detail: '4 book reports' },
    ],
  },
  G: {
    code: '016582', letter: 'G', name: 'Module G — Reading Comprehension & Writing', timeMinutes: 105,
    sections: [
      { name: 'Reading Comprehension', percentOfModule: 60, detail: '1 text, 450–500 words · 8–10 questions' },
      { name: 'Writing', percentOfModule: 40, detail: '1 composition, 120–140 words · opinion, for-and-against, description, email, story, formal letter' },
    ],
  },
};

/** The modules + oral exam that make up each level (with their grade weights). */
export interface LevelPlan {
  level: UnitLevel;
  written: { module: BagrutModule; percentOfGrade: number }[];
  oral: { code: string; name: string; percentOfGrade: number };
}

export const LEVEL_PLANS: Record<UnitLevel, LevelPlan> = {
  3: {
    level: 3,
    written: [
      { module: MODULES.A, percentOfGrade: 27 },
      { module: MODULES.B, percentOfGrade: 26 },
      { module: MODULES.C, percentOfGrade: 27 },
    ],
    oral: { code: '016387', name: 'Oral — BOOST', percentOfGrade: 20 },
  },
  4: {
    level: 4,
    written: [
      { module: MODULES.C, percentOfGrade: 27 },
      { module: MODULES.D, percentOfGrade: 26 },
      { module: MODULES.E, percentOfGrade: 27 },
    ],
    oral: { code: '016486', name: 'Oral Exam', percentOfGrade: 20 },
  },
  5: {
    level: 5,
    written: [
      { module: MODULES.E, percentOfGrade: 27 },
      { module: MODULES.F, percentOfGrade: 26 },
      { module: MODULES.G, percentOfGrade: 27 },
    ],
    oral: { code: '016586', name: 'COBE — Computerized Oral Bagrut Exam', percentOfGrade: 20 },
  },
};

// ── Higher Order Thinking Skills ─────────────────────────────────────────
// The official 14 HOTS from the MoE Literature Pedagogy Handbook. At least
// six must be taught; they also underpin reading-comprehension HOTS questions.
export const HOTS = [
  'Classifying',
  'Comparing and contrasting',
  'Distinguishing different perspectives',
  'Evaluating',
  'Explaining cause and effect',
  'Generating possibilities',
  'Identifying parts and whole',
  'Inferring',
  'Making connections',
  'Predicting',
  'Problem solving',
  'Sequencing',
  'Synthesizing',
  'Uncovering motives',
] as const;

export type Hots = (typeof HOTS)[number];

// ── Vocabulary bands ──────────────────────────────────────────────────────
// The Curriculum 2020 specifies productive/receptive vocabulary by bands.
// Updated word lists per exam period are published by the Inspectorate.
export type VocabBand = 'I' | 'II' | 'III';

/** Which bands are in scope at each level. */
export const BANDS_BY_LEVEL: Record<UnitLevel, VocabBand[]> = {
  3: ['I', 'II'],
  4: ['I', 'II', 'III'],
  5: ['I', 'II', 'III'],
};

// ── Reading task types (official Module table of specifications) ────────────
export const READING_TASK_TYPES = [
  'multiple-choice',
  'open-ended',
  'sentence completion',
  'true/false with justification',
  'graphic organizers',
] as const;

// ── Writing composition types (per module) ─────────────────────────────────
export const WRITING_TYPES_BY_LEVEL: Record<UnitLevel, string[]> = {
  3: ['description', 'informal letter', 'story', 'email'],
  4: ['description', 'informal letter', 'story', 'email'],
  5: ['opinion', 'for and against', 'description', 'email', 'story', 'formal letter'],
};
