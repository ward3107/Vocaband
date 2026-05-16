"""
Generate Vocaband sales collateral: two A4 handouts + one full presentation.

Outputs (Hebrew, RTL):
- docs/sales/teacher-handout-HE.pptx + .pdf       (A4 portrait, single page)
- docs/sales/manager-handout-HE.pptx + .pdf       (A4 portrait, single page)
- docs/sales/vocaband-presentation-HE.pptx + .pdf (16:9 deck)

Re-run after editing this file to regenerate everything:
    python3 scripts/build-sales-collateral.py
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Cm, Pt, Emu


def set_rtl(paragraph) -> None:
    """Mark a paragraph as RTL so Hebrew punctuation and digits land correctly."""
    pPr = paragraph._pPr
    if pPr is None:
        pPr = paragraph._p.get_or_add_pPr()
    pPr.set("rtl", "1")


ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "sales"
SHOTS = ROOT / "docs" / "screenshots"
HOMEPAGE = ROOT / "vocaband-homepage.png"

OUT_DIR.mkdir(parents=True, exist_ok=True)


# --- Brand palette (Vocaband: indigo -> violet -> fuchsia + amber accent) ---
INDIGO = RGBColor(0x4F, 0x46, 0xE5)
VIOLET = RGBColor(0x8B, 0x5C, 0xF6)
FUCHSIA = RGBColor(0xD9, 0x46, 0xEF)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
EMERALD = RGBColor(0x10, 0xB9, 0x81)
ROSE = RGBColor(0xF4, 0x3F, 0x5E)
INK = RGBColor(0x0F, 0x17, 0x2A)
SLATE = RGBColor(0x47, 0x55, 0x69)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
BG_SOFT = RGBColor(0xF8, 0xFA, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

HEBREW_FONT = "Noto Sans Hebrew"


# ---------- Low-level helpers ----------

def add_rect(slide, x, y, w, h, fill_color, line=False):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if not line:
        shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


def add_rounded(slide, x, y, w, h, fill_color, line=False):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if not line:
        shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


def add_text(
    slide,
    x,
    y,
    w,
    h,
    text,
    *,
    size=14,
    bold=False,
    color=INK,
    align=PP_ALIGN.RIGHT,
    anchor=MSO_ANCHOR.TOP,
    font=HEBREW_FONT,
    line_spacing=1.15,
):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Cm(0.1)
    tf.margin_right = Cm(0.1)
    tf.margin_top = Cm(0.05)
    tf.margin_bottom = Cm(0.05)
    tf.vertical_anchor = anchor

    lines = text.split("\n") if isinstance(text, str) else text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        if align == PP_ALIGN.RIGHT:
            set_rtl(p)
        run = p.add_run()
        run.text = line
        run.font.name = font
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
    return tb


def add_bullet_list(slide, x, y, w, h, items, *, size=12, color=INK, marker="•"):
    """Right-aligned RTL bullet list. Marker after text (RTL convention)."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Cm(0.1)
    tf.margin_right = Cm(0.1)

    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.RIGHT
        p.line_spacing = 1.4
        p.space_after = Pt(2)
        set_rtl(p)
        # RTL paragraph: bullet marker first in source -> visual right edge.
        run = p.add_run()
        run.text = f"{marker}  {item}"
        run.font.name = HEBREW_FONT
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return tb


def add_image(slide, x, y, w, h, path):
    return slide.shapes.add_picture(str(path), x, y, width=w, height=h)


# ---------- A4 portrait one-pager helpers ----------

def make_a4_portrait_prs() -> Presentation:
    prs = Presentation()
    # A4 portrait: 21.0 x 29.7 cm
    prs.slide_width = Cm(21.0)
    prs.slide_height = Cm(29.7)
    return prs


def handout_header(slide, title, subtitle, accent_color):
    # full-width hero strip
    add_rect(slide, 0, 0, Cm(21.0), Cm(4.2), accent_color)
    # logo / brand wordmark, right side (RTL)
    add_text(
        slide,
        Cm(0.8), Cm(0.6), Cm(19.4), Cm(0.9),
        "VOCABAND",
        size=14, bold=True, color=WHITE, align=PP_ALIGN.LEFT,
        font="DejaVu Sans",
    )
    # title
    add_text(
        slide,
        Cm(0.8), Cm(1.4), Cm(19.4), Cm(1.6),
        title,
        size=28, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
    )
    # subtitle
    add_text(
        slide,
        Cm(0.8), Cm(3.0), Cm(19.4), Cm(1.0),
        subtitle,
        size=14, bold=False, color=WHITE, align=PP_ALIGN.RIGHT,
    )


