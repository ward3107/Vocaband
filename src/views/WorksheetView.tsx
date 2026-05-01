/**
 * WorksheetView — full-screen "build a printable worksheet" UI.
 *
 * On-screen the teacher sees:
 *   - Sheet type picker (4 cards: Word list / Scramble / Fill-blank / Match-up)
 *   - Word source picker (same shape as Class Show)
 *   - Title input + answer-key toggle
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
import { useState } from 'react';
import { motion } from 'motion/react';
import { Printer, FileText, Shuffle, Link2, BookOpen, ArrowLeft } from 'lucide-react';
import { useTeacherTheme } from '../hooks/useTeacherTheme';
import { useLanguage } from '../hooks/useLanguage';
import Worksheet, { type WorksheetSheetType } from '../components/worksheet/Worksheet';
import { WordListSheet } from '../components/worksheet/sheets/WordListSheet';
import { ScrambleSheet } from '../components/worksheet/sheets/ScrambleSheet';
import { FillBlankSheet } from '../components/worksheet/sheets/FillBlankSheet';
import { MatchUpSheet } from '../components/worksheet/sheets/MatchUpSheet';
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
}

const SHEET_TYPES: Array<{ id: WorksheetSheetType; label: string; description: string; icon: React.ReactNode; gradient: string }> = [
  { id: 'word-list',  label: 'Word list',         description: 'Bilingual reference sheet',         icon: <BookOpen size={26} />, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'scramble',   label: 'Scramble',          description: 'Unscramble each word',              icon: <Shuffle size={26} />,  gradient: 'from-orange-500 to-red-600' },
  { id: 'fill-blank', label: 'Fill in the blank', description: 'Sentences with missing words',     icon: <FileText size={26} />, gradient: 'from-indigo-500 to-violet-600' },
  { id: 'match-up',   label: 'Match-up',          description: 'Draw lines between English + translation', icon: <Link2 size={26} />, gradient: 'from-pink-500 to-rose-600' },
];

export default function WorksheetView({
  user, initialSources, initialSourceIndex = 0, initialTitle, className, onExit,
}: WorksheetViewProps) {
  useTeacherTheme(user?.teacherDashboardTheme);
  const { language } = useLanguage();
  const translationLang: 'he' | 'ar' | 'en' = language === 'he' ? 'he' : language === 'ar' ? 'ar' : 'he';

  const [sheetType, setSheetType] = useState<WorksheetSheetType>('word-list');
  const [sourceIdx, setSourceIdx] = useState(Math.max(0, Math.min(initialSourceIndex, initialSources.length - 1)));
  const [title, setTitle] = useState(initialTitle ?? 'Vocabulary worksheet');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [maxWords, setMaxWords] = useState(20);

  const source = initialSources[sourceIdx];
  const wordsForSheet = (source?.words ?? []).slice(0, maxWords);

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
              Pick a sheet, set the title, hit Print.
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

        {/* Word source */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            Word source
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {initialSources.map((s, idx) => {
              const selected = idx === sourceIdx;
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
                  <div className="font-bold text-sm">{s.label}</div>
                  {s.description && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>
                      {s.description} · {s.words.length} words
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title + word count + answer key */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
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
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--vb-text-muted)' }}>
              Words on sheet
            </label>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxWords(n)}
                  style={{
                    backgroundColor: maxWords === n ? 'var(--vb-accent)' : 'var(--vb-surface)',
                    color: maxWords === n ? 'var(--vb-accent-text)' : 'var(--vb-text-primary)',
                    borderColor: maxWords === n ? 'var(--vb-accent)' : 'var(--vb-border)',
                  }}
                  className="flex-1 px-3 py-3 rounded-xl border-2 font-bold transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
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
            {sheetType === 'fill-blank' && <FillBlankSheet words={wordsForSheet} />}
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
      />
    </div>
  );
}
