/**
 * ReportExportBar — the single export surface for the Classroom area.
 *
 * Before this, CSV export lived at the bottom of the Today tab and was
 * hidden on Students / Assignments / Reports.  Teachers hunted for
 * "where's the download" and found it in three places — or not at all
 * if they were on Reports.  Consolidating here means:
 *   - Reports is the only place the export buttons live.
 *   - CSV + PDF share the same row builder so the two files always
 *     line up; no divergent "CSV had mistakes column, PDF didn't"
 *     confusion.
 *   - The export scope follows the tab's class picker — switching
 *     class on Reports re-filters the rows that get exported.
 *
 * PDF is rendered client-side via jspdf + jspdf-autotable.  One
 * branded cover page with class + date + headline stats, then a
 * per-play table and a per-student summary.  autoTable handles the
 * pagination + header repetition automatically so a class with 200
 * plays doesn't clip.
 */
import { useMemo, useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ProgressData, AssignmentData, ClassData } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherClassroomT } from '../../locales/teacher/classroom';
// jspdf + jspdf-autotable add ~300 KB gzipped — too expensive to pull
// into the initial Classroom bundle when most teachers never tap the
// PDF button in a given session.  Lazy-import on first click.

// Hebrew + Arabic glyph support for the PDF.  jsPDF ships only
// Helvetica which has zero coverage for those scripts — without an
// embedded font, Hebrew/Arabic cells render as ☐ or are dropped.
// We fetch the TTFs from /fonts/ (vendored under public/fonts/),
// base64-encode them in-browser, and register with jsPDF on first
// PDF export.  Result is cached on `window` so subsequent exports
// in the same tab don't re-fetch.
type Base64Font = { hebrew: string; arabic: string };
declare global {
  interface Window { __vbExportFonts?: Promise<Base64Font>; }
}

