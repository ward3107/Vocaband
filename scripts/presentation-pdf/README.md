# School-visit presentation PDFs

Three A4 PDFs designed for WhatsApp sharing with school staff:

- `dist-presentation/Vocaband-Presentation-HE.pdf` — Hebrew 7-page deck (indigo/violet/fuchsia)
- `dist-presentation/Vocaband-Presentation-AR.pdf` — Arabic 7-page deck (teal/violet/fuchsia)
- `dist-presentation/Vocaband-OnePager-AR.pdf` — Arabic single-page summary, hand-out for school staff

7-page deck flow:
1. Cover with brand pills (6,482 words • 15 modes • WCAG AA • GDPR)
2. Stats hero + problem statement
3. For students — all 15 game modes + gamification system
4. For teachers — 2026 new features (OCR, AI sentences, worksheet results, Class Minute, Hot Seat, certificates, WhatsApp share) + daily routine + quote
5. For principals — admin overview + security & WCAG compliance
6. Roadmap — AI Lesson Builder, Hebrew/Arabic L2, science vocab
7. Contact + 3-step start + CTA

Single-page summary (`ar-one-pager.html`): hero strap + 4 stats + 2 audience columns (student/teacher) + 8 "new in 2026" tiles + 15-mode strip + security strip + CTA with **scannable QR to www.vocaband.com**. Designed to be printed in colour and handed to school staff after the visit.

The QR in the CTA is an inline SVG. To regenerate (e.g. if the URL changes):

```bash
npm install qrcode
node -e "require('qrcode').toString('https://www.vocaband.com', { type: 'svg', errorCorrectionLevel: 'H', margin: 1, color: { dark: '#0d1f3d', light: '#ffffff' } }).then(console.log)"
```

Paste the resulting `<svg>...</svg>` into the `.cta .qr` block in `ar-one-pager.html`.

Pricing is intentionally **excluded** from these decks — those conversations
happen in person after the demo.

## Regenerate

```bash
node scripts/presentation-pdf/build.mjs
```

Output is written to `dist-presentation/`. Edit `he.html` / `ar.html` to change content.

## How it works

Plays back each HTML through Playwright's headless Chromium and prints to A4 PDF with
`printBackground: true` so the gradient covers render correctly.
