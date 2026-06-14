// Reusable print-HTML builder for Vocaband worksheets.
//
// This is the single source of truth for what a worksheet PDF looks like.
// It takes STRUCTURED DATA (a word list, not HTML) and returns a complete
// print-ready HTML document. Two consumers use it:
//
//   1. The Cloudflare Worker /api/pdf route — feeds the HTML to Cloudflare
//      Browser Rendering (real Chromium) → returns a PDF. Because Chromium
//      has HarfBuzz shaping + ICU bidi, Hebrew and Arabic render correctly
//      with zero of the jsPDF workarounds (arabicShaper / fixRtl).
//
//   2. An optional in-app print preview (same HTML, shown in an iframe).
//
// SECURITY: callers pass data, never raw HTML. Every string is escaped
// here, so a malicious word/title can't inject markup into the render.
//
// Fonts are injected via `fontCss` so this module stays environment-
// agnostic: production passes URL-based @font-face (served from /fonts/),
// tests pass base64 data-URI faces. Family names are fixed: Fredoka
// (display), Heebo (Latin body), NotoHe (Hebrew), NotoAr (Arabic).

export type WorksheetLang = 'en' | 'he' | 'ar';

export interface WorksheetWord {
  en: string;
  he?: string;
  ar?: string;
}

export interface WorksheetAnswer {
  word: string;
  sentence: string;
  translation?: string;
}

export interface WorksheetData {
  title: string;
  subtitle?: string;
  /** Instructions line shown in the callout. */
  instructions?: string;
  /** Base reading direction of the sheet chrome (headings/labels). */
  lang?: WorksheetLang;
  words: WorksheetWord[];
  /** When present, renders an answer key on its own page. */
  answers?: WorksheetAnswer[];
}

export interface WorksheetRenderOptions {
  /** A complete @font-face CSS block defining Fredoka/Heebo/NotoHe/NotoAr. */
  fontCss: string;
}

