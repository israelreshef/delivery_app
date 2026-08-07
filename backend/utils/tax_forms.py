"""Tax form PDF generation for couriers (TZIR).

Round 1 of section 7 of the improvement plan:
  * Auto-generated fillable tax forms (VAT, income tax advances, national
    insurance, annual 1301) built from the courier's own deliveries/expenses.
  * Blank form templates prefilled with the courier's personal details.

Uses ReportLab for Hebrew (RTL) rendering, reusing the font plumbing already
set up in ``utils/pdf_generator``.
"""

import io

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from .pdf_generator import FONT_NAME, bidi_text

# Form catalogue exposed to clients. ``kind`` = 'auto' (auto-generated) or
# 'blank' (template the courier fills manually). ``period`` hints at the
# parameters a generated form needs.
FORMS = {
    'vat_monthly': {
        'id': 'vat_monthly',
        'title': 'דו"ח מע"מ חודשי',
        'description': 'מע"מ עסקאות (הכנסות) מול תשומות (הוצאות) לחודש',
        'kind': 'auto',
        'period': 'month',
        'filename': 'vat_monthly',
        'available': True,
    },
    'tax_advances': {
        'id': 'tax_advances',
        'title': 'מקדמות מס הכנסה',
        'description': 'חישוב מקדמת מס הכנסה חודשית על מחזור העסקאות',
        'kind': 'auto',
        'period': 'month',
        'filename': 'tax_advances',
        'available': True,
    },
    'national_insurance': {
        'id': 'national_insurance',
        'title': 'מקדמות ביטוח לאומי',
        'description': 'הערכת תשלומי ביטוח לאומי לעצמאי',
        'kind': 'auto',
        'period': 'month',
        'filename': 'national_insurance',
        'available': True,
    },
    'annual_1301': {
        'id': 'annual_1301',
        'title': 'דוח שנתי 1301 (מס הכנסה)',
        'description': 'סיכום שנתי הכנסות, הוצאות והערכת ביטוח לאומי לשנת המס',
        'kind': 'auto',
        'period': 'year',
        'filename': 'annual_1301',
        'available': True,
    },
    'wealth_declaration': {
        'id': 'wealth_declaration',
        'title': 'הצהרת הון',
        'description': 'טופס ריק להצהרת הון (אין להוריד את עצמך)',
        'kind': 'blank',
        'period': None,
        'filename': 'wealth_declaration',
        'available': True,
    },
    'tax_coordination_116': {
        'id': 'tax_coordination_116',
        'title': 'טופס תיאום מס 116',
        'description': 'טופס ריק לתיאום מס עם פרטי השליח',
        'kind': 'blank',
        'period': None,
        'filename': 'tax_coordination_116',
        'available': True,
    },
    'withholding_106': {
        'id': 'withholding_106',
        'title': 'טופס 106 — אישור ניכוי מס במקור',
        'description': 'סיכום ניכויי מס במקור שנוכו בפועל מתשלומי השליח',
        'kind': 'auto',
        'period': 'year',
        'filename': 'withholding_106',
        'available': True,
    },
    'year_end_assessment': {
        'id': 'year_end_assessment',
        'title': 'שומת סוף שנה — חישוב הפרשי ביטוח לאומי',
        'description': 'הערכת שומה שנתית והפרשים מול תשלומים ששולמו',
        'kind': 'auto',
        'period': 'year',
        'filename': 'year_end_assessment',
        'available': True,
    },
    'withholding_bookkeeping': {
        'id': 'withholding_bookkeeping',
        'title': 'אישור ניכוי מס במקור וניהול ספרים',
        'description': 'סיכום תשלומים וניכויים למס (בדומה לדו"ח 856)',
        'kind': 'auto',
        'period': 'year',
        'filename': 'withholding_bookkeeping',
        'available': True,
    },
}


def list_forms():
    """Return the public form catalogue (no internal details)."""
    return [
        {k: v for k, v in meta.items() if k != 'filename'}
        for meta in FORMS.values()
    ]


