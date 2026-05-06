// Vocabagrut domain types.  Mirrors the JSON contract Claude returns and
// the rows in supabase/migrations/20260609_vocabagrut.sql.

export type BagrutModule = 'A' | 'B' | 'C' | 'D' | 'E';

export type BagrutQuestionType = 'mc' | 'short' | 'writing';

export interface BagrutMcOption {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface BagrutQuestion {
  id: string;                 // stable identifier — used as response key
  type: BagrutQuestionType;
  prompt: string;
  points: number;
  options?: BagrutMcOption[]; // mc only
  correct_answer?: 'A' | 'B' | 'C' | 'D'; // mc only — present in teacher view, stripped for students
  word_count_min?: number;    // writing only
  word_count_max?: number;    // writing only
  bullets?: string[];         // writing only — required content bullets
  explanation?: string;       // teacher answer-key text
}

export type BagrutSectionKind = 'reading' | 'vocab_in_context' | 'writing';

export interface BagrutSection {
  kind: BagrutSectionKind;
  title: string;              // e.g. "PART I — READING COMPREHENSION"
  total_points: number;
  passage?: string;           // reading + vocab_in_context only
  questions: BagrutQuestion[];
}

export interface BagrutTest {
  module: BagrutModule;
  title: string;
  source_words: string[];     // verbatim from teacher input (post-sanitization)
  total_points: number;       // should sum to 100
  time_minutes: number;       // suggested seat time
  sections: BagrutSection[];
}

// ── DB row shapes (snake_case from Supabase) ─────────────────────────────

export interface BagrutTestRow {
  id: string;
  teacher_uid: string;
  class_id: string | null;
  module: BagrutModule;
  title: string;
  source_words: string[];
  content: BagrutTest;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BagrutResponseRow {
  id: string;
  test_id: string;
  student_uid: string;
  answers: Record<string, string>;
  mc_score: number | null;
  mc_max: number | null;
  writing_grade: number | null;
  submitted_at: string | null;
  updated_at: string;
}
