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
 * The Vite alias in vite.config.ts re-routes html2pdf.js's internal
 * `require('html2canvas')` to html2canvas-pro, which understands
 * Tailwind v4's oklch() colours.  Without that alias the PDF came
 * out monochrome / blank because the legacy html2canvas couldn't
 * parse the new colour space and silently dropped every styled cell.
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
import { Download, Printer, X, Award, Share2 } from "lucide-react";
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
  share: string;
  exporting: string;
  sharing: string;
  certTitle: string;
  certSubtitle: string;
  awardedTo: string;
  ofClass: (n: string) => string;
  body: string;
  gamesPlayed: string;
  avgScore: string;
  wordsMastered: string;
  issuedBy: string;
  yourTeacher: string;
  date: string;
  brand: string;
  brandTagline: string;
  closeAria: string;
  signatureSeal: string;
}> = {
  en: {
    modalTitle: 'Certificate of Achievement',
    modalSubtitle: 'Print or share with parents.',
    download: 'Download PDF',
    print: 'Print',
    share: 'Share',
    exporting: 'Preparing PDF…',
    sharing: 'Preparing…',
    certTitle: 'Certificate',
    certSubtitle: 'of Achievement',
    awardedTo: 'is proudly presented to',
    ofClass: n => `of ${n}`,
    body: 'in recognition of outstanding progress and dedication to learning English vocabulary.',
    gamesPlayed: 'games played',
    avgScore: 'average score',
    wordsMastered: 'words mastered',
    issuedBy: 'Teacher',
    yourTeacher: 'Your Teacher',
    date: 'Date',
    brand: 'Vocaband',
    brandTagline: 'English vocabulary for Israeli schools',
    closeAria: 'Close',
    signatureSeal: 'Verified',
  },
  he: {
    modalTitle: 'תעודת הצטיינות',
    modalSubtitle: 'הדפיסו או שתפו עם ההורים.',
    download: 'הורד PDF',
    print: 'הדפס',
    share: 'שיתוף',
    exporting: 'מכין PDF…',
    sharing: 'מכין…',
    certTitle: 'תעודת',
    certSubtitle: 'הצטיינות',
    awardedTo: 'מוענקת בגאווה ל',
    ofClass: n => `מכיתה ${n}`,
    body: 'הוקרה על התקדמות מצוינת והתמדה בלימוד אוצר מילים באנגלית.',
    gamesPlayed: 'משחקים',
    avgScore: 'ציון ממוצע',
    wordsMastered: 'מילים שנשלטו',
    issuedBy: 'המורה',
    yourTeacher: 'המורה שלך',
    date: 'תאריך',
    brand: 'Vocaband',
    brandTagline: 'אוצר מילים באנגלית לבתי ספר ישראליים',
    closeAria: 'סגירה',
    signatureSeal: 'מאומת',
  },
  ar: {
    modalTitle: 'شهادة تقدير',
    modalSubtitle: 'اطبع أو شارك مع أولياء الأمور.',
    download: 'تنزيل PDF',
    print: 'طباعة',
    share: 'مشاركة',
    exporting: 'جارٍ تحضير الملف…',
    sharing: 'جارٍ التحضير…',
    certTitle: 'شهادة',
    certSubtitle: 'تقدير',
    awardedTo: 'تُمنح بفخر إلى',
    ofClass: n => `من ${n}`,
    body: 'تقديراً للتقدم المتميز والمثابرة في تعلّم مفردات اللغة الإنجليزية.',
    gamesPlayed: 'الألعاب',
    avgScore: 'متوسط النتيجة',
    wordsMastered: 'كلمات متقنة',
    issuedBy: 'المعلم',
    yourTeacher: 'معلمك',
    date: 'التاريخ',
    brand: 'Vocaband',
    brandTagline: 'مفردات الإنجليزية للمدارس الإسرائيلية',
    closeAria: 'إغلاق',
    signatureSeal: 'موثّق',
  },
};

