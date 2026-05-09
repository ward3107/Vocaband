import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { freeResourcesT } from "../locales/student/free-resources";
import { TOPIC_PACKS, ALL_WORDS } from "../data/vocabulary";
import { getSentencesForWord } from "../data/sentence-bank";
import { FILLBLANK_SENTENCES } from "../data/sentence-bank-fillblank";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Rocket,
  Loader2,
  Gamepad2,
  CreditCard,
  Grid3x3,
  Search,
  Printer,
  X,
  Settings,
  PencilLine,
  Mic,
  Shuffle,
  ListChecks,
  Hash,
  BookOpen,
  Pencil,
  Layers,
  Palette,
  Heart,
  Sparkles,
  Music,
  Presentation,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import html2pdf from "html2pdf.js";
import qrcode from "qrcode-generator";

type Word = (typeof ALL_WORDS)[number];
type TopicPack = (typeof TOPIC_PACKS)[number];
type Casing = "original" | "lower" | "upper";
type FontSize = "small" | "medium" | "large";
type Orientation = "portrait" | "landscape";
type BingoGridSize = 3 | 5 | 7;
type BingoCardCount = 4 | 8 | 16;

// All export-time options live in one bag so each generator has a single
// trailing parameter and adding a new option doesn't ripple through five
// call sites. Defaults applied in the parent component.
interface WorksheetSettings {
  casing: Casing;
  audioQR: boolean;
  fontSize: FontSize;
  inkSaver: boolean;
  showTranslations: boolean;
  wordsPerPage: number;
  orientation: Orientation;
  bingoGridSize: BingoGridSize;
  bingoCardCount: BingoCardCount;
}

const DEFAULT_SETTINGS: WorksheetSettings = {
  casing: "original",
  audioQR: false,
  fontSize: "medium",
  inkSaver: false,
  showTranslations: true,
  wordsPerPage: 22,
  orientation: "portrait",
  bingoGridSize: 5,
  bingoCardCount: 4,
};

// Many beginning EFL students do not yet recognise that "Apple" and "apple"
// are the same word. Worksheets default to "original" but teachers can flip
// every English token to lowercase or uppercase from the preview modal.
const applyCasing = (s: string, c: Casing): string =>
  c === "lower" ? s.toLowerCase() : c === "upper" ? s.toUpperCase() : s;

const fontSizePt = (f: FontSize): number => (f === "small" ? 10 : f === "large" ? 13 : 11);

// A blank line that takes the same vertical space as text would, so the
// table layout doesn't jump when "Show translations" is off.
const blankLine = (color: string) =>
  `<span style="display:inline-block;border-bottom:1.5px dotted ${color};min-width:30mm;height:0.7em;"></span>`;

const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-purple-500",
  "from-sky-500 to-blue-500",
  "from-lime-500 to-green-500",
  "from-orange-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
];

// ---------- pure helpers ----------

// mulberry32: deterministic PRNG so reopening the preview shows the same layout,
// and a teacher reprinting the same sheet next year gets the same questions.
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getTranslation = (word: Word, lang: string) =>
  lang === "ar" ? word.arabic || word.hebrew : word.hebrew;

const safeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// Audio URL matches src/hooks/useAudio.ts so QR codes resolve to the same
// mp3 the in-app player uses. Students scan with a phone → browser opens
// the audio file → plays. Works even if Vocaband is offline.
const getAudioUrl = (wordId: number): string => {
  const base = import.meta.env.VITE_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/sound/${wordId}.mp3`;
};

// Inline SVG QR — scales without quality loss when html2pdf rasterizes it,
// and prints crisp via native Print. Error level M is the sweet spot for
// scannability at ~15mm (~21×21 modules) on A4 paper.
const qrSvg = (text: string, sizePx: number): string => {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const cellSize = Math.max(2, Math.floor(sizePx / qr.getModuleCount()));
  return qr.createSvgTag({ cellSize, margin: 0, scalable: true });
};

// ---------- shared HTML/CSS base ----------

// One shared stylesheet covers fonts (Inter/Heebo/Cairo via Google Fonts so HE/AR
// glyphs render reliably across machines), the A4 page setup, page-break rules,
// and the .en class that keeps English LTR even on RTL sheets.
// In ink-saver mode the accent collapses to black so colored heads and rules
// still show structure but don't waste toner.
const baseStyles = (lang: string, accent: string, accentDark: string, settings: WorksheetSettings) => {
  const fontStack =
    lang === "he"
      ? "'Heebo', 'Segoe UI', Tahoma, Arial, sans-serif"
      : lang === "ar"
        ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif"
        : "'Inter', 'Segoe UI', Arial, sans-serif";

  const ink = settings.inkSaver;
  const headerAccent = ink ? "#111827" : accent;
  const infoBg = ink ? "#ffffff" : "#f3f4f6";
  const infoBorder = ink ? "1.5px solid #111827" : "0";

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Heebo:wght@400;600;700;800&family=Cairo:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 ${settings.orientation}; margin: 12mm; }
    html, body {
      font-family: ${fontStack};
      line-height: 1.4;
      color: ${ink ? "#000000" : "#1f2937"};
      font-size: ${fontSizePt(settings.fontSize)}pt;
      background: #ffffff;
    }
    .sheet {
      page-break-after: always;
      break-after: page;
      padding: 0;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .no-break, table, tr, .practice-box, .flashcard, .bingo-card, .word-item, .translation-item, .ws-row {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .en {
      direction: ltr;
      unicode-bidi: isolate;
      text-align: left;
    }
    .header-bar {
      text-align: center;
      margin-bottom: 6mm;
      padding-bottom: 4mm;
      border-bottom: 3px solid ${headerAccent};
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6mm;
      margin-bottom: 3mm;
    }
    .logo {
      font-size: 18pt;
      font-weight: 800;
      color: ${headerAccent};
    }
    .topic-icon { font-size: 28pt; ${ink ? "filter: grayscale(1);" : ""} }
    .topic-title {
      font-size: 16pt;
      font-weight: 800;
      color: ${ink ? "#000000" : accentDark};
    }
    .word-count { font-size: 10pt; color: #6b7280; font-weight: 600; }
    .footer {
      text-align: center;
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
    }
    .info-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4mm;
      margin-bottom: 5mm;
      padding: 3mm 4mm;
      background: ${infoBg};
      border: ${infoBorder};
      border-radius: 6px;
    }
    .info-field { display: flex; flex-direction: column; }
    .info-label { font-size: 9pt; font-weight: 700; color: #4b5563; margin-bottom: 1mm; }
    .info-input { border-bottom: 1.5px solid #d1d5db; height: 6mm; }

    /* Native Print (Ctrl/Cmd+P) always renders ink-friendly output regardless
     * of the Ink Saver toggle. The toggle controls the on-screen preview and
     * html2pdf export; the printer should never get coloured backgrounds that
     * print as muddy grey on a school photocopier. Teachers shouldn't have to
     * remember to enable a setting to print cleanly. */
    @media print {
      html, body { background: #ffffff !important; color: #000000 !important; }
      *, *::before, *::after {
        background: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
      }
      /* Re-establish white element fills lost by the universal reset */
      .practice-box, .practice-section, .answer-cell, .word-bank, .word-bank-item,
      .word-list-section, .word-list-item, .bingo-card, .bingo-cell, .callers-section,
      .callers-row, .sentence-item, .flashcard-front, .flashcard-back, .instructions,
      .info-row, .ws-info-row, .ws-wordlist {
        background: #ffffff !important;
      }
      /* Coloured accents collapse to black so headings + numbers stay legible */
      .logo, .topic-title, .topic-icon, .practice-title, .practice-label,
      .word-bank-title, .word-list-title, .ws-wordlist-title, .callers-title,
      .bingo-card-title, .word-num, .word-list-num, .ws-word-num, .callers-num,
      .answer-num, .sentence-num, .word-text, .translation-text, .word-bank-en,
      .callers-en, .topic-icon {
        color: #000000 !important;
      }
      .header-bar { border-bottom-color: #000000 !important; }
      .topic-icon { filter: grayscale(1) !important; }
      th { background: #ffffff !important; color: #000000 !important; border-bottom: 2pt solid #000000 !important; }
      tr:nth-child(even) { background: #ffffff !important; }
      td { border-bottom-color: #d1d5db !important; }
      /* Bingo FREE cell stays distinguishable via a thick black border */
      .bingo-cell.free { background: #ffffff !important; color: #000000 !important; border: 3pt solid #000000 !important; font-weight: 800; }
      /* Word search needs the dark frame to read as a grid; cells are white */
      .ws-grid { background: #000000 !important; padding: 1mm !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
      .ws-cell { background: #ffffff !important; color: #000000 !important; }
      .ws-cell.found { background: #ffffff !important; color: #000000 !important; text-decoration: underline; font-weight: 800; }
      /* Sentence-builder blank stays bold black instead of accent colour */
      .sentence-text .blank { color: #000000 !important; }
      /* QR codes and the caller's checkboxes are part of the worksheet
       * structure — force them to print as ink even on "economy" mode */
      svg, .callers-checkbox, .ws-grid {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
      .callers-checkbox { border: 1.5pt solid #000000 !important; }
    }

    /* On-screen preview — same HTML, paper-card layout in the iframe.
     * Print rules above are untouched, so html2pdf and Ctrl/Cmd+P keep
     * pixel-accurate A4 output. The .voca-active toggle is driven by a
     * postMessage script appended in htmlDoc(); first-of-type is the
     * fallback when JS hasn't run yet so the user never sees blank space. */
    @media screen {
      html, body { background: #f3f4f6; }
      body { padding: 12px; min-height: 100vh; }
      .sheet {
        background: #ffffff;
        max-width: 820px;
        margin: 0 auto 16px;
        padding: 20px 28px;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        display: none;
      }
      .sheet:first-of-type { display: block; }
      body[data-voca-page-ready] .sheet { display: none; }
      body[data-voca-page-ready] .sheet.voca-active { display: block; }
      .header-bar { margin-bottom: 14px; padding-bottom: 10px; }
      .footer { margin-top: 14px; padding-top: 8px; font-size: 10px; }
    }
    @media screen and (max-width: 720px) {
      body { padding: 8px; }
      .sheet { padding: 14px 16px; border-radius: 8px; }
      .info-row { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
      .practice-grid,
      .pair-grid,
      .word-list-grid,
      .answer-grid,
      .word-bank-grid,
      .ws-info-row,
      .callers-grid,
      .cards-grid,
      .ws-content {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }
    }
    @media screen and (max-width: 480px) {
      body { padding: 4px; }
      .sheet { padding: 10px 12px; }
    }
  `;
};

