# PDF output migration — jsPDF → Chromium (Cloudflare Browser Rendering)

> Status: **foundation landed, Worker wiring pending one operator step.**
> Owner: engineering. Tracking the runtime-PDF quality issues in Vocaband
> + Vocabagrut (broken Arabic shaping, reversed Hebrew, blurry/rasterized
> output, sliced page breaks).

---

## The problem (it is NOT "open-source vs paid")

The runtime PDFs are broken because of the **rendering engine**, not the
licence. We currently use three engines, all client-side, all flawed:

| Path | Used by | Failure |
|---|---|---|
| `html2pdf.js` (html2canvas → jsPDF image) | `FreeResourcesView` (14 templates), `ClassReportModal`, `CertificateModal`, `HebrewWorksheetView` | Output is a **screenshot**: not selectable, blurry, page-breaks slice rows |
| `jsPDF` direct text (+ `src/lib/pdfFonts.ts`, `src/lib/arabicShaper.ts`) | report exports | jsPDF has **no shaping / no bidi** — we hand-wrote an Arabic shaper and monkey-patch jsPDF internals by minified-string match. Fragile |
| `window.print()` | Vocabagrut `BuildBagrutView` | Real engine, but no control: browser headers, inconsistent margins, manual "Save as PDF" |

Meanwhile our **build-time** docs (`scripts/teacher-pdfs/build.mjs`)
already render through **Chromium** and look perfect. That comment says it
all: *"Why we use Playwright/Chromium rather than jsPDF: Real Heebo +
Cairo + Inter web fonts (Hebrew/Arabic shaping)."*

**Fix = give the runtime PDFs the same real-browser engine.** Chromium
ships HarfBuzz (OpenType shaping → Arabic letters connect) and ICU
(Unicode bidi → correct RTL). It outputs vector text (selectable,
crisp, small) and paginates with real CSS. This lets us **delete**
`arabicShaper.ts`, `fixRtl`, `disableJsPdfArabicProcessor`, and the
html2canvas page-break hacks once every view is migrated.

---

## Architecture

```
Client view  ──POST /api/pdf {title, words[], answers[]}──►  Cloudflare Worker
  (sends DATA, not HTML)                                        │
                                                                │ buildWorksheetHtml(data)   ← src/lib/pdf/worksheetTemplate.ts
                                                                ▼
                                                      Cloudflare Browser Rendering (Chromium)
                                                                │ page.setContent(html) → page.pdf()
                                                                ▼
  Client downloads the PDF  ◄──────────── application/pdf ──────┘
```

- **Client never builds the PDF.** Rendering moves to the server, so every
  phone/browser gets the identical, correctly-shaped file. Fonts are
  embedded in the PDF, so Hebrew/Arabic render even on devices lacking them.
- **Client sends structured data, never raw HTML** → no injection / SSRF.
  The Worker escapes everything in `worksheetTemplate.ts`.
