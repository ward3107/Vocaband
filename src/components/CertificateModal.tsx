/**
 * CertificateModal — printable PDF certificate for a single student.
 *
 * Surfaces from the per-student row in the Gradebook (Printer icon
 * next to the Reward gift button).  Renders an A4-portrait
 * certificate of achievement that the teacher can download as PDF
 * (for printing / WhatsApping to parents) or print directly from the
 * browser.
 *
 * Pipeline reuses `html2pdf.js` — same library `HebrewWorksheetView`
 * already pulls in.  We dynamic-import it inside the export handler
 * rather than at the top of the file so the heavy canvas + jsPDF
 * chain only loads when a teacher actually clicks Download (keeps the
 * Gradebook bundle slim).
 *
 * Localized in EN / HE / AR with proper RTL on the certificate body.
 *
 * Metrics shown (all derived from data the gradebook already has):
 *   - games-played count (from progress rows)
 *   - average score (from progress rows)
 *   - words mastered, distinct word_ids where the student has answered
 *     correctly >= MASTERY_THRESHOLD times across all modes combined,
 *     computed in GradebookView from the get_class_mastery RPC.  Stat
 *     is hidden when 0 so a brand-new student doesn't get a depressing
 *     "0 words mastered" line on their certificate.
 *
 * Teacher name comes from `user.displayName` when available; when null
 * we fall back to a generic "Your teacher" signature line so the
 * certificate still prints cleanly.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Printer, X, Award, Sparkles } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

interface CertificateModalProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  className: string;
  attempts: number;
  avgScore: number;
  /** Count of distinct word_ids the student has answered correctly
   *  >= MASTERY_THRESHOLD times across all modes.  Derived from
   *  word_attempts (via the get_class_mastery RPC) in GradebookView.
   *  Optional so non-Gradebook callers (or environments where the
   *  mastery RPC hasn't loaded yet) can still render the certificate
   *  with the two original stats.  Hidden from the certificate when
   *  the value is 0 / undefined to avoid printing an awkward "0 words
   *  mastered" line on a brand-new student. */
  wordsMastered?: number;
  /** Teacher's display name for the signature line.  When omitted,
   *  the certificate prints a generic "Your teacher" sign-off. */
  teacherName?: string;
}

const STRINGS: Record<'en' | 'he' | 'ar', {
  modalTitle: string;
  modalSubtitle: string;
  download: string;
  print: string;
  exporting: string;
  certTitle: string;
  awardedTo: string;
  ofClass: (n: string) => string;
  body: string;
  gamesPlayed: (n: number) => string;
  avgScore: (p: number) => string;
  wordsMastered: (n: number) => string;
  issuedBy: string;
  yourTeacher: string;
  date: string;
  brand: string;
  brandTagline: string;
}> = {
  en: {
    modalTitle: 'Certificate of Achievement',
    modalSubtitle: 'Print or save as PDF for parents.',
    download: 'Download PDF',
    print: 'Print',
    exporting: 'Preparing PDF…',
    certTitle: 'Certificate of Achievement',
    awardedTo: 'is awarded to',
    ofClass: n => `of ${n}`,
    body: 'for outstanding progress in English vocabulary.',
    gamesPlayed: n => `${n} ${n === 1 ? 'game' : 'games'} played`,
    avgScore: p => `${p}% average score`,
    wordsMastered: n => `${n} ${n === 1 ? 'word' : 'words'} mastered`,
    issuedBy: 'Issued by',
    yourTeacher: 'Your teacher',
    date: 'Date',
    brand: 'Vocaband',
    brandTagline: 'English vocabulary for Israeli schools',
  },
  he: {
    modalTitle: 'תעודת הצטיינות',
    modalSubtitle: 'הדפיסו או שמרו כ-PDF עבור ההורים.',
    download: 'הורד PDF',
    print: 'הדפס',
    exporting: 'מכין PDF…',
    certTitle: 'תעודת הצטיינות',
    awardedTo: 'מוענקת ל',
    ofClass: n => `מכיתה ${n}`,
    body: 'על התקדמות מצוינת באוצר מילים באנגלית.',
    gamesPlayed: n => `${n} ${n === 1 ? 'משחק' : 'משחקים'}`,
    avgScore: p => `${p}% ממוצע`,
    wordsMastered: n => `${n} ${n === 1 ? 'מילה' : 'מילים'} נשלטו`,
    issuedBy: 'הוענק על ידי',
    yourTeacher: 'המורה שלך',
    date: 'תאריך',
    brand: 'Vocaband',
    brandTagline: 'אוצר מילים באנגלית לבתי ספר ישראליים',
  },
  ar: {
    modalTitle: 'شهادة تقدير',
    modalSubtitle: 'اطبع أو احفظ كملف PDF لأولياء الأمور.',
    download: 'تنزيل PDF',
    print: 'طباعة',
    exporting: 'جارٍ تحضير الملف…',
    certTitle: 'شهادة تقدير',
    awardedTo: 'تُمنح إلى',
    ofClass: n => `من ${n}`,
    body: 'لتقدمه المتميز في مفردات اللغة الإنجليزية.',
    gamesPlayed: n => `${n} ${n === 1 ? 'لعبة' : 'ألعاب'}`,
    avgScore: p => `${p}٪ متوسط النتيجة`,
    wordsMastered: n => `${n} ${n === 1 ? 'كلمة' : 'كلمات'} متقنة`,
    issuedBy: 'منحت من قبل',
    yourTeacher: 'معلمك',
    date: 'التاريخ',
    brand: 'Vocaband',
    brandTagline: 'مفردات الإنجليزية للمدارس الإسرائيلية',
  },
};