const htmlDoc = ({
  lang,
  title,
  styles,
  body,
}: {
  lang: string;
  title: string;
  styles: string;
  body: string;
}) => {
  const dir = lang === "he" || lang === "ar" ? "rtl" : "ltr";
  // Page-nav runtime: parent (PreviewModal) drives which .sheet is visible
  // on screen via postMessage. Print and PDF export bypass this entirely
  // because @media print and html2pdf both ignore display:none-by-screen-rule
  // — every page still goes onto paper.
  const pageNavScript = `
    (function () {
      var sheets = document.querySelectorAll('.sheet');
      function setPage(n) {
        var idx = Math.max(1, Math.min(sheets.length, n)) - 1;
        for (var i = 0; i < sheets.length; i++) {
          sheets[i].classList.toggle('voca-active', i === idx);
        }
      }
      document.body.dataset.vocaPageReady = '1';
      setPage(1);
      window.addEventListener('message', function (e) {
        var d = e.data;
        if (d && d.type === 'voca:setPage') setPage(d.page);
      });
      // Tell the parent how many pages there are so it can render the counter.
      try {
        window.parent.postMessage({ type: 'voca:pages', count: sheets.length }, '*');
      } catch (_) {}
    })();
  `;
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${styles}</style>
</head>
<body>${body}<script>${pageNavScript}</script></body>
</html>`;
};

// Shared header used by every sheet's first page.
const sheetHeader = (pack: TopicPack, subtitle: string) => `
  <div class="header-bar no-break">
    <div class="header-row">
      <div class="logo">📚 Vocaband</div>
      <div class="topic-icon">${pack.icon}</div>
      <div class="word-count">${escapeHtml(subtitle)}</div>
    </div>
    <div class="topic-title">${escapeHtml(pack.name)}</div>
  </div>
`;

const sheetFooter = (pageIndex: number, pageCount: number, pageLabel: string) => `
  <div class="footer">
    © ${new Date().getFullYear()} Vocaband • www.vocaband.com &nbsp;•&nbsp; ${escapeHtml(pageLabel)} ${pageIndex} / ${pageCount}
  </div>
`;

// ---------- generators ----------

const generateWorksheetHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations, wordsPerPage } = settings;
  const t = {
    en: { title: "Vocabulary Worksheet", word: "English", translation: "Translation", practice: "Practice Writing", name: "Name:", date: "Date:", school: "School:", className: "Class:", page: "Page", listen: "Listen" },
    he: { title: "גיליון עבודה - אוצר מילים", word: "אנגלית", translation: "תרגום", practice: "תרגול כתיבה", name: "שם:", date: "תאריך:", school: "בית ספר:", className: "כיתה:", page: "עמוד", listen: "הקשבה" },
    ar: { title: "ورقة عمل - المفردات", word: "الإنجليزية", translation: "الترجمة", practice: "تمارين الكتابة", name: "الاسم:", date: "التاريخ:", school: "المدرسة:", className: "الصف:", page: "صفحة", listen: "استمع" },
  }[lang as "en" | "he" | "ar"] || undefined;
  const s = t || { title: "Vocabulary Worksheet", word: "English", translation: "Translation", practice: "Practice Writing", name: "Name:", date: "Date:", school: "School:", className: "Class:", page: "Page", listen: "Listen" };

  const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : lang === "ar" ? "ar-SA" : "en-US");
  const ROWS_PER_PAGE = wordsPerPage;
  const PRACTICE_PER_PAGE = 9;

  const tablePages = chunk(words, ROWS_PER_PAGE);
  const practicePages = chunk(words, PRACTICE_PER_PAGE);
  const totalPages = tablePages.length + practicePages.length;

  const thBg = inkSaver
    ? "background: #ffffff; color: #000000; border-bottom: 2px solid #000000;"
    : "background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white;";
  const evenRowBg = inkSaver ? "transparent" : "#faf7ff";
  const numColor = inkSaver ? "#000000" : "#8b5cf6";
  const wordColor = inkSaver ? "#000000" : "#7c3aed";
  const practiceBg = inkSaver ? "#ffffff" : "#fef3c7";
  const practiceBorder = inkSaver ? "1.5px solid #000000" : "2px dashed #f59e0b";
  const practiceTitleColor = inkSaver ? "#000000" : "#92400e";
  const practiceLabelColor = inkSaver ? "#000000" : "#7c3aed";

  const styles =
    baseStyles(lang, "#8b5cf6", "#7c3aed", settings) +
    `
    table { width: 100%; border-collapse: collapse; }
    th { ${thBg} padding: 3mm 2mm; font-weight: 700; text-align: start; }
    th.num, td.num { width: 8%; text-align: center; }
    th.qr, td.qr { width: 14%; text-align: center; }
    td { padding: 2.5mm 2mm; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    tr:nth-child(even) { background: ${evenRowBg}; }
    td.num { font-weight: 700; color: ${numColor}; }
    td.word { font-weight: 600; color: ${wordColor}; }
    .qr-cell svg { display: block; width: 14mm; height: 14mm; margin: 0 auto; }
    .practice-section { padding: 5mm; background: ${practiceBg}; border-radius: 8px; border: ${practiceBorder}; }
    .practice-title { font-size: 14pt; font-weight: 800; color: ${practiceTitleColor}; margin-bottom: 4mm; text-align: center; }
    .practice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .practice-box { border: 1.5px solid #d1d5db; border-radius: 6px; padding: 3mm; background: white; min-height: 22mm; display: flex; flex-direction: column; }
    .practice-label { font-size: 0.95em; color: ${practiceLabelColor}; font-weight: 700; margin-bottom: 2mm; }
    .practice-input { border-bottom: 1.5px dotted #9ca3af; padding: 1.5mm 0; min-height: 5mm; font-size: 0.85em; }
    .practice-input.en::before { content: "EN: "; color: #9ca3af; font-size: 0.85em; }
    .practice-input.tr::before { content: "${lang === "he" ? "תרגום: " : lang === "ar" ? "الترجمة: " : "Translation: "}"; color: #9ca3af; font-size: 0.85em; }
  `;

  const tablePagesHTML = tablePages
    .map((rows, pageIdx) => {
      const startIdx = pageIdx * ROWS_PER_PAGE;
      const isFirst = pageIdx === 0;
      return `
      <section class="sheet">
        ${sheetHeader(pack, `${words.length} ${lang === "he" ? "מילים" : lang === "ar" ? "كلمة" : "words"}`)}
        ${isFirst
          ? `<div class="info-row no-break">
              <div class="info-field"><span class="info-label">${escapeHtml(s.name)}</span><div class="info-input"></div></div>
              <div class="info-field"><span class="info-label">${escapeHtml(s.date)}</span><div class="info-input">${today}</div></div>
              <div class="info-field"><span class="info-label">${escapeHtml(s.school)}</span><div class="info-input"></div></div>
              <div class="info-field"><span class="info-label">${escapeHtml(s.className)}</span><div class="info-input"></div></div>
            </div>`
          : ""}
        <table>
          <thead><tr>
            <th class="num">#</th>
            <th>${escapeHtml(s.word)}</th>
            <th>${escapeHtml(s.translation)}</th>
            ${audioQR ? `<th class="qr">🔊 ${escapeHtml(s.listen)}</th>` : ""}
          </tr></thead>
          <tbody>
            ${rows
              .map(
                (w, i) => `
              <tr>
                <td class="num">${startIdx + i + 1}</td>
                <td class="word"><span class="en">${escapeHtml(applyCasing(w.english, casing))}</span></td>
                <td>${showTranslations ? escapeHtml(getTranslation(w, lang)) : blankLine("#9ca3af")}</td>
                ${audioQR ? `<td class="qr qr-cell">${qrSvg(getAudioUrl(w.id), 50)}</td>` : ""}
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        ${sheetFooter(pageIdx + 1, totalPages, s.page)}
      </section>`;
    })
    .join("");

  const practicePagesHTML = practicePages
    .map((rows, pageIdx) => {
      const startIdx = pageIdx * PRACTICE_PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, escapeHtml(s.practice))}
        <div class="practice-section">
          <div class="practice-title">✏️ ${escapeHtml(s.practice)}</div>
          <div class="practice-grid">
            ${rows
              .map(
                (_, i) => `
              <div class="practice-box">
                <div class="practice-label">${startIdx + i + 1}.</div>
                <div class="practice-input en"></div>
                <div class="practice-input tr"></div>
              </div>`,
              )
              .join("")}
          </div>
        </div>
        ${sheetFooter(tablePages.length + pageIdx + 1, totalPages, s.page)}
      </section>`;
    })
    .join("");

  return htmlDoc({
    lang,
    title: `${pack.name} — ${s.title}`,
    styles,
    body: tablePagesHTML + practicePagesHTML,
  });
};

const generateMatchingExerciseHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver } = settings;
  const t = {
    en: { title: "Matching Exercise", instructions: "Write the number of the correct English word next to each translation.", englishWords: "English Words", translations: "Translations", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "תרגיל התאמה", instructions: "כתבו את מספר המילה הנכונה באנגלית ליד כל תרגום.", englishWords: "מילים באנגלית", translations: "תרגומים", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "تمرين المطابقة", instructions: "اكتب رقم الكلمة الإنجليزية الصحيحة بجانب كل ترجمة.", englishWords: "الكلمات الإنجليزية", translations: "الترجمات", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Matching Exercise", instructions: "Write the number of the correct English word next to each translation.", englishWords: "English Words", translations: "Translations", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" };

  const PER_PAGE = 18;
  const groups = chunk(words, PER_PAGE);
  const totalPages = groups.length + 1; // + answer key

  const wordItemBg = inkSaver ? "#ffffff" : "#f0fdf4";
  const wordItemBorder = inkSaver ? "#000000" : "#10b981";
  const trItemBg = inkSaver ? "#ffffff" : "#fef3c7";
  const trItemBorder = inkSaver ? "#000000" : "#f59e0b";
  const trTextColor = inkSaver ? "#000000" : "#92400e";
  const accentColor = inkSaver ? "#000000" : "#10b981";
  const accentDark = inkSaver ? "#000000" : "#047857";
  const instructionsBg = inkSaver ? "#ffffff" : "#ecfdf5";

  const styles =
    baseStyles(lang, "#10b981", "#047857", settings) +
    `
    .instructions { background: ${instructionsBg}; border: 2px solid ${accentColor}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .section-title { font-size: 1.1em; font-weight: 800; color: ${accentDark}; margin: 5mm 0 3mm; padding-bottom: 1mm; border-bottom: 1.5px solid ${inkSaver ? "#d1d5db" : "#d1fae5"}; }
    .pair-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .word-item { display: flex; align-items: center; gap: 2mm; padding: 2.5mm 3mm; background: ${wordItemBg}; border: 1px solid ${wordItemBorder}; border-radius: 5px; }
    .word-num { font-weight: 800; color: ${accentColor}; min-width: 7mm; }
    .word-text { font-weight: 600; color: ${accentDark}; flex: 1; }
    .word-qr svg { display: block; width: 11mm; height: 11mm; }
    .translation-item { display: flex; justify-content: space-between; align-items: center; padding: 2.5mm 3mm; background: ${trItemBg}; border: 1px solid ${trItemBorder}; border-radius: 5px; gap: 3mm; }
    .translation-text { font-weight: 600; color: ${trTextColor}; }
    .number-box { min-width: 12mm; height: 7mm; border: 1.5px solid #6b7280; border-radius: 4px; }
    .answer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
    .answer-cell { display: flex; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#f9fafb"}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 4px; font-size: 0.9em; }
    .answer-num { font-weight: 800; color: ${accentColor}; min-width: 6mm; }
  `;

  const pageHTML = groups
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      const numbered = group.map((w, i) => ({ word: w, number: startIdx + i + 1 }));
      const shuffled = seededShuffle(numbered, hashString(pack.name) ^ pageIdx);

      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0
          ? `<div class="instructions">✏️ ${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
             </div>`
          : ""}
        <div class="section-title">📝 ${escapeHtml(t.englishWords)}</div>
        <div class="pair-grid">
          ${numbered
            .map(
              (n) => `
            <div class="word-item">
              <span class="word-num">${n.number}.</span>
              <span class="word-text en">${escapeHtml(applyCasing(n.word.english, casing))}</span>
              ${audioQR ? `<span class="word-qr">${qrSvg(getAudioUrl(n.word.id), 40)}</span>` : ""}
            </div>`,
            )
            .join("")}
        </div>
        <div class="section-title">✏️ ${escapeHtml(t.translations)}</div>
        <div class="pair-grid">
          ${shuffled
            .map(
              (n) => `
            <div class="translation-item">
              <span class="translation-text">${escapeHtml(getTranslation(n.word, lang))}</span>
              <div class="number-box"></div>
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  const answerKeyHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="section-title">🔑 ${escapeHtml(t.answerKey)}</div>
      <div class="answer-grid">
        ${words
          .map(
            (w, i) => `
          <div class="answer-cell">
            <span class="answer-num">${i + 1}.</span>
            <span class="en">${escapeHtml(applyCasing(w.english, casing))}</span>
            <span style="color:#6b7280;">→ ${escapeHtml(getTranslation(w, lang))}</span>
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({
    lang,
    title: `${pack.name} — ${t.title}`,
    styles,
    body: pageHTML + answerKeyHTML,
  });
};

const generateFlashcardsHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Flashcards", instructions: "Cut along the solid lines. Fold along the dashed line — English on the front, translation on the back.", english: "English", translation: "Translation", page: "Page" },
    he: { title: "כרטיסיות", instructions: "גזרו לאורך הקווים המלאים. קפלו לאורך הקו המקווקו — אנגלית בקדמה, תרגום בגב.", english: "אנגלית", translation: "תרגום", page: "עמוד" },
    ar: { title: "بطاقات تعليمية", instructions: "قص على طول الخطوط المتصلة. اطوِ على الخط المتقطع — الإنجليزية أمامًا والترجمة خلفًا.", english: "الإنجليزية", translation: "الترجمة", page: "صفحة" },
  }[lang as "en" | "he" | "ar"] || { title: "Flashcards", instructions: "Cut along the solid lines. Fold along the dashed line — English on the front, translation on the back.", english: "English", translation: "Translation", page: "Page" };

  const PER_PAGE = 6;
  const pages = chunk(words, PER_PAGE);
  const totalPages = pages.length;

  const cardBorder = inkSaver ? "#000000" : "#93c5fd";
  const backBorder = inkSaver ? "#000000" : "#fcd34d";
  const frontBg = inkSaver ? "#ffffff" : "linear-gradient(135deg, #dbeafe, #eff6ff)";
  const backBg = inkSaver ? "#ffffff" : "linear-gradient(135deg, #fef3c7, #fef9e7)";
  const accentColor = inkSaver ? "#000000" : "#3b82f6";
  const accentDark = inkSaver ? "#000000" : "#1e40af";

  const styles =
    baseStyles(lang, "#3b82f6", "#1d4ed8", settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#eff6ff"}; border: 2px solid ${accentColor}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; margin-top: 4mm; }
    .flashcard { display: flex; flex-direction: column; height: 78mm; }
    .flashcard-front, .flashcard-back { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid ${cardBorder}; border-radius: 8px; padding: 5mm; text-align: center; position: relative; }
    .flashcard-front { background: ${frontBg}; }
    .flashcard-back { background: ${backBg}; border-color: ${backBorder}; }
    .flashcard-number { position: absolute; top: 2mm; ${lang === "he" || lang === "ar" ? "left" : "right"}: 2mm; font-size: 0.85em; font-weight: 800; color: #6b7280; background: white; padding: 1mm 3mm; border-radius: 999px; border: 1px solid #d1d5db; }
    .flashcard-word { font-size: 1.6em; font-weight: 800; color: ${inkSaver ? "#000000" : "#1f2937"}; margin: 3mm 0; }
    .flashcard-hint { font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .fold-line { height: 0; border-top: 1.5px dashed #6b7280; margin: 2mm 0; }
    .flashcard-qr { position: absolute; top: 2mm; ${lang === "he" || lang === "ar" ? "right" : "left"}: 2mm; }
    .flashcard-qr svg { display: block; width: 12mm; height: 12mm; background: white; padding: 1mm; border-radius: 3px; }
  `;

  const pagesHTML = pages
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      const cards = group
        .map(
          (w, i) => `
        <div class="flashcard no-break">
          <div class="flashcard-front">
            <div class="flashcard-number">${startIdx + i + 1}</div>
            ${audioQR ? `<div class="flashcard-qr">${qrSvg(getAudioUrl(w.id), 45)}</div>` : ""}
            <div class="flashcard-word en">${escapeHtml(applyCasing(w.english, casing))}</div>
            <div class="flashcard-hint">${escapeHtml(t.english)}</div>
          </div>
          <div class="fold-line"></div>
          <div class="flashcard-back">
            <div class="flashcard-number">${startIdx + i + 1}</div>
            <div class="flashcard-word">${showTranslations ? escapeHtml(getTranslation(w, lang)) : blankLine("#9ca3af")}</div>
            <div class="flashcard-hint">${escapeHtml(t.translation)}</div>
          </div>
        </div>`,
        )
        .join("");

      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0 ? `<div class="instructions">✂️ ${escapeHtml(t.instructions)}</div>` : ""}
        <div class="cards-grid">${cards}</div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: pagesHTML });
};

const generateBingoCardsHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations, bingoGridSize, bingoCardCount } = settings;
  const t = {
    en: { title: "Bingo Cards", instructions: "Teacher calls out English words; students mark the matching translation. Win by completing a full row, column, or diagonal!", free: "FREE", wordList: "Word List", card: "Card", page: "Page", callersTitle: "Caller's Checklist", callersInstructions: "Read these English words to the class in any order. Tick each word as you call it." },
    he: { title: "כרטיסי בינגו", instructions: "המורה אומרת מילים באנגלית, התלמידים מסמנים את התרגום. מנצחים על-ידי השלמת שורה, טור או אלכסון מלא!", free: "חינם", wordList: "רשימת מילים", card: "כרטיס", page: "עמוד", callersTitle: "רשימת הקראה למורה", callersInstructions: "הקריאו לתלמידים את המילים באנגלית בכל סדר. סמנו כל מילה אחרי שהקראתם אותה." },
    ar: { title: "بطاقات البينغو", instructions: "يقول المعلم الكلمات بالإنجليزية، ويضع الطلاب علامة على الترجمة. الفوز بإكمال صف أو عمود أو قطر كامل!", free: "مجاني", wordList: "قائمة الكلمات", card: "بطاقة", page: "صفحة", callersTitle: "قائمة المعلم للنداء", callersInstructions: "اقرأ هذه الكلمات الإنجليزية للصف بأي ترتيب. ضع علامة على كل كلمة بعد قراءتها." },
  }[lang as "en" | "he" | "ar"] || { title: "Bingo Cards", instructions: "Teacher calls out English words; students mark the matching translation.", free: "FREE", wordList: "Word List", card: "Card", page: "Page", callersTitle: "Caller's Checklist", callersInstructions: "Read these English words to the class in any order. Tick each word as you call it." };

  // Cells per card depends on grid size. Centre cell is "free" only on odd
  // grids (3, 5, 7) — even grids skip the free centre because there isn't
  // one. cellsToFill = total - (1 if centre exists).
  const totalCells = bingoGridSize * bingoGridSize;
  const hasCentre = bingoGridSize % 2 === 1;
  const cellsToFill = hasCentre ? totalCells - 1 : totalCells;

  // If the pack is smaller than the cards need, repeat words so 7×7 grids
  // still render. Better than crashing on small packs (e.g. Days & Months).
  const pool = words.length >= cellsToFill
    ? words
    : Array.from({ length: cellsToFill }, (_, i) => words[i % words.length]);

  // Bigger grids → smaller cells → smaller font so HE/AR translations don't
  // overflow. Tuned to fit two-word translations without truncation at A4.
  const cellMinHeight = bingoGridSize === 3 ? "50mm" : bingoGridSize === 5 ? "28mm" : "18mm";
  const cellFontSize = bingoGridSize === 3 ? "1.4em" : bingoGridSize === 5 ? "1em" : "0.75em";

  const totalPages = bingoCardCount + 2; // cards + word list + caller's checklist

  const accentColor = inkSaver ? "#000000" : "#f59e0b";
  const accentDark = inkSaver ? "#000000" : "#d97706";
  const cardBg = inkSaver ? "#ffffff" : "#fffbeb";
  const cardBorder = inkSaver ? "#000000" : "#fbbf24";
  const cellBorder = inkSaver ? "#6b7280" : "#fcd34d";
  const cellTextColor = inkSaver ? "#000000" : "#78350f";
  const freeBg = inkSaver ? "#000000" : "linear-gradient(135deg, #fbbf24, #f59e0b)";
  const freeColor = "#ffffff";
  const wordListBg = inkSaver ? "#ffffff" : "#f3f4f6";
  const wordListItemBg = inkSaver ? "#ffffff" : "white";
  const wordListItemBorder = inkSaver ? "1px solid #d1d5db" : "0";

  const styles =
    baseStyles(lang, "#f59e0b", "#d97706", settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#fffbeb"}; border: 2px solid ${accentColor}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${inkSaver ? "#000000" : "#92400e"}; font-weight: 600; }
    .bingo-card { border: 2px solid ${cardBorder}; border-radius: 10px; padding: 5mm; background: ${cardBg}; margin: 4mm 0; }
    .bingo-card-title { text-align: center; font-weight: 800; color: ${accentDark}; margin-bottom: 4mm; font-size: 1.3em; }
    .bingo-grid { display: grid; grid-template-columns: repeat(${bingoGridSize}, 1fr); gap: 2mm; }
    .bingo-cell { aspect-ratio: 1 / 1; min-height: ${cellMinHeight}; display: flex; align-items: center; justify-content: center; border: 1.5px solid ${cellBorder}; border-radius: 6px; background: white; font-size: ${cellFontSize}; font-weight: 700; color: ${cellTextColor}; text-align: center; padding: 1.5mm; line-height: 1.15; word-break: break-word; overflow: hidden; }
    .bingo-cell.free { background: ${freeBg}; color: ${freeColor}; }
    .word-list-section { padding: 5mm; background: ${wordListBg}; border-radius: 8px; ${inkSaver ? "border: 1.5px solid #000000;" : ""} }
    .word-list-title { font-weight: 800; color: ${inkSaver ? "#000000" : "#374151"}; margin-bottom: 4mm; text-align: center; font-size: 1.1em; }
    .word-list-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
    .word-list-item { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; background: ${wordListItemBg}; border: ${wordListItemBorder}; border-radius: 4px; font-size: 0.9em; }
    .word-list-num { font-weight: 800; color: ${accentColor}; min-width: 6mm; }
    .word-list-text { flex: 1; }
    .word-list-qr svg { display: block; width: 9mm; height: 9mm; }
    .callers-section { padding: 5mm; background: ${inkSaver ? "#ffffff" : "#fffbeb"}; border: 1.5px solid ${accentColor}; border-radius: 8px; }
    .callers-title { font-weight: 800; color: ${accentDark}; margin-bottom: 4mm; text-align: center; font-size: 1.1em; }
    .callers-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; }
    .callers-row { display: flex; align-items: center; gap: 3mm; padding: 2mm 3mm; background: ${wordListItemBg}; border: 1px solid ${inkSaver ? "#000000" : "#fcd34d"}; border-radius: 4px; font-size: 0.95em; }
    .callers-checkbox { width: 4.5mm; height: 4.5mm; border: 1.5px solid ${inkSaver ? "#000000" : "#9ca3af"}; border-radius: 2px; flex-shrink: 0; }
    .callers-num { font-weight: 800; color: ${accentColor}; min-width: 7mm; }
    .callers-en { font-weight: 700; color: ${inkSaver ? "#000000" : "#1f2937"}; flex: 1; }
    .callers-tr { color: #6b7280; font-size: 0.85em; }
  `;

  const cardPages = Array.from({ length: bingoCardCount }, (_, cardIdx) => {
    const seed = hashString(pack.name) ^ (cardIdx + 1);
    const picked = seededShuffle(pool, seed).slice(0, cellsToFill);
    const cells: { text: string; free: boolean }[] = [];
    if (hasCentre) {
      const centreIdx = Math.floor(totalCells / 2);
      let nonFreeCursor = 0;
      for (let i = 0; i < totalCells; i++) {
        if (i === centreIdx) {
          cells.push({ text: t.free, free: true });
        } else {
          cells.push({ text: getTranslation(picked[nonFreeCursor++], lang), free: false });
        }
      }
    } else {
      picked.forEach((w) => cells.push({ text: getTranslation(w, lang), free: false }));
    }
    return `
    <section class="sheet">
      ${sheetHeader(pack, t.title)}
      ${cardIdx === 0 ? `<div class="instructions">🎮 ${escapeHtml(t.instructions)}</div>` : ""}
      <div class="bingo-card no-break">
        <div class="bingo-card-title">${escapeHtml(t.card)} ${cardIdx + 1}</div>
        <div class="bingo-grid">
          ${cells.map((c) => `<div class="bingo-cell ${c.free ? "free" : ""}">${escapeHtml(c.text)}</div>`).join("")}
        </div>
      </div>
      ${sheetFooter(cardIdx + 1, totalPages, t.page)}
    </section>`;
  }).join("");

  const wordListPage = `
    <section class="sheet">
      ${sheetHeader(pack, t.wordList)}
      <div class="word-list-section">
        <div class="word-list-title">📝 ${escapeHtml(t.wordList)}</div>
        <div class="word-list-grid">
          ${words
            .map(
              (w, i) => `
            <div class="word-list-item">
              <span class="word-list-num">${i + 1}.</span>
              <span class="word-list-text">
                <span class="en" style="font-weight:600; color:${inkSaver ? "#000000" : "#1f2937"};">${escapeHtml(applyCasing(w.english, casing))}</span>
                ${showTranslations ? `<span style="color:#6b7280;">— ${escapeHtml(getTranslation(w, lang))}</span>` : ""}
              </span>
              ${audioQR ? `<span class="word-list-qr">${qrSvg(getAudioUrl(w.id), 32)}</span>` : ""}
            </div>`,
            )
            .join("")}
        </div>
      </div>
      ${sheetFooter(bingoCardCount + 1, totalPages, t.page)}
    </section>`;

  // Caller's checklist for the teacher: checkbox + numbered word + (optional)
  // translation so they can read either side. Shuffled so the call order
  // varies between print runs without changing the cards' layouts (cards are
  // seeded per-card; this list uses its own seed).
  const callerOrder = seededShuffle(words, hashString(pack.name) ^ 0xca11);
  const callersListPage = `
    <section class="sheet">
      ${sheetHeader(pack, t.callersTitle)}
      <div class="instructions">📣 ${escapeHtml(t.callersInstructions)}</div>
      <div class="callers-section">
        <div class="callers-title">📋 ${escapeHtml(t.callersTitle)}</div>
        <div class="callers-grid">
          ${callerOrder
            .map(
              (w, i) => `
            <div class="callers-row">
              <span class="callers-checkbox"></span>
              <span class="callers-num">${i + 1}.</span>
              <span class="callers-en en">${escapeHtml(applyCasing(w.english, casing))}</span>
              ${showTranslations ? `<span class="callers-tr">${escapeHtml(getTranslation(w, lang))}</span>` : ""}
            </div>`,
            )
            .join("")}
        </div>
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: cardPages + wordListPage + callersListPage });
};

const generateWordSearchHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver } = settings;
  // Word search grids are always one consistent case so the eye can scan the
  // letters as a uniform texture. We honour the toggle: "lower" → all
  // lowercase, otherwise → all uppercase. The word list always matches the
  // grid so students can't think "APPLE" and "Apple" are different words.
  const gridCase: "upper" | "lower" = casing === "lower" ? "lower" : "upper";
  const toGridCase = (s: string) =>
    gridCase === "lower" ? s.toLowerCase() : s.toUpperCase();
  const t = {
    en: { title: "Word Search Puzzle", instructions: "Find the hidden English words. Words can run horizontally, vertically, or diagonally.", wordsToFind: "Words to Find", answerKey: "Answer Key", name: "Name:", date: "Date:", className: "Class:", page: "Page" },
    he: { title: "חיפוש מילים", instructions: "מצאו את כל המילים המוסתרות באנגלית. המילים יכולות להיות אופקיות, אנכיות או אלכסוניות.", wordsToFind: "מילים למציאה", answerKey: "פתרון", name: "שם:", date: "תאריך:", className: "כיתה:", page: "עמוד" },
    ar: { title: "بحث الكلمات", instructions: "ابحث عن جميع الكلمات الإنجليزية المخفية. يمكن أن تكون الكلمات أفقية أو عمودية أو قطرية.", wordsToFind: "الكلمات المطلوبة", answerKey: "مفتاح الإجابة", name: "الاسم:", date: "التاريخ:", className: "الصف:", page: "صفحة" },
  }[lang as "en" | "he" | "ar"] || { title: "Word Search Puzzle", instructions: "Find the hidden English words. Words can run horizontally, vertically, or diagonally.", wordsToFind: "Words to Find", answerKey: "Answer Key", name: "Name:", date: "Date:", className: "Class:", page: "Page" };

  // Cap and filter to letters-only English; sort longer first to improve placement success.
  // Internally we work in uppercase letters; we lowercase at render time when needed.
  const candidates = words
    .map((w) => ({ word: w, letters: w.english.toUpperCase().replace(/[^A-Z]/g, "") }))
    .filter((c) => c.letters.length >= 3 && c.letters.length <= 12)
    .sort((a, b) => b.letters.length - a.letters.length)
    .slice(0, 14);

  const gridSize = 15;
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
  const placements: { word: string; original: string; row: number; col: number; dr: number; dc: number }[] = [];
  const rand = mulberry32(hashString(pack.name) ^ 0xa1b2);
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const placeWord = (letters: string, original: string) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const [dr, dc] = directions[Math.floor(rand() * directions.length)];
      const startRow = Math.floor(rand() * gridSize);
      const startCol = Math.floor(rand() * gridSize);
      const endRow = startRow + dr * (letters.length - 1);
      const endCol = startCol + dc * (letters.length - 1);
      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
      let canPlace = true;
      for (let i = 0; i < letters.length; i++) {
        const r = startRow + dr * i;
        const c = startCol + dc * i;
        if (grid[r][c] !== "" && grid[r][c] !== letters[i]) {
          canPlace = false;
          break;
        }
      }
      if (!canPlace) continue;
      for (let i = 0; i < letters.length; i++) {
        grid[startRow + dr * i][startCol + dc * i] = letters[i];
      }
      placements.push({ word: letters, original, row: startRow, col: startCol, dr, dc });
      return true;
    }
    return false;
  };

  const placedWords: { letters: string; original: string; id: number }[] = [];
  for (const c of candidates) {
    if (placeWord(c.letters, c.word.english)) {
      placedWords.push({ letters: c.letters, original: c.word.english, id: c.word.id });
    }
  }

  const fillerLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "") grid[r][c] = fillerLetters[Math.floor(rand() * fillerLetters.length)];
    }
  }

  // Build a parallel grid that highlights only the placed letters (for the answer key).
  const placedMask: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  for (const p of placements) {
    for (let i = 0; i < p.word.length; i++) {
      placedMask[p.row + p.dr * i][p.col + p.dc * i] = true;
    }
  }

  const accentColor = inkSaver ? "#000000" : "#ec4899";
  const accentDark = inkSaver ? "#000000" : "#9d174d";
  const softBg = inkSaver ? "#ffffff" : "#fdf2f8";
  const softBorder = inkSaver ? "#000000" : "#f9a8d4";
  const gridFrameBg = inkSaver ? "#000000" : "#374151";
  const cellTextColor = inkSaver ? "#000000" : "#374151";
  const foundBg = inkSaver ? "#e5e7eb" : "#fce7f3";
  const foundColor = inkSaver ? "#000000" : "#9d174d";

  const styles =
    baseStyles(lang, "#ec4899", "#db2777", settings) +
    `
    .instructions { background: ${softBg}; border: 2px solid ${accentColor}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .ws-content { display: grid; grid-template-columns: 2fr 1fr; gap: 6mm; align-items: start; }
    .ws-info-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 4mm; padding: 3mm 4mm; background: ${softBg}; border: 1.5px solid ${softBorder}; border-radius: 6px; }
    .ws-info-label { font-size: 0.85em; font-weight: 700; color: ${accentDark}; margin-bottom: 1mm; }
    .ws-info-input { border-bottom: 1.5px solid ${inkSaver ? "#6b7280" : "#f9a8d4"}; height: 6mm; }
    .ws-grid { display: grid; grid-template-columns: repeat(${gridSize}, 1fr); gap: 0.5mm; background: ${gridFrameBg}; padding: 1mm; border-radius: 6px; }
    .ws-cell { aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; background: white; font-size: 1.1em; font-weight: 700; color: ${cellTextColor}; }
    .ws-cell.found { background: ${foundBg}; color: ${foundColor}; }
    .ws-wordlist { background: ${softBg}; border: 1.5px solid ${softBorder}; border-radius: 6px; padding: 4mm; }
    .ws-wordlist-title { font-weight: 800; color: ${accentDark}; margin-bottom: 3mm; text-align: center; }
    .ws-word { display: flex; align-items: center; gap: 2mm; padding: 1.5mm 0; }
    .ws-word-num { font-weight: 800; color: ${accentColor}; min-width: 6mm; }
    .ws-word-text { flex: 1; }
    .ws-word-qr svg { display: block; width: 9mm; height: 9mm; }
  `;

  const cellHTML = (highlight: boolean) =>
    grid
      .map((row, r) =>
        row
          .map(
            (cell, c) =>
              `<div class="ws-cell${highlight && placedMask[r][c] ? " found" : ""}">${escapeHtml(toGridCase(cell))}</div>`,
          )
          .join(""),
      )
      .join("");

  const wordListHTML = placedWords
    .map(
      (w, i) => `
    <div class="ws-word">
      <span class="ws-word-num">${i + 1}.</span>
      <span class="ws-word-text en" style="font-weight:600; color:#1f2937;">${escapeHtml(toGridCase(w.original))}</span>
      ${audioQR ? `<span class="ws-word-qr">${qrSvg(getAudioUrl(w.id), 32)}</span>` : ""}
    </div>`,
    )
    .join("");

  const body = `
    <section class="sheet">
      ${sheetHeader(pack, t.title)}
      <div class="instructions">🔍 ${escapeHtml(t.instructions)}</div>
      <div class="ws-info-row no-break">
        <div class="info-field"><span class="ws-info-label">${escapeHtml(t.name)}</span><div class="ws-info-input"></div></div>
        <div class="info-field"><span class="ws-info-label">${escapeHtml(t.date)}</span><div class="ws-info-input"></div></div>
        <div class="info-field"><span class="ws-info-label">${escapeHtml(t.className)}</span><div class="ws-info-input"></div></div>
      </div>
      <div class="ws-content">
        <div class="ws-grid">${cellHTML(false)}</div>
        <div class="ws-wordlist">
          <div class="ws-wordlist-title">${escapeHtml(t.wordsToFind)}</div>
          ${wordListHTML}
        </div>
      </div>
      ${sheetFooter(1, 2, t.page)}
    </section>
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="ws-content">
        <div class="ws-grid">${cellHTML(true)}</div>
        <div class="ws-wordlist">
          <div class="ws-wordlist-title">🔑 ${escapeHtml(t.answerKey)}</div>
          ${wordListHTML}
        </div>
      </div>
      ${sheetFooter(2, 2, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body });
};

const generateFillBlankHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Fill in the Blank", instructions: "Use the words from the word bank to fill in each blank.", wordBank: "Word Bank", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:", className: "Class:" },
    he: { title: "השלמת חסר", instructions: "השתמשו במילים מבנק המילים כדי להשלים כל חסר.", wordBank: "בנק מילים", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:", className: "כיתה:" },
    ar: { title: "املأ الفراغ", instructions: "استخدم الكلمات من بنك الكلمات لملء كل فراغ.", wordBank: "بنك الكلمات", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:", className: "الصف:" },
  }[lang as "en" | "he" | "ar"] || { title: "Fill in the Blank", instructions: "Use the words from the word bank to fill in each blank.", wordBank: "Word Bank", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:", className: "Class:" };

  const BLANK = "____________";
  const seedBase = hashString(pack.name);

  // Source order: (1) the curated FILLBLANK_SENTENCES file generated by
  // scripts/generate-fillblank-sentences.ts — every entry is validated to
  // contain the target word and read like a natural EFL example.
  // (2) sentence-bank.ts hand-written / inline / POS templates, but only
  // when they actually contain the target word verbatim.
  // (3) last-resort templates so even unmapped words still produce a valid
  // sentence with a real blank instead of the awful "Use the word X" prompt.
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const buildItem = (word: Word, idx: number): { word: Word; sentence: string } => {
    const re = new RegExp(`\\b${escapeRe(word.english)}\\b`, "i");

    const curated = FILLBLANK_SENTENCES.get(word.id);
    if (curated && re.test(curated)) {
      return { word, sentence: curated.replace(re, BLANK) };
    }

    const candidates = getSentencesForWord(word, 2);
    const fitting = candidates.filter((s) => re.test(s));
    if (fitting.length > 0) {
      const picked = fitting[(seedBase + idx) % fitting.length];
      return { word, sentence: picked.replace(re, BLANK) };
    }
    const fallbacks = [`I see the ${word.english} every day`, `She likes the ${word.english} a lot`, `They use ${word.english} in the lesson`];
    const picked = fallbacks[(seedBase + idx) % fallbacks.length];
    return { word, sentence: picked.replace(re, BLANK) };
  };

  const items = words.map(buildItem);
  const bank = seededShuffle(words, seedBase ^ 0xbeef);

  const PER_PAGE = 8;
  const sentencePages = chunk(items, PER_PAGE);
  const totalPages = sentencePages.length + 1; // + answer key

  const accent = inkSaver ? "#000000" : "#0ea5e9";
  const accentDark = inkSaver ? "#000000" : "#0369a1";
  const softBg = inkSaver ? "#ffffff" : "#f0f9ff";
  const bankBg = inkSaver ? "#ffffff" : "#f0f9ff";
  const bankBorder = inkSaver ? "#000000" : "#7dd3fc";
  const sentenceBg = inkSaver ? "#ffffff" : "#f9fafb";

  const styles =
    baseStyles(lang, "#0ea5e9", "#0369a1", settings) +
    `
    .instructions { background: ${softBg}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .word-bank { background: ${bankBg}; border: 2px solid ${bankBorder}; border-radius: 8px; padding: 4mm; margin: 4mm 0; }
    .word-bank-title { font-weight: 800; color: ${accentDark}; margin-bottom: 3mm; text-align: center; font-size: 1.05em; }
    .word-bank-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
    .word-bank-item { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; background: white; border: 1px solid ${bankBorder}; border-radius: 4px; font-size: 0.95em; }
    .word-bank-en { font-weight: 700; color: ${inkSaver ? "#000000" : "#1f2937"}; flex: 1; }
    .word-bank-tr { color: #6b7280; font-size: 0.85em; }
    .word-bank-qr svg { display: block; width: 9mm; height: 9mm; }
    .sentence-list { display: flex; flex-direction: column; gap: 3mm; margin-top: 4mm; }
    .sentence-item { display: flex; gap: 3mm; padding: 3mm 4mm; background: ${sentenceBg}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 6px; min-height: 12mm; align-items: center; }
    .sentence-num { font-weight: 800; color: ${accent}; min-width: 8mm; font-size: 1.1em; }
    .sentence-text { flex: 1; line-height: 1.7; }
    .sentence-text .blank { font-weight: 800; letter-spacing: 1px; color: ${accent}; }
    .answer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
    .answer-cell { display: flex; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#f9fafb"}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 4px; font-size: 0.9em; }
    .answer-num { font-weight: 800; color: ${accent}; min-width: 6mm; }
  `;

  // Mark the blank with a span so its color stays even in ink-saver mode
  // and so html2canvas treats it as a single token (no mid-word wrap).
  const renderSentence = (s: string) => escapeHtml(s).replace(BLANK, `<span class="blank">${BLANK}</span>`);

  const wordBankHTML = `
    <div class="word-bank no-break">
      <div class="word-bank-title">📋 ${escapeHtml(t.wordBank)}</div>
      <div class="word-bank-grid">
        ${bank
          .map(
            (w) => `
          <div class="word-bank-item">
            <span class="word-bank-en en">${escapeHtml(applyCasing(w.english, casing))}</span>
            ${showTranslations ? `<span class="word-bank-tr">${escapeHtml(getTranslation(w, lang))}</span>` : ""}
            ${audioQR ? `<span class="word-bank-qr">${qrSvg(getAudioUrl(w.id), 32)}</span>` : ""}
          </div>`,
          )
          .join("")}
      </div>
    </div>`;

  const sentencePagesHTML = sentencePages
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0
          ? `<div class="instructions">✏️ ${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(3, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.className)}</span><div class="info-input"></div></div>
             </div>
             ${wordBankHTML}`
          : ""}
        <div class="sentence-list">
          ${group
            .map(
              (item, i) => `
            <div class="sentence-item no-break">
              <span class="sentence-num">${startIdx + i + 1}.</span>
              <span class="sentence-text en">${renderSentence(item.sentence)}</span>
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  const answerKeyHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="answer-grid">
        ${items
          .map(
            (item, i) => `
          <div class="answer-cell">
            <span class="answer-num">${i + 1}.</span>
            <span class="en" style="font-weight:700;">${escapeHtml(applyCasing(item.word.english, casing))}</span>
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: sentencePagesHTML + answerKeyHTML });
};

const generateSpellingTestHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver } = settings;
  const t = {
    en: { title: "Spelling Test", instructions: "Listen to your teacher and write each word on the correct line.", studentTitle: "✍️ Student Sheet", callerTitle: "📣 Teacher's Caller List", callerInstructions: "Read each English word aloud. Tick it after you've called it.", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "מבחן איות", instructions: "הקשיבו למורה וכתבו כל מילה על השורה הנכונה.", studentTitle: "✍️ דף תלמיד", callerTitle: "📣 רשימת הקראה למורה", callerInstructions: "הקריאו כל מילה בקול. סמנו אחרי שהקראתם.", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "اختبار الإملاء", instructions: "استمع للمعلم واكتب كل كلمة على السطر الصحيح.", studentTitle: "✍️ ورقة الطالب", callerTitle: "📣 قائمة المعلم للنداء", callerInstructions: "اقرأ كل كلمة بصوت عالٍ. ضع علامة بعد قراءتها.", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Spelling Test", instructions: "Listen to your teacher and write each word on the correct line.", studentTitle: "✍️ Student Sheet", callerTitle: "📣 Teacher's Caller List", callerInstructions: "Read each English word aloud. Tick it after you've called it.", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" };

  const PER_PAGE = 20;
  const studentPages = chunk(words, PER_PAGE);
  const totalPages = studentPages.length + 1; // + caller's list

  const lineColor = inkSaver ? "#000000" : "#94a3b8";
  const accent = inkSaver ? "#000000" : "#0ea5e9";
  const accentDark = inkSaver ? "#000000" : "#0369a1";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#f0f9ff"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .spell-grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 8mm; row-gap: 4mm; margin-top: 3mm; }
    .spell-row { display: flex; align-items: baseline; gap: 3mm; padding: 1mm 0; }
    .spell-num { font-weight: 800; color: ${accent}; min-width: 9mm; text-align: end; }
    .spell-line { flex: 1; border-bottom: 1.5px solid ${lineColor}; height: 7mm; }
    .caller-grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 6mm; row-gap: 2mm; margin-top: 3mm; }
    .caller-row { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; border: 1px solid ${inkSaver ? "#000000" : "#e0f2fe"}; border-radius: 4px; background: ${inkSaver ? "#ffffff" : "#f0f9ff"}; }
    .caller-check { width: 4mm; height: 4mm; border: 1.5px solid ${inkSaver ? "#000000" : accent}; border-radius: 2px; flex-shrink: 0; }
    .caller-num { font-weight: 800; color: ${accent}; min-width: 6mm; }
    .caller-en { flex: 1; font-weight: 700; color: ${inkSaver ? "#000000" : accentDark}; }
    .caller-tr { color: #6b7280; font-size: 0.9em; }
    .caller-qr svg { display: block; width: 12mm; height: 12mm; }
  `;

  const studentPagesHTML = studentPages
    .map((rows, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.studentTitle)}
        ${pageIdx === 0
          ? `<div class="instructions">${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
             </div>`
          : ""}
        <div class="spell-grid">
          ${rows
            .map(
              (_, i) => `
            <div class="spell-row no-break">
              <span class="spell-num">${startIdx + i + 1}.</span>
              <div class="spell-line"></div>
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  const callerHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.callerTitle)}
      <div class="instructions">${escapeHtml(t.callerInstructions)}</div>
      <div class="caller-grid">
        ${words
          .map(
            (w, i) => `
          <div class="caller-row no-break">
            <span class="caller-check"></span>
            <span class="caller-num">${i + 1}.</span>
            <span class="caller-en en">${escapeHtml(applyCasing(w.english, casing))}</span>
            <span class="caller-tr">${escapeHtml(getTranslation(w, lang))}</span>
            ${audioQR ? `<span class="caller-qr">${qrSvg(getAudioUrl(w.id), 36)}</span>` : ""}
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: studentPagesHTML + callerHTML });
};

const generateWordScrambleHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Word Scramble", instructions: "Unscramble the letters and write the English word on the line. The translation is given as a hint.", letters: "Scrambled", clue: "Hint", answer: "Your answer", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "ערבוב אותיות", instructions: "סדרו את האותיות וכתבו את המילה באנגלית על השורה. התרגום נתון כרמז.", letters: "מעורבב", clue: "רמז", answer: "התשובה שלך", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "ترتيب الحروف", instructions: "رتب الحروف واكتب الكلمة الإنجليزية على السطر. الترجمة مذكورة كتلميح.", letters: "مخلوط", clue: "تلميح", answer: "إجابتك", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Word Scramble", instructions: "Unscramble the letters and write the English word on the line. The translation is given as a hint.", letters: "Scrambled", clue: "Hint", answer: "Your answer", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" };

  // Filter to single-token alpha words; multi-word entries don't scramble cleanly.
  const eligible = words.filter((w) => /^[a-zA-Z]+$/.test(w.english) && w.english.length >= 3);
  const PER_PAGE = 10;
  const pages = chunk(eligible, PER_PAGE);
  const totalPages = Math.max(1, pages.length) + 1;

  const accent = inkSaver ? "#000000" : "#16a34a";
  const accentDark = inkSaver ? "#000000" : "#15803d";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#f0fdf4"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .scramble-list { display: flex; flex-direction: column; gap: 4mm; margin-top: 3mm; }
    .scramble-row { display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; align-items: center; padding: 3mm 4mm; background: ${inkSaver ? "#ffffff" : "#f8fafc"}; border: 1.5px solid ${inkSaver ? "#000000" : "#d1fae5"}; border-radius: 6px; }
    .scramble-num { font-weight: 800; color: ${accent}; font-size: 1.05em; }
    .scramble-content { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; align-items: center; }
    .scramble-letters { letter-spacing: 4px; font-weight: 800; font-family: 'Courier New', monospace; font-size: 1.15em; color: ${accentDark}; }
    .scramble-tr { color: #6b7280; font-style: italic; font-size: 0.95em; }
    .scramble-answer { display: flex; align-items: baseline; gap: 2mm; margin-top: 2mm; grid-column: 1 / -1; }
    .scramble-answer-label { color: ${accent}; font-weight: 700; font-size: 0.85em; }
    .scramble-answer-line { flex: 1; border-bottom: 1.5px dotted ${inkSaver ? "#000000" : "#94a3b8"}; height: 5mm; }
    .answer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; }
    .answer-cell { display: flex; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#f9fafb"}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 4px; font-size: 0.9em; }
    .answer-num { font-weight: 800; color: ${accent}; min-width: 6mm; }
  `;

  const scrambleWord = (word: string) => {
    const letters = word.split("");
    // Stable seed per-word so the same pack always scrambles identically.
    const shuffled = seededShuffle(letters, hashString(word));
    // If shuffle returned the original (rare for short words), rotate by 1 to ensure it differs.
    if (shuffled.join("") === word && shuffled.length > 1) {
      shuffled.push(shuffled.shift()!);
    }
    return shuffled.join("-").toUpperCase();
  };

  const pagesHTML = pages
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0
          ? `<div class="instructions">${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
             </div>`
          : ""}
        <div class="scramble-list">
          ${group
            .map(
              (w, i) => `
            <div class="scramble-row no-break">
              <span class="scramble-num">${startIdx + i + 1}.</span>
              <div>
                <div class="scramble-content">
                  <span class="scramble-letters en">${escapeHtml(scrambleWord(applyCasing(w.english, casing)))}</span>
                  ${showTranslations ? `<span class="scramble-tr">${escapeHtml(t.clue)}: ${escapeHtml(getTranslation(w, lang))}</span>` : ""}
                </div>
                <div class="scramble-answer">
                  <span class="scramble-answer-label">${escapeHtml(t.answer)}:</span>
                  <span class="scramble-answer-line"></span>
                </div>
              </div>
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  const answerKeyHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="answer-grid">
        ${eligible
          .map(
            (w, i) => `
          <div class="answer-cell">
            <span class="answer-num">${i + 1}.</span>
            <span class="en" style="font-weight:700;">${escapeHtml(applyCasing(w.english, casing))}</span>
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: pagesHTML + answerKeyHTML });
};

const generateVocabQuizHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, inkSaver } = settings;
  const t = {
    en: { title: "Vocabulary Quiz", instructions: "Circle the letter (A, B, C or D) of the correct answer.", part1: "Part 1 — Choose the correct translation", part2: "Part 2 — Choose the correct English word", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:", score: "Score:" },
    he: { title: "מבחן אוצר מילים", instructions: "הקיפו את האות (A, B, C או D) של התשובה הנכונה.", part1: "חלק 1 — בחרו את התרגום הנכון", part2: "חלק 2 — בחרו את המילה הנכונה באנגלית", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:", score: "ציון:" },
    ar: { title: "اختبار المفردات", instructions: "ضع دائرة حول الحرف (A أو B أو C أو D) للإجابة الصحيحة.", part1: "الجزء 1 — اختر الترجمة الصحيحة", part2: "الجزء 2 — اختر الكلمة الإنجليزية الصحيحة", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:", score: "النتيجة:" },
  }[lang as "en" | "he" | "ar"] || { title: "Vocabulary Quiz", instructions: "Circle the letter (A, B, C or D) of the correct answer.", part1: "Part 1 — Choose the correct translation", part2: "Part 2 — Choose the correct English word", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:", score: "Score:" };

  // Half EN→translation, half translation→EN. We split the word list so a
  // student doesn't see the same word answered in both directions.
  const seed = hashString(pack.name);
  const shuffled = seededShuffle(words, seed);
  const half = Math.ceil(shuffled.length / 2);
  const part1Words = shuffled.slice(0, half); // English prompt
  const part2Words = shuffled.slice(half); // Translation prompt

  const accent = inkSaver ? "#000000" : "#7c3aed";
  const accentDark = inkSaver ? "#000000" : "#6d28d9";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#f5f3ff"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .quiz-section-title { font-size: 1.1em; font-weight: 800; color: ${accentDark}; margin: 5mm 0 3mm; padding-bottom: 1mm; border-bottom: 2px solid ${inkSaver ? "#000000" : "#ddd6fe"}; }
    .quiz-list { display: flex; flex-direction: column; gap: 3mm; }
    .quiz-q { padding: 2.5mm 4mm; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 5px; background: ${inkSaver ? "#ffffff" : "#fafafa"}; }
    .quiz-q-prompt { font-weight: 700; color: ${accentDark}; margin-bottom: 2mm; }
    .quiz-q-num { color: ${accent}; font-weight: 800; }
    .quiz-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1mm 5mm; }
    .quiz-option { display: flex; align-items: baseline; gap: 2mm; padding: 0.5mm 0; }
    .quiz-letter { display: inline-block; width: 5mm; height: 5mm; border: 1.5px solid ${inkSaver ? "#000000" : accent}; border-radius: 50%; text-align: center; font-weight: 800; line-height: 4.5mm; font-size: 0.85em; color: ${inkSaver ? "#000000" : accent}; flex-shrink: 0; }
    .quiz-text { color: #1f2937; }
    .answer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
    .answer-cell { display: flex; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#f9fafb"}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 4px; font-size: 0.9em; }
    .answer-num { font-weight: 800; color: ${accent}; min-width: 6mm; }
    .answer-letter { font-weight: 800; color: ${accentDark}; }
  `;

  const LETTERS = ["A", "B", "C", "D"];

  // Build a single MC question. `correct` is the right word; `distractors`
  // are 3 other words from the same pack — same pool so distractors are
  // plausibly close (same topic) without being trivially wrong.
  const buildQuestion = (correct: Word, prompt: string, optionText: (w: Word) => string, qSeed: number) => {
    const pool = words.filter((w) => w.id !== correct.id);
    const distractors = seededShuffle(pool, qSeed).slice(0, 3);
    const options = seededShuffle([correct, ...distractors], qSeed ^ 0x5a5a);
    const correctIdx = options.findIndex((w) => w.id === correct.id);
    return { prompt, options, correctIdx, correctLetter: LETTERS[correctIdx] || "A", optionText };
  };

  const q1 = part1Words.map((w, i) =>
    buildQuestion(w, applyCasing(w.english, casing), (x) => getTranslation(x, lang), seed ^ (i + 1) * 31),
  );
  const q2 = part2Words.map((w, i) =>
    buildQuestion(w, getTranslation(w, lang), (x) => applyCasing(x.english, casing), seed ^ (i + 100) * 37),
  );

  const totalPages = 2;

  const renderQuestion = (q: ReturnType<typeof buildQuestion>, idx: number, isEnglish: boolean) => `
    <div class="quiz-q no-break">
      <div class="quiz-q-prompt"><span class="quiz-q-num">${idx + 1}.</span> ${
    isEnglish ? `<span class="en">${escapeHtml(q.prompt)}</span>` : escapeHtml(q.prompt)
  }</div>
      <div class="quiz-options">
        ${q.options
          .map(
            (opt, oi) => `
          <div class="quiz-option">
            <span class="quiz-letter">${LETTERS[oi]}</span>
            <span class="quiz-text${isEnglish ? "" : " en"}">${escapeHtml(q.optionText(opt))}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>`;

  const studentPageHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.title)}
      <div class="instructions">${escapeHtml(t.instructions)}</div>
      <div class="info-row no-break" style="grid-template-columns: repeat(3, 1fr);">
        <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
        <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
        <div class="info-field"><span class="info-label">${escapeHtml(t.score)}</span><div class="info-input"></div></div>
      </div>
      <div class="quiz-section-title">${escapeHtml(t.part1)}</div>
      <div class="quiz-list">${q1.map((q, i) => renderQuestion(q, i, true)).join("")}</div>
      <div class="quiz-section-title">${escapeHtml(t.part2)}</div>
      <div class="quiz-list">${q2.map((q, i) => renderQuestion(q, q1.length + i, false)).join("")}</div>
      ${sheetFooter(1, totalPages, t.page)}
    </section>`;

  const answerKeyHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="answer-grid">
        ${[...q1, ...q2]
          .map(
            (q, i) => `
          <div class="answer-cell">
            <span class="answer-num">${i + 1}.</span>
            <span class="answer-letter">${q.correctLetter}</span>
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(2, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: studentPageHTML + answerKeyHTML });
};

// Greedy crossword placement. Longest words first, intersect on shared
// letters where the perpendicular cells around the new word are empty.
// Words that can't be placed are skipped — better to ship 8 placed words
// than block on placing all 12.
type CwPlacement = { word: string; row: number; col: number; horizontal: boolean; number: number; clue: string };

const buildCrossword = (
  entries: { english: string; clue: string }[],
  maxWords = 12,
): { placements: CwPlacement[]; grid: (string | null)[][]; rows: number; cols: number } => {
  const SIZE = 32;
  const sorted = entries
    .filter((e) => /^[a-zA-Z]+$/.test(e.english) && e.english.length >= 3 && e.english.length <= 11)
    .slice()
    .sort((a, b) => b.english.length - a.english.length)
    .slice(0, maxWords);

  if (sorted.length === 0) return { placements: [], grid: [], rows: 0, cols: 0 };

  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placements: { word: string; row: number; col: number; horizontal: boolean; clue: string }[] = [];

  const canPlace = (word: string, row: number, col: number, horizontal: boolean): boolean => {
    for (let i = 0; i < word.length; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      const existing = grid[r][c];
      if (existing && existing !== word[i]) return false;
      if (!existing) {
        if (horizontal) {
          if ((r > 0 && grid[r - 1][c]) || (r < SIZE - 1 && grid[r + 1][c])) return false;
        } else {
          if ((c > 0 && grid[r][c - 1]) || (c < SIZE - 1 && grid[r][c + 1])) return false;
        }
      }
    }
    if (horizontal) {
      if (col > 0 && grid[row][col - 1]) return false;
      if (col + word.length < SIZE && grid[row][col + word.length]) return false;
    } else {
      if (row > 0 && grid[row - 1][col]) return false;
      if (row + word.length < SIZE && grid[row + word.length][col]) return false;
    }
    return true;
  };

  const placeWord = (word: string, row: number, col: number, horizontal: boolean, clue: string) => {
    for (let i = 0; i < word.length; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      grid[r][c] = word[i];
    }
    placements.push({ word, row, col, horizontal, clue });
  };

  // Seed: place first word horizontally at center.
  const first = sorted[0].english.toUpperCase();
  const startCol = Math.floor((SIZE - first.length) / 2);
  const startRow = Math.floor(SIZE / 2);
  placeWord(first, startRow, startCol, true, sorted[0].clue);

  for (let idx = 1; idx < sorted.length; idx++) {
    const word = sorted[idx].english.toUpperCase();
    const clue = sorted[idx].clue;
    let placed = false;
    outer: for (const p of placements) {
      for (let i = 0; i < p.word.length && !placed; i++) {
        const r = p.horizontal ? p.row : p.row + i;
        const c = p.horizontal ? p.col + i : p.col;
        for (let j = 0; j < word.length && !placed; j++) {
          if (word[j] !== grid[r][c]) continue;
          // Cross perpendicular to the existing word.
          const horizontal = !p.horizontal;
          const newR = horizontal ? r : r - j;
          const newC = horizontal ? c - j : c;
          if (canPlace(word, newR, newC, horizontal)) {
            placeWord(word, newR, newC, horizontal, clue);
            placed = true;
            break outer;
          }
        }
      }
    }
    // If we couldn't intersect, skip — crowding the grid creates a worse puzzle.
  }

  // Trim to actual bounds.
  let minR = SIZE, maxR = 0, minC = SIZE, maxC = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const trimmed: (string | null)[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r + minR][c + minC]),
  );

  // Standard crossword numbering — a cell starts a word if it's at the
  // edge (no letter immediately before it) and has at least one letter
  // immediately after it in the same direction.
  let num = 0;
  const cellNumbers: Record<string, number> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!trimmed[r][c]) continue;
      const startsAcross = (c === 0 || !trimmed[r][c - 1]) && c + 1 < cols && trimmed[r][c + 1];
      const startsDown = (r === 0 || !trimmed[r - 1][c]) && r + 1 < rows && trimmed[r + 1][c];
      if (startsAcross || startsDown) {
        num += 1;
        cellNumbers[`${r},${c}`] = num;
      }
    }
  }

  const numbered: CwPlacement[] = placements.map((p) => ({
    word: p.word,
    row: p.row - minR,
    col: p.col - minC,
    horizontal: p.horizontal,
    clue: p.clue,
    number: cellNumbers[`${p.row - minR},${p.col - minC}`] || 0,
  }));

  return { placements: numbered, grid: trimmed, rows, cols };
};

const generateCrosswordHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, inkSaver } = settings;
  const t = {
    en: { title: "Crossword Puzzle", instructions: "Solve the crossword. Use the translations as clues to find each English word.", across: "Across", down: "Down", solution: "Solution", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "תשבץ", instructions: "פתרו את התשבץ. השתמשו בתרגומים כרמזים למציאת כל מילה באנגלית.", across: "מאוזן", down: "מאונך", solution: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "لغز الكلمات المتقاطعة", instructions: "حل اللغز. استخدم الترجمات كتلميحات لإيجاد كل كلمة إنجليزية.", across: "أفقي", down: "عمودي", solution: "الحل", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Crossword Puzzle", instructions: "Solve the crossword. Use the translations as clues to find each English word.", across: "Across", down: "Down", solution: "Solution", page: "Page", name: "Name:", date: "Date:" };

  const entries = words.map((w) => ({ english: w.english, clue: getTranslation(w, lang) }));
  const { placements, grid, rows, cols } = buildCrossword(entries, 12);

  const accent = inkSaver ? "#000000" : "#dc2626";
  const accentDark = inkSaver ? "#000000" : "#991b1b";
  const cellBorder = inkSaver ? "#000000" : "#1f2937";
  const cellBg = inkSaver ? "#ffffff" : "#fafafa";

  // Cell size: scale to fit page width. Print width ≈ 186mm on portrait A4
  // with 12mm margins; we cap at 12mm per cell so even a 15-wide grid fits.
  const cellSize = cols > 0 ? Math.min(12, Math.floor(170 / Math.max(cols, 1))) : 10;

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#fef2f2"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .cw-wrap { display: flex; justify-content: center; margin: 4mm 0; }
    .cw-grid { display: grid; grid-template-columns: repeat(${cols}, ${cellSize}mm); grid-auto-rows: ${cellSize}mm; gap: 0; border: 2px solid ${cellBorder}; }
    .cw-cell { border: 0.5px solid ${cellBorder}; position: relative; box-sizing: border-box; }
    .cw-cell.empty { background: ${inkSaver ? "#000000" : "#1f2937"}; border: 0.5px solid ${cellBorder}; }
    .cw-cell.letter { background: ${cellBg}; }
    .cw-num { position: absolute; top: 0.3mm; left: 0.5mm; font-size: ${Math.max(5, cellSize - 6)}pt; font-weight: 700; color: ${accentDark}; line-height: 1; }
    .cw-letter { display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 800; font-size: ${Math.max(8, cellSize - 2)}pt; color: ${cellBorder}; text-transform: uppercase; }
    .cw-clues { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 4mm; }
    .cw-clue-section-title { font-weight: 800; color: ${accentDark}; font-size: 1.05em; margin-bottom: 2mm; padding-bottom: 1mm; border-bottom: 1.5px solid ${inkSaver ? "#000000" : "#fecaca"}; }
    .cw-clue-list { display: flex; flex-direction: column; gap: 1.5mm; }
    .cw-clue { display: flex; gap: 2mm; font-size: 0.95em; }
    .cw-clue-num { font-weight: 800; color: ${accent}; min-width: 7mm; }
    .cw-empty-msg { padding: 6mm; border: 1.5px dashed ${cellBorder}; border-radius: 6px; text-align: center; color: #6b7280; }
  `;

  if (placements.length === 0) {
    // Fallback when the topic has no eligible words (rare — usually a pack
    // of multi-word phrases). Render a friendly stub so the PDF is still valid.
    const emptyHTML = `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        <div class="cw-empty-msg">${escapeHtml(t.instructions)}</div>
        ${sheetFooter(1, 1, t.page)}
      </section>`;
    return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: emptyHTML });
  }

  const acrossClues = placements.filter((p) => p.horizontal).sort((a, b) => a.number - b.number);
  const downClues = placements.filter((p) => !p.horizontal).sort((a, b) => a.number - b.number);

  // Number map for rendering — cells outside the puzzle stay empty/black.
  const numberAt = (r: number, c: number): number | null => {
    const p = placements.find((pp) => pp.row === r && pp.col === c);
    return p ? p.number : null;
  };

  const renderGrid = (showLetters: boolean) => {
    const cells: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const letter = grid[r][c];
        if (!letter) {
          cells.push(`<div class="cw-cell empty"></div>`);
          continue;
        }
        const n = numberAt(r, c);
        cells.push(
          `<div class="cw-cell letter">${n ? `<span class="cw-num">${n}</span>` : ""}${
            showLetters ? `<span class="cw-letter en">${escapeHtml(applyCasing(letter, casing))}</span>` : ""
          }</div>`,
        );
      }
    }
    return `<div class="cw-wrap"><div class="cw-grid">${cells.join("")}</div></div>`;
  };

  const renderClueList = (list: typeof acrossClues) =>
    list
      .map(
        (p) => `
        <div class="cw-clue">
          <span class="cw-clue-num">${p.number}.</span>
          <span>${escapeHtml(p.clue)} <span style="color:#9ca3af;">(${p.word.length})</span></span>
        </div>`,
      )
      .join("");

  const puzzleHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.title)}
      <div class="instructions">${escapeHtml(t.instructions)}</div>
      <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
        <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
        <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
      </div>
      ${renderGrid(false)}
      <div class="cw-clues">
        <div>
          <div class="cw-clue-section-title">⬌ ${escapeHtml(t.across)}</div>
          <div class="cw-clue-list">${renderClueList(acrossClues)}</div>
        </div>
        <div>
          <div class="cw-clue-section-title">⬍ ${escapeHtml(t.down)}</div>
          <div class="cw-clue-list">${renderClueList(downClues)}</div>
        </div>
      </div>
      ${sheetFooter(1, 2, t.page)}
    </section>`;

  const solutionHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.solution)}
      ${renderGrid(true)}
      ${sheetFooter(2, 2, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: puzzleHTML + solutionHTML });
};

const generateClozeHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Cloze Reading", instructions: "Read the passage and fill in each blank with a word from the word bank.", wordBank: "Word Bank", passage: "Passage", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "קריאה והשלמה", instructions: "קראו את הקטע והשלימו כל חסר במילה מבנק המילים.", wordBank: "בנק מילים", passage: "קטע", answerKey: "פתרון", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "قراءة وملء الفراغات", instructions: "اقرأ النص واملأ كل فراغ بكلمة من بنك الكلمات.", wordBank: "بنك الكلمات", passage: "النص", answerKey: "مفتاح الإجابة", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Cloze Reading", instructions: "Read the passage and fill in each blank with a word from the word bank.", wordBank: "Word Bank", passage: "Passage", answerKey: "Answer Key", page: "Page", name: "Name:", date: "Date:" };

  const BLANK = "____________";
  const seedBase = hashString(pack.name);
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build sentence items the same way fill-blank does — but instead of a
  // numbered list we'll join them into paragraphs (5 sentences each) so the
  // sheet reads like a story passage instead of a quiz.
  const buildItem = (word: Word, idx: number): { word: Word; sentence: string } => {
    const re = new RegExp(`\\b${escapeRe(word.english)}\\b`, "i");
    const curated = FILLBLANK_SENTENCES.get(word.id);
    if (curated && re.test(curated)) return { word, sentence: curated.replace(re, BLANK) };
    const candidates = getSentencesForWord(word, 2);
    const fitting = candidates.filter((s) => re.test(s));
    if (fitting.length > 0) {
      const picked = fitting[(seedBase + idx) % fitting.length];
      return { word, sentence: picked.replace(re, BLANK) };
    }
    const fallbacks = [`I see the ${word.english} every day`, `She likes the ${word.english} a lot`, `They use ${word.english} in the lesson`];
    return { word, sentence: fallbacks[(seedBase + idx) % fallbacks.length].replace(re, BLANK) };
  };

  const items = words.map(buildItem);
  // Cap to keep the passage readable. Long packs get split into multiple passages.
  const PER_PASSAGE = 12;
  const passages = chunk(items, PER_PASSAGE);
  const totalPages = passages.length + 1;

  const accent = inkSaver ? "#000000" : "#0891b2";
  const accentDark = inkSaver ? "#000000" : "#155e75";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#ecfeff"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .word-bank { background: ${inkSaver ? "#ffffff" : "#ecfeff"}; border: 2px solid ${inkSaver ? "#000000" : "#67e8f9"}; border-radius: 8px; padding: 4mm; margin: 4mm 0; }
    .word-bank-title { font-weight: 800; color: ${accentDark}; margin-bottom: 3mm; text-align: center; font-size: 1.05em; }
    .word-bank-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
    .word-bank-item { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; background: white; border: 1px solid ${inkSaver ? "#000000" : "#67e8f9"}; border-radius: 4px; font-size: 0.95em; }
    .word-bank-en { font-weight: 700; color: ${inkSaver ? "#000000" : "#1f2937"}; flex: 1; }
    .word-bank-tr { color: #6b7280; font-size: 0.85em; }
    .word-bank-qr svg { display: block; width: 9mm; height: 9mm; }
    .passage-section { margin-top: 4mm; padding: 5mm 6mm; background: ${inkSaver ? "#ffffff" : "#fafdfd"}; border: 1.5px solid ${inkSaver ? "#000000" : "#cffafe"}; border-radius: 6px; }
    .passage-title { font-weight: 800; color: ${accentDark}; margin-bottom: 3mm; font-size: 1.05em; }
    .passage-paragraph { line-height: 2.0; text-align: start; margin-bottom: 3mm; font-size: 1.05em; }
    .passage-paragraph .blank { display: inline-block; min-width: 22mm; border-bottom: 1.5px solid ${accent}; font-weight: 800; letter-spacing: 1px; color: ${accent}; padding: 0 1mm; text-align: center; }
    .answer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
    .answer-cell { display: flex; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#f9fafb"}; border: 1px solid ${inkSaver ? "#000000" : "#e5e7eb"}; border-radius: 4px; font-size: 0.9em; }
    .answer-num { font-weight: 800; color: ${accent}; min-width: 6mm; }
  `;

  // Render a sentence with its blank tokenised as a styled span so the
  // underline + monospace blank survives html2canvas.
  const renderSentence = (s: string) => escapeHtml(s).replace(BLANK, `<span class="blank">${BLANK}</span>`);

  // Group sentences into paragraphs of 5 — gives the reader a chance to
  // pause and the visual rhythm of a real reading text.
  const SENT_PER_PARA = 5;
  const buildPassage = (group: typeof items) => {
    const paragraphs = chunk(group, SENT_PER_PARA);
    return paragraphs
      .map(
        (para) =>
          `<p class="passage-paragraph en">${para.map((it) => renderSentence(it.sentence)).join(" ")}</p>`,
      )
      .join("");
  };

  const bank = seededShuffle(words, seedBase ^ 0xc10ce);
  const wordBankHTML = `
    <div class="word-bank no-break">
      <div class="word-bank-title">📋 ${escapeHtml(t.wordBank)}</div>
      <div class="word-bank-grid">
        ${bank
          .map(
            (w) => `
          <div class="word-bank-item">
            <span class="word-bank-en en">${escapeHtml(applyCasing(w.english, casing))}</span>
            ${showTranslations ? `<span class="word-bank-tr">${escapeHtml(getTranslation(w, lang))}</span>` : ""}
            ${audioQR ? `<span class="word-bank-qr">${qrSvg(getAudioUrl(w.id), 32)}</span>` : ""}
          </div>`,
          )
          .join("")}
      </div>
    </div>`;

  const passagePagesHTML = passages
    .map((group, pageIdx) => `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0
          ? `<div class="instructions">${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
             </div>
             ${wordBankHTML}`
          : ""}
        <div class="passage-section">
          <div class="passage-title">📖 ${escapeHtml(t.passage)} ${pageIdx + 1}</div>
          ${buildPassage(group)}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`)
    .join("");

  const answerKeyHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.answerKey)}
      <div class="answer-grid">
        ${items
          .map(
            (item, i) => `
          <div class="answer-cell">
            <span class="answer-num">${i + 1}.</span>
            <span class="en" style="font-weight:700;">${escapeHtml(applyCasing(item.word.english, casing))}</span>
          </div>`,
          )
          .join("")}
      </div>
      ${sheetFooter(totalPages, totalPages, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: passagePagesHTML + answerKeyHTML });
};

const generateTracingHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Tracing Practice", instructions: "Trace the dotted letters, then write each word again on the line below.", page: "Page", name: "Name:", date: "Date:" },
    he: { title: "תרגול כתיבה", instructions: "עברו על האותיות המקווקוות, ואז כתבו את כל מילה שוב על השורה למטה.", page: "עמוד", name: "שם:", date: "תאריך:" },
    ar: { title: "تمرين الكتابة", instructions: "تتبع الحروف المنقطة، ثم اكتب كل كلمة مرة أخرى على السطر أدناه.", page: "صفحة", name: "الاسم:", date: "التاريخ:" },
  }[lang as "en" | "he" | "ar"] || { title: "Tracing Practice", instructions: "Trace the dotted letters, then write each word again on the line below.", page: "Page", name: "Name:", date: "Date:" };

  const PER_PAGE = 6;
  const pages = chunk(words, PER_PAGE);
  const totalPages = Math.max(1, pages.length);

  const accent = inkSaver ? "#000000" : "#9333ea";
  const accentDark = inkSaver ? "#000000" : "#6b21a8";
  // The "trace" colour must be light enough to disappear once a child writes
  // over it with a regular pencil, but still visible. Light grey with a
  // dotted text stroke effect is the closest we can get in HTML/CSS.
  const traceColor = inkSaver ? "#9ca3af" : "#d8b4fe";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#faf5ff"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 4mm 0; text-align: center; color: ${accentDark}; font-weight: 600; }
    .trace-list { display: flex; flex-direction: column; gap: 6mm; margin-top: 4mm; }
    .trace-row { padding: 4mm 5mm; background: ${inkSaver ? "#ffffff" : "#fdfaff"}; border: 1.5px solid ${inkSaver ? "#000000" : "#e9d5ff"}; border-radius: 6px; }
    .trace-num { font-weight: 800; color: ${accent}; font-size: 0.95em; margin-bottom: 1mm; }
    .trace-tr { color: #6b7280; font-size: 0.9em; font-style: italic; margin-bottom: 2mm; }
    .trace-letters { font-size: 26pt; font-weight: 800; letter-spacing: 4px; color: ${traceColor}; line-height: 1.2; font-family: 'Comic Sans MS', 'Courier New', monospace; }
    .trace-baseline { border-bottom: 1.5px solid ${inkSaver ? "#000000" : "#cbd5e1"}; height: 14mm; margin-top: 2mm; position: relative; }
    .trace-midline { position: absolute; top: 50%; left: 0; right: 0; border-bottom: 0.5px dashed ${inkSaver ? "#9ca3af" : "#cbd5e1"}; }
  `;

  const pagesHTML = pages
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0
          ? `<div class="instructions">${escapeHtml(t.instructions)}</div>
             <div class="info-row no-break" style="grid-template-columns: repeat(2, 1fr);">
               <div class="info-field"><span class="info-label">${escapeHtml(t.name)}</span><div class="info-input"></div></div>
               <div class="info-field"><span class="info-label">${escapeHtml(t.date)}</span><div class="info-input"></div></div>
             </div>`
          : ""}
        <div class="trace-list">
          ${group
            .map(
              (w, i) => `
            <div class="trace-row no-break">
              <div class="trace-num">${startIdx + i + 1}.</div>
              ${showTranslations ? `<div class="trace-tr">${escapeHtml(getTranslation(w, lang))}</div>` : ""}
              <div class="trace-letters en">${escapeHtml(applyCasing(w.english, casing))}</div>
              <div class="trace-baseline"><div class="trace-midline"></div></div>
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: pagesHTML });
};

const generateMemoryMatchHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver } = settings;
  const t = {
    en: { title: "Memory Match Cards", instructions: "Cut along the dashed lines. Place the cards face-down. Take turns flipping two cards — match each English word with its translation to keep the pair.", page: "Page" },
    he: { title: "כרטיסי משחק זיכרון", instructions: "גזרו לאורך הקווים המקווקוים. הניחו את הכרטיסים הפוכים. סובבו שני כרטיסים בכל תור — התאימו מילה באנגלית עם התרגום שלה כדי לשמור על הזוג.", page: "עמוד" },
    ar: { title: "بطاقات لعبة الذاكرة", instructions: "قص على طول الخطوط المتقطعة. ضع البطاقات وجهها للأسفل. اقلب بطاقتين في كل دور — طابق كل كلمة إنجليزية مع ترجمتها للاحتفاظ بالزوج.", page: "صفحة" },
  }[lang as "en" | "he" | "ar"] || { title: "Memory Match Cards", instructions: "Cut along the dashed lines. Place the cards face-down. Take turns flipping two cards — match each English word with its translation to keep the pair.", page: "Page" };

  // 8 pairs × 2 cards = 16 cards per A4 page in 4×4 grid.
  const PAIRS_PER_PAGE = 8;
  const pages = chunk(words, PAIRS_PER_PAGE);
  const totalPages = Math.max(1, pages.length);

  const accent = inkSaver ? "#000000" : "#db2777";
  const accentDark = inkSaver ? "#000000" : "#9d174d";
  const cardEnBg = inkSaver ? "#ffffff" : "#fdf2f8";
  const cardTrBg = inkSaver ? "#ffffff" : "#fef3c7";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#fdf2f8"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0; text-align: center; color: ${accentDark}; font-weight: 600; font-size: 0.9em; }
    .mm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 3mm; border: 1.5px dashed ${inkSaver ? "#000000" : "#9ca3af"}; }
    .mm-card { aspect-ratio: 1 / 1; padding: 3mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; border: 1.5px dashed ${inkSaver ? "#000000" : "#9ca3af"}; text-align: center; }
    .mm-card.en { background: ${cardEnBg}; }
    .mm-card.tr { background: ${cardTrBg}; }
    .mm-card-label { font-size: 7pt; font-weight: 700; color: ${inkSaver ? "#000000" : "#9ca3af"}; text-transform: uppercase; letter-spacing: 1px; }
    .mm-card-text { font-weight: 800; font-size: 11pt; color: ${inkSaver ? "#000000" : accentDark}; line-height: 1.2; }
    .mm-card-text.en { font-size: 13pt; }
    .mm-card-qr svg { display: block; width: 12mm; height: 12mm; }
  `;

  const pagesHTML = pages
    .map((group, pageIdx) => {
      // Mix EN cards and translation cards across the grid so when teachers
      // shuffle them, they're already pre-mixed. Stable per-page seed.
      const cards: { type: "en" | "tr"; word: Word }[] = group.flatMap((w) => [
        { type: "en", word: w },
        { type: "tr", word: w },
      ]);
      const shuffled = seededShuffle(cards, hashString(pack.name) ^ pageIdx);
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0 ? `<div class="instructions">✂️ ${escapeHtml(t.instructions)}</div>` : ""}
        <div class="mm-grid">
          ${shuffled
            .map((c) => {
              if (c.type === "en") {
                return `
            <div class="mm-card en no-break">
              <div class="mm-card-label">EN</div>
              <div class="mm-card-text en">${escapeHtml(applyCasing(c.word.english, casing))}</div>
              ${audioQR ? `<div class="mm-card-qr">${qrSvg(getAudioUrl(c.word.id), 36)}</div>` : ""}
            </div>`;
              }
              return `
            <div class="mm-card tr no-break">
              <div class="mm-card-label">${lang === "he" ? "עב" : lang === "ar" ? "عر" : "TR"}</div>
              <div class="mm-card-text">${escapeHtml(getTranslation(c.word, lang))}</div>
            </div>`;
            })
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: pagesHTML });
};

const generatePictionaryHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver, showTranslations } = settings;
  const t = {
    en: { title: "Pictionary Cards", instructions: "Cut along the dashed lines. Pick a card. Draw the word — your partner guesses!", drawHere: "Draw here", page: "Page" },
    he: { title: "כרטיסי ציור", instructions: "גזרו לאורך הקווים המקווקוים. בחרו כרטיס. ציירו את המילה — בן הזוג שלכם מנחש!", drawHere: "ציירו כאן", page: "עמוד" },
    ar: { title: "بطاقات الرسم", instructions: "قص على طول الخطوط المتقطعة. اختر بطاقة. ارسم الكلمة — يخمنها شريكك!", drawHere: "ارسم هنا", page: "صفحة" },
  }[lang as "en" | "he" | "ar"] || { title: "Pictionary Cards", instructions: "Cut along the dashed lines. Pick a card. Draw the word — your partner guesses!", drawHere: "Draw here", page: "Page" };

  // 4 cards per A4 portrait — 2×2 grid, each card is roughly half-page.
  const PER_PAGE = 4;
  const pages = chunk(words, PER_PAGE);
  const totalPages = Math.max(1, pages.length);

  const accent = inkSaver ? "#000000" : "#0d9488";
  const accentDark = inkSaver ? "#000000" : "#115e59";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .instructions { background: ${inkSaver ? "#ffffff" : "#f0fdfa"}; border: 2px solid ${accent}; border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0; text-align: center; color: ${accentDark}; font-weight: 600; font-size: 0.9em; }
    .pic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 3mm; border: 1.5px dashed ${inkSaver ? "#000000" : "#9ca3af"}; }
    .pic-card { padding: 5mm 6mm; border: 1.5px dashed ${inkSaver ? "#000000" : "#9ca3af"}; display: flex; flex-direction: column; gap: 3mm; height: 110mm; box-sizing: border-box; }
    .pic-card-header { display: flex; align-items: center; gap: 3mm; }
    .pic-card-num { width: 9mm; height: 9mm; border-radius: 50%; background: ${inkSaver ? "#ffffff" : accent}; color: ${inkSaver ? "#000000" : "#ffffff"}; border: ${inkSaver ? "1.5px solid #000000" : "0"}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95em; flex-shrink: 0; }
    .pic-card-en { font-weight: 800; font-size: 18pt; color: ${inkSaver ? "#000000" : accentDark}; flex: 1; }
    .pic-card-qr svg { display: block; width: 13mm; height: 13mm; }
    .pic-card-draw { flex: 1; border: 2px dashed ${inkSaver ? "#9ca3af" : "#5eead4"}; border-radius: 6px; display: flex; align-items: flex-end; justify-content: center; padding: 3mm; background: ${inkSaver ? "#ffffff" : "#f0fdfa"}; }
    .pic-card-draw-label { color: ${inkSaver ? "#9ca3af" : "#0d9488"}; font-size: 0.8em; font-style: italic; }
    .pic-card-tr { transform: rotate(180deg); text-align: center; color: #6b7280; font-size: 0.85em; padding-top: 2mm; border-top: 0.5px dashed #d1d5db; }
  `;

  const pagesHTML = pages
    .map((group, pageIdx) => {
      const startIdx = pageIdx * PER_PAGE;
      return `
      <section class="sheet">
        ${sheetHeader(pack, t.title)}
        ${pageIdx === 0 ? `<div class="instructions">✂️ ${escapeHtml(t.instructions)}</div>` : ""}
        <div class="pic-grid">
          ${group
            .map(
              (w, i) => `
            <div class="pic-card no-break">
              <div class="pic-card-header">
                <div class="pic-card-num">${startIdx + i + 1}</div>
                <div class="pic-card-en en">${escapeHtml(applyCasing(w.english, casing))}</div>
                ${audioQR ? `<div class="pic-card-qr">${qrSvg(getAudioUrl(w.id), 40)}</div>` : ""}
              </div>
              <div class="pic-card-draw"><div class="pic-card-draw-label">${escapeHtml(t.drawHere)}</div></div>
              ${showTranslations ? `<div class="pic-card-tr">${escapeHtml(getTranslation(w, lang))}</div>` : ""}
            </div>`,
            )
            .join("")}
        </div>
        ${sheetFooter(pageIdx + 1, totalPages, t.page)}
      </section>`;
    })
    .join("");

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: pagesHTML });
};

