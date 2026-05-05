import React, { useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { freeResourcesT } from "../locales/student/free-resources";
import { TOPIC_PACKS, ALL_WORDS } from "../data/vocabulary";
import {
  ArrowLeft,
  Download,
  FileText,
  Rocket,
  Loader2,
  Gamepad2,
  CreditCard,
  Grid3x3,
  Search,
} from "lucide-react";
import PublicNav from "../components/PublicNav";
import html2pdf from "html2pdf.js";

// Gradient styles for topic pack cards - cycles through different vibrant combinations
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

interface FreeResourcesViewProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "accessibility" | "security" | "faq") => void;
  onGetStarted: () => void;
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
  gradient: string;
  delay: number;
  onDownload: () => void;
  onMatching: () => void;
  onFlashcards: () => void;
  onBingo: () => void;
  onWordSearch: () => void;
  isDownloading: boolean;
}

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
  gradient,
  delay,
  onDownload,
  onMatching,
  onFlashcards,
  onBingo,
  onWordSearch,
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
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${gradient} p-6 flex items-center gap-4`}>
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <p className="text-white/90 text-base font-semibold">{size}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-white/80 mb-4 leading-relaxed text-lg">{description}</p>

        <div className="grid grid-cols-1 gap-2">
          {/* Main Download Button - Full Width */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownload}
            disabled={isDownloading}
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

          {/* Secondary Buttons - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Matching Exercise */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onMatching}
              className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-400/30 text-sm"
              type="button"
            >
              <Gamepad2 size={14} />
              {matchingLabel}
            </motion.button>

            {/* Flashcards */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onFlashcards}
              className="py-2.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-blue-400/30 text-sm"
              type="button"
            >
              <CreditCard size={14} />
              {flashcardsLabel}
            </motion.button>

            {/* Bingo Cards */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBingo}
              className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-amber-400/30 text-sm"
              type="button"
            >
              <Grid3x3 size={14} />
              {bingoLabel}
            </motion.button>

            {/* Word Search */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onWordSearch}
              className="py-2.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 text-pink-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-pink-400/30 text-sm"
              type="button"
            >
              <Search size={14} />
              {wordSearchLabel}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FreeResourcesView: React.FC<FreeResourcesViewProps> = ({
  onNavigate,
  onGetStarted,
  onBack,
}) => {
  const { language, dir, textAlign, isRTL } = useLanguage();
  const t = freeResourcesT[language];
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{ html: string; filename: string } | null>(null);

  const handleDownload = async (topicName: string) => {
    setDownloadingId(topicName);

    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);
    const worksheetHTML = generateWorksheetHTML(topicPack, words, language);

    setPreviewContent({
      html: worksheetHTML,
      filename: `${topicPack.name.replace(/\s+/g, "_")}_Worksheet.pdf`,
    });
    setDownloadingId(null);
  };

  const handleMatchingExercise = async (topicName: string) => {
    setDownloadingId(`matching-${topicName}`);

    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);
    const matchingHTML = generateMatchingExerciseHTML(topicPack, words, language);

    setPreviewContent({
      html: matchingHTML,
      filename: `${topicPack.name.replace(/\s+/g, "_")}_Matching_Exercise.pdf`,
    });
    setDownloadingId(null);
  };

  const handleFlashcards = async (topicName: string) => {
    setDownloadingId(`flashcards-${topicName}`);

    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);
    const flashcardsHTML = generateFlashcardsHTML(topicPack, words, language);

    setPreviewContent({
      html: flashcardsHTML,
      filename: `${topicPack.name.replace(/\s+/g, "_")}_Flashcards.pdf`,
    });
    setDownloadingId(null);
  };

  const handleBingoCards = async (topicName: string) => {
    setDownloadingId(`bingo-${topicName}`);

    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);
    const bingoHTML = generateBingoCardsHTML(topicPack, words, language);

    setPreviewContent({
      html: bingoHTML,
      filename: `${topicPack.name.replace(/\s+/g, "_")}_Bingo_Cards.pdf`,
    });
    setDownloadingId(null);
  };

  const handleWordSearch = async (topicName: string) => {
    setDownloadingId(`wordsearch-${topicName}`);

    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);
    const wordSearchHTML = generateWordSearchHTML(topicPack, words, language);

    setPreviewContent({
      html: wordSearchHTML,
      filename: `${topicPack.name.replace(/\s+/g, "_")}_Word_Search.pdf`,
    });
    setDownloadingId(null);
  };

  const handleConfirmDownload = async () => {
    if (!previewContent) return;

    const container = document.createElement("div");
    container.innerHTML = previewContent.html;

    const opt = {
      margin: 10,
      filename: previewContent.filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
    }

    setPreviewContent(null);
  };

  const generateWorksheetHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";
    const wordCount = words.length;
    const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : lang === "ar" ? "ar-SA" : "en-US");

    // Translations for the worksheet
    const worksheetTitles = {
      en: {
        vocabulary: "Vocabulary Worksheet",
        word: "English",
        translation: "Translation",
        practice: "Practice Writing",
        name: "Name:",
        date: "Date:",
        school: "School:",
        class: "Class:",
      },
      he: {
        vocabulary: "גיליון עבודה - אוצר מילים",
        word: "אנגלית",
        translation: "תרגום",
        practice: "תרגול כתיבה",
        name: "שם:",
        date: "תאריך:",
        school: "בית ספר:",
        class: "כיתה:",
      },
      ar: {
        vocabulary: "ورقة عمل - المفردات",
        word: "الإنجليزية",
        translation: "الترجمة",
        practice: "تمارين الكتابة",
        name: "الاسم:",
        date: "التاريخ:",
        school: "المدرسة:",
        class: "الصف:",
      },
    };

    const titles = worksheetTitles[lang as keyof typeof worksheetTitles] || worksheetTitles.en;

    // Get translation based on language
    const getTranslation = (word: typeof ALL_WORDS[0]) => {
      if (lang === "he") return word.hebrew;
      if (lang === "ar") return word.arabic;
      return word.hebrew;
    };

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topicPack.name} - ${titles.vocabulary}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 12mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.4;
      color: #333;
      font-size: 14px;
    }
    .container {
      padding: 12px;
      max-width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 4px solid #8b5cf6;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .logo {
      font-size: 26px;
      font-weight: bold;
      color: #8b5cf6;
    }
    .topic-icon {
      font-size: 42px;
    }
    .topic-title {
      font-size: 24px;
      font-weight: bold;
      color: #7c3aed;
      margin-bottom: 4px;
    }
    .word-count {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .student-info {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 15px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 10px;
    }
    .info-field {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 13px;
      font-weight: bold;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .info-input {
      border-bottom: 2px solid #d1d5db;
      height: 26px;
      padding: 2px 6px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
      color: white;
      padding: 10px 8px;
      text-align: ${isRTL ? "right" : "left"};
      font-weight: bold;
      font-size: 14px;
    }
    td {
      padding: 8px 6px;
      border-bottom: 1px solid #e5e7eb;
      text-align: ${isRTL ? "right" : "left"};
      font-size: 14px;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .num-cell {
      font-weight: bold;
      color: #8b5cf6;
      width: 6%;
      text-align: center;
      font-size: 16px;
    }
    .word-cell {
      font-weight: 600;
      color: #7c3aed;
      width: 47%;
      font-size: 17px;
    }
    .translation-cell {
      color: #374151;
      width: 47%;
      font-size: 17px;
    }
    .practice-section {
      margin-top: 12px;
      padding: 16px;
      background: #fef3c7;
      border-radius: 12px;
      border: 3px dashed #f59e0b;
    }
    .practice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .practice-title {
      font-size: 20px;
      font-weight: bold;
      color: #92400e;
    }
    .practice-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .practice-box {
      border: 2px solid #d1d5db;
      border-radius: 8px;
      padding: 10px;
      background: white;
      min-height: 70px;
      display: flex;
      flex-direction: column;
    }
    .practice-label {
      font-size: 13px;
      color: #7c3aed;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .practice-inputs {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .practice-input {
      border-bottom: 2px dotted #9ca3af;
      padding: 3px 0;
      font-size: 12px;
      min-height: 20px;
    }
    .practice-input.english::before {
      content: "English: ";
      font-size: 10px;
      color: #9ca3af;
    }
    .practice-input.translation::before {
      content: "${lang === "he" ? "תרגום: " : lang === "ar" ? "الترجمة: " : "Translation: "}";
      font-size: 10px;
      color: #9ca3af;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="logo">📚 Vocaband</div>
        <div class="topic-icon">${topicPack.icon}</div>
        <div style="font-size: 12px; color: #9ca3af;">${today}</div>
      </div>
      <div class="topic-title">${topicPack.name}</div>
      <div class="word-count">${wordCount} words</div>
    </div>

    <!-- Student Info -->
    <div class="student-info">
      <div class="info-field">
        <span class="info-label">${titles.name}</span>
        <div class="info-input"></div>
      </div>
      <div class="info-field">
        <span class="info-label">${titles.date}</span>
        <div class="info-input">${today}</div>
      </div>
      <div class="info-field">
        <span class="info-label">${titles.school}</span>
        <div class="info-input"></div>
      </div>
      <div class="info-field">
        <span class="info-label">${titles.class}</span>
        <div class="info-input"></div>
      </div>
    </div>

    <!-- Vocabulary Table -->
    <table>
      <thead>
        <tr>
          <th class="num-cell">#</th>
          <th>${titles.word}</th>
          <th>${titles.translation}</th>
        </tr>
      </thead>
      <tbody>
        ${words.map((word, index) => `
          <tr>
            <td class="num-cell">${index + 1}</td>
            <td class="word-cell">${word.english}</td>
            <td class="translation-cell">${getTranslation(word)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Practice Section -->
    <div class="practice-section">
      <div class="practice-header">
        <div class="practice-title">✏️ ${titles.practice}</div>
      </div>
      <div class="practice-grid">
        ${words.map((_, i) => `
          <div class="practice-box">
            <div class="practice-label">${i + 1}.</div>
            <div class="practice-inputs">
              <div class="practice-input english"></div>
              <div class="practice-input translation"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>
</body>
</html>
    `;
  };

  const generateMatchingExerciseHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";

    // Translations for the matching exercise
    const matchingTitles = {
      en: {
        title: "Matching Exercise",
        instructions: "Write the number of the correct English word next to each translation.",
        englishWords: "English Words",
        translations: "Translations",
        writeNumber: "Write #",
        name: "Name:",
        date: "Date:",
        page: "Page",
      },
      he: {
        title: "תרגיל התאמה",
        instructions: "כתובו את מספר המילה הנכונה באנגלית ליד כל תרגום.",
        englishWords: "מילים באנגלית",
        translations: "תרגומים",
        writeNumber: "כתוב #",
        name: "שם:",
        date: "תאריך:",
        page: "עמוד",
      },
      ar: {
        title: "تمرين المطابقة",
        instructions: "اكتب رقم الكلمة الإنجليزية الصحيحة بجانب كل ترجمة.",
        englishWords: "الكلمات الإنجليزية",
        translations: "الترجمات",
        writeNumber: "اكتب #",
        name: "الاسم:",
        date: "التاريخ:",
        page: "صفحة",
      },
    };

    const titles = matchingTitles[lang as keyof typeof matchingTitles] || matchingTitles.en;

    // Get translation based on language
    const getTranslation = (word: typeof ALL_WORDS[0]) => {
      if (lang === "he") return word.hebrew;
      if (lang === "ar") return word.arabic;
      return word.hebrew;
    };

    // Create TWO separate sections:
    // 1. English words numbered in order
    // 2. Scrambled translations with empty boxes for numbers

    // Shuffle translations independently
    const shuffledTranslations = [...words]
      .map((word, index) => ({
        translation: getTranslation(word),
        correctNumber: index + 1
      }))
      .sort(() => Math.random() - 0.5);

    // English words section (numbered)
    const englishWordsSection = words.map((word, index) => `
      <div class="word-item">
        <span class="word-num">${index + 1}.</span>
        <span class="word-text">${word.english}</span>
      </div>
    `).join("");

    // Translations section (scrambled, with number input)
    const translationsSection = shuffledTranslations.map((item) => `
      <div class="translation-item">
        <span class="translation-text">${item.translation}</span>
        <div class="number-box">___</div>
      </div>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topicPack.name} - ${titles.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 12mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.4;
      color: #333;
      font-size: 14px;
    }
    .page {
      padding: 15px;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 3px solid #10b981;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 5px;
    }
    .topic-icon {
      font-size: 40px;
      margin: 10px 0;
    }
    .topic-title {
      font-size: 20px;
      font-weight: bold;
      color: #059669;
    }
    .instructions-box {
      background: #ecfdf5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 12px;
      margin: 15px 0;
      text-align: center;
    }
    .instructions-text {
      font-size: 14px;
      color: #047857;
      font-weight: 500;
    }
    .student-info {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 8px;
      gap: 15px;
    }
    .info-field {
      flex: 1;
    }
    .info-label {
      font-size: 12px;
      font-weight: bold;
      color: #374151;
      display: block;
      margin-bottom: 4px;
    }
    .info-line {
      border-bottom: 2px solid #d1d5db;
      height: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #059669;
      margin: 15px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .words-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .word-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f0fdf4;
      border-radius: 6px;
      border: 1px solid #10b981;
    }
    .word-num {
      font-weight: bold;
      color: #10b981;
      font-size: 16px;
      min-width: 30px;
    }
    .word-text {
      font-weight: 600;
      color: #059669;
      font-size: 16px;
    }
    .translations-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .translation-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #fef3c7;
      border-radius: 6px;
      border: 1px solid #f59e0b;
      gap: 10px;
    }
    .translation-text {
      font-weight: 500;
      color: #92400e;
      font-size: 16px;
    }
    .number-box {
      min-width: 40px;
      height: 28px;
      border-bottom: 2px solid #d1d5db;
      text-align: center;
      font-size: 16px;
      color: #6b7280;
      flex-shrink: 0;
    }
    .page-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">📚 Vocaband - ${titles.title}</div>
      <div class="topic-icon">${topicPack.icon}</div>
      <div class="topic-title">${topicPack.name}</div>
    </div>

    <div class="instructions-box">
      <div class="instructions-text">✏️ ${titles.instructions}</div>
    </div>

    <div class="student-info">
      <div class="info-field">
        <span class="info-label">${titles.name}</span>
        <div class="info-line"></div>
      </div>
      <div class="info-field">
        <span class="info-label">${titles.date}</span>
        <div class="info-line"></div>
      </div>
    </div>

    <div class="section-title">📝 ${titles.englishWords}</div>
    <div class="words-grid">
      ${englishWordsSection}
    </div>

    <div class="section-title">✏️ ${titles.translations} — ${titles.writeNumber}</div>
    <div class="translations-grid">
      ${translationsSection}
    </div>

    <div class="page-footer">
      © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>
</body>
</html>
    `;
  };

  const generateFlashcardsHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";

    const flashcardTitles = {
      en: {
        title: "Flashcards",
        instructions: "Cut out the cards and fold them along the center line. English on front, translation on back.",
        english: "English",
        translation: "Translation",
      },
      he: {
        title: "כרטיסיות",
        instructions: "גזרו את הכרטיסיות וקפלו אותן לאורך הקו המרכזי. אנגלית בקדמה, תרגום בגב.",
        english: "אנגלית",
        translation: "תרגום",
      },
      ar: {
        title: "بطاقات تعليمية",
        instructions: "قصّ البطاقات واطوِها على طول الخط المركزي. الإنجليزية في المقدمة والترجمة في الخلف.",
        english: "الإنجليزية",
        translation: "الترجمة",
      },
    };

    const titles = flashcardTitles[lang as keyof typeof flashcardTitles] || flashcardTitles.en;

    const getTranslation = (word: typeof ALL_WORDS[0]) => {
      if (lang === "he") return word.hebrew;
      if (lang === "ar") return word.arabic;
      return word.hebrew;
    };

    const cardsHTML = words.map((word, index) => `
      <div class="flashcard">
        <div class="flashcard-front">
          <div class="flashcard-number">${index + 1}</div>
          <div class="flashcard-word">${word.english}</div>
          <div class="flashcard-hint">${titles.english}</div>
        </div>
        <div class="flashcard-back">
          <div class="flashcard-number">${index + 1}</div>
          <div class="flashcard-word">${getTranslation(word)}</div>
          <div class="flashcard-hint">${titles.translation}</div>
        </div>
        <div class="fold-line"></div>
      </div>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topicPack.name} - ${titles.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.4;
      color: #333;
      font-size: 13px;
    }
    .page {
      padding: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 3px solid #3b82f6;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 4px;
    }
    .topic-title {
      font-size: 18px;
      font-weight: bold;
      color: #1d4ed8;
    }
    .instructions {
      background: #eff6ff;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 10px;
      margin: 10px 0;
      text-align: center;
      font-size: 12px;
      color: #1e40af;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 12px;
    }
    .flashcard {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 280px;
    }
    .flashcard-front,
    .flashcard-back {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 3px solid #d1d5db;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .flashcard-front {
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      border-color: #93c5fd;
      margin-bottom: 4px;
    }
    .flashcard-back {
      background: linear-gradient(135deg, #fef3c7, #fef9e7);
      border-color: #fcd34d;
    }
    .flashcard-number {
      position: absolute;
      top: 12px;
      ${isRTL ? "left" : "right"}: 12px;
      font-size: 16px;
      font-weight: bold;
      color: #6b7280;
      background: white;
      padding: 5px 12px;
      border-radius: 16px;
    }
    .flashcard-word {
      font-size: 30px;
      font-weight: bold;
      color: #1f2937;
      margin: 15px 0;
    }
    .flashcard-hint {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .fold-line {
      height: 2px;
      background: repeating-linear-gradient(
        90deg,
        #9ca3af,
        #9ca3af 4px,
        transparent 4px,
        transparent 8px
      );
      margin: 4px 0;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .fold-line { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">📚 Vocaband - ${titles.title}</div>
      <div class="topic-title">${topicPack.icon} ${topicPack.name}</div>
    </div>

    <div class="instructions">
      ✂️ ${titles.instructions}
    </div>

    <div class="cards-grid">
      ${cardsHTML}
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>
</body>
</html>
    `;
  };

  const generateBingoCardsHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";

    const bingoTitles = {
      en: {
        title: "Bingo Cards",
        instructions: "Teacher calls out English words, students mark translations. First to get 5 in a row wins!",
        free: "FREE",
        wordList: "Word List",
      },
      he: {
        title: "כרטיסי בינגו",
        instructions: "המורה אומרת מילים באנגלית, התלמידים מסמנים את התרגום. מי שמקבל 5 בשורה ראשון מנצח!",
        free: "חינם",
        wordList: "רשימת מילים",
      },
      ar: {
        title: "بطاقات البينغو",
        instructions: "يقول المعلم الكلمات بالإنجليزية، ويقوم الطلاب بوضع علامة على الترجمات. من يحصل على 5 في صف أولاً يفوز!",
        free: "مجاني",
        wordList: "قائمة الكلمات",
      },
    };

    const titles = bingoTitles[lang as keyof typeof bingoTitles] || bingoTitles.en;

    const getTranslation = (word: typeof ALL_WORDS[0]) => {
      if (lang === "he") return word.hebrew;
      if (lang === "ar") return word.arabic;
      return word.hebrew;
    };

    // Generate 4 different bingo cards with random arrangements
    const generateBingoCard = (cardIndex: number) => {
      const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 24);
      const gridItems = [...shuffledWords.slice(0, 12), { translation: titles.free, isFree: true }, ...shuffledWords.slice(12, 24)];

      return gridItems.map((item, index) => {
        const isFree = (item as any).isFree;
        const text = isFree ? titles.free : getTranslation(item as typeof ALL_WORDS[0]);
        const bgClass = isFree ? "background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white;" : "";
        return `<div class="bingo-cell" style="${bgClass}">${text}</div>`;
      }).join("");
    };

    const wordListHTML = words.map((word, index) => `
      <div class="word-list-item">
        <span class="word-num">${index + 1}.</span>
        <span class="word-eng">${word.english}</span>
        <span class="word-trans">${getTranslation(word)}</span>
      </div>
    `).join("");

    const bingoCardsHTML = Array.from({ length: 4 }, (_, i) => `
      <div class="bingo-card">
        <div class="bingo-header">Card ${i + 1}</div>
        <div class="bingo-grid">
          ${generateBingoCard(i)}
        </div>
      </div>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topicPack.name} - ${titles.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.4;
      color: #333;
      font-size: 12px;
    }
    .page {
      padding: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 3px solid #f59e0b;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 4px;
    }
    .topic-title {
      font-size: 18px;
      font-weight: bold;
      color: #d97706;
    }
    .instructions {
      background: #fffbeb;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 8px;
      margin: 8px 0;
      text-align: center;
      font-size: 11px;
      color: #92400e;
    }
    .bingo-cards-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin: 15px 0;
    }
    .bingo-card {
      border: 3px solid #fbbf24;
      border-radius: 12px;
      padding: 15px;
      background: #fffbeb;
    }
    .bingo-header {
      text-align: center;
      font-weight: bold;
      color: #d97706;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .bingo-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }
    .bingo-cell {
      aspect-ratio: 1;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fcd34d;
      border-radius: 6px;
      background: white;
      font-size: 16px;
      font-weight: 700;
      color: #78350f;
      text-align: center;
      padding: 5px;
    }
    .word-list-section {
      margin-top: 20px;
      padding: 15px;
      background: #f3f4f6;
      border-radius: 10px;
    }
    .word-list-title {
      font-weight: bold;
      color: #374151;
      margin-bottom: 12px;
      text-align: center;
      font-size: 15px;
    }
    .word-list-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .word-list-item {
      display: flex;
      gap: 6px;
      padding: 6px 8px;
      background: white;
      border-radius: 6px;
      font-size: 14px;
    }
    .word-num {
      font-weight: bold;
      color: #f59e0b;
      min-width: 20px;
    }
    .word-eng {
      font-weight: 600;
      color: #1f2937;
    }
    .word-trans {
      color: #6b7280;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">📚 Vocaband - ${titles.title}</div>
      <div class="topic-title">${topicPack.icon} ${topicPack.name}</div>
    </div>

    <div class="instructions">
      🎮 ${titles.instructions}
    </div>

    <div class="bingo-cards-container">
      ${bingoCardsHTML}
    </div>

    <div class="word-list-section">
      <div class="word-list-title">📝 ${titles.wordList}</div>
      <div class="word-list-grid">
        ${wordListHTML}
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>
</body>
</html>
    `;
  };

  const generateWordSearchHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";

    const wordSearchTitles = {
      en: {
        title: "Word Search Puzzle",
        instructions: "Find all the hidden English words in the grid. Words can be horizontal, vertical, or diagonal.",
        wordsToFind: "Words to Find:",
        name: "Name:",
        date: "Date:",
        class: "Class:",
      },
      he: {
        title: "חיפוש מילים",
        instructions: "מצאו את כל המילים המוסתרות באנגלית בטבלה. המילים יכולות להיות אופקיות, אנכיות או אלכסוניות.",
        wordsToFind: "מילים למציאה:",
        name: "שם:",
        date: "תאריך:",
        class: "כיתה:",
      },
      ar: {
        title: "بحث الكلمات",
        instructions: "ابحث عن جميع الكلمات الإنجليزية المخفية في الشبكة. يمكن أن تكون الكلمات أفقية أو عمودية أو قطرية.",
        wordsToFind: "الكلمات المطلوب العثور عليها:",
        name: "الاسم:",
        date: "التاريخ:",
        class: "الصف:",
      },
    };

    const titles = wordSearchTitles[lang as keyof typeof wordSearchTitles] || wordSearchTitles.en;

    // Take up to 12 words for the word search
    const selectedWords = words.slice(0, 12);
    const gridSize = 15;

    // Create empty grid
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));

    // Place words in grid
    const placeWord = (word: string) => {
      const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal down-right
        [1, -1],  // diagonal down-left
      ];

      for (let attempt = 0; attempt < 100; attempt++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const startRow = Math.floor(Math.random() * gridSize);
        const startCol = Math.floor(Math.random() * gridSize);

        const endRow = startRow + dir[0] * (word.length - 1);
        const endCol = startCol + dir[1] * (word.length - 1);

        if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;

        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const row = startRow + dir[0] * i;
          const col = startCol + dir[1] * i;
          if (grid[row][col] !== '' && grid[row][col] !== word[i]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < word.length; i++) {
            const row = startRow + dir[0] * i;
            const col = startCol + dir[1] * i;
            grid[row][col] = word[i];
          }
          return true;
        }
      }
      return false;
    };

    // Place all words
    selectedWords.forEach(wordObj => {
      placeWord(wordObj.english.toUpperCase());
    });

    // Fill empty cells with random letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] === '') {
          grid[i][j] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }

    // Generate grid HTML
    const gridHTML = grid.map(row => `
      <div class="word-search-row">
        ${row.map(cell => `<div class="word-search-cell">${cell}</div>`).join('')}
      </div>
    `).join('');

    // Generate word list HTML
    const wordListHTML = selectedWords.map((word, index) => `
      <div class="ws-word-item">
        <span class="ws-word-num">${index + 1}.</span>
        <span class="ws-word-eng">${word.english}</span>
        <span class="ws-word-trans">${lang === "he" ? word.hebrew : lang === "ar" ? word.arabic : word.hebrew}</span>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topicPack.name} - ${titles.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.4;
      color: #333;
      font-size: 12px;
    }
    .page {
      padding: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 3px solid #ec4899;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #ec4899;
      margin-bottom: 4px;
    }
    .topic-title {
      font-size: 18px;
      font-weight: bold;
      color: #db2777;
    }
    .instructions {
      background: #fdf2f8;
      border: 2px solid #ec4899;
      border-radius: 8px;
      padding: 8px;
      margin: 8px 0;
      text-align: center;
      font-size: 11px;
      color: #9d174d;
    }
    .ws-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-top: 12px;
    }
    .ws-student-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
      padding: 12px;
      background: #fdf2f8;
      border: 2px solid #f9a8d4;
      border-radius: 10px;
    }
    .ws-info-field {
      display: flex;
      flex-direction: column;
    }
    .ws-info-label {
      font-size: 12px;
      font-weight: bold;
      color: #9d174d;
      margin-bottom: 4px;
    }
    .ws-info-line {
      border-bottom: 2px solid #f9a8d4;
      height: 22px;
    }
    .ws-grid-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .word-search-grid {
      display: grid;
      grid-template-columns: repeat(${gridSize}, 1fr);
      gap: 1px;
      background: #374151;
      padding: 3px;
      border-radius: 8px;
    }
    .word-search-row {
      display: contents;
    }
    .word-search-cell {
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      font-size: 18px;
      font-weight: bold;
      color: #374151;
    }
    .ws-wordlist {
      background: #fdf2f8;
      border: 2px solid #f9a8d4;
      border-radius: 8px;
      padding: 10px;
    }
    .ws-wordlist-title {
      font-weight: bold;
      color: #9d174d;
      margin-bottom: 10px;
      text-align: center;
      font-size: 14px;
    }
    .ws-word-item {
      display: flex;
      gap: 6px;
      padding: 4px 0;
      font-size: 13px;
    }
    .ws-word-num {
      font-weight: bold;
      color: #ec4899;
      min-width: 22px;
    }
    .ws-word-eng {
      font-weight: 600;
      color: #1f2937;
    }
    .ws-word-trans {
      color: #6b7280;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">📚 Vocaband - ${titles.title}</div>
      <div class="topic-title">${topicPack.icon} ${topicPack.name}</div>
    </div>

    <div class="instructions">
      🔍 ${titles.instructions}
    </div>

    <div class="ws-student-info">
      <div class="ws-info-field">
        <span class="ws-info-label">${titles.name}</span>
        <div class="ws-info-line"></div>
      </div>
      <div class="ws-info-field">
        <span class="ws-info-label">${titles.date}</span>
        <div class="ws-info-line"></div>
      </div>
      <div class="ws-info-field">
        <span class="ws-info-label">${titles.class}</span>
        <div class="ws-info-line"></div>
      </div>
    </div>

    <div class="ws-content">
      <div class="ws-grid-container">
        <div class="word-search-grid">
          ${gridHTML}
        </div>
      </div>
      <div class="ws-wordlist">
        <div class="ws-wordlist-title">${titles.wordsToFind}</div>
        ${wordListHTML}
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav currentPage="home" onNavigate={onNavigate} onGetStarted={onGetStarted} />

      <main className="pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-2 text-violet-300 font-bold hover:text-violet-200 transition-all group"
            >
              <ArrowLeft size={20} className={`transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
              <span>{t.backButton}</span>
            </button>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-violet-500/20 border border-violet-400/30 mb-6">
              <FileText size={20} className="text-violet-300" />
              <span className="text-violet-200 font-bold text-sm">Free Resources</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 font-headline">
              {t.title}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto" dir={dir} style={{ textAlign }}>
              {t.subtitle}
            </p>
          </motion.div>

          {/* Topic Packs Section - All Packs from App */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t.topicPacksTitle}</h2>
                <p className="text-white/60 text-sm">{t.topicPacksSubtitle}</p>
              </div>
            </div>

            {/* Topic Packs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TOPIC_PACKS.map((topic, index) => {
                const wordCount = topic.ids.length;
                const pagesCount = Math.max(1, Math.ceil(wordCount / 6));
                const gradient = GRADIENTS[index % GRADIENTS.length];

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
                    gradient={gradient}
                    delay={Math.min(index * 0.05, 0.5)}
                    onDownload={() => handleDownload(topic.name)}
                    onMatching={() => handleMatchingExercise(topic.name)}
                    onFlashcards={() => handleFlashcards(topic.name)}
                    onBingo={() => handleBingoCards(topic.name)}
                    onWordSearch={() => handleWordSearch(topic.name)}
                    isDownloading={downloadingId === topic.name || downloadingId === `matching-${topic.name}` || downloadingId === `flashcards-${topic.name}` || downloadingId === `bingo-${topic.name}` || downloadingId === `wordsearch-${topic.name}`}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-8 md:p-12 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10"
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

          {/* Back Button - Bottom */}
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

      {/* Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Preview</h3>
              <button
                onClick={() => setPreviewContent(null)}
                type="button"
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div
                className="bg-white shadow-lg mx-auto"
                style={{ width: "210mm", minHeight: "297mm", transform: "scale(0.6)", transformOrigin: "top center" }}
                dangerouslySetInnerHTML={{ __html: previewContent.html }}
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-4 flex items-center justify-center gap-4 border-t">
              <button
                onClick={() => setPreviewContent(null)}
                type="button"
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDownload}
                type="button"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold transition-all flex items-center gap-2"
              >
                Download PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FreeResourcesView;