def handout_section(slide, y_cm, label, label_color, body_lines, *, bullets=True):
    """Section with a coloured pill label on the right + body below."""
    # pill label
    label_w = Cm(5.0)
    pill = add_rounded(
        slide,
        Cm(21.0 - 0.8 - 5.0), Cm(y_cm),
        label_w, Cm(0.85),
        label_color,
    )
    tf = pill.text_frame
    tf.margin_left = Cm(0.1)
    tf.margin_right = Cm(0.1)
    tf.margin_top = Cm(0.05)
    tf.margin_bottom = Cm(0.05)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    set_rtl(p)
    run = p.add_run()
    run.text = label
    run.font.name = HEBREW_FONT
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = WHITE

    body_y = y_cm + 1.05
    if bullets:
        add_bullet_list(
            slide,
            Cm(0.8), Cm(body_y), Cm(19.4), Cm(6.0),
            body_lines,
            size=12,
            color=INK,
        )
    else:
        add_text(
            slide,
            Cm(0.8), Cm(body_y), Cm(19.4), Cm(4.0),
            "\n".join(body_lines),
            size=12, color=INK, align=PP_ALIGN.RIGHT,
        )


def handout_footer(slide, text, color):
    add_rect(slide, 0, Cm(27.5), Cm(21.0), Cm(2.2), color)
    add_text(
        slide,
        Cm(0.8), Cm(27.85), Cm(19.4), Cm(1.5),
        text,
        size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )


# ---------- Handout: Teacher ----------

def build_teacher_handout():
    prs = make_a4_portrait_prs()
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)

    # white background
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, WHITE)

    handout_header(
        slide,
        title="אנגלית שתלמידים רוצים לעשות",
        subtitle="Vocaband — כלי דיגיטלי למורי אנגלית, מותאם לכיתה הישראלית",
        accent_color=INDIGO,
    )

    handout_section(
        slide, y_cm=4.8,
        label="הבעיה",
        label_color=ROSE,
        body_lines=[
            "תלמידים שוכחים מילים באותו קצב שלומדים אותן",
            "פערים גדולים בכיתה אחת — שיעור אחד לא מתאים לכל התלמידים",
            "אין למורה זמן לתת תרגול אישי ל-30 תלמידים בו זמנית",
            "אחרי שנים של שיבושים — הפערים רק התרחבו",
        ],
    )

    handout_section(
        slide, y_cm=10.6,
        label="על מה זה בנוי",
        label_color=VIOLET,
        body_lines=[
            "מדע הלמידה: חזרה מרווחת + גיוון בתרגול",
            "עיצוב משחקי: מוטיבציה פנימית במקום כפיה",
            "מציאות הכיתה: אוטומציה למורה, אנרגיה לתלמיד",
        ],
    )

    handout_section(
        slide, y_cm=15.1,
        label="מה את/ה מקבל/ת",
        label_color=INDIGO,
        body_lines=[
            "בניית מטלות בדקה — לבחור מילים מוכנות או להעלות רשימה משלך",
            "צילום של רשימת מילים מהספר → המערכת מזהה ומתרגמת אוטומטית",
            "בדיקה אוטומטית של תרגילים עם משוב מיידי לתלמיד",
            "דוחות התקדמות לכל תלמיד — מי מתקשה, מי משתעמם, מי מתקדם",
            "Live Challenge — תחרות בזמן אמת על המסך הגדול בכיתה",
            "Quick Play — פעילות כיתתית מהירה עם QR, ללא הרשמה",
            "הקראה ותרגום לעברית ולערבית — בכל מילה, אוטומטית",
        ],
    )

    handout_section(
        slide, y_cm=23.2,
        label="התלמיד יקבל",
        label_color=AMBER,
        body_lines=[
            "15 משחקים שונים על אותן מילים — בלי שעמום",
            "נקודות, רצפים יומיים, אווטרים, חיות מחמד, תארים",
            "תחרויות כיתתיות חיות — חוויה שמדברים עליה בהפסקה",
        ],
    )

    handout_footer(
        slide,
        "ניסיון חינם לכיתה אחת, חודש שלם, ללא התחייבות — אנחנו מקימים את הכיתה איתך",
        INK,
    )

    out = OUT_DIR / "teacher-handout-HE.pptx"
    prs.save(out)
    return out


# ---------- Handout: Manager ----------

