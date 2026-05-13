/**
 * ClassReportModal — visual class-performance summary the teacher can
 * download as PDF or print.
 *
 * Triggered from the "Report" button in ReportExportBar (Classroom →
 * Reports tab).  Shows:
 *   - Four summary stat cards: students, plays, avg score, mistakes
 *   - Bar chart 1: average score per student (sorted descending)
 *   - Bar chart 2: top-10 most-missed words across the class
 *   - Per-student status table colour-coded On track / Watch / Needs
 *     support (same thresholds as the Excel export: ≥80 green, ≥60
 *     amber, <60 red)
 *
 * PDF/print share the same body via the class app's existing
 * .vb-print-stack pattern.  Recharts renders into the live DOM, then
 * html2pdf rasterises a clone for the PDF download.
 *
 * No new data dependencies — everything is derived from the same
 * scores/assignments props ReportExportBar already receives.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ProgressData, AssignmentData, ClassData } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherClassroomT } from '../../locales/teacher/classroom';

export interface ClassReportModalProps {
  open: boolean;
  onClose: () => void;
  classCode: string;
  classes: ClassData[];
  scores: ProgressData[];
  assignments: AssignmentData[];
  rosterSize: number;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface StudentSummary {
  studentName: string;
  plays: number;
  avgScore: number;
  totalMistakes: number;
  status: 'green' | 'amber' | 'red';
}

interface WordCount {
  word: string;
  count: number;
}

// Score → status thresholds.  Same bands as the Excel export.
const statusFor = (avg: number): StudentSummary['status'] =>
  avg >= 80 ? 'green' : avg >= 60 ? 'amber' : 'red';

const STATUS_COLOR: Record<StudentSummary['status'], string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

const STATUS_BG: Record<StudentSummary['status'], string> = {
  green: '#d1fae5',
  amber: '#fef3c7',
  red: '#fee2e2',
};

const STATUS_TEXT: Record<StudentSummary['status'], string> = {
  green: '#065f46',
  amber: '#92400e',
  red: '#991b1b',
};

function buildSummaries(
  scores: ProgressData[],
  classCode: string,
): { students: StudentSummary[]; topWords: WordCount[] } {
  const filtered = classCode ? scores.filter(s => s.classCode === classCode) : scores;

  const byStudent = new Map<string, { plays: number; sum: number; mistakes: number }>();
  const byWord = new Map<string, number>();

  for (const s of filtered) {
    const prev = byStudent.get(s.studentName) ?? { plays: 0, sum: 0, mistakes: 0 };
    prev.plays += 1;
    prev.sum += s.score;
    prev.mistakes += s.mistakes?.length ?? 0;
    byStudent.set(s.studentName, prev);

    for (const m of s.mistakes ?? []) {
      if (!m) continue;
      const key = typeof m === 'string' ? m : (m as { word?: string }).word ?? '';
      if (!key) continue;
      byWord.set(key, (byWord.get(key) ?? 0) + 1);
    }
  }

  const students: StudentSummary[] = Array.from(byStudent.entries())
    .map(([studentName, v]) => {
      const avg = v.plays === 0 ? 0 : Math.round(v.sum / v.plays);
      return {
        studentName,
        plays: v.plays,
        avgScore: avg,
        totalMistakes: v.mistakes,
        status: statusFor(avg),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const topWords: WordCount[] = Array.from(byWord.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { students, topWords };
}

export default function ClassReportModal({
  open,
  onClose,
  classCode,
  classes,
  scores,
  rosterSize,
  showToast,
}: ClassReportModalProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = teacherClassroomT[language];
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | 'pdf'>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const className = classes.find(c => c.code === classCode)?.name ?? classCode ?? t.allClasses;

  const { students, topWords } = useMemo(
    () => buildSummaries(scores, classCode),
    [scores, classCode],
  );

  const totals = useMemo(() => {
    const plays = students.reduce((sum, s) => sum + s.plays, 0);
    const avg = students.length === 0
      ? 0
      : Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length);
    const mistakes = students.reduce((sum, s) => sum + s.totalMistakes, 0);
    return { students: students.length, plays, avg, mistakes };
  }, [students]);

  const statusLabels: Record<StudentSummary['status'], string> = {
    green: t.reportStatusGreen,
    amber: t.reportStatusAmber,
    red: t.reportStatusRed,
  };

  const todayStr = new Date().toLocaleDateString(
    language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const handleDownload = async () => {
    if (!printRef.current || busy) return;
    setBusy('pdf');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opts = {
        margin: [8, 8, 8, 8],
        filename: `vocaband-report-${classCode || 'all'}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css'] },
      };
      await html2pdf().from(printRef.current).set(opts as never).save();
      showToast(t.reportPdfSuccess, 'success');
    } catch (err) {
      console.error('[report] PDF export failed', err);
      showToast(t.reportPdfFailed, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
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

  const empty = students.length === 0;
  void rosterSize; // reserved for a future "roster vs. active" stat row

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="report-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center px-4 py-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto print:hidden"
          onClick={onClose}
          dir={dir}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-4 text-white flex items-start justify-between gap-3 print:hidden">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-white/80">
                  {t.reportModalTitle}
                </p>
                <p className="text-sm text-white/85 mt-0.5 truncate">
                  {t.reportModalSubtitle(className)}
                </p>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label={t.reportCloseAria}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body — also the print/pdf source */}
            <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
              <div ref={printRef} className="text-stone-900">
                {/* Print-only header — only renders in the PDF/print */}
                <div className="hidden print:block mb-4">
                  <h1 className="text-2xl font-black text-indigo-700">{t.reportModalTitle}</h1>
                  <p className="text-sm text-stone-600">{t.reportModalSubtitle(className)} · {todayStr}</p>
                </div>

                {empty ? (
                  <div className="text-center py-12 text-stone-500 text-sm">
                    {t.reportEmpty}
                  </div>
                ) : (
                  <>
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <StatCard
                        label={t.reportSummaryStudents}
                        value={totals.students}
                        accent="indigo"
                      />
                      <StatCard
                        label={t.reportSummaryPlays}
                        value={totals.plays}
                        accent="violet"
                      />
                      <StatCard
                        label={t.reportSummaryAvg}
                        value={`${totals.avg}%`}
                        accent={totals.avg >= 80 ? 'emerald' : totals.avg >= 60 ? 'amber' : 'rose'}
                      />
                      <StatCard
                        label={t.reportSummaryMistakes}
                        value={totals.mistakes}
                        accent="rose"
                      />
                    </div>

                    {/* Per-student avg score chart */}
                    <ChartCard
                      title={t.reportPerStudentTitle}
                      subtitle={t.reportPerStudentSubtitle}
                    >
                      <ResponsiveContainer width="100%" height={Math.max(220, students.length * 32)}>
                        <BarChart
                          data={students}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            label={{ value: t.reportPerStudentAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="studentName"
                            tick={{ fontSize: 11, fill: '#374151' }}
                            width={isRTL ? 100 : 120}
                            reversed={isRTL}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            formatter={(v) => `${v ?? 0}%`}
                          />
                          <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                            {students.map((s, i) => (
                              <Cell key={i} fill={STATUS_COLOR[s.status]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    {/* Top missed words chart */}
                    <ChartCard
                      title={t.reportTopWordsTitle}
                      subtitle={t.reportTopWordsSubtitle}
                    >
                      {topWords.length === 0 ? (
                        <p className="text-center py-8 text-stone-500 text-sm italic">
                          {t.reportTopWordsEmpty}
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height={Math.max(220, topWords.length * 30)}>
                          <BarChart
                            data={topWords}
                            layout="vertical"
                            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: '#6b7280' }}
                              allowDecimals={false}
                              label={{ value: t.reportTopWordsAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
                            />
                            <YAxis
                              type="category"
                              dataKey="word"
                              tick={{ fontSize: 11, fill: '#374151' }}
                              width={isRTL ? 100 : 120}
                              reversed={isRTL}
                            />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    {/* Status table */}
                    <div className="rounded-2xl border border-stone-200 overflow-hidden mt-6 vb-print-avoid-break">
                      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                        <h3 className="font-black text-sm text-stone-800">{t.reportStatusTableHeading}</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-stone-100/70 text-stone-600 text-xs uppercase tracking-wider">
                          <tr>
                            <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.pdfColStudent}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColPlays}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColAvg}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColMistakes}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.excelColStatus}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr key={s.studentName} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                              <td className={`px-4 py-2 font-semibold text-stone-900 ${isRTL ? 'text-right' : 'text-left'}`}>{s.studentName}</td>
                              <td className="px-4 py-2 text-center tabular-nums">{s.plays}</td>
                              <td className="px-4 py-2 text-center tabular-nums font-bold" style={{ color: STATUS_COLOR[s.status] }}>{s.avgScore}%</td>
                              <td className="px-4 py-2 text-center tabular-nums">{s.totalMistakes}</td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                                  style={{
                                    backgroundColor: STATUS_BG[s.status],
                                    color: STATUS_TEXT[s.status],
                                  }}
                                >
                                  {statusLabels[s.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action row */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-2 gap-2 print:hidden">
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy !== null || empty}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-sm shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {t.reportDownloadPdf}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={empty}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Printer size={16} />
                {t.reportPrintBtn}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  accent: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose';
}

const ACCENT_RING: Record<StatCardProps['accent'], string> = {
  indigo: 'from-indigo-500 to-indigo-600',
  violet: 'from-violet-500 to-fuchsia-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
};

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 bg-gradient-to-br ${ACCENT_RING[accent]} text-white shadow-md`}>
      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/80">{label}</p>
      <p className="text-2xl sm:text-3xl font-black tabular-nums mt-1">{value}</p>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 mt-4 vb-print-avoid-break">
      <h3 className="font-black text-sm text-stone-800">{title}</h3>
      {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
