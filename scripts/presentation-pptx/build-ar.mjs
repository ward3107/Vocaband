// Build the Arabic 7-slide pitch deck as a fully-editable .pptx.
//
// Mirrors the content of scripts/presentation-pdf/ar.html — same 7-section
// flow (cover → numbers → students → teachers → security → roadmap → CTA).
// Designed for 16:9 projector use at school visits, with RTL Arabic text
// and the same teal/violet/fuchsia brand palette as the PDF.
//
// Run:  node scripts/presentation-pptx/build-ar.mjs
// Out:  dist-presentation/Vocaband-Presentation-AR.pptx

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pptxgen from '/tmp/node_modules/pptxgenjs/dist/pptxgen.cjs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'dist-presentation');
fs.mkdirSync(outDir, { recursive: true });

// Brand palette (no `#` prefix — pptxgenjs convention).
const C = {
  teal:    '0d9488',
  tealD:   '0f766e',
  indigo:  '4f46e5',
  violet:  '7c3aed',
  fuchsia: 'c026d3',
  pink:    'db2777',
  rose:    'e11d48',
  amber:   'd97706',
  emerald: '059669',
  ink:     '1f1147',
  muted:   '5b5780',
  white:   'FFFFFF',
  // surface tints
  tealBg:  'F0FDFA',
  tealBd:  'CCFBF1',
  amberBg: 'FFFBEB',
  amberBd: 'FDE68A',
  emerBg:  'ECFDF5',
  emerBd:  'A7F3D0',
  roseBg:  'FFF1F2',
  roseBd:  'FBCFE8',
  indiBg:  'EEF2FF',
  indiBd:  'C7D2FE',
  fuchBg:  'FDF4FF',
  fuchBd:  'F5D0FE',
  // dark gradient stops for the cover
  coverA:  '042F2E',
  coverB:  '0D9488',
  coverC:  '4F46E5',
  coverD:  'C026D3',
};

const FONT = 'Arial'; // Universally available + good Arabic shaping in PowerPoint
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
pres.rtlMode = true;
pres.title = 'Vocaband — عرض تقديمي للمدارس';
pres.author = 'Vocaband';
pres.company = 'Vocaband';
pres.subject = 'School pitch deck (Arabic)';

// ---------- helpers ----------
const tx = (slide, text, opts) =>
  slide.addText(text, {
    fontFace: FONT,
    color: C.ink,
    align: 'right',
    rtlMode: true,
    ...opts,
  });

const card = (slide, x, y, w, h, fillBg, fillBd) => {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: fillBg },
    line: { color: fillBd, width: 0.75 },
    rectRadius: 0.18,
  });
};

const headerBar = (slide, pageNum) => {
  // Brand wordmark left, page number right (in RTL these visually swap).
  tx(slide, 'Vocaband', {
    x: 0.5, y: 0.28, w: 3, h: 0.45,
    fontSize: 18, bold: true, color: C.teal, align: 'left', rtlMode: false,
  });
  tx(slide, pageNum + ' / 07', {
    x: SLIDE_W - 3.5, y: 0.32, w: 3, h: 0.4,
    fontSize: 12, bold: true, color: C.muted, align: 'right', rtlMode: false, charSpacing: 2,
  });
  // Underline
  slide.addShape('rect', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.025,
    fill: { color: C.tealBd }, line: { color: C.tealBd, width: 0 },
  });
};

const eyebrow = (slide, text, x, y) =>
  tx(slide, text, {
    x, y, w: SLIDE_W - x - 0.5, h: 0.35,
    fontSize: 13, bold: true, color: C.teal, charSpacing: 3,
  });

const heading = (slide, runs, x, y, w) =>
  slide.addText(runs.map(r => ({
    text: r.t,
    options: { color: r.accent ? C.fuchsia : C.ink, bold: true, fontFace: FONT, fontSize: 36 },
  })), { x, y, w, h: 0.95, align: 'right', rtlMode: true, valign: 'top' });

const footer = (slide) => {
  tx(slide, 'Vocaband — مفردات مصمّمة لصفوف المدارس في إسرائيل', {
    x: 0.5, y: SLIDE_H - 0.45, w: SLIDE_W - 1, h: 0.3,
    fontSize: 10, color: C.muted, align: 'center', italic: false,
  });
};

