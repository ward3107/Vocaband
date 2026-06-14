// Server-side certificate template (rendered by /api/pdf via Chromium).
//
// Faithful port of CertificateModal's navy/gold diploma: ivory parchment,
// double gold frame, corner medallions, gold award medallion, Playfair
// serif headline + student name, navy stat tiles, signature row with seal.
//
// i18n lives in the caller (CertificateModal already has the strings), so
// this template is pure layout — every display string arrives pre-localized
// in `data`. Fonts load from Google Fonts (Playfair/Inter for Latin chrome;
// Heebo/Cairo so Hebrew/Arabic student names render), which Cloudflare
// Browser Rendering fetches at render time — same approach as the
// build-time decks in scripts/teacher-pdfs.

export interface CertificateStat {
  value: string;
  label: string;
}

export interface CertificateData {
  kind: 'certificate';
  dir?: 'ltr' | 'rtl';
  brand: string;
  brandTagline: string;
  certTitle: string;
  certSubtitle: string;
  awardedTo: string;
  studentName: string;
  ofClass: string;
  body: string;
  stats: CertificateStat[];
  teacherName: string;
  issuedByLabel: string;
  date: string;
  dateLabel: string;
  sealLabel: string;
}

const esc = (s: string | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Lucide "award" glyph, inlined so the medallion matches the on-screen modal.
const AWARD_SVG = `<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;

export function buildCertificateHtml(data: CertificateData): string {
  const dir = data.dir === 'rtl' ? 'rtl' : 'ltr';
  const stats = (data.stats ?? [])
    .map(
      (s) => `
      <div class="tile">
        <div class="tile-v">${esc(s.value)}</div>
        <div class="tile-l">${esc(s.label)}</div>
      </div>`,
    )
    .join('');

  const corners = ['tl', 'tr', 'bl', 'br']
    .map((c) => `<div class="corner ${c}"></div>`)
    .join('');

  return `<!doctype html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<title>${esc(data.studentName)} — ${esc(data.certTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,600&family=Inter:wght@600;800;900&family=Heebo:wght@700;900&family=Cairo:wght@700;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html, body { margin:0; padding:0; }
  body {
    font-family:'Inter','Helvetica Neue',sans-serif; color:#0f172a;
    background:#fffaf0;
    background-image:
      radial-gradient(ellipse at top, rgba(217,119,6,.12) 0%, transparent 55%),
      radial-gradient(ellipse at bottom, rgba(217,119,6,.08) 0%, transparent 60%);
  }
  .page { position:relative; width:210mm; height:297mm; overflow:hidden; }

  /* Sunburst behind the medallion */
  .sun { position:absolute; inset:0; pointer-events:none;
    background-image:repeating-conic-gradient(from 0deg, rgba(217,119,6,.06) 0deg 4deg, transparent 4deg 12deg);
    -webkit-mask-image:radial-gradient(circle at 50% 36%, #000 0%, rgba(0,0,0,.6) 25%, transparent 55%);
    mask-image:radial-gradient(circle at 50% 36%, #000 0%, rgba(0,0,0,.6) 25%, transparent 55%); }

  /* Double gold frame */
  .frame-outer { position:absolute; inset:10mm; border:6px solid #c08719; border-radius:6px;
    box-shadow: inset 0 0 0 2px #fffaf0, inset 0 0 0 3px #c08719; pointer-events:none; }
  .frame-inner { position:absolute; inset:14mm; border:1px solid #c08719; border-radius:3px; pointer-events:none; }

  .corner { position:absolute; width:7mm; height:7mm; border-radius:50%; pointer-events:none;
    background:radial-gradient(circle, #f5c97a 0%, #c08719 60%, #8a5a08 100%);
    box-shadow:0 0 0 2px #fffaf0, 0 0 0 3px #c08719; }
  .corner.tl { top:11mm; left:11mm; } .corner.tr { top:11mm; right:11mm; }
  .corner.bl { bottom:11mm; left:11mm; } .corner.br { bottom:11mm; right:11mm; }

  .content { position:relative; height:100%; display:flex; flex-direction:column;
    align-items:center; justify-content:space-between; text-align:center; padding:30mm 22mm 24mm; }

  .brand { font-size:11pt; font-weight:900; text-transform:uppercase; letter-spacing:.45em; color:#334155; }
  .brand-rule { width:34px; height:1px; margin:5px auto 0; background:linear-gradient(to right, transparent, #c08719, transparent); }
  .tagline { font-size:9pt; color:#64748b; font-weight:600; font-style:italic; margin-top:4px; }

  .mid { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; }
  .medallion { width:96px; height:96px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:14px;
    background:radial-gradient(circle at 30% 30%, #fde68a 0%, #c08719 70%, #7c4a08 100%);
    box-shadow:0 0 0 3px #fffaf0, 0 0 0 5px #c08719, 0 8px 16px -4px rgba(124,74,8,.4); }

  .h1 { font-family:'Playfair Display',Georgia,serif; font-weight:900; font-size:40pt; line-height:1.05; color:#0f172a; margin:0; }
  .h2 { font-family:'Playfair Display',Georgia,serif; font-weight:700; font-size:18pt; letter-spacing:.18em; text-transform:uppercase; color:#c08719; margin:2px 0 18px; }
  .awarded { font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:12pt; color:#475569; margin-bottom:8px; }
  .name { font-family:'Playfair Display','Heebo','Cairo',Georgia,serif; font-weight:900; font-size:34pt; line-height:1.05;
    color:#8a5a08; text-shadow:0 1px 0 rgba(255,255,255,.6); margin:0; padding:0 8px; word-break:break-word; }
  .name-rule { width:150px; height:1px; margin:8px auto 0; background:linear-gradient(to right, transparent, #c08719, transparent); }
  .of-class { font-size:11pt; font-weight:600; color:#334155; margin:8px 0 10px; }
  .body { font-family:'Playfair Display',Georgia,serif; font-style:italic; font-size:11pt; color:#475569; max-width:130mm; line-height:1.6; margin:0 0 18px; }

  .tiles { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
  .tile { min-width:26mm; border:1px solid #1e293b; border-radius:5px; background:rgba(15,23,42,.04); padding:7px 12px; }
  .tile-v { font-family:'Playfair Display',Georgia,serif; font-weight:900; font-size:20pt; line-height:1; color:#8a5a08; }
  .tile-l { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#475569; margin-top:3px; }

  .sign { width:100%; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; direction:ltr; }
  .sign-col { flex:1; display:flex; flex-direction:column; align-items:center; }
  .sign-name { font-family:'Playfair Display',Georgia,serif; font-style:italic; font-weight:700; font-size:13pt; color:#0f172a; }
  .sign-rule { width:100%; max-width:150px; border-top:1px solid #94a3b8; margin:4px 0; }
  .sign-label { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
  .seal { width:60px; height:60px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:radial-gradient(circle at 30% 30%, #fde68a 0%, #c08719 70%, #7c4a08 100%);
    box-shadow:0 0 0 2px #fffaf0, 0 0 0 3px #c08719; }
  .seal span { font-size:7pt; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#fff; text-align:center; line-height:1.1; }
</style>
</head>
<body>
  <div class="page">
    <div class="sun"></div>
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    ${corners}
    <div class="content" dir="${dir}">
      <div>
        <div class="brand">${esc(data.brand)}</div>
        <div class="brand-rule"></div>
        <div class="tagline">${esc(data.brandTagline)}</div>
      </div>

      <div class="mid">
        <div class="medallion">${AWARD_SVG}</div>
        <h1 class="h1">${esc(data.certTitle)}</h1>
        <div class="h2">${esc(data.certSubtitle)}</div>
        <div class="awarded">${esc(data.awardedTo)}</div>
        <h3 class="name">${esc(data.studentName)}</h3>
        <div class="name-rule"></div>
        <div class="of-class">${esc(data.ofClass)}</div>
        <p class="body">${esc(data.body)}</p>
        <div class="tiles">${stats}</div>
      </div>

      <div class="sign">
        <div class="sign-col">
          <div class="sign-name">${esc(data.teacherName)}</div>
          <div class="sign-rule"></div>
          <div class="sign-label">${esc(data.issuedByLabel)}</div>
        </div>
        <div class="seal"><span>${esc(data.sealLabel)}</span></div>
        <div class="sign-col">
          <div class="sign-name">${esc(data.date)}</div>
          <div class="sign-rule"></div>
          <div class="sign-label">${esc(data.dateLabel)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