const generateParentHandoutHTML = (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => {
  const { casing, audioQR, inkSaver } = settings;
  // Parent handout is intentionally written FOR THE PARENT, not the student.
  // Tone is friendly + practical; activities require zero teaching expertise.
  const t = {
    en: {
      title: "Parent's Guide",
      greeting: "Dear Parent,",
      intro: "Your child is learning these English words this week. Here are simple, screen-free ways to practise at home — 5 minutes is enough!",
      wordsTitle: "This week's words",
      activitiesTitle: "Try these at home",
      activities: [
        { emoji: "🗣️", title: "Say it together", desc: "Read each English word aloud with your child. Then say it in your own language. Repeat 3 times — short and fun." },
        { emoji: "🔍", title: "Spot it around the house", desc: "Walk around your home and find one item for as many words as you can. Point and say the English word." },
        { emoji: "✏️", title: "Write 3 favourites", desc: "Ask your child to choose 3 words and write each one on a small paper. Stick them on the fridge for a week." },
      ],
      qrHint: "Scan the QR codes for pronunciation",
      footer: "Thank you for supporting your child's learning! ❤️",
      page: "Page",
    },
    he: {
      title: "מדריך להורה",
      greeting: "להורה היקר/ה,",
      intro: "הילד/ה שלכם לומד/ת השבוע את המילים הללו באנגלית. הנה דרכים פשוטות לתרגול בבית — 5 דקות מספיקות!",
      wordsTitle: "המילים של השבוע",
      activitiesTitle: "פעילויות לבית",
      activities: [
        { emoji: "🗣️", title: "אומרים יחד", desc: "קראו כל מילה באנגלית בקול יחד עם הילד/ה. אחר כך תרגמו לעברית. חיזרו 3 פעמים — קצר וכיף." },
        { emoji: "🔍", title: "מחפשים בבית", desc: "סובבו בבית ומצאו פריט אחד לכל כמה שיותר מילים. הצביעו ואמרו את המילה באנגלית." },
        { emoji: "✏️", title: "כותבים 3 אהובות", desc: "בקשו מהילד/ה לבחור 3 מילים ולכתוב כל אחת על דף קטן. הדביקו על המקרר לשבוע." },
      ],
      qrHint: "סרקו את קודי ה-QR להגייה",
      footer: "תודה שאתם תומכים בלמידה של הילד/ה שלכם! ❤️",
      page: "עמוד",
    },
    ar: {
      title: "دليل ولي الأمر",
      greeting: "إلى ولي الأمر العزيز،",
      intro: "يتعلم طفلك هذه الكلمات الإنجليزية هذا الأسبوع. إليك طرق بسيطة للتمرن في المنزل — 5 دقائق تكفي!",
      wordsTitle: "كلمات هذا الأسبوع",
      activitiesTitle: "جربوا هذه الأنشطة في المنزل",
      activities: [
        { emoji: "🗣️", title: "قولوها معًا", desc: "اقرأوا كل كلمة إنجليزية بصوت عالٍ مع طفلك. ثم قولوها بالعربية. كرروا 3 مرات — قصير وممتع." },
        { emoji: "🔍", title: "اكتشفوها في المنزل", desc: "تجولوا في المنزل وابحثوا عن غرض واحد لأكبر عدد ممكن من الكلمات. أشيروا واذكروا الكلمة الإنجليزية." },
        { emoji: "✏️", title: "اكتبوا 3 كلمات مفضلة", desc: "اطلبوا من طفلك اختيار 3 كلمات وكتابة كل واحدة على ورقة صغيرة. الصقوها على الثلاجة لمدة أسبوع." },
      ],
      qrHint: "امسحوا رموز QR للنطق",
      footer: "شكرًا لدعمكم لتعلم طفلكم! ❤️",
      page: "صفحة",
    },
  }[lang as "en" | "he" | "ar"] || {
    title: "Parent's Guide",
    greeting: "Dear Parent,",
    intro: "Your child is learning these English words this week. Here are simple, screen-free ways to practise at home — 5 minutes is enough!",
    wordsTitle: "This week's words",
    activitiesTitle: "Try these at home",
    activities: [
      { emoji: "🗣️", title: "Say it together", desc: "Read each English word aloud with your child. Then say it in your own language. Repeat 3 times — short and fun." },
      { emoji: "🔍", title: "Spot it around the house", desc: "Walk around your home and find one item for as many words as you can. Point and say the English word." },
      { emoji: "✏️", title: "Write 3 favourites", desc: "Ask your child to choose 3 words and write each one on a small paper. Stick them on the fridge for a week." },
    ],
    qrHint: "Scan the QR codes for pronunciation",
    footer: "Thank you for supporting your child's learning! ❤️",
    page: "Page",
  };

  const accent = inkSaver ? "#000000" : "#e11d48";
  const accentDark = inkSaver ? "#000000" : "#9f1239";

  const styles =
    baseStyles(lang, accent, accentDark, settings) +
    `
    .ph-greeting { font-size: 1.1em; font-weight: 700; color: ${accentDark}; margin: 4mm 0 2mm; }
    .ph-intro { color: ${inkSaver ? "#000000" : "#475569"}; line-height: 1.6; margin-bottom: 4mm; padding: 3mm 4mm; background: ${inkSaver ? "#ffffff" : "#fff1f2"}; border-${lang === "he" || lang === "ar" ? "right" : "left"}: 4px solid ${accent}; border-radius: 4px; }
    .ph-section-title { font-weight: 800; color: ${accentDark}; font-size: 1.05em; margin: 4mm 0 2mm; padding-bottom: 1mm; border-bottom: 2px solid ${inkSaver ? "#000000" : "#fecdd3"}; }
    .ph-words-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
    .ph-word-item { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; background: ${inkSaver ? "#ffffff" : "#fff1f2"}; border: 1px solid ${inkSaver ? "#000000" : "#fecdd3"}; border-radius: 4px; font-size: 0.95em; }
    .ph-word-en { font-weight: 700; color: ${inkSaver ? "#000000" : accentDark}; flex: 1; }
    .ph-word-tr { color: #6b7280; font-size: 0.85em; }
    .ph-word-qr svg { display: block; width: 9mm; height: 9mm; }
    .ph-qr-hint { color: #6b7280; font-size: 0.85em; font-style: italic; margin-top: 1mm; }
    .ph-activities { display: flex; flex-direction: column; gap: 3mm; margin-top: 2mm; }
    .ph-activity { padding: 3mm 4mm; background: ${inkSaver ? "#ffffff" : "#ffffff"}; border: 1.5px solid ${inkSaver ? "#000000" : "#fecdd3"}; border-radius: 6px; }
    .ph-activity-title { font-weight: 800; color: ${accentDark}; margin-bottom: 1mm; }
    .ph-activity-emoji { margin-${lang === "he" || lang === "ar" ? "left" : "right"}: 2mm; font-size: 1.1em; }
    .ph-activity-desc { color: ${inkSaver ? "#000000" : "#475569"}; line-height: 1.5; font-size: 0.95em; }
    .ph-footer { text-align: center; margin-top: 5mm; padding: 3mm; color: ${accentDark}; font-weight: 700; font-style: italic; }
  `;

  const handoutHTML = `
    <section class="sheet">
      ${sheetHeader(pack, t.title)}
      <div class="ph-greeting">${escapeHtml(t.greeting)}</div>
      <div class="ph-intro">${escapeHtml(t.intro)}</div>

      <div class="ph-section-title">📚 ${escapeHtml(t.wordsTitle)}</div>
      <div class="ph-words-grid">
        ${words
          .map(
            (w) => `
          <div class="ph-word-item no-break">
            <span class="ph-word-en en">${escapeHtml(applyCasing(w.english, casing))}</span>
            <span class="ph-word-tr">${escapeHtml(getTranslation(w, lang))}</span>
            ${audioQR ? `<span class="ph-word-qr">${qrSvg(getAudioUrl(w.id), 32)}</span>` : ""}
          </div>`,
          )
          .join("")}
      </div>
      ${audioQR ? `<div class="ph-qr-hint">${escapeHtml(t.qrHint)}</div>` : ""}

      <div class="ph-section-title">💡 ${escapeHtml(t.activitiesTitle)}</div>
      <div class="ph-activities">
        ${t.activities
          .map(
            (a) => `
          <div class="ph-activity no-break">
            <div class="ph-activity-title"><span class="ph-activity-emoji">${a.emoji}</span>${escapeHtml(a.title)}</div>
            <div class="ph-activity-desc">${escapeHtml(a.desc)}</div>
          </div>`,
          )
          .join("")}
      </div>

      <div class="ph-footer">${escapeHtml(t.footer)}</div>
      ${sheetFooter(1, 1, t.page)}
    </section>`;

  return htmlDoc({ lang, title: `${pack.name} — ${t.title}`, styles, body: handoutHTML });
};

// ---------- React components ----------

interface FreeResourcesViewProps {
  // Mirrors NavPage in PublicNav.tsx — kept as a literal union here so the
  // call sites in App.tsx don't need to import the type. Update both when
  // adding new public pages.
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "faq" | "resources" | "status") => void;
  onGetStarted: () => void;
  /** Teacher signup — drives PublicNav's "Start free" CTA. */
  onTeacherLogin?: () => void;
  onBack: () => void;
}

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  size: string;
  downloadLabel: string;
  matchingLabel: string;
  flashcardsLabel: string;
  bingoLabel: string;
  wordSearchLabel: string;
  fillBlankLabel: string;
  spellingTestLabel: string;
  scrambleLabel: string;
  quizLabel: string;
  crosswordLabel: string;
  clozeLabel: string;
  tracingLabel: string;
  memoryLabel: string;
  pictionaryLabel: string;
  parentLabel: string;
  categoryPracticeLabel: string;
  categoryGamesLabel: string;
  categoryAssessLabel: string;
  categoryFamilyLabel: string;
  audioZipTitle: string;
  audioZipDesc: string;
  audioZipDownloadLabel: string;
  topicWordIds: number[];
  gradient: string;
  delay: number;
  onDownload: () => void;
  onMatching: () => void;
  onFlashcards: () => void;
  onBingo: () => void;
  onWordSearch: () => void;
  onFillBlank: () => void;
  onSpellingTest: () => void;
  onScramble: () => void;
  onQuiz: () => void;
  onCrossword: () => void;
  onCloze: () => void;
  onTracing: () => void;
  onMemory: () => void;
  onPictionary: () => void;
  onParent: () => void;
  isDownloading: boolean;
}

