/**
 * ClassReportModal — visual class-performance summary the teacher can
 * download as PDF or print.
 *
 * Triggered from the "Report" button in ReportExportBar (Classroom →
 * Reports tab).  A student dropdown at the top scopes the whole report
 * (every chart, the table, AND the PDF) to one student or "All students".
 *
 * Class view shows:
 *   - Four summary stat cards: students, plays, avg score, mistakes
 *   - Status-mix donut (On track / Watch / Needs support split)
 *   - Score-band distribution (how many in 0–59 / 60–79 / 80–100)
 *   - Bar chart: average score per student (sorted descending)
 *   - Progress-over-time line (class weekly average)
 *   - Performance-by-mode bars (which game modes the class struggles in)
 *   - Bar chart: top-10 most-missed words across the class
 *   - Activity-by-weekday bars
 *   - Per-student status table colour-coded On track / Watch / Needs
 *     support (≥80 green, ≥60 amber, <60 red)
 *
 * Single-student view drops the class-comparison charts (donut, bands,
 * per-student bars) and focuses the rest on that one kid.
 *
 * PDF is server-rendered (Chromium) from buildClassReportHtml, which
 * rebuilds the charts as vector CSS/SVG (no html2canvas raster) in a
 * tight two-column grid so the page reads cleanly with no dead space.
 * Print falls back to the live DOM via the .vb-print-stack pattern.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer, Loader2, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

// How many trailing weeks the progress-over-time line covers.
const PROGRESS_WEEKS = 8;

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

type Status = 'green' | 'amber' | 'red';

interface StudentSummary {
  studentName: string;
  plays: number;
  avgScore: number;
  bestScore: number;
  totalMistakes: number;
  status: Status;
  /** This student's most-missed English words (top 3) — "words to review". */
  topMissed: string[];
}

interface WordCount {
  word: string;
  count: number;
}

interface ModeStat {
  mode: string;
  avg: number;
  plays: number;
}

interface ReportModel {
  students: StudentSummary[];
  topWords: WordCount[];
  /** Plays per weekday, index 0 = Sunday. */
  dayTotals: number[];
  busiestDayIdx: number | null;
  statusDist: Record<Status, number>;
  /** Student counts per score band — high (≥80) / mid (60–79) / low (<60). */
  scoreBands: { high: number; mid: number; low: number };
  /** Average score per trailing week (null = no plays that week). */
  weekly: { week: string; avg: number | null }[];
  modes: ModeStat[];
  totals: { students: number; plays: number; avg: number; mistakes: number; best: number };
}

// Score → status thresholds.  Same bands as the Excel export.
const statusFor = (avg: number): Status => (avg >= 80 ? 'green' : avg >= 60 ? 'amber' : 'red');

const STATUS_COLOR: Record<Status, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

const STATUS_BG: Record<Status, string> = {
  green: '#d1fae5',
  amber: '#fef3c7',
  red: '#fee2e2',
};

const STATUS_TEXT: Record<Status, string> = {
  green: '#065f46',
  amber: '#92400e',
  red: '#991b1b',
};