function safeFilename(s: string): string {
  // Strip path-hostile chars; preserve unicode letters / digits / spaces / dash.
  return s.replace(/[^\p{L}\d\s\-]/gu, "_").trim() || "certificate";
}

export default function CertificateModal({
  open,
  onClose,
  studentName,
  className,
  attempts,
  avgScore,
  wordsMastered,
  teacherName,
}: CertificateModalProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Esc-to-close — mirrors ShareClassLinkModal's pattern.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const today = new Date().toLocaleDateString(
    language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const handleDownload = async () => {
    if (!printRef.current || exporting) return;
    setExporting(true);
    try {
      // Dynamic import keeps html2pdf out of the Gradebook chunk —
      // ~200kb worth of html2canvas + jsPDF only loads when a teacher
      // actually clicks Download.
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .from(printRef.current)
        .set({
          margin: 0,
          filename: `${safeFilename(studentName)}-certificate.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        })
        .save();
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    // The app's global print CSS in `index.css` hides every
    // body-level child except `.vb-print-stack` / `.vb-print-only`
    // when window.print() fires.  This modal lives inside `#root`,
    // so the certificate body would be hidden during print.  Clone
    // the certificate into a transient body-level `.vb-print-stack`
    // wrapper, fire print (synchronous — blocks until the dialog
    // closes), then clean up.  No double-render on screen because
    // `.vb-print-stack` is `display: none` outside @media print.
    const wrapper = document.createElement('div');
    wrapper.className = 'vb-print-stack';
    wrapper.appendChild(printRef.current.cloneNode(true));
    document.body.appendChild(wrapper);
    try {
      window.print();
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cert-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm overflow-y-auto print:hidden"
          onClick={onClose}
          dir={dir}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header — print:hidden so the PDF/print output
                only contains the certificate body below */}
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-4 text-white flex items-start justify-between gap-3 print:hidden">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">
                  {t.modalTitle}
                </p>
                <p className="text-sm text-white/85 mt-0.5">{t.modalSubtitle}</p>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Certificate body — this is what html2pdf captures.
                Designed as a self-contained card that prints cleanly
                whether via the PDF export pipeline or window.print(). */}
            <div className="p-4 sm:p-6 print:p-0">
              <div
                ref={printRef}
                className="relative bg-white text-stone-900 overflow-hidden"
                style={{
                  // A4 portrait aspect ratio (210:297 ≈ 0.707).  Fixed
                  // aspect keeps the on-screen preview matching the
                  // PDF output so what teachers see is what prints.
                  aspectRatio: '210 / 297',
                  width: '100%',
                  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {/* Decorative gradient border via inset shadow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, #fef3c7 0%, #fff 30%, #fff 70%, #fef3c7 100%)',
                  }}
                />
                <div
                  className="absolute inset-3 border-[3px] rounded-lg pointer-events-none"
                  style={{ borderColor: '#d97706' }}
                />
                <div
                  className="absolute inset-5 border rounded pointer-events-none"
                  style={{ borderColor: '#f59e0b' }}
                />

                {/* Content stack */}
                <div className="relative h-full flex flex-col items-center justify-between px-[6%] py-[7%] text-center" dir={dir}>
                  {/* Top — brand */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="text-amber-600" size={20} />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-[0.32em] text-amber-700">
                        {t.brand}
                      </span>
                      <Sparkles className="text-amber-600" size={20} />
                    </div>
                    <p className="text-[10px] sm:text-xs text-stone-500 font-semibold">
                      {t.brandTagline}
                    </p>
                  </div>

                  {/* Middle — headline + body */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md mb-3 sm:mb-4">
                      <Award size={28} className="text-white" />
                    </div>
                    <h1
                      className="text-2xl sm:text-4xl font-black tracking-tight text-stone-900 mb-4 sm:mb-6"
                      style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                    >
                      {t.certTitle}
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-600 mb-2">{t.awardedTo}</p>
                    <h2
                      className="text-3xl sm:text-5xl font-black text-amber-700 mb-1 break-words max-w-full px-2"
                      style={{ fontFamily: '"Playfair Display", Georgia, serif', lineHeight: 1.1 }}
                    >
                      {studentName}
                    </h2>
                    <p className="text-sm sm:text-base font-semibold text-stone-700 mb-4 sm:mb-6">
                      {t.ofClass(className)}
                    </p>
                    <p className="text-xs sm:text-sm text-stone-600 max-w-md leading-relaxed mb-4 sm:mb-6">
                      {t.body}
                    </p>

                    {/* Stats row.  Words-mastered is hidden for brand-new
                        students (count = 0) so the certificate doesn't
                        print a depressing "0 words mastered" headline. */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2">
                      <div className="text-center">
                        <p className="text-xl sm:text-3xl font-black text-amber-700 tabular-nums">{attempts}</p>
                        <p className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                          {t.gamesPlayed(attempts).replace(String(attempts), '').trim()}
                        </p>
                      </div>
                      <div className="w-px h-10 sm:h-12 bg-amber-200" />
                      <div className="text-center">
                        <p className="text-xl sm:text-3xl font-black text-amber-700 tabular-nums">{avgScore}%</p>
                        <p className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                          {t.avgScore(avgScore).replace(`${avgScore}%`, '').trim()}
                        </p>
                      </div>
                      {wordsMastered != null && wordsMastered > 0 && (
                        <>
                          <div className="w-px h-10 sm:h-12 bg-amber-200" />
                          <div className="text-center">
                            <p className="text-xl sm:text-3xl font-black text-amber-700 tabular-nums">{wordsMastered}</p>
                            <p className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                              {t.wordsMastered(wordsMastered).replace(String(wordsMastered), '').trim()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom — signature + date */}
                  <div className="w-full flex items-end justify-between text-left px-2" dir="ltr">
                    <div className="flex flex-col items-start">
                      <div className="w-32 sm:w-40 border-t border-stone-400 mb-1" />
                      <p className="text-[10px] sm:text-xs text-stone-500 font-semibold">
                        {t.issuedBy}: <span className="text-stone-700">{teacherName || t.yourTeacher}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="w-24 sm:w-32 border-t border-stone-400 mb-1" />
                      <p className="text-[10px] sm:text-xs text-stone-500 font-semibold">
                        {t.date}: <span className="text-stone-700">{today}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action row */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-2 gap-2 print:hidden">
              <button
                type="button"
                onClick={handleDownload}
                disabled={exporting}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                <Download size={16} />
                {exporting ? t.exporting : t.download}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-sm active:scale-[0.98] transition-all"
              >
                <Printer size={16} />
                {t.print}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
