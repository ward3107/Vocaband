/**
 * WorksheetView — full-screen "build a printable worksheet" UI.
 *
 * On-screen the teacher sees:
 *   - Sheet type picker (multiple worksheet types in a grid)
 *   - Word source picker (same shape as Class Show)
 *   - Title input + answer-key toggle
 *   - AI sentence generation for sentence-based sheets
 *   - "Print" button → calls window.print()
 *
 * Below the controls, a live preview of the selected sheet renders
 * INSIDE a `.vb-print-only` container.  On screen the container is
 * hidden by `@media screen { .vb-print-only { display: none } }`.  We
 * mirror it into a visible "preview" wrapper so the teacher can see
 * what they're about to print without flipping into a print dialog.
 *
 * When the teacher hits Print, the `@media print` rules kick in:
 * everything except `.vb-print-only` is suppressed and the worksheet
 * is the only thing on the page.
 */
import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, FileText, Shuffle, Link2, BookOpen, ArrowLeft, Wand2, Sparkles, Loader2, Check } from 'lucide-react';
import { useTeacherTheme } from '../hooks/useTeacherTheme';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../core/supabase';
import Worksheet, { type WorksheetSheetType } from '../components/worksheet/Worksheet';
import { WordListSheet } from '../components/worksheet/sheets/WordListSheet';
import { ScrambleSheet } from '../components/worksheet/sheets/ScrambleSheet';
import { FillBlankSheet } from '../components/worksheet/sheets/FillBlankSheet';
import { MatchUpSheet } from '../components/worksheet/sheets/MatchUpSheet';
import WordPicker from '../components/setup/WordPicker';
import type { ClassShowWordPickerWiring } from '../components/classshow/ClassShowSetup';
import type { Word } from '../data/vocabulary';
import type { AppUser } from '../core/supabase';

interface WorksheetViewProps {
  user: AppUser | null;
  initialSources: Array<{ label: string; description?: string; words: Word[] }>;
  initialSourceIndex?: number;
  /** Pre-fill from an assignment (sets the title to assignment name). */
  initialTitle?: string;
  /** Class name for the printed header (optional). */
  className?: string | null;
  onExit: () => void;
  /** Wiring for the embedded WordPicker (paste / OCR / topic packs).
   *  Reuses the same shape as Class Show — see ClassShowSetup. */
  pickerWiring?: ClassShowWordPickerWiring;
}

// Enhanced worksheet types with more options
const SHEET_TYPES: Array<{ id: WorksheetSheetType; label: string; description: string; icon: React.ReactNode; gradient: string; needsSentences?: boolean }> = [
  { id: 'word-list',  label: 'Word List',        description: 'Bilingual reference sheet',        icon: <BookOpen size={26} />,    gradient: 'from-emerald-300 to-teal-400', needsSentences: false },
  { id: 'scramble',   label: 'Scramble',         description: 'Unscramble each word',            icon: <Shuffle size={26} />,     gradient: 'from-orange-300 to-red-400', needsSentences: false },
  { id: 'fill-blank', label: 'Fill in the Blank', description: 'Sentences with missing words',   icon: <FileText size={26} />,     gradient: 'from-indigo-300 to-violet-400', needsSentences: true },
  { id: 'match-up',   label: 'Match-up',         description: 'Connect word to translation',    icon: <Link2 size={26} />,       gradient: 'from-pink-300 to-rose-400', needsSentences: false },
];