- Fonts load from the existing `/fonts/` static assets (apex host, to skip
  the Worker's www→apex 301).

### Why Cloudflare (vs self-host on Fly / a paid API)

1. We **already run** the Cloudflare Worker — `/api/pdf` is a sibling of the
   existing edge route `/api/audio-pack`. `/api/*` is already in
   `run_worker_first`, so **no routing/wrangler change is needed for the route itself**.
2. **Student PII stays in our infra.** Certificates/reports carry kids'
   names; a 3rd-party PDF API would be a new data processor to disclose in
   the privacy policy / MoE review. Cloudflare is already our processor.
3. **No RAM contention with the Fly game server.** Chromium runs on
   Cloudflare, not on the memory-tight Fly machine that hosts the live
   WebSocket challenge.
4. ~**$5/mo** (Workers Paid) + tiny usage; scales for assignment-time bursts.

---

## ⚠️ Operator prerequisite (one-time, human-only)

The Worker route cannot work until Browser Rendering is enabled on the
Cloudflare account:

1. Cloudflare dashboard → upgrade the account to **Workers Paid** (~$5/mo)
   if not already.
2. Confirm **Browser Rendering** is available (included with Workers Paid).
3. Add the binding to `wrangler.jsonc` (protected — goes through review):
   ```jsonc
   "browser": { "binding": "BROWSER" }
   ```
4. `npm i -D @cloudflare/puppeteer`

Until step 1–2 are done, deploying the route would fail at runtime, so the
route is intentionally **not yet added** to `worker/index.ts`.

---

## The Worker route (ready to apply AFTER the prerequisite)

`worker/index.ts` is a **protected zone** (a break takes the whole API +
WebSocket layer offline) and we have no local `node_modules` to typecheck
against here, so this is staged for review rather than committed blind.
Apply it, run `npm run typecheck` + `npm run build`, then verify on a
preview deploy.

Add to the `Env` interface (typed loosely, mirroring the existing
HTMLRewriter shim, because tsconfig pulls only the DOM lib):
```ts
// Cloudflare Browser Rendering binding (declared in wrangler.jsonc).
// Typed as unknown + cast at the call site so the DOM-lib tsc check
// doesn't need @cloudflare/workers-types.
BROWSER?: unknown;
```

Handler:
```ts
import puppeteer from '@cloudflare/puppeteer';
import { buildWorksheetHtml, worksheetFontFaceCss, type WorksheetData }
  from '../src/lib/pdf/worksheetTemplate';

async function handlePdf(request: Request, env: Env): Promise<Response> {
  // Cap payload + validate shape — never trust client input.
  const raw = await request.text();
  if (raw.length > 256 * 1024) return new Response('Payload too large', { status: 413 });
  let data: WorksheetData;
  try { data = JSON.parse(raw); }
  catch { return new Response('Bad JSON', { status: 400 }); }
  if (!data || typeof data.title !== 'string' || !Array.isArray(data.words) || data.words.length > 200) {
    return new Response('Invalid worksheet data', { status: 400 });
  }

  const html = buildWorksheetHtml(data, { fontCss: worksheetFontFaceCss() });
  const browser = await puppeteer.launch(env.BROWSER as never);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      displayHeaderFooter: true, headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#94a3b8;padding:0 12mm;display:flex;justify-content:space-between;"><span>vocaband.com</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
    return new Response(pdf, { status: 200, headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="vocaband-worksheet.pdf"',
      'Cache-Control': 'private, no-store',
    }});
  } finally {
    await browser.close();
  }
}
```

Wire it in `fetch()` **before** the `/api/*` passthrough proxy (same place
as `/api/audio-pack`):
```ts
if (url.pathname === '/api/pdf' && request.method === 'POST') {
  return handlePdf(request, env);
}
```

> Hardening follow-ups: rate-limit (a render is more expensive than a
> proxied GET), and optionally require a valid session for report/cert
> exports that contain student names.

---

## Already landed (this branch, safe, no protected files)

- `src/lib/pdf/worksheetTemplate.ts` — structured data → branded print HTML.
  Verified locally through real Chromium: connected Arabic, RTL Hebrew with
  niqqud, vector/selectable text, table header repeats across pages, answer
  key on its own page.
- `src/lib/pdf/requestWorksheetPdf.ts` — client helper (POST data → download).

---

## Phased client rollout (after the route is live)

Migrate one view at a time; each is a self-contained swap of the export
handler from `html2pdf`/`jsPDF` to `requestWorksheetPdf(...)`.

1. **Certificate** (`CertificateModal.tsx`) — smallest, single layout.
2. **Hebrew worksheet** (`HebrewWorksheetView.tsx`) — single template.
3. **Class report** (`ClassReportModal.tsx`).
4. **Free resources** (`FreeResourcesView.tsx`) — 14 templates; generalize
   `worksheetTemplate.ts` to cover bingo/scramble/fill-blank layouts.
5. **Vocabagrut exams** (`BuildBagrutView.tsx`) — replace `window.print()`.

Once a view is migrated and verified, remove its jsPDF/html2pdf usage. When
**all** are migrated, delete `src/lib/arabicShaper.ts`,
`disableJsPdfArabicProcessor`/`fixRtl` in `src/lib/pdfFonts.ts`, and drop the
`jspdf`, `jspdf-autotable`, `html2pdf.js`, `html2canvas-pro` dependencies.

## Verification checklist (per view, on preview deploy)

- [ ] Ctrl+F finds an English word AND a Hebrew word (text is real).
- [ ] Arabic letters connect; Hebrew is right-to-left with niqqud.
- [ ] Zoom 400% stays crisp (vector, not screenshot).
- [ ] A row / question never splits across a page; table header repeats.
- [ ] Footer shows branding + `Page X / Y`, no browser-injected header.
- [ ] File size is small (tens of KB, not multi-MB).