const bulletDot = (slide, x, y) =>
  slide.addShape('ellipse', {
    x, y, w: 0.13, h: 0.13,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 },
  });

const bulletList = (slide, items, x, y, w, fontSize = 14, lineGap = 0.08) => {
  let cy = y;
  for (const item of items) {
    bulletDot(slide, x + w - 0.18, cy + 0.07);
    tx(slide, item, {
      x, y: cy, w: w - 0.3, h: 0.45,
      fontSize, bold: false, color: C.ink, valign: 'top',
    });
    cy += 0.42 + lineGap;
  }
};

// ============== SLIDE 1 — COVER ==============
{
  const s = pres.addSlide();
  s.background = { color: C.coverA };

  // Layered gradient-feel: solid fill + 3 large translucent shapes
  s.addShape('rect', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, fill: { color: C.coverA }, line: { color: C.coverA, width: 0 } });
  s.addShape('ellipse', {
    x: -3, y: 4, w: 11, h: 11,
    fill: { color: C.coverB, transparency: 65 },
    line: { color: C.coverB, width: 0 },
  });
  s.addShape('ellipse', {
    x: 5, y: -4, w: 12, h: 12,
    fill: { color: C.coverC, transparency: 60 },
    line: { color: C.coverC, width: 0 },
  });
  s.addShape('ellipse', {
    x: 8, y: 3, w: 9, h: 9,
    fill: { color: C.coverD, transparency: 70 },
    line: { color: C.coverD, width: 0 },
  });

  // VOCABAND chip top-left
  s.addShape('roundRect', {
    x: 0.6, y: 0.55, w: 1.7, h: 0.55,
    fill: { color: C.white, transparency: 80 },
    line: { color: C.white, width: 0.75 },
    rectRadius: 0.14,
  });
  tx(s, 'VOCABAND', {
    x: 0.6, y: 0.6, w: 1.7, h: 0.45,
    fontSize: 16, bold: true, color: C.white, align: 'center', charSpacing: 2, rtlMode: false,
  });

  // Date tag top-right (visually left in RTL)
  tx(s, '2026 • النسخة العربية', {
    x: SLIDE_W - 4.5, y: 0.65, w: 3.9, h: 0.4,
    fontSize: 14, color: C.white, align: 'right',
  });

  // Big "Vocaband" title
  tx(s, 'Vocaband', {
    x: 0.6, y: 1.5, w: SLIDE_W - 1.2, h: 2.2,
    fontSize: 110, bold: true, color: C.white, align: 'right', rtlMode: false,
  });

  // Strap (2 lines)
  tx(s, 'نسدّ فجوة المفردات. صفّاً تلو الآخر.', {
    x: 0.6, y: 3.7, w: SLIDE_W - 1.2, h: 0.8,
    fontSize: 30, bold: true, color: C.white, align: 'right',
  });

  // Subtitle
  tx(s, 'منصّة تعلّم للمدارس في البلاد — مبنيّة خصّيصاً لمعلّمي اللغة الإنجليزية، متوافقة مع منهاج وزارة المعارف، مع واجهة وترجمة بالإنجليزية والعربية والعبرية.', {
    x: 0.6, y: 4.65, w: SLIDE_W - 1.2, h: 1.3,
    fontSize: 16, color: C.white, align: 'right',
  });

  // Pills
  const pills = ['6,482 مفردة', '15 نمط لعب', 'WCAG 2.0 AA', 'GDPR + التعديل 13'];
  let px = SLIDE_W - 0.6;
  const pillH = 0.5;
  const pillY = 6.05;
  for (const label of pills) {
    const charW = label.length * 0.13 + 0.5;
    const pw = Math.max(1.5, charW);
    px -= pw;
    s.addShape('roundRect', {
      x: px, y: pillY, w: pw, h: pillH,
      fill: { color: C.white, transparency: 82 },
      line: { color: C.white, width: 0.75 },
      rectRadius: 0.25,
    });
    tx(s, label, {
      x: px, y: pillY + 0.05, w: pw, h: pillH - 0.05,
      fontSize: 13, bold: true, color: C.white, align: 'center',
    });
    px -= 0.18;
  }

  // Footer info
  tx(s, 'www.vocaband.com', {
    x: 0.6, y: SLIDE_H - 0.65, w: 4, h: 0.4,
    fontSize: 14, bold: true, color: C.white, align: 'left', rtlMode: false,
  });
  tx(s, 'عرض المدرسة • 5–7 دقائق', {
    x: SLIDE_W - 4.6, y: SLIDE_H - 0.65, w: 4, h: 0.4,
    fontSize: 14, color: C.white, align: 'right',
  });
}