// Faint divider with an uppercase category label centred on it. Keeps each
// resource card's 14 buttons scannable instead of a wall of colour.
const CategoryLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mt-3 mb-1 first:mt-1">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">{children}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

const ResourceCard: React.FC<ResourceCardProps> = ({
  icon,
  title,
  description,
  size,
  downloadLabel,
  matchingLabel,
  flashcardsLabel,
  bingoLabel,
  wordSearchLabel,
  fillBlankLabel,
  spellingTestLabel,
  scrambleLabel,
  quizLabel,
  crosswordLabel,
  clozeLabel,
  tracingLabel,
  memoryLabel,
  pictionaryLabel,
  parentLabel,
  categoryPracticeLabel,
  categoryGamesLabel,
  categoryAssessLabel,
  categoryFamilyLabel,
  audioZipTitle,
  audioZipDesc,
  audioZipDownloadLabel,
  topicWordIds,
  gradient,
  delay,
  onDownload,
  onMatching,
  onFlashcards,
  onBingo,
  onWordSearch,
  onFillBlank,
  onSpellingTest,
  onScramble,
  onQuiz,
  onCrossword,
  onCloze,
  onTracing,
  onMemory,
  onPictionary,
  onParent,
  isDownloading,
}) => {
  const { isRTL } = useLanguage();

  // Keeps each button declaration short and consistent. The gradient + text
  // colour hint at the format's character so teachers can spot favourites.
  const FormatButton: React.FC<{
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    gradient: string;
    textClass: string;
    borderClass: string;
    fullWidth?: boolean;
  }> = ({ onClick, label, icon, gradient, textClass, borderClass, fullWidth }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-label={`${label} — ${title}`}
      className={`py-2.5 rounded-xl bg-gradient-to-r ${gradient} ${textClass} font-bold transition-all flex items-center justify-center gap-1.5 border ${borderClass} text-sm ${fullWidth ? "col-span-2" : ""}`}
      type="button"
    >
      {icon}
      <span className="truncate">{label}</span>
    </motion.button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden group hover:border-white/30 transition-all"
    >
      <div className={`bg-gradient-to-r ${gradient} p-6 flex items-center gap-4`}>
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-white truncate">{title}</h3>
          <p className="text-white/90 text-base font-semibold">{size}</p>
        </div>
      </div>

      <div className="p-6">
        <p className="text-white/80 mb-4 leading-relaxed text-lg">{description}</p>

        <div className="grid grid-cols-1 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownload}
            disabled={isDownloading}
            aria-label={`${downloadLabel} — ${title}`}
            className={`w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center justify-center gap-2 ${
              isDownloading ? "cursor-wait" : "cursor-pointer"
            }`}
            type="button"
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {downloadLabel}
              </>
            ) : (
              <>
                <Download size={16} className={isRTL ? "ml-2" : "mr-2"} />
                {downloadLabel}
              </>
            )}
          </motion.button>

          <CategoryLabel>{categoryPracticeLabel}</CategoryLabel>
          <div className="grid grid-cols-2 gap-2">
            <FormatButton
              onClick={onScramble}
              label={scrambleLabel}
              icon={<Shuffle size={14} />}
              gradient="from-orange-500/20 to-yellow-500/20 hover:from-orange-500/30 hover:to-yellow-500/30"
              textClass="text-orange-300"
              borderClass="border-orange-400/30"
            />
            <FormatButton
              onClick={onTracing}
              label={tracingLabel}
              icon={<Pencil size={14} />}
              gradient="from-purple-500/20 to-fuchsia-500/20 hover:from-purple-500/30 hover:to-fuchsia-500/30"
              textClass="text-purple-300"
              borderClass="border-purple-400/30"
            />
            <FormatButton
              onClick={onCloze}
              label={clozeLabel}
              icon={<BookOpen size={14} />}
              gradient="from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30"
              textClass="text-cyan-300"
              borderClass="border-cyan-400/30"
            />
            <FormatButton
              onClick={onFillBlank}
              label={fillBlankLabel}
              icon={<PencilLine size={14} />}
              gradient="from-sky-500/20 to-cyan-500/20 hover:from-sky-500/30 hover:to-cyan-500/30"
              textClass="text-sky-300"
              borderClass="border-sky-400/30"
            />
          </div>

          <CategoryLabel>{categoryGamesLabel}</CategoryLabel>
          <div className="grid grid-cols-2 gap-2">
            <FormatButton
              onClick={onMatching}
              label={matchingLabel}
              icon={<Gamepad2 size={14} />}
              gradient="from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30"
              textClass="text-emerald-300"
              borderClass="border-emerald-400/30"
            />
            <FormatButton
              onClick={onBingo}
              label={bingoLabel}
              icon={<Grid3x3 size={14} />}
              gradient="from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30"
              textClass="text-amber-300"
              borderClass="border-amber-400/30"
            />
            <FormatButton
              onClick={onWordSearch}
              label={wordSearchLabel}
              icon={<Search size={14} />}
              gradient="from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30"
              textClass="text-pink-300"
              borderClass="border-pink-400/30"
            />
            <FormatButton
              onClick={onCrossword}
              label={crosswordLabel}
              icon={<Hash size={14} />}
              gradient="from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30"
              textClass="text-red-300"
              borderClass="border-red-400/30"
            />
            <FormatButton
              onClick={onMemory}
              label={memoryLabel}
              icon={<Layers size={14} />}
              gradient="from-fuchsia-500/20 to-pink-500/20 hover:from-fuchsia-500/30 hover:to-pink-500/30"
              textClass="text-fuchsia-300"
              borderClass="border-fuchsia-400/30"
            />
            <FormatButton
              onClick={onPictionary}
              label={pictionaryLabel}
              icon={<Palette size={14} />}
              gradient="from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30"
              textClass="text-teal-300"
              borderClass="border-teal-400/30"
            />
          </div>

          <CategoryLabel>{categoryAssessLabel}</CategoryLabel>
          <div className="grid grid-cols-2 gap-2">
            <FormatButton
              onClick={onFlashcards}
              label={flashcardsLabel}
              icon={<CreditCard size={14} />}
              gradient="from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30"
              textClass="text-blue-300"
              borderClass="border-blue-400/30"
            />
            <FormatButton
              onClick={onSpellingTest}
              label={spellingTestLabel}
              icon={<Mic size={14} />}
              gradient="from-lime-500/20 to-green-500/20 hover:from-lime-500/30 hover:to-green-500/30"
              textClass="text-lime-300"
              borderClass="border-lime-400/30"
            />
            <FormatButton
              onClick={onQuiz}
              label={quizLabel}
              icon={<ListChecks size={14} />}
              gradient="from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30"
              textClass="text-violet-300"
              borderClass="border-violet-400/30"
              fullWidth
            />
          </div>

          <CategoryLabel>{categoryFamilyLabel}</CategoryLabel>
          <div className="grid grid-cols-2 gap-2">
            <FormatButton
              onClick={onParent}
              label={parentLabel}
              icon={<Heart size={14} />}
              gradient="from-rose-500/20 to-red-500/20 hover:from-rose-500/30 hover:to-red-500/30"
              textClass="text-rose-300"
              borderClass="border-rose-400/30"
              fullWidth
            />
          </div>

          {/* Audio pack download — fetches all topic MP3s from Supabase Storage
              via the Cloudflare Worker's /api/audio-pack route, which streams
              them as a ZIP using client-zip. The Worker handles this at the
              edge so MP3s never touch Fly.io. */}
          <a
            href={`/api/audio-pack?ids=${topicWordIds.join(",")}&name=${encodeURIComponent(title)}`}
            download
            aria-label={`${audioZipDownloadLabel} — ${title}`}
            className="mt-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3"
          >
            <Music size={18} className="text-white/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-bold truncate">{audioZipTitle}</div>
              <div className="text-white/50 text-xs truncate">{audioZipDesc}</div>
            </div>
            <Download size={14} className="text-white/70 shrink-0" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

