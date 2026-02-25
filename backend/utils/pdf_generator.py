import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

# Hebrew Font Setup for Windows/Linux
HEBREW_FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
FONT_NAME = "Arial"

try:
    if os.path.exists(HEBREW_FONT_PATH):
        pdfmetrics.registerFont(TTFont(FONT_NAME, HEBREW_FONT_PATH))
    else:
        FONT_NAME = "Helvetica"
except Exception:
    FONT_NAME = "Helvetica"

def bidi_text(text):
    """Reshape Arabic/Hebrew text and apply bidirectional algorithm for correct RTL rendering."""
    if not isinstance(text, str):
        text = str(text)
    reshaped_text = arabic_reshaper.reshape(text)
    return get_display(reshaped_text)

def generate_israeli_invoice(invoice, output_path):
    """
    Generates a legally compliant Israeli document (Tax Invoice / Receipt / etc.)
    with proper right-to-left Hebrew alignment and sequential numbering.
    """
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    styles = getSampleStyleSheet()
    
    # Define styles with Hebrew font
    title_style = ParagraphStyle(
        'HebrewTitle',
        parent=styles['Heading1'],
        fontName=FONT_NAME,
        fontSize=20,
        alignment=1, # Center
        spaceAfter=10
    )
    
    normal_right_style = ParagraphStyle(
        'HebrewNormalRight',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=12,
        alignment=2, # Right aligned
        spaceAfter=5
    )

    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=10,
        alignment=2, # Right aligned
        textColor=colors.dimgrey,
        spaceAfter=2
    )

    elements = []

    # Map database enum to Hebrew string
    doc_type_map = {
        'tax_invoice_receipt': 'חשבונית מס קבלה',
        'receipt': 'קבלה',
        'tax_invoice': 'חשבונית מס',
        'transaction_invoice': 'חשבונית עסקה',
        'credit_note': 'תעודת זיכוי'
    }
    
    hebrew_doc_type = doc_type_map.get(invoice.document_type, 'מסמך')
    
    # 1. Header (Company details - HARDCODED for now, should come from settings)
    company_name = bidi_text("ציר משלוחים בע\"מ")
    company_id = bidi_text("ח.פ: 510000000")
    company_address = bidi_text("המסגר 1, תל אביב")
    
    elements.append(Paragraph(company_name, title_style))
    elements.append(Paragraph(company_id, company_info_style))
    elements.append(Paragraph(company_address, company_info_style))
    elements.append(Spacer(1, 20))

    # 2. Document Title and Details
    title_str = bidi_text(f"{hebrew_doc_type} מס' {invoice.invoice_number}")
    elements.append(Paragraph(title_str, title_style))
    
    date_str = invoice.issue_date.strftime('%d/%m/%Y')
    elements.append(Paragraph(bidi_text(f"תאריך הפקה: {date_str}"), normal_right_style))
    
    if invoice.customer:
        elements.append(Paragraph(bidi_text("לכבוד:"), normal_right_style))
        customer_name = invoice.customer.company_name or invoice.customer.full_name
        elements.append(Paragraph(bidi_text(customer_name), normal_right_style))
        if invoice.customer.tax_id:
            elements.append(Paragraph(bidi_text(f"ע.מ / ח.פ / ת.ז: {invoice.customer.tax_id}"), normal_right_style))
        if invoice.customer.billing_address or invoice.customer.default_address:
            addr = invoice.customer.billing_address or invoice.customer.default_address
            elements.append(Paragraph(bidi_text(addr), normal_right_style))
    
    elements.append(Spacer(1, 20))

    # 3. Items Table
    # Table headers (RTL, so columns are right-to-left)
    th_total = bidi_text("סה\"כ (₪)")
    th_vat = bidi_text("מע\"מ")
    th_price = bidi_text("מחיר יחידה (₪)")
    th_qty = bidi_text("כמות")
    th_desc = bidi_text("תיאור השירות")
    
    table_data = [[th_total, th_vat, th_price, th_qty, th_desc]]
    
    # Example Item (Delivery Service)
    desc = bidi_text(f"שירותי משלוח - הזמנה {invoice.delivery.order_number if invoice.delivery else 'N/A'}")
    table_data.append([
        f"{invoice.subtotal:.2f}", 
        f"{(invoice.vat_rate * 100):.0f}%", 
        f"{invoice.subtotal:.2f}", 
        "1", 
        desc
    ])
    
    # Table styling
    items_table = Table(table_data, colWidths=[70, 50, 90, 40, 250])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),  # RTL Align right
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 20))

    # 4. Totals Summary (placed on the left side aesthetically)
    summary_data = [
        [f"{invoice.subtotal:.2f} ₪", bidi_text("סה\"כ לפני מע\"מ:")],
        [f"{invoice.vat_amount:.2f} ₪", bidi_text(f"מע\"מ ({(invoice.vat_rate * 100):.0f}%):")],
        [f"{invoice.total_amount:.2f} ₪", bidi_text("סה\"כ לתשלום:")],
    ]
    
    summary_table = Table(summary_data, colWidths=[80, 120])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME + "-Bold" if FONT_NAME != "Helvetica" else "Helvetica-Bold"),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))
    
    # To place it on the left, we can use a container table
    container_table = Table([[summary_table, ""]], colWidths=[200, 300])
    container_table.setStyle(TableStyle([('ALIGN', (0, 0), (0, 0), 'LEFT')]))
    
    elements.append(container_table)
    
    # 5. Electronic Signature Disclaimer
    elements.append(Spacer(1, 40))
    disclaimer = bidi_text("מסמך זה הופק באופן ממוחשב - חתימה דיגיטלית מאושרת שמורה במערכת.")
    elements.append(Paragraph(disclaimer, company_info_style))

    doc.build(elements)
    return output_path

# Keep the original func for compatibility just in case
def generate_earnings_report(courier_name, period, deliveries, total_amount, output_path):
    pass