// ============== SLIDE 2 — NUMBERS + PROBLEM ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '02');
  eyebrow(s, 'الأرقام خلف المنتج', 0.5, 1.0);
  heading(s, [
    { t: 'ليس مجرّد تطبيق — ' },
    { t: 'منظومة تعليميّة كاملة', accent: true },
  ], 0.5, 1.4, SLIDE_W - 1);

  // 4 stat cards in a row
  const stats = [
    { num: '6,482', label: 'مفردة من منهاج وزارة المعارف', sub: 'Set 1 (4,365) • Set 2 (789) • Set 3 (1,328)', bg: C.tealBg, bd: C.tealBd, color: C.teal },
    { num: '15',    label: 'نمط لعب وتمرين',                 sub: 'تنوّع يقتل الملل — على نفس قائمة المفردات', bg: C.amberBg, bd: C.amberBd, color: C.amber },
    { num: '3',     label: 'لغات للواجهة والترجمة',           sub: 'الإنجليزية • العربية • العبرية',          bg: C.emerBg, bd: C.emerBd, color: C.emerald },
    { num: '100%',  label: 'امتثال WCAG 2.0 AA',              sub: 'جميع المعايير الـ 38 — متاح لكل طالب',     bg: C.roseBg, bd: C.roseBd, color: C.rose },
  ];
  const cw = (SLIDE_W - 1 - 3 * 0.2) / 4;
  const cy = 2.55;
  let cx = SLIDE_W - 0.5 - cw;
  for (const st of stats) {
    card(s, cx, cy, cw, 1.7, st.bg, st.bd);
    tx(s, st.num, {
      x: cx + 0.2, y: cy + 0.1, w: cw - 0.4, h: 0.7,
      fontSize: 40, bold: true, color: st.color, align: 'right', rtlMode: false,
    });
    tx(s, st.label, {
      x: cx + 0.2, y: cy + 0.85, w: cw - 0.4, h: 0.4,
      fontSize: 13, bold: true, color: C.ink, align: 'right',
    });
    tx(s, st.sub, {
      x: cx + 0.2, y: cy + 1.25, w: cw - 0.4, h: 0.4,
      fontSize: 10, color: C.muted, align: 'right',
    });
    cx -= cw + 0.2;
  }

  // Problem card
  card(s, 0.5, 4.55, SLIDE_W - 1, 2.4, C.roseBg, C.roseBd);
  tx(s, '⚠️  المشكلة — لن تَزول من تلقاء نفسها', {
    x: 0.7, y: 4.7, w: SLIDE_W - 1.4, h: 0.5,
    fontSize: 18, bold: true, color: C.ink, align: 'right',
  });
  bulletList(s, [
    'طلّاب الصفّ التاسع يُنهون السنة برصيد مفردات بمستوى الصفّ السادس.',
    'فروق ضخمة داخل الصفّ الواحد — بعضهم يقرأ بطلاقة وآخرون يتعثّرون في الأحرف.',
    'لا يملك المعلّم/ة وقتاً كافياً لتقديم تمرين فرديّ لـ 30 طالباً في الحصّة ذاتها.',
    'الواجبات البيتيّة في المفردات تَضيع بين الأوراق — لا أحد يتابعها أو يصحّحها.',
  ], 0.7, 5.3, SLIDE_W - 1.4, 13, 0.05);

  footer(s);
}

