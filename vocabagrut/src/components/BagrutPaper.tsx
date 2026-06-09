import type { ReadingPassage, UnitLevel, VocabWord, WritingPrompt } from '../core/types';

// A print-ready Bagrut paper. Always rendered LTR (it is an English exam)
// and styled for A4 via the @media print rules in index.css. When
// `includeKey` is set, a teacher answer-key + rubric section is appended on
// its own page. Rendered inside `.print-area` so it is the only thing that
// prints.

const MC_LETTERS = ['a', 'b', 'c', 'd', 'e'];

const blankLines = (n: number) => (
  <div className="mt-2 space-y-3">
    {Array.from({ length: n }).map((_, i) => <div key={i} className="answer-line" />)}
  </div>
);

const SectionTitle = ({ letter, title, points }: { letter: string; title: string; points?: number }) => (
  <h2 className="mt-7 mb-3 border-b-2 border-slate-800 pb-1 text-xl font-extrabold text-slate-900">
    Section {letter} — {title}
    {points != null && <span className="float-right text-base font-semibold">({points} pts)</span>}
  </h2>
);

export default function BagrutPaper({
  level,
  words,
  passages,
  prompts,
  includeKey,
}: {
  level: UnitLevel;
  words: VocabWord[];
  passages: ReadingPassage[];
  prompts: WritingPrompt[];
  includeKey: boolean;
}) {
  const readingPts = passages.reduce((s, p) => s + p.questions.reduce((a, q) => a + q.points, 0), 0);
  const writingPts = prompts.reduce((s, p) => s + p.rubric.reduce((a, c) => a + c.maxPoints, 0), 0);
  const vocabPts = words.length;
  const total = readingPts + writingPts + vocabPts;

  let sec = -1;
  const nextLetter = () => String.fromCharCode(65 + ++sec); // A, B, C…

  return (
    <div dir="ltr" className="print-area mx-auto max-w-[800px] bg-white p-8 text-[15px] leading-relaxed text-slate-900">
      {/* ── Cover ── */}
      <header className="avoid-break border-b-4 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black">English Bagrut — Practice Paper</h1>
        <p className="mt-1 font-semibold text-slate-700">
          {level} Units (yechidot) · Ministry of Education Curriculum 2020 (CEFR)
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-left text-sm">
          <div>Name: <span className="inline-block w-full border-b border-slate-400" /></div>
          <div>Class: <span className="inline-block w-full border-b border-slate-400" /></div>
          <div>Date: <span className="inline-block w-full border-b border-slate-400" /></div>
        </div>
        <p className="mt-3 text-sm font-semibold">
          Total: {total} points · Suggested time: {Math.max(45, Math.round(total * 1.5))} minutes
        </p>
      </header>

      {/* ── Section: Vocabulary ── */}
      {words.length > 0 && (
        <section className="avoid-break">
          <SectionTitle letter={nextLetter()} title="Vocabulary" points={vocabPts} />
          <p className="mb-3 text-sm italic text-slate-600">Write the meaning (in English, Hebrew or Arabic) of each word.</p>
          <ol className="list-decimal space-y-2 ps-6">
            {words.map((w) => (
              <li key={w.id} className="avoid-break">
                <span className="font-semibold">{w.word}</span>
                <span className="ms-2 text-slate-400">({w.partOfSpeech})</span>
                <span className="ms-2 inline-block min-w-[40%] border-b border-dotted border-slate-400 align-bottom" />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Section: Reading ── */}
      {passages.map((p) => (
        <section key={p.id}>
          <SectionTitle letter={nextLetter()} title="Reading Comprehension" points={p.questions.reduce((a, q) => a + q.points, 0)} />
          <h3 className="avoid-break text-lg font-bold">{p.title}</h3>
          <p className="avoid-break mt-2 whitespace-pre-line text-justify">{p.text}</p>
          <ol className="mt-4 list-decimal space-y-4 ps-6">
            {p.questions.map((q) => (
              <li key={q.id} className="avoid-break">
                <div className="font-medium">
                  {q.prompt} <span className="text-slate-400">({q.points} pts)</span>
                </div>
                {q.type === 'multiple-choice' && q.options ? (
                  <ul className="mt-1 space-y-1 ps-4">
                    {q.options.map((opt, i) => (
                      <li key={i}>({MC_LETTERS[i]}) {opt}</li>
                    ))}
                  </ul>
                ) : (
                  blankLines(2)
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}

      {/* ── Section: Writing ── */}
      {prompts.map((wp) => (
        <section key={wp.id}>
          <SectionTitle letter={nextLetter()} title="Writing" points={wp.rubric.reduce((a, c) => a + c.maxPoints, 0)} />
          <h3 className="avoid-break text-lg font-bold">{wp.title}</h3>
          <p className="avoid-break mt-1">{wp.prompt}</p>
          <p className="mt-1 text-sm italic text-slate-600">Write {wp.minWords}–{wp.maxWords} words.</p>
          {blankLines(10)}
        </section>
      ))}

      {/* ── Answer key (teacher) ── */}
      {includeKey && (
        <section className="page-break">
          <h2 className="mb-3 border-b-2 border-slate-800 pb-1 text-xl font-extrabold">Answer Key &amp; Marking Scheme</h2>

          {words.length > 0 && (
            <div className="avoid-break mb-5">
              <h3 className="font-bold">Vocabulary</h3>
              <ol className="list-decimal ps-6 text-sm">
                {words.map((w) => (
                  <li key={w.id}><span className="font-semibold">{w.word}</span> — {w.he} · {w.ar} · {w.definition}</li>
                ))}
              </ol>
            </div>
          )}

          {passages.map((p) => (
            <div key={p.id} className="avoid-break mb-5">
              <h3 className="font-bold">Reading — {p.title}</h3>
              <ol className="list-decimal ps-6 text-sm">
                {p.questions.map((q) => (
                  <li key={q.id}>
                    {q.type === 'multiple-choice' && q.options && typeof q.answerIndex === 'number'
                      ? <>Correct: ({MC_LETTERS[q.answerIndex]}) {q.options[q.answerIndex]}</>
                      : <>Sample answer: {q.sampleAnswer || '—'}</>}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {prompts.map((wp) => (
            <div key={wp.id} className="avoid-break mb-5">
              <h3 className="font-bold">Writing — {wp.title} (rubric)</h3>
              <table className="mt-1 w-full border-collapse text-sm">
                <tbody>
                  {wp.rubric.map((c) => (
                    <tr key={c.name} className="border-b border-slate-200">
                      <td className="py-1 pe-3 font-semibold">{c.name}</td>
                      <td className="py-1 pe-3">{c.maxPoints} pts</td>
                      <td className="py-1 text-slate-600">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
