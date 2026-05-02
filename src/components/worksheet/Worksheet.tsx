/**
 * Worksheet — the print-only container that holds the chosen sheet
 * (Word list / Scramble / Fill-in-blank / Match-up) plus an optional
 * answer key.  It's hidden from screen rendering via .vb-print-only +
 * the @media rules in index.css, and only becomes visible during the
 * browser's print preview / PDF export.
 *
 * The teacher's on-screen flow is:
 *   1. Click "Print worksheet" on the dashboard or an assignment
 *   2. WorksheetSetup modal opens — pick sheet type + source + answer key
 *   3. WorksheetView mounts (foreground UI), renders a preview, and
 *      offers a "Print" button which calls window.print()
 *   4. Browser print dialog appears.  The visible UI is suppressed by
 *      `@media print { body * { visibility: hidden } .vb-print-only *
 *      { visibility: visible } }` so only the worksheet prints.
 */
import { WordListSheet } from './sheets/WordListSheet';
import { ScrambleSheet } from './sheets/ScrambleSheet';
import { FillBlankSheet } from './sheets/FillBlankSheet';
import { MatchUpSheet } from './sheets/MatchUpSheet';
import type { Word } from '../../data/vocabulary';

export type WorksheetSheetType = 'word-list' | 'scramble' | 'fill-blank' | 'match-up';

interface WorksheetProps {
  sheetType: WorksheetSheetType;
  title: string;
  words: Word[];
  className: string | null;
  includeAnswerKey: boolean;
  /** Translation language for the answer column / hint column. */
  translationLang: 'he' | 'ar' | 'en';
  /** AI-generated sentences keyed by word ID — for Fill-in-the-blank sheets */
  aiSentences?: Record<number, string>;
}

export default function Worksheet({
  sheetType, title, words, className, includeAnswerKey, translationLang, aiSentences,
}: WorksheetProps) {
  const date = new Date().toLocaleDateString();

  return (
    <div className="vb-print-only" lang={translationLang} dir={translationLang === 'en' ? 'ltr' : 'auto'}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 900, margin: 0 }}>{title}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '11pt' }}>
          {className && <span><strong>Class:</strong> {className}</span>}
          <span><strong>Date:</strong> {date}</span>
          <span><strong>Name:</strong> ____________________</span>
        </div>
      </header>

      {sheetType === 'word-list' && <WordListSheet words={words} translationLang={translationLang} />}
      {sheetType === 'scramble' && <ScrambleSheet words={words} translationLang={translationLang} />}
      {sheetType === 'fill-blank' && <FillBlankSheet words={words} aiSentences={aiSentences} />}
      {sheetType === 'match-up' && <MatchUpSheet words={words} translationLang={translationLang} />}

      {includeAnswerKey && sheetType !== 'word-list' && (
        <div className="vb-print-page-break">
          <h2 style={{ fontSize: '20pt', fontWeight: 900, marginBottom: '1rem' }}>Answer key</h2>
          {sheetType === 'scramble' && <ScrambleSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'fill-blank' && <FillBlankSheet words={words} answerKey aiSentences={aiSentences} />}
          {sheetType === 'match-up' && <MatchUpSheet words={words} translationLang={translationLang} answerKey />}
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '9pt', color: '#666', textAlign: 'center' }}>
        Vocaband · vocaband.com
      </footer>
    </div>
  );
}