async function loadHebrewArabicFonts(): Promise<Base64Font> {
  if (window.__vbExportFonts) return window.__vbExportFonts;
  const fetchAsBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Font fetch failed: ${url} → ${res.status}`);
    const buf = await res.arrayBuffer();
    // Convert ArrayBuffer to base64 in chunks so we don't hit the
    // browser's apply() argument-count limit on the 188 KB Arabic file.
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)),
      );
    }
    return btoa(binary);
  };
  window.__vbExportFonts = Promise.all([
    fetchAsBase64('/fonts/NotoSansHebrew-Regular.ttf'),
    fetchAsBase64('/fonts/NotoSansArabic-Regular.ttf'),
  ]).then(([hebrew, arabic]) => ({ hebrew, arabic }));
  return window.__vbExportFonts;
}

// Detect script in a string so we can pick the right font for the cell.
const HEBREW_RE = /[֐-׿יִ-ﭏ]/;
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// jsPDF renders Hebrew + Arabic GLYPHS once we register the Noto
// fonts, but it has no native RTL handling — characters are written
// left-to-right, so "שלום" comes out as "םולש".  Workaround: pre-
// reverse RTL runs in the string before handing to jsPDF.  Process
// word-by-word so that mixed strings like "Score: 80% (סימו)" keep
// the Latin part untouched and only flip the Hebrew word.
//
// Caveat: this is naive bidi.  Arabic letters change shape based on
// position (initial/medial/final/isolated forms) — without true glyph
// shaping, reversed Arabic still reads as disconnected glyphs.  Hebrew
// has no shaping so renders correctly.
const RTL_WORD_RE = /[֐-׿؀-ۿݐ-ݿࢠ-ࣿיִ-﻿]+/g;

function fixRtl(text: string): string {
  return text.replace(RTL_WORD_RE, run => run.split('').reverse().join(''));
}

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
}

const today = () => new Date().toISOString().slice(0, 10);

function buildRows(
  scores: ProgressData[],
  assignments: AssignmentData[],
  classCode: string,
  quickPlayLabel: string,
): { plays: PlayRow[]; students: StudentSummaryRow[] } {
  const filtered = classCode
    ? scores.filter(s => s.classCode === classCode)
    : scores;
  const assignmentTitle = new Map<string, string>();
  assignments.forEach(a => assignmentTitle.set(a.id, a.title));

  const plays: PlayRow[] = filtered.map(s => ({
    studentName: s.studentName,
    classCode: s.classCode,
    assignment: assignmentTitle.get(s.assignmentId) ?? (s.assignmentId?.startsWith('quickplay-') ? quickPlayLabel : '—'),
    mode: s.mode,
    score: s.score,
    mistakes: s.mistakes?.length ?? 0,
    date: new Date(s.completedAt).toLocaleDateString(),
    ts: new Date(s.completedAt).getTime(),
  })).sort((a, b) => b.ts - a.ts);

  // Per-student roll-up
  const byName = new Map<string, { plays: number; sum: number; best: number; mistakes: number; lastTs: number }>();
  for (const p of plays) {
    const key = p.studentName;
    const prev = byName.get(key) ?? { plays: 0, sum: 0, best: 0, mistakes: 0, lastTs: 0 };
    prev.plays += 1;
    prev.sum += p.score;
    prev.best = Math.max(prev.best, p.score);
    prev.mistakes += p.mistakes;
    prev.lastTs = Math.max(prev.lastTs, p.ts);
    byName.set(key, prev);
  }

  const students: StudentSummaryRow[] = Array.from(byName.entries())
    .map(([studentName, v]) => ({
      studentName,
      plays: v.plays,
      avgScore: v.plays === 0 ? 0 : Math.round(v.sum / v.plays),
      bestScore: v.best,
      totalMistakes: v.mistakes,
      lastActive: v.lastTs ? new Date(v.lastTs).toLocaleDateString() : '—',
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return { plays, students };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

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
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);

  const { plays, students } = useMemo(
    () => buildRows(scores, assignments, classCode, t.quickPlayLabel),
    [scores, assignments, classCode, t.quickPlayLabel],
  );
  const className = classes.find(c => c.code === classCode)?.name ?? classCode ?? t.allClasses;
  const rosterSize = classCode
    ? classStudents.filter(cs => cs.classCode === classCode).length
    : classStudents.length;

  const disabled = plays.length === 0;

  const handleCsv = () => {
    if (disabled) {
      showToast(t.exportNothingToast, 'info');
      return;
    }
    setBusy('csv');
    try {
      const lines: string[] = [];
      lines.push(`"${t.csvHeaderTitle(className)}"`);
      lines.push(`"${t.csvHeaderExportedAt(new Date().toLocaleString())}"`);
      lines.push('');
      lines.push([t.pdfColStudent, t.pdfClassLabel, t.pdfColAssignment, t.pdfColMode, t.pdfColScore, t.pdfColMistakes, t.pdfColDate]
        .map(escapeCsvCell).join(','));
      plays.forEach(p => {
        lines.push([p.studentName, p.classCode, p.assignment, p.mode, p.score, p.mistakes, p.date]
          .map(escapeCsvCell).join(','));
      });
      lines.push('');
      lines.push([t.pdfColStudent, t.pdfColPlays, t.statAvgScoreLabel, t.pdfColBest, t.pdfColMistakes, t.pdfColLastActive]
        .map(escapeCsvCell).join(','));
      students.forEach(s => {
        lines.push([s.studentName, s.plays, s.avgScore, s.bestScore, s.totalMistakes, s.lastActive]
          .map(escapeCsvCell).join(','));
      });
      // Prefix with UTF-8 BOM (﻿) so Excel for Windows recognises
      // the file as UTF-8 instead of Windows-1252.  Without the BOM,
      // Hebrew + Arabic columns (student names, mistake words) open as
      // mojibake (??? or random Latin-1 glyphs).  Costs 3 bytes; fixes
      // every locale at once.
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `vocaband-${classCode || 'all'}-${today()}.csv`);
      showToast(t.exportCsvSuccess, 'success');
    } catch (err) {
      console.error('[export] CSV failed', err);
      showToast(t.exportCsvFailed, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (disabled) {
      showToast(t.exportNothingToast, 'info');
      return;
    }
    setBusy('pdf');
    try {
      // Dynamic import so jspdf + autotable don't weigh down the
      // Classroom bundle for teachers who never export.  Fetch the
      // Hebrew + Arabic TTFs in parallel — they're vendored under
      // public/fonts/ so the request is same-origin.
      const [{ default: jsPDF }, { default: autoTable }, fonts] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadHebrewArabicFonts().catch(err => {
          console.warn('[export] non-Latin font load failed; PDF will fall back to helvetica only', err);
          return null;
        }),
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();

      // Register the Hebrew + Arabic fonts so autotable can switch to
      // them per-cell via the didParseCell hook.  Names "Hebrew" /
      // "Arabic" are arbitrary jsPDF font ids; we reference them in
      // the hook below.
      if (fonts) {
        doc.addFileToVFS('NotoSansHebrew-Regular.ttf', fonts.hebrew);
        doc.addFont('NotoSansHebrew-Regular.ttf', 'Hebrew', 'normal');
        doc.addFileToVFS('NotoSansArabic-Regular.ttf', fonts.arabic);
        doc.addFont('NotoSansArabic-Regular.ttf', 'Arabic', 'normal');
      }
      // didParseCell hook: jsPDF-autotable lets us mutate the cell's
      // styles AND text before render.  We sniff the cell text and
      // (a) switch font to Hebrew/Arabic when needed (Latin stays on
      // helvetica) and (b) pre-reverse RTL runs so Hebrew reads
      // correctly right-to-left in the rendered PDF.
      const cellFontHook = (data: { cell: { text: string[]; styles: { font?: string; halign?: string } } }) => {
        if (!fonts) return;
        const text = (data.cell.text || []).join(' ');
        const hasHebrew = HEBREW_RE.test(text);
        const hasArabic = ARABIC_RE.test(text);
        if (hasHebrew) data.cell.styles.font = 'Hebrew';
        else if (hasArabic) data.cell.styles.font = 'Arabic';
        if (hasHebrew || hasArabic) {
          // Reverse the RTL runs so jsPDF (which writes left-to-right)
          // ends up displaying right-to-left as the language requires.
          data.cell.text = (data.cell.text || []).map(line => fixRtl(line));
          // Right-align so the cell layout reads as a native RTL
          // reader expects — name pinned to the right edge of its
          // column instead of floating at the left.
          data.cell.styles.halign = 'right';
        }
      };

      // Branded header
      doc.setFillColor(79, 70, 229); // indigo-600 to match the app's signature gradient anchor
      doc.rect(0, 0, pageW, 80, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(t.pdfCoverTitle, 40, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`${t.pdfClassLabel}: ${className}`, 40, 58);
      doc.text(`${t.pdfExportedAt} ${new Date().toLocaleString()}`, 40, 74);

      // Headline stats block
      const avgAll = students.length === 0
        ? 0
        : Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length);
      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(t.pdfHeadlineStats(students.length, plays.length, avgAll, rosterSize), 40, 108);

      // Per-student summary table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(t.pdfStudentSummaryHeading, 40, 140);
      autoTable(doc, {
        startY: 150,
        head: [[t.pdfColStudent, t.pdfColPlays, t.pdfColAvg, t.pdfColBest, t.pdfColMistakes, t.pdfColLastActive]],
        body: students.map(s => [
          s.studentName,
          s.plays,
          `${s.avgScore}%`,
          `${s.bestScore}%`,
          s.totalMistakes,
          s.lastActive,
        ]),
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        styles: { fontSize: 10, cellPadding: 6 },
        theme: 'grid',
        margin: { left: 40, right: 40 },
        didParseCell: cellFontHook,
      });

      // Per-play detail table on a fresh page
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(t.pdfAllPlaysHeading, 40, 44);
      autoTable(doc, {
        startY: 54,
        head: [[t.pdfColStudent, t.pdfColAssignment, t.pdfColMode, t.pdfColScore, t.pdfColMistakes, t.pdfColDate]],
        body: plays.map(p => [
          p.studentName,
          p.assignment,
          p.mode,
          `${p.score}%`,
          p.mistakes,
          p.date,
        ]),
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        styles: { fontSize: 9, cellPadding: 5 },
        theme: 'grid',
        margin: { left: 40, right: 40 },
        didParseCell: cellFontHook,
      });

      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 113, 108);
        doc.text(t.pdfPageOf(i, pageCount), pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
        doc.text('vocaband.com', 40, doc.internal.pageSize.getHeight() - 20);
      }

      doc.save(`vocaband-${classCode || 'all'}-${today()}.pdf`);
      showToast(t.exportPdfSuccess, 'success');
    } catch (err) {
      console.error('[export] PDF failed', err);
      showToast(t.exportPdfFailed, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-stone-900">
          <Download size={16} className="text-indigo-500" />
          <span className="font-bold text-sm">{t.exportThisClass}</span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5 truncate">
          {plays.length === 0
            ? t.exportEmpty
            : t.exportSummary(students.length, plays.length, className)}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCsv}
          disabled={disabled || busy !== null}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          {t.csvButton}
        </button>
        <button
          type="button"
          onClick={handlePdf}
          disabled={disabled || busy !== null}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold hover:shadow-md active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {t.pdfButton}
        </button>
      </div>
    </div>
  );
}