def build_manager_handout():
    prs = make_a4_portrait_prs()
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)

    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, WHITE)

    handout_header(
        slide,
        title="שליטה, בקרה, בטיחות",
        subtitle="Vocaband — פלטפורמה ברמת בית ספר, עם נתונים אובייקטיביים",
        accent_color=VIOLET,
    )

    handout_section(
        slide, y_cm=4.8,
        label="הבעיה",
        label_color=ROSE,
        body_lines=[
            "פערי שפה גדולים מאי-פעם בקרב תלמידים בישראל",
            "אין דרך לאתר תלמידים בסיכון לפני שמאוחר",
            "המורים עמוסים — אין נתונים אובייקטיביים על מה קורה בכיתה",
            "הורים ופיקוח דורשים שקיפות — בלי כלי, אין מה להראות",
        ],
    )

    handout_section(
        slide, y_cm=10.6,
        label="על מה זה בנוי",
        label_color=VIOLET,
        body_lines=[
            "אותם עקרונות: מדע למידה, גימיפיקציה, אוטומציה למורה",
            "פותח מאפס לבתי ספר בישראל — לא תרגום של מוצר זר",
            "ארכיטקטורת בטיחות מובנית מהיום הראשון — לא טלאי בדיעבד",
        ],
    )

    handout_section(
        slide, y_cm=15.1,
        label="מה את/ה מקבל/ת",
        label_color=INDIGO,
        body_lines=[
            "לוח בקרה אחד לכל הכיתות בבית הספר",
            "נתונים אובייקטיביים: התקדמות, התמדה, אחוזי דיוק",
            "זיהוי מוקדם של תלמידים בסיכון — לפני שמגיעים למבחנים",
            "דוחות מוכנים להורים ולפיקוח — פנים אחת לכל בית הספר",
            "אחסון באירופה (פרנקפורט) — תאימות GDPR + חוק הגנת הפרטיות",
            "ללא פרסומות, ללא מכירת נתונים, ללא רכישות בתוך האפליקציה",
            "נבדק באופן שוטף בבדיקות חדירה (Penetration Tests)",
        ],
    )

    handout_section(
        slide, y_cm=23.2,
        label="צופה פני עתיד",
        label_color=EMERALD,
        body_lines=[
            "פלטפורמה אחת — לכל מקצוע שדורש שינון",
            "המנוע מותאם להרחבה לעברית, ערבית, מדעים, היסטוריה ועוד",
            "השקעה בכלי אחד שצומח עם בית הספר",
        ],
    )

    handout_footer(
        slide,
        "פיילוט ללא התחייבות — כיתה אחת, חודש שלם, אנחנו עוזרים בהקמה",
        INK,
    )

    out = OUT_DIR / "manager-handout-HE.pptx"
    prs.save(out)
    return out


# ---------- Full presentation (16:9) ----------

def make_widescreen_prs() -> Presentation:
    prs = Presentation()
    # 16:9 widescreen: 33.867 cm x 19.05 cm
    prs.slide_width = Cm(33.867)
    prs.slide_height = Cm(19.05)
    return prs


def slide_blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def deck_background(slide, prs):
    add_rect(slide, 0, 0, prs.slide_width, prs.slide_height, WHITE)


def deck_side_strip(slide, prs, color):
    # narrow vertical brand strip on the right edge (RTL)
    add_rect(slide, prs.slide_width - Cm(0.5), 0, Cm(0.5), prs.slide_height, color)


def deck_page_chrome(slide, prs, page_num, total, section_label, color):
    # bottom thin bar
    add_rect(slide, 0, prs.slide_height - Cm(0.6), prs.slide_width, Cm(0.6), BG_SOFT)
    # section label (right)
    add_text(
        slide,
        Cm(0.8), prs.slide_height - Cm(0.55), Cm(20.0), Cm(0.5),
        section_label,
        size=10, bold=True, color=color, align=PP_ALIGN.RIGHT,
    )
    # page number (left)
    add_text(
        slide,
        Cm(24.0), prs.slide_height - Cm(0.55), Cm(8.5), Cm(0.5),
        f"{page_num} / {total}",
        size=10, color=MUTED, align=PP_ALIGN.LEFT,
        font="DejaVu Sans",
    )
    # wordmark top-left
    add_text(
        slide,
        Cm(0.8), Cm(0.4), Cm(8.0), Cm(0.6),
        "VOCABAND",
        size=11, bold=True, color=color, align=PP_ALIGN.LEFT,
        font="DejaVu Sans",
    )


