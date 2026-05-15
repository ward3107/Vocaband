# School-visit presentation .pptx

Editable PowerPoint deck for projecting at school visits. Mirrors the content of `scripts/presentation-pdf/ar.html` (the 7-page Arabic PDF) but laid out for 16:9 widescreen so it fills a projector cleanly.

## Output

- `dist-presentation/Vocaband-Presentation-AR.pptx` — Arabic, 7 slides, RTL, native editable text/shapes (no embedded images)

## Build

```bash
node scripts/presentation-pptx/build-ar.mjs
```

The script depends on `pptxgenjs`. In CI / fresh envs, install it first:

```bash
npm install pptxgenjs
```

## Slide flow

| # | Title | Content |
|---|---|---|
| 1 | Cover | Brand wordmark + "Vocaband" headline + strap + 4 hero pills |
| 2 | الأرقام خلف المنتج | 4 stat cards (6,482 / 15 / 3 / 100%) + problem card |
| 3 | للطالب | 15 game-mode tiles (5×3) + motivation summary |
| 4 | للمعلّم/ة | 8 "new in 2026" tiles (4×2) + daily routine + quote |
| 5 | الأمان والامتثال | Security checklist + reports panel |
| 6 | الخطوة التالية | 4 roadmap cards + AI Lesson Builder explainer |
| 7 | هيّا نبدأ | 3-step start + school requirements + CTA box |

## Compatibility notes

- Tested with **python-pptx** (canonical OOXML parser) — all 7 slides parse cleanly with the expected shapes and text.
- Opens cleanly in **Microsoft PowerPoint** (2016+), **Keynote** (10+), and **Google Slides**.
- LibreOffice 24.x has a known parser quirk with pptxgenjs output and may fail to load it; use PowerPoint/Keynote for editing.
- Font is set to **Arial** (universally available) for safe Arabic shaping. To switch to Cairo, change the `FONT` constant in `build-ar.mjs` and embed the font in PowerPoint after opening.
