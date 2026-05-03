/**
 * Worksheet — the print-only container that holds the chosen sheet
 * plus an optional answer key.  It's hidden from screen rendering via
 * .vb-print-only + the @media rules in index.css, and only becomes
 * visible during the browser's print preview / PDF export.
 *
 * Page-flow philosophy (changed 2026-05):
 * Earlier versions forced `page-break-before: always` between every
 * sheet AND before every answer key.  Result: a teacher who picked
 * 5 modes for 2 words got a 10-page PDF — every sheet pinned to its
 * own page even when 3 of them would have fit comfortably together.
 *
 * The current behaviour is "let the browser flow naturally":
 *   - Sheets stack on the same page until they don't fit
 *   - Each sheet body is `break-inside: avoid` so a sheet doesn't
 *     get torn in half
 *   - A visible separator (top border + spacing) between sheets so
 *     the teacher / student can still see where one ends
 *   - Answer key flows below the sheet by default; opt-in
 *     `answerKeyOnNewPage` prop forces it to a separate page for
 *     teachers who want to hand out questions without the answers
 *
 * The teacher can still force per-sheet pages via the
 * `forcePageBreak` prop — wired to a checkbox in WorksheetView.
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
import { MultipleChoiceSheet } from './sheets/MultipleChoiceSheet';
import { ReverseTranslationSheet } from './sheets/ReverseTranslationSheet';
import { TrueFalseSheet } from './sheets/TrueFalseSheet';
import { FlashcardsSheet } from './sheets/FlashcardsSheet';
import { MatchingSheet } from './sheets/MatchingSheet';
import { SentenceBuilderSheet } from './sheets/SentenceBuilderSheet';
import type { Word } from '../../data/vocabulary';

export type WorksheetSheetType =
  | 'word-list'
  | 'scramble'
  | 'fill-blank'
  | 'match-up'
  | 'multiple-choice'
  | 'reverse-translation'
  | 'true-false'
  | 'flashcards'
  | 'matching'
  | 'sentence-builder';

interface WorksheetProps {
  sheetType: WorksheetSheetType;
  title?: string; // Optional for subsequent sheets when printing multiple
  /** Short label printed above each sheet when multiple sheets share
   *  a page (e.g. "Scramble", "Fill in the Blank"), so the student
   *  / teacher can tell where one exercise ends and the next begins.
   *  Omit when the sheet stands alone. */
  sectionLabel?: string;
  /** True for any sheet other than the first, so we render a small
   *  divider above it.  Doesn't force a page break — that's the
   *  whole point of the compact layout. */
  showSeparator?: boolean;
  words: Word[];
  className: string | null;
  includeAnswerKey: boolean;
  /** Translation language for the answer column / hint column. */
  translationLang: 'he' | 'ar' | 'en';
  /** AI-generated sentences keyed by word ID — for Fill-in-the-blank and Sentence Builder sheets */
  aiSentences?: Record<number, string>;
  /** Force this sheet onto a new page.  Default false — sheets flow
   *  naturally and only break when they don't fit.  Set true via the
   *  WorksheetView "Each sheet on its own page" toggle when teachers
   *  explicitly want one-per-page output (e.g. for laminating). */
  forcePageBreak?: boolean;
  /** Force the answer key onto a new page.  Default false — key
   *  follows the questions inline.  Teachers handing out paper
   *  worksheets without the answers should set this true. */
  answerKeyOnNewPage?: boolean;
}

export default function Worksheet({
  sheetType, title, sectionLabel, showSeparator = false,
  words, className, includeAnswerKey, translationLang, aiSentences,
  forcePageBreak = false, answerKeyOnNewPage = false,
}: WorksheetProps) {
  const date = new Date().toLocaleDateString();

  // Outer wrapper — only forces a page break when the caller
  // explicitly asks.  `vb-print-avoid-break` keeps a single sheet
  // from being torn in half across two pages (questions stay
  // together with their numbering).
  const outerClass = [
    'vb-print-only',
    'vb-print-avoid-break',
    forcePageBreak ? 'vb-print-page-break-before' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={outerClass} lang={translationLang} dir={translationLang === 'en' ? 'ltr' : 'auto'}>
      {/* Visual divider for the second-and-onward sheets when no
          forced page break — gives the reader a clear "next exercise
          starts here" signal without consuming an entire page. */}
      {showSeparator && !forcePageBreak && !title && (
        <div style={{ marginTop: '2rem', marginBottom: '1.25rem', borderTop: '1.5px dashed #888' }} />
      )}

      {title && (
        <header style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '24pt', fontWeight: 900, margin: 0 }}>{title}</h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '11pt' }}>
            {className && <span><strong>Class:</strong> {className}</span>}
            <span><strong>Date:</strong> {date}</span>
            <span><strong>Name:</strong> ____________________</span>
          </div>
        </header>
      )}

      {/* Section label printed above each sheet when multiple sheets
          share output — so even on one page the reader knows which
          exercise they're on.  Hidden for single-sheet output. */}
      {sectionLabel && (
        <h2 style={{ fontSize: '14pt', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#333' }}>
          {sectionLabel}
        </h2>
      )}

      {sheetType === 'word-list' && <WordListSheet words={words} translationLang={translationLang} />}
      {sheetType === 'scramble' && <ScrambleSheet words={words} translationLang={translationLang} />}
      {sheetType === 'fill-blank' && <FillBlankSheet words={words} aiSentences={aiSentences} />}
      {sheetType === 'match-up' && <MatchUpSheet words={words} translationLang={translationLang} />}
      {sheetType === 'multiple-choice' && <MultipleChoiceSheet words={words} translationLang={translationLang} />}
      {sheetType === 'reverse-translation' && <ReverseTranslationSheet words={words} translationLang={translationLang} />}
      {sheetType === 'true-false' && <TrueFalseSheet words={words} translationLang={translationLang} />}
      {sheetType === 'flashcards' && <FlashcardsSheet words={words} translationLang={translationLang} />}
      {sheetType === 'matching' && <MatchingSheet words={words} translationLang={translationLang} />}
      {sheetType === 'sentence-builder' && <SentenceBuilderSheet words={words} translationLang={translationLang} aiSentences={aiSentences} />}

      {includeAnswerKey && sheetType !== 'word-list' && sheetType !== 'flashcards' && (
        <div
          className={['vb-print-avoid-break', answerKeyOnNewPage ? 'vb-print-page-break' : ''].filter(Boolean).join(' ')}
          style={{ marginTop: answerKeyOnNewPage ? 0 : '1.5rem' }}
        >
          <h2 style={{ fontSize: '16pt', fontWeight: 900, marginBottom: '0.75rem' }}>
            {sectionLabel ? `Answer key — ${sectionLabel}` : 'Answer key'}
          </h2>
          {sheetType === 'scramble' && <ScrambleSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'fill-blank' && <FillBlankSheet words={words} answerKey aiSentences={aiSentences} />}
          {sheetType === 'match-up' && <MatchUpSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'multiple-choice' && <MultipleChoiceSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'reverse-translation' && <ReverseTranslationSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'true-false' && <TrueFalseSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'matching' && <MatchingSheet words={words} translationLang={translationLang} answerKey />}
          {sheetType === 'sentence-builder' && <SentenceBuilderSheet words={words} translationLang={translationLang} answerKey aiSentences={aiSentences} />}
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '9pt', color: '#666', textAlign: 'center' }}>
        Vocaband · vocaband.com
      </footer>
    </div>
  );
}
