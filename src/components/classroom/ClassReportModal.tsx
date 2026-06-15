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
import { analyticsT } from '../../locales/teacher/analytics';
import { ALL_WORDS } from '../../data/vocabulary';

// id → word, built once so the per-student + class word tallies skip a
// linear ALL_WORDS.find() per mistake. `mistakes` holds numeric word IDs.
const WORD_BY_ID = new Map(ALL_WORDS.map(w => [w.id, w]));

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
  /** This student's most-missed English words (top 3) — "words to review". */
  topMissed: string[];
}

interface WordCount {
  word: string;
  count: number;
}

interface Activity {
  /** Plays per weekday, index 0 = Sunday. */
  dayTotals: number[];
  busiestDayIdx: number | null;
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
): { students: StudentSummary[]; topWords: WordCount[]; activity: Activity } {
  const filtered = classCode ? scores.filter(s => s.classCode === classCode) : scores;

  const byStudent = new Map<string, { plays: number; sum: number; mistakes: number }>();
  const byWordId = new Map<number, number>();
  const missByStudent = new Map<string, Map<number, number>>();
  const dayTotals = Array(7).fill(0);

  for (const s of filtered) {
    const prev = byStudent.get(s.studentName) ?? { plays: 0, sum: 0, mistakes: 0 };
    prev.plays += 1;
    prev.sum += s.score;
    prev.mistakes += s.mistakes?.length ?? 0;
    byStudent.set(s.studentName, prev);

    if (s.completedAt) {
      const d = new Date(s.completedAt);
      if (!Number.isNaN(d.getTime())) dayTotals[d.getDay()] += 1;
    }

    // `mistakes` holds numeric word IDs — join to ALL_WORDS, same as the
    // on-screen Reports card. (The old code keyed on a string `.word`
    // that never exists, so the words chart always came out empty.)
    for (const wordId of s.mistakes ?? []) {
      if (typeof wordId !== 'number' || !WORD_BY_ID.has(wordId)) continue;
      byWordId.set(wordId, (byWordId.get(wordId) ?? 0) + 1);
      const per = missByStudent.get(s.studentName) ?? new Map<number, number>();
      per.set(wordId, (per.get(wordId) ?? 0) + 1);
      missByStudent.set(s.studentName, per);
    }
  }

  const topMissedFor = (name: string): string[] =>
    Array.from(missByStudent.get(name)?.entries() ?? [])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => WORD_BY_ID.get(id)?.english ?? '')
      .filter(Boolean);

  const students: StudentSummary[] = Array.from(byStudent.entries())
    .map(([studentName, v]) => {
      const avg = v.plays === 0 ? 0 : Math.round(v.sum / v.plays);
      return {
        studentName,
        plays: v.plays,
        avgScore: avg,
        totalMistakes: v.mistakes,
        status: statusFor(avg),
        topMissed: topMissedFor(studentName),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const topWords: WordCount[] = Array.from(byWordId.entries())
    .map(([id, count]) => ({ word: WORD_BY_ID.get(id)!.english, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const busiestDayIdx = dayTotals.some(v => v > 0)
    ? dayTotals.indexOf(Math.max(...dayTotals))
    : null;

  return { students, topWords, activity: { dayTotals, busiestDayIdx } };
}

// Self-contained HTML for the server (Chromium) render. The 3 Recharts
// charts are reproduced as CSS bars (vector text, no html2canvas raster).
// Labels arrive pre-resolved so the helper has no i18n coupling.
function buildClassReportHtml(p: {
  dir: 'ltr' | 'rtl';
  title: string;
  subtitle: string;
  totals: { students: number; plays: number; avg: number; mistakes: number };
  students: StudentSummary[];
  topWords: WordCount[];
  activityData: { day: string; plays: number }[];
  hasActivity: boolean;
  activitySubtitle: string;
  statusLabels: Record<StudentSummary['status'], string>;
  labels: {
    cardStudents: string; cardPlays: string; cardAvg: string; cardMistakes: string;
    perStudentTitle: string; perStudentSubtitle: string;
    topWordsTitle: string; topWordsSubtitle: string; topWordsEmpty: string;
    activityTitle: string; tableHeading: string;
    colStudent: string; colPlays: string; colAvg: string; colMistakes: string; colStatus: string; colReview: string;
    noReview: string;
    legendTitle: string; legendStatus: string; legendScores: string; legendWords: string;
  };
}): string {
  const esc = (s: string | number | null | undefined): string =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const SB: Record<StudentSummary["status"], string> = { green: "#d1fae5", amber: "#fef3c7", red: "#fee2e2" };
  const ST: Record<StudentSummary["status"], string> = { green: "#065f46", amber: "#92400e", red: "#991b1b" };
  const accentFor = (avg: number) => (avg >= 80 ? "#10b981" : avg >= 60 ? "#f59e0b" : "#f43f5e");
  const card = (label: string, value: string | number, accent: string) =>
    `<div class="card"><div class="cv" style="color:${accent}">${esc(value)}</div><div class="cl">${esc(label)}</div></div>`;

  const perStudent = p.students
    .map((s) => `<div class="hb"><div class="hbl">${esc(s.studentName)}</div><div class="hbt"><div class="hbf" style="width:${s.avgScore}%;background:${STATUS_COLOR[s.status]}"></div></div><div class="hbv">${s.avgScore}%</div></div>`)
    .join("");

  const maxCount = Math.max(1, ...p.topWords.map((w) => w.count));
  const topWordsBars = p.topWords.length === 0
    ? `<p class="empty">${esc(p.labels.topWordsEmpty)}</p>`
    : p.topWords
        .map((w) => `<div class="hb"><div class="hbl">${esc(w.word)}</div><div class="hbt"><div class="hbf" style="width:${(w.count / maxCount) * 100}%;background:#f43f5e"></div></div><div class="hbv">${w.count}</div></div>`)
        .join("");

  const maxPlays = Math.max(1, ...p.activityData.map((d) => d.plays));
  const activityBars = p.activityData
    .map((d) => `<div class="vc"><div class="vb" style="height:${(d.plays / maxPlays) * 100}%"></div><div class="vl">${esc(d.day)}</div></div>`)
    .join("");

  const rows = p.students
    .map(
      (s, i) => `<tr style="background:${i % 2 ? "#faf9f7" : "#fff"}"><td class="b">${esc(s.studentName)}</td><td class="c">${esc(s.plays)}</td><td class="c" style="font-weight:700;color:${STATUS_COLOR[s.status]}">${esc(s.avgScore)}%</td><td class="c">${esc(s.totalMistakes)}</td><td class="c"><span class="badge" style="background:${SB[s.status]};color:${ST[s.status]}">${esc(p.statusLabels[s.status])}</span></td><td dir="auto">${s.topMissed.length ? esc(s.topMissed.join(", ")) : esc(p.labels.noReview)}</td></tr>`,
    )
    .join("");

  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Heebo:wght@400;700;800&family=Cairo:wght@400;700;800&display=swap">
<style>
  *{box-sizing:border-box}
  .sheet{width:210mm;min-height:297mm;padding:14mm;font-family:'Inter','Heebo','Cairo',sans-serif;color:#1c1917;direction:${p.dir}}
  h1{font-size:18pt;font-weight:900;color:#4338ca;margin:0}
  .sub{font-size:9pt;color:#78716c;margin:1mm 0 6mm}
  .cards{display:flex;gap:3mm;margin-bottom:7mm}
  .card{flex:1;border:1px solid #e7e5e4;border-radius:9px;padding:3.5mm;text-align:center}
  .cv{font-size:18pt;font-weight:900;line-height:1}
  .cl{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#78716c;margin-top:1.5mm}
  .chart{border:1px solid #e7e5e4;border-radius:10px;padding:5mm;margin-bottom:6mm}
  .chart.keep{break-inside:avoid}
  .chart h3{font-size:11pt;font-weight:800;margin:0}
  .csub{font-size:8pt;color:#78716c;margin:1mm 0 4mm}
  .hb{display:flex;align-items:center;gap:3mm;margin:1.6mm 0;font-size:9pt}
  .hbl{width:40mm;text-align:${p.dir === "rtl" ? "left" : "right"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151}
  .hbt{flex:1;background:#f5f5f4;border-radius:3px;height:5mm;overflow:hidden}
  .hbf{height:100%;border-radius:3px}
  .hbv{width:12mm;font-weight:700;color:#57534e}
  .empty{font-size:9pt;font-style:italic;color:#a8a29e;text-align:center;padding:6mm}
  .vbars{display:flex;align-items:flex-end;gap:3mm;height:38mm;padding-top:2mm}
  .vc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
  .vb{width:55%;min-height:1px;background:#6366f1;border-radius:3px 3px 0 0}
  .vl{font-size:8pt;color:#57534e;margin-top:1.5mm}
  table{width:100%;border-collapse:collapse;font-size:9pt}
  thead{display:table-header-group}
  th{background:#f5f5f4;color:#57534e;text-transform:uppercase;font-size:7pt;font-weight:700;padding:2.2mm;text-align:${p.dir === "rtl" ? "right" : "left"}}
  th.c,td.c{text-align:center}
  td{padding:2.2mm;border-bottom:1px solid #f0efed;vertical-align:top}
  td.b{font-weight:600}
  .badge{display:inline-block;padding:.4mm 2mm;border-radius:8px;font-size:7.5pt;font-weight:700}
  .legend{border:1px solid #e7e5e4;border-radius:10px;padding:4mm;font-size:8pt;line-height:1.7;break-inside:avoid;margin-top:4mm}
  .legend b{display:block;margin-bottom:1mm}
</style>
<div class="sheet">
  <h1>${esc(p.title)}</h1>
  <div class="sub">${esc(p.subtitle)}</div>
  <div class="cards">
    ${card(p.labels.cardStudents, p.totals.students, "#4f46e5")}
    ${card(p.labels.cardPlays, p.totals.plays, "#7c3aed")}
    ${card(p.labels.cardAvg, `${p.totals.avg}%`, accentFor(p.totals.avg))}
    ${card(p.labels.cardMistakes, p.totals.mistakes, "#f43f5e")}
  </div>
  <div class="chart"><h3>${esc(p.labels.perStudentTitle)}</h3><div class="csub">${esc(p.labels.perStudentSubtitle)}</div>${perStudent}</div>
  <div class="chart keep"><h3>${esc(p.labels.topWordsTitle)}</h3><div class="csub">${esc(p.labels.topWordsSubtitle)}</div>${topWordsBars}</div>
  ${p.hasActivity ? `<div class="chart keep"><h3>${esc(p.labels.activityTitle)}</h3><div class="csub">${esc(p.activitySubtitle)}</div><div class="vbars">${activityBars}</div></div>` : ""}
  <div class="chart"><h3>${esc(p.labels.tableHeading)}</h3>
    <table><thead><tr><th>${esc(p.labels.colStudent)}</th><th class="c">${esc(p.labels.colPlays)}</th><th class="c">${esc(p.labels.colAvg)}</th><th class="c">${esc(p.labels.colMistakes)}</th><th class="c">${esc(p.labels.colStatus)}</th><th>${esc(p.labels.colReview)}</th></tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="legend"><b>${esc(p.labels.legendTitle)}</b>${esc(p.labels.legendStatus)}<br>${esc(p.labels.legendScores)}<br>${esc(p.labels.legendWords)}</div>
</div>`;
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
  const at = analyticsT[language];
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

  const { students, topWords, activity } = useMemo(
    () => buildSummaries(scores, classCode),
    [scores, classCode],
  );

  // Per-weekday play counts for the activity bar chart.
  const activityData = useMemo(
    () => at.dayLabels.map((day, i) => ({ day, plays: activity.dayTotals[i] })),
    [at.dayLabels, activity.dayTotals],
  );
  const hasActivity = activity.busiestDayIdx != null;

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
    if (busy) return;
    setBusy('pdf');
    const filename = `vocaband-report-${classCode || 'all'}.pdf`;
    try {
      // Server render (Chromium): vector charts + selectable text. Charts are
      // rebuilt as CSS bars from the same data the on-screen Recharts use.
      const html = buildClassReportHtml({
        dir,
        title: t.reportModalTitle,
        subtitle: `${t.reportModalSubtitle(className)} · ${todayStr}`,
        totals,
        students,
        topWords,
        activityData,
        hasActivity,
        activitySubtitle: hasActivity
          ? `${at.busiestDayLabel} ${at.dayLabels[activity.busiestDayIdx as number]}`
          : '',
        statusLabels,
        labels: {
          cardStudents: t.reportSummaryStudents, cardPlays: t.reportSummaryPlays,
          cardAvg: t.reportSummaryAvg, cardMistakes: t.reportSummaryMistakes,
          perStudentTitle: t.reportPerStudentTitle, perStudentSubtitle: t.reportPerStudentSubtitle,
          topWordsTitle: t.reportTopWordsTitle, topWordsSubtitle: t.reportTopWordsSubtitle,
          topWordsEmpty: t.reportTopWordsEmpty, activityTitle: at.activityPattern,
          tableHeading: t.reportStatusTableHeading,
          colStudent: t.pdfColStudent, colPlays: t.pdfColPlays, colAvg: t.pdfColAvg,
          colMistakes: t.pdfColMistakes, colStatus: t.excelColStatus, colReview: t.wordsToReview,
          noReview: t.noWordsToReview,
          legendTitle: t.legendTitle, legendStatus: t.legendStatusLine,
          legendScores: t.legendScoresLine, legendWords: t.legendWordsLine,
        },
      });
      const { fetchPdfBlob } = await import('../../lib/pdf/requestWorksheetPdf');
      const blob = await fetchPdfBlob({ kind: 'html', html, orientation: 'portrait' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      showToast(t.reportPdfSuccess, 'success');
    } catch {
      // Server unreachable — fall back to the legacy html2pdf rasteriser.
      try {
        if (!printRef.current) throw new Error('no print ref');
        const html2pdf = (await import('html2pdf.js')).default;
        const opts = {
          margin: [8, 8, 8, 8],
          filename,
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
      }
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
            style={{ backgroundColor: 'var(--vb-surface)' }}
            className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden print:bg-white"
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
              <div ref={printRef} style={{ color: 'var(--vb-text-primary)' }} className="print:text-stone-900">
                {/* Print-only header — only renders in the PDF/print */}
                <div className="hidden print:block mb-4">
                  <h1 className="text-2xl font-black text-indigo-700">{t.reportModalTitle}</h1>
                  <p className="text-sm text-stone-600">{t.reportModalSubtitle(className)} · {todayStr}</p>
                </div>

                {empty ? (
                  <div className="text-center py-12 text-sm" style={{ color: 'var(--vb-text-muted)' }}>
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
                        <p className="text-center py-8 text-sm italic" style={{ color: 'var(--vb-text-muted)' }}>
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

                    {/* Activity pattern — when does the class actually play? */}
                    {hasActivity && (
                      <ChartCard
                        title={at.activityPattern}
                        subtitle={`${at.busiestDayLabel} ${at.dayLabels[activity.busiestDayIdx as number]}`}
                      >
                        <ResponsiveContainer width="100%" height={210}>
                          <BarChart data={activityData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#374151' }} reversed={isRTL} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => at.playsTooltip(Number(v) || 0)} />
                            <Bar dataKey="plays" fill="#6366f1" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}

                    {/* Status table */}
                    <div
                      style={{ borderColor: 'var(--vb-border)' }}
                      className="rounded-xl border overflow-hidden mt-6 vb-print-avoid-break print:border-stone-200"
                    >
                      <div
                        style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
                        className="px-4 py-3 border-b print:bg-stone-50 print:border-stone-200"
                      >
                        <h3 className="font-black text-sm print:text-stone-800" style={{ color: 'var(--vb-text-primary)' }}>{t.reportStatusTableHeading}</h3>
                      </div>
                      {/* Horizontal scroll on phones so the 6 columns aren't
                          clipped; min-width keeps them readable. */}
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[34rem] text-sm">
                        <thead
                          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
                          className="text-xs uppercase tracking-wider print:bg-stone-100/70 print:text-stone-600"
                        >
                          <tr>
                            <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.pdfColStudent}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColPlays}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColAvg}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.pdfColMistakes}</th>
                            <th className="px-4 py-2 text-center font-bold">{t.excelColStatus}</th>
                            <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.wordsToReview}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr
                              key={s.studentName}
                              style={{ backgroundColor: i % 2 === 0 ? 'var(--vb-surface)' : 'var(--vb-surface-alt)' }}
                              className={i % 2 === 0 ? 'print:bg-white' : 'print:bg-stone-50/60'}
                            >
                              <td
                                className={`px-4 py-2 font-semibold print:text-stone-900 ${isRTL ? 'text-right' : 'text-left'}`}
                                style={{ color: 'var(--vb-text-primary)' }}
                              >
                                {s.studentName}
                              </td>
                              <td className="px-4 py-2 text-center tabular-nums" style={{ color: 'var(--vb-text-secondary)' }}>{s.plays}</td>
                              <td className="px-4 py-2 text-center tabular-nums font-bold" style={{ color: STATUS_COLOR[s.status] }}>{s.avgScore}%</td>
                              <td className="px-4 py-2 text-center tabular-nums" style={{ color: 'var(--vb-text-secondary)' }}>{s.totalMistakes}</td>
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
                              <td
                                className={`px-4 py-2 text-xs ${isRTL ? 'text-right' : 'text-left'}`}
                                style={{ color: 'var(--vb-text-secondary)' }}
                                dir="auto"
                              >
                                {s.topMissed.length ? s.topMissed.join(', ') : t.noWordsToReview}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>

                    {/* Legend — how to read the report */}
                    <div
                      style={{ backgroundColor: 'var(--vb-surface-alt)', borderColor: 'var(--vb-border)' }}
                      className="rounded-xl border p-4 mt-4 text-xs leading-relaxed vb-print-avoid-break print:bg-stone-50 print:border-stone-200"
                    >
                      <p className="font-black mb-1" style={{ color: 'var(--vb-text-primary)' }}>{t.legendTitle}</p>
                      <p style={{ color: 'var(--vb-text-secondary)' }}>{t.legendStatusLine}</p>
                      <p style={{ color: 'var(--vb-text-secondary)' }}>{t.legendScoresLine}</p>
                      <p style={{ color: 'var(--vb-text-secondary)' }}>{t.legendWordsLine}</p>
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
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-sm shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {t.reportDownloadPdf}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={empty}
                style={{
                  touchAction: 'manipulation',
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-secondary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border hover:opacity-90 font-black text-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
    <div className={`rounded-xl p-3 sm:p-4 bg-gradient-to-br ${ACCENT_RING[accent]} text-white shadow-md`}>
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
    <div
      style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
      className="rounded-xl border p-4 mt-4 vb-print-avoid-break print:bg-white print:border-stone-200"
    >
      <h3 className="font-black text-sm print:text-stone-800" style={{ color: 'var(--vb-text-primary)' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5 print:text-stone-500" style={{ color: 'var(--vb-text-muted)' }}>{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
