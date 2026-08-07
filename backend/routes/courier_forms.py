"""Courier-facing tax form generation (TZIR improvement plan, section 7, round 1).

Endpoints (all under ``/api/courier/forms``, courier/admin role):
  * ``GET  /``                          → catalogue of available forms.
  * ``POST /<form_id>/generate``        → filled PDF built from the courier's data.
  * ``GET  /<form_id>/blank``           → blank/prefilled template PDF.

The courier only sees and generates *their own* numbers (deliveries + expenses
linked to their profile).
"""

import hashlib
import json
import logging

from flask import Blueprint, jsonify, make_response, request

from models import db, Courier, CourierReportHistory, Delivery, Expense, User, Address
from utils.audit import log_audit
from utils.decorators import token_required, role_required
from utils.tax import VAT_RATE_FLOAT
from utils import tax_forms

from datetime import datetime

courier_forms_bp = Blueprint('courier_forms', __name__)

PDF_MIME = 'application/pdf'


def _period_bounds(month, year, is_year):
    """Return (start_datetime, end_datetime_exclusive, label) for month or year."""
    if is_year:
        start = datetime(year, 1, 1)
        end = datetime(year + 1, 1, 1)
        return start, end, str(year)
    m = month or datetime.utcnow().month
    y = year or datetime.utcnow().year
    start = datetime(y, m, 1)
    if m == 12:
        end = datetime(y + 1, 1, 1)
    else:
        end = datetime(y, m + 1, 1)
    return start, end, f"{m}/{y}"


def _courier_of(current_user):
    courier = Courier.query.filter_by(user_id=current_user.id).first()
    if not courier:
        return None
    return courier


def _collect_period(courier, start, end):
    """Revenues (deliveries) and expenses for the courier in the period."""
    deliveries = Delivery.query.filter(
        Delivery.courier_id == courier.id,
        Delivery.status == 'delivered',
        Delivery.updated_at >= start,
        Delivery.updated_at < end,
    ).all()
    expenses = Expense.query.filter(
        Expense.courier_id == courier.id,
        Expense.expense_date >= start.date(),
        Expense.expense_date < end.date(),
    ).all()
    revenue = sum(float(d.price or 0) for d in deliveries)
    vat_collected = revenue * VAT_RATE_FLOAT
    exp_net = sum(float(e.base_amount or 0) for e in expenses)
    exp_vat = sum(float(e.vat_amount or 0) for e in expenses)
    return {
        'deliveries': deliveries,
        'expenses': expenses,
        'revenue': revenue,
        'vat_collected': vat_collected,
        'exp_net': exp_net,
        'exp_vat': exp_vat,
        'profit': revenue - exp_net,
        'delivery_count': len(deliveries),
        'expense_count': len(expenses),
    }


def _rows_vat_monthly(period, data):
    return [
        ('', [
            ('סה"כ הכנסות (לפני מע"מ)', f"{data['revenue']:.2f} ₪"),
            ('מע"מ עסקאות (נגבה)', f"{data['vat_collected']:.2f} ₪"),
            ('סה"כ הוצאות (לפני מע"מ)', f"{data['exp_net']:.2f} ₪"),
            ('מע"מ תשומות (נקלט)', f"{data['exp_vat']:.2f} ₪"),
        ]),
        ('סיכום', [
            ('מע"מ לתשלום (להחזר אם שלילי)', f"{data['vat_collected'] - data['exp_vat']:.2f} ₪"),
        ]),
    ], ('פירוט עסקאות', [
        [d.order_number or str(d.id), d.updated_at.strftime('%d/%m/%Y') if d.updated_at else '',
         d.delivery_address or '', '---', f"{float(d.price or 0):.2f}"]
        for d in data['deliveries']
    ])


def _rows_tax_advances(period, data):
    advance_rate = 0.05
    advance = data['revenue'] * advance_rate
    return [
        ('', [
            ('מחזור עסקאות (ללא מע"מ)', f"{data['revenue']:.2f} ₪"),
            ('אחוז מקדמה', f"{advance_rate * 100:.0f}%"),
        ]),
        ('סיכום', [
            ('סכום מקדמה לתשלום', f"{advance:.2f} ₪"),
        ]),
    ], None


def _rows_national_insurance(period, data):
    ni_rate = 0.09
    ni = data['profit'] * ni_rate if data['profit'] > 0 else 0
    return [
        ('', [
            ('רווח נקי', f"{data['profit']:.2f} ₪"),
            ('הערכת אחוז ביטוח לאומי', f"{ni_rate * 100:.0f}%"),
        ]),
        ('סיכום', [
            ('סכום מוערך לתשלום', f"{ni:.2f} ₪"),
        ]),
    ], None