interface PreviewState {
  html: string;
  filename: string;
  topicName: string;
  format: string;
}

// Small presentational helpers for the settings drawer. Intentionally local —
// they're not used elsewhere and keep the modal markup readable.
const SettingsField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-violet-900">
    <span>{label}:</span>
    {children}
  </label>
);

interface SegmentedOption<V> {
  value: V;
  label: string;
}
function SegmentedControl<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg bg-white p-0.5 border border-violet-200"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-bold transition-all ${
              active ? "bg-violet-600 text-white" : "text-violet-700 hover:bg-violet-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const CheckboxField: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-violet-900 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
    />
    {label}
  </label>
);

interface PreviewModalProps {
  preview: PreviewState;
  format: Format;
  printLabel: string;
  downloadLabel: string;
  cancelLabel: string;
  previewTitle: string;
  closeLabel: string;
  settings: WorksheetSettings;
  onSettingChange: <K extends keyof WorksheetSettings>(key: K, value: WorksheetSettings[K]) => void;
  /** Language used in the printable's chrome AND translation column.
   *  Independent of the global UI language so an EN-UI teacher can
   *  print an AR worksheet without flipping the whole site. */
  worksheetLang: WorksheetLang;
  onWorksheetLangChange: (v: WorksheetLang) => void;
  labels: {
    casing: string;
    casingOptions: { value: Casing; label: string }[];
    worksheetLanguage: string;
    worksheetLanguageOptions: { value: WorksheetLang; label: string }[];
    audioQR: string;
    settings: string;
    fontSize: string;
    fontSizeOptions: { value: FontSize; label: string }[];
    inkSaver: string;
    showTranslations: string;
    wordsPerPage: string;
    wordsPerPageOptions: number[];
    orientation: string;
    orientationOptions: { value: Orientation; label: string }[];
    bingoGridSize: string;
    bingoGridSizeOptions: { value: BingoGridSize; label: string }[];
    bingoCardCount: string;
    bingoCardCountOptions: { value: BingoCardCount; label: string }[];
    pageNavTemplate: string; // "Page {current} of {total}"
    prevPage: string;
    nextPage: string;
  };
  onClose: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  preview,
  format,
  printLabel,
  downloadLabel,
  cancelLabel,
  previewTitle,
  closeLabel,
  settings,
  onSettingChange,
  worksheetLang,
  onWorksheetLangChange,
  labels,
  onClose,
  onDownload,
  isDownloading,
}) => {
  const { isRTL } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const showWordsPerPage = format === "worksheet";
  const showBingoSettings = format === "bingo";
  const showTranslationsToggle =
    format === "worksheet" || format === "flashcards" || format === "bingo" || format === "fillblank";
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // ESC closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The iframe's injected script posts {type:'voca:pages', count} once it
  // mounts; we reset to page 1 on every srcDoc swap so settings changes
  // never leave the user on a now-nonexistent page.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== "voca:pages") return;
      const count = Math.max(1, Number(d.count) || 1);
      setPageCount(count);
      setCurrentPage(1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Push the current page into the iframe whenever it changes.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "voca:setPage", page: currentPage }, "*");
  }, [currentPage]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  // Portrait sheets are ~210mm wide; max-w-3xl (~768px) frames them without
  // empty gutters. Landscape gets the wider container so two-column layouts
  // (flashcards, word search) breathe properly.
  const containerWidth = settings.orientation === "portrait" ? "sm:max-w-3xl" : "sm:max-w-5xl";

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(pageCount, p + 1));

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex sm:items-center sm:justify-center z-50 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={previewTitle}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white shadow-2xl w-full h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col ${containerWidth}`}
      >
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <h3 className="text-base sm:text-xl font-bold text-white truncate flex-1 min-w-0">{previewTitle}</h3>
          <div
            className="inline-flex rounded-lg bg-white/15 p-1 border border-white/20 shrink-0"
            role="radiogroup"
            aria-label={labels.casing}
          >
            {labels.casingOptions.map((opt) => {
              const active = settings.casing === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSettingChange("casing", opt.value)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-all ${
                    active ? "bg-white text-violet-700" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="worksheet-settings-drawer"
            onClick={() => setSettingsOpen((o) => !o)}
            title={labels.settings}
            aria-label={labels.settings}
            className={`shrink-0 px-2 sm:px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
              settingsOpen
                ? "bg-white text-violet-700 border-white"
                : "bg-white/15 text-white/90 border-white/20 hover:bg-white/20"
            }`}
          >
            <Settings size={14} />
            <span className="hidden sm:inline">{labels.settings}</span>
          </button>
          <button
            onClick={onClose}
            type="button"
            aria-label={closeLabel}
            className="shrink-0 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={22} />
          </button>
        </div>

        {settingsOpen && (
          <div
            id="worksheet-settings-drawer"
            className="bg-violet-50 border-b border-violet-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap gap-x-6 gap-y-3 items-center"
          >
            <SettingsField label={labels.worksheetLanguage}>
              <SegmentedControl
                ariaLabel={labels.worksheetLanguage}
                options={labels.worksheetLanguageOptions}
                value={worksheetLang}
                onChange={(v) => onWorksheetLangChange(v)}
              />
            </SettingsField>

            <SettingsField label={labels.fontSize}>
              <SegmentedControl
                ariaLabel={labels.fontSize}
                options={labels.fontSizeOptions}
                value={settings.fontSize}
                onChange={(v) => onSettingChange("fontSize", v)}
              />
            </SettingsField>

            <SettingsField label={labels.orientation}>
              <SegmentedControl
                ariaLabel={labels.orientation}
                options={labels.orientationOptions}
                value={settings.orientation}
                onChange={(v) => onSettingChange("orientation", v)}
              />
            </SettingsField>

            {showWordsPerPage && (
              <SettingsField label={labels.wordsPerPage}>
                <SegmentedControl
                  ariaLabel={labels.wordsPerPage}
                  options={labels.wordsPerPageOptions.map((n) => ({ value: n, label: String(n) }))}
                  value={settings.wordsPerPage}
                  onChange={(v) => onSettingChange("wordsPerPage", v)}
                />
              </SettingsField>
            )}

            {showBingoSettings && (
              <>
                <SettingsField label={labels.bingoGridSize}>
                  <SegmentedControl
                    ariaLabel={labels.bingoGridSize}
                    options={labels.bingoGridSizeOptions}
                    value={settings.bingoGridSize}
                    onChange={(v) => onSettingChange("bingoGridSize", v)}
                  />
                </SettingsField>
                <SettingsField label={labels.bingoCardCount}>
                  <SegmentedControl
                    ariaLabel={labels.bingoCardCount}
                    options={labels.bingoCardCountOptions}
                    value={settings.bingoCardCount}
                    onChange={(v) => onSettingChange("bingoCardCount", v)}
                  />
                </SettingsField>
              </>
            )}

            {showTranslationsToggle && (
              <CheckboxField
                label={labels.showTranslations}
                checked={settings.showTranslations}
                onChange={(v) => onSettingChange("showTranslations", v)}
              />
            )}

            <CheckboxField
              label={labels.inkSaver}
              checked={settings.inkSaver}
              onChange={(v) => onSettingChange("inkSaver", v)}
            />

            <CheckboxField
              label={labels.audioQR}
              checked={settings.audioQR}
              onChange={(v) => onSettingChange("audioQR", v)}
            />
          </div>
        )}

        {pageCount > 1 && (
          <div className="bg-violet-50/70 border-b border-violet-200 px-3 sm:px-6 py-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={isRTL ? goNext : goPrev}
              disabled={isRTL ? currentPage >= pageCount : currentPage <= 1}
              aria-label={labels.prevPage}
              className="p-1.5 rounded-lg text-violet-700 hover:bg-violet-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs sm:text-sm font-bold text-violet-900 tabular-nums select-none" aria-live="polite">
              {labels.pageNavTemplate
                .replace("{current}", String(currentPage))
                .replace("{total}", String(pageCount))}
            </span>
            <button
              type="button"
              onClick={isRTL ? goPrev : goNext}
              disabled={isRTL ? currentPage <= 1 : currentPage >= pageCount}
              aria-label={labels.nextPage}
              className="p-1.5 rounded-lg text-violet-700 hover:bg-violet-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            ref={iframeRef}
            srcDoc={preview.html}
            title={previewTitle}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin allow-modals allow-scripts"
          />
        </div>

        <div className="bg-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t">
          <button
            onClick={onClose}
            type="button"
            className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-all text-sm sm:text-base"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handlePrint}
            type="button"
            className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white border-2 border-violet-300 hover:border-violet-500 text-violet-700 font-bold transition-all flex items-center gap-2 text-sm sm:text-base"
          >
            <Printer size={16} />
            {printLabel}
          </button>
          <button
            onClick={onDownload}
            type="button"
            disabled={isDownloading}
            className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-60 text-white font-bold transition-all flex items-center gap-2 text-sm sm:text-base"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloadLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

type Format =
  | "worksheet"
  | "matching"
  | "flashcards"
  | "bingo"
  | "wordsearch"
  | "fillblank"
  | "spelling"
  | "scramble"
  | "quiz"
  | "crossword"
  | "cloze"
  | "tracing"
  | "memory"
  | "pictionary"
  | "parent";

interface PreviewSource {
  pack: TopicPack;
  words: Word[];
  format: Format;
  filename: string;
  topicName: string;
}

const generators: Record<Format, (pack: TopicPack, words: Word[], lang: string, settings: WorksheetSettings) => string> = {
  worksheet: generateWorksheetHTML,
  matching: generateMatchingExerciseHTML,
  flashcards: generateFlashcardsHTML,
  bingo: generateBingoCardsHTML,
  wordsearch: generateWordSearchHTML,
  fillblank: generateFillBlankHTML,
  spelling: generateSpellingTestHTML,
  scramble: generateWordScrambleHTML,
  quiz: generateVocabQuizHTML,
  crossword: generateCrosswordHTML,
  cloze: generateClozeHTML,
  tracing: generateTracingHTML,
  memory: generateMemoryMatchHTML,
  pictionary: generatePictionaryHTML,
  parent: generateParentHandoutHTML,
};

const filenameSuffix: Record<Format, string> = {
  worksheet: "Worksheet",
  matching: "Matching_Exercise",
  flashcards: "Flashcards",
  bingo: "Bingo_Cards",
  wordsearch: "Word_Search",
  fillblank: "Fill_in_the_Blank",
  spelling: "Spelling_Test",
  scramble: "Word_Scramble",
  quiz: "Vocabulary_Quiz",
  crossword: "Crossword",
  cloze: "Cloze_Reading",
  tracing: "Tracing_Practice",
  memory: "Memory_Match",
  pictionary: "Pictionary",
  parent: "Parent_Handout",
};

// Themed bundles — virtual TopicPacks composed from curated word ids
// across the existing pack catalogue.  Each bundle behaves exactly
// like a TopicPack inside the preview modal: same generators, same
// settings, same download path.  Lookup key is the English `name`
// field; the dashboard UI shows a localised label from the free-
// resources locale.  Word ids are sampled from existing TOPIC_PACKS
// definitions in src/data/vocabulary.ts so we don't duplicate
// curation effort and the lemmas are guaranteed to exist in
// ALL_WORDS.  Duplicates are deduped at render time.
const THEMED_BUNDLES: { name: string; icon: string; ids: number[] }[] = [
  {
    name: "Back to School",
    icon: "🎒",
    ids: [
      // School essentials (12)
      507, 817, 1172, 2173, 2174, 2605, 2628, 3892, 4271, 4275, 4433, 4480,
      // Family basics (5)
      582, 785, 1103, 1557, 1580,
      // Numbers (5)
      1371, 1384, 1396, 1452, 1654,
      // Days & months (4)
      1587, 1739, 2450, 2943,
    ],
  },
  {
    name: "Winter Holidays",
    icon: "❄️",
    ids: [
      // Weather (12 — full pack)
      859, 879, 2190, 3625, 3631, 4095, 4245, 4313, 4319, 4914, 4956, 5048,
      // Feelings (6)
      87, 179, 516, 1485, 2045, 3556,
      // Family — for festive lessons (5)
      582, 785, 1103, 1557, 1580,
    ],
  },
  {
    name: "End of Year Review",
    icon: "🎓",
    ids: [
      // High-frequency mix across the staple categories so a single
      // worksheet covers a year's worth of basics for review.
      // Animals (5)
      180, 476, 702, 1272, 1643,
      // Food (5)
      208, 349, 554, 562, 1212,
      // Colors (5)
      481, 498, 532, 1962, 1969,
      // Numbers (5)
      1371, 1384, 1396, 1452, 1654,
      // Body parts (5)
      232, 1339, 1528, 1532, 1629,
    ],
  },
];

// Worksheet language is decoupled from the global UI language.  An
// Arabic-speaking teacher whose Vocaband UI is in English should be
// able to print worksheets in Arabic for her students without
// flipping the whole site to Arabic — and vice versa.  Persisted to
// localStorage so the picker sticks across sessions.
type WorksheetLang = "en" | "he" | "ar";
const WORKSHEET_LANG_KEY = "vocaband:freeResources:worksheetLang";
const isWorksheetLang = (s: string): s is WorksheetLang =>
  s === "en" || s === "he" || s === "ar";

const FreeResourcesView: React.FC<FreeResourcesViewProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onBack }) => {
  const { language, dir, isRTL } = useLanguage();
  const t = freeResourcesT[language];
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource | null>(null);
  const [settings, setSettings] = useState<WorksheetSettings>(DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  // null = collapsed; otherwise the lookup key of the bundle whose format
  // picker is currently open. Only one bundle is expanded at a time so the
  // page doesn't grow unboundedly.
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [worksheetLang, setWorksheetLang] = useState<WorksheetLang>(() => {
    if (typeof window === "undefined") return language as WorksheetLang;
    try {
      const saved = window.localStorage.getItem(WORKSHEET_LANG_KEY);
      if (saved && isWorksheetLang(saved)) return saved;
    } catch { /* localStorage blocked; fall through */ }
    return isWorksheetLang(language) ? language : "en";
  });
  useEffect(() => {
    try { window.localStorage.setItem(WORKSHEET_LANG_KEY, worksheetLang); } catch { /* ignore */ }
  }, [worksheetLang]);

  // Slides generator state.  Default to the first themed bundle so a
  // teacher's first click yields something useful with no dropdown
  // hunting; the rest of the catalogue is one keystroke away.
  const [slidesPackChoice, setSlidesPackChoice] = useState<string>(THEMED_BUNDLES[0]?.name ?? "");
  const [isSlidesGenerating, setIsSlidesGenerating] = useState(false);
  const handleSlidesDownload = async () => {
    if (isSlidesGenerating || !slidesPackChoice) return;
    const pack =
      TOPIC_PACKS.find((p) => p.name === slidesPackChoice) ??
      THEMED_BUNDLES.find((b) => b.name === slidesPackChoice);
    if (!pack) return;
    const uniqueIds = Array.from(new Set(pack.ids));
    const words = uniqueIds
      .map((id) => ALL_WORDS.find((w) => w.id === id))
      .filter((w): w is Word => Boolean(w));
    if (words.length === 0) return;
    setIsSlidesGenerating(true);
    try {
      const { downloadSlidesPPTX } = await import("../utils/generateSlidesPPTX");
      await downloadSlidesPPTX(pack.name, words, worksheetLang);
    } catch (err) {
      console.error("[Slides] generation failed:", err);
    } finally {
      setIsSlidesGenerating(false);
    }
  };

  // Strip the trailing emoji from pack names so "school" matches "School 📚".
  const filteredPacks = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return TOPIC_PACKS;
    return TOPIC_PACKS.filter((p) => p.name.toLowerCase().includes(q));
  }, [topicSearch]);

  const updateSetting = <K extends keyof WorksheetSettings>(key: K, value: WorksheetSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  // HTML is derived from source + settings, so flipping any toggle re-renders
  // the iframe instantly without a network round-trip.
  const preview: PreviewState | null = useMemo(() => {
    if (!previewSource) return null;
    return {
      html: generators[previewSource.format](previewSource.pack, previewSource.words, worksheetLang, settings),
      filename: previewSource.filename,
      topicName: previewSource.topicName,
      format: previewSource.format,
    };
  }, [previewSource, worksheetLang, settings]);

  const casingOptions: { value: Casing; label: string }[] = [
    { value: "original", label: t.casingOriginal },
    { value: "lower", label: t.casingLower },
    { value: "upper", label: t.casingUpper },
  ];

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: "small", label: t.fontSizeSmall },
    { value: "medium", label: t.fontSizeMedium },
    { value: "large", label: t.fontSizeLarge },
  ];

  const orientationOptions: { value: Orientation; label: string }[] = [
    { value: "portrait", label: t.orientationPortrait },
    { value: "landscape", label: t.orientationLandscape },
  ];

  const wordsPerPageOptions = [15, 22, 30];
  const bingoGridSizeOptions: { value: BingoGridSize; label: string }[] = [
    { value: 3, label: "3×3" },
    { value: 5, label: "5×5" },
    { value: 7, label: "7×7" },
  ];
  const bingoCardCountOptions: { value: BingoCardCount; label: string }[] = [
    { value: 4, label: "4" },
    { value: 8, label: "8" },
    { value: 16, label: "16" },
  ];

  const openPreview = (topicName: string, format: Format) => {
    // Bundles are virtual TopicPacks — fall back to that catalogue if
    // the name doesn't resolve in the regular pack list.
    const pack =
      TOPIC_PACKS.find((tp) => tp.name === topicName) ??
      THEMED_BUNDLES.find((b) => b.name === topicName);
    if (!pack) return;
    // De-dupe the bundle ids — composing across packs sometimes
    // overlaps (e.g. Family appearing in two themes) and we don't
    // want the same lemma rendered twice on a worksheet.
    const uniqueIds = Array.from(new Set(pack.ids));
    const words = uniqueIds
      .map((id) => ALL_WORDS.find((w) => w.id === id))
      .filter((w): w is Word => Boolean(w));
    if (words.length === 0) return;

    setActiveTopic(`${format}-${topicName}`);
    setPreviewSource({
      pack,
      words,
      format,
      topicName,
      filename: `${safeFilename(pack.name)}_${filenameSuffix[format]}.pdf`,
    });
    setActiveTopic(null);
  };

  const handleConfirmDownload = async () => {
    if (!preview) return;
    setIsExporting(true);
    const container = document.createElement("div");
    container.innerHTML = preview.html;

    // String fields here are literal unions in the html2pdf.js .d.ts (e.g.
    // "jpeg" | "png", "mm" | "cm" | "in"), so we need `as const` to stop
    // TS widening them to plain string and tripping the type guard.
    const opt = {
      margin: 0,
      filename: preview.filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: settings.orientation,
        compress: true,
      },
      pagebreak: { mode: ["css", "legacy"] as const },
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsExporting(false);
      setPreviewSource(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav currentPage="resources" onNavigate={onNavigate} onGetStarted={onGetStarted} onTeacherLogin={onTeacherLogin} />

      <main className="pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all group"
            >
              <ArrowLeft
                size={20}
                className={`transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180" : ""}`}
              />
              <span>{t.backButton}</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12 md:mb-16"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-violet-500/20 border border-violet-400/30 mb-6">
              <FileText size={20} className="text-violet-300" />
              <span className="text-violet-200 font-bold text-sm">{t.freeResourcesPill}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 font-headline">{t.title}</h1>
            <p
              className="text-base md:text-lg text-white/70 max-w-2xl mx-auto"
              dir={dir}
              style={{ textAlign: isRTL ? "right" : "left" }}
            >
              {t.subtitle}
            </p>
          </motion.div>

          {/* Theme bundles — multi-topic curated packs.  Each bundle is
              a virtual TopicPack (see THEMED_BUNDLES at module scope)
              that opens in the same preview modal as a regular pack.
              Bundle names map to THEMED_BUNDLES keys; the UI label is
              localised via the free-resources locale. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t.bundlesTitle}</h2>
                <p className="text-white/60 text-sm">{t.bundlesSubtitle}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { lookup: "Back to School",     label: t.bundleBackToSchool, desc: t.bundleBackToSchoolDesc, gradient: "from-sky-500 to-indigo-500",    emoji: "🎒" },
                { lookup: "Winter Holidays",    label: t.bundleHolidays,     desc: t.bundleHolidaysDesc,     gradient: "from-rose-500 to-pink-500",     emoji: "❄️" },
                { lookup: "End of Year Review", label: t.bundleEndOfYear,    desc: t.bundleEndOfYearDesc,    gradient: "from-emerald-500 to-teal-500",  emoji: "🎓" },
              ].map((bundle) => {
                const bundleData = THEMED_BUNDLES.find((b) => b.name === bundle.lookup);
                const wordCount = bundleData ? new Set(bundleData.ids).size : 0;
                const isOpen = expandedBundle === bundle.lookup;
                // Six headline formats per bundle. Worksheet stays the
                // default direct download; the rest are surfaced when the
                // teacher expands the picker so the bundle isn't locked
                // to a single sheet type.
                const bundleFormats: { key: Format; label: string }[] = [
                  { key: "worksheet", label: t.download },
                  { key: "flashcards", label: t.downloadFlashcards },
                  { key: "quiz", label: t.downloadQuiz },
                  { key: "crossword", label: t.downloadCrossword },
                  { key: "wordsearch", label: t.downloadWordSearch },
                  { key: "bingo", label: t.downloadBingo },
                ];
                return (
                  <div
                    key={bundle.lookup}
                    className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden hover:border-white/30 transition-all"
                  >
                    <div className={`bg-gradient-to-br ${bundle.gradient} p-5 flex items-center gap-3`}>
                      <span className="text-3xl">{bundle.emoji}</span>
                      <h3 className="text-lg font-bold text-white truncate">{bundle.label}</h3>
                    </div>
                    <div className="p-5">
                      <p className="text-white/70 text-sm leading-relaxed mb-4 min-h-[3.5rem]">{bundle.desc}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/60 bg-white/10 px-2 py-1 rounded">
                          {wordCount} words
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPreview(bundle.lookup, "worksheet")}
                            className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${bundle.gradient} text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md`}
                          >
                            <Download size={12} />
                            {t.bundleDownload}
                          </button>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? "Hide formats" : "Show more formats"}
                            onClick={() => setExpandedBundle(isOpen ? null : bundle.lookup)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-all"
                          >
                            {isOpen ? <ChevronLeft size={14} className="-rotate-90" /> : <ChevronRight size={14} className="rotate-90" />}
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                          {bundleFormats.map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => openPreview(bundle.lookup, f.key)}
                              className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/90 text-xs font-bold transition-all truncate"
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Slides generator — picks any TopicPack/bundle and produces a
              .pptx via pptxgenjs (lazy-loaded).  Replaces the previous
              Google-hosted-template link, which required us to maintain
              a Google Drive file and didn't include the teacher's
              chosen vocabulary anyway.  This generates a real deck
              with one slide per word + the active worksheetLang
              translation.  Opens in PowerPoint, Keynote, or via
              File → Import Slides in Google Slides. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-12"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 flex flex-wrap items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Presentation size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-lg font-bold text-white">{t.slidesTitle}</h3>
                <p className="text-white/60 text-sm">{t.slidesDesc}</p>
              </div>
              <select
                value={slidesPackChoice}
                onChange={(e) => setSlidesPackChoice(e.target.value)}
                aria-label={t.slidesTitle}
                className="shrink-0 px-3 py-2 rounded-lg bg-slate-900/70 text-white border border-white/20 hover:border-white/30 text-sm font-bold focus:outline-none focus:border-amber-400"
              >
                <optgroup label="Bundles">
                  {THEMED_BUNDLES.map((b) => (
                    <option key={b.name} value={b.name}>{b.icon} {b.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Topic packs">
                  {TOPIC_PACKS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                onClick={handleSlidesDownload}
                disabled={isSlidesGenerating}
                className="shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-wait text-white text-sm font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Download size={14} />
                {isSlidesGenerating ? "..." : t.slidesOpen}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t.topicPacksTitle}</h2>
                <p className="text-white/60 text-sm">{t.topicPacksSubtitle}</p>
              </div>
            </div>

            <div className="sticky top-20 z-20 mb-6 -mx-2 px-2 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10">
              <div className="relative">
                <Search
                  size={18}
                  className={`absolute top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}
                />
                <input
                  type="search"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchPlaceholder}
                  dir={dir}
                  className={`w-full ${isRTL ? "pr-10 pl-10" : "pl-10 pr-10"} py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 font-semibold focus:outline-none focus:border-violet-400 focus:bg-white/15 transition-all`}
                />
                {topicSearch && (
                  <button
                    type="button"
                    onClick={() => setTopicSearch("")}
                    aria-label={t.searchClear}
                    className={`absolute top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 rounded ${isRTL ? "left-2" : "right-2"}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {topicSearch && (
                <p className="text-violet-200/80 text-xs font-semibold mt-2 px-1" dir={dir}>
                  {t.searchResults
                    .replace("{matched}", String(filteredPacks.length))
                    .replace("{total}", String(TOPIC_PACKS.length))}
                </p>
              )}
            </div>

            {filteredPacks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl bg-white/5 border border-white/10">
                <Search size={40} className="mx-auto mb-3 text-violet-400/60" />
                <p className="text-white/70 font-semibold">{t.searchEmpty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredPacks.map((topic, index) => {
                  const wordCount = topic.ids.length;
                  const pagesCount = Math.max(1, Math.ceil(wordCount / 22));
                  // Stable gradient: keyed off the original pack index so the same
                  // pack always gets the same color regardless of filter results.
                  const stableIndex = TOPIC_PACKS.findIndex((p) => p.name === topic.name);
                  const gradient = GRADIENTS[stableIndex % GRADIENTS.length];
                  const isDownloading = activeTopic !== null && activeTopic.endsWith(`-${topic.name}`);

                  return (
                    <ResourceCard
                      key={topic.name}
                      icon={<span className="text-3xl">{topic.icon}</span>}
                      title={topic.name}
                      description={t.topicPackDescription.replace("{count}", wordCount.toString())}
                      size={t.topicPackSize.replace("{words}", wordCount.toString()).replace("{pages}", pagesCount.toString())}
                      downloadLabel={t.download}
                      matchingLabel={t.downloadMatching}
                      flashcardsLabel={t.downloadFlashcards}
                      bingoLabel={t.downloadBingo}
                      wordSearchLabel={t.downloadWordSearch}
                      fillBlankLabel={t.downloadFillBlank}
                      spellingTestLabel={t.downloadSpellingTest}
                      scrambleLabel={t.downloadScramble}
                      quizLabel={t.downloadQuiz}
                      crosswordLabel={t.downloadCrossword}
                      clozeLabel={t.downloadCloze}
                      tracingLabel={t.downloadTracing}
                      memoryLabel={t.downloadMemory}
                      pictionaryLabel={t.downloadPictionary}
                      parentLabel={t.downloadParent}
                      categoryPracticeLabel={t.categoryPractice}
                      categoryGamesLabel={t.categoryGames}
                      categoryAssessLabel={t.categoryAssess}
                      categoryFamilyLabel={t.categoryFamily}
                      audioZipTitle={t.audioZipTitle}
                      audioZipDesc={t.audioZipDesc}
                      audioZipDownloadLabel={t.audioZipDownload}
                      topicWordIds={topic.ids}
                      gradient={gradient}
                      delay={Math.min(index * 0.05, 0.5)}
                      onDownload={() => openPreview(topic.name, "worksheet")}
                      onMatching={() => openPreview(topic.name, "matching")}
                      onFlashcards={() => openPreview(topic.name, "flashcards")}
                      onBingo={() => openPreview(topic.name, "bingo")}
                      onWordSearch={() => openPreview(topic.name, "wordsearch")}
                      onFillBlank={() => openPreview(topic.name, "fillblank")}
                      onSpellingTest={() => openPreview(topic.name, "spelling")}
                      onScramble={() => openPreview(topic.name, "scramble")}
                      onQuiz={() => openPreview(topic.name, "quiz")}
                      onCrossword={() => openPreview(topic.name, "crossword")}
                      onCloze={() => openPreview(topic.name, "cloze")}
                      onTracing={() => openPreview(topic.name, "tracing")}
                      onMemory={() => openPreview(topic.name, "memory")}
                      onPictionary={() => openPreview(topic.name, "pictionary")}
                      onParent={() => openPreview(topic.name, "parent")}
                      isDownloading={isDownloading}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-8 md:p-12 lg:p-16 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10"
          >
            <Rocket size={40} className="mx-auto mb-4 text-violet-400" />
            <h3 className="text-2xl font-bold text-white mb-3">{t.ctaTitle}</h3>
            <p
              className="text-white/70 mb-6 max-w-xl mx-auto"
              dir={dir}
              style={{ textAlign: isRTL ? "right" : "left" }}
            >
              {t.ctaText}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
              type="button"
            >
              {t.ctaButton}
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex justify-center"
          >
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 font-bold transition-all border border-white/20 hover:border-white/30"
            >
              <ArrowLeft size={20} className={`transition-transform ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </motion.div>
        </div>
      </main>

      {preview && previewSource && (
        <PreviewModal
          preview={preview}
          format={previewSource.format}
          previewTitle={t.previewTitle}
          printLabel={t.print}
          downloadLabel={t.download}
          cancelLabel={t.cancel}
          closeLabel={t.closePreview}
          settings={settings}
          onSettingChange={updateSetting}
          worksheetLang={worksheetLang}
          onWorksheetLangChange={setWorksheetLang}
          labels={{
            casing: t.casingLabel,
            casingOptions,
            // Inline because the locale file doesn't carry this yet —
            // worksheet-language picker is a new feature.  Native
            // names render the same in any UI language anyway, so the
            // heading is the only thing that needs translation.
            worksheetLanguage:
              language === "he" ? "שפת הגיליון" :
              language === "ar" ? "لغة الورقة" :
              "Worksheet language",
            worksheetLanguageOptions: [
              { value: "en", label: "English" },
              { value: "he", label: "עברית" },
              { value: "ar", label: "العربية" },
            ],
            audioQR: t.audioQRLabel,
            settings: t.settingsLabel,
            fontSize: t.fontSizeLabel,
            fontSizeOptions,
            inkSaver: t.inkSaverLabel,
            showTranslations: t.showTranslationsLabel,
            wordsPerPage: t.wordsPerPageLabel,
            wordsPerPageOptions,
            orientation: t.orientationLabel,
            orientationOptions,
            bingoGridSize: t.bingoGridSizeLabel,
            bingoGridSizeOptions,
            bingoCardCount: t.bingoCardCountLabel,
            bingoCardCountOptions,
            pageNavTemplate: t.pageNavLabel,
            prevPage: t.prevPage,
            nextPage: t.nextPage,
          }}
          onClose={() => setPreviewSource(null)}
          onDownload={handleConfirmDownload}
          isDownloading={isExporting}
        />
      )}
    </div>
  );
};

export default FreeResourcesView;
