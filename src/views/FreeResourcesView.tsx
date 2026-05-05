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
} from "lucide-react";
import PublicNav from "../components/PublicNav";

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
  gradient: string;
  delay: number;
  onDownload: () => void;
  onMatching: () => void;
  isDownloading: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  icon,
  title,
  description,
  size,
  downloadLabel,
  matchingLabel,
  gradient,
  delay,
  onDownload,
  onMatching,
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
        <p className="text-white/80 mb-6 leading-relaxed text-lg">{description}</p>

        <div className="space-y-3">
          {/* Main Download Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownload}
            disabled={isDownloading}
            className={`w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center justify-center gap-2 ${
              isDownloading ? "cursor-wait" : "cursor-pointer"
            }`}
            type="button"
          >
            {isDownloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {downloadLabel}
              </>
            ) : (
              <>
                <Download size={18} className={isRTL ? "ml-2" : "mr-2"} />
                {downloadLabel}
              </>
            )}
          </motion.button>

          {/* Matching Exercise Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onMatching}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 font-bold transition-all flex items-center justify-center gap-2 border border-emerald-400/30"
            type="button"
          >
            <Gamepad2 size={18} className={isRTL ? "ml-2" : "mr-2"} />
            {matchingLabel}
          </motion.button>
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

  const handleDownload = async (topicName: string) => {
    setDownloadingId(topicName);

    // Find the topic pack and get its words
    const topicPack = TOPIC_PACKS.find((tp) => tp.name === topicName);
    if (!topicPack) {
      setDownloadingId(null);
      return;
    }

    // Get all words for this topic
    const words = topicPack.ids.map((id) => ALL_WORDS.find((w) => w.id === id)).filter(Boolean);

    // Generate worksheet HTML
    const worksheetHTML = generateWorksheetHTML(topicPack, words, language);

    // Open in new window and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(worksheetHTML);
      printWindow.document.close();

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }

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

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(matchingHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }

    setDownloadingId(null);
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
      font-size: 14px;
    }
    .word-cell {
      font-weight: 600;
      color: #7c3aed;
      width: 47%;
      font-size: 15px;
    }
    .translation-cell {
      color: #374151;
      width: 47%;
      font-size: 15px;
    }
    .practice-section {
      margin-top: 12px;
      padding: 15px;
      background: #fef3c7;
      border-radius: 12px;
      border: 3px dashed #f59e0b;
    }
    .practice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .practice-title {
      font-size: 18px;
      font-weight: bold;
      color: #92400e;
    }
    .practice-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .practice-box {
      border: 2px solid #d1d5db;
      border-radius: 8px;
      padding: 8px;
      background: white;
      min-height: 65px;
      display: flex;
      flex-direction: column;
    }
    .practice-label {
      font-size: 12px;
      color: #7c3aed;
      margin-bottom: 4px;
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
      gap: 6px;
      padding: 6px 10px;
      background: #f0fdf4;
      border-radius: 6px;
      border: 1px solid #10b981;
    }
    .word-num {
      font-weight: bold;
      color: #10b981;
      font-size: 14px;
      min-width: 25px;
    }
    .word-text {
      font-weight: 600;
      color: #059669;
      font-size: 14px;
    }
    .translations-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .translation-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: #fef3c7;
      border-radius: 6px;
      border: 1px solid #f59e0b;
      gap: 8px;
    }
    .translation-text {
      font-weight: 500;
      color: #92400e;
      font-size: 14px;
    }
    .number-box {
      min-width: 35px;
      height: 24px;
      border-bottom: 2px solid #d1d5db;
      text-align: center;
      font-size: 14px;
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    gradient={gradient}
                    delay={Math.min(index * 0.05, 0.5)}
                    onDownload={() => handleDownload(topic.name)}
                    onMatching={() => handleMatchingExercise(topic.name)}
                    isDownloading={downloadingId === topic.name || downloadingId === `matching-${topic.name}`}
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
    </div>
  );
};

export default FreeResourcesView;