def deck_title(slide, prs, eyebrow, title, color):
    add_text(
        slide,
        Cm(0.8), Cm(1.4), Cm(32.0), Cm(0.8),
        eyebrow,
        size=12, bold=True, color=color, align=PP_ALIGN.RIGHT,
    )
    add_text(
        slide,
        Cm(0.8), Cm(2.1), Cm(32.0), Cm(2.0),
        title,
        size=34, bold=True, color=INK, align=PP_ALIGN.RIGHT,
    )


# ---------- Individual slides ----------

def slide_title_page(prs):
    s = slide_blank(prs)
    # full bleed gradient (approximated with stacked rects)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, INDIGO)
    add_rect(s, Cm(11.3), 0, Cm(11.3), prs.slide_height, VIOLET)
    add_rect(s, Cm(22.6), 0, Cm(11.3), prs.slide_height, FUCHSIA)

    add_text(
        s,
        Cm(0.8), Cm(0.8), Cm(32.0), Cm(0.8),
        "VOCABAND",
        size=16, bold=True, color=WHITE, align=PP_ALIGN.LEFT,
        font="DejaVu Sans",
    )

    add_text(
        s,
        Cm(1.5), Cm(6.5), Cm(31.0), Cm(2.2),
        "האפליקציה שתלמידים רוצים לפתוח",
        size=44, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
    )
    add_text(
        s,
        Cm(1.5), Cm(9.0), Cm(31.0), Cm(1.5),
        "פלטפורמה דיגיטלית לרכישת אוצר מילים באנגלית — בנויה לכיתה הישראלית",
        size=18, color=WHITE, align=PP_ALIGN.RIGHT,
    )

    add_rounded(s, Cm(1.5), Cm(14.5), Cm(8.0), Cm(1.2), WHITE)
    add_text(
        s,
        Cm(1.5), Cm(14.5), Cm(8.0), Cm(1.2),
        "מצגת לבתי ספר",
        size=14, bold=True, color=INDIGO, align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )


def slide_problem_overview(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, ROSE)
    deck_page_chrome(s, prs, 2, 14, "הבעיה", ROSE)
    deck_title(s, prs, "01 · הבעיה", "תלמיד כיתה ט' באוצר מילים של כיתה ו'", ROSE)

    # three problem cards
    cards = [
        ("שכחה מהירה", "תלמידים שוכחים מילים באותו קצב שלומדים אותן. בלי חזרה מגוונת, אוצר מילים מתפוגג תוך שבועות.", ROSE),
        ("פערים בכיתה", "באותה כיתה — חלק קוראים שוטף, חלק עדיין מתקשים. שיעור אחד לא מתאים ל-30 רמות שונות.", AMBER),
        ("עומס על המורה", "אין זמן ואין כלים לתת תרגול אישי ולעקוב אחר כל תלמיד בנפרד.", VIOLET),
    ]
    card_w = Cm(10.0)
    card_h = Cm(9.0)
    gap = Cm(0.8)
    total_w = card_w * 3 + gap * 2
    start_x = (prs.slide_width - total_w) / 2

    for i, (title, body, color) in enumerate(cards):
        x = start_x + (card_w + gap) * i
        y = Cm(5.5)
        add_rounded(s, x, y, card_w, card_h, BG_SOFT)
        add_rounded(s, x, y, card_w, Cm(0.4), color)
        add_text(
            s, x + Cm(0.5), y + Cm(0.9), card_w - Cm(1.0), Cm(1.2),
            title, size=20, bold=True, color=INK, align=PP_ALIGN.RIGHT,
        )
        add_text(
            s, x + Cm(0.5), y + Cm(2.5), card_w - Cm(1.0), Cm(6.0),
            body, size=14, color=SLATE, align=PP_ALIGN.RIGHT,
            line_spacing=1.35,
        )