const esc = (s: string | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Production @font-face block: fonts served as static assets from /fonts/.
// Apex host (not www) so the Worker's www→apex 301 isn't hit mid-render.
export function worksheetFontFaceCss(
  baseUrl = 'https://vocaband.com/fonts/',
): string {
  const b = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `
    @font-face { font-family:'Fredoka'; src:url('${b}fredoka-latin.woff2') format('woff2'); font-weight:400 700; font-display:swap; }
    @font-face { font-family:'Heebo';   src:url('${b}heebo-latin.woff2')   format('woff2'); font-weight:400 800; font-display:swap; }
    @font-face { font-family:'NotoHe';  src:url('${b}NotoSansHebrew-Regular.ttf') format('truetype'); }
    @font-face { font-family:'NotoAr';  src:url('${b}NotoSansArabic-Regular.ttf') format('truetype'); }
  `;
}

function rowsHtml(words: WorksheetWord[]): string {
  return words
    .map(
      (w, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="en">${esc(w.en)}</td>
        <td class="he" dir="rtl" lang="he">${esc(w.he)}</td>
        <td class="ar" dir="rtl" lang="ar">${esc(w.ar)}</td>
        <td class="blank"></td>
      </tr>`,
    )
    .join('');
}

function answersHtml(answers: WorksheetAnswer[]): string {
  const items = answers
    .map(
      (a) => `
      <div class="ans">
        <div class="ans-word">${esc(a.word)}</div>
        <div class="ans-en">${esc(a.sentence)}</div>
        ${a.translation ? `<div class="ans-he" dir="rtl" lang="he">${esc(a.translation)}</div>` : ''}
      </div>`,
    )
    .join('');
  return `
    <section class="answers">
      <div class="ans-hero"><h2>Answer Key</h2></div>
      ${items}
    </section>`;
}

export function buildWorksheetHtml(
  data: WorksheetData,
  opts: WorksheetRenderOptions,
): string {
  const dir = data.lang === 'he' || data.lang === 'ar' ? 'rtl' : 'ltr';
  const instructions =
    data.instructions ??
    'Read each English word and its translations aloud. Then write one sentence using the word.';

  return `<!doctype html>
<html lang="${esc(data.lang ?? 'en')}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${esc(data.title)} — Vocaband</title>
<style>
  ${opts.fontCss}
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { margin:0; font-family:'Heebo','Helvetica Neue',sans-serif; color:#1e1b4b; }
  h1,h2 { font-family:'Fredoka','Heebo',sans-serif; margin:0; }

  .hero { background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#c026d3 100%);
          color:#fff; border-radius:22px; padding:22px 26px; display:flex; gap:20px; align-items:center; }
  .medallion { width:74px; height:74px; min-width:74px; border-radius:20px; font-size:38px;
               display:flex; align-items:center; justify-content:center;
               background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.35); }
  .hero h1 { font-size:30px; }
  .hero .kicker { font-size:12px; text-transform:uppercase; letter-spacing:2px; opacity:.85; font-weight:700; }
  .hero .sub { font-size:13px; opacity:.9; margin-top:4px; }
  .meta { margin-top:14px; display:flex; gap:22px; font-size:12px; }
  .meta b { display:block; opacity:.8; font-weight:600; margin-bottom:6px; }
  .meta .line { display:inline-block; width:130px; border-bottom:2px dotted rgba(255,255,255,.6); height:14px; }

  .callout { background:linear-gradient(135deg,#fff7ed,#ffe4e6); border:1px solid #fed7aa;
             border-radius:14px; padding:12px 16px; font-size:13px; margin:16px 0 14px; }
  .callout b { color:#c2410c; }

  table { width:100%; border-collapse:separate; border-spacing:0 6px; }
  thead { display:table-header-group; }
  thead th { background:linear-gradient(135deg,#7c3aed,#c026d3); color:#fff; font-size:12px;
             text-transform:uppercase; letter-spacing:1px; padding:10px 12px; }
  thead th:first-child { border-radius:10px 0 0 10px; }
  thead th:last-child  { border-radius:0 10px 10px 0; }
  tbody tr { break-inside:avoid; }
  tbody td { background:#faf5ff; padding:12px; font-size:15px; vertical-align:middle;
             border-top:1px solid #f3e8ff; border-bottom:1px solid #f3e8ff; }
  tbody td:first-child { border-left:1px solid #f3e8ff; border-radius:10px 0 0 10px; }
  tbody td:last-child  { border-right:1px solid #f3e8ff; border-radius:0 10px 10px 0; }
  .num { color:#a78bfa; font-weight:700; width:30px; text-align:center; }
  .en  { font-weight:600; color:#1e1b4b; width:150px; }
  .he  { font-family:'NotoHe'; font-size:18px; text-align:right; width:150px; color:#5b21b6; }
  .ar  { font-family:'NotoAr'; font-size:18px; text-align:right; width:150px; color:#be185d; }
  .blank { border-bottom:2px dotted #c4b5fd; }

  .answers { break-before:page; }
  .ans-hero { background:linear-gradient(135deg,#059669,#0d9488); color:#fff; border-radius:18px;
              padding:18px 24px; margin-bottom:16px; }
  .ans-hero h2 { font-size:22px; }
  .ans { break-inside:avoid; border:1px solid #d1fae5; border-radius:12px; padding:12px 16px;
         margin-bottom:10px; background:#f0fdfa; }
  .ans-word { font-family:'Fredoka'; color:#0f766e; font-size:15px; margin-bottom:4px; }
  .ans-en { font-size:14px; color:#134e4a; }
  .ans-he { font-family:'NotoHe'; font-size:17px; color:#115e59; margin-top:4px; }
</style>
</head>
<body>
  <div class="hero">
    <div class="medallion">📚</div>
    <div style="flex:1">
      <div class="kicker">Vocaband · Worksheet</div>
      <h1>${esc(data.title)}</h1>
      ${data.subtitle ? `<div class="sub">${esc(data.subtitle)}</div>` : ''}
      <div class="meta">
        <div><b>Name</b><span class="line"></span></div>
        <div><b>Class</b><span class="line"></span></div>
        <div><b>Date</b><span class="line"></span></div>
      </div>
    </div>
  </div>

  <div class="callout"><b>Instructions:</b> ${esc(instructions)}</div>

  <table>
    <thead>
      <tr><th>#</th><th>English</th><th>עברית</th><th>العربية</th><th>Write a sentence ✍️</th></tr>
    </thead>
    <tbody>${rowsHtml(data.words)}</tbody>
  </table>

  ${data.answers && data.answers.length ? answersHtml(data.answers) : ''}
</body>
</html>`;
}
