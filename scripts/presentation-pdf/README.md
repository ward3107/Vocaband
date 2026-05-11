# School-visit presentation PDFs

Two A4 PDFs designed for WhatsApp sharing with school staff:

- `dist-presentation/Vocaband-Presentation-HE.pdf` — Hebrew (indigo/violet/fuchsia)
- `dist-presentation/Vocaband-Presentation-AR.pdf` — Arabic (teal/violet/fuchsia)

Each is 6 pages: cover → problem → strengths → safety + future → start + cheat sheet → contact.

## Regenerate

```bash
node scripts/presentation-pdf/build.mjs
```

Output is written to `dist-presentation/`. Edit `he.html` / `ar.html` to change content.

## How it works

Plays back each HTML through Playwright's headless Chromium and prints to A4 PDF with
`printBackground: true` so the gradient covers render correctly.
