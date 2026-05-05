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
  gradient: string;
  delay: number;
  onDownload: () => void;
  isDownloading: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  icon,
  title,
  description,
  size,
  downloadLabel,
  gradient,
  delay,
  onDownload,
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

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownload}
          disabled={isDownloading}
          className={`w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center justify-center gap-2 text-lg ${
            isDownloading ? "cursor-wait" : "cursor-pointer"
          }`}
          type="button"
        >
          {isDownloading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {downloadLabel}
            </>
          ) : (
            <>
              <Download size={20} className={isRTL ? "ml-2" : "mr-2"} />
              {downloadLabel}
            </>
          )}
        </motion.button>
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

  const generateWorksheetHTML = (topicPack: { name: string; icon: string }, words: typeof ALL_WORDS, lang: string) => {
    const isRTL = lang === "he" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";
    const wordCount = words.length;

    // Translations for the worksheet
    const worksheetTitles = {
      en: {
        vocabulary: "Vocabulary Worksheet",
        topic: "Topic:",
        word: "Word (English)",
        translation: "Translation",
        practice: "Practice Writing",
        name: "Name:",
        date: "Date:",
        wordsLabel: wordCount === 1 ? "word" : "words",
        practiceInstruction: "Write each word and its translation to practice.",
        page: "Page",
        instructions: "Instructions: Learn the vocabulary words, then use the practice page on the back."
      },
      he: {
        vocabulary: "גיליון עבודה - אוצר מילים",
        topic: "נושא:",
        word: "מילה באנגלית",
        translation: "תרגום",
        practice: "תרגול כתיבה",
        name: "שם:",
        date: "תאריך:",
        wordsLabel: wordCount === 1 ? "מילה" : "מילים",
        practiceInstruction: "כתוב כל מילה והתרגום שלה לתרגול.",
        page: "עמוד",
        instructions: "הוראות: למדו את מילות האוצר, ואז השתמשו בדף התרגול מאחור."
      },
      ar: {
        vocabulary: "ورقة عمل - المفردات",
        topic: "الموضوع:",
        word: "الكلمة (الإنجليزية)",
        translation: "الترجمة",
        practice: "تمارين الكتابة",
        name: "الاسم:",
        date: "التاريخ:",
        wordsLabel: wordCount === 1 ? "كلمة" : "كلمات",
        practiceInstruction: "اكتب كل كلمة وترجمتها للتدرب.",
        page: "صفحة",
        instructions: "التعليمات: تعلم كلمات المفردات، ثم استخدم صفحة التدرب في الخلف."
      },
    };

    const titles = worksheetTitles[lang as keyof typeof worksheetTitles] || worksheetTitles.en;

    // Get translation based on language - only ONE language, not both
    const getTranslation = (word: typeof ALL_WORDS[0]) => {
      if (lang === "he") return word.hebrew;
      if (lang === "ar") return word.arabic;
      return word.hebrew; // English gets Hebrew translation
    };

    // Create practice boxes matching the word count
    const practiceBoxesHTML = words.map((_, i) => `
      <div class="practice-box">
        <div class="practice-label">${i + 1}.</div>
        <div class="practice-input english-input"></div>
        <div class="practice-input translation-input"></div>
      </div>
    `).join("");

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
      margin: 15mm;
    }
    body {
      font-family: ${isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
      line-height: 1.6;
      color: #333;
      font-size: 14px;
    }
    .page {
      min-height: 250mm;
      padding: 20px;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 4px solid #8b5cf6;
    }
    .logo {
      font-size: 36px;
      font-weight: bold;
      color: #8b5cf6;
      margin-bottom: 15px;
    }
    .topic-icon {
      font-size: 72px;
      margin: 20px 0;
    }
    .topic-title {
      font-size: 28px;
      font-weight: bold;
      margin: 15px 0;
      color: #7c3aed;
    }
    .word-count-badge {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: bold;
      margin: 15px 0;
    }
    .instructions-box {
      background: #f0fdf4;
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      text-align: center;
    }
    .instructions-title {
      font-size: 18px;
      font-weight: bold;
      color: #16a34a;
      margin-bottom: 10px;
    }
    .instructions-text {
      font-size: 14px;
      color: #15803d;
    }
    .student-info {
      display: flex;
      justify-content: space-between;
      margin: 40px 0;
      padding: 20px;
      background: #f3f4f6;
      border-radius: 12px;
      gap: 20px;
    }
    .info-field {
      flex: 1;
    }
    .info-label {
      font-size: 16px;
      font-weight: bold;
      color: #374151;
      display: block;
      margin-bottom: 8px;
    }
    .info-line {
      border-bottom: 2px solid #d1d5db;
      height: 30px;
    }
    .decorative-line {
      height: 3px;
      background: linear-gradient(90deg, #8b5cf6, #a855f7, #8b5cf6);
      margin: 30px 0;
      border-radius: 2px;
    }
    .page-footer {
      text-align: center;
      margin-top: auto;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
      color: white;
      padding: 15px 10px;
      text-align: ${isRTL ? "right" : "left"};
      font-weight: bold;
      font-size: 14px;
    }
    td {
      padding: 12px 10px;
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
      width: 8%;
      text-align: center;
    }
    .word-cell {
      font-weight: bold;
      color: #7c3aed;
      font-size: 15px;
      width: 46%;
    }
    .translation-cell {
      color: #374151;
      font-size: 15px;
      width: 46%;
    }
    .practice-section {
      margin-top: 30px;
      padding: 25px;
      background: #fef3c7;
      border-radius: 16px;
      border: 3px dashed #f59e0b;
    }
    .practice-title {
      font-size: 22px;
      font-weight: bold;
      color: #92400e;
      margin-bottom: 15px;
      text-align: center;
    }
    .practice-instruction {
      text-align: center;
      margin-bottom: 25px;
      font-size: 14px;
      color: #78350f;
    }
    .practice-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .practice-box {
      border: 2px solid #d1d5db;
      border-radius: 10px;
      padding: 10px;
      background: white;
      min-height: 80px;
    }
    .practice-label {
      font-size: 12px;
      color: #7c3aed;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .practice-input {
      border-bottom: 2px dotted #9ca3af;
      padding: 3px 0;
      margin-top: 3px;
      font-size: 12px;
      min-height: 20px;
    }
    .english-input::before {
      content: "${lang === "en" ? "English:" : lang === "he" ? "אנגלית:" : "الإنجليزية:"}";
      font-size: 10px;
      color: #9ca3af;
      display: block;
    }
    .translation-input::before {
      content: "${lang === "en" ? "Translation:" : lang === "he" ? "תרגום:" : "الترجمة:"}";
      font-size: 10px;
      color: #9ca3af;
      display: block;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Cover with Student Info -->
  <div class="page">
    <div class="header">
      <div class="logo">📚 Vocaband</div>
      <div class="topic-icon">${topicPack.icon}</div>
      <div class="topic-title">${topicPack.name}</div>
      <div class="word-count-badge">${wordCount} ${titles.wordsLabel}</div>
    </div>

    <div class="decorative-line"></div>

    <div class="instructions-box">
      <div class="instructions-title">📝 ${titles.vocabulary}</div>
      <div class="instructions-text">${titles.instructions}</div>
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

    <div class="page-footer">
      ${titles.page} 1 of 3 • © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>

  <!-- PAGE 2: Words and Translations Table -->
  <div class="page">
    <div class="header" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #8b5cf6;">
      <div class="logo" style="font-size: 24px; margin-bottom: 10px;">📚 ${topicPack.name}</div>
      <div style="font-size: 16px; color: #6b7280;">${titles.word} + ${titles.translation}</div>
    </div>

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

    <div class="page-footer" style="margin-top: auto;">
      ${titles.page} 2 of 3 • © ${new Date().getFullYear()} Vocaband • www.vocaband.com
    </div>
  </div>

  <!-- PAGE 3: Practice Boxes -->
  <div class="page">
    <div class="practice-section">
      <div class="practice-title">✏️ ${titles.practice}</div>
      <p class="practice-instruction">${titles.practiceInstruction}</p>
      <div class="practice-grid">
        ${practiceBoxesHTML}
      </div>
    </div>

    <div class="page-footer" style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      ${titles.page} 3 of 3 • © ${new Date().getFullYear()} Vocaband • www.vocaband.com
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
                    gradient={gradient}
                    delay={Math.min(index * 0.05, 0.5)}
                    onDownload={() => handleDownload(topic.name)}
                    isDownloading={downloadingId === topic.name}
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
