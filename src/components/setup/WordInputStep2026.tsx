/**
 * WordInputStep2026 — Redesigned word input with hero paste area + cards
 *
 * Design philosophy:
 * - One main action (paste) presented beautifully
 * - Progressive cards below for alternatives
 * - Visual status instead of cryptic dots
 * - Conversational, helpful tone
 */

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, AlertTriangle, Sparkles, Upload, Camera,
  ChevronRight, Loader2, X, Search, Package, FolderOpen,
  BookOpen, Plus, Trash2, Pencil
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { analyzePastedText, type WordAnalysisResult } from '../../utils/wordAnalysis';
import InPageCamera from '../InPageCamera';
import { AiVocabularyModal, type GeneratedWord } from '../ai-lesson-builder';

// English-only text constants for the word input step
// Build marker bumped each diagnostic deploy — lets us confirm the
// user is seeing the latest code, not a stale service-worker copy.
const APP_VERSION = 'ocr-debug-2026-04-29-e';

const TEXT = {
  pasteTitle: 'Paste your word list here',
  pastePlaceholder: 'apple, banana, orange, grape',
  pasteTip: 'Separate words with commas, spaces, or lines',
  analyzeButton: 'Analyze & Add Words',
  analyzing: 'Analyzing...',
  or: 'OR',
  topicPacks: 'Topic Packs',
  savedGroups: 'Saved Groups',
  browseLibrary: 'Browse Library',
  ocr: 'Scan & Upload',
  ocrSubtitle: 'Photo to text',
  view: 'View',
  upload: 'Upload',
  packs: 'packs',
  groups: 'groups',
  words: 'words',
  wordsSelected: 'words selected',
  ready: 'READY',
  readyDesc: 'All words have translations',
  needsWork: 'NEEDS WORK',
  needsWorkDesc: 'Missing translations',
  fixTranslations: 'Fix Missing Translations',
  translateMissing: (n: number) => `Translate ${n} missing word${n === 1 ? '' : 's'}`,
  translating: 'Translating…',
  done: 'Done',
  fix: 'Fix',
  addTranslation: 'Add translation',
  continue: 'Continue to Step 2',
  back: 'Back',
  cancel: 'Cancel',
  addWords: 'Add Words',
  camera: 'Camera',
  gallery: 'Gallery',
  uploading: 'Uploading...',
  extracting: 'Extracting words...',
  ocrError: 'No words detected',
  ocrErrorDesc: 'Try a clearer photo or different angle',
  tryAgain: 'Try Again',
  wordsFound: 'words found',
  reviewWords: 'Review and edit before adding:',
  new: 'new',
  noSavedGroups: 'No saved groups yet',
  saveGroupHint: 'Create a group from your selected words',
  searchPlaceholder: 'Search words...',
  showingFirst: 'Showing first 100',
  refineSearch: 'refine your search',
  addSelectedPacks: 'Add selected packs',
  addSelectedWords: 'Add selected words',
  chooseFile: 'Choose File',
  noFileSelected: 'No file selected',
  // Language preference
  translationLang: 'Translation Language',
  bothLang: 'Both',
  hebrewOnly: 'Hebrew Only',
  arabicOnly: 'Arabic Only',
  clearAll: 'Clear All',
  clearAllConfirm: 'Are you sure you want to remove all words?',
  selectWords: 'Select words to add:',
  allWords: 'All words',
  addSelected: 'Add selected words',
  alreadyAdded: 'Already added',
  // AI Lesson Builder
  aiGenerate: 'AI Generate',
  aiGenerateSubtitle: 'Topic to words',
  aiGenerateCard: '✨ Generate',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WordWithStatus {
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  /** Russian translation — optional, same convention as the underlying
   *  Word type.  Only populated for custom words the teacher entered
   *  with a Russian gloss, or rows that have a matching
   *  word_corrections.russian stored under this teacher's uid. */
  russian?: string;
  hasTranslation: boolean;
  isPhrase?: boolean;
}

export interface WordInputStep2026Props {
  allWords: Word[];
  selectedWords: Word[];
  onSelectedWordsChange: (words: Word[]) => void;
  onNext: () => void;
  onBack: () => void;
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string; russian?: string; match: number } | null>;
  /** Batch translate — single round trip for many words.  Used to:
   *  (a) auto-translate Custom-tier words the moment they land via OCR
   *      or paste, so the teacher never sees an empty Hebrew/Arabic
   *      column; and
   *  (b) power the visible "Translate N missing" button at the top of
   *      the selected-words section as a one-click escape hatch.
   *  Curriculum words (Set 1/2/3) already have translations baked in
   *  and are NEVER passed through this — only `level === 'Custom'` rows
   *  with empty hebrew/arabic. */
  onTranslateBatch?: (words: string[]) => Promise<Map<string, { hebrew: string; arabic: string; match: number }>>;
  onOcrUpload?: (file: File) => Promise<{ words: string[]; success?: boolean }>;
  /** AI vocabulary generation — takes topic + level, returns
   *  generated words with translations.  Used by the AI Lesson Builder
   *  to create vocabulary lists from any topic. */
  onAiGenerateWords?: (params: {
    topic: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    examplesToAnchor?: string;
    skipCurriculumDuplicates: boolean;
  }) => Promise<GeneratedWord[]>;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  savedGroups?: Array<{ id: string; name: string; words: number[] }>;
  /** Rename a saved group from inside the SavedGroupsPanel.  Returns
   *  true on success.  Plumbed in 2026-04-30 — previously the panel
   *  only showed groups read-only. */
  onRenameSavedGroup?: (id: string, newName: string) => Promise<boolean>;
  /** Delete a saved group from inside the SavedGroupsPanel. */
  onDeleteSavedGroup?: (id: string) => Promise<boolean>;
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;
  /** When true, the wizard-specific "Continue →" button at the
   *  bottom is suppressed.  Used by the WordPicker wrapper so the
   *  same picking UX can be embedded inside flows that have their
   *  own next-step button (Class Show, Worksheet builder). */
  hideContinueButton?: boolean;
}

type OcrState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type PanelType = 'topic-packs' | 'saved-groups' | 'browse-library' | null;
type TranslationLang = 'both' | 'hebrew' | 'arabic';

// ── Sub-components ─────────────────────────────────────────────────────────────

// Hero Paste Area
interface HeroPasteAreaProps {
  onAnalyze: (text: string) => void;
  isAnalyzing: boolean;
}

const HeroPasteArea: React.FC<HeroPasteAreaProps> = ({ onAnalyze, isAnalyzing }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea so a long paste (10, 50, 200 words) doesn't
  // get hidden inside a fixed 5-line box.  Teachers reported being
  // unable to scan / edit / delete words before hitting Analyze when
  // their list overflowed the original h-32 box.  Min stays at the
  // original 8rem so a brand-new field doesn't look weirdly large; max
  // caps at ~60vh so the box never eats the whole screen on a phone.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = Math.round(window.innerHeight * 0.6);
    const min = 128; // h-32 in px
    el.style.height = `${Math.max(min, Math.min(el.scrollHeight, max))}px`;
  }, [text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="bg-[var(--vb-surface)] rounded-2xl shadow-lg border-2 border-indigo-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-300 to-violet-400 px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-lg">✨ {TEXT.pasteTitle}</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={TEXT.pastePlaceholder}
            dir="ltr"
            className="w-full min-h-32 p-4 border border-[var(--vb-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 text-[var(--vb-text-secondary)] placeholder:text-[var(--vb-text-muted)] leading-relaxed"
            style={{ textAlign: 'left' }}
          />

          {/* Tip */}
          <p className="mt-3 text-sm text-[var(--vb-text-muted)] flex items-center gap-2">
            <span>💡</span>
            <span>{TEXT.pasteTip}</span>
          </p>

          {/* CTA Button */}
          <button
            onClick={() => text.trim() && onAnalyze(text)}
            disabled={!text.trim() || isAnalyzing}
            type="button"
            className="mt-4 w-full bg-gradient-to-r from-indigo-300 to-violet-400 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{TEXT.analyzing}</span>
              </>
            ) : (
              <>
                <span>{TEXT.analyzeButton}</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Option Card
interface OptionCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaText: string;
  gradient: string;
  onClick: () => void;
  delay: number;
  isNew?: boolean;
}

