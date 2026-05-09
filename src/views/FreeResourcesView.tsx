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
  const headerBg = ink ? "#ffffff" : accent;
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

// ---------- React components ----------

interface FreeResourcesViewProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "faq") => void;
  onGetStarted: () => void;
  /** Teacher signup — drives PublicNav's "Start free" CTA. */
  onTeacherLogin?: () => void;
  onBack: () => void;
}

interface ResourceCardProps {
  topicName: string;
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
  gradient: string;
  delay: number;
  onDownload: () => void;
  onMatching: () => void;
  onFlashcards: () => void;
  onBingo: () => void;
  onWordSearch: () => void;
  onFillBlank: () => void;
  isDownloading: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  topicName,
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
  gradient,
  delay,
  onDownload,
  onMatching,
  onFlashcards,
  onBingo,
  onWordSearch,
  onFillBlank,
  isDownloading,
}) => {
  const { isRTL } = useLanguage();

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

          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onMatching}
              aria-label={`${matchingLabel} — ${title}`}
              className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-400/30 text-sm"
              type="button"
            >
              <Gamepad2 size={14} />
              <span className="truncate">{matchingLabel}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onFlashcards}
              aria-label={`${flashcardsLabel} — ${title}`}
              className="py-2.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-blue-400/30 text-sm"
              type="button"
            >
              <CreditCard size={14} />
              <span className="truncate">{flashcardsLabel}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBingo}
              aria-label={`${bingoLabel} — ${title}`}
              className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-amber-400/30 text-sm"
              type="button"
            >
              <Grid3x3 size={14} />
              <span className="truncate">{bingoLabel}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onWordSearch}
              aria-label={`${wordSearchLabel} — ${title}`}
              className="py-2.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 text-pink-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-pink-400/30 text-sm"
              type="button"
            >
              <Search size={14} />
              <span className="truncate">{wordSearchLabel}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onFillBlank}
              aria-label={`${fillBlankLabel} — ${title}`}
              className="col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-cyan-500/20 hover:from-sky-500/30 hover:to-cyan-500/30 text-sky-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-sky-400/30 text-sm"
              type="button"
            >
              <PencilLine size={14} />
              <span className="truncate">{fillBlankLabel}</span>
            </motion.button>
          </div>
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
  labels: {
    casing: string;
    casingOptions: { value: Casing; label: string }[];
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

type Format = "worksheet" | "matching" | "flashcards" | "bingo" | "wordsearch" | "fillblank";

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
};

const filenameSuffix: Record<Format, string> = {
  worksheet: "Worksheet",
  matching: "Matching_Exercise",
  flashcards: "Flashcards",
  bingo: "Bingo_Cards",
  wordsearch: "Word_Search",
  fillblank: "Fill_in_the_Blank",
};

const FreeResourcesView: React.FC<FreeResourcesViewProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onBack }) => {
  const { language, dir, textAlign, isRTL } = useLanguage();
  const t = freeResourcesT[language];
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource | null>(null);
  const [settings, setSettings] = useState<WorksheetSettings>(DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");

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
      html: generators[previewSource.format](previewSource.pack, previewSource.words, language, settings),
      filename: previewSource.filename,
      topicName: previewSource.topicName,
      format: previewSource.format,
    };
  }, [previewSource, language, settings]);

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
    const pack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!pack) return;
    const words = pack.ids
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

    const opt = {
      margin: 0,
      filename: preview.filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: settings.orientation, compress: true },
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
            <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto" dir={dir} style={{ textAlign }}>
              {t.subtitle}
            </p>
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
                      topicName={topic.name}
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
                      gradient={gradient}
                      delay={Math.min(index * 0.05, 0.5)}
                      onDownload={() => openPreview(topic.name, "worksheet")}
                      onMatching={() => openPreview(topic.name, "matching")}
                      onFlashcards={() => openPreview(topic.name, "flashcards")}
                      onBingo={() => openPreview(topic.name, "bingo")}
                      onWordSearch={() => openPreview(topic.name, "wordsearch")}
                      onFillBlank={() => openPreview(topic.name, "fillblank")}
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
            <p className="text-white/70 mb-6 max-w-xl mx-auto" dir={dir} style={{ textAlign }}>
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
          labels={{
            casing: t.casingLabel,
            casingOptions,
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