// Game-mode ids are stored raw ("memory-flip", "sentence-builder"); the
// names are inherently English, so prettify rather than translate.
const prettyMode = (m: string): string =>
  m.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Monday-anchored ISO-ish week key (YYYY-MM-DD of that week's Monday).
function weekKey(d: Date): string {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday.toISOString().slice(0, 10);
}

function buildReport(
  scores: ProgressData[],
  classCode: string,
  studentName: string | null,
): ReportModel {
  let filtered = classCode ? scores.filter(s => s.classCode === classCode) : scores;
  if (studentName) filtered = filtered.filter(s => s.studentName === studentName);

  const byStudent = new Map<string, { plays: number; sum: number; best: number; mistakes: number }>();
  const byWordId = new Map<number, number>();
  const missByStudent = new Map<string, Map<number, number>>();
  const byMode = new Map<string, { plays: number; sum: number }>();
  const dayTotals = Array(7).fill(0);
  let best = 0;

  // Trailing-week buckets for the progress line, newest last.
  const weekBuckets = new Map<string, { sum: number; count: number }>();
  const weekOrder: string[] = [];
  for (let i = PROGRESS_WEEKS - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i * 7);
    const k = weekKey(d);
    if (!weekBuckets.has(k)) {
      weekBuckets.set(k, { sum: 0, count: 0 });
      weekOrder.push(k);
    }
  }

  for (const s of filtered) {
    const prev = byStudent.get(s.studentName) ?? { plays: 0, sum: 0, best: 0, mistakes: 0 };
    prev.plays += 1;
    prev.sum += s.score;
    prev.best = Math.max(prev.best, s.score);
    prev.mistakes += s.mistakes?.length ?? 0;
    byStudent.set(s.studentName, prev);
    best = Math.max(best, s.score);

    const m = byMode.get(s.mode) ?? { plays: 0, sum: 0 };
    m.plays += 1;
    m.sum += s.score;
    byMode.set(s.mode, m);

    if (s.completedAt) {
      const d = new Date(s.completedAt);
      if (!Number.isNaN(d.getTime())) {
        dayTotals[d.getDay()] += 1;
        const wk = weekBuckets.get(weekKey(d));
        if (wk) {
          wk.sum += s.score;
          wk.count += 1;
        }
      }
    }

    // `mistakes` holds numeric word IDs — join to ALL_WORDS, same as the
    // on-screen Reports card.
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
    .map(([name, v]) => {
      const avg = v.plays === 0 ? 0 : Math.round(v.sum / v.plays);
      return {
        studentName: name,
        plays: v.plays,
        avgScore: avg,
        bestScore: v.best,
        totalMistakes: v.mistakes,
        status: statusFor(avg),
        topMissed: topMissedFor(name),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const topWords: WordCount[] = Array.from(byWordId.entries())
    .map(([id, count]) => ({ word: WORD_BY_ID.get(id)!.english, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const statusDist: Record<Status, number> = { green: 0, amber: 0, red: 0 };
  const scoreBands = { high: 0, mid: 0, low: 0 };
  for (const s of students) {
    statusDist[s.status] += 1;
    if (s.avgScore >= 80) scoreBands.high += 1;
    else if (s.avgScore >= 60) scoreBands.mid += 1;
    else scoreBands.low += 1;
  }

  const modes: ModeStat[] = Array.from(byMode.entries())
    .map(([mode, v]) => ({ mode, plays: v.plays, avg: Math.round(v.sum / v.plays) }))
    .sort((a, b) => b.plays - a.plays);

  const weekly = weekOrder.map(k => {
    const b = weekBuckets.get(k)!;
    return {
      week: new Date(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      avg: b.count > 0 ? Math.round(b.sum / b.count) : null,
    };
  });

  const plays = students.reduce((sum, s) => sum + s.plays, 0);
  const avg = students.length === 0
    ? 0
    : Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length);
  const mistakes = students.reduce((sum, s) => sum + s.totalMistakes, 0);

  const busiestDayIdx = dayTotals.some(v => v > 0) ? dayTotals.indexOf(Math.max(...dayTotals)) : null;

  return {
    students,
    topWords,
    dayTotals,
    busiestDayIdx,
    statusDist,
    scoreBands,
    weekly,
    modes,
    totals: { students: students.length, plays, avg, mistakes, best },
  };
}

// ── PDF HTML ──────────────────────────────────────────────────────────
// Self-contained HTML for the server (Chromium) render.  Charts are
// reproduced as vector CSS/SVG (no html2canvas raster).  Layout is a
// tight grid — short charts pair up two-per-row — so the page fills
// edge to edge with no dead space, while text stays readable.
interface PdfLabels {
  cardStudents: string; cardPlays: string; cardAvg: string; cardMistakes: string; cardBest: string;
  statusMixTitle: string; statusMixSubtitle: string;
  bandsTitle: string; bandsSubtitle: string; bandHigh: string; bandMid: string; bandLow: string;
  perStudentTitle: string; perStudentSubtitle: string;
  progressTitle: string; progressSubtitle: string; progressEmpty: string;
  modesTitle: string; modesSubtitle: string; modesEmpty: string;
  topWordsTitle: string; topWordsSubtitle: string; topWordsEmpty: string;
  activityTitle: string; tableHeading: string;
  colStudent: string; colPlays: string; colAvg: string; colMistakes: string; colStatus: string; colReview: string;
  noReview: string;
  legendTitle: string; legendStatus: string; legendScores: string; legendWords: string;
}

function buildClassReportHtml(p: {
  dir: 'ltr' | 'rtl';
  title: string;
  subtitle: string;
  isStudent: boolean;
  totals: ReportModel['totals'];
  students: StudentSummary[];
  topWords: WordCount[];
  activityData: { day: string; plays: number }[];
  hasActivity: boolean;
  activitySubtitle: string;
  statusDist: Record<Status, number>;
  scoreBands: ReportModel['scoreBands'];
  weekly: ReportModel['weekly'];
  modes: { mode: string; avg: number }[];
  statusLabels: Record<Status, string>;
  labels: PdfLabels;
}): string {
  const esc = (s: string | number | null | undefined): string =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SB: Record<Status, string> = { green: '#d1fae5', amber: '#fef3c7', red: '#fee2e2' };
  const ST: Record<Status, string> = { green: '#065f46', amber: '#92400e', red: '#991b1b' };
  const SC: Record<Status, string> = { green: '#10b981', amber: '#f59e0b', red: '#f43f5e' };
  const accentFor = (avg: number) => (avg >= 80 ? '#10b981' : avg >= 60 ? '#f59e0b' : '#f43f5e');
  const card = (label: string, value: string | number, accent: string) =>
    `<div class="card"><div class="cv" style="color:${accent}">${esc(value)}</div><div class="cl">${esc(label)}</div></div>`;

  // Horizontal-bar list (per-student, words, modes, bands).
  const hbars = (rows: { label: string; pct: number; value: string | number; color: string }[]) =>
    rows.map(r =>
      `<div class="hb"><div class="hbl">${esc(r.label)}</div><div class="hbt"><div class="hbf" style="width:${Math.max(0, Math.min(100, r.pct))}%;background:${r.color}"></div></div><div class="hbv">${esc(r.value)}</div></div>`,
    ).join('');

  // Status-mix donut via conic-gradient + a white centre hole.
  const total = p.totals.students || 1;
  const g = (p.statusDist.green / total) * 360;
  const a = (p.statusDist.amber / total) * 360;
  const donut = `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${SC.green} 0 ${g}deg, ${SC.amber} ${g}deg ${g + a}deg, ${SC.red} ${g + a}deg 360deg)"><div class="donut-hole">${p.totals.students}</div></div>
      <div class="donut-legend">
        <div><span class="dot" style="background:${SC.green}"></span>${esc(p.statusLabels.green)} · ${p.statusDist.green}</div>
        <div><span class="dot" style="background:${SC.amber}"></span>${esc(p.statusLabels.amber)} · ${p.statusDist.amber}</div>
        <div><span class="dot" style="background:${SC.red}"></span>${esc(p.statusLabels.red)} · ${p.statusDist.red}</div>
      </div>
    </div>`;

  const bandMax = Math.max(1, p.scoreBands.high, p.scoreBands.mid, p.scoreBands.low);
  const bands = hbars([
    { label: p.labels.bandHigh, pct: (p.scoreBands.high / bandMax) * 100, value: p.scoreBands.high, color: SC.green },
    { label: p.labels.bandMid, pct: (p.scoreBands.mid / bandMax) * 100, value: p.scoreBands.mid, color: SC.amber },
    { label: p.labels.bandLow, pct: (p.scoreBands.low / bandMax) * 100, value: p.scoreBands.low, color: SC.red },
  ]);

  const perStudent = hbars(p.students.map(s => ({
    label: s.studentName, pct: s.avgScore, value: `${s.avgScore}%`, color: SC[s.status],
  })));

  const maxCount = Math.max(1, ...p.topWords.map(w => w.count));
  const topWordsBars = p.topWords.length === 0
    ? `<p class="empty">${esc(p.labels.topWordsEmpty)}</p>`
    : hbars(p.topWords.map(w => ({ label: w.word, pct: (w.count / maxCount) * 100, value: w.count, color: '#f43f5e' })));

  const modesBars = p.modes.length === 0
    ? `<p class="empty">${esc(p.labels.modesEmpty)}</p>`
    : hbars(p.modes.map(m => ({ label: m.mode, pct: m.avg, value: `${m.avg}%`, color: accentFor(m.avg) })));

  // Progress line as an inline SVG polyline (connects only weeks with data).
  const W = 260, H = 80, pad = 8;
  const pts = p.weekly.map((w, i) => ({ i, avg: w.avg })).filter(pt => pt.avg != null) as { i: number; avg: number }[];
  const n = Math.max(1, p.weekly.length - 1);
  const xAt = (i: number) => pad + (i / n) * (W - 2 * pad);
  const yAt = (v: number) => pad + (1 - v / 100) * (H - 2 * pad);
  const progress = pts.length < 2
    ? `<p class="empty">${esc(p.labels.progressEmpty)}</p>`
    : `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:24mm">
        <polyline fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(pt => `${xAt(pt.i).toFixed(1)},${yAt(pt.avg).toFixed(1)}`).join(' ')}"/>
        ${pts.map(pt => `<circle cx="${xAt(pt.i).toFixed(1)}" cy="${yAt(pt.avg).toFixed(1)}" r="2.6" fill="#10b981"/>`).join('')}
       </svg>
       <div class="xaxis">${p.weekly.map(w => `<span>${esc(w.week)}</span>`).join('')}</div>`;

  const maxPlays = Math.max(1, ...p.activityData.map(d => d.plays));
  const activityBars = p.activityData
    .map(d => `<div class="vc"><div class="vb" style="height:${(d.plays / maxPlays) * 100}%"></div><div class="vl">${esc(d.day)}</div></div>`)
    .join('');

  const rows = p.students
    .map((s, i) =>
      `<tr style="background:${i % 2 ? '#faf9f7' : '#fff'}"><td class="b">${esc(s.studentName)}</td><td class="c">${esc(s.plays)}</td><td class="c" style="font-weight:700;color:${SC[s.status]}">${esc(s.avgScore)}%</td><td class="c">${esc(s.totalMistakes)}</td><td class="c"><span class="badge" style="background:${SB[s.status]};color:${ST[s.status]}">${esc(p.statusLabels[s.status])}</span></td><td dir="auto">${s.topMissed.length ? esc(s.topMissed.join(', ')) : esc(p.labels.noReview)}</td></tr>`,
    )
    .join('');

  // Two-up rows differ between class (donut+bands) and single-student.
  const classTopRow = p.isStudent ? '' : `
    <div class="row">
      <div class="chart half"><h3>${esc(p.labels.statusMixTitle)}</h3><div class="csub">${esc(p.labels.statusMixSubtitle)}</div>${donut}</div>
      <div class="chart half"><h3>${esc(p.labels.bandsTitle)}</h3><div class="csub">${esc(p.labels.bandsSubtitle)}</div>${bands}</div>
    </div>`;
  const perStudentChart = p.isStudent ? '' : `
    <div class="chart"><h3>${esc(p.labels.perStudentTitle)}</h3><div class="csub">${esc(p.labels.perStudentSubtitle)}</div>${perStudent}</div>`;

  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Heebo:wght@400;700;800&family=Cairo:wght@400;700;800&display=swap">
<style>
  *{box-sizing:border-box}
  .sheet{width:210mm;min-height:297mm;padding:12mm;font-family:'Inter','Heebo','Cairo',sans-serif;color:#1c1917;direction:${p.dir}}
  h1{font-size:17pt;font-weight:900;color:#4338ca;margin:0}
  .sub{font-size:9pt;color:#78716c;margin:1mm 0 5mm}
  .cards{display:flex;gap:3mm;margin-bottom:5mm}
  .card{flex:1;border:1px solid #e7e5e4;border-radius:9px;padding:3mm;text-align:center}
  .cv{font-size:17pt;font-weight:900;line-height:1}
  .cl{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#78716c;margin-top:1.5mm}
  .row{display:flex;gap:4mm;margin-bottom:4mm}
  .chart{border:1px solid #e7e5e4;border-radius:10px;padding:4mm;margin-bottom:4mm;break-inside:avoid}
  .chart.half{flex:1;margin-bottom:0}
  .chart h3{font-size:10.5pt;font-weight:800;margin:0}
  .csub{font-size:7.5pt;color:#78716c;margin:.8mm 0 3mm}
  .hb{display:flex;align-items:center;gap:3mm;margin:1.4mm 0;font-size:8.5pt}
  .hbl{width:38mm;text-align:${p.dir === 'rtl' ? 'left' : 'right'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151}
  .hbt{flex:1;background:#f5f5f4;border-radius:3px;height:4.5mm;overflow:hidden}
  .hbf{height:100%;border-radius:3px;min-width:1px}
  .hbv{width:11mm;font-weight:700;color:#57534e;text-align:${p.dir === 'rtl' ? 'left' : 'right'}}
  .empty{font-size:8.5pt;font-style:italic;color:#a8a29e;text-align:center;padding:5mm}
  .donut-wrap{display:flex;align-items:center;gap:5mm}
  .donut{position:relative;width:28mm;height:28mm;border-radius:50%;flex-shrink:0}
  .donut-hole{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16mm;height:16mm;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13pt;font-weight:900;color:#1c1917}
  .donut-legend{font-size:8.5pt;line-height:1.9;color:#374151}
  .dot{display:inline-block;width:2.6mm;height:2.6mm;border-radius:50%;margin-inline-end:2mm;vertical-align:middle}
  .xaxis{display:flex;justify-content:space-between;font-size:6.5pt;color:#78716c;margin-top:1mm}
  .vbars{display:flex;align-items:flex-end;gap:3mm;height:30mm;padding-top:2mm}
  .vc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
  .vb{width:55%;min-height:1px;background:#6366f1;border-radius:3px 3px 0 0}
  .vl{font-size:7.5pt;color:#57534e;margin-top:1.5mm}
  table{width:100%;border-collapse:collapse;font-size:8.5pt}
  thead{display:table-header-group}
  th{background:#f5f5f4;color:#57534e;text-transform:uppercase;font-size:6.5pt;font-weight:700;padding:2mm;text-align:${p.dir === 'rtl' ? 'right' : 'left'}}
  th.c,td.c{text-align:center}
  td{padding:2mm;border-bottom:1px solid #f0efed;vertical-align:top}
  td.b{font-weight:600}
  .badge{display:inline-block;padding:.4mm 2mm;border-radius:8px;font-size:7pt;font-weight:700}
  .legend{border:1px solid #e7e5e4;border-radius:10px;padding:3.5mm;font-size:7.5pt;line-height:1.6;break-inside:avoid;margin-top:3mm}
  .legend b{display:block;margin-bottom:1mm}
</style>
<div class="sheet">
  <h1>${esc(p.title)}</h1>
  <div class="sub">${esc(p.subtitle)}</div>
  <div class="cards">
    ${p.isStudent
      ? card(p.labels.cardBest, `${p.totals.best}%`, accentFor(p.totals.best))
      : card(p.labels.cardStudents, p.totals.students, '#4f46e5')}
    ${card(p.labels.cardPlays, p.totals.plays, '#7c3aed')}
    ${card(p.labels.cardAvg, `${p.totals.avg}%`, accentFor(p.totals.avg))}
    ${card(p.labels.cardMistakes, p.totals.mistakes, '#f43f5e')}
  </div>
  ${classTopRow}
  ${perStudentChart}
  <div class="row">
    <div class="chart half"><h3>${esc(p.labels.progressTitle)}</h3><div class="csub">${esc(p.labels.progressSubtitle)}</div>${progress}</div>
    <div class="chart half"><h3>${esc(p.labels.modesTitle)}</h3><div class="csub">${esc(p.labels.modesSubtitle)}</div>${modesBars}</div>
  </div>
  <div class="chart"><h3>${esc(p.labels.topWordsTitle)}</h3><div class="csub">${esc(p.labels.topWordsSubtitle)}</div>${topWordsBars}</div>
  ${p.hasActivity ? `<div class="chart"><h3>${esc(p.labels.activityTitle)}</h3><div class="csub">${esc(p.activitySubtitle)}</div><div class="vbars">${activityBars}</div></div>` : ''}
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
  const [studentFilter, setStudentFilter] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const className = classes.find(c => c.code === classCode)?.name ?? classCode ?? t.allClasses;

  // Class-level model is always computed (drives the student dropdown +
  // the class charts). The scoped model narrows to one student when picked.
  const classModel = useMemo(() => buildReport(scores, classCode, null), [scores, classCode]);

  const studentNames = useMemo(
    () => classModel.students.map(s => s.studentName).sort((a, b) => a.localeCompare(b)),
    [classModel.students],
  );

  // Derive the live filter rather than resetting via an effect: when the
  // class changes the old name simply drops out of `studentNames`, so the
  // report falls back to "All students" on its own.
  const effectiveFilter = studentNames.includes(studentFilter) ? studentFilter : '';
  const isStudent = effectiveFilter !== '';
  const model = useMemo(
    () => (isStudent ? buildReport(scores, classCode, effectiveFilter) : classModel),
    [scores, classCode, effectiveFilter, isStudent, classModel],
  );

  const { students, topWords, totals, busiestDayIdx, statusDist, scoreBands, weekly, modes } = model;

  const activityData = useMemo(
    () => at.dayLabels.map((day, i) => ({ day, plays: model.dayTotals[i] })),
    [at.dayLabels, model.dayTotals],
  );
  const hasActivity = busiestDayIdx != null;

  const statusLabels = useMemo<Record<Status, string>>(
    () => ({ green: t.reportStatusGreen, amber: t.reportStatusAmber, red: t.reportStatusRed }),
    [t.reportStatusGreen, t.reportStatusAmber, t.reportStatusRed],
  );

  // Donut + bands + modes datasets for recharts.
  const statusPieData = useMemo(
    () => ([
      { key: 'green' as const, name: statusLabels.green, value: statusDist.green },
      { key: 'amber' as const, name: statusLabels.amber, value: statusDist.amber },
      { key: 'red' as const, name: statusLabels.red, value: statusDist.red },
    ].filter(d => d.value > 0)),
    [statusDist, statusLabels],
  );
  const bandData = useMemo(
    () => ([
      { key: 'green' as const, name: t.reportBandHigh, value: scoreBands.high },
      { key: 'amber' as const, name: t.reportBandMid, value: scoreBands.mid },
      { key: 'red' as const, name: t.reportBandLow, value: scoreBands.low },
    ]),
    [scoreBands, t],
  );
  const modeData = useMemo(
    () => modes.map(m => ({ mode: prettyMode(m.mode), avg: m.avg, plays: m.plays, status: statusFor(m.avg) })),
    [modes],
  );
  const hasProgress = useMemo(() => weekly.filter(w => w.avg != null).length >= 2, [weekly]);

  const todayStr = new Date().toLocaleDateString(
    language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const subtitleBase = isStudent ? t.reportStudentSubtitle(effectiveFilter) : t.reportModalSubtitle(className);

  const handleDownload = async () => {
    if (busy) return;
    setBusy('pdf');
    const slug = (isStudent ? effectiveFilter : classCode || 'all').replace(/[^\w-]+/g, '-').toLowerCase();
    const filename = `vocaband-report-${slug}.pdf`;
    try {
      const html = buildClassReportHtml({
        dir,
        title: t.reportModalTitle,
        subtitle: `${subtitleBase} · ${todayStr}`,
        isStudent,
        totals,
        students,
        topWords,
        activityData,
        hasActivity,
        activitySubtitle: hasActivity
          ? `${at.busiestDayLabel} ${at.dayLabels[busiestDayIdx as number]}`
          : '',
        statusDist,
        scoreBands,
        weekly,
        modes: modeData.map(m => ({ mode: m.mode, avg: m.avg })),
        statusLabels,
        labels: {
          cardStudents: t.reportSummaryStudents, cardPlays: t.reportSummaryPlays,
          cardAvg: t.reportSummaryAvg, cardMistakes: t.reportSummaryMistakes, cardBest: t.reportSummaryBest,
          statusMixTitle: t.reportStatusMixTitle, statusMixSubtitle: t.reportStatusMixSubtitle,
          bandsTitle: t.reportScoreBandsTitle, bandsSubtitle: t.reportScoreBandsSubtitle,
          bandHigh: t.reportBandHigh, bandMid: t.reportBandMid, bandLow: t.reportBandLow,
          perStudentTitle: t.reportPerStudentTitle, perStudentSubtitle: t.reportPerStudentSubtitle,
          progressTitle: t.reportProgressTitle,
          progressSubtitle: isStudent ? t.reportProgressSubtitleStudent : t.reportProgressSubtitleClass,
          progressEmpty: t.reportProgressEmpty,
          modesTitle: t.reportModesTitle, modesSubtitle: t.reportModesSubtitle, modesEmpty: t.reportModesEmpty,
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

  const empty = classModel.students.length === 0;
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
                  {subtitleBase}
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

            {/* Student filter — scopes every chart, the table, and the PDF. */}
            {!empty && (
              <div
                className="px-4 sm:px-6 py-3 border-b flex items-center gap-2 flex-wrap print:hidden"
                style={{ borderColor: 'var(--vb-border)', backgroundColor: 'var(--vb-surface-alt)' }}
              >
                <Users size={15} className="text-indigo-500 shrink-0" />
                <label htmlFor="report-student-filter" className="text-xs font-bold" style={{ color: 'var(--vb-text-secondary)' }}>
                  {t.reportFilterStudentAria}
                </label>
                <select
                  id="report-student-filter"
                  value={effectiveFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  dir={dir}
                  className="text-sm font-semibold rounded-lg border px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 max-w-[60%]"
                  style={{
                    backgroundColor: 'var(--vb-surface)',
                    borderColor: 'var(--vb-border)',
                    color: 'var(--vb-text-primary)',
                    touchAction: 'manipulation',
                  }}
                >
                  <option value="">{t.reportAllStudents}</option>
                  {studentNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Body — also the print/pdf source */}
            <div className="p-4 sm:p-6 max-h-[72vh] overflow-y-auto">
              <div ref={printRef} style={{ color: 'var(--vb-text-primary)' }} className="print:text-stone-900">
                {/* Print-only header — only renders in the PDF/print */}
                <div className="hidden print:block mb-4">
                  <h1 className="text-2xl font-black text-indigo-700">{t.reportModalTitle}</h1>
                  <p className="text-sm text-stone-600">{subtitleBase} · {todayStr}</p>
                </div>

                {empty ? (
                  <div className="text-center py-12 text-sm" style={{ color: 'var(--vb-text-muted)' }}>
                    {t.reportEmpty}
                  </div>
                ) : (
                  <>
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {isStudent ? (
                        <StatCard
                          label={t.reportSummaryBest}
                          value={`${totals.best}%`}
                          accent={totals.best >= 80 ? 'emerald' : totals.best >= 60 ? 'amber' : 'rose'}
                        />
                      ) : (
                        <StatCard label={t.reportSummaryStudents} value={totals.students} accent="indigo" />
                      )}
                      <StatCard label={t.reportSummaryPlays} value={totals.plays} accent="violet" />
                      <StatCard
                        label={t.reportSummaryAvg}
                        value={`${totals.avg}%`}
                        accent={totals.avg >= 80 ? 'emerald' : totals.avg >= 60 ? 'amber' : 'rose'}
                      />
                      <StatCard label={t.reportSummaryMistakes} value={totals.mistakes} accent="rose" />
                    </div>

                    {/* Class-comparison charts — only meaningful for the whole class. */}
                    {!isStudent && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ChartCard title={t.reportStatusMixTitle} subtitle={t.reportStatusMixSubtitle}>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={statusPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={80}
                                paddingAngle={2}
                              >
                                {statusPieData.map((d) => (
                                  <Cell key={d.key} fill={STATUS_COLOR[d.key]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title={t.reportScoreBandsTitle} subtitle={t.reportScoreBandsSubtitle}>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={bandData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: t.reportBandStudentsAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} width={isRTL ? 110 : 130} reversed={isRTL} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {bandData.map((d) => (
                                  <Cell key={d.key} fill={STATUS_COLOR[d.key]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      </div>
                    )}

                    {/* Per-student avg score chart — class view only. */}
                    {!isStudent && (
                      <ChartCard title={t.reportPerStudentTitle} subtitle={t.reportPerStudentSubtitle}>
                        <ResponsiveContainer width="100%" height={Math.max(220, students.length * 32)}>
                          <BarChart data={students} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fontSize: 11, fill: '#6b7280' }}
                              label={{ value: t.reportPerStudentAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
                            />
                            <YAxis type="category" dataKey="studentName" tick={{ fontSize: 11, fill: '#374151' }} width={isRTL ? 100 : 120} reversed={isRTL} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v ?? 0}%`} />
                            <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                              {students.map((s, i) => (
                                <Cell key={i} fill={STATUS_COLOR[s.status]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}

                    {/* Progress over time + Performance by mode — two-up. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ChartCard
                        title={t.reportProgressTitle}
                        subtitle={isStudent ? t.reportProgressSubtitleStudent : t.reportProgressSubtitleClass}
                      >
                        {hasProgress ? (
                          <ResponsiveContainer width="100%" height={210}>
                            <LineChart data={weekly} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#374151' }} reversed={isRTL} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} unit="%" />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v ?? 0}%`} />
                              <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center py-8 text-sm italic" style={{ color: 'var(--vb-text-muted)' }}>
                            {t.reportProgressEmpty}
                          </p>
                        )}
                      </ChartCard>

                      <ChartCard title={t.reportModesTitle} subtitle={t.reportModesSubtitle}>
                        {modeData.length === 0 ? (
                          <p className="text-center py-8 text-sm italic" style={{ color: 'var(--vb-text-muted)' }}>
                            {t.reportModesEmpty}
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height={Math.max(210, modeData.length * 30)}>
                            <BarChart data={modeData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: t.reportModesAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }} />
                              <YAxis type="category" dataKey="mode" tick={{ fontSize: 10, fill: '#374151' }} width={isRTL ? 90 : 110} reversed={isRTL} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v ?? 0}%`} />
                              <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                                {modeData.map((m, i) => (
                                  <Cell key={i} fill={STATUS_COLOR[m.status]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </ChartCard>
                    </div>

                    {/* Top missed words chart */}
                    <ChartCard title={t.reportTopWordsTitle} subtitle={t.reportTopWordsSubtitle}>
                      {topWords.length === 0 ? (
                        <p className="text-center py-8 text-sm italic" style={{ color: 'var(--vb-text-muted)' }}>
                          {t.reportTopWordsEmpty}
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height={Math.max(220, topWords.length * 30)}>
                          <BarChart data={topWords} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: '#6b7280' }}
                              allowDecimals={false}
                              label={{ value: t.reportTopWordsAxis, position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
                            />
                            <YAxis type="category" dataKey="word" tick={{ fontSize: 11, fill: '#374151' }} width={isRTL ? 100 : 120} reversed={isRTL} />
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
                        subtitle={`${at.busiestDayLabel} ${at.dayLabels[busiestDayIdx as number]}`}
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
                                  style={{ backgroundColor: STATUS_BG[s.status], color: STATUS_TEXT[s.status] }}
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