def slide_problem_data(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, ROSE)
    deck_page_chrome(s, prs, 3, 14, "הבעיה", ROSE)
    deck_title(s, prs, "02 · המצב היום", "שיטות הלמידה הישנות כבר לא עובדות", ROSE)

    points = [
        ("חוברות תרגול", "ילד שמשלים דף מילים פעם בשבוע — שוכח 70% תוך חודש. תרגול לא מגוון לא נשמר בזיכרון."),
        ("שינון בעל-פה", "עובד אצל ילד אחד מתוך עשרה. השאר מתחילים לשנוא את השפה."),
        ("מבחנים בלבד", "מודדים מה התלמיד יודע ביום המבחן — לא מה הוא ידע באמת ובאיזה קצב למד."),
        ("אפליקציות זרות", "מתאימות לתלמיד שכבר יודע אנגלית. לתלמיד שמתחיל מאפס — הן רק מתסכלות."),
    ]
    y = Cm(5.5)
    for title, body in points:
        add_rect(s, Cm(0.8), y, Cm(32.0), Cm(0.05), BG_SOFT)
        add_text(
            s, Cm(0.8), y + Cm(0.25), Cm(32.0), Cm(0.8),
            title, size=18, bold=True, color=ROSE, align=PP_ALIGN.RIGHT,
        )
        add_text(
            s, Cm(0.8), y + Cm(1.1), Cm(32.0), Cm(1.4),
            body, size=14, color=SLATE, align=PP_ALIGN.RIGHT,
        )
        y += Cm(2.8)


def slide_basis_overview(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, VIOLET)
    deck_page_chrome(s, prs, 4, 14, "על מה זה בנוי", VIOLET)
    deck_title(s, prs, "03 · היסודות", "שלושת העקרונות שעליהם הפלטפורמה בנויה", VIOLET)

    pillars = [
        ("מדע הלמידה", "חזרה מרווחת (Spaced Repetition) + גיוון בתרגול. אותן מילים, 15 דרכים שונות לתרגל אותן.", INDIGO),
        ("עיצוב משחקי", "מוטיבציה פנימית במקום כפיה. נקודות, רצפים, תארים, אווטרים — מנגנונים שמחזיקים תלמיד שעות.", FUCHSIA),
        ("מציאות הכיתה", "אוטומציה למורה: בדיקה, ציון, משוב. דוחות לכל תלמיד. בלי להוסיף עוד שעה של עבודה.", EMERALD),
    ]
    card_w = Cm(10.0)
    card_h = Cm(9.5)
    gap = Cm(0.8)
    total_w = card_w * 3 + gap * 2
    start_x = (prs.slide_width - total_w) / 2

    for i, (title, body, color) in enumerate(pillars):
        x = start_x + (card_w + gap) * i
        y = Cm(5.3)
        add_rounded(s, x, y, card_w, card_h, color)
        # number badge
        add_rounded(s, x + card_w - Cm(2.2), y + Cm(0.6), Cm(1.6), Cm(1.6), WHITE)
        add_text(
            s, x + card_w - Cm(2.2), y + Cm(0.6), Cm(1.6), Cm(1.6),
            f"0{i+1}", size=24, bold=True, color=color, align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE, font="DejaVu Sans",
        )
        add_text(
            s, x + Cm(0.6), y + Cm(2.8), card_w - Cm(1.2), Cm(1.2),
            title, size=22, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
        )
        add_text(
            s, x + Cm(0.6), y + Cm(4.3), card_w - Cm(1.2), Cm(5.0),
            body, size=14, color=WHITE, align=PP_ALIGN.RIGHT, line_spacing=1.4,
        )


def slide_basis_repetition(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, VIOLET)
    deck_page_chrome(s, prs, 5, 14, "על מה זה בנוי", VIOLET)
    deck_title(s, prs, "04 · עיקרון ראשון", "אותה מילה — 15 דרכים שונות לתרגל", VIOLET)

    add_text(
        s, Cm(0.8), Cm(5.5), Cm(18.0), Cm(1.0),
        "למה זה עובד",
        size=18, bold=True, color=VIOLET, align=PP_ALIGN.RIGHT,
    )
    add_bullet_list(
        s, Cm(0.8), Cm(6.7), Cm(18.0), Cm(10.0),
        [
            "התלמיד פוגש את המילה כקריאה, ככתיבה, כשמיעה ובהקשר משפט",
            "כל מצב משחק מפעיל אזור שונה במוח — הזיכרון מתחזק",
            "המעבר בין משחקים שובר שעמום ושומר על ריכוז",
            "התלמיד לא מרגיש שהוא עושה את אותו דבר שוב",
            "המורה לא צריך/ה להמציא תרגילים חדשים",
        ],
        size=14,
    )

    if (SHOTS / "screen2.png").exists():
        add_image(s, Cm(21.5), Cm(5.0), Cm(8.5), Cm(13.0), SHOTS / "screen2.png")


