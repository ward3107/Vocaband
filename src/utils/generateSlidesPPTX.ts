/**
 * generateSlidesPPTX — produces a downloadable .pptx for a topic pack.
 *
 * Lazy-loaded via dynamic import in FreeResourcesView so the ~200 KB
 * pptxgenjs dependency doesn't bloat the initial bundle for teachers
 * who never click the Slides feature.  Same data shape (Word[]) as
 * the HTML generators; same `lang` argument for translation column.
 */
import type { Word } from "../data/vocabulary";

type WorksheetLang = "en" | "he" | "ar";

const TITLE_STRINGS: Record<WorksheetLang, { title: string; subtitle: string; word: string; translation: string }> = {
  en: { title: "English Vocabulary", subtitle: "Vocaband · Free Slides Pack", word: "English", translation: "Translation" },
  he: { title: "אוצר מילים באנגלית", subtitle: "Vocaband · ערכת שקופיות חינם", word: "אנגלית", translation: "תרגום" },
  ar: { title: "المفردات الإنجليزية", subtitle: "Vocaband · حزمة شرائح مجانية", word: "الإنجليزية", translation: "الترجمة" },
};

const getTranslation = (w: Word, lang: WorksheetLang): string =>
  lang === "ar" ? (w.arabic || w.hebrew || "") : lang === "he" ? (w.hebrew || "") : "";

/** Build and trigger the .pptx download.  No preview — Slides decks
 *  are binary, can't render in the iframe-based preview modal. */
export async function downloadSlidesPPTX(
  packName: string,
  words: ReadonlyArray<Word>,
  lang: WorksheetLang,
): Promise<void> {
  // Dynamic import keeps pptxgenjs out of the main bundle until a
  // teacher actually clicks the Slides button.
  const pptxgenModule = await import("pptxgenjs");
  // pptxgenjs ships with both default + named exports depending on
  // bundler; pick whichever is the constructor.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGenJS = (pptxgenModule as any).default ?? (pptxgenModule as any);
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";

  const strings = TITLE_STRINGS[lang];
  const showTranslation = lang !== "en";

  // ─── Title slide ────────────────────────────────────────────────
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: "1E1B4B" };
  titleSlide.addText(packName, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 48, bold: true, color: "FFFFFF",
    align: "center", fontFace: "Calibri",
  });
  titleSlide.addText(strings.title, {
    x: 0.5, y: 3.2, w: 9, h: 0.7,
    fontSize: 24, color: "C7D2FE",
    align: "center", fontFace: "Calibri",
  });
  titleSlide.addText(strings.subtitle, {
    x: 0.5, y: 4.7, w: 9, h: 0.4,
    fontSize: 12, color: "8B5CF6",
    align: "center", fontFace: "Calibri",
  });

  // ─── One slide per word ─────────────────────────────────────────
  for (const word of words) {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    // Decorative gradient bar at the top
    slide.addShape("rect", {
      x: 0, y: 0, w: 10, h: 0.4,
      fill: { color: "6366F1" },
      line: { color: "6366F1" },
    });

    // English word — large, centred
    slide.addText(word.english, {
      x: 0.5, y: 1.5, w: 9, h: 2,
      fontSize: 72, bold: true, color: "1F2937",
      align: "center", fontFace: "Calibri",
    });

    // Translation row (only when teacher chose HE/AR)
    if (showTranslation) {
      const translation = getTranslation(word, lang);
      if (translation) {
        slide.addText(translation, {
          x: 0.5, y: 3.8, w: 9, h: 1,
          fontSize: 36, color: "6366F1",
          align: "center", fontFace: "Calibri",
        });
      }
    }

    // Footer with pack name
    slide.addText(packName, {
      x: 0.5, y: 5.2, w: 9, h: 0.3,
      fontSize: 11, color: "9CA3AF",
      align: "center", fontFace: "Calibri",
    });
  }

  // Trigger the browser download.
  const safeName = packName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_") || "Vocaband";
  await pres.writeFile({ fileName: `${safeName}_Slides.pptx` });
}
