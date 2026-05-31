/**
 * ReportExportBar — single export surface for the Classroom area.
 *
 * Two buttons, both built on top of the same buildRows() row model:
 *
 *   - Excel  → multi-sheet .xlsx via exceljs.  Three sheets:
 *              Overview / Game History / Word Mastery.  Frozen header
 *              rows, bold purple headers, conditional fill on score
 *              cells (≥80 green, ≥60 amber, <60 red), status-coloured
 *              labels, summary stats at the top of Overview.
 *
 *   - Report → opens ClassReportModal with Recharts bar charts
 *              (per-student avg + most-missed words), coloured status
 *              table, and Download-as-PDF / Print actions.
 *
 * The previous flat-CSV + jsPDF combo was hard for teachers to share
 * with parents (CSV in Hebrew/Arabic opened as mojibake in Office for
 * Windows; jsPDF couldn't handle Tailwind v4 oklch colours).  Excel
 * is the lingua franca of school admin, and a visual Report is what
 * teachers actually paste into staff-meeting decks.
 */
import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, BarChart3, Loader2 } from 'lucide-react';
import type { ProgressData, AssignmentData, ClassData } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherClassroomT } from '../../locales/teacher/classroom';
import { analyticsT } from '../../locales/teacher/analytics';
import { ALL_WORDS } from '../../data/vocabulary';
import ClassReportModal from './ClassReportModal';

// id → word, built once so the per-student + class word tallies don't
// do an O(n) ALL_WORDS.find() per mistake.
const WORD_BY_ID = new Map(ALL_WORDS.map(w => [w.id, w]));
const ACTIVITY_WEEKS = 8;

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

