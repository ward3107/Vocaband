/**
 * AiLessonBuilder — Unified AI Lesson Generator
 *
 * Teacher can:
 * 1. Generate reading text from selected words (no artificial limits)
 * 2. Generate various question types using steppers
 * 3. Auto-balance question distribution
 * 4. Preview and regenerate as needed
 *
 * Appears in Review step (Step 3) after words are selected.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  Sparkles, X, Loader2, Check, ChevronDown, ChevronUp,
  RefreshCw, BookOpen, HelpCircle, FileText, Plus, Minus, Printer
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { aiLessonBuilderT } from '../../locales/teacher/ai-lesson-builder';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestionTypeConfig {
  yesNo: number;
  wh: number;
  literal: number;
  inferential: number;
  fillBlank: number;
  trueFalse: number;
  matching: number;
  multipleChoice: number;
  sentenceComplete: number;
}

export interface LessonConfig {
  // Text generation
  textDifficulty: string; // Open description, not just CEFR
  textType: string; // Open description of what teacher wants
  wordCount: number; // 50-5000 words, no presets

  // Question generation
  questionTypes: QuestionTypeConfig;
  includeAnswers: boolean;
}

export interface GeneratedLesson {
  text: string;
  wordCount: number;
  questions: GeneratedQuestion[];
}

export interface GeneratedQuestion {
  type: string;
  question: string;
  answer: string;
  options?: string[]; // For multiple choice, matching, etc.
}

export interface AiLessonBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWords: Array<{ english: string; hebrew: string; arabic: string }>;
  onGenerate: (config: LessonConfig) => Promise<GeneratedLesson>;
  onSaveLesson?: (lesson: GeneratedLesson) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ── Question Type Definitions ───────────────────────────────────────────────────

type QuestionTypeMeta = { key: keyof QuestionTypeConfig; labelKey: 'qYesNo' | 'qWh' | 'qLiteral' | 'qInferential' | 'qFillBlank' | 'qTrueFalse' | 'qMatching' | 'qMultipleChoice' | 'qSentenceComplete'; icon: string; color: string };

const COMPREHENSION_TYPES: QuestionTypeMeta[] = [
  { key: 'yesNo',       labelKey: 'qYesNo',       icon: '✓',   color: 'bg-blue-100 text-blue-700' },
  { key: 'wh',          labelKey: 'qWh',          icon: '?',   color: 'bg-purple-100 text-purple-700' },
  { key: 'literal',     labelKey: 'qLiteral',     icon: '📖', color: 'bg-green-100 text-green-700' },
  { key: 'inferential', labelKey: 'qInferential', icon: '🧠', color: 'bg-amber-100 text-amber-700' },
];

const EXERCISE_TYPES: QuestionTypeMeta[] = [
  { key: 'fillBlank',        labelKey: 'qFillBlank',        icon: '___', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'trueFalse',        labelKey: 'qTrueFalse',        icon: 'T/F', color: 'bg-rose-100 text-rose-700' },
  { key: 'matching',         labelKey: 'qMatching',         icon: '🔗', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'multipleChoice',   labelKey: 'qMultipleChoice',   icon: 'ABC', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { key: 'sentenceComplete', labelKey: 'qSentenceComplete', icon: '...', color: 'bg-teal-100 text-teal-700' },
];

// ── Stepper Component ─────────────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

const Stepper: React.FC<StepperProps> = ({ value, onChange, min = 0, max = 50, label }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all ${
        value <= min
          ? 'bg-[var(--vb-surface-alt)] text-[var(--vb-border)] cursor-not-allowed'
          : 'bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] hover:bg-[var(--vb-border)]'
      }`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
    >
      <Minus size={14} />
    </button>
    <span className={`w-10 text-center font-bold ${label ? 'text-lg' : 'text-base'}`}>
      {value}
    </span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all ${
        value >= max
          ? 'bg-[var(--vb-surface-alt)] text-[var(--vb-border)] cursor-not-allowed'
          : 'bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] hover:bg-[var(--vb-border)]'
      }`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
    >
      <Plus size={14} />
    </button>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiLessonBuilder({
  isOpen,
  onClose,
  selectedWords,
  onGenerate,
  onSaveLesson,
  showToast,
}: AiLessonBuilderProps) {
  const { language, dir } = useLanguage();
  const t = aiLessonBuilderT[language];
  // Text generation config
  const [textDifficulty, setTextDifficulty] = useState(t.studentLevelDefault);
  const [textType, setTextType] = useState('');
  const [wordCount, setWordCount] = useState(200);

  // Question types config
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeConfig>({
    yesNo: 5,
    wh: 8,
    literal: 4,
    inferential: 3,
    fillBlank: 2,
    trueFalse: 2,
    matching: 0,
    multipleChoice: 0,
    sentenceComplete: 0,
  });
  const [includeAnswers, setIncludeAnswers] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'text' | 'questions' | null>(null);

  // Calculate total questions
  const totalQuestions = Object.values(questionTypes).reduce((sum, count) => sum + count, 0);

  // Update question type count
  const updateQuestionType = useCallback((key: keyof QuestionTypeConfig, delta: number) => {
    setQuestionTypes(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(50, prev[key] + delta)),
    }));
  }, []);

  // Auto-balance questions
  const autoBalance = useCallback(() => {
    const total = totalQuestions || 20; // Default to 20 if none set
    const types: (keyof QuestionTypeConfig)[] = ['yesNo', 'wh', 'literal', 'inferential', 'fillBlank', 'trueFalse'];
    const perType = Math.floor(total / types.length);
    const remainder = total % types.length;

    const balanced: QuestionTypeConfig = {
      yesNo: 0, wh: 0, literal: 0, inferential: 0,
      fillBlank: 0, trueFalse: 0, matching: 0, multipleChoice: 0, sentenceComplete: 0,
    };

    types.forEach((type, i) => {
      balanced[type] = perType + (i < remainder ? 1 : 0);
    });

    setQuestionTypes(balanced);
    showToast?.(t.balancedToast(total, types.length), 'success');
  }, [totalQuestions, showToast, t]);

  // Generate lesson
  const handleGenerate = useCallback(async () => {
    if (selectedWords.length === 0) {
      showToast?.(t.selectWordsFirst, 'error');
      return;
    }
    if (totalQuestions === 0) {
      showToast?.(t.selectAtLeastOneType, 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const lesson = await onGenerate({
        textDifficulty,
        textType: textType || t.defaultTextTypePrompt(selectedWords.length),
        wordCount,
        questionTypes,
        includeAnswers,
      });
      setGeneratedLesson(lesson);
      setShowPreview(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.failedToGenerate;
      showToast?.(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedWords, textDifficulty, textType, wordCount, questionTypes, includeAnswers, totalQuestions, onGenerate, showToast, t]);

  // Reset when modal closes
  const handleClose = useCallback(() => {
    setGeneratedLesson(null);
    setShowPreview(true);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-lg">{t.headerTitle}</span>
            <span className="text-sm text-white/80">{t.selectedWordsCount(selectedWords.length)}</span>
          </div>
          <button
            onClick={handleClose}
            type="button"
            aria-label={t.closeAria}
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!generatedLesson ? (
            /* Config Form */
            <div className="space-y-6">
              {/* Reading Text Section */}
              <div className="border-2 border-[var(--vb-border)] rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'text' ? null : 'text')}
                  className="flex items-center justify-between w-full text-left"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    <h3 className="font-bold text-[var(--vb-text-primary)]">{t.readingTextHeading}</h3>
                  </div>
                  {expandedSection === 'text' ? <ChevronUp className="w-5 h-5 text-[var(--vb-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--vb-text-muted)]" />}
                </button>

                {expandedSection === 'text' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-4 space-y-4"
                  >
                    {/* Difficulty/Description */}
                    <div>
                      <label className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                        {t.studentLevelLabel}
                      </label>
                      <input
                        type="text"
                        value={textDifficulty}
                        onChange={(e) => setTextDifficulty(e.target.value)}
                        placeholder={t.studentLevelPlaceholder}
                        className="w-full px-4 py-3 border-2 border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 text-[var(--vb-text-primary)]"
                      />
                      <p className="mt-1 text-xs text-[var(--vb-text-muted)]">
                        {t.studentLevelHelper}
                      </p>
                    </div>

                    {/* Text Type */}
                    <div>
                      <label className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                        {t.textTypeLabel}
                      </label>
                      <textarea
                        value={textType}
                        onChange={(e) => setTextType(e.target.value)}
                        placeholder={t.textTypePlaceholder}
                        className="w-full px-4 py-3 border-2 border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 text-[var(--vb-text-primary)] resize-none h-24"
                      />
                      <p className="mt-1 text-xs text-[var(--vb-text-muted)]">
                        {t.textTypeHelper}
                      </p>
                    </div>

                    {/* Word Count */}
                    <div>
                      <label className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                        {t.textLengthLabel(wordCount)}
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="1000"
                        step="50"
                        value={wordCount}
                        onChange={(e) => setWordCount(Number(e.target.value))}
                        className="w-full accent-violet-600"
                      />
                      <div className="flex justify-between text-xs text-[var(--vb-text-muted)] mt-1">
                        <span>50</span>
                        <span>500</span>
                        <span>1000</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Questions Section */}
              <div className="border-2 border-[var(--vb-border)] rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'questions' ? null : 'questions')}
                  className="flex items-center justify-between w-full text-left"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-violet-600" />
                    <h3 className="font-bold text-[var(--vb-text-primary)]">{t.questionsHeading}</h3>
                    <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-sm font-semibold">
                      {totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); autoBalance(); }}
                      className="text-xs px-3 py-1 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-lg transition-colors"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                    >
                      {t.autoBalance}
                    </button>
                    {expandedSection === 'questions' ? <ChevronUp className="w-5 h-5 text-[var(--vb-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--vb-text-muted)]" />}
                  </div>
                </button>

                {expandedSection === 'questions' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-4 space-y-4"
                  >
                    {/* Comprehension Types */}
                    <div>
                      <h4 className="text-sm font-bold text-[var(--vb-text-secondary)] mb-3">{t.comprehensionHeading}</h4>
                      <div className="space-y-2">
                        {COMPREHENSION_TYPES.map((type) => (
                          <div key={type.key} className="flex items-center justify-between p-3 bg-[var(--vb-surface)] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${type.color}`}>
                                {type.icon}
                              </span>
                              <span className="font-medium text-[var(--vb-text-secondary)]">{t[type.labelKey]}</span>
                            </div>
                            <Stepper
                              value={questionTypes[type.key]}
                              onChange={(val) => updateQuestionType(type.key, val - questionTypes[type.key])}
                              max={30}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exercise Types */}
                    <div>
                      <h4 className="text-sm font-bold text-[var(--vb-text-secondary)] mb-3">{t.exerciseHeading}</h4>
                      <div className="space-y-2">
                        {EXERCISE_TYPES.map((type) => (
                          <div key={type.key} className="flex items-center justify-between p-3 bg-[var(--vb-surface)] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${type.color}`}>
                                {type.icon}
                              </span>
                              <span className="font-medium text-[var(--vb-text-secondary)]">{t[type.labelKey]}</span>
                            </div>
                            <Stepper
                              value={questionTypes[type.key]}
                              onChange={(val) => updateQuestionType(type.key, val - questionTypes[type.key])}
                              max={20}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Include Answers */}
                    <label className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAnswers}
                        onChange={(e) => setIncludeAnswers(e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--vb-text-muted)] text-violet-600 focus:ring-violet-300"
                      />
                      <div>
                        <p className="text-sm font-bold text-[var(--vb-text-secondary)]">{t.includeAnswerKey}</p>
                        <p className="text-xs text-[var(--vb-text-muted)]">{t.includeAnswerKeyHelper}</p>
                      </div>
                    </label>
                  </motion.div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedWords.length === 0 || totalQuestions === 0}
                type="button"
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-shadow"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.generatingLesson}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{t.generateLesson}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--vb-text-primary)]">{t.lessonGenerated}</p>
                  <p className="text-sm text-[var(--vb-text-muted)]">
                    {t.wordsAndQuestionsSummary(generatedLesson.wordCount, generatedLesson.questions.length)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedLesson(null);
                    setShowPreview(true);
                  }}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-sm font-semibold rounded-lg transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t.regenerate}</span>
                </button>
              </div>

              {/* Reading Text */}
              <div className="border-2 border-[var(--vb-border)] rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center justify-between w-full text-left mb-3"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <h3 className="font-bold text-[var(--vb-text-primary)] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-violet-600" />
                    {t.readingTextHeading}
                  </h3>
                  <span className={`text-[var(--vb-text-muted)] transition-transform ${showPreview ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {showPreview && (
                  <div className="prose prose-stone max-w-none">
                    <p className="text-[var(--vb-text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {generatedLesson.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="border-2 border-[var(--vb-border)] rounded-xl p-4">
                <h3 className="font-bold text-[var(--vb-text-primary)] flex items-center gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-violet-600" />
                  {t.questionsCountHeading(generatedLesson.questions.length)}
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {generatedLesson.questions.map((q, i) => {
                    const typeConfig = [...COMPREHENSION_TYPES, ...EXERCISE_TYPES].find(tc => tc.key === q.type);
                    return (
                      <div key={i} className="p-3 bg-[var(--vb-surface)] rounded-lg">
                        <div className="flex items-start gap-2 mb-2">
                          {typeConfig && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${typeConfig.color}`}>
                              {t[typeConfig.labelKey]}
                            </span>
                          )}
                          <p className="font-medium text-[var(--vb-text-primary)]">{t.questionNumber(i + 1, q.question)}</p>
                        </div>
                        {includeAnswers && (
                          <p className="text-sm text-[var(--vb-text-secondary)] ml-1">
                            <span className="font-semibold">{t.answerLabel}</span> {q.answer}
                          </p>
                        )}
                        {q.options && (
                          <div className="mt-2 ml-1 space-y-1">
                            {q.options.map((opt, j) => (
                              <p key={j} className="text-sm text-[var(--vb-text-secondary)]">
                                {String.fromCharCode(65 + j)}. {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons.  "Print / Save as PDF" is the
                  primary path — fires window.print() which uses the
                  print stack portaled below.  "Save to assignment"
                  is secondary and only renders when a parent supplies
                  onSaveLesson (assignment wizard does, Worksheet
                  flow does not). */}
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  type="button"
                  className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <Printer className="w-5 h-5" />
                  {t.printOrSavePdf}
                </button>
                {onSaveLesson && (
                  <button
                    onClick={() => {
                      onSaveLesson(generatedLesson);
                      handleClose();
                    }}
                    type="button"
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                  >
                    <Check className="w-5 h-5" />
                    {t.save}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  type="button"
                  className="flex-1 py-3 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-xl font-bold hover:bg-[var(--vb-border)] transition-all"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {t.done}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Print stack — portaled to document.body so window.print()
          renders ONLY the lesson + question key.  Hidden on screen
          via the @media screen rules in index.css.  Same pattern as
          WorksheetView — portal-to-body + the global print CSS hides
          everything except `body > .vb-print-stack` during print. */}
      {generatedLesson && typeof document !== 'undefined' && createPortal(
        <div className="vb-print-stack">
          <div className="vb-print-only vb-print-avoid-break" style={{ padding: '0', color: '#000' }}>
            <header style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
              <h1 style={{ fontSize: '24pt', fontWeight: 900, margin: 0 }}>
                {t.printDocTitle}
              </h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '11pt' }}>
                <span><strong>{t.printDateLabel}</strong> {new Date().toLocaleDateString()}</span>
                <span><strong>{t.printNameLabel}</strong> ____________________</span>
              </div>
            </header>

            {/* Reading text */}
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '16pt', fontWeight: 800, marginBottom: '0.75rem' }}>
                {t.printReadingHeading}
              </h2>
              <p style={{ fontSize: '12pt', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {generatedLesson.text}
              </p>
            </section>

            {/* Questions */}
            <section className="vb-print-avoid-break" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '16pt', fontWeight: 800, marginBottom: '0.75rem' }}>
                {t.questionsCountHeading(generatedLesson.questions.length)}
              </h2>
              <ol style={{ paddingLeft: '1.5rem', fontSize: '12pt', lineHeight: 1.8 }}>
                {generatedLesson.questions.map((q, i) => (
                  <li key={i} style={{ marginBottom: '0.85rem' }}>
                    <div>{q.question}</div>
                    {q.options && q.options.length > 0 && (
                      <ol type="A" style={{ marginTop: '0.4rem', paddingLeft: '1.5rem' }}>
                        {q.options.map((opt, j) => (
                          <li key={j} style={{ marginBottom: '0.2rem' }}>{opt}</li>
                        ))}
                      </ol>
                    )}
                    {!q.options && (
                      <div style={{ marginTop: '0.4rem', borderBottom: '1px solid #888', height: '1.2em' }} />
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* Answer key — only when teacher opted in */}
            {includeAnswers && (
              <section className="vb-print-avoid-break vb-print-page-break" style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '16pt', fontWeight: 800, marginBottom: '0.75rem', borderBottom: '2px solid #000', paddingBottom: '0.4rem' }}>
                  {t.printAnswerKey}
                </h2>
                <ol style={{ paddingLeft: '1.5rem', fontSize: '11pt', lineHeight: 1.7 }}>
                  {generatedLesson.questions.map((q, i) => (
                    <li key={i} style={{ marginBottom: '0.4rem' }}>
                      <strong>{q.answer}</strong>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
