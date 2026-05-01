/**
 * ClassShowSetup — pre-show panel where the teacher picks the mode,
 * the word source, and the question count.
 *
 * Word-source picker supports two paths:
 *   1. Quick-pick a Set (1/2/3) or a pre-filled assignment.  Same as
 *      before — radio-style buttons at the top.
 *   2. Build a custom word list using the same picker the assignment
 *      wizard uses (paste, OCR, topic packs, saved groups).  When the
 *      teacher adds at least one word via the picker, a "My custom
 *      selection (N words)" option appears at the top of the source
 *      list and is auto-selected.
 *
 * The custom-list path runs through `WordPicker` (a thin wrapper
 * around the assignment wizard's WordInputStep2026) so any feature
 * added there — translation, OCR, AI batch, saved groups — is
 * automatically available in Class Show too.
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Layers, Headphones, ArrowLeftRight, FileText, CheckCircle, Sparkles, Play,
  Keyboard, Shuffle, AudioLines, Link2, Grid3x3, Puzzle, ChevronDown, ChevronUp, Wand2,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings, type ClassShowStrings } from '../../locales/student/class-show';
import type { Word } from '../../data/vocabulary';
import WordPicker from '../setup/WordPicker';

export type ClassShowMode =
  | 'classic'
  | 'listening'
  | 'reverse'
  | 'fill-blank'
  | 'true-false'
  | 'flashcards'
  | 'spelling'
  | 'scramble'
  | 'letter-sounds'
  | 'matching'
  | 'memory-flip'
  | 'sentence-builder';

export interface ClassShowWordSource {
  /** Stable label shown in the picker. */
  label: string;
  /** "From assignment" when pre-filled, otherwise the set name. */
  description?: string;
  words: Word[];
}

/** Subset of WordPicker's props the parent must wire from App.tsx so
 *  the embedded picker has the data + callbacks it needs. */
export interface ClassShowWordPickerWiring {
  allWords: Word[];
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string; russian?: string; match: number } | null>;
  onTranslateBatch?: (words: string[]) => Promise<Map<string, { hebrew: string; arabic: string; match: number }>>;
  onOcrUpload?: (file: File) => Promise<{ words: string[]; success?: boolean }>;
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  savedGroups?: Array<{ id: string; name: string; words: number[] }>;
  onRenameSavedGroup?: (id: string, newName: string) => Promise<boolean>;
  onDeleteSavedGroup?: (id: string) => Promise<boolean>;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface ClassShowSetupProps {
  availableSources: ClassShowWordSource[];
  initialSourceIndex: number;
  onStart: (config: { mode: ClassShowMode; source: ClassShowWordSource; questionCount: number }) => void;
  onCancel: () => void;
  /** Wiring for the embedded WordPicker.  When omitted, the Build
   *  Custom List section is hidden and the teacher can only pick
   *  from `availableSources` (legacy behavior). */
  pickerWiring?: ClassShowWordPickerWiring;
}