// ============== SLIDE 3 — FOR STUDENTS ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '03');
  eyebrow(s, 'للطالب', 0.5, 1.0);
  heading(s, [
    { t: 'تمرينٌ ' },
    { t: 'يرغبون', accent: true },
    { t: ' في القيام به' },
  ], 0.5, 1.4, SLIDE_W - 1);

  tx(s, '15 نمط لعب مختلف على نفس قائمة المفردات. الطالب لا يَملّ، والمعلّم لا يُكرّر نفسه.', {
    x: 0.5, y: 2.45, w: SLIDE_W - 1, h: 0.5,
    fontSize: 14, color: C.ink, align: 'right',
  });

  // 15 mode pills in 5 columns x 3 rows
  const modes = [
    ['🎴', 'بطاقات تعليميّة'], ['⚡', 'اختيار من متعدّد'], ['📝', 'اِملأ الفراغ'], ['🎧', 'الاستماع'], ['🔤', 'التهجئة'],
    ['🃏', 'المطابقة'], ['🧠', 'لعبة الذاكرة'], ['✔️', 'صواب / خطأ'], ['🔀', 'خَلط الحروف'], ['↩️', 'الترجمة المعكوسة'],
    ['🔠', 'أصوات الحروف'], ['📚', 'بناء الجملة'], ['🔗', 'سلاسل الكلمات'], ['💬', 'التعابير'], ['⏱️', 'الجولة السريعة'],
  ];
  const cols = 5, rows = 3;
  const pw = (SLIDE_W - 1 - (cols - 1) * 0.18) / cols;
  const ph = 0.85;
  const startY = 3.05;
  for (let i = 0; i < modes.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = SLIDE_W - 0.5 - (c + 1) * pw - c * 0.18;
    const y = startY + r * (ph + 0.15);
    s.addShape('roundRect', {
      x, y, w: pw, h: ph,
      fill: { color: C.white }, line: { color: '99F6E4', width: 0.75 },
      rectRadius: 0.15,
    });
    tx(s, modes[i][0], {
      x, y: y + 0.05, w: pw, h: 0.4,
      fontSize: 18, color: C.ink, align: 'center',
    });
    tx(s, modes[i][1], {
      x, y: y + 0.45, w: pw, h: 0.35,
      fontSize: 11, bold: true, color: C.ink, align: 'center',
    });
  }

  // Motivation card
  card(s, 0.5, 6.0, SLIDE_W - 1, 1.0, C.indiBg, C.indiBd);
  tx(s, '🎮  نظام دافعيّة حقيقي — وليس مجرّد نقاط', {
    x: 0.7, y: 6.1, w: SLIDE_W - 1.4, h: 0.4,
    fontSize: 14, bold: true, color: C.ink, align: 'right',
  });
  tx(s, '30 شخصيّة • 11 سمة ألوان • حيوان أليف يتطوّر عبر 8 مراحل • 4 رحلات تقدّم • 8 رتب وألقاب • سلاسل أيّام يوميّة • مضاعفات XP', {
    x: 0.7, y: 6.5, w: SLIDE_W - 1.4, h: 0.45,
    fontSize: 11, color: C.ink, align: 'right',
  });

  footer(s);
}

