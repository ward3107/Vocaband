// Self-contained print HTML for a Bagrut practice paper — a faithful port of
// <BagrutPaper>, rendered server-side through vocaband.com/api/pdf (real
// Chromium) instead of window.print(). Gives a clean one-click PDF with
// consistent margins/page-breaks instead of relying on the browser's print
// dialog. The exam body is English (LTR); the answer-key vocab line carries
// Hebrew/Arabic, covered by the Heebo/Cairo fallbacks in the font stack.

import type { ReadingPassage, UnitLevel, VocabWord, WritingPrompt } from '../core/types';

const MC = ['a', 'b', 'c', 'd', 'e'];

const esc = (s: string | number | null | undefined): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lines = (n: number): string =>
  Array.from({ length: n }).map(() => '<div class="al"></div>').join('');

export function buildBagrutHtml({
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
}): string {
  const readingPts = passages.reduce((s, p) => s + p.questions.reduce((a, q) => a + q.points, 0), 0);
  const writingPts = prompts.reduce((s, p) => s + p.rubric.reduce((a, c) => a + c.maxPoints, 0), 0);
  const vocabPts = words.length;
  const total = readingPts + writingPts + vocabPts;

  let sec = -1;
  const L = () => String.fromCharCode(65 + ++sec); // A, B, C…

  const parts: string[] = [];

  parts.push(`<header class="cover avoid">
    <h1>English Bagrut — Practice Paper</h1>
    <p class="lvl">${esc(level)} Units (yechidot) · Ministry of Education Curriculum 2020 (CEFR)</p>
    <div class="meta"><div>Name: <span class="u"></span></div><div>Class: <span class="u"></span></div><div>Date: <span class="u"></span></div></div>
    <p class="tot">Total: ${total} points · Suggested time: ${Math.max(45, Math.round(total * 1.5))} minutes</p>
  </header>`);

  if (words.length > 0) {
    parts.push(`<section class="avoid">
      <h2 class="st">Section ${L()} — Vocabulary <span class="pts">(${vocabPts} pts)</span></h2>
      <p class="hint">Write the meaning (in English, Hebrew or Arabic) of each word.</p>
      <ol class="dec">${words
        .map((w) => `<li class="avoid"><span class="b">${esc(w.word)}</span> <span class="pos">(${esc(w.partOfSpeech)})</span> <span class="blank"></span></li>`)
        .join('')}</ol>
    </section>`);
  }

  passages.forEach((p) => {
    const pts = p.questions.reduce((a, q) => a + q.points, 0);
    parts.push(`<section>
      <h2 class="st">Section ${L()} — Reading Comprehension <span class="pts">(${pts} pts)</span></h2>
      <h3 class="avoid">${esc(p.title)}</h3>
      <p class="avoid passage">${esc(p.text)}</p>
      <ol class="dec q">${p.questions
        .map(
          (q) => `<li class="avoid"><div class="qp">${esc(q.prompt)} <span class="pos">(${q.points} pts)</span></div>${
            q.type === 'multiple-choice' && q.options
              ? `<ul class="opts">${q.options.map((o, i) => `<li>(${MC[i]}) ${esc(o)}</li>`).join('')}</ul>`
              : lines(2)
          }</li>`,
        )
        .join('')}</ol>
    </section>`);
  });

  prompts.forEach((wp) => {
    const pts = wp.rubric.reduce((a, c) => a + c.maxPoints, 0);
    parts.push(`<section>
      <h2 class="st">Section ${L()} — Writing <span class="pts">(${pts} pts)</span></h2>
      <h3 class="avoid">${esc(wp.title)}</h3>
      <p class="avoid">${esc(wp.prompt)}</p>
      <p class="hint">Write ${wp.minWords}–${wp.maxWords} words.</p>${lines(10)}
    </section>`);
  });

  if (includeKey) {
    let key = `<section class="pagebreak"><h2 class="st">Answer Key &amp; Marking Scheme</h2>`;
    if (words.length > 0) {
      key += `<div class="avoid kb"><h3>Vocabulary</h3><ol class="dec sm">${words
        .map((w) => `<li><span class="b">${esc(w.word)}</span> — ${esc(w.he)} · ${esc(w.ar)} · ${esc(w.definition)}</li>`)
        .join('')}</ol></div>`;
    }
    passages.forEach((p) => {
      key += `<div class="avoid kb"><h3>Reading — ${esc(p.title)}</h3><ol class="dec sm">${p.questions
        .map(
          (q) => `<li>${
            q.type === 'multiple-choice' && q.options && typeof q.answerIndex === 'number'
              ? `Correct: (${MC[q.answerIndex]}) ${esc(q.options[q.answerIndex])}`
              : `Sample answer: ${esc(q.sampleAnswer || '—')}`
          }</li>`,
        )
        .join('')}</ol></div>`;
    });
    prompts.forEach((wp) => {
      key += `<div class="avoid kb"><h3>Writing — ${esc(wp.title)} (rubric)</h3><table class="rub"><tbody>${wp.rubric
        .map((c) => `<tr><td class="b">${esc(c.name)}</td><td>${c.maxPoints} pts</td><td class="muted">${esc(c.description)}</td></tr>`)
        .join('')}</tbody></table></div>`;
    });
    key += `</section>`;
    parts.push(key);
  }

  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Heebo:wght@400;700&family=Cairo:wght@400;700&display=swap">
<style>
  *{box-sizing:border-box}
  body{margin:0}
  .paper{font-family:'Inter','Heebo','Cairo',sans-serif;color:#0f172a;font-size:11pt;line-height:1.55}
  .avoid{break-inside:avoid}
  .pagebreak{break-before:page}
  h1{font-size:17pt;font-weight:900;margin:0}
  .cover{border-bottom:3px solid #0f172a;padding-bottom:3mm;text-align:center}
  .lvl{font-weight:600;color:#334155;margin:1mm 0 0}
  .meta{display:flex;gap:6mm;margin:4mm 0 2mm;font-size:10pt;text-align:left}
  .meta div{flex:1}
  .meta .u{display:inline-block;width:100%;border-bottom:1px solid #94a3b8;height:4mm}
  .tot{font-size:10pt;font-weight:600;margin:2mm 0 0}
  .st{font-size:13pt;font-weight:800;border-bottom:2px solid #1e293b;padding-bottom:1mm;margin:7mm 0 3mm;overflow:hidden}
  .st .pts{float:right;font-size:11pt;font-weight:600}
  .hint{font-size:9.5pt;font-style:italic;color:#475569;margin:0 0 3mm}
  h3{font-size:12pt;font-weight:700;margin:0 0 1mm}
  ol.dec{padding-inline-start:6mm;margin:0}
  ol.dec>li{margin:2mm 0}
  .b{font-weight:600}
  .pos{color:#94a3b8}
  .blank{display:inline-block;min-width:40%;border-bottom:1px dotted #94a3b8;vertical-align:bottom}
  .passage{white-space:pre-line;text-align:justify;margin:2mm 0}
  ol.q>li{margin:4mm 0}
  .qp{font-weight:500}
  .opts{list-style:none;padding-inline-start:4mm;margin:1mm 0}
  .opts li{margin:.6mm 0}
  .al{border-bottom:1px solid #94a3b8;height:6mm;margin:3mm 0}
  .kb{margin:0 0 5mm}
  ol.dec.sm{font-size:9.5pt}
  .rub{width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:1mm}
  .rub td{border-bottom:1px solid #e2e8f0;padding:1mm 3mm 1mm 0;vertical-align:top}
  .muted{color:#475569}
</style>
<div class="paper">${parts.join('')}</div>`;
}