const MODES: Array<{ id: ClassShowMode; nameKey: keyof ClassShowStrings; icon: React.ReactNode; gradient: string }> = [
  { id: 'classic',          nameKey: 'modeClassic',         icon: <Layers size={26} />,         gradient: 'from-indigo-500 to-violet-600' },
  { id: 'listening',        nameKey: 'modeListening',       icon: <Headphones size={26} />,     gradient: 'from-sky-500 to-cyan-600' },
  { id: 'reverse',          nameKey: 'modeReverse',         icon: <ArrowLeftRight size={26} />, gradient: 'from-amber-500 to-orange-600' },
  { id: 'fill-blank',       nameKey: 'modeFillBlank',       icon: <FileText size={26} />,       gradient: 'from-emerald-500 to-teal-600' },
  { id: 'true-false',       nameKey: 'modeTrueFalse',       icon: <CheckCircle size={26} />,    gradient: 'from-rose-500 to-pink-600' },
  { id: 'flashcards',       nameKey: 'modeFlashcards',      icon: <Sparkles size={26} />,       gradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'spelling',         nameKey: 'modeSpelling',        icon: <Keyboard size={26} />,       gradient: 'from-blue-500 to-indigo-600' },
  { id: 'scramble',         nameKey: 'modeScramble',        icon: <Shuffle size={26} />,        gradient: 'from-orange-500 to-red-600' },
  { id: 'letter-sounds',    nameKey: 'modeLetterSounds',    icon: <AudioLines size={26} />,     gradient: 'from-cyan-500 to-blue-600' },
  { id: 'matching',         nameKey: 'modeMatching',        icon: <Link2 size={26} />,          gradient: 'from-pink-500 to-rose-600' },
  { id: 'memory-flip',      nameKey: 'modeMemoryFlip',      icon: <Grid3x3 size={26} />,        gradient: 'from-violet-500 to-purple-600' },
  { id: 'sentence-builder', nameKey: 'modeSentenceBuilder', icon: <Puzzle size={26} />,         gradient: 'from-teal-500 to-emerald-600' },
];

const COUNT_OPTIONS = [10, 20, 30, 50];