const OptionCard: React.FC<OptionCardProps> = ({
  emoji, title, subtitle, ctaText, gradient, onClick, delay, isNew
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      className="bg-[var(--vb-surface)] rounded-2xl shadow-md hover:shadow-xl border border-[var(--vb-border)] p-6 flex flex-col items-center text-center min-h-[180px] transition-shadow"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
    >
      {/* Icon with optional sparkle */}
      <div className="relative">
        <span className="text-5xl">{emoji}</span>
        {isNew && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-2 text-lg"
          >
            ✨
          </motion.span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 font-bold text-[var(--vb-text-primary)]">{title}</h3>

      {/* Subtitle */}
      <p className="mt-1 text-sm text-[var(--vb-text-muted)]">{subtitle}</p>

      {/* CTA Button */}
      <div className="mt-auto pt-4 self-start">
        <span className={`inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r ${gradient} text-transparent bg-clip-text`}>
          {ctaText}
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </motion.button>
  );
};

// Status Cards
interface StatusCardsProps {
  /** True while a batch translation is in flight — disables the button
   *  and swaps its label to a translating state so the teacher knows
   *  the click actually fired (the request takes 1-3s). */
  isTranslating?: boolean;
  readyCount: number;
  needsWorkCount: number;
  onFixClick?: () => void;
}

const StatusCards: React.FC<StatusCardsProps> = ({ readyCount, needsWorkCount, onFixClick, isTranslating }) => {

  if (readyCount === 0 && needsWorkCount === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {/* Ready Card */}
      {readyCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{readyCount}</p>
              <p className="text-sm font-semibold text-emerald-600">
                {TEXT.ready}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-600">
            {TEXT.readyDesc}
          </p>
        </motion.div>
      )}

      {/* Needs Work Card */}
      {needsWorkCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{needsWorkCount}</p>
              <p className="text-sm font-semibold text-amber-600">
                {TEXT.needsWork}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-600">
            {TEXT.needsWorkDesc}
          </p>
          {onFixClick && (
            <button
              onClick={onFixClick}
              type="button"
              disabled={isTranslating}
              className="mt-3 w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold py-2 px-4 rounded-lg hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {TEXT.translating}
                </>
              ) : (
                <>🌐 {TEXT.translateMissing(needsWorkCount)}</>
              )}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Word Card
interface WordCardProps {
  word: WordWithStatus;
  translationLang: TranslationLang;
  onRemove?: () => void;
  onEdit?: () => void;
  /** Optional quick-translate handler — called when the user taps the
   *  magic wand icon on words missing translations.  If provided, a
   *  quick-translate button appears on cards that need work. */
  onQuickTranslate?: (word: WordWithStatus) => Promise<{ hebrew: string; arabic: string; russian?: string } | null>;
  /** Whether this specific word is currently being translated.  Used
   *  to show a loading spinner while the AI request is in flight. */
  isTranslating?: boolean;
}

const WordCard: React.FC<WordCardProps> = ({
  word,
  translationLang,
  onRemove,
  onEdit,
  onQuickTranslate,
  isTranslating = false
}) => {
  const [localTranslating, setLocalTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Check if word has the required translation(s) based on preference
  const hasRequiredTranslation = (() => {
    if (translationLang === 'both') return word.hebrew && word.arabic;
    if (translationLang === 'hebrew') return word.hebrew;
    if (translationLang === 'arabic') return word.arabic;
    return false;
  })();

  // Get display text for translations
  const getTranslationText = () => {
    if (translationLang === 'both') {
      return word.hebrew && word.arabic
        ? `${word.hebrew} • ${word.arabic}`
        : (word.hebrew || word.arabic || '');
    }
    if (translationLang === 'hebrew') return word.hebrew || '';
    if (translationLang === 'arabic') return word.arabic || '';
    return '';
  };

  const handleQuickTranslate = async () => {
    if (!onQuickTranslate) return;
    setLocalTranslating(true);
    setTranslateError(null);
    try {
      const result = await onQuickTranslate(word);
      if (!result) {
        setTranslateError('Translation failed');
      }
    } catch {
      setTranslateError('Translation failed');
    } finally {
      setLocalTranslating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[var(--vb-surface)] rounded-lg shadow-sm border border-[var(--vb-border)] p-2.5 pr-2 relative overflow-hidden group hover:shadow-md transition-shadow"
    >
      {/* Status stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${hasRequiredTranslation ? 'bg-emerald-400' : 'bg-amber-400'}`} />

      <div className="flex items-center justify-between gap-2 pl-2">
        {/* Word info */}
        <div className="flex-1 min-w-0">
          {/* English */}
          <p className="font-semibold text-[var(--vb-text-primary)] text-base truncate leading-tight">{word.english}</p>

          {/* Translations */}
          {hasRequiredTranslation ? (
            <p className="mt-1 text-sm text-[var(--vb-text-secondary)] truncate" dir="auto">
              {getTranslationText()}
            </p>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              type="button"
              className="mt-1 text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-0.5"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {TEXT.addTranslation}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick-translate button — only shown when word is missing translations
              AND the parent passed an onQuickTranslate handler.  This gives
              teachers a fast path for AI translation without opening the modal. */}
          {!hasRequiredTranslation && onQuickTranslate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleQuickTranslate();
              }}
              type="button"
              disabled={localTranslating || isTranslating}
              className="p-2 rounded-md bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 hover:text-amber-800 transition-all min-w-[36px] min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              title="Quick translate with AI"
            >
              {localTranslating || isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Edit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            type="button"
            className="p-2 rounded-md bg-[var(--vb-surface-alt)] hover:bg-indigo-100 text-[var(--vb-text-secondary)] hover:text-indigo-600 transition-colors min-w-[36px] min-h-[36px]"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            title="Edit translations"
          >
            <span className="text-sm">✏️</span>
          </button>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            type="button"
            className="p-2 rounded-md bg-[var(--vb-surface-alt)] hover:bg-red-100 text-[var(--vb-text-secondary)] hover:text-red-600 transition-colors min-w-[36px] min-h-[36px]"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            title="Remove word"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Edit Translation Modal
interface EditTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: WordWithStatus | null;
  translationLang: TranslationLang;
  onSave: (wordId: number, hebrew: string, arabic: string, russian: string) => void;
  /** Optional AI translator.  When supplied, the modal exposes an
   *  "✨ Auto-translate" button that fills the Hebrew + Arabic + Russian
   *  inputs from Gemini.  If the word is a Set 1/2/3 row (positive id),
   *  the result is persisted via `word_corrections` by the parent so
   *  the same word already shows up translated in future assignments. */
  onTranslate?: (englishWord: string) => Promise<{ hebrew: string; arabic: string; russian?: string; match: number } | null>;
}

const EditTranslationModal: React.FC<EditTranslationModalProps> = ({
  isOpen, onClose, word, translationLang, onSave, onTranslate
}) => {
  const [hebrew, setHebrew] = useState('');
  const [arabic, setArabic] = useState('');
  const [russian, setRussian] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  useEffect(() => {
    if (word) {
      setHebrew(word.hebrew || '');
      setArabic(word.arabic || '');
      setRussian(word.russian || '');
      setTranslateError(null);
    }
  }, [word]);

  const handleAutoTranslate = async () => {
    if (!onTranslate || !word) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const result = await onTranslate(word.english);
      if (!result) {
        setTranslateError('Translation service unavailable — try typing manually.');
        return;
      }
      // Only overwrite fields that aren't already filled — teachers who
      // typed something intentional shouldn't have it clobbered.  We
      // always fill Russian if the API returned it, because the Russian
      // input is always shown (no per-language gating for RU).
      if ((translationLang === 'both' || translationLang === 'hebrew') && !hebrew && result.hebrew) {
        setHebrew(result.hebrew);
      }
      if ((translationLang === 'both' || translationLang === 'arabic') && !arabic && result.arabic) {
        setArabic(result.arabic);
      }
      if (!russian && result.russian) {
        setRussian(result.russian);
      }
    } catch {
      setTranslateError('Translation failed — check your connection and try again.');
    } finally {
      setTranslating(false);
    }
  };

  if (!isOpen || !word) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-300 to-violet-400 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">✏️</span>
            <span className="font-bold">Edit Translations</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* English word (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-[var(--vb-text-secondary)] mb-1">
              English
            </label>
            <div className="w-full px-4 py-3 bg-[var(--vb-surface-alt)] rounded-xl text-[var(--vb-text-primary)] font-bold">
              {word.english}
            </div>
          </div>

          {/* AI Auto-translate — calls Gemini and fills whichever of the
              two input fields are still empty.  Rendered only when the
              parent passed an `onTranslate` handler. */}
          {onTranslate && (
            <div>
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Translating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Auto-translate with AI
                  </>
                )}
              </button>
              {translateError && (
                <p className="mt-2 text-xs text-rose-600 font-semibold text-center">{translateError}</p>
              )}
              {word.id > 0 && (
                <p className="mt-1 text-[11px] text-[var(--vb-text-muted)] text-center">
                  Saved to your account — this word stays translated in future assignments.
                </p>
              )}
            </div>
          )}

          {/* Hebrew translation */}
          {(translationLang === 'both' || translationLang === 'hebrew') && (
            <div>
              <label htmlFor="custom-word-hebrew" className="block text-sm font-semibold text-[var(--vb-text-secondary)] mb-1 flex items-center gap-2">
                <span>🇮🇱</span> Hebrew {translationLang === 'hebrew' && <span className="text-xs text-emerald-600">(Required)</span>}
              </label>
              <input
                type="text"
                id="custom-word-hebrew"
                name="hebrew"
                autoComplete="off"
                value={hebrew}
                onChange={(e) => setHebrew(e.target.value)}
                placeholder="Enter Hebrew translation"
                className="w-full px-4 py-3 border border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                dir="rtl"
              />
            </div>
          )}

          {/* Arabic translation */}
          {(translationLang === 'both' || translationLang === 'arabic') && (
            <div>
              <label htmlFor="custom-word-arabic" className="block text-sm font-semibold text-[var(--vb-text-secondary)] mb-1 flex items-center gap-2">
                <span>🇸🇦</span> Arabic {translationLang === 'arabic' && <span className="text-xs text-emerald-600">(Required)</span>}
              </label>
              <input
                type="text"
                id="custom-word-arabic"
                name="arabic"
                autoComplete="off"
                value={arabic}
                onChange={(e) => setArabic(e.target.value)}
                placeholder="Enter Arabic translation"
                className="w-full px-4 py-3 border border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                dir="rtl"
              />
            </div>
          )}

          {/* Russian translation — always shown (not gated by
              translationLang) since Russian-speaking students are a
              separate audience from the Hebrew/Arabic split.  A blank
              value is fine; no classroom requires it. */}
          <div>
            <label htmlFor="custom-word-russian" className="block text-sm font-semibold text-[var(--vb-text-secondary)] mb-1 flex items-center gap-2">
              <span>🇷🇺</span> Russian
            </label>
            <input
              type="text"
              id="custom-word-russian"
              name="russian"
              autoComplete="off"
              value={russian}
              onChange={(e) => setRussian(e.target.value)}
              placeholder="Enter Russian translation"
              className="w-full px-4 py-3 border border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              dir="ltr"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 py-3 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] font-bold rounded-xl hover:opacity-80 transition-colors"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              {TEXT.cancel}
            </button>
            <button
              onClick={() => {
                onSave(word.id, hebrew, arabic, russian);
                onClose();
              }}
              type="button"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-300 to-violet-400 text-white font-bold rounded-xl hover:shadow-lg transition-shadow"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// OCR Upload Modal
interface OcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  /** Open the in-page camera (getUserMedia stream).  Replaces the old
   *  <input capture="environment"> path which launched the OS camera
   *  app and let Android Chrome kill our tab to free RAM. */
  onOpenCamera: () => void;
  /** Open the gallery picker.  The actual <input type="file"> lives
   *  in the parent so that the InPageCamera permission-denied fallback
   *  can trigger the same picker without re-mounting another input. */
  onOpenGallery: () => void;
  state: OcrState;
  progress: number;
  extractedWords: string[];
  onConfirm: (words: string[]) => void;
  onEditWord: (index: number, value: string) => void;
  /** When state==='error', show the real error reason instead of
   *  the generic "No words detected" message.  Surfaced 2026-04-28
   *  after teacher reported "doesn't work" with no signal at all. */
  errorMessage?: string;
}

const OcrModal: React.FC<OcrModalProps> = ({
  isOpen, onClose, onUpload, onOpenCamera, onOpenGallery, state, progress, extractedWords, onConfirm, onEditWord, errorMessage,
}) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-300 to-fuchsia-400 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <span className="font-bold">{TEXT.ocr}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Upload State */}
          {state === 'idle' && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-100 to-fuchsia-100 flex items-center justify-center">
                <Camera className="w-10 h-10 text-rose-500" />
              </div>
              <p className="text-[var(--vb-text-secondary)] font-medium mb-4">
                {TEXT.ocrSubtitle}
              </p>

              {/*
                Gallery file <input> lives in the parent component
                (see WordInputStep2026 below the OcrModal mount) so
                BOTH this button and the InPageCamera permission-
                denied fallback can trigger the same picker without
                duplicating the input.  We just call onOpenGallery,
                which fires the parent's input.click().
              */}

              <div className="flex gap-3">
                <button
                  onClick={onOpenCamera}
                  type="button"
                  className="flex-1 bg-gradient-to-r from-rose-300 to-fuchsia-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <Camera className="w-5 h-5" />
                  {TEXT.camera}
                </button>
                <button
                  onClick={onOpenGallery}
                  type="button"
                  className="flex-1 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <Upload className="w-5 h-5" />
                  {TEXT.gallery}
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {(state === 'uploading' || state === 'processing') && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
              <p className="text-[var(--vb-text-secondary)] font-medium">
                {state === 'uploading'
                  ? TEXT.uploading
                  : TEXT.extracting
                }
              </p>
              {progress > 0 && (
                <div className="mt-4 w-full bg-[var(--vb-surface-alt)] rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="bg-gradient-to-r from-rose-300 to-fuchsia-400 h-2 rounded-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Success State - Preview */}
          {state === 'success' && (
            <div>
              {/* Success Badge */}
              <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-emerald-50 text-emerald-700">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {extractedWords.length} {TEXT.wordsFound}
                </span>
              </div>

              {/* Words List */}
              <p className="text-sm text-[var(--vb-text-muted)] mb-2">
                {TEXT.reviewWords}
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {extractedWords.map((word, i) => (
                  <input
                    key={i}
                    type="text"
                    id={`ocr-word-${i}`}
                    name={`ocrWord-${i}`}
                    autoComplete="off"
                    value={word}
                    onChange={(e) => onEditWord(i, e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--vb-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    dir="ltr"
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  type="button"
                  className="flex-1 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] font-bold py-3 px-4 rounded-xl"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {TEXT.cancel}
                </button>
                <button
                  onClick={() => onConfirm(extractedWords.filter(w => w.trim()))}
                  type="button"
                  className="flex-1 bg-gradient-to-r from-rose-300 to-fuchsia-400 text-white font-bold py-3 px-4 rounded-xl"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  {TEXT.addWords}
                </button>
              </div>
            </div>
          )}

          {/* Error State — shows the REAL error when available,
              not just the generic "no words detected" string.  Helps
              teachers (and us) diagnose whether it's a network /
              auth / server / camera failure on mobile. */}
          {state === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <p className="text-[var(--vb-text-secondary)] font-medium mb-2">
                {errorMessage ? 'Something went wrong' : TEXT.ocrError}
              </p>
              <p className="text-sm text-[var(--vb-text-muted)] mb-4 max-w-xs mx-auto break-words">
                {errorMessage || TEXT.ocrErrorDesc}
              </p>
              <button
                onClick={onClose}
                type="button"
                className="bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] font-bold py-3 px-6 rounded-xl"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                {TEXT.tryAgain}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Pack Words Modal (shows individual words in a pack) ─────────────────────────

interface PackWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParentClose?: () => void; // Close the parent panel too
  pack: { name: string; icon: string; ids: number[]; words: Word[] } | null;
  selectedWordIds: Set<number>;
  onAddWords: (words: Word[]) => void;
}

const PackWordsModal: React.FC<PackWordsModalProps> = ({
  isOpen, onClose, onParentClose, pack, selectedWordIds, onAddWords
}) => {
  const [selectedForAdd, setSelectedForAdd] = useState<Set<number>>(new Set());

  // Pre-select words that aren't already added
  useEffect(() => {
    if (pack) {
      const notYetAdded = pack.words.filter(w => !selectedWordIds.has(w.id));
      setSelectedForAdd(new Set(notYetAdded.map(w => w.id)));
    }
  }, [pack, selectedWordIds]);

  if (!isOpen || !pack) return null;

  const toggleWord = (wordId: number) => {
    setSelectedForAdd(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const wordsToAdd = pack.words.filter(w => selectedForAdd.has(w.id));
    onAddWords(wordsToAdd);
    setSelectedForAdd(new Set());
    onClose();
    onParentClose?.(); // Also close the parent Topic Packs panel
  };

  const selectAll = () => {
    setSelectedForAdd(new Set(pack.words.map(w => w.id)));
  };

  const deselectAll = () => {
    setSelectedForAdd(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">{pack.icon}</span>
            <span className="font-bold">{pack.name}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Select All / Deselect All */}
        <div className="px-4 py-3 border-b border-[var(--vb-border)] flex gap-2">
          <button
            onClick={selectAll}
            type="button"
            className="flex-1 py-2 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-200 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            {TEXT.allWords}
          </button>
          <button
            onClick={deselectAll}
            type="button"
            className="flex-1 py-2 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-sm font-semibold rounded-lg hover:opacity-80 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            {TEXT.cancel}
          </button>
        </div>

        {/* Words List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 max-h-80">
            {pack.words.map((word) => {
              const isAlreadyAdded = selectedWordIds.has(word.id);
              const isSelected = selectedForAdd.has(word.id);

              return (
                <motion.button
                  key={word.id}
                  whileHover={{ scale: isAlreadyAdded ? 1 : 1.01 }}
                  whileTap={{ scale: isAlreadyAdded ? 1 : 0.99 }}
                  onClick={() => !isAlreadyAdded && toggleWord(word.id)}
                  disabled={isAlreadyAdded}
                  type="button"
                  className={`w-full p-3 rounded-lg text-center transition-all ${
                    isAlreadyAdded
                      ? 'bg-[var(--vb-surface-alt)] border border-[var(--vb-border)] opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-50 border-2 border-indigo-400'
                      : 'bg-[var(--vb-surface)] border border-[var(--vb-border)] hover:border-indigo-300'
                  }`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--vb-text-primary)] truncate">{word.english}</p>
                      <p className="text-sm text-[var(--vb-text-muted)] truncate" dir="auto">
                        {word.hebrew} • {word.arabic}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAlreadyAdded && (
                        <span className="text-xs font-semibold text-[var(--vb-text-muted)]">
                          {TEXT.alreadyAdded}
                        </span>
                      )}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-[var(--vb-text-muted)]'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {selectedForAdd.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t border-[var(--vb-border)] shrink-0"
          >
            <button
              onClick={handleAddSelected}
              type="button"
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold py-3 px-6 rounded-xl"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              {TEXT.addSelected} ({selectedForAdd.size})
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ── Topic Packs Panel ───────────────────────────────────────────────────────────

interface TopicPacksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  topicPacks: Array<{ name: string; icon: string; ids: number[] }>;
  allWords: Word[];
  selectedWords: Word[];
  onAddWords: (words: Word[]) => void;
}

const TopicPacksPanel: React.FC<TopicPacksPanelProps> = ({
  isOpen, onClose, topicPacks, allWords, selectedWords, onAddWords
}) => {
  const [selectedPack, setSelectedPack] = useState<{ name: string; icon: string; ids: number[]; words: Word[] } | null>(null);

  const selectedWordIds = new Set(selectedWords.map(w => w.id));

  // Calculate word counts for each pack
  const packsWithCounts = useMemo(() => {
    return topicPacks.map(pack => {
      const words = pack.ids.map(id => allWords.find(w => w.id === id)).filter(Boolean) as Word[];
      const newCount = words.filter(w => !selectedWordIds.has(w.id)).length;
      return { ...pack, words, newCount };
    });
  }, [topicPacks, allWords, selectedWordIds]);

  const handlePackClick = (pack: typeof packsWithCounts[0]) => {
    setSelectedPack(pack);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--vb-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Package className="w-5 h-5" />
              <span className="font-bold">{TEXT.topicPacks}</span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-white/80 hover:text-white"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packsWithCounts.map((pack) => (
                <motion.button
                  key={pack.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePackClick(pack)}
                  type="button"
                  className="p-4 rounded-xl border-2 border-[var(--vb-border)] bg-[var(--vb-surface)] hover:border-emerald-300 text-center transition-all"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pack.icon}</span>
                        <span className="font-bold text-[var(--vb-text-primary)]">{pack.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--vb-text-muted)]">
                        {pack.words.length} {TEXT.words}
                        {pack.newCount > 0 && (
                          <span className="text-emerald-600 ml-2">
                            (+{pack.newCount} {TEXT.new})
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--vb-text-muted)] shrink-0" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pack Words Modal */}
      <PackWordsModal
        isOpen={selectedPack !== null}
        onClose={() => setSelectedPack(null)}
        onParentClose={onClose}
        pack={selectedPack}
        selectedWordIds={selectedWordIds}
        onAddWords={onAddWords}
      />
    </>
  );
};

// ── Saved Groups Panel ─────────────────────────────────────────────────────────

interface SavedGroupsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedGroups: Array<{ id: string; name: string; words: number[] }>;
  allWords: Word[];
  selectedWords: Word[];
  onAddWords: (words: Word[]) => void;
  /** Rename callback — when provided, each group card shows a pencil
   *  icon that opens an inline rename input.  When omitted, rename UI
   *  is hidden (e.g. Quick Play setup that doesn't pass it through). */
  onRenameGroup?: (id: string, newName: string) => Promise<boolean>;
  /** Delete callback — same conditional UI as rename. */
  onDeleteGroup?: (id: string) => Promise<boolean>;
}

const SavedGroupsPanel: React.FC<SavedGroupsPanelProps> = ({
  isOpen, onClose, savedGroups, allWords, selectedWords, onAddWords,
  onRenameGroup, onDeleteGroup,
}) => {
  const selectedWordIds = new Set(selectedWords.map(w => w.id));

  // Inline-rename state — track which group id is being edited and
  // its draft name.  Only one row is editable at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const groupsWithCounts = useMemo(() => {
    return savedGroups.map(group => {
      const words = group.words.map(id => allWords.find(w => w.id === id)).filter(Boolean) as Word[];
      const newCount = words.filter(w => !selectedWordIds.has(w.id)).length;
      return { ...group, words, newCount };
    });
  }, [savedGroups, allWords, selectedWordIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <FolderOpen className="w-5 h-5" />
            <span className="font-bold">{TEXT.savedGroups}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {groupsWithCounts.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-[var(--vb-border)] mx-auto mb-4" />
              <p className="text-[var(--vb-text-muted)]">{TEXT.noSavedGroups}</p>
              <p className="text-sm text-[var(--vb-text-muted)] mt-1">
                {TEXT.saveGroupHint}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupsWithCounts.map((group) => {
                const isEditing = editingId === group.id;
                return (
                  <div
                    key={group.id}
                    className="w-full p-4 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!onRenameGroup) return;
                              const trimmed = editingName.trim();
                              if (!trimmed || trimmed === group.name) { setEditingId(null); return; }
                              const ok = await onRenameGroup(group.id, trimmed);
                              if (ok) setEditingId(null);
                            }}
                            className="flex gap-2"
                          >
                            <input
                              autoFocus
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value.slice(0, 80))}
                              maxLength={80}
                              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:outline-none font-bold text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold"
                              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] text-xs font-bold"
                              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const newWords = group.words.filter(w => !selectedWordIds.has(w.id));
                              onAddWords(newWords);
                              onClose();
                            }}
                            className="text-left w-full"
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                          >
                            <p className="font-bold text-[var(--vb-text-primary)] truncate">{group.name}</p>
                            <p className="mt-1 text-sm text-[var(--vb-text-muted)]">
                              {group.words.length} {TEXT.words}
                              {group.newCount > 0 && (
                                <span className="text-emerald-600 ml-2">
                                  (+{group.newCount} {TEXT.new})
                                </span>
                              )}
                            </p>
                          </button>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          {onRenameGroup && (
                            <button
                              type="button"
                              aria-label={`Rename ${group.name}`}
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(group.id);
                                setEditingName(group.name);
                              }}
                              className="p-2 rounded-lg text-[var(--vb-text-muted)] hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteGroup && (
                            <button
                              type="button"
                              aria-label={`Delete ${group.name}`}
                              title="Delete"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete saved group "${group.name}"?`)) {
                                  await onDeleteGroup(group.id);
                                }
                              }}
                              className="p-2 rounded-lg text-[var(--vb-text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-5 h-5 text-[var(--vb-border)]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Browse Library Panel ───────────────────────────────────────────────────────

interface BrowseLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  allWords: Word[];
  selectedWords: Word[];
  onAddWords: (words: Word[]) => void;
  onRemoveWord?: (wordId: number) => void;
}

const BrowseLibraryPanel: React.FC<BrowseLibraryPanelProps> = ({
  isOpen, onClose, allWords, selectedWords, onAddWords, onRemoveWord
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Set 1' | 'Set 2' | 'Set 3'>('All');
  const [selectedForAdd, setSelectedForAdd] = useState<Set<number>>(new Set());

  const selectedWordIds = new Set(selectedWords.map(w => w.id));

  // Filter words based on search and level
  const filteredWords = useMemo(() => {
    return allWords.filter(word => {
      const matchesSearch = searchQuery === '' ||
        word.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.hebrew?.includes(searchQuery) ||
        word.arabic?.includes(searchQuery);
      const matchesLevel = selectedLevel === 'All' || word.level === selectedLevel;
      return matchesSearch && matchesLevel;
    });
  }, [allWords, searchQuery, selectedLevel]);

  const handleAddSelected = () => {
    const wordsToAdd = filteredWords.filter(w => selectedForAdd.has(w.id) && !selectedWordIds.has(w.id));
    onAddWords(wordsToAdd);
    setSelectedForAdd(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--vb-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-300 to-violet-400 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="w-5 h-5" />
            <span className="font-bold">{TEXT.browseLibrary}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[var(--vb-border)] shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--vb-text-muted)]" />
            <input
              type="text"
              id="word-library-search"
              name="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={TEXT.searchPlaceholder}
              className="w-full pl-10 pr-4 py-3 border border-[var(--vb-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              dir="ltr"
            />
          </div>

          {/* Level Filter */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Set 1', 'Set 2', 'Set 3'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level as typeof selectedLevel)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-indigo-500 text-white'
                    : 'bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] hover:opacity-80'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Results count - removed the number display */}
          <p className="text-sm text-[var(--vb-text-muted)]">
            {searchQuery ? `Matching "${searchQuery}"` : 'All words'}
          </p>
        </div>

        {/* Word List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 max-h-64">
            {filteredWords.slice(0, 100).map((word) => {
              const isSelected = selectedWordIds.has(word.id);
              const isPending = selectedForAdd.has(word.id);

              return (
                <motion.button
                  key={word.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (isSelected) {
                      onRemoveWord?.(word.id);
                    } else if (isPending) {
                      setSelectedForAdd(prev => { const next = new Set(prev); next.delete(word.id); return next; });
                    } else {
                      setSelectedForAdd(prev => new Set(prev).add(word.id));
                    }
                  }}
                  type="button"
                  className={`w-full p-3 rounded-lg text-center transition-all ${
                    isSelected
                      ? 'bg-violet-50 border-2 border-violet-300'
                      : isPending
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'bg-[var(--vb-surface)] border border-[var(--vb-border)] hover:border-[var(--vb-text-muted)]'
                  }`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--vb-text-primary)] truncate">{word.english}</p>
                      <p className="text-sm text-[var(--vb-text-muted)] truncate" dir="auto">
                        {word.hebrew} • {word.arabic}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {isPending && !isSelected && (
                      <Plus className="w-5 h-5 text-indigo-500 shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
            {filteredWords.length > 100 && (
              <p className="text-center text-sm text-[var(--vb-text-muted)] py-2">
                {TEXT.showingFirst} — {TEXT.refineSearch}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        {selectedForAdd.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t border-[var(--vb-border)] shrink-0"
          >
            <button
              onClick={handleAddSelected}
              type="button"
              className="w-full bg-gradient-to-r from-indigo-300 to-violet-400 text-white font-bold py-3 px-6 rounded-xl"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              {TEXT.addSelectedWords} ({selectedForAdd.size})
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const WordInputStep2026: React.FC<WordInputStep2026Props> = ({
  allWords,
  selectedWords,
  onSelectedWordsChange,
  onNext,
  onBack,
  onTranslateWord,
  onTranslateBatch,
  onOcrUpload,
  onAiGenerateWords,
  showToast,
  topicPacks = [],
  savedGroups = [],
  onRenameSavedGroup,
  onDeleteSavedGroup,
  customWords = [],
  onCustomWordsChange,
  hideContinueButton = false,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const selectedWordsRef = useRef<HTMLDivElement>(null);
  // OCR / panels set this true when they add words; the effect below
  // scrolls to selectedWordsRef once the section has actually mounted.
  // (A naive setTimeout-based scroll fails on first add because the
  // ref target is conditionally rendered behind selectedWords.length.)
  const [shouldScrollToSelected, setShouldScrollToSelected] = useState(false);
  // Diagnostic-only — visible banner showing the last OCR add call.
  const [ocrDebugInfo, setOcrDebugInfo] = useState<string | null>(null);
  useEffect(() => {
    if (!shouldScrollToSelected) return;
    if (selectedWords.length === 0) return;
    const node = selectedWordsRef.current;
    if (!node) return;
    // Wait one frame so the section's children paint before the scroll
    // animation starts — feels smoother on Android.
    const id = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShouldScrollToSelected(false);
    });
    return () => cancelAnimationFrame(id);
  }, [shouldScrollToSelected, selectedWords.length]);

  // Language preference for translations
  const [translationLang, setTranslationLang] = useState<TranslationLang>('both');

  // Panel State
  const [openPanel, setOpenPanel] = useState<PanelType>(null);

  // AI Lesson Builder State
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Saved Groups from localStorage
  // Saved groups now flow through props (backed by Supabase via
  // useSavedWordGroups in CreateAssignmentWizard).  The previous
  // localStorage path lost groups on logout / device change.
  // Fall back to [] when caller didn't pass any (e.g. Quick Play
  // setup before useSavedWordGroups was wired in there).
  const localSavedGroups = savedGroups;

  // OCR State
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  // In-page camera (getUserMedia stream) shown over the OCR modal
  // when the teacher taps "Camera".  Replaces the OS camera intent
  // so Android Chrome can't kill our tab to free RAM.
  const [cameraOpen, setCameraOpen] = useState(false);
  // Gallery file input lives at the parent so InPageCamera's "Pick
  // from gallery instead" fallback can trigger it from the camera
  // permission-denied error screen, not just OcrModal's Gallery
  // button.  Both consumers call openGalleryPicker() which fires the
  // hidden <input>'s native click(), surfacing the OS picker.
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const openGalleryPicker = useCallback(() => {
    // Reset value first so picking the same file twice in a row still
    // fires onChange (browsers de-dupe identical values otherwise).
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  }, []);
  const [ocrState, setOcrState] = useState<OcrState>('idle');
  // Real error message captured when OCR fails -- replaces the
  // previous silent catch-then-set-error-state pattern that left
  // teachers staring at a generic "no words detected" with zero
  // signal about what actually broke.
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedWords, setExtractedWords] = useState<string[]>([]);

  // Edit Translation State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordWithStatus | null>(null);

  // Convert selected words to status format
  const wordsWithStatus: WordWithStatus[] = selectedWords.map(w => ({
    id: w.id,
    english: w.english,
    hebrew: w.hebrew || '',
    arabic: w.arabic || '',
    hasTranslation: !!(w.hebrew && w.arabic),
    isPhrase: w.isPhrase || false,
  }));

  const readyCount = wordsWithStatus.filter(w => w.hasTranslation).length;
  const needsWorkCount = wordsWithStatus.filter(w => !w.hasTranslation).length;

  // Analyze pasted text - NOW ACTUALLY ADDS THE WORDS
  const handleAnalyze = useCallback(async (text: string) => {
    setIsAnalyzing(true);
    try {
      const result = analyzePastedText(text, allWords);

      // Add matched words to selection
      const existingIds = new Set(selectedWords.map(w => w.id));
      const newWords = result.matchedWords
        .map(m => m.word)
        .filter(w => !existingIds.has(w.id));

      if (newWords.length > 0) {
        onSelectedWordsChange([...selectedWords, ...newWords]);
        showToast?.(`Added ${newWords.length} words`, 'success');
        // Same flag-based scroll as handleConfirmOcr / handleAddWords.
        setShouldScrollToSelected(true);
      } else {
        showToast?.('No new words found', 'info');
      }
    } catch (error) {
      console.error('[WordInputStep2026] handleAnalyze ERROR', error);
      showToast?.('Failed to analyze text', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [allWords, selectedWords, onSelectedWordsChange, showToast]);

  // OCR Upload handler
  const handleOcrUpload = useCallback(async (file: File) => {
    if (!onOcrUpload) {
      showToast?.('OCR is not available right now', 'error');
      return;
    }

    setOcrState('uploading');
    setOcrProgress(0);
    setOcrErrorMessage(null);

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      // Simulate progress
      progressInterval = setInterval(() => {
        setOcrProgress(p => Math.min(p + 10, 90));
      }, 100);

      const result = await onOcrUpload(file);
      if (progressInterval) clearInterval(progressInterval);
      setOcrProgress(100);
      setOcrDebugInfo(`Server returned ${result.words.length} words: [${result.words.slice(0, 3).join(', ')}...]`);

      if (result.words.length === 0) {
        setOcrErrorMessage(null); // generic "no words" text is fine here
        setOcrState('error');
      } else {
        // Skip the in-modal review step — it was vanishing on some mobile
        // browsers (Chrome on Android can recycle the page when returning
        // from the camera intent on memory-constrained devices), losing
        // the extracted words.  Add them straight to the assignment word
        // list instead.  The teacher can still edit / remove individual
        // words from the selected-words list (each card has its own
        // edit + trash buttons), so we lose nothing by skipping the
        // intermediate review.
        handleConfirmOcr(result.words);
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      // Surface the real reason — teachers were stuck staring at the
      // generic "No words detected" with no idea whether the picture
      // failed to upload, the server choked, or auth was stale.
      const message = error instanceof Error ? error.message : String(error);
      console.error('[OCR] upload FAILED:', message, error);
      setOcrErrorMessage(message);
      setOcrState('error');
      showToast?.(`OCR failed: ${message}`, 'error');
    }
  }, [onOcrUpload, showToast]);

  const handleEditOcrWord = useCallback((index: number, value: string) => {
    setExtractedWords(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // ── Auto-translate plumbing — declared BEFORE handleConfirmOcr
  // because handleConfirmOcr's deps array references runBatchTranslate.
  // Hoisting these earlier in the component body avoids a temporal-
  // dead-zone ReferenceError when the deps array is evaluated at the
  // useCallback line for handleConfirmOcr.
  // (Earlier ordering put runBatchTranslate AFTER handleConfirmOcr,
  // which crashed the wizard on load with 'Cannot access ue before
  // initialization' — the minifier's name for runBatchTranslate.)

  // Track whether a batch translate is in flight so the button can
  // show a spinner instead of letting the teacher fire it twice.
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);

  // Latest selectedWords mirror — async translate callbacks read from
  // this ref so they don't clobber words the teacher added while the
  // /api/translate request was in flight.
  const selectedWordsRefForBatch = useRef(selectedWords);
  useEffect(() => { selectedWordsRefForBatch.current = selectedWords; }, [selectedWords]);

  // Find Custom-tier words with at least one empty translation column.
  // Curriculum words (Set 1/2/3) already have hebrew + arabic baked in
  // via vocabulary.ts and are skipped — we only spend AI tokens on
  // words the teacher actually typed/pasted/OCR'd that aren't in our
  // dictionary.
  // Returns every selected word that is missing hebrew OR arabic,
  // regardless of level.  Earlier this was scoped to `level === 'Custom'`
  // on the assumption that curriculum words always ship with both
  // translations — but stale / incomplete curriculum rows do exist
  // in production, and the visible "Translate N missing" button counts
  // them in `needsWorkCount` (line ~1730), so the previous filter let
  // teachers click a button that exited immediately without translating
  // anything.  Now both the counter and the action operate on the same
  // pool.
  const customNeedingTranslation = useCallback(() => {
    return selectedWords.filter(w =>
      !w.hebrew?.trim() || !w.arabic?.trim()
    );
  }, [selectedWords]);

  // Generic batch translate: fills hebrew + arabic for any Custom-tier
  // words that are still missing them, using the parent-provided
  // onTranslateBatch (one /api/translate round trip).  Used by:
  //   - handleConfirmOcr (auto-fire after OCR adds custom words)
  //   - handleFixTranslations (visible button when teacher wants to
  //     retry / catch up after editing word english strings)
  const runBatchTranslate = useCallback(async (
    customs: Word[],
  ): Promise<Word[]> => {
    if (!onTranslateBatch || customs.length === 0) return customs;
    const targets = customs
      .map(w => w.english.trim())
      .filter(s => s.length > 0);
    if (targets.length === 0) return customs;
    try {
      const batch = await onTranslateBatch(targets);
      return customs.map(w => {
        const entry = batch.get(w.english.toLowerCase().trim());
        if (!entry) return w;
        return {
          ...w,
          hebrew: w.hebrew?.trim() || entry.hebrew || '',
          arabic: w.arabic?.trim() || entry.arabic || '',
        };
      });
    } catch (err) {
      console.warn('[i18n] batch translate failed:', err);
      return customs;
    }
  }, [onTranslateBatch]);

  // Visible "Translate N missing" button — replaces the previous
  // handler that just opened the Browse Library panel, which didn't
  // actually fix anything.  Now batches the missing-translation custom
  // words through onTranslateBatch and merges the results back into
  // selectedWords.
  const handleFixTranslations = useCallback(async () => {
    if (isBatchTranslating) return;
    const missing = customNeedingTranslation();
    if (missing.length === 0) return;
    setIsBatchTranslating(true);
    try {
      const filled = await runBatchTranslate(missing);
      const filledById = new Map(filled.map(w => [w.id, w]));
      const next = selectedWords.map(w => filledById.get(w.id) ?? w);
      onSelectedWordsChange(next);
      const filledCount = filled.filter(w => w.hebrew && w.arabic).length;
      if (filledCount > 0) {
        showToast?.(`Translated ${filledCount} words`, 'success');
      } else {
        showToast?.('Translation didn\'t return any results — try again', 'info');
      }
    } finally {
      setIsBatchTranslating(false);
    }
  }, [customNeedingTranslation, runBatchTranslate, selectedWords, onSelectedWordsChange, showToast, isBatchTranslating]);

  const handleConfirmOcr = useCallback((words: string[]) => {
    // Two-tier handling so multi-word phrases ("why don't you?",
    // "wonder if / whether", "ice cream") aren't silently dropped when
    // the curriculum doesn't contain them verbatim.
    //   Tier 1: exact curriculum match → reuse the canonical Word row.
    //   Tier 2: unmatched entries → synthesise a Custom Word so the
    //           phrase still lands on the assignment. Teacher can
    //           translate it later (or ai-translate runs on save).
    const matchedWords: Word[] = [];
    const unmatchedStrings: string[] = [];
    for (const w of words) {
      const trimmed = w.trim();
      if (!trimmed) continue;
      const hit = allWords.find(aw => aw.english.toLowerCase() === trimmed.toLowerCase());
      if (hit) matchedWords.push(hit);
      else unmatchedStrings.push(trimmed);
    }

    // Drop duplicates that are already in the selection.
    const existingIds = new Set(selectedWords.map(w => w.id));
    const existingEnglish = new Set(selectedWords.map(w => w.english.toLowerCase()));
    const newCurriculumWords = matchedWords.filter(w => !existingIds.has(w.id));

    // Synthesise Custom Word rows for unmatched entries. Negative IDs
    // follow the same convention used elsewhere in the app for
    // custom-added words (so they don't collide with real curriculum
    // IDs from vocabulary.ts).
    const now = Date.now();
    const customWords: Word[] = unmatchedStrings
      .filter(s => !existingEnglish.has(s.toLowerCase()))
      .map((s, i) => ({
        id: -(now + i),
        english: s,
        hebrew: '',
        arabic: '',
        level: 'Custom' as const,
      }));

    const totalAdded = newCurriculumWords.length + customWords.length;
    const newSelectedWords = [...selectedWords, ...newCurriculumWords, ...customWords];

    onSelectedWordsChange(newSelectedWords);
    // Reset everything so the next OCR run starts from a clean idle
    // state — was previously left in 'success' so reopening the modal
    // showed stale extracted words from the previous run.
    setOcrModalOpen(false);
    setOcrState('idle');
    setExtractedWords([]);
    setOcrErrorMessage(null);
    setOcrProgress(0);

    if (totalAdded === 0) {
      showToast?.('No new words to add — all items already selected.', 'info');
    } else if (customWords.length === 0) {
      showToast?.(`Added ${newCurriculumWords.length} curriculum words`, 'success');
    } else if (newCurriculumWords.length === 0) {
      showToast?.(`Added ${customWords.length} custom words / phrases`, 'success');
    } else {
      showToast?.(`Added ${newCurriculumWords.length} curriculum + ${customWords.length} custom`, 'success');
    }

    // On mobile the wizard scrolls past the viewport — without this the
    // newly added words land off-screen and the teacher sees only a
    // toast.  Set a flag instead of scrolling synchronously: the
    // selectedWordsRef target is conditionally rendered, so on first
    // OCR (selectedWords starts empty) a setTimeout would fire before
    // React commits and the ref would still be null.  The useEffect
    // below watches selectedWords.length and scrolls once the section
    // has actually mounted.
    if (totalAdded > 0) {
      setShouldScrollToSelected(true);
    }

    // Auto-translate the custom words in the background.  Curriculum
    // words already have hebrew + arabic from vocabulary.ts; only the
    // synthesized customs need a round trip to /api/translate.  This
    // means by the time the teacher scrolls to step 2, every word
    // they added has translations filled in — no per-card click,
    // no manual "translate" buttons.
    if (customWords.length > 0 && onTranslateBatch) {
      void runBatchTranslate(customWords).then(filled => {
        const filledById = new Map(filled.map(w => [w.id, w]));
        // Read the latest selectedWords from the ref — by the time
        // the translate resolves the teacher may have added more
        // words, and we don't want to clobber those with the stale
        // closure value.
        const latest = selectedWordsRefForBatch.current;
        const merged = latest.map(w => filledById.get(w.id) ?? w);
        onSelectedWordsChange(merged);
        const filledCount = filled.filter(w => w.hebrew && w.arabic).length;
        if (filledCount > 0) {
          showToast?.(`Auto-translated ${filledCount} new word${filledCount === 1 ? '' : 's'}`, 'success');
        }
      });
    }
  }, [allWords, selectedWords, onSelectedWordsChange, showToast, onTranslateBatch, runBatchTranslate]);

  // Add words from panels (Topic Packs, Saved Groups, Browse Library)
  const handleAddWords = useCallback((words: Word[]) => {
    const existingIds = new Set(selectedWords.map(w => w.id));
    const newWords = words.filter(w => !existingIds.has(w.id));
    if (newWords.length > 0) {
      onSelectedWordsChange([...selectedWords, ...newWords]);
      showToast?.(`Added ${newWords.length} words`, 'success');
      // Same trick as handleConfirmOcr — flag-based scroll via the
      // useEffect that waits for the section to mount.
      setShouldScrollToSelected(true);

      // Auto-translate any newly added custom words that are missing translations
      const customNeedingTranslation = newWords.filter(w =>
        w.level === 'Custom' && (!w.hebrew?.trim() || !w.arabic?.trim())
      );
      if (customNeedingTranslation.length > 0 && onTranslateBatch) {
        void runBatchTranslate(customNeedingTranslation).then(filled => {
          const filledById = new Map(filled.map(w => [w.id, w]));
          const latest = selectedWordsRefForBatch.current;
          const merged = latest.map(w => filledById.get(w.id) ?? w);
          onSelectedWordsChange(merged);
          const filledCount = filled.filter(w => w.hebrew && w.arabic).length;
          if (filledCount > 0) {
            showToast?.(`Auto-translated ${filledCount} word${filledCount === 1 ? '' : 's'}`, 'success');
          }
        });
      }
    } else {
      showToast?.('Those words are already selected', 'info');
    }
  }, [selectedWords, onSelectedWordsChange, showToast, onTranslateBatch, runBatchTranslate]);

  // Add AI-generated words
  const handleAddAiWords = useCallback((words: GeneratedWord[]) => {
    const existingIds = new Set(selectedWords.map(w => w.id));
    const existingEnglish = new Set(selectedWords.map(w => w.english.toLowerCase()));

    // Convert GeneratedWord[] to Word[]
    const now = Date.now();
    const wordsToAdd: Word[] = words
      .filter(w => !existingEnglish.has(w.english.toLowerCase()))
      .map((gw, i) => {
        // If it's a curriculum word, find the matching Word from allWords
        if (gw.isFromCurriculum && gw.curriculumId) {
          const curriculumWord = allWords.find(w => w.id === gw.curriculumId);
          if (curriculumWord) {
            return curriculumWord;
          }
        }
        // Otherwise create a custom word
        return {
          id: -(now + i),
          english: gw.english,
          hebrew: gw.hebrew,
          arabic: gw.arabic,
          level: 'Custom' as const,
        };
      })
      .filter(w => !existingIds.has(w.id));

    if (wordsToAdd.length > 0) {
      onSelectedWordsChange([...selectedWords, ...wordsToAdd]);
      showToast?.(`Added ${wordsToAdd.length} AI-generated words`, 'success');
      setShouldScrollToSelected(true);
    } else {
      showToast?.('All generated words are already in your list', 'info');
    }
  }, [allWords, selectedWords, onSelectedWordsChange, showToast]);

  // Remove a single word
  const handleRemoveWord = useCallback((wordId: number) => {
    onSelectedWordsChange(selectedWords.filter(w => w.id !== wordId));
  }, [selectedWords, onSelectedWordsChange]);

  // Fix missing translations
  // Edit translation handlers
  const handleEditWord = useCallback((word: WordWithStatus) => {
    setEditingWord(word);
    setEditModalOpen(true);
  }, []);

  const handleSaveTranslation = useCallback((wordId: number, hebrew: string, arabic: string, russian: string) => {
    // Update the selected words with new translations.  `hebrew` and
    // `arabic` fall back to '' (not undefined) because the Word type
    // requires them as strings — an empty field should render as "no
    // translation yet", not crash the downstream components that index
    // into word.hebrew / word.arabic without a guard.  Russian is an
    // optional field on Word, so undefined is fine there.
    const updatedWords = selectedWords.map(w =>
      w.id === wordId
        ? { ...w, hebrew: hebrew ?? '', arabic: arabic ?? '', russian: russian || undefined }
        : w
    );
    onSelectedWordsChange(updatedWords);
    showToast?.('Translations updated', 'success');
  }, [selectedWords, onSelectedWordsChange, showToast]);

  return (
    <div>
      {/* Hero Paste Area */}
      <HeroPasteArea onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

      {/* OR Separator */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-[var(--vb-border)]" />
        <span className="text-sm font-semibold text-[var(--vb-text-muted)] uppercase tracking-wider">
          {TEXT.or}
        </span>
        <div className="flex-1 h-px bg-[var(--vb-border)]" />
      </div>

      {/* Option Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 max-w-4xl mx-auto justify-items-center">
        <OptionCard
          emoji="🧩"
          title={TEXT.topicPacks}
          subtitle={`${topicPacks.length} ${TEXT.packs}`}
          ctaText={TEXT.view}
          gradient="from-emerald-300 to-teal-400"
          onClick={() => setOpenPanel('topic-packs')}
          delay={0}
        />
        <OptionCard
          emoji="💾"
          title={TEXT.savedGroups}
          subtitle={`${savedGroups.length} ${TEXT.groups}`}
          ctaText={TEXT.view}
          gradient="from-amber-300 to-orange-400"
          onClick={() => setOpenPanel('saved-groups')}
          delay={0.1}
        />
        {/* Browse Library card removed per teacher feedback — the
            full curriculum dump was overwhelming and teachers said
            they prefer pasting / topic-packs / saved-groups / OCR.
            The browse-library panel is still in the file (renderer +
            state) so we can re-enable it later if needed. */}
        <OptionCard
          emoji="📷"
          title={TEXT.ocr}
          subtitle={TEXT.ocrSubtitle}
          ctaText={TEXT.upload}
          gradient="from-rose-300 to-fuchsia-400"
          onClick={() => setOcrModalOpen(true)}
          delay={0.2}
          isNew
        />
        {/* AI Lesson Builder — Phase 1: Vocabulary Generator */}
        {onAiGenerateWords && (
          <OptionCard
            emoji="✨"
            title={TEXT.aiGenerate}
            subtitle={TEXT.aiGenerateSubtitle}
            ctaText={TEXT.aiGenerateCard}
            gradient="from-violet-400 to-purple-500"
            onClick={() => setAiModalOpen(true)}
            delay={0.3}
            isNew
          />
        )}
      </div>

      {/* Selected Words Section.  The ref-wrapper div is rendered
          UNCONDITIONALLY so post-add scrollIntoView() has a real DOM
          target even on the very first add (e.g. OCR is the first
          word source — selectedWords starts empty, so a conditional
          wrapper would mean the ref is null when handleConfirmOcr
          tries to scroll). */}
      <div ref={selectedWordsRef}>
      {selectedWords.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10"
        >
          {/* Status Banner with Clear All button */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-[var(--vb-text-secondary)]">
                {selectedWords.length} {TEXT.wordsSelected}
              </span>
            </div>
            <button
              onClick={() => onSelectedWordsChange([])}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
            >
              <Trash2 className="w-4 h-4" />
              <span>{TEXT.clearAll}</span>
            </button>
          </div>

          {/* Language Preference Selector */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-center gap-4 flex-wrap"
          >
            <span className="text-sm font-semibold text-[var(--vb-text-secondary)] flex items-center gap-2">
              <span>🌐</span> {TEXT.translationLang}:
            </span>
            <div className="flex gap-2 bg-[var(--vb-surface-alt)] rounded-xl p-1">
              <button
                onClick={() => setTranslationLang('both')}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  translationLang === 'both'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-[var(--vb-text-secondary)] hover:opacity-80'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                🇮🇱+🇸🇦 {TEXT.bothLang}
              </button>
              <button
                onClick={() => setTranslationLang('hebrew')}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  translationLang === 'hebrew'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-[var(--vb-text-secondary)] hover:opacity-80'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                🇮🇱 {TEXT.hebrewOnly}
              </button>
              <button
                onClick={() => setTranslationLang('arabic')}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  translationLang === 'arabic'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-[var(--vb-text-secondary)] hover:opacity-80'
                }`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
              >
                🇸🇦 {TEXT.arabicOnly}
              </button>
            </div>
          </motion.div>

          {/* Status Cards */}
          <StatusCards
            readyCount={readyCount}
            needsWorkCount={needsWorkCount}
            onFixClick={needsWorkCount > 0 ? handleFixTranslations : undefined}
            isTranslating={isBatchTranslating}
          />

          {/* Words Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {wordsWithStatus.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  translationLang={translationLang}
                  onRemove={() => handleRemoveWord(word.id)}
                  onEdit={() => handleEditWord(word)}
                  onQuickTranslate={async (w) => {
                    const result = await onTranslateWord?.(w.english);
                    if (result) {
                      // Update the selected words with the new translation
                      const updatedWords = selectedWords.map(sw =>
                        sw.id === w.id
                          ? { ...sw, hebrew: sw.hebrew || result.hebrew, arabic: sw.arabic || result.arabic, russian: result.russian }
                          : sw
                      );
                      onSelectedWordsChange(updatedWords);
                      showToast?.(`Translated "${w.english}"`, 'success');
                      return { hebrew: result.hebrew, arabic: result.arabic, russian: result.russian };
                    }
                    return null;
                  }}
                  isTranslating={false}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
        </>
      )}
      </div>

      {/* Continue Button — suppressed when WordPicker wraps this
          component for embedded use (Class Show / Worksheet builder
          have their own next-step buttons). */}
      {selectedWords.length > 0 && !hideContinueButton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <button
            onClick={onNext}
            type="button"
            className="w-full bg-gradient-to-r from-indigo-300 to-violet-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}
          >
            {TEXT.continue} →
          </button>
        </motion.div>
      )}

      {/* Edit Translation Modal */}
      <EditTranslationModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingWord(null);
        }}
        word={editingWord}
        translationLang={translationLang}
        onSave={handleSaveTranslation}
        onTranslate={onTranslateWord}
      />

      {/* Parent-level gallery file input — shared between OcrModal's
          Gallery button and InPageCamera's "Pick from gallery instead"
          fallback.  Reset-on-open via openGalleryPicker so picking the
          same file twice still fires onChange. */}
      <input
        ref={galleryInputRef}
        type="file"
        id="ocr-gallery-input"
        name="galleryImage"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleOcrUpload(file);
        }}
      />

      {/* OCR Modal */}
      <OcrModal
        isOpen={ocrModalOpen}
        onClose={() => {
          setOcrModalOpen(false);
          setOcrState('idle');
          setExtractedWords([]);
          setOcrErrorMessage(null);
        }}
        onUpload={handleOcrUpload}
        onOpenCamera={() => setCameraOpen(true)}
        onOpenGallery={openGalleryPicker}
        state={ocrState}
        progress={ocrProgress}
        extractedWords={extractedWords}
        onConfirm={handleConfirmOcr}
        onEditWord={handleEditOcrWord}
        errorMessage={ocrErrorMessage ?? undefined}
      />

      {/* In-page camera — getUserMedia stream rendered as a fullscreen
          modal.  When the teacher captures a frame, we feed the
          resulting JPEG File straight into handleOcrUpload — same
          shape as the gallery <input> path — so all downstream OCR
          logic stays unchanged. */}
      {cameraOpen && (
        <InPageCamera
          onCapture={(file) => {
            setCameraOpen(false);
            void handleOcrUpload(file);
          }}
          onCancel={() => setCameraOpen(false)}
          onUseGallery={openGalleryPicker}
        />
      )}

      {/* Topic Packs Panel */}
      <TopicPacksPanel
        isOpen={openPanel === 'topic-packs'}
        onClose={() => setOpenPanel(null)}
        topicPacks={topicPacks}
        allWords={allWords}
        selectedWords={selectedWords}
        onAddWords={handleAddWords}
      />

      {/* Saved Groups Panel */}
      <SavedGroupsPanel
        isOpen={openPanel === 'saved-groups'}
        onClose={() => setOpenPanel(null)}
        savedGroups={localSavedGroups}
        allWords={allWords}
        selectedWords={selectedWords}
        onAddWords={handleAddWords}
        onRenameGroup={onRenameSavedGroup}
        onDeleteGroup={onDeleteSavedGroup}
      />

      {/* Browse Library Panel */}
      <BrowseLibraryPanel
        isOpen={openPanel === 'browse-library'}
        onClose={() => setOpenPanel(null)}
        allWords={allWords}
        selectedWords={selectedWords}
        onAddWords={handleAddWords}
        onRemoveWord={handleRemoveWord}
      />

      {/* AI Vocabulary Modal */}
      <AiVocabularyModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onAddWords={handleAddAiWords}
        onGenerate={async (params) => {
          if (!onAiGenerateWords) {
            throw new Error('AI generation is not available');
          }
          return onAiGenerateWords(params);
        }}
        showToast={showToast}
      />
    </div>
  );
};

export default WordInputStep2026;
