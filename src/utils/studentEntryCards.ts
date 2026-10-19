import qrcode from 'qrcode-generator';
import type { Language } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';
import { buildClassJoinUrl } from './classJoin';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/** Cut-out cards: each child receives their own card, not the class's PIN list. */
export function renderStudentEntryCards({
  className,
  classCode,
  language,
  students,
}: {
  className: string;
  classCode: string;
  language: Language;
  students: { id: string; displayName: string; pin: string | null }[];
}): string {
  const t = classEntryT[language];
  const cards = students
    .filter((s) => s.pin)
    .map((s) => {
      const url = buildClassJoinUrl(classCode, {
        origin: 'https://vocaband.com',
        className,
        studentId: s.id,
      });
      const qr = qrcode(0, 'M');
      // The PIN is printed separately. Scanning pre-selects a profile but
      // never signs a child in or embeds a credential in browser history.
      qr.addData(url);
      qr.make();
      return `<section class="card">
      <div class="identity"><p class="brand">Vocaband · ${escapeHtml(className)}</p><h2>${escapeHtml(s.displayName)}</h2>
      <p class="label">${escapeHtml(t.pinLabel)}</p><p class="pin" dir="ltr">${escapeHtml(s.pin!)}</p></div>
      <div class="qr">${qr.createSvgTag({ scalable: true, margin: 4 })}</div>
      <p class="instructions">${escapeHtml(t.cardInstructions)}</p>
      <a href="${escapeHtml(url)}" dir="ltr">vocaband.com/student</a><p class="class-code" dir="ltr">${escapeHtml(classCode)}</p>
    </section>`;
    })
    .join('');
  return `<!doctype html><html lang="${language}" dir="${language === 'en' ? 'ltr' : 'rtl'}"><head><meta charset="utf-8">
    <title>${escapeHtml(t.printCards)} · ${escapeHtml(className)}</title><style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; color: #172033; background: white; }
      h1 { font-size: 20px; margin: 0 0 12px; }
      .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card { border: 1px dashed #7c879a; border-radius: 12px; padding: 14px; display: grid; grid-template-columns: 1fr 96px; column-gap: 10px; break-inside: avoid; }
      .brand { margin: 0; color: #5b21b6; font-weight: 700; overflow-wrap: anywhere; }
      h2 { margin: 3px 0 8px; font-size: 21px; overflow-wrap: anywhere; }
      .label { font-size: 13px; margin: 0; }
      .pin { font: 800 24px/1.4 ui-monospace, Menlo, monospace; letter-spacing: .14em; margin: 4px 0; text-align: start; }
      .qr { align-self: start; padding: 2px; background: white; } .qr svg { display: block; width: 92px; height: 92px; }
      .instructions { grid-column: 1 / -1; font-size: 13px; margin: 8px 0; }
      a { font-size: 12px; color: #172033; } .class-code { margin: 0; text-align: end; font-family: monospace; }
      @media print { .card { break-inside: avoid; } }
    </style></head><body><h1>${escapeHtml(t.printCards)} · ${escapeHtml(className)}</h1><div class="cards">${cards}</div></body></html>`;
}