export interface ReportExportBarProps {
  /** Current class scope. Blank / unknown means "all classes". */
  classCode: string;
  classes: ClassData[];
  scores: ProgressData[];
  assignments: AssignmentData[];
  classStudents: ClassStudent[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface PlayRow {
  studentName: string;
  classCode: string;
  assignment: string;
  mode: string;
  score: number;
  mistakes: number;
  date: string;
  ts: number;
}

interface StudentSummaryRow {
  studentName: string;
  plays: number;
  avgScore: number;
  bestScore: number;
  lastActive: string;
  totalMistakes: number;
  status: 'green' | 'amber' | 'red';
  /** This student's most-missed English words (top 3) — "words to review". */
  topMissed: string[];
}

interface WordMissRow {
  word: string;
  /** Hebrew + Arabic translations for the Word Mastery sheet. */
  he: string;
  ar: string;
  count: number;
  studentsAffected: number;
}

interface ActivityData {
  /** weeks × 7 grid of play counts; row 0 = oldest week shown. */
  grid: number[][];
  /** Total plays per weekday (index 0 = Sunday). */
  dayTotals: number[];
  /** Index of the busiest weekday, or null when there's no activity. */
  busiestDayIdx: number | null;
  max: number;
}

const today = () => new Date().toISOString().slice(0, 10);

// Same thresholds as ClassReportModal so the two surfaces always agree.
const statusFor = (avg: number): StudentSummaryRow['status'] =>
  avg >= 80 ? 'green' : avg >= 60 ? 'amber' : 'red';

function buildRows(
  scores: ProgressData[],
  assignments: AssignmentData[],
  classCode: string,
  quickPlayLabel: string,
): { plays: PlayRow[]; students: StudentSummaryRow[]; words: WordMissRow[]; activity: ActivityData } {
  const filtered = classCode
    ? scores.filter(s => s.classCode === classCode)
    : scores;
  const assignmentTitle = new Map<string, string>();
  assignments.forEach(a => assignmentTitle.set(a.id, a.title));

  const plays: PlayRow[] = filtered
    .map(s => ({
      studentName: s.studentName,
      classCode: s.classCode,
      assignment: assignmentTitle.get(s.assignmentId) ?? (s.assignmentId?.startsWith('quickplay-') ? quickPlayLabel : '—'),
      mode: s.mode,
      score: s.score,
      mistakes: s.mistakes?.length ?? 0,
      date: new Date(s.completedAt).toLocaleDateString(),
      ts: new Date(s.completedAt).getTime(),
    }))
    .sort((a, b) => b.ts - a.ts);

  const byName = new Map<string, { plays: number; sum: number; best: number; mistakes: number; lastTs: number }>();
  for (const p of plays) {
    const prev = byName.get(p.studentName) ?? { plays: 0, sum: 0, best: 0, mistakes: 0, lastTs: 0 };
    prev.plays += 1;
    prev.sum += p.score;
    prev.best = Math.max(prev.best, p.score);
    prev.mistakes += p.mistakes;
    prev.lastTs = Math.max(prev.lastTs, p.ts);
    byName.set(p.studentName, prev);
  }

  // Word-level miss tallies. `mistakes` holds numeric word IDs — join to
  // ALL_WORDS (the on-screen Reports card does the same). Track both the
  // class-wide counts AND per-student counts so each student gets their
  // own "words to review".
  const byWordId = new Map<number, { count: number; students: Set<string> }>();
  const missByStudent = new Map<string, Map<number, number>>();
  for (const s of filtered) {
    for (const wordId of s.mistakes ?? []) {
      if (typeof wordId !== 'number' || !WORD_BY_ID.has(wordId)) continue;
      const prev = byWordId.get(wordId) ?? { count: 0, students: new Set<string>() };
      prev.count += 1;
      prev.students.add(s.studentName);
      byWordId.set(wordId, prev);
      const perStudent = missByStudent.get(s.studentName) ?? new Map<number, number>();
      perStudent.set(wordId, (perStudent.get(wordId) ?? 0) + 1);
      missByStudent.set(s.studentName, perStudent);
    }
  }

  const topMissedFor = (name: string): string[] =>
    Array.from(missByStudent.get(name)?.entries() ?? [])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => WORD_BY_ID.get(id)?.english ?? '')
      .filter(Boolean);

  const students: StudentSummaryRow[] = Array.from(byName.entries())
    .map(([studentName, v]) => {
      const avg = v.plays === 0 ? 0 : Math.round(v.sum / v.plays);
      return {
        studentName,
        plays: v.plays,
        avgScore: avg,
        bestScore: v.best,
        totalMistakes: v.mistakes,
        lastActive: v.lastTs ? new Date(v.lastTs).toLocaleDateString() : '—',
        status: statusFor(avg),
        topMissed: topMissedFor(studentName),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const words: WordMissRow[] = Array.from(byWordId.entries())
    .map(([id, v]) => {
      const w = WORD_BY_ID.get(id)!;
      return { word: w.english, he: w.hebrew ?? '', ar: w.arabic ?? '', count: v.count, studentsAffected: v.students.size };
    })
    .sort((a, b) => b.count - a.count);

  // ─── Activity heatmap — weeks × 7 play counts (matches the on-screen
  // "Activity Pattern" card), plus weekday totals + busiest weekday.
  const now = new Date();
  const thisWeekSunday = new Date(now);
  thisWeekSunday.setHours(0, 0, 0, 0);
  thisWeekSunday.setDate(thisWeekSunday.getDate() - thisWeekSunday.getDay());
  const grid: number[][] = Array.from({ length: ACTIVITY_WEEKS }, () => Array(7).fill(0));
  const dayTotals = Array(7).fill(0);
  let max = 0;
  for (const s of filtered) {
    if (!s.completedAt) continue;
    const d = new Date(s.completedAt);
    if (Number.isNaN(d.getTime())) continue;
    const diffDays = Math.floor((thisWeekSunday.getTime() - d.getTime()) / 86_400_000);
    const weekIndex = diffDays < 0 ? 0 : Math.floor(diffDays / 7);
    const dayIndex = d.getDay();
    dayTotals[dayIndex] += 1;
    if (weekIndex < 0 || weekIndex >= ACTIVITY_WEEKS) continue;
    grid[weekIndex][dayIndex] += 1;
    if (grid[weekIndex][dayIndex] > max) max = grid[weekIndex][dayIndex];
  }
  const busiestDayIdx = dayTotals.some(v => v > 0)
    ? dayTotals.indexOf(Math.max(...dayTotals))
    : null;
  const activity: ActivityData = { grid, dayTotals, busiestDayIdx, max };

  return { plays, students, words, activity };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Excel theme — bold purple headers + status-coloured cells.  These
// stay in argb (no leading #) so exceljs accepts them as fill colours.
const HEADER_FILL = 'FF4F46E5';      // indigo-600
const HEADER_TEXT = 'FFFFFFFF';
const SCORE_GREEN = 'FFD1FAE5';      // emerald-100
const SCORE_AMBER = 'FFFEF3C7';      // amber-100
const SCORE_RED   = 'FFFEE2E2';      // rose-100
const STATUS_GREEN_FONT = 'FF065F46';
const STATUS_AMBER_FONT = 'FF92400E';
const STATUS_RED_FONT   = 'FF991B1B';

export default function ReportExportBar({
  classCode,
  classes,
  scores,
  assignments,
  classStudents,
  showToast,
}: ReportExportBarProps) {
  const { language } = useLanguage();
  const t = teacherClassroomT[language];
  const at = analyticsT[language];
  const [busy, setBusy] = useState<null | 'excel'>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { plays, students, words, activity } = useMemo(
    () => buildRows(scores, assignments, classCode, t.quickPlayLabel),
    [scores, assignments, classCode, t.quickPlayLabel],
  );

  const className = classes.find(c => c.code === classCode)?.name ?? classCode ?? t.allClasses;
  const rosterSize = classCode
    ? classStudents.filter(cs => cs.classCode === classCode).length
    : classStudents.length;

  const disabled = plays.length === 0;

  const handleExcel = async () => {
    if (disabled) {
      showToast(t.exportNothingToast, 'info');
      return;
    }
    setBusy('excel');
    try {
      // exceljs is heavy (~600KB).  Lazy-load so the Classroom bundle
      // stays light for teachers who never export.
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Vocaband';
      workbook.created = new Date();

      const avgAll = students.length === 0
        ? 0
        : Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length);

      const statusLabel: Record<StudentSummaryRow['status'], { label: string; font: string; fill: string }> = {
        green: { label: t.excelStatusGreen, font: STATUS_GREEN_FONT, fill: SCORE_GREEN },
        amber: { label: t.excelStatusAmber, font: STATUS_AMBER_FONT, fill: SCORE_AMBER },
        red:   { label: t.excelStatusRed,   font: STATUS_RED_FONT,   fill: SCORE_RED   },
      };

      // ─── Sheet 1: Overview ─────────────────────────────────────
      const overview = workbook.addWorksheet(t.excelSheetOverview, {
        views: [{ state: 'frozen', ySplit: 6 }],
      });
      overview.mergeCells('A1:F1');
      const titleCell = overview.getCell('A1');
      titleCell.value = t.excelOverviewTitle(className);
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E1B4B' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      overview.getCell('A2').value = `${t.pdfClassLabel}: ${className}`;
      overview.getCell('A3').value = `${t.pdfExportedAt}: ${new Date().toLocaleString()}`;
      overview.getCell('A4').value = t.pdfHeadlineStats(students.length, plays.length, avgAll, rosterSize);
      overview.getRow(4).font = { italic: true, color: { argb: 'FF4B5563' } };

      // Header row at row 6 — keep one blank row for breathing room
      const overviewHeaders = [
        t.pdfColStudent,
        t.pdfColPlays,
        t.pdfColAvg,
        t.pdfColBest,
        t.pdfColMistakes,
        t.excelColStatus,
        t.wordsToReview,
      ];
      const headerRow = overview.getRow(6);
      overviewHeaders.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
      headerRow.font = { bold: true, color: { argb: HEADER_TEXT } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      headerRow.alignment = { vertical: 'middle' };

      students.forEach((s, i) => {
        const r = overview.getRow(7 + i);
        r.getCell(1).value = s.studentName;
        r.getCell(2).value = s.plays;
        r.getCell(3).value = s.avgScore / 100;
        r.getCell(3).numFmt = '0%';
        r.getCell(4).value = s.bestScore / 100;
        r.getCell(4).numFmt = '0%';
        r.getCell(5).value = s.totalMistakes;
        const status = statusLabel[s.status];
        r.getCell(6).value = status.label;
        r.getCell(6).font = { bold: true, color: { argb: status.font } };
        r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: status.fill } };
        // Conditional fill on the Avg column to mirror the status colour
        r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: status.fill } };
        r.getCell(7).value = s.topMissed.length ? s.topMissed.join(', ') : t.noWordsToReview;
      });

      overview.columns.forEach((col, i) => {
        col.width = i === 0 ? 26 : i === 6 ? 40 : 14;
      });

      // ─── Legend / how-to-read, a few rows below the table ──────
      const legendStart = 7 + students.length + 2;
      const legendLines = [t.legendTitle, t.legendStatusLine, t.legendScoresLine, t.legendWordsLine];
      legendLines.forEach((line, i) => {
        const cell = overview.getCell(`A${legendStart + i}`);
        cell.value = line;
        cell.font = i === 0
          ? { bold: true, size: 12, color: { argb: 'FF1E1B4B' } }
          : { color: { argb: 'FF4B5563' } };
      });

      // ─── Sheet 2: Game History ─────────────────────────────────
      const history = workbook.addWorksheet(t.excelSheetGameHistory, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      history.columns = [
        { header: t.pdfColStudent,    key: 'student',    width: 24 },
        { header: t.pdfClassLabel,    key: 'class',      width: 14 },
        { header: t.pdfColAssignment, key: 'assignment', width: 28 },
        { header: t.pdfColMode,       key: 'mode',       width: 16 },
        { header: t.pdfColScore,      key: 'score',      width: 12 },
        { header: t.pdfColMistakes,   key: 'mistakes',   width: 12 },
        { header: t.pdfColDate,       key: 'date',       width: 14 },
      ];
      const historyHeader = history.getRow(1);
      historyHeader.font = { bold: true, color: { argb: HEADER_TEXT } };
      historyHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };

      plays.forEach((p, i) => {
        const r = history.getRow(2 + i);
        r.getCell(1).value = p.studentName;
        r.getCell(2).value = p.classCode;
        r.getCell(3).value = p.assignment;
        r.getCell(4).value = p.mode;
        r.getCell(5).value = p.score / 100;
        r.getCell(5).numFmt = '0%';
        const cellStatus = statusFor(p.score);
        r.getCell(5).fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: statusLabel[cellStatus].fill },
        };
        r.getCell(6).value = p.mistakes;
        r.getCell(7).value = p.date;
      });

      // ─── Sheet 3: Word Mastery ─────────────────────────────────
      // Computed from mistake counts.  "Times missed" = total misses
      // across the class; "Students affected" = distinct students who
      // hit it at least once.  Empty when nobody has logged a mistake.
      const mastery = workbook.addWorksheet(t.excelSheetWordMastery, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      mastery.columns = [
        { header: t.excelColWord,              key: 'word',     width: 28 },
        { header: t.excelColTimesMissed,       key: 'count',    width: 16 },
        { header: t.excelColStudentsAffected,  key: 'students', width: 20 },
      ];
      const masteryHeader = mastery.getRow(1);
      masteryHeader.font = { bold: true, color: { argb: HEADER_TEXT } };
      masteryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };

      words.forEach((w, i) => {
        const r = mastery.getRow(2 + i);
        r.getCell(1).value = w.word;
        r.getCell(2).value = w.count;
        r.getCell(3).value = w.studentsAffected;
      });

      // ─── Sheet 4: Activity ─────────────────────────────────────
      // Weeks × weekday heatmap, mirroring the on-screen Activity
      // Pattern card so the download matches what the teacher sees.
      const activitySheet = workbook.addWorksheet(t.excelSheetActivity, {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      activitySheet.getCell('A1').value = at.activityPattern;
      activitySheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
      if (activity.busiestDayIdx != null) {
        activitySheet.getCell('C1').value = `${at.busiestDayLabel} ${at.dayLabels[activity.busiestDayIdx]}`;
        activitySheet.getCell('C1').font = { italic: true, color: { argb: 'FF4B5563' } };
      }
      const dayHeader = activitySheet.getRow(2);
      at.dayLabels.forEach((label, i) => { dayHeader.getCell(2 + i).value = label; });
      dayHeader.font = { bold: true, color: { argb: HEADER_TEXT } };
      dayHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      const activityFill = (count: number): string | null => {
        if (activity.max === 0 || count === 0) return null;
        const intensity = count / activity.max;
        if (intensity > 0.75) return 'FF4F46E5';
        if (intensity > 0.5) return 'FF6366F1';
        if (intensity > 0.25) return 'FF818CF8';
        if (intensity > 0.1) return 'FFA5B4FC';
        return 'FFC7D2FE';
      };
      activity.grid.forEach((week, weekIndex) => {
        const label = weekIndex === 0 ? at.thisWeek : weekIndex === 1 ? at.lastWeek : at.weeksAgo(weekIndex);
        const r = activitySheet.getRow(3 + weekIndex);
        r.getCell(1).value = label;
        r.getCell(1).font = { bold: true, color: { argb: 'FF4B5563' } };
        week.forEach((count, dayIdx) => {
          const c = r.getCell(2 + dayIdx);
          c.value = count > 0 ? count : '';
          c.alignment = { horizontal: 'center' };
          const fill = activityFill(count);
          if (fill) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
            if (count / activity.max > 0.5) c.font = { bold: true, color: { argb: HEADER_TEXT } };
          }
        });
      });
      activitySheet.getColumn(1).width = 14;
      for (let i = 2; i <= 8; i++) activitySheet.getColumn(i).width = 7;

      // ─── Write and download ────────────────────────────────────
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `vocaband-${classCode || 'all'}-${today()}.xlsx`);
      showToast(t.exportExcelSuccess, 'success');
    } catch (err) {
      console.error('[export] Excel failed', err);
      showToast(t.exportExcelFailed, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleReport = () => {
    if (disabled) {
      showToast(t.exportNothingToast, 'info');
      return;
    }
    setReportOpen(true);
  };

  return (
    <>
      <div
        className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2" style={{ color: 'var(--vb-text-primary)' }}>
            <Download size={16} className="text-indigo-500" />
            <span className="font-bold text-sm">{t.exportThisClass}</span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--vb-text-muted)' }}>
            {plays.length === 0
              ? t.exportEmpty
              : t.exportSummary(students.length, plays.length, className)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExcel}
            disabled={disabled || busy !== null}
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent' as never,
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold hover:shadow-md active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {t.excelButton}
          </button>
          <button
            type="button"
            onClick={handleReport}
            disabled={disabled}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold hover:shadow-md active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={14} />
            {t.reportButton}
          </button>
        </div>
      </div>

      <ClassReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        classCode={classCode}
        classes={classes}
        scores={scores}
        assignments={assignments}
        rosterSize={rosterSize}
        showToast={showToast}
      />
    </>
  );
}
