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
import ClassReportModal from './ClassReportModal';

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
}

interface WordMissRow {
  word: string;
  count: number;
  studentsAffected: number;
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
): { plays: PlayRow[]; students: StudentSummaryRow[]; words: WordMissRow[] } {
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
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // Word-level miss counts.  Two tallies:
  //   count             — total times the word was missed across class
  //   studentsAffected  — distinct students who missed it at least once
  const byWord = new Map<string, { count: number; students: Set<string> }>();
  for (const s of filtered) {
    for (const m of s.mistakes ?? []) {
      const key = typeof m === 'string' ? m : (m as { word?: string }).word ?? '';
      if (!key) continue;
      const prev = byWord.get(key) ?? { count: 0, students: new Set<string>() };
      prev.count += 1;
      prev.students.add(s.studentName);
      byWord.set(key, prev);
    }
  }

  const words: WordMissRow[] = Array.from(byWord.entries())
    .map(([word, v]) => ({ word, count: v.count, studentsAffected: v.students.size }))
    .sort((a, b) => b.count - a.count);

  return { plays, students, words };
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
  const [busy, setBusy] = useState<null | 'excel'>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { plays, students, words } = useMemo(
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
      });

      overview.columns.forEach((col, i) => {
        col.width = i === 0 ? 26 : 14;
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
        className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold hover:shadow-md active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {t.excelButton}
          </button>
          <button
            type="button"
            onClick={handleReport}
            disabled={disabled}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold hover:shadow-md active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
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
