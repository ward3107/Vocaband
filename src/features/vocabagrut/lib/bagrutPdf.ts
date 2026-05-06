// Bagrut paper PDF exporter — the most important deliverable of Vocabagrut.
//
// Goal: produce a paper that visually mimics the real Israeli MoE English
// Bagrut so students get FORMAT FAMILIARITY before they hit 10th grade.
// Layout reference: bilingual MoE header → module + point program label →
// student name/class/date fields → PART I reading + line numbers + MCQ +
// short-answer → PART II vocab-in-context → PART III writing prompt with
// bullets and a ruled box → bilingual GOOD LUCK / בהצלחה footer.
//
// jsPDF + jsPDF-autotable are imported lazily by callers — this module
// itself does not eager-import them so it stays out of the initial
// bundle for teachers who never tap Export.

import {
  loadHebrewArabicFonts,
  registerHebrewArabicFonts,
  fixRtl,
} from '../../../lib/pdfFonts';
import type { BagrutTest, BagrutSection, BagrutQuestion } from '../types';
import { MODULE_SPECS } from './moduleMap';

const PAGE_WIDTH = 595.28;   // A4 in pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;           // ~20mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 36;

export interface ExportOpts {
  withAnswerKey?: boolean;
  teacherName?: string;
  className?: string;
}

