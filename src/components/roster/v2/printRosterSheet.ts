/**
 * printRosterSheet — opens a print-ready window listing each student's
 * label (name OR anonymous code) next to their PIN.
 *
 * Extracted from RosterModalV2.handlePrint so both the teacher roster
 * modal and the admin school-seed handoff render an identical sheet.
 * No dependencies: a styled HTML document + window.print().
 *
 * Returns false when the pop-up was blocked so the caller can surface
 * the right error string.
 */
export interface PrintRow {
  /** The visible label — a name, or a structured code like "07-5-2-14". */
  label: string;
  pin: string;
}

export interface PrintRosterOptions {
  title: string;
  classCode: string;
  rows: PrintRow[];
  dir: "rtl" | "ltr";
  language: string;
  labels: {
    /** Header above the label column (e.g. "Name" or "Student code"). */
    labelHeader: string;
    pinHeader: string;
    classCodeLabel: string;
    instructions: string;
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printRosterSheet(opts: PrintRosterOptions): boolean {
  const { title, classCode, rows, dir, language, labels } = opts;
  const align = dir === "rtl" ? "right" : "left";

  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td class="pin">${escapeHtml(r.pin)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="${language}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #1c1917; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .meta { color: #57534e; font-size: 13px; margin-bottom: 16px; }
      .code { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: ${align}; }
      th { background: #fafaf9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #57534e; }
      td.pin { font-family: ui-monospace, Menlo, monospace; font-weight: 700; letter-spacing: 0.1em; font-size: 15px; }
      .footer { margin-top: 18px; color: #78716c; font-size: 11px; }
      @media print { body { margin: 16mm; } }
    </style>
  </head><body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(labels.classCodeLabel)}: <span class="code">${escapeHtml(classCode)}</span></p>
    <table>
      <thead><tr><th>${escapeHtml(labels.labelHeader)}</th><th>${escapeHtml(labels.pinHeader)}</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p class="footer">${escapeHtml(labels.instructions)}</p>
    <script>setTimeout(() => window.print(), 50);</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
