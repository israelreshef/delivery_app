from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from datetime import datetime

# Try to register a Hebrew-supporting font from Windows system fonts if available
HEBREW_FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
FONT_NAME = "Arial"

try:
    if os.path.exists(HEBREW_FONT_PATH):
        pdfmetrics.registerFont(TTFont(FONT_NAME, HEBREW_FONT_PATH))
    else:
        FONT_NAME = "Helvetica"
except Exception:
    FONT_NAME = "Helvetica"

def generate_earnings_report(courier_name, period, deliveries, total_amount, output_path):
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName=FONT_NAME,
        fontSize=24,
        textColor=colors.hexColor("#001C44"),
        alignment=1, # Center
        spaceAfter=20
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=12,
        spaceAfter=10
    )

    elements = []

    # Title
    elements.append(Paragraph(f"Earnings Report - {courier_name}", title_style))
    elements.append(Paragraph(f"Period: {period}", header_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", header_style))
    elements.append(Spacer(1, 20))

    # Table Data
    data = [["Order #", "Date", "Pickup", "Delivery", "Earnings"]]
    for d in deliveries:
        data.append([
            d.order_number,
            d.delivered_at.strftime('%Y-%m-%d'),
            d.pickup_address[:20] + "...",
            d.delivery_address[:20] + "...",
            f"ILS {d.delivery_fee:.2f}"
        ])
    
    data.append(["", "", "", "Total:", f"ILS {total_amount:.2f}"])

    # Table Style
    table = Table(data, colWidths=[60, 80, 140, 140, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.hexColor("#001C44")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME + "-Bold" if FONT_NAME != "Helvetica" else "Helvetica-Bold"),
    ]))

    elements.append(table)
    
    # Disclaimer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("This is an automatically generated report. For any inquiries, contact support at support@tzir.com", styles['Italic']))

    doc.build(elements)
    return output_path