// ============== SLIDE 4 — FOR TEACHERS ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '04');
  eyebrow(s, 'للمعلّم/ة', 0.5, 1.0);
  heading(s, [
    { t: 'عملٌ أقل. ' },
    { t: 'تدريسٌ أكثر.', accent: true },
  ], 0.5, 1.4, SLIDE_W - 1);

  // "New in 2026" 8-tile grid (4 cols x 2 rows)
  card(s, 0.5, 2.5, SLIDE_W - 1, 2.7, C.fuchBg, C.fuchBd);
  tx(s, '✨  جديد في 2026 — ميّزات أطلقناها هذا العام', {
    x: 0.7, y: 2.6, w: SLIDE_W - 1.4, h: 0.45,
    fontSize: 16, bold: true, color: C.ink, align: 'right',
  });
  const newItems = [
    ['📸', 'كاميرا OCR لأوراق العمل', 'صوّروا الورقة، التطبيق يستخرج الكلمات تلقائيّاً.'],
    ['📊', 'لوحة نتائج الواجبات', 'أرسلوا واجباً برمز QR، وشاهدوا الإجابات مباشرة.'],
    ['✍️', 'جمل بالذكاء الاصطناعيّ', 'الذكاء الاصطناعي يُنتج جُمل اِملأ الفراغ لكل مفردة.'],
    ['🔁', 'المراجعة الذكيّة', 'التطبيق يُعيد للطالب المفردات المنسيّة في الوقت المناسب.'],
    ['⏱️', 'دقيقة الصفّ اليوميّة', 'تمرين خاطف 60 ثانية يُفعَّل ببداية الحصّة.'],
    ['🎲', 'Hot Seat — جهاز واحد', 'هاتف واحد يدور بين الطلّاب — للصفوف بلا أجهزة.'],
    ['🏆', 'شهادات PDF قابلة للطباعة', 'شهادة فرديّة لكل طالب — كم كلمة أتقن.'],
    ['💬', 'مشاركة الواجب عبر واتساب', 'زرّ مباشر يُرسل الرابط إلى أولياء الأمور.'],
  ];
  const ncols = 4;
  const nw = (SLIDE_W - 1 - 0.4 - (ncols - 1) * 0.15) / ncols;
  const nh = 1.0;
  for (let i = 0; i < newItems.length; i++) {
    const r = Math.floor(i / ncols);
    const c = i % ncols;
    const x = SLIDE_W - 0.7 - (c + 1) * nw - c * 0.15;
    const y = 3.15 + r * (nh + 0.1);
    s.addShape('roundRect', {
      x, y, w: nw, h: nh,
      fill: { color: C.white }, line: { color: C.fuchBd, width: 0.75 },
      rectRadius: 0.12,
    });
    tx(s, newItems[i][0], {
      x: x + nw - 0.5, y: y + 0.07, w: 0.4, h: 0.4,
      fontSize: 18, color: C.ink, align: 'right',
    });
    tx(s, newItems[i][1], {
      x: x + 0.1, y: y + 0.08, w: nw - 0.55, h: 0.35,
      fontSize: 11, bold: true, color: C.ink, align: 'right',
    });
    tx(s, newItems[i][2], {
      x: x + 0.1, y: y + 0.45, w: nw - 0.2, h: 0.55,
      fontSize: 9, color: C.muted, align: 'right',
    });
  }

  // Daily routine — short list (4 bullets to save space)
  card(s, 0.5, 5.4, SLIDE_W - 1, 1.05, C.tealBg, C.tealBd);
  tx(s, '⚡  روتين المعلّم اليوميّ — ما الذي يُنجزه التطبيق بدلاً منكم', {
    x: 0.7, y: 5.48, w: SLIDE_W - 1.4, h: 0.4,
    fontSize: 13, bold: true, color: C.ink, align: 'right',
  });
  tx(s, 'إنشاء صفّ في أقلّ من دقيقة • تصحيح آليّ للواجبات • Quick Play بـ QR • تحدٍّ حيّ على الشاشة • تقارير تقدّم لكلّ طالب', {
    x: 0.7, y: 5.88, w: SLIDE_W - 1.4, h: 0.5,
    fontSize: 11, color: C.ink, align: 'right',
  });

  // Quote
  card(s, 0.5, 6.6, SLIDE_W - 1, 0.6, C.white, C.fuchsia);
  tx(s, '"بدلاً من تصحيح 30 دفتراً في المساء — أرى في 10 ثوانٍ من يحتاج المساعدة ومن جاهز للامتحان."', {
    x: 0.7, y: 6.65, w: SLIDE_W - 1.4, h: 0.5,
    fontSize: 12, italic: true, bold: true, color: C.ink, align: 'right',
  });

  footer(s);
}