def _base_styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HebrewTitle', parent=styles['Heading1'], fontName=FONT_NAME,
        fontSize=18, alignment=1, spaceAfter=8)
    normal_right_style = ParagraphStyle(
        'HebrewNormalRight', parent=styles['Normal'], fontName=FONT_NAME,
        fontSize=11, alignment=2, spaceAfter=4)
    info_style = ParagraphStyle(
        'HebrewInfo', parent=styles['Normal'], fontName=FONT_NAME,
        fontSize=9, alignment=2, textColor=colors.dimgrey, spaceAfter=2)
    section_style = ParagraphStyle(
        'HebrewSection', parent=styles['Normal'], fontName=FONT_NAME,
        fontSize=12, alignment=2, textColor=colors.darkblue, spaceBefore=8,
        spaceAfter=4)
    return title_style, normal_right_style, info_style, section_style


def _build_pdf(form_title, courier, period_label, rows, table=None):
    """Render a titled, header'd PDF with label/value rows and an optional table."""
    title_style, normal_right_style, info_style, section_style = _base_styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []

    elements.append(Paragraph(bidi_text("ציר משלוחים בע\"מ"), title_style))
    elements.append(Paragraph(bidi_text("מערכת ניהול השליחים — ייצור דוחות מס"), info_style))
    elements.append(Spacer(1, 16))

    elements.append(Paragraph(bidi_text(form_title), title_style))
    if period_label:
        elements.append(Paragraph(bidi_text(f"תקופה: {period_label}"), normal_right_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(bidi_text(f"שם השליח: {courier.full_name or 'שליח'}"), normal_right_style))
    elements.append(Spacer(1, 12))

    for section_title, items in rows:
        if section_title:
            elements.append(Paragraph(bidi_text(section_title), section_style))
        data = [[bidi_text(k), v] for k, v in items]
        t = Table(data, colWidths=[240, 180])
        t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 8))

    if table:
        header, table_rows = table
        data = [[bidi_text(h) for h in header]] + table_rows
        t = Table(data, colWidths=[90, 80, 100, 120, 130])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ]))
        elements.append(Spacer(1, 4))
        elements.append(t)

    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        bidi_text("מסמך זה הופק באופן ממוחשב ממערכת TZIR — בדקו את הנתונים לפני הגשה לרשויות."),
        info_style))

    doc.build(elements)
    buf.seek(0)
    return buf


def generate_tax_form_pdf(form_id, courier, period_label, rows, table=None):
    """Generate a filled PDF for an auto form."""
    meta = FORMS[form_id]
    return _build_pdf(meta['title'], courier, period_label, rows, table)


def generate_blank_form_pdf(form_id, courier, user=None, home_address=None):
    """Generate a blank template prefilled with the courier's personal details.

    Personal data is pulled from the :class:`Courier` (name, encrypted national
    id) and the linked :class:`User` (phone, email) so the sheet is ready to
    submit. Any missing value falls back to a printable placeholder.
    """
    meta = FORMS[form_id]
    title, normal, info, section = _base_styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    elements.append(Paragraph(bidi_text("ציר משלוחים בע\"מ"), title))
    elements.append(Paragraph(bidi_text("טופס ריק — למילוי ידני"), info))
    elements.append(Spacer(1, 16))
    elements.append(Paragraph(bidi_text(meta['title']), title))
    elements.append(Spacer(1, 10))

    placeholder = '____________________'
    # national_id is an EncryptedString column -> auto-decrypted on read; may be None.
    national_id = getattr(courier, 'national_id', None) or placeholder
    phone = getattr(user, 'phone', None) if user is not None else None
    email = getattr(user, 'email', None) if user is not None else None
    address = home_address or placeholder

    personal = [
        ['שם מלא', courier.full_name or placeholder],
        ['מס\' זהות (ת.ז)', national_id or placeholder],
        ['ע.מ / ח.פ', placeholder],
        ['כתובת', address],
        ['טלפון', phone or placeholder],
        ['אימייל', email or placeholder],
    ]
    data = [[bidi_text(k), v] for k, v in personal]
    t = Table(data, colWidths=[180, 240])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 16))

    fields_txt = [
        'סעיף 1: ______________________________________',
        'סעיף 2: ______________________________________',
        'סעיף 3: ______________________________________',
        'סעיף 4: ______________________________________',
    ]
    for f in fields_txt:
        elements.append(Paragraph(f, normal))
        elements.append(Spacer(1, 18))

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(bidi_text("חתימה: __________________   תאריך: ______________"), normal))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(bidi_text('מסמך זה הוא טופס ריק; מלאו אותו ידנית והגישו לגורם הממונה.'), info))
    doc.build(elements)
    buf.seek(0)
    return buf