def _rows_annual_1301(period, data):
    low_bracket = 7522 * 12
    rev = data['revenue']
    if rev <= low_bracket:
        ss = rev * 0.0597
    else:
        ss = (low_bracket * 0.0597) + ((rev - low_bracket) * 0.1783)
    bracket = 'מדרגת מס 10%' if rev < 84120 else 'מדרגת מס 14%+'
    return [
        ('', [
            ('סה"כ הכנסות שנתיות (שנת המס)', f"{rev:.2f} ₪"),
            ('סה"כ הוצאות שנתיות', f"{data['exp_net']:.2f} ₪"),
            ('רווח נקי שנתי', f"{data['profit']:.2f} ₪"),
            ('ממוצע חודשי', f"{rev / 12:.2f} ₪"),
            ('הערכת ביטוח לאומי', f"{ss:.2f} ₪"),
            ('מסלול מס מוערך', bracket),
        ]),
    ], None


def _collect_withholdings(courier, start, end):
    """Contractor invoices where tax was withheld from the courier's pay."""
    invoices = Expense.query.filter(
        Expense.courier_id == courier.id,
        Expense.is_contractor_invoice.is_(True),
        Expense.expense_date >= start.date(),
        Expense.expense_date < end.date(),
    ).all()
    gross = sum(float(e.base_amount or 0) + float(e.vat_amount or 0) for e in invoices)
    withheld = sum(float(e.withholding_tax_deducted or 0) for e in invoices)
    return {
        'invoices': invoices,
        'gross': gross,
        'withheld': withheld,
        'net': gross - withheld,
        'count': len(invoices),
    }


def _rows_withholding_106(period, data):
    w = data
    return [
        ('', [
            ('סה"כ תשלומים ברוטו (שנת המס)', f"{w['gross']:.2f} ₪"),
            ('סה"כ ניכוי מס במקור', f"{w['withheld']:.2f} ₪"),
            ('תשלום נטו', f"{w['net']:.2f} ₪"),
        ]),
    ], ('פירוט ניכויים', [
        [e.description or f"חשבונית {e.id}", e.expense_date.strftime('%d/%m/%Y') if e.expense_date else '',
         f"{float(e.base_amount or 0) + float(e.vat_amount or 0):.2f}",
         f"{float(e.withholding_tax_deducted or 0):.2f}",
         f"{float(e.total_amount or 0):.2f}"]
        for e in w['invoices']
    ])


def _rows_year_end_assessment(period, data):
    low_bracket = 7522 * 12
    rev = data['revenue']
    if rev <= low_bracket:
        ss_due = rev * 0.0597
    else:
        ss_due = (low_bracket * 0.0597) + ((rev - low_bracket) * 0.1783)
    exp_vat = data['exp_vat']
    tax_due = max(0.0, (data['vat_collected'] - exp_vat) * 12)
    ni_paid = min(ss_due, data['profit'] * 0.09)
    difference = ss_due - ni_paid
    return [
        ('חישוב ביטוח לאומי', [
            ('רווח נקי שנתי', f"{data['profit']:.2f} ₪"),
            ('ביטוח לאומי משוער (שנתי)', f"{ss_due:.2f} ₪"),
            ('מופרש בפועל (מקדמות)', f"{ni_paid:.2f} ₪"),
            ('הפרש לתשלום / להחזר', f"{difference:.2f} ₪"),
        ]),
        ('מס הכנסה', [
            ('מע"מ שנתי משוער', f"{tax_due:.2f} ₪"),
            ('מחזור עסקאות', f"{rev:.2f} ₪"),
        ]),
    ], None


def _rows_withholding_bookkeeping(period, data):
    w = data
    return [
        ('', [
            ('מספר חשבוניות/תשלומים', f"{w['count']}"),
            ('סה"כ ברוטו', f"{w['gross']:.2f} ₪"),
            ('סה"כ ניכוי מס במקור', f"{w['withheld']:.2f} ₪"),
            ('סה"כ נטו לתשלום', f"{w['net']:.2f} ₪"),
        ]),
    ], ('ספר תשלומים', [
        [e.expense_date.strftime('%d/%m/%Y') if e.expense_date else '',
         e.description or f"חשבונית {e.id}",
         f"{float(e.base_amount or 0) + float(e.vat_amount or 0):.2f}",
         f"{float(e.withholding_tax_deducted or 0):.2f}",
         f"{float(e.total_amount or 0):.2f}"]
        for e in w['invoices']
    ])


