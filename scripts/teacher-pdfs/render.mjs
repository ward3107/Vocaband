/*
 * render(doc, lang, css) → HTML string
 *
 * Each `doc` is a content object (see content.mjs) describing a cover
 * page plus a list of inner pages.  Each page contains a heading + an
 * ordered list of `blocks` (paragraph, list, callout, table, etc.).
 *
 * Languages: 'en' | 'he' | 'ar' | 'ru'.  HE/AR flip to dir="rtl".  The
 * font family is chosen via `body[lang="..."]` in styles.css (Russian
 * reuses Inter, which already ships a Cyrillic subset).
 *
 * The render is intentionally string-based — no React, no JSX, no
 * bundler.  Keeps the build pure-Node so we can run it from anywhere
 * the existing `scripts/presentation-pdf/build.mjs` already runs.
 */

const RTL = new Set(['he', 'ar']);
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Allow simple **bold** + line breaks inside paragraphs.
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\n/g, '<br>');

function renderBlock(b, lang) {
  switch (b.type) {
    case 'h3':
      return `<h3>${inline(b.text)}</h3>`;

    case 'p':
      return `<p>${inline(b.text)}</p>`;

    case 'ul':
      return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;

    case 'ol':
      return `<ol>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`;

    case 'callout': {
      const cls = b.tag === 'warn' ? 'warn' : b.tag === 'info' ? 'info' : '';
      const label = b.label ? `<span class="tag">${esc(b.label)}</span>` : '';
      return `<div class="callout ${cls}">${label}<div>${inline(b.body)}</div></div>`;
    }

    case 'steps':
      return `<div class="steps">${b.items
        .map(
          (s, i) => `<div class="step">
            <div class="num">${i + 1}</div>
            <div class="body">
              <h4>${inline(s.title)}</h4>
              <p>${inline(s.body)}</p>
            </div>
          </div>`
        )
        .join('')}</div>`;

    case 'stats':
      return `<div class="stat-row">${b.items
        .map(
          (s) =>
            `<div class="stat"><div class="big">${esc(s.big)}</div><div class="label">${esc(s.label)}</div></div>`
        )
        .join('')}</div>`;

    case 'modes':
      return `<div class="mode-grid">${b.items
        .map(
          (m) =>
            `<div class="mode"><b>${esc(m.name)}</b><span>${inline(m.desc)}</span></div>`
        )
        .join('')}</div>`;

    case 'screenshot':
      return `<div class="screenshot-placeholder">
        <div class="tag">${esc(b.tagLabel || 'SCREENSHOT')}</div>
        <div class="caption">${inline(b.caption)}</div>
      </div>`;

    case 'table': {
      const head = `<thead><tr>${b.headers.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      return `<table>${head}${body}</table>`;
    }

    case 'twoCol':
      return `<div class="two-col">
        <div class="col">${b.left.map((x) => renderBlock(x, lang)).join('')}</div>
        <div class="col">${b.right.map((x) => renderBlock(x, lang)).join('')}</div>
      </div>`;

    case 'signoff':
      return `<div class="signoff">
        <p>${inline(b.body)}</p>
        ${b.name ? `<p class="name">${esc(b.name)}</p>` : ''}
      </div>`;

    case 'draftBanner':
      return `<div class="draft-banner">
        <span class="tag">${esc(b.tag || 'DRAFT')}</span>
        <span>${inline(b.text)}</span>
      </div>`;

    default:
      return '';
  }
}

function renderCover(doc, lang) {
  const c = doc.cover;
  return `<div class="page cover">
    <div class="brand-row">
      <div class="brand-left">
        <div class="logo-mark">V</div>
        <div>
          <div class="brand-text">Vocaband</div>
          <div class="doc-kind">${esc(c.kind || '')}</div>
        </div>
      </div>
      <div class="doc-kind">${esc(c.code || '')}</div>
    </div>
    <div>
      ${doc.emoji ? `<div style="font-size:48pt; margin-bottom:8px;">${doc.emoji}</div>` : ''}
      <h1>${esc(c.title)}</h1>
      <div class="strap">${inline(c.strap)}</div>
      <div class="sub">${inline(c.sub)}</div>
      <div class="pills">${(c.pills || []).map((p) => `<span class="pill">${esc(p)}</span>`).join('')}</div>
    </div>
    <div class="footer-row">
      <div>vocaband.com</div>
      <div>${esc(c.footerNote || '')}</div>
    </div>
  </div>`;
}

function renderPage(page, lang, doc, pageNumber, totalPages) {
  const blocks = (page.blocks || []).map((b) => renderBlock(b, lang)).join('');
  const intro = page.intro ? `<div class="section-intro">${inline(page.intro)}</div>` : '';
  return `<div class="page inner">
    <div class="page-header">
      <div class="left"><span class="v-mark">V</span><span>Vocaband · ${esc(doc.cover.kind || '')}</span></div>
      <div>${esc(page.heading)}</div>
    </div>
    ${page.emoji ? `<div class="hero-emoji">${page.emoji}</div>` : ''}
    <h2>${esc(page.heading)}</h2>
    ${intro}
    ${blocks}
    <div class="page-footer">
      <div class="url">vocaband.com</div>
      <div>${pageNumber} / ${totalPages}</div>
    </div>
  </div>`;
}

export function render(doc, lang, css) {
  const dir = RTL.has(lang) ? 'rtl' : 'ltr';
  const pages = doc.pages || [];
  const total = pages.length + 1; // +1 for cover
  const inner = pages
    .map((p, i) => renderPage(p, lang, doc, i + 2, total))
    .join('\n');

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${esc(doc.cover.title)} — Vocaband</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=Heebo:wght@400;500;700;800;900&family=Cairo:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body lang="${lang}">
<div class="doc">
${renderCover(doc, lang)}
${inner}
</div>
</body>
</html>`;
}
