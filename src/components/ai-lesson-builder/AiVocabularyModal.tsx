/**
 * AiVocabularyModal — Stage 1 of AI Lesson Builder
 *
 * Teacher enters a topic + level, AI generates vocabulary words.
 * Teacher curates which words to add to their assignment.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, X, Loader2, Check, ChevronRight, RefreshCw, Search
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface GeneratedWord {
  english: string;
  hebrew: string;
  arabic: string;
  example?: string;
  isFromCurriculum?: boolean;
  curriculumId?: number;
}

export interface AiVocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWords: (words: GeneratedWord[]) => void;
  onGenerate: (params: GenerateWordsParams) => Promise<GeneratedWord[]>;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface GenerateWordsParams {
  topic: string;
  level: ProficiencyLevel;
  examplesToAnchor?: string;
  skipCurriculumDuplicates: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────────

const LEVELS: { value: ProficiencyLevel; label: string; description: string }[] = [
  { value: 'A1', label: 'Beginner', description: 'Grades 4-5, simple words' },
  { value: 'A2', label: 'Elementary', description: 'Grades 5-6, basic vocabulary' },
  { value: 'B1', label: 'Intermediate', description: 'Grades 6-7, school topics' },
  { value: 'B2', label: 'Upper-Intermediate', description: 'Grades 8-9, complex topics' },
];

// Suggested topics organized by category
const TOPIC_SUGGESTIONS = {
  'School & Classroom': [
    'School subjects', 'Classroom objects', 'Stationery', 'School activities',
  ],
  'Food & Drinks': [
    'Fruits', 'Vegetables', 'Fast food', 'Drinks', 'Desserts', 'Breakfast',
  ],
  'Animals & Nature': [
    'Farm animals', 'Wild animals', 'Sea creatures', 'Birds', 'Weather', 'Seasons',
  ],
  'People & Family': [
    'Family members', 'Feelings', 'Body parts', 'Clothing', 'Jobs & professions',
  ],
  'Places & Directions': [
    'Rooms in a house', 'Places in town', 'Prepositions', 'Transportation',
  ],
  'Hobbies & Activities': [
    'Sports', 'Musical instruments', 'Hobbies', 'Daily routines',
  ],
  'Time & Numbers': [
    'Days of the week', 'Months', 'Numbers', 'Time expressions',
  ],
  'Other': [
    'Colors', 'Shapes', 'Adjectives', 'Verbs',
  ],
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiVocabularyModal({
  isOpen, onClose, onAddWords, onGenerate, showToast
}: AiVocabularyModalProps) {
  const { language } = useLanguage();
  const L = language === 'he'
    ? { topicLabel: '📚 נושא', levelLabel: '📊 רמה', examplesLabel: '💡 מילים לדוגמה לסגנון (אופציונלי)', topicPlaceholder: 'לדוגמה: מזג אוויר, אוכל, רגשות, מקצועות בית ספר...', examplesPlaceholder: 'לדוגמה: שמשי, מעונן, רוחני...', topicHint: 'הקלידו נושא או בחרו מהצעות', examplesHint: 'עוזר ל-AI להתאים את סגנון אוצר המילים שלכם', skipDupes: 'דלגו על מילים שכבר באוצר', skipDupesHint: 'אל תציעו מילים מ-Set 1, Set 2 או Set 3', generating: 'מייצר מילים...', generate: '✨ צור מילים', wordsForTopic: (n: number, t: string) => `${n} מילים עבור "${t}"`, selectedCount: (n: number) => `${n} נבחרו להוספה`, newSearch: 'חיפוש חדש', selectAll: 'בחר הכל', deselectAll: 'נקה הכל', curriculum: 'מאוצר', addToList: (n: number) => `הוסף ${n} מילים לרשימה` }
    : language === 'ar'
    ? { topicLabel: '📚 الموضوع', levelLabel: '📊 المستوى', examplesLabel: '💡 كلمات مثال لتوجيه الأسلوب (اختياري)', topicPlaceholder: 'مثال: الطقس، الطعام، المشاعر، المواد الدراسية...', examplesPlaceholder: 'مثال: مشمس، غائم، عاصف...', topicHint: 'اكتب موضوعاً أو اختر من الاقتراحات', examplesHint: 'يساعد الذكاء على مطابقة أسلوب مفرداتك المفضّل', skipDupes: 'تخطّي الكلمات الموجودة في المنهج', skipDupesHint: 'لا تقترح كلمات من Set 1 أو Set 2 أو Set 3', generating: 'جارٍ توليد الكلمات...', generate: '✨ توليد الكلمات', wordsForTopic: (n: number, t: string) => `${n} كلمة لـ "${t}"`, selectedCount: (n: number) => `${n} مختارة للإضافة`, newSearch: 'بحث جديد', selectAll: 'تحديد الكل', deselectAll: 'إلغاء التحديد', curriculum: 'من المنهج', addToList: (n: number) => `أضف ${n} كلمة إلى القائمة` }
    : { topicLabel: '📚 Topic', levelLabel: '📊 Level', examplesLabel: '💡 Example words to guide style (optional)', topicPlaceholder: 'e.g. weather, food, feelings, school subjects...', examplesPlaceholder: 'e.g. sunny, cloudy, windy...', topicHint: 'Type a topic or choose from suggestions above', examplesHint: 'Helps AI match your preferred vocabulary style', skipDupes: 'Skip words already in the curriculum', skipDupesHint: "Don't suggest words from Set 1, Set 2, or Set 3", generating: 'Generating words...', generate: '✨ Generate words', wordsForTopic: (n: number, t: string) => `${n} words for "${t}"`, selectedCount: (n: number) => `${n} selected to add`, newSearch: 'New search', selectAll: 'Select All', deselectAll: 'Deselect All', curriculum: 'Curriculum', addToList: (n: number) => `Add ${n} word${n !== 1 ? 's' : ''} to list` };
  // Form state
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<ProficiencyLevel>('A2');
  const [examplesToAnchor, setExamplesToAnchor] = useState('');
  const [skipCurriculumDuplicates, setSkipCurriculumDuplicates] = useState(true);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<GeneratedWord[]>([]);
  const [selectedForAdd, setSelectedForAdd] = useState<Set<number>>(new Set());

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setTopic('');
    setLevel('A2');
    setExamplesToAnchor('');
    setSkipCurriculumDuplicates(true);
    setGeneratedWords([]);
    setSelectedForAdd(new Set());
    onClose();
  }, [onClose]);

  // Generate words
  const handleGenerate = useCallback(async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      showToast?.('Please enter a topic', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const words = await onGenerate({
        topic: trimmedTopic,
        level,
        examplesToAnchor: examplesToAnchor.trim() || undefined,
        skipCurriculumDuplicates,
      });
      setGeneratedWords(words);
      // Pre-select all words that aren't from curriculum (teachers likely want to review curriculum matches)
      setSelectedForAdd(new Set(words.filter(w => !w.isFromCurriculum).map((_, i) => i)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate words';
      showToast?.(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, level, examplesToAnchor, skipCurriculumDuplicates, onGenerate, showToast]);

  // Toggle word selection
  const toggleWord = useCallback((index: number) => {
    setSelectedForAdd(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Add selected words
  const handleAddWords = useCallback(() => {
    const wordsToAdd = generatedWords.filter((_, i) => selectedForAdd.has(i));
    if (wordsToAdd.length === 0) {
      showToast?.('Select at least one word', 'error');
      return;
    }
    onAddWords(wordsToAdd);
    handleClose();
  }, [generatedWords, selectedForAdd, onAddWords, showToast, handleClose]);

  if (!isOpen) return null;

  const hasGenerated = generatedWords.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-400 to-violet-500 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-lg">✨ AI Vocabulary Generator</span>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasGenerated ? (
            /* Form Stage */
            <div className="space-y-6">
              {/* Topic Input with Dropdown */}
              <div>
                <label htmlFor="ai-topic" className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                  {L.topicLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="ai-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onFocus={() => setShowTopicDropdown(true)}
                    placeholder={L.topicPlaceholder}
                    className="w-full px-4 py-3 pr-10 border-2 border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-300 focus:border-fuchsia-300 text-[var(--vb-text-primary)]"
                    dir="ltr"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--vb-text-muted)] hover:text-[var(--vb-text-secondary)]"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Topic Suggestions Dropdown */}
                  <AnimatePresence>
                    {showTopicDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-2 bg-[var(--vb-surface)] border-2 border-[var(--vb-border)] rounded-xl shadow-xl max-h-64 overflow-y-auto"
                      >
                        {Object.entries(TOPIC_SUGGESTIONS).map(([category, topics]) => (
                          <div key={category}>
                            <div className="px-4 py-2 bg-[var(--vb-surface-alt)] text-xs font-bold text-[var(--vb-text-secondary)] uppercase tracking-wider sticky top-0">
                              {category}
                            </div>
                            {topics.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setTopic(suggestion);
                                  setShowTopicDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-fuchsia-50 transition-colors text-[var(--vb-text-secondary)] hover:text-fuchsia-700"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="mt-1 text-xs text-[var(--vb-text-muted)]">
                  {L.topicHint}
                </p>
              </div>

              {/* Level Selection */}
              <div>
                <label className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                  {L.levelLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setLevel(lvl.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        level === lvl.value
                          ? 'bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white shadow-md'
                          : 'bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] hover:bg-[var(--vb-surface-alt)]'
                      }`}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                    >
                      <p className="font-bold">{lvl.label}</p>
                      <p className={`text-xs ${level === lvl.value ? 'text-white/80' : 'text-[var(--vb-text-muted)]'}`}>
                        {lvl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Examples to Anchor */}
              <div>
                <label htmlFor="ai-examples" className="block text-sm font-bold text-[var(--vb-text-secondary)] mb-2">
                  {L.examplesLabel}
                </label>
                <input
                  id="ai-examples"
                  type="text"
                  value={examplesToAnchor}
                  onChange={(e) => setExamplesToAnchor(e.target.value)}
                  placeholder={L.examplesPlaceholder}
                  className="w-full px-4 py-3 border-2 border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-300 focus:border-fuchsia-300 text-[var(--vb-text-primary)]"
                  dir="ltr"
                />
                <p className="mt-1 text-xs text-[var(--vb-text-muted)]">
                  {L.examplesHint}
                </p>
              </div>

              {/* Skip Curriculum Duplicates */}
              <div className="flex items-center gap-3 p-4 bg-[var(--vb-surface)] rounded-xl">
                <input
                  id="skip-duplicates"
                  type="checkbox"
                  checked={skipCurriculumDuplicates}
                  onChange={(e) => setSkipCurriculumDuplicates(e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--vb-text-muted)] text-fuchsia-500 focus:ring-fuchsia-300"
                />
                <div className="flex-1">
                  <label htmlFor="skip-duplicates" className="text-sm font-bold text-[var(--vb-text-secondary)] cursor-pointer">
                    {L.skipDupes}
                  </label>
                  <p className="text-xs text-[var(--vb-text-muted)]">
                    {L.skipDupesHint}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                type="button"
                className="w-full bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-shadow"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{L.generating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{L.generate}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Stage */
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--vb-text-primary)]">
                    {L.wordsForTopic(generatedWords.length, topic)}
                  </p>
                  <p className="text-sm text-[var(--vb-text-muted)]">
                    {L.selectedCount(selectedForAdd.size)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedWords([]);
                    setSelectedForAdd(new Set());
                  }}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--vb-surface-alt)] hover:bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-sm font-semibold rounded-lg transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{L.newSearch}</span>
                </button>
              </div>

              {/* Select All / Deselect All */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedForAdd(new Set(generatedWords.map((_, i) => i)))}
                  type="button"
                  className="flex-1 py-2 bg-fuchsia-100 text-fuchsia-700 text-sm font-semibold rounded-lg hover:bg-fuchsia-200 transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {L.selectAll}
                </button>
                <button
                  onClick={() => setSelectedForAdd(new Set())}
                  type="button"
                  className="flex-1 py-2 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-sm font-semibold rounded-lg hover:bg-[var(--vb-surface-alt)] transition-colors"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {L.deselectAll}
                </button>
              </div>

              {/* Words List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <AnimatePresence>
                  {generatedWords.map((word, i) => {
                    const isSelected = selectedForAdd.has(i);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleWord(i)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-fuchsia-50 border-fuchsia-400'
                            : 'bg-[var(--vb-surface)] border-[var(--vb-border)] hover:border-fuchsia-300'
                        }`}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[var(--vb-text-primary)]">{word.english}</p>
                              {word.isFromCurriculum && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                                  {L.curriculum}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-[var(--vb-text-secondary)]" dir="auto">
                              {word.hebrew} • {word.arabic}
                            </p>
                            {word.example && (
                              <p className="mt-1 text-xs text-[var(--vb-text-muted)] italic">
                                "{word.example}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {word.isFromCurriculum ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-fuchsia-500 bg-fuchsia-500' : 'border-[var(--vb-text-muted)]'
                              }`}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Add Selected Button */}
              <div className="pt-4 border-t border-[var(--vb-border)]">
                <button
                  onClick={handleAddWords}
                  disabled={selectedForAdd.size === 0}
                  type="button"
                  className="w-full bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-shadow"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <Check className="w-5 h-5" />
                  <span>{L.addToList(selectedForAdd.size)}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
