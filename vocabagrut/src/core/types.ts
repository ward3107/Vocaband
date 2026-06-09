// ─────────────────────────────────────────────────────────────────────────
// VocaBagrut domain model
//
// Unlike Vocaband (which organises content into MoE "Sets" for grades 4–9),
// VocaBagrut is organised around the Israeli English *Bagrut*: the
// matriculation exam, sat at one of three proficiency levels measured in
// "units" (yechidot) — 3, 4, or 5 — with 5 being the highest.
// ─────────────────────────────────────────────────────────────────────────

/** Bagrut proficiency level, in units (yechidot). 5 is the highest. */
export type UnitLevel = 3 | 4 | 5;

/** The four learning pillars (the home navigation). */
export type Pillar = 'vocabulary' | 'reading' | 'writing' | 'exams';

export type View = 'home' | 'build' | Pillar;

// ── Vocabulary ──────────────────────────────────────────────────────────
export interface VocabWord {
  id: string;
  word: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'connector';
  definition: string;          // English (target-language) definition
  he: string;                  // Hebrew translation
  ar: string;                  // Arabic translation
  example: string;             // example sentence
  level: UnitLevel;            // lowest level this word is expected at
  /** MoE vocabulary band (Curriculum 2020): I, II, or III (Core 1). */
  band: 'I' | 'II' | 'III';
  /** Rough frequency on past exams — drives study prioritisation. */
  frequency: 'high' | 'medium' | 'low';
}

// ── Reading comprehension ─────────────────────────────────────────────────
export type QuestionType = 'multiple-choice' | 'open' | 'hots';

export interface ReadingQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Present for multiple-choice questions. */
  options?: string[];
  /** Index into `options` for the correct answer (multiple-choice only). */
  answerIndex?: number;
  /** Model answer used for self-check / AI grading (open + HOTS). */
  sampleAnswer?: string;
  /** Named MoE thinking skill this HOTS question targets (see curriculum.HOTS). */
  hots?: string;
  points: number;
}

export interface ReadingPassage {
  id: string;
  title: string;
  level: UnitLevel;
  /** "HOTS" = Higher Order Thinking Skills, a Bagrut reform requirement. */
  hotsFocus?: string;
  wordCount: number;
  text: string;
  source?: string;
  questions: ReadingQuestion[];
}

// ── Writing ────────────────────────────────────────────────────────────────
export type WritingType = 'essay' | 'opinion' | 'article' | 'letter' | 'summary' | 'story';

export interface RubricCriterion {
  name: string;
  maxPoints: number;
  description: string;
}

export interface WritingPrompt {
  id: string;
  level: UnitLevel;
  type: WritingType;
  title: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  /** Official-style scoring breakdown (content / organisation / language…). */
  rubric: RubricCriterion[];
}

/** Result shape returned by the (stubbed) AI grader — see src/lib/aiGrading.ts */
export interface WritingFeedback {
  scores: { criterion: string; awarded: number; max: number }[];
  totalAwarded: number;
  totalMax: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

// ── Past-exam bank ──────────────────────────────────────────────────────────
export interface ExamSection {
  name: string;          // e.g. "Section A — Access to Information"
  description: string;
  points: number;
  /** Optional reuse of a reading passage by id. */
  passageId?: string;
}

export interface ExamPaper {
  id: string;
  year: number;
  season: 'winter' | 'summer';
  level: UnitLevel;
  moduleCode: string;    // e.g. "Module F (016582)"
  title: string;
  durationMinutes: number;
  totalPoints: number;
  sections: ExamSection[];
  /** Link to the official PDF on the MoE site, when available. */
  officialUrl?: string;
}
