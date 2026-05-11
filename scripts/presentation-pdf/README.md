# School-visit presentation PDFs

Two 7-page A4 PDFs designed for WhatsApp sharing with school staff:

- `dist-presentation/Vocaband-Presentation-HE.pdf` — Hebrew (indigo/violet/fuchsia)
- `dist-presentation/Vocaband-Presentation-AR.pdf` — Arabic (teal/violet/fuchsia)

Page flow:
1. Cover with brand pills (6,482 words • 15 modes • WCAG AA • GDPR)
2. Stats hero + problem statement
3. For students — all 15 game modes + gamification system
4. For teachers — OCR camera, Quick Play, auto-grading + quote
5. For principals — admin overview + security & WCAG compliance
6. Roadmap — AI Lesson Builder, Hebrew/Arabic L2, science vocab
7. Contact + 3-step start + CTA

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