def slide_basis_motivation(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, VIOLET)
    deck_page_chrome(s, prs, 6, 14, "על מה זה בנוי", VIOLET)
    deck_title(s, prs, "05 · עיקרון שני", "מוטיבציה פנימית — כי כך התלמיד חוזר מחר", FUCHSIA)

    add_bullet_list(
        s, Cm(0.8), Cm(6.0), Cm(18.0), Cm(11.0),
        [
            "כל תשובה נכונה משלמת נקודות XP",
            "רצף יומי שמתגמל התמדה, לא רק הצלחה",
            "חנות אווטרים, תארים ופריימים — נרכשים בנקודות בלבד",
            "חיית מחמד שמתפתחת לאורך זמן",
            "תחרויות חיות מול חברים לכיתה",
            "אין פרסומות, אין רכישות בכסף אמיתי, אין לחץ",
        ],
        size=14,
    )

    if (SHOTS / "screen.png").exists():
        add_image(s, Cm(21.5), Cm(5.0), Cm(8.5), Cm(13.0), SHOTS / "screen.png")


def slide_basis_automation(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, VIOLET)
    deck_page_chrome(s, prs, 7, 14, "על מה זה בנוי", VIOLET)
    deck_title(s, prs, "06 · עיקרון שלישי", "אוטומציה למורה — בלי להוסיף שעות עבודה", EMERALD)

    add_bullet_list(
        s, Cm(0.8), Cm(6.0), Cm(32.0), Cm(11.0),
        [
            "מטלות נבדקות אוטומטית, התלמיד מקבל משוב מיידי",
            "המערכת מציינת את התלמיד ושומרת היסטוריה מלאה",
            "דוחות התקדמות נוצרים אוטומטית — לפי תלמיד, לפי כיתה, לפי תקופה",
            "המורה רואה/ה מי בקושי, מי משתעמם, מי מתקדם — בלי לחפש",
            "תזכורות אוטומטיות לתלמידים שלא נכנסו השבוע",
        ],
        size=15,
    )


def slide_for_teachers(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, INDIGO)
    deck_page_chrome(s, prs, 8, 14, "למורה", INDIGO)
    deck_title(s, prs, "07 · למורה", "פחות בדיקות, יותר הוראה", INDIGO)

    items = [
        "בניית מטלה בדקה — מילים מוכנות או רשימה משלך",
        "צילום של עמוד מהספר — זיהוי אוטומטי + תרגום",
        "בדיקה אוטומטית של תרגילים",
        "דוחות התקדמות פר תלמיד",
        "Live Challenge — תחרות בזמן אמת על המסך הגדול",
        "Quick Play — פעילות מהירה עם QR, בלי הרשמה",
        "הקראה ותרגום לעברית/ערבית בכל מילה",
        "כניסת תלמידים עם קוד כיתה — בלי תהליך הרשמה מסובך",
    ]
    add_bullet_list(
        s, Cm(0.8), Cm(5.5), Cm(18.0), Cm(12.0),
        items,
        size=14,
    )

    if (SHOTS / "screen1.png").exists():
        add_image(s, Cm(21.5), Cm(5.0), Cm(8.5), Cm(13.0), SHOTS / "screen1.png")


def slide_for_students(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, AMBER)
    deck_page_chrome(s, prs, 9, 14, "לתלמיד", AMBER)
    deck_title(s, prs, "08 · לתלמיד", "תרגול שמרגיש כמו משחק, לא כמו שיעורי בית", AMBER)

    items = [
        "15 מצבי משחק שונים על אותן מילים",
        "נקודות XP, רצפים יומיים, רמות, תארים",
        "חנות פנים-משחק עם אווטרים, פריימים, ערכות צבע",
        "חיית מחמד שמתפתחת לאורך זמן",
        "מנגנוני שימור: תיבת יומית, אתגר שבועי, בונוס חזרה",
        "תחרות חיה מול חברים לכיתה",
        "תרגום מיידי לעברית או ערבית כשנתקעים",
        "הקראה לכל מילה — בהגייה נכונה",
    ]
    add_bullet_list(
        s, Cm(0.8), Cm(5.5), Cm(18.0), Cm(12.0),
        items,
        size=14,
    )

    if (SHOTS / "screen.png").exists():
        add_image(s, Cm(21.5), Cm(5.0), Cm(8.5), Cm(13.0), SHOTS / "screen.png")


