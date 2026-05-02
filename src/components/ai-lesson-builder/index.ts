/**
 * AI Lesson Builder components
 *
 * Unified Lesson Builder (Phase 3): Generates reading text + questions from selected words
 */

// Unified lesson builder (Phase 3)
export { default as AiLessonBuilder } from './AiLessonBuilder';
export type {
  LessonConfig,
  GeneratedLesson,
  QuestionTypeConfig,
  AiLessonBuilderProps,
} from './AiLessonBuilder';

// Vocabulary generator (Phase 1) - can be used standalone
export { default as AiVocabularyModal } from './AiVocabularyModal';
export type {
  GeneratedWord,
  AiVocabularyModalProps,
  GenerateWordsParams,
  ProficiencyLevel,
} from './AiVocabularyModal';

