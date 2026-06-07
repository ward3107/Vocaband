// In-app preview + print of a Vocabagrut practice paper.
//
// Why this exists: the "Preview" button used to be a no-op stub, and the
// only way to see the paper was the jsPDF export — which can silently fail
// to download on iOS Safari. So we render the paper as HTML and print it via
// the browser's native print-to-PDF (reliable on desktop AND mobile).
//
// PRINTING — print-stack pattern (same as WorksheetView):
//   The app's global @media print rule in src/index.css hides every body
//   child EXCEPT `.vb-print-stack` / `.vb-print-only`. So the printable paper
//   is portaled to <body> as a `.vb-print-stack`; window.print() then prints
//   only it. (An earlier `body *{visibility:hidden}` toggle inside this modal
//   did NOT work: the modal lives inside #root, which the global rule sets to
//   `display:none`, and visibility can't override an ancestor's display:none
//   — so every export came out blank.)
//
// The on-screen modal shows the SAME <BagrutPaper> so "what you preview is
// what you print".

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import type { BagrutTest } from '../types';
import { MODULE_SPECS } from '../lib/moduleMap';
import { sanitizeTitle } from '../lib/sanitizeTitle';
import { useLanguage } from '../../../hooks/useLanguage';
import { vocabagrutT, type VocabagrutStrings } from '../../../locales/teacher/vocabagrut';

interface Props {
  test: BagrutTest;
  withAnswerKey: boolean;
  onClose: () => void;
  /** Open straight into the browser print dialog (the "Export PDF" path).
   *  Print-to-PDF is the reliable cross-device export — jsPDF's download
   *  silently failed for some teachers (notably iOS Safari). */
  autoPrint?: boolean;
}

/** The practice paper itself — rendered both on-screen (preview) and inside
 *  the portaled print stack, so the two never drift apart. English exam →
 *  LTR regardless of UI language. */