// ============== SLIDE 5 — SECURITY ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '05');
  eyebrow(s, 'الأمان والامتثال', 0.5, 1.0);
  heading(s, [
    { t: 'أمان وخصوصيّة ' },
    { t: 'على مستوى المؤسّسات.', accent: true },
  ], 0.5, 1.4, SLIDE_W - 1);

  tx(s, 'كلّ سطر بياناتٍ يُولَد في Vocaband يخضع لمنظومة حماية مبنيّة منذ اليوم الأوّل — مستضافة في الاتحاد الأوروبيّ، مع اختبارات اختراق دوريّة وامتثال كامل للقانون الإسرائيليّ.', {
    x: 0.5, y: 2.45, w: SLIDE_W - 1, h: 0.7,
    fontSize: 13, color: C.ink, align: 'right',
  });

  // Two columns: security + reports
  const colW = (SLIDE_W - 1 - 0.3) / 2;
  // Security card (right)
  card(s, SLIDE_W - 0.5 - colW, 3.25, colW, 3.7, C.emerBg, C.emerBd);
  tx(s, '🔒  الأمان والخصوصيّة وإتاحة الوصول', {
    x: SLIDE_W - 0.5 - colW + 0.2, y: 3.35, w: colW - 0.4, h: 0.4,
    fontSize: 14, bold: true, color: C.ink, align: 'right',
  });
  bulletList(s, [
    'الاستضافة في أوروبا (فرانكفورت) — امتثال كامل لـ GDPR.',
    'قانون حماية الخصوصيّة الإسرائيليّ + التعديل 13 (2025).',
    'WCAG 2.0 AA — جميع المعايير الـ 38 (يشمل عُسر القراءة).',
    'تشفير TLS 1.2+ • تصنيف CSP A+ • Row-Level Security.',
    'سجلّ تدقيق (Audit Log) مع حفظٍ لمدّة سنتين.',
    'اختبارات اختراق دوريّة — بدون إعلانات أو بيع بيانات.',
  ], SLIDE_W - 0.5 - colW + 0.2, 3.85, colW - 0.4, 11, 0.04);

  // Reports card (left)
  card(s, 0.5, 3.25, colW, 3.7, C.indiBg, C.indiBd);
  tx(s, '📑  بيانات شفّافة للتقارير الرسميّة', {
    x: 0.7, y: 3.35, w: colW - 0.4, h: 0.4,
    fontSize: 14, bold: true, color: C.ink, align: 'right',
  });
  bulletList(s, [
    'أرقام تقدّم موضوعيّة — جاهزة للعرض على أولياء الأمور والمفتّشين.',
    'اكتشاف مبكر للطلّاب المعرّضين للتأخّر قبل وقتٍ طويل من الامتحانات القُطريّة (מיצ"ב / מפ"ה).',
    'تصدير لكل تقرير بصيغة PDF يمكن إرفاقها بملفّ الطالب.',
    'دون إعلانات. دون مشاركة بيانات مع طرف ثالث.',
  ], 0.7, 3.85, colW - 0.4, 11, 0.04);

  footer(s);
}

// ============== SLIDE 6 — ROADMAP ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '06');
  eyebrow(s, 'الخطوة التالية', 0.5, 1.0);
  heading(s, [
    { t: 'الإنجليزيّة اليوم. ' },
    { t: 'كلّ مادّة غداً.', accent: true },
  ], 0.5, 1.4, SLIDE_W - 1);

  tx(s, 'محرّك Vocaband مبنيّ على بنية تحتيّة تدعم أيّ مادّة تتطلّب الحفظ والاستيعاب. اليوم نفسه، التحليلات تُميّز بين المواد المختلفة داخل الصفّ الواحد.', {
    x: 0.5, y: 2.45, w: SLIDE_W - 1, h: 0.7,
    fontSize: 13, color: C.ink, align: 'right',
  });

  // 4 roadmap items in 2x2
  const road = [
    ['صيف 2026',  'AI Lesson Builder — درس كامل من موضوع واحد'],
    ['خريف 2026', 'العبريّة كلغة ثانية — للناطقين بالعربيّة'],
    ['خريف 2026', 'العربيّة — للناطقين بالعبريّة'],
    ['شتاء 2027', 'مفردات العلوم، التاريخ، والدراسات الدينيّة'],
  ];
  const rcols = 2;
  const rw = (SLIDE_W - 1 - 0.3) / rcols;
  const rh = 0.95;
  for (let i = 0; i < road.length; i++) {
    const r = Math.floor(i / rcols);
    const c = i % rcols;
    const x = SLIDE_W - 0.5 - (c + 1) * rw - c * 0.3;
    const y = 3.3 + r * (rh + 0.2);
    s.addShape('roundRect', {
      x, y, w: rw, h: rh,
      fill: { color: C.white }, line: { color: '5EEAD4', width: 1, dashType: 'dash' },
      rectRadius: 0.15,
    });
    tx(s, road[i][0], {
      x: x + 0.2, y: y + 0.1, w: rw - 0.4, h: 0.35,
      fontSize: 11, bold: true, color: C.fuchsia, align: 'right', charSpacing: 1,
    });
    tx(s, road[i][1], {
      x: x + 0.2, y: y + 0.45, w: rw - 0.4, h: 0.4,
      fontSize: 14, bold: true, color: C.ink, align: 'right',
    });
  }

  // AI Lesson Builder explanation
  card(s, 0.5, 5.5, SLIDE_W - 1, 1.5, C.indiBg, C.indiBd);
  tx(s, '🤖  AI Lesson Builder — ما هو؟', {
    x: 0.7, y: 5.6, w: SLIDE_W - 1.4, h: 0.4,
    fontSize: 14, bold: true, color: C.ink, align: 'right',
  });
  tx(s, 'يُدخل المعلّم/ة موضوعاً ("Renewable Energy")، فيُنتج النظام: قائمة مفردات مناسبة للمستوى ← نصّ قراءة ← أسئلة فَهم ← تمرين في كل أنماط اللعب. 15 دقيقة من التحضير تتحوّل إلى 30 ثانية.', {
    x: 0.7, y: 6.0, w: SLIDE_W - 1.4, h: 1.0,
    fontSize: 12, color: C.ink, align: 'right',
  });

  footer(s);
}