def slide_for_managers(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, FUCHSIA)
    deck_page_chrome(s, prs, 10, 14, "למנהל/ת", FUCHSIA)
    deck_title(s, prs, "09 · למנהל/ת", "שליטה, בקרה, נתונים — לא תחושות בטן", FUCHSIA)

    items = [
        "לוח בקרה אחד לכל הכיתות בבית הספר",
        "נתונים אובייקטיביים על כל תלמיד וכל כיתה",
        "זיהוי מוקדם של תלמידים בסיכון",
        "דוחות מוכנים להורים ולפיקוח",
        "השוואה בין כיתות ולאורך זמן",
        "פלטפורמה אחת, ללא תוכנה להתקין",
        "ללא פרסומות, ללא רכישות בתוך האפליקציה",
        "ניתן להרחבה לכל בית הספר ללא תוספת תשתית",
    ]
    add_bullet_list(
        s, Cm(0.8), Cm(5.5), Cm(18.0), Cm(12.0),
        items,
        size=14,
    )

    if (SHOTS / "scree3n.png").exists():
        add_image(s, Cm(21.5), Cm(5.0), Cm(8.5), Cm(13.0), SHOTS / "scree3n.png")


def slide_security(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, EMERALD)
    deck_page_chrome(s, prs, 11, 14, "בטיחות ופרטיות", EMERALD)
    deck_title(s, prs, "10 · בטיחות ופרטיות", "תאימות מלאה לחוק הישראלי ולתקן האירופי", EMERALD)

    cards = [
        ("אחסון באירופה", "כל הנתונים מאוחסנים בפרנקפורט. תאימות מלאה ל-GDPR."),
        ("חוק הגנת הפרטיות", "עומדים בחוק הגנת הפרטיות הישראלי ובתיקון 13."),
        ("ללא פרסומות", "אין פרסומות, אין צד שלישי, אין מכירת נתונים."),
        ("בדיקות חדירה", "המערכת נבדקת באופן שוטף בבדיקות חדירה חיצוניות."),
    ]
    card_w = Cm(15.5)
    card_h = Cm(5.5)
    gap = Cm(0.8)
    start_x = (prs.slide_width - (card_w * 2 + gap)) / 2

    for i, (title, body) in enumerate(cards):
        col = i % 2
        row = i // 2
        x = start_x + (card_w + gap) * col
        y = Cm(5.5) + (card_h + gap) * row
        add_rounded(s, x, y, card_w, card_h, BG_SOFT)
        add_rounded(s, x, y, Cm(0.4), card_h, EMERALD)
        add_text(
            s, x + Cm(0.7), y + Cm(0.7), card_w - Cm(1.4), Cm(1.2),
            title, size=18, bold=True, color=INK, align=PP_ALIGN.RIGHT,
        )
        add_text(
            s, x + Cm(0.7), y + Cm(2.2), card_w - Cm(1.4), Cm(3.0),
            body, size=14, color=SLATE, align=PP_ALIGN.RIGHT, line_spacing=1.4,
        )


def slide_vision(prs):
    s = slide_blank(prs)
    deck_background(s, prs)
    deck_side_strip(s, prs, FUCHSIA)
    deck_page_chrome(s, prs, 12, 14, "החזון", FUCHSIA)
    deck_title(s, prs, "11 · החזון", "אנגלית היום — כל מקצוע שדורש שינון, מחר", FUCHSIA)

    add_text(
        s, Cm(0.8), Cm(5.5), Cm(32.0), Cm(2.0),
        "המנוע שבנינו לאוצר מילים באנגלית מתאים לכל תחום שדורש שינון והפנמה.",
        size=18, color=SLATE, align=PP_ALIGN.RIGHT, line_spacing=1.4,
    )

    pills = [
        ("עברית כשפה שנייה", INDIGO),
        ("ערבית", VIOLET),
        ("אוצר מילים במדעים", EMERALD),
        ("מושגים בהיסטוריה ובתנ\"ך", AMBER),
        ("שפה שלישית — צרפתית, ספרדית, רוסית", FUCHSIA),
    ]
    y = Cm(9.0)
    for label, color in pills:
        add_rounded(s, Cm(0.8), y, Cm(32.0), Cm(1.3), color)
        add_text(
            s, Cm(0.8), y, Cm(32.0), Cm(1.3),
            label, size=16, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
        )
        y += Cm(1.55)