export default function ClassShowSetup({ availableSources, initialSourceIndex, onStart, onCancel, pickerWiring }: ClassShowSetupProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  const [mode, setMode] = useState<ClassShowMode>('classic');
  const [count, setCount] = useState(20);

  // Custom-words state — built up by the embedded WordPicker.  When
  // non-empty, a synthetic "My custom selection" source is prepended
  // to the available-sources list and auto-selected.
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [customWordsCustomTier, setCustomWordsCustomTier] = useState<Word[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Effective source list = (custom selection if any) + real sources.
  const effectiveSources = useMemo<ClassShowWordSource[]>(() => {
    if (customWords.length === 0) return availableSources;
    const customSource: ClassShowWordSource = {
      label: 'My custom selection',
      description: 'Built with paste / OCR / packs',
      words: customWords,
    };
    return [customSource, ...availableSources];
  }, [availableSources, customWords]);

  // sourceIdx is an index into effectiveSources (which shifts as the
  // custom source appears/disappears at index 0).
  const [sourceIdx, setSourceIdx] = useState(() =>
    Math.max(0, Math.min(initialSourceIndex, availableSources.length - 1)),
  );

  const realSelectedSource =
    effectiveSources[Math.min(sourceIdx, effectiveSources.length - 1)] ?? null;

  const maxCount = realSelectedSource?.words.length ?? 0;
  const effectiveCount = Math.min(count, maxCount);

  const canStart = !!realSelectedSource && realSelectedSource.words.length > 0;

  const handleCustomWordsChange = (next: Word[]) => {
    const wasEmpty = customWords.length === 0;
    setCustomWords(next);
    if (wasEmpty && next.length > 0) {
      setSourceIdx(0); // jump to "My custom selection"
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
        className="w-full max-w-3xl rounded-3xl border shadow-2xl p-6 sm:p-10"
      >
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: 'var(--vb-text-primary)' }}>
            {t.classShow}
          </h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--vb-text-secondary)' }}>
            {t.projectToClass}
          </p>
        </div>

        {/* Mode picker */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.pickMode}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MODES.map(m => {
              const selected = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  style={{
                    touchAction: 'manipulation',
                    borderColor: selected ? 'var(--vb-accent)' : 'transparent',
                  }}
                  className={`relative bg-gradient-to-br ${m.gradient} text-white rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-transform ${selected ? 'scale-[1.03] shadow-lg' : 'hover:scale-[1.02]'}`}
                >
                  {m.icon}
                  <span className="text-sm font-black">{t[m.nameKey] as string}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Word source picker */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.pickWordSource}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {effectiveSources.map((s, idx) => {
              const selected = idx === sourceIdx;
              const isCustom = customWords.length > 0 && idx === 0;
              return (
                <button
                  key={`${s.label}-${idx}`}
                  type="button"
                  onClick={() => setSourceIdx(idx)}
                  style={{
                    touchAction: 'manipulation',
                    backgroundColor: selected ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                    borderColor: selected ? 'var(--vb-accent)' : 'var(--vb-border)',
                    color: 'var(--vb-text-primary)',
                  }}
                  className="text-left px-4 py-3 rounded-xl border-2 transition-colors"
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    {isCustom && <Wand2 size={14} style={{ color: 'var(--vb-accent)' }} />}
                    {s.label}
                  </div>
                  {s.description && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>
                      {s.description} · {s.words.length} word{s.words.length === 1 ? '' : 's'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Build custom list — embedded WordPicker.  Only available
              when the parent provided picker wiring (allWords + callbacks). */}
          {pickerWiring && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPickerOpen(o => !o)}
                style={{
                  touchAction: 'manipulation',
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-primary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="w-full px-4 py-3 rounded-xl border-2 inline-flex items-center justify-between font-bold text-sm transition-colors hover:opacity-90"
              >
                <span className="inline-flex items-center gap-2">
                  <Wand2 size={16} style={{ color: 'var(--vb-accent)' }} />
                  Build a custom list (paste, OCR, topic packs, saved groups)
                </span>
                {pickerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {pickerOpen && (
                <div
                  className="mt-3 p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: 'var(--vb-surface-alt)',
                    borderColor: 'var(--vb-border)',
                  }}
                >
                  <WordPicker
                    allWords={pickerWiring.allWords}
                    selectedWords={customWords}
                    onSelectedWordsChange={handleCustomWordsChange}
                    onTranslateWord={pickerWiring.onTranslateWord}
                    onTranslateBatch={pickerWiring.onTranslateBatch}
                    onOcrUpload={pickerWiring.onOcrUpload}
                    showToast={pickerWiring.showToast}
                    topicPacks={pickerWiring.topicPacks}
                    savedGroups={pickerWiring.savedGroups}
                    onRenameSavedGroup={pickerWiring.onRenameSavedGroup}
                    onDeleteSavedGroup={pickerWiring.onDeleteSavedGroup}
                    customWords={customWordsCustomTier}
                    onCustomWordsChange={setCustomWordsCustomTier}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question count */}
        <div className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.questionCount}
          </h2>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map(c => {
              const selected = count === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  style={{
                    backgroundColor: selected ? 'var(--vb-accent)' : 'var(--vb-surface)',
                    color: selected ? 'var(--vb-accent-text)' : 'var(--vb-text-primary)',
                    borderColor: selected ? 'var(--vb-accent)' : 'var(--vb-border)',
                  }}
                  className="px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors"
                >
                  {c}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCount(Number.MAX_SAFE_INTEGER)}
              style={{
                backgroundColor: count >= maxCount ? 'var(--vb-accent)' : 'var(--vb-surface)',
                color: count >= maxCount ? 'var(--vb-accent-text)' : 'var(--vb-text-primary)',
                borderColor: count >= maxCount ? 'var(--vb-accent)' : 'var(--vb-border)',
              }}
              className="px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors"
            >
              {t.questionCountAll}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-secondary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="flex-1 sm:flex-none px-6 py-4 rounded-2xl font-bold border-2 transition-colors hover:opacity-90"
          >
            {t.backToDashboard}
          </button>
          <button
            type="button"
            onClick={() => canStart && realSelectedSource && onStart({ mode, source: realSelectedSource, questionCount: effectiveCount })}
            disabled={!canStart}
            style={{
              backgroundColor: canStart ? 'var(--vb-accent)' : 'var(--vb-surface-alt)',
              color: canStart ? 'var(--vb-accent-text)' : 'var(--vb-text-muted)',
            }}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed"
          >
            <Play size={20} />
            {t.startShow}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
