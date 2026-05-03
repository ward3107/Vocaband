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
import { worksheetStrings } from '../../locales/student/worksheet';

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
  /** Add page break before this worksheet (for multi-sheet printouts) */
  pageBreakBefore?: boolean;
  /** Worksheet index for title display */
  sheetIndex?: number;
  /** Total number of sheets */
  totalSheets?: number;
  /** All selected sheet types for consolidated answer key */
  allSelectedSheetTypes?: WorksheetSheetType[];
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

function getSheetLabel(type: WorksheetSheetType, t: any): string {
  const labelMap: Record<WorksheetSheetType, keyof typeof t> = {
    'word-list': 'wordListLabel',
    'scramble': 'scrambleLabel',
    'fill-blank': 'fillBlankLabel',
    'match-up': 'matchUpLabel',
    'multiple-choice': 'multipleChoiceLabel',
    'reverse-translation': 'reverseTranslationLabel',
    'true-false': 'trueFalseLabel',
    'flashcards': 'flashcardsLabel',
    'matching': 'matchingLabel',
    'sentence-builder': 'sentenceBuilderLabel',
  };
  return t[labelMap[type]] || type;
}

export default function Worksheet({
  sheetType, title, words, className, includeAnswerKey, translationLang, aiSentences, pageBreakBefore = false,
  sheetIndex = 0, totalSheets = 1, allSelectedSheetTypes,
}: WorksheetProps) {
  const t = worksheetStrings[translationLang === 'he' ? 'he' : translationLang === 'ar' ? 'ar' : 'en'];
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
            {className && <span><strong>{t.classLabel}</strong> {className}</span>}
            <span><strong>{t.dateLabel}</strong> {date}</span>
            <span><strong>{t.nameLabel}</strong> ____________________</span>
          </div>
        </header>
      )}

      {/* Sheet type indicator when multiple sheets */}
      {totalSheets > 1 && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '8px', display: 'inline-block', fontWeight: 700, fontSize: '11pt', color: '#555' }}>
          {getSheetLabel(sheetType, t)}
        </div>
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

      {/* Compact Consolidated Answer Key - only on the last worksheet */}
      {includeAnswerKey && sheetIndex === totalSheets - 1 && (
        <div className="vb-print-page-break">
          <h2 style={{ fontSize: '18pt', fontWeight: 900, marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>{t.answerKey}</h2>

          {allSelectedSheetTypes && allSelectedSheetTypes.length > 0 ? (
            <div>
              {allSelectedSheetTypes.map((answerType) => (
                <div key={answerType} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '13pt', fontWeight: 700, marginBottom: '0.5rem', color: '#555' }}>{getSheetLabel(answerType, t)}</h3>
                  {answerType === 'word-list' || answerType === 'flashcards' ? null : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #999', backgroundColor: '#f5f5f5' }}>
                          <th style={{ textAlign: 'left', padding: '0.3rem', width: '5%' }}>{t.tableNumber}</th>
                          <th style={{ textAlign: 'left', padding: '0.3rem', width: '30%' }}>{t.tableWord}</th>
                          <th style={{ textAlign: 'left', padding: '0.3rem' }}>{t.tableAnswer}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {words.map((w, idx) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.3rem' }}>{idx + 1}</td>
                            <td style={{ padding: '0.3rem', fontWeight: 600 }}>{w.english}</td>
                            <td style={{ padding: '0.3rem', color: '#333' }}>
                                                              {answerType === 'scramble' && w.english}
                              {answerType === 'multiple-choice' && <span style={{ fontWeight: 700, color: '#10b981' }}>{t.answerOptionA}</span>}
                              {answerType === 'reverse-translation' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                              {answerType === 'true-false' && <span style={{ fontWeight: 700, color: '#10b981' }}>{t.answerTrueWithHint}</span>}
                              {answerType === 'fill-blank' && (aiSentences?.[w.id] ? <span style={{ fontSize: '9pt' }}>"...{w.english}..."</span> : w.english)}
                              {answerType === 'match-up' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                              {answerType === 'matching' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                              {answerType === 'sentence-builder' && (aiSentences?.[w.id] || <span>{t.answerCompleteSentence}</span>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Fallback for single worksheet - compact format */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #999', backgroundColor: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '0.3rem', width: '5%' }}>{t.tableNumber}</th>
                  <th style={{ textAlign: 'left', padding: '0.3rem', width: '30%' }}>{t.tableWord}</th>
                  <th style={{ textAlign: 'left', padding: '0.3rem' }}>{t.tableAnswer}</th>
                </tr>
              </thead>
              <tbody>
                {words.map((w, idx) => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.3rem' }}>{idx + 1}</td>
                    <td style={{ padding: '0.3rem', fontWeight: 600 }}>{w.english}</td>
                    <td style={{ padding: '0.3rem', color: '#333' }}>
                      {sheetType === 'scramble' && w.english}
                      {sheetType === 'multiple-choice' && <span style={{ fontWeight: 700, color: '#10b981' }}>{t.answerOptionA}</span>}
                      {sheetType === 'reverse-translation' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                      {sheetType === 'true-false' && <span style={{ fontWeight: 700, color: '#10b981' }}>{t.answerTrue}</span>}
                      {sheetType === 'fill-blank' && (aiSentences?.[w.id] || w.english)}
                      {sheetType === 'match-up' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                      {sheetType === 'matching' && <span dir="auto">{pickTranslation(w, translationLang)}</span>}
                      {sheetType === 'sentence-builder' && (aiSentences?.[w.id] || t.answerCompleteSentence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '9pt', color: '#666', textAlign: 'center' }}>
        {t.vocabandFooter}
      </footer>
    </div>
  );
}