export async function exportBagrutPdf(test: BagrutTest, opts: ExportOpts = {}): Promise<void> {
  // Lazy-imports keep jsPDF (~250 KB gz) out of the initial bundle.
  const { default: jsPDF } = await import('jspdf');
  const fonts = await loadHebrewArabicFonts().catch(() => null);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  if (fonts) registerHebrewArabicFonts(doc, fonts);

  const spec = MODULE_SPECS[test.module];

  // ── Cursor state ─────────────────────────────────────────────────────
  let y = MARGIN;

  function ensureRoom(needed: number) {
    if (y + needed > PAGE_HEIGHT - MARGIN - 24) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function drawHebrew(text: string, x: number, yPos: number, opts?: { align?: 'left' | 'right' | 'center'; size?: number }) {
    if (!fonts) return;
    const prevFont = doc.getFont();
    doc.setFont('Hebrew', 'normal');
    if (opts?.size) doc.setFontSize(opts.size);
    doc.text(fixRtl(text), x, yPos, { align: opts?.align ?? 'left' });
    doc.setFont(prevFont.fontName, prevFont.fontStyle);
  }

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text('STATE OF ISRAEL — MINISTRY OF EDUCATION', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 14;
  drawHebrew('מדינת ישראל — משרד החינוך', PAGE_WIDTH / 2, y, { align: 'center', size: 11 });
  y += 16;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text('English — Practice Bagrut', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${spec.label}  |  ${spec.pointTrack}-point program  |  Suggested grade ${spec.gradeBand}`,
    PAGE_WIDTH / 2, y, { align: 'center' },
  );
  y += 14;
  drawHebrew(`${spec.hebrewLabel} — ${spec.pointTrack} יחידות לימוד`, PAGE_WIDTH / 2, y, { align: 'center', size: 11 });
  y += 22;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(test.title, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 22;

  // Name / Class / Date row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const fields = [
    `Name: __________________________`,
    `Class: ____________`,
    `Date: ____________`,
  ];
  doc.text(fields.join('     '), MARGIN, y);
  y += 16;
  doc.text(
    `Time allowed: ${test.time_minutes} minutes      Total: ${test.total_points} points`,
    MARGIN, y,
  );
  y += 18;

  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 18;

  // ── Sections ─────────────────────────────────────────────────────────
  for (const section of test.sections) {
    renderSection(section);
  }

  // ── Footer on every page ─────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    if (p === pageCount) {
      doc.text('GOOD LUCK!', PAGE_WIDTH / 2 - 30, FOOTER_Y, { align: 'right' });
      drawHebrew('בהצלחה!', PAGE_WIDTH / 2 + 30, FOOTER_Y, { align: 'left', size: 10 });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${p} / ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y + 14, { align: 'right' });
    doc.text(`${spec.label} · Vocabagrut`, MARGIN, FOOTER_Y + 14);
  }

  // ── Optional teacher answer key ──────────────────────────────────────
  if (opts.withAnswerKey) {
    doc.addPage();
    y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text("TEACHER'S ANSWER KEY", PAGE_WIDTH / 2, y, { align: 'center' });
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let qNum = 0;
    for (const section of test.sections) {
      ensureRoom(20);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, MARGIN, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      for (const q of section.questions) {
        qNum++;
        ensureRoom(40);
        if (q.type === 'mc' && q.correct_answer) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${qNum}.`, MARGIN, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`Correct answer: (${q.correct_answer})`, MARGIN + 22, y);
          y += 14;
          if (q.explanation) {
            const wrapped = doc.splitTextToSize(q.explanation, CONTENT_WIDTH - 22);
            doc.setTextColor(80, 80, 80);
            doc.text(wrapped, MARGIN + 22, y);
            doc.setTextColor(20, 20, 20);
            y += wrapped.length * 12 + 4;
          }
        } else if (q.type === 'short') {
          doc.setFont('helvetica', 'bold');
          doc.text(`${qNum}.`, MARGIN, y);
          doc.setFont('helvetica', 'normal');
          if (q.explanation) {
            const wrapped = doc.splitTextToSize(`Sample answer / rubric: ${q.explanation}`, CONTENT_WIDTH - 22);
            doc.text(wrapped, MARGIN + 22, y);
            y += wrapped.length * 12 + 4;
          } else {
            y += 14;
          }
        } else if (q.type === 'writing') {
          doc.setFont('helvetica', 'bold');
          doc.text(`${qNum}. Writing rubric`, MARGIN, y);
          y += 14;
          doc.setFont('helvetica', 'normal');
          const rubric = [
            `• Content (${Math.round(q.points * 0.4)} pts): addresses all required bullets, on topic.`,
            `• Organisation (${Math.round(q.points * 0.2)} pts): logical flow, paragraphing.`,
            `• Vocabulary (${Math.round(q.points * 0.2)} pts): appropriate range and accuracy.`,
            `• Grammar (${Math.round(q.points * 0.2)} pts): tense control, agreement, punctuation.`,
          ];
          for (const line of rubric) {
            ensureRoom(14);
            doc.text(line, MARGIN + 22, y);
            y += 12;
          }
          y += 6;
        }
      }
      y += 6;
    }
  }

  doc.save(`${safeFileName(test.title)}.pdf`);

  // ── Renderers ───────────────────────────────────────────────────────
  function renderSection(section: BagrutSection) {
    ensureRoom(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(section.title.toUpperCase(), MARGIN, y);
    doc.text(`(${section.total_points} points)`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += 6;
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 14;

    if (section.passage) {
      renderPassage(section.passage);
      y += 6;
    }

    let qNum = 0;
    for (const q of section.questions) {
      qNum++;
      renderQuestion(q, qNum);
    }
    y += 12;
  }

  function renderPassage(passage: string) {
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    // Wrap + render line by line so we can put line numbers in the margin.
    const lineWidth = CONTENT_WIDTH - 28; // 28pt left gutter for line numbers
    const lines = doc.splitTextToSize(passage, lineWidth);
    for (let i = 0; i < lines.length; i++) {
      ensureRoom(16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(String(i + 1).padStart(2, ' '), MARGIN, y);
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(lines[i], MARGIN + 28, y);
      y += 14;
    }
  }

  function renderQuestion(q: BagrutQuestion, qNum: number) {
    const promptWrapped = doc.splitTextToSize(`${qNum}.  ${q.prompt}`, CONTENT_WIDTH - 28);
    const ptsLabel = `(${q.points} pts)`;

    ensureRoom(promptWrapped.length * 14 + (q.type === 'mc' ? 60 : q.type === 'writing' ? spec.writingLines * 14 + 40 : 50));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(promptWrapped, MARGIN, y);
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(ptsLabel, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    y += promptWrapped.length * 14 + 2;

    if (q.type === 'mc' && q.options) {
      for (const opt of q.options) {
        ensureRoom(14);
        const text = `(${opt.letter})  ${opt.text}`;
        const wrapped = doc.splitTextToSize(text, CONTENT_WIDTH - 40);
        doc.text(wrapped, MARGIN + 24, y);
        y += wrapped.length * 14;
      }
      y += 8;
    } else if (q.type === 'short') {
      // 3 ruled blank lines.
      for (let i = 0; i < 3; i++) {
        ensureRoom(18);
        y += 14;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(MARGIN + 12, y, PAGE_WIDTH - MARGIN, y);
      }
      y += 12;
    } else if (q.type === 'writing') {
      if (q.bullets && q.bullets.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.text('Your writing should include:', MARGIN + 6, y);
        y += 14;
        for (const bullet of q.bullets) {
          ensureRoom(14);
          const wrapped = doc.splitTextToSize(`•  ${bullet}`, CONTENT_WIDTH - 36);
          doc.text(wrapped, MARGIN + 18, y);
          y += wrapped.length * 12;
        }
        y += 6;
      }
      if (q.word_count_min && q.word_count_max) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(110, 110, 110);
        doc.text(`Write ${q.word_count_min}–${q.word_count_max} words.`, MARGIN + 6, y);
        y += 14;
      }
      // Ruled writing box.
      const linesNeeded = spec.writingLines;
      ensureRoom(linesNeeded * 16 + 20);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.rect(MARGIN, y, CONTENT_WIDTH, linesNeeded * 16);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      for (let i = 1; i < linesNeeded; i++) {
        const ly = y + i * 16;
        doc.line(MARGIN + 4, ly, MARGIN + CONTENT_WIDTH - 4, ly);
      }
      y += linesNeeded * 16 + 12;
    }
  }
}

function safeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'bagrut-test';
}
