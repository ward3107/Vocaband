# Teacher / parent / student PDFs

Generates the resources shown in the footer + the **Resources** section on
the landing page and the teacher login screen.

## Layout

```
scripts/teacher-pdfs/
  build.mjs         — Playwright orchestrator (run this)
  render.mjs        — content object → HTML
  styles.css        — shared print styles (gradients, type, RTL)
  content/
    teacher-guide.mjs
    quick-start.mjs
    student-guide.mjs
    parent-letter.mjs
    privacy-sheet.mjs
```

Each content file exports a doc object with `en`, `he`, `ar` siblings.
The shape is described in `render.mjs`.

## Generate

```bash
# All 15 PDFs (5 docs × 3 languages)
node scripts/teacher-pdfs/build.mjs

# Just one language
node scripts/teacher-pdfs/build.mjs --en

# Just one doc, all languages
node scripts/teacher-pdfs/build.mjs --doc=teacher-guide

# Combine: one doc, one language
node scripts/teacher-pdfs/build.mjs --doc=privacy-sheet --he
```

Output: `public/docs/<key>-<lang>.pdf` — served as static files by the
Cloudflare Worker.

## Adding a screenshot to a PDF

The first version of each doc uses dashed-border **screenshot placeholders**
where real screenshots will go. To swap in a real image:

1. Drop the PNG/JPG into `scripts/teacher-pdfs/assets/`.
2. In the content file (e.g. `teacher-guide.mjs`), replace the
   `{ type: 'screenshot', ... }` block with `{ type: 'image', src: 'assets/foo.png', caption: '...' }`.
3. Re-run `build.mjs`.

(The `image` block type can be added to `render.mjs` when the first real
asset arrives — until then placeholders document where it should go.)

## Status

- v1 drafts — generated.
- **Privacy sheet — DRAFT, awaiting legal review.** Do not distribute the
  current copy to schools or the MoE until the lawyer signs off.
- HE / AR — first-pass translations; a native-speaker teacher review is
  on the operator task list before the public launch.