def slide_start(prs):
    s = slide_blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, INDIGO)
    add_rect(s, Cm(11.3), 0, Cm(22.6), prs.slide_height, VIOLET)
    add_rect(s, Cm(22.6), 0, Cm(11.3), prs.slide_height, FUCHSIA)

    add_text(
        s, Cm(0.8), Cm(0.8), Cm(32.0), Cm(0.8),
        "VOCABAND",
        size=16, bold=True, color=WHITE, align=PP_ALIGN.LEFT, font="DejaVu Sans",
    )

    add_text(
        s, Cm(1.5), Cm(5.5), Cm(31.0), Cm(2.2),
        "איך מתחילים",
        size=42, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
    )

    steps = [
        ("01", "פגישת היכרות קצרה", "אנחנו לומדים את בית הספר ואת הצרכים שלכם"),
        ("02", "בוחרים כיתה אחת לפיילוט", "אתם בוחרים מורה, אנחנו מקימים את הכיתה"),
        ("03", "חודש שלם של שימוש", "ללא התחייבות, ללא תשלום, ליווי צמוד"),
        ("04", "מחליטים יחד", "אם זה עובד — מרחיבים. אם לא — לא ממשיכים."),
    ]
    y = Cm(8.5)
    for num, title, body in steps:
        add_rounded(s, Cm(1.5), y, Cm(2.5), Cm(2.0), WHITE)
        add_text(
            s, Cm(1.5), y, Cm(2.5), Cm(2.0),
            num, size=26, bold=True, color=INDIGO, align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE, font="DejaVu Sans",
        )
        add_text(
            s, Cm(4.3), y, Cm(28.0), Cm(0.9),
            title, size=18, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
        )
        add_text(
            s, Cm(4.3), y + Cm(1.0), Cm(28.0), Cm(1.0),
            body, size=13, color=WHITE, align=PP_ALIGN.RIGHT,
        )
        y += Cm(2.3)


def slide_thanks(prs):
    s = slide_blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, INK)

    add_text(
        s, Cm(0.8), Cm(0.8), Cm(32.0), Cm(0.8),
        "VOCABAND",
        size=16, bold=True, color=WHITE, align=PP_ALIGN.LEFT, font="DejaVu Sans",
    )

    add_text(
        s, Cm(1.5), Cm(7.0), Cm(31.0), Cm(3.0),
        "תודה.",
        size=72, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
    )
    add_text(
        s, Cm(1.5), Cm(11.5), Cm(31.0), Cm(1.5),
        "נשמח להראות לכם את המערכת בפגישה קצרה.",
        size=18, color=MUTED, align=PP_ALIGN.RIGHT,
    )
    add_text(
        s, Cm(1.5), Cm(13.5), Cm(31.0), Cm(1.0),
        "www.vocaband.com",
        size=18, bold=True, color=AMBER, align=PP_ALIGN.RIGHT, font="DejaVu Sans",
    )


def build_presentation():
    prs = make_widescreen_prs()
    slide_title_page(prs)
    slide_problem_overview(prs)
    slide_problem_data(prs)
    slide_basis_overview(prs)
    slide_basis_repetition(prs)
    slide_basis_motivation(prs)
    slide_basis_automation(prs)
    slide_for_teachers(prs)
    slide_for_students(prs)
    slide_for_managers(prs)
    slide_security(prs)
    slide_vision(prs)
    slide_start(prs)
    slide_thanks(prs)

    out = OUT_DIR / "vocaband-presentation-HE.pptx"
    prs.save(out)
    return out


# ---------- PDF conversion ----------

def to_pdf(pptx_path: Path) -> Path:
    # LibreOffice can exit 0 even when conversion fails — verify the PDF exists.
    pdf_path = pptx_path.with_suffix(".pdf")
    if pdf_path.exists():
        pdf_path.unlink()
    result = subprocess.run(
        [
            "libreoffice",
            "--headless",
            "-env:UserInstallation=file:///tmp/lo_profile_vocaband",
            "--convert-to",
            "pdf",
            "--outdir",
            str(pptx_path.parent),
            str(pptx_path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if not pdf_path.exists():
        raise RuntimeError(
            f"PDF conversion failed for {pptx_path}\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )
    return pdf_path


# ---------- Main ----------

def main():
    print("Building teacher handout…")
    t = build_teacher_handout()
    print("Building manager handout…")
    m = build_manager_handout()
    print("Building presentation deck…")
    d = build_presentation()

    for f in (t, m, d):
        print(f"Converting {f.name} -> PDF…")
        to_pdf(f)

    print("\nDone. Outputs in:", OUT_DIR)
    for f in sorted(OUT_DIR.iterdir()):
        size_kb = f.stat().st_size // 1024
        print(f"  {f.name}  ({size_kb} KB)")


if __name__ == "__main__":
    main()