// ============== SLIDE 7 — CTA ==============
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  headerBar(s, '07');
  eyebrow(s, 'هيّا نبدأ', 0.5, 1.0);
  heading(s, [
    { t: 'ابدأوا اليوم. ' },
    { t: 'خلال 60 ثانية.', accent: true },
  ], 0.5, 1.4, SLIDE_W - 1);

  // 3 steps
  card(s, 0.5, 2.55, SLIDE_W - 1, 1.85, C.tealBg, C.tealBd);
  tx(s, '🚀  كيف نبدأ — 3 خطوات', {
    x: 0.7, y: 2.65, w: SLIDE_W - 1.4, h: 0.45,
    fontSize: 16, bold: true, color: C.ink, align: 'right',
  });
  bulletList(s, [
    'لقاء أوّل (15 دقيقة) — نختار معاً معلّماً/ةً واحدة وصفّاً واحداً.',
    'الإعداد (10 دقائق) — نُنشئ الصفّ معكم، ونرفع قائمة المفردات الأولى.',
    'الانطلاق داخل الصفّ — يبدأ المعلّم/ة العمل، ونحن إلى جانبكم لأيّ سؤال.',
  ], 0.7, 3.15, SLIDE_W - 1.4, 13, 0.06);

  // School requirements
  card(s, 0.5, 4.55, SLIDE_W - 1, 1.55, C.indiBg, C.indiBd);
  tx(s, '🏫  ماذا تحتاج المدرسة؟ الحدّ الأدنى فقط:', {
    x: 0.7, y: 4.65, w: SLIDE_W - 1.4, h: 0.4,
    fontSize: 14, bold: true, color: C.ink, align: 'right',
  });
  bulletList(s, [
    'اتّصال إنترنت عاديّ. لا حاجة إلى تنزيل أو تثبيت — التطبيق يعمل في المتصفّح.',
    'هاتف / لوحيّ / حاسوب لكلّ طالب (يعمل بشكل ممتاز حتّى في ثنائيّات).',
    '10 دقائق من المعلّم/ة لإنشاء الصفّ الأوّل. هذا كلّ ما يلزم.',
  ], 0.7, 5.05, SLIDE_W - 1.4, 11, 0.04);

  // CTA box (gradient-feel via solid teal with overlay)
  s.addShape('roundRect', {
    x: 0.5, y: 6.25, w: SLIDE_W - 1, h: 0.85,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 },
    rectRadius: 0.18,
  });
  s.addShape('roundRect', {
    x: 0.5, y: 6.25, w: SLIDE_W - 1, h: 0.85,
    fill: { color: C.fuchsia, transparency: 60 }, line: { color: C.fuchsia, width: 0 },
    rectRadius: 0.18,
  });
  tx(s, 'www.vocaband.com', {
    x: 0.7, y: 6.32, w: SLIDE_W - 1.4, h: 0.45,
    fontSize: 24, bold: true, color: C.white, align: 'center', rtlMode: false,
  });
  tx(s, 'افتحوا الموقع ← سجّلوا الدخول كمعلّم ← أنشئوا الصفّ ← خلال 60 ثانية تكونون جاهزين للحصّة الأولى.', {
    x: 0.7, y: 6.78, w: SLIDE_W - 1.4, h: 0.3,
    fontSize: 11, color: C.white, align: 'center',
  });
}

// ---------- WRITE ----------
const outPath = path.join(outDir, 'Vocaband-Presentation-AR.pptx');
await pres.writeFile({ fileName: outPath, compression: true });
const size = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`✓ Vocaband-Presentation-AR.pptx (${size} KB)`);
console.log(`  → ${outPath}`);