function safeFilename(s: string): string {
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
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);

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

  // Build the html2pdf chain once so download + share reuse the same
  // config.  `pagebreak: { mode: ['avoid-all'] }` is the fix for the
  // two-page PDF bug — html2pdf was splitting the certificate across
  // pages because its automatic break detection thought the gold
  // frame was a sensible boundary.  Forcing avoid-all keeps the
  // whole certificate on the first page (it already fits A4).
  const buildPdfBlob = async (): Promise<Blob | null> => {
    if (!printRef.current) return null;
    const html2pdf = (await import('html2pdf.js')).default;
    // html2pdf's fluent API extends Promise via a Worker class, so
    // awaiting it directly unwraps a Worker (not a Blob).  Drop into
    // the raw worker chain and call .output('blob') after .save()
    // would lose the buffer — use .outputPdf('blob') which is the
    // documented escape hatch for "give me the PDF, don't save it".
    // `pagebreak` isn't in html2pdf.js's TS types but is a documented
    // runtime option — without `avoid-all` the certificate spills onto
    // a second blank page on some Chrome versions.  Cast to bypass the
    // narrow Html2PdfOptions surface.
    const opts = {
      margin: 0,
      filename: `${safeFilename(studentName)}-certificate.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all'] },
    };
    const worker = html2pdf().from(printRef.current).set(opts as never);
    return (await worker.outputPdf('blob')) as Blob;
  };

  const handleDownload = async () => {
    if (!printRef.current || busy) return;
    setBusy('download');
    try {
      const blob = await buildPdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(studentName)}-certificate.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!printRef.current || busy) return;
    setBusy('share');
    try {
      const blob = await buildPdfBlob();
      if (!blob) return;
      const filename = `${safeFilename(studentName)}-certificate.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });
      // Web Share API Level 2 — works on iOS Safari, Android Chrome,
      // PWAs.  Desktop browsers usually don't have canShare for files,
      // so we fall through to a plain download there.
      const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (canShare) {
        try {
          await navigator.share({
            files: [file],
            title: t.modalTitle,
            text: `${studentName} — ${t.modalTitle}`,
          });
          return;
        } catch (err) {
          // User cancelled the system share sheet — nothing to do.
          if ((err as Error)?.name === 'AbortError') return;
          // Real failure — fall through to download as a graceful
          // fallback rather than leaving the teacher with nothing.
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
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
    wrapper.className = 'vb-print-stack vb-cert-print';
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
          // onClick on the backdrop (and any padding around the modal)
          // closes — gives teachers a familiar "tap outside to dismiss"
          // affordance without forcing them to find the small X.
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center px-4 py-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto print:hidden"
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
            {/* Modal header — navy/gold to match the diploma palette */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-start justify-between gap-3 print:hidden">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-300/90">
                  {t.modalTitle}
                </p>
                <p className="text-sm text-white/75 mt-0.5">{t.modalSubtitle}</p>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label={t.closeAria}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Certificate body — what html2pdf captures.  Designed as
                a self-contained card that prints cleanly via the PDF
                pipeline or window.print().  Navy + gold "diploma"
                look: ivory parchment, double gold frame, large
                medallion, two-tier serif headline, navy stat tiles. */}
            <div className="p-4 sm:p-6 print:p-0 bg-gradient-to-b from-slate-50 to-slate-100">
              <div
                ref={printRef}
                className="vb-certificate relative text-slate-900 overflow-hidden mx-auto"
                style={{
                  aspectRatio: '210 / 297',
                  width: '100%',
                  maxWidth: '720px',
                  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                  backgroundColor: '#fffaf0',
                  backgroundImage:
                    'radial-gradient(ellipse at top, rgba(217, 119, 6, 0.12) 0%, transparent 55%), ' +
                    'radial-gradient(ellipse at bottom, rgba(217, 119, 6, 0.08) 0%, transparent 60%)',
                }}
              >
                {/* Sunburst behind the medallion — pale gold radial
                    rays from the centre, fades to nothing well before
                    the frame so it doesn't fight with the border. */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-conic-gradient(from 0deg, rgba(217, 119, 6, 0.06) 0deg 4deg, transparent 4deg 12deg)',
                    maskImage:
                      'radial-gradient(circle at 50% 38%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 25%, transparent 55%)',
                    WebkitMaskImage:
                      'radial-gradient(circle at 50% 38%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 25%, transparent 55%)',
                  }}
                />

                {/* Outer + inner gold frames */}
                <div
                  className="absolute inset-3 rounded-md pointer-events-none"
                  style={{
                    border: '6px solid #c08719',
                    boxShadow: 'inset 0 0 0 2px #fffaf0, inset 0 0 0 3px #c08719',
                  }}
                />
                <div
                  className="absolute inset-7 rounded-sm pointer-events-none"
                  style={{ border: '1px solid #c08719' }}
                />

                {/* Corner medallions — small gilt circles at each
                    inside corner of the frame */}
                {[
                  { top: '12px', left: '12px' },
                  { top: '12px', right: '12px' },
                  { bottom: '12px', left: '12px' },
                  { bottom: '12px', right: '12px' },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-6 h-6 rounded-full pointer-events-none"
                    style={{
                      ...pos,
                      background: 'radial-gradient(circle, #f5c97a 0%, #c08719 60%, #8a5a08 100%)',
                      boxShadow: '0 0 0 2px #fffaf0, 0 0 0 3px #c08719',
                    }}
                  />
                ))}

                {/* Content stack */}
                <div
                  className="relative h-full flex flex-col items-center justify-between text-center"
                  style={{ padding: '9% 8% 7%' }}
                  dir={dir}
                >
                  {/* Top — brand wordmark in a slim navy strip */}
                  <div className="flex flex-col items-center">
                    <p
                      className="text-[10px] sm:text-xs font-black uppercase tracking-[0.45em] text-slate-700"
                      style={{ fontFamily: '"Inter", sans-serif' }}
                    >
                      {t.brand}
                    </p>
                    <div
                      className="mt-1 w-12 h-px"
                      style={{ background: 'linear-gradient(to right, transparent, #c08719, transparent)' }}
                    />
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold mt-1 italic">
                      {t.brandTagline}
                    </p>
                  </div>

                  {/* Middle — medallion + headline + name */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {/* Layered medallion with ribbon tails */}
                    <div className="relative mb-3 sm:mb-4">
                      <div
                        className="absolute -inset-2 rounded-full opacity-40"
                        style={{
                          background: 'radial-gradient(circle, #f5c97a 0%, transparent 70%)',
                        }}
                      />
                      <div
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                        style={{
                          background: 'radial-gradient(circle at 30% 30%, #fde68a 0%, #c08719 70%, #7c4a08 100%)',
                          boxShadow:
                            '0 0 0 3px #fffaf0, 0 0 0 5px #c08719, 0 8px 16px -4px rgba(124, 74, 8, 0.4)',
                        }}
                      >
                        <Award size={40} className="text-white drop-shadow" />
                      </div>
                      {/* Ribbon tails */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-12 h-6 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(135deg, #c08719 0%, #c08719 45%, transparent 45%), ' +
                            'linear-gradient(225deg, #c08719 0%, #c08719 45%, transparent 45%)',
                          backgroundSize: '50% 100%',
                          backgroundPosition: 'left top, right top',
                          backgroundRepeat: 'no-repeat',
                          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 25% 80%, 0 100%, 50% 0, 50% 100%, 75% 80%, 100% 100%, 100% 0)',
                        }}
                      />
                    </div>

                    {/* Two-tier serif headline */}
                    <h1
                      className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.05]"
                      style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
                    >
                      {t.certTitle}
                    </h1>
                    <h2
                      className="text-xl sm:text-2xl font-bold tracking-[0.18em] uppercase mt-1 mb-4 sm:mb-5"
                      style={{ fontFamily: '"Playfair Display", "Georgia", serif', color: '#c08719' }}
                    >
                      {t.certSubtitle}
                    </h2>

                    <p
                      className="text-xs sm:text-sm text-slate-600 mb-2"
                      style={{ fontFamily: '"Playfair Display", "Georgia", serif', fontStyle: 'italic' }}
                    >
                      {t.awardedTo}
                    </p>

                    {/* Student name — huge gold script with flourish */}
                    <h3
                      className="font-black break-words max-w-full px-2"
                      style={{
                        fontFamily: '"Playfair Display", "Georgia", serif',
                        fontSize: 'clamp(2rem, 5.5vw, 3rem)',
                        lineHeight: 1.05,
                        color: '#8a5a08',
                        textShadow: '0 1px 0 rgba(255, 255, 255, 0.6)',
                      }}
                    >
                      {studentName}
                    </h3>
                    <div
                      className="mx-auto mt-2 w-32 sm:w-40 h-px"
                      style={{ background: 'linear-gradient(to right, transparent, #c08719, transparent)' }}
                    />

                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-2 mb-3">
                      {t.ofClass(className)}
                    </p>
                    <p
                      className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed mb-5 sm:mb-6 italic"
                      style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
                    >
                      {t.body}
                    </p>

                    {/* Stat tiles — navy bordered, gold numbers.
                        Words-mastered is hidden for new students (0)
                        so the certificate doesn't headline a sad
                        "0 words mastered" stat. */}
                    <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3 mt-2 w-full">
                      <StatTile value={attempts} label={t.gamesPlayed} />
                      <StatTile value={`${avgScore}%`} label={t.avgScore} />
                      {wordsMastered != null && wordsMastered > 0 && (
                        <StatTile value={wordsMastered} label={t.wordsMastered} />
                      )}
                    </div>
                  </div>

                  {/* Bottom — signatures flanking a centre seal */}
                  <div className="w-full flex items-end justify-between gap-4 px-2" dir="ltr">
                    <div className="flex flex-col items-center flex-1">
                      <p
                        className="font-black text-slate-900 text-sm sm:text-base"
                        style={{ fontFamily: '"Playfair Display", "Georgia", serif', fontStyle: 'italic' }}
                      >
                        {teacherName || t.yourTeacher}
                      </p>
                      <div className="w-full max-w-[140px] border-t border-slate-400 my-1" />
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        {t.issuedBy}
                      </p>
                    </div>

                    {/* Centre seal — small embossed disc */}
                    <div
                      className="vb-cert-seal relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, #fde68a 0%, #c08719 70%, #7c4a08 100%)',
                        boxShadow: '0 0 0 2px #fffaf0, 0 0 0 3px #c08719',
                      }}
                    >
                      <span
                        className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white text-center leading-tight"
                        style={{ fontFamily: '"Inter", sans-serif' }}
                      >
                        {t.signatureSeal}
                      </span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      <p
                        className="font-black text-slate-900 text-sm sm:text-base"
                        style={{ fontFamily: '"Playfair Display", "Georgia", serif', fontStyle: 'italic' }}
                      >
                        {today}
                      </p>
                      <div className="w-full max-w-[140px] border-t border-slate-400 my-1" />
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        {t.date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action row — Download / Share / Print */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-3 gap-2 print:hidden">
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy !== null}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-amber-200 font-black text-sm shadow-md hover:from-slate-800 hover:to-slate-700 active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                <Download size={16} />
                {busy === 'download' ? t.exporting : t.download}
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={busy !== null}
                style={{
                  touchAction: 'manipulation',
                  background: 'linear-gradient(135deg, #c08719 0%, #f5c97a 50%, #c08719 100%)',
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-black text-sm shadow-md active:scale-[0.98] disabled:opacity-60 transition-all"
                aria-label={t.share}
              >
                <Share2 size={16} />
                {busy === 'share' ? t.sharing : t.share}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={busy !== null}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm active:scale-[0.98] disabled:opacity-60 transition-all"
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

interface StatTileProps {
  value: number | string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div
      className="flex-1 min-w-[80px] max-w-[140px] rounded-md py-2 px-3 text-center"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        border: '1px solid #1e293b',
      }}
    >
      <p
        className="text-xl sm:text-2xl font-black tabular-nums leading-none"
        style={{ color: '#8a5a08', fontFamily: '"Playfair Display", "Georgia", serif' }}
      >
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}