export default function WorksheetView({
  user, initialSources, initialSourceIndex = 0, initialTitle, className, onExit, pickerWiring,
}: WorksheetViewProps) {
  useTeacherTheme(user?.teacherDashboardTheme);
  const { language } = useLanguage();
  const translationLang: 'he' | 'ar' | 'en' = language === 'he' ? 'he' : language === 'ar' ? 'ar' : 'he';

  const [sheetType, setSheetType] = useState<WorksheetSheetType>('word-list');
  const [title, setTitle] = useState(initialTitle ?? 'Vocabulary worksheet');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);

  // AI sentence generation state
  const [aiSentences, setAiSentences] = useState<Record<number, string>>({});
  const [isGeneratingSentences, setIsGeneratingSentences] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Check AI availability
  useEffect(() => {
    const checkAI = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAiEnabled(data.aiSentences === true);
      } catch {
        setAiEnabled(false);
      }
    };
    checkAI();
  }, []);

  // Custom-words state for the embedded WordPicker.  When non-empty,
  // a synthetic "My custom selection" source is prepended.
  const [customWords, setCustomWords] = useState<Word[]>([]);
  const [customWordsCustomTier, setCustomWordsCustomTier] = useState<Word[]>([]);

  const effectiveSources = useMemo(() => {
    if (customWords.length === 0) return initialSources;
    return [
      { label: 'My custom selection', description: 'Built with paste / OCR / packs', words: customWords },
      ...initialSources,
    ];
  }, [customWords, initialSources]);

  const [sourceIdx, setSourceIdx] = useState(() =>
    Math.max(0, Math.min(initialSourceIndex, initialSources.length - 1)),
  );

  const source = effectiveSources[Math.min(sourceIdx, effectiveSources.length - 1)];
  const wordsForSheet = source?.words ?? [];

  // Clear AI sentences when word source changes
  useEffect(() => {
    setAiSentences({});
  }, [sourceIdx]);

  // Generate AI sentences for selected words (defined after wordsForSheet is available)
  const generateSentences = async () => {
    if (wordsForSheet.length === 0) return;
    setIsGeneratingSentences(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No auth token');
      const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
      const words = wordsForSheet.map(w => w.english).filter(Boolean);
      const res = await fetch(`${apiUrl}/api/generate-sentences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ words, difficulty: 2 }),
      });
      if (!res.ok) throw new Error('Failed to generate sentences');
      const { sentences } = await res.json();
      // Map sentences back to words by index
      const newSentences: Record<number, string> = {};
      wordsForSheet.forEach((word, idx) => {
        if (sentences[idx]) {
          newSentences[word.id] = sentences[idx];
        }
      });
      setAiSentences(newSentences);
    } catch (err) {
      console.error('[Worksheet] AI sentence generation failed:', err);
    } finally {
      setIsGeneratingSentences(false);
    }
  };

  const handleCustomWordsChange = (next: Word[]) => {
    const wasEmpty = customWords.length === 0;
    setCustomWords(next);
    if (wasEmpty && next.length > 0) {
      setSourceIdx(0); // jump to "My custom selection"
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
        className="max-w-5xl mx-auto rounded-3xl border shadow-2xl p-6 sm:p-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black mb-1" style={{ color: 'var(--vb-text-primary)' }}>
              Print worksheet
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--vb-text-secondary)' }}>
              Pick words, choose a sheet type, hit Print.
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-secondary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="px-4 py-2 rounded-xl border-2 inline-flex items-center gap-2 hover:opacity-90"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Word source */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            Word source
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
                      {s.description} · {s.words.length} words
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Build custom list — embedded WordPicker. */}
          {pickerWiring && (
            <div className="mt-4 p-4 rounded-xl border-2" style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}>
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

        {/* Sheet type picker */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            Sheet type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SHEET_TYPES.map(s => {
              const selected = sheetType === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSheetType(s.id)}
                  style={{
                    borderColor: selected ? 'var(--vb-accent)' : 'transparent',
                  }}
                  className={`relative bg-gradient-to-br ${s.gradient} text-white rounded-2xl p-4 flex flex-col items-start gap-2 border-2 text-left transition-transform ${selected ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'}`}
                >
                  {s.icon}
                  <div className="font-black">{s.label}</div>
                  <div className="text-xs opacity-90">{s.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Sentence Generation — shown only for sentence-based sheets */}
        {sheetType !== 'word-list' && sheetType !== 'scramble' && sheetType !== 'match-up' && (
          <div className="mb-8">
            <div className="flex items-center justify-between p-4 rounded-2xl border-2" style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}>
              <div className="flex items-center gap-3">
                {isGeneratingSentences ? (
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--vb-accent)' }} />
                ) : Object.keys(aiSentences).length > 0 ? (
                  <Check size={20} style={{ color: '#10b981' }} />
                ) : (
                  <Sparkles size={20} style={{ color: 'var(--vb-accent)' }} />
                )}
                <div>
                  <div className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>
                    AI Sentence Generation
                  </div>
                  <div className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>
                    {isGeneratingSentences
                      ? 'Generating sentences...'
                      : Object.keys(aiSentences).length > 0
                      ? `${Object.keys(aiSentences).length} sentences generated`
                      : 'Generate example sentences for your worksheet'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={generateSentences}
                disabled={!aiEnabled || isGeneratingSentences || wordsForSheet.length === 0}
                style={{
                  backgroundColor: aiEnabled ? 'var(--vb-accent)' : 'var(--vb-surface-alt)',
                  color: aiEnabled ? 'var(--vb-accent-text)' : 'var(--vb-text-muted)',
                }}
                className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {isGeneratingSentences ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : Object.keys(aiSentences).length > 0 ? (
                  <>
                    <Sparkles size={16} />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Sentences
                  </>
                )}
              </button>
            </div>
            {!aiEnabled && (
              <div className="mt-2 text-xs" style={{ color: 'var(--vb-text-muted)' }}>
                AI features are not available. Please contact support to enable.
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="mb-8">
          <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--vb-text-muted)' }}>
            Worksheet title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            style={{
              borderColor: 'var(--vb-border)',
              color: 'var(--vb-text-primary)',
              backgroundColor: 'var(--vb-surface)',
            }}
            className="w-full px-4 py-3 rounded-xl border-2 outline-none font-bold"
          />
        </div>

        {sheetType !== 'word-list' && (
          <label className="flex items-center gap-3 mb-8 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              className="w-5 h-5 accent-current"
              style={{ accentColor: 'var(--vb-accent)' }}
            />
            <span className="font-bold" style={{ color: 'var(--vb-text-primary)' }}>
              Include answer key (separate page)
            </span>
          </label>
        )}

        {/* Preview */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            Preview
          </h2>
          <div
            className="rounded-2xl border-2 p-4 sm:p-6 max-h-[480px] overflow-y-auto"
            style={{
              backgroundColor: '#ffffff',
              borderColor: 'var(--vb-border)',
              color: '#000',
            }}
          >
            <h3 style={{ fontSize: '20pt', fontWeight: 900, margin: 0, marginBottom: '0.5rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
              {title}
            </h3>
            {sheetType === 'word-list' && <WordListSheet words={wordsForSheet} translationLang={translationLang} />}
            {sheetType === 'scramble' && <ScrambleSheet words={wordsForSheet} translationLang={translationLang} />}
            {sheetType === 'fill-blank' && <FillBlankSheet words={wordsForSheet} aiSentences={aiSentences} />}
            {sheetType === 'match-up' && <MatchUpSheet words={wordsForSheet} translationLang={translationLang} />}
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={wordsForSheet.length === 0}
            style={{
              backgroundColor: 'var(--vb-accent)',
              color: 'var(--vb-accent-text)',
            }}
            className="px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={20} />
            Print
          </button>
        </div>
      </motion.div>

      {/* The actual print-only worksheet — invisible on screen but
          materialised so window.print() has something to lay out. */}
      <Worksheet
        sheetType={sheetType}
        title={title}
        words={wordsForSheet}
        className={className ?? null}
        includeAnswerKey={includeAnswerKey}
        translationLang={translationLang}
        aiSentences={aiSentences}
      />
    </div>
  );
}