function BagrutPaper({ test, withAnswerKey, t }: { test: BagrutTest; withAnswerKey: boolean; t: VocabagrutStrings }) {
  const spec = MODULE_SPECS[test.module];

  // Continuous question numbering across the whole paper. Precompute each
  // section's starting number so the JSX stays pure (no mutate-during-render).
  const sectionStart: number[] = [];
  test.sections.reduce((acc, s, i) => { sectionStart[i] = acc; return acc + s.questions.length; }, 0);

  return (
    <div
      dir="ltr"
      className="vb-paper mx-auto my-6 max-w-[820px] bg-white text-stone-900 shadow-xl rounded-sm px-10 py-10"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {/* Header */}
      <header className="text-center mb-5">
        <h1 className="text-xl font-bold">English — Practice Test</h1>
        <p className="text-sm mt-1">
          {spec.label} &nbsp;|&nbsp; {spec.pointTrack}-point program &nbsp;|&nbsp; Suggested grade {spec.gradeBand}
        </p>
        <p className="text-sm" dir="rtl">{spec.hebrewLabel} — תרגול באנגלית</p>
        <h2 className="text-lg font-bold mt-3">{sanitizeTitle(test.title)}</h2>
      </header>

      <div className="text-sm flex flex-wrap gap-x-8 gap-y-1 border-y border-stone-300 py-2 mb-5"
           style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <span>Name: ____________________________</span>
        <span>Class: ____________</span>
        <span>Date: ____________</span>
        <span className="basis-full text-stone-600">
          Time allowed: {test.time_minutes} minutes &nbsp;·&nbsp; Total: {test.total_points} points
        </span>
      </div>

      {/* Sections */}
      {test.sections.map((section, si) => (
        <section key={si} className="mb-7">
          <div className="flex items-baseline justify-between border-b-2 border-stone-800 pb-1 mb-3">
            <h3 className="text-base font-bold uppercase tracking-wide">{section.title}</h3>
            <span className="text-sm text-stone-600 whitespace-nowrap">({section.total_points} points)</span>
          </div>

          {section.passage && (
            <div className="mb-4 leading-relaxed text-[15px]">
              {section.passage.split(/\n+/).filter(Boolean).map((para, pi) => (
                <p key={pi} className="mb-2">{para}</p>
              ))}
            </div>
          )}

          <ol className="space-y-4">
            {section.questions.map((q, qi) => {
              const n = sectionStart[si] + qi + 1;
              return (
                <li key={q.id} className="vb-q vb-print-avoid-break list-none">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-[15px]"
                       style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      <span className="font-bold">{n}.</span> {q.prompt}
                    </p>
                    <span className="text-xs text-stone-500 whitespace-nowrap">({q.points} pts)</span>
                  </div>

                  {q.type === 'mc' && q.options && (
                    <ul className="mt-2 ml-6 space-y-1 text-[15px]"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {q.options.map((opt) => (
                        <li key={opt.letter}>
                          <span className="font-mono mr-1">({opt.letter})</span> {opt.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {q.type === 'short' && (
                    <div className="mt-2 ml-2 space-y-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="border-b border-stone-400" />
                      ))}
                    </div>
                  )}

                  {q.type === 'writing' && (
                    <div className="mt-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {q.bullets && q.bullets.length > 0 && (
                        <>
                          <p className="text-sm font-medium ml-1">Your writing should include:</p>
                          <ul className="list-disc ml-7 text-sm text-stone-700">
                            {q.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                          </ul>
                        </>
                      )}
                      {q.word_count_min && q.word_count_max && (
                        <p className="text-xs italic text-stone-500 mt-1 ml-1">
                          Write {q.word_count_min}–{q.word_count_max} words.
                        </p>
                      )}
                      <div className="mt-2 border border-stone-500 rounded-sm">
                        {Array.from({ length: spec.writingLines }).map((_, i) => (
                          <div key={i} className="border-b border-stone-200 last:border-b-0" style={{ height: 22 }} />
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <p className="text-center font-semibold italic mt-8">GOOD LUCK! &nbsp; <span dir="rtl">בהצלחה!</span></p>

      {/* Optional teacher answer key — forced onto its own page in print. */}
      {withAnswerKey && (
        <section className="vb-answer-key vb-print-page-break-before mt-10 pt-6 border-t-2 border-dashed border-stone-300"
                 style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <h2 className="text-center text-lg font-bold mb-4 uppercase">{t.answerKeyTitle}</h2>
          {test.sections.map((section, si) => (
              <div key={si} className="mb-4">
                <h3 className="font-bold text-sm mb-1">{section.title}</h3>
                <ul className="space-y-1.5 text-sm">
                  {section.questions.map((q, qi) => {
                    const kNum = sectionStart[si] + qi + 1;
                    return (
                      <li key={q.id} className="vb-q vb-print-avoid-break">
                        <span className="font-bold mr-1">{kNum}.</span>
                        {q.type === 'mc' && q.correct_answer && (
                          <span>Correct answer: <strong>({q.correct_answer})</strong>
                            {q.explanation ? <span className="text-stone-600"> — {q.explanation}</span> : null}
                          </span>
                        )}
                        {q.type === 'short' && (
                          <span className="text-stone-700">
                            {q.explanation ? `Sample answer / rubric: ${q.explanation}` : '—'}
                          </span>
                        )}
                        {q.type === 'writing' && (
                          <span className="text-stone-700">
                            Writing rubric — Content {Math.round(q.points * 0.4)} pts, Organisation {Math.round(q.points * 0.2)} pts, Vocabulary {Math.round(q.points * 0.2)} pts, Grammar {Math.round(q.points * 0.2)} pts.
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default function BagrutPreviewModal({ test, withAnswerKey, onClose, autoPrint }: Props) {
  const { language } = useLanguage();
  const t = vocabagrutT[language];

  // When opened via "Export PDF", jump straight to the print dialog once the
  // paper has painted. window.print() is allowed without a fresh user
  // gesture, so this reliably reaches "Save as PDF" on desktop and mobile.
  useEffect(() => {
    if (!autoPrint) return;
    const id = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  return (
    <>
      {/* Strip the on-screen card chrome (shadow/margins/max-width) from the
          printed copy; the @page margin in src/index.css owns the page edges.
          Scoped to the print stack so the on-screen preview is untouched. */}
      <style>{`
        @media print {
          .vb-print-stack .vb-paper { box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* On-screen preview (hidden from print: it lives in #root, which the
          global print rule sets to display:none). */}
      <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="flex-1 overflow-y-auto">
          {/* Sticky toolbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 bg-white/90 backdrop-blur border-b border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              <X size={16} /> {t.closePreview}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Printer size={16} /> {t.printSavePdf}
            </button>
          </div>

          <BagrutPaper test={test} withAnswerKey={withAnswerKey} t={t} />
          <p className="text-center text-xs text-stone-400 mt-2 mb-8">{t.practicePaperFooter}</p>
        </div>
      </div>

      {/* Print stack — portaled to <body> so the global @media print rule
          prints ONLY this (and hides the app + this modal's on-screen copy). */}
      {typeof document !== 'undefined' && createPortal(
        <div className="vb-print-stack" dir="ltr">
          <BagrutPaper test={test} withAnswerKey={withAnswerKey} t={t} />
        </div>,
        document.body,
      )}
    </>
  );
}