_GENERATORS = {
    'vat_monthly': _rows_vat_monthly,
    'tax_advances': _rows_tax_advances,
    'national_insurance': _rows_national_insurance,
    'annual_1301': _rows_annual_1301,
    'withholding_106': _rows_withholding_106,
    'year_end_assessment': _rows_year_end_assessment,
    'withholding_bookkeeping': _rows_withholding_bookkeeping,
}


@courier_forms_bp.route('', methods=['GET'])
@token_required
@role_required(['courier', 'admin'])
def get_forms(current_user):
    """List available tax forms."""
    return jsonify(tax_forms.list_forms()), 200


@courier_forms_bp.route('/<form_id>/generate', methods=['POST'])
@token_required
@role_required(['courier', 'admin'])
def generate_form(current_user, form_id):
    """Generate a filled PDF for one auto-generated tax form (and persist it)."""
    meta = tax_forms.FORMS.get(form_id)
    if not meta or meta['kind'] != 'auto':
        return jsonify({'error': 'form is not auto-generated or does not exist'}), 404

    generator = _GENERATORS.get(form_id)
    if not generator:
        return jsonify({'error': 'no generator for this form'}), 400

    courier = _courier_of(current_user)
    if not courier:
        return jsonify({'error': 'Courier profile not found'}), 404

    is_year = meta['period'] == 'year'
    body = request.get_json(silent=True) or {}
    month = body.get('month')
    year = body.get('year') or datetime.utcnow().year
    start, end, label = _period_bounds(month, year, is_year)
    data = _collect_period(courier, start, end)
    if form_id in ('withholding_106', 'withholding_bookkeeping'):
        data.update(_collect_withholdings(courier, start, end))

    try:
        rows, table = generator(label, data)
        pdf = tax_forms.generate_tax_form_pdf(form_id, courier, label, rows, table)
    except Exception as e:
        logging.error(f"Error generating form {form_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    filename = f"{meta['filename']}_{label.replace('/', '-')}.pdf"
    pdf_bytes = pdf.getvalue()
    fingerprint = _source_fingerprint(courier, start, end)

    period_type = 'year' if is_year else 'month'
    period_month = None if is_year else (month or datetime.utcnow().month)

    report = CourierReportHistory.query.filter_by(
        courier_id=courier.id,
        form_id=form_id,
        period_type=period_type,
        period_year=year,
        period_month=period_month,
    ).first()
    if report:
        report.file_bytes = pdf_bytes
        report.content_hash = hashlib.sha256(pdf_bytes).hexdigest()
        report.source_fingerprint = fingerprint
        report.filename = filename
        report.status = 'up_to_date'
    else:
        report = CourierReportHistory(
            courier_id=courier.id,
            form_id=form_id,
            period_type=period_type,
            period_year=year,
            period_month=period_month,
            filename=filename,
            file_bytes=pdf_bytes,
            content_hash=hashlib.sha256(pdf_bytes).hexdigest(),
            source_fingerprint=fingerprint,
            status='up_to_date',
        )
        db.session.add(report)
    db.session.commit()

    log_audit(
        action='report_generated',
        user_id=current_user.id,
        resource_type='tax_report',
        resource_id=report.id,
        details=f"{form_id} {label}",
    )

    response = _as_pdf(pdf, filename)
    response.headers['X-Report-Id'] = str(report.id)
    return response


@courier_forms_bp.route('/history', methods=['GET'])
@token_required
@role_required(['courier', 'admin'])
def report_history(current_user):
    """List the current courier's generated reports with live staleness status."""
    courier = _courier_of(current_user)
    if not courier:
        return jsonify({'error': 'Courier profile not found'}), 404

    reports = CourierReportHistory.query.filter_by(courier_id=courier.id) \
        .order_by(CourierReportHistory.created_at.desc()).all()

    out = []
    for r in reports:
        meta = tax_forms.FORMS.get(r.form_id) or {}
        is_year = r.period_type == 'year'
        start, end, _label = _period_bounds(
            r.period_month if not is_year else None, r.period_year, is_year)
        current_fp = _source_fingerprint(courier, start, end)
        status = 'up_to_date' if current_fp == r.source_fingerprint else 'needs_refresh'
        out.append({
            'id': r.id,
            'form_id': r.form_id,
            'title': meta.get('title', r.form_id),
            'period': r.period_type,
            'period_label': _label,
            'period_year': r.period_year,
            'period_month': r.period_month,
            'status': status,
            'filename': r.filename,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        })
    return jsonify(out), 200


@courier_forms_bp.route('/history/<int:report_id>/download', methods=['GET'])
@token_required
@role_required(['courier', 'admin'])
def report_download(current_user, report_id):
    """Download a previously generated (stored) report PDF."""
    courier = _courier_of(current_user)
    if not courier:
        return jsonify({'error': 'Courier profile not found'}), 404

    report = CourierReportHistory.query.filter_by(id=report_id, courier_id=courier.id).first()
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    log_audit(
        action='report_downloaded',
        user_id=current_user.id,
        resource_type='tax_report',
        resource_id=report.id,
    )
    response = make_response(report.file_bytes or b'')
    response.headers['Content-Type'] = PDF_MIME
    response.headers['Content-Disposition'] = f"attachment; filename={report.filename}"
    return response


@courier_forms_bp.route('/history/<int:report_id>', methods=['DELETE'])
@token_required
@role_required(['courier', 'admin'])
def report_delete(current_user, report_id):
    """Delete one of the current courier's generated reports."""
    courier = _courier_of(current_user)
    if not courier:
        return jsonify({'error': 'Courier profile not found'}), 404

    report = CourierReportHistory.query.filter_by(id=report_id, courier_id=courier.id).first()
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    log_audit(
        action='report_deleted',
        user_id=current_user.id,
        resource_type='tax_report',
        resource_id=report.id,
    )
    db.session.delete(report)
    db.session.commit()
    return jsonify({'message': 'deleted'}), 200


@courier_forms_bp.route('/<form_id>/blank', methods=['GET'])
@token_required
@role_required(['courier', 'admin'])
def download_blank(current_user, form_id):
    """Return a blank template (prefilled with personal details)."""
    meta = tax_forms.FORMS.get(form_id)
    if not meta or meta['kind'] != 'blank':
        return jsonify({'error': 'form does not exist or has no blank template'}), 404

    courier = _courier_of(current_user)
    if not courier:
        return jsonify({'error': 'Courier profile not found'}), 404

    try:
        home_address = None
        try:
            addr = Address.query.filter_by(user_id=current_user.id).first()
            if addr:
                home_address = " ".join(
                    filter(None, [addr.street, addr.building_number, addr.city, addr.postal_code])
                )
        except Exception:
            home_address = None
        pdf = tax_forms.generate_blank_form_pdf(
            form_id, courier, user=current_user, home_address=home_address)
    except Exception as e:
        logging.error(f"Error generating blank form {form_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    return _as_pdf(pdf, f"{meta['filename']}_blank.pdf")


def _as_pdf(pdf_buffer, filename):
    response = make_response(pdf_buffer.getvalue())
    response.headers['Content-Type'] = PDF_MIME
    response.headers['Content-Disposition'] = f"attachment; filename={filename}"
    return response


def _norm(v):
    """Round to 2 decimals to avoid float drift when fingerprinting sums."""
    try:
        return round(float(v or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _source_signature(courier, start, end):
    """Cheap aggregate signature of the inputs a report depends on."""
    max_delivery_ts = max(
        (d.updated_at for d in Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start,
            Delivery.updated_at < end,
        )), default=None)
    max_expense_ts = max(
        (e.created_at for e in Expense.query.filter(
            Expense.courier_id == courier.id,
            Expense.expense_date >= start.date(),
            Expense.expense_date < end.date(),
        )), default=None)
    return {
        'revenue': _norm(sum(float(d.price or 0) for d in Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start,
            Delivery.updated_at < end,
        ))),
        'exp_net': _norm(sum(float(e.base_amount or 0) for e in Expense.query.filter(
            Expense.courier_id == courier.id,
            Expense.expense_date >= start.date(),
            Expense.expense_date < end.date(),
        ))),
        'delivery_ts': max_delivery_ts.strftime('%Y-%m-%dT%H:%M:%S') if max_delivery_ts else None,
        'expense_ts': max_expense_ts.strftime('%Y-%m-%dT%H:%M:%S') if max_expense_ts else None,
    }


def _source_fingerprint(courier, start, end):
    """Stable sha256 hash of the report's underlying inputs (staleness detection)."""
    sig = _source_signature(courier, start, end)
    return hashlib.sha256(
        json.dumps(sig, sort_keys=True, default=str).encode('utf-8')
    ).hexdigest()