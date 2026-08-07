"""
Courier Business API — courier-scoped endpoints powering the mobile
"ניהול עסקי" (Business) screen: expenses CRUD, receipts (issue + PDF/DOCX),
and financial reports (monthly / annual / overview).

All endpoints require an authenticated courier.
"""
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta
import os
import tempfile
import logging

from models import db, Courier, Delivery, Expense, CourierReceipt
from utils.decorators import token_required, role_required
from utils.tax import VAT_RATE_FLOAT as VAT_RATE

PENSION_RATE = 0.06
STUDY_FUND_RATE = 0.06

courier_business_bp = Blueprint('courier_business', __name__)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _get_courier(current_user):
    return Courier.query.filter_by(user_id=current_user.id).first()


def _month_range(month, year):
    start = datetime(year, month, 1)
    end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    return start, end


def _split_vat(total):
    """Given a VAT-inclusive total, return (base, vat)."""
    total = float(total or 0)
    base = round(total / (1 + VAT_RATE), 2)
    vat = round(total - base, 2)
    return base, vat


def _serialize_expense(e):
    return {
        'id': e.id,
        'category': e.category or 'OTHER',
        'subcategory': '',
        'description': e.description,
        'amount': float(e.total_amount or 0),
        'base_amount': float(e.base_amount or 0),
        'vat_amount': float(e.vat_amount or 0),
        'date': e.expense_date.strftime('%d/%m/%Y') if e.expense_date else '',
        'vendor_name': e.vendor_name,
        'payment_method': e.payment_method,
    }


def _serialize_receipt(r):
    return {
        'id': r.id,
        'receipt_number': r.receipt_number,
        'client_name': r.client_name,
        'client_tax_id': r.client_tax_id,
        'description': r.description,
        'amount': float(r.total_amount or 0),
        'base_amount': float(r.base_amount or 0),
        'vat_amount': float(r.vat_amount or 0),
        'payment_method': r.payment_method,
        'issue_date': r.issue_date.strftime('%d/%m/%Y') if r.issue_date else '',
    }


# ─────────────────────────────────────────────
# Expenses
# ─────────────────────────────────────────────

@courier_business_bp.route('/business/expenses', methods=['GET'])
@token_required
@role_required('courier')
def list_expenses(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        query = Expense.query.filter_by(courier_id=courier.id)

        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        if month and year:
            start, end = _month_range(month, year)
            query = query.filter(Expense.expense_date >= start.date(),
                                 Expense.expense_date < end.date())

        expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()
        return jsonify({'data': [_serialize_expense(e) for e in expenses],
                        'total': len(expenses)}), 200
    except Exception as e:
        logging.error(f"list_expenses error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/expenses', methods=['POST'])
@token_required
@role_required('courier')
def create_expense(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        data = request.get_json() or {}
        description = (data.get('description') or '').strip()
        amount = data.get('amount')

        if not description:
            return jsonify({'error': 'Description is required'}), 400
        try:
            total = float(amount)
        except (TypeError, ValueError):
            return jsonify({'error': 'Valid amount is required'}), 400
        if total <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400

        base, vat = _split_vat(total)

        expense_date = datetime.utcnow().date()
        if data.get('date'):
            for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
                try:
                    expense_date = datetime.strptime(data['date'], fmt).date()
                    break
                except ValueError:
                    continue

        expense = Expense(
            courier_id=courier.id,
            description=description,
            category=data.get('category') or 'OTHER',
            base_amount=base,
            vat_amount=vat,
            total_amount=total,
            expense_date=expense_date,
            vendor_name=data.get('vendor_name'),
            payment_method=data.get('payment_method'),
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify({'message': 'Expense created', 'data': _serialize_expense(expense)}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"create_expense error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/expenses/<int:expense_id>', methods=['DELETE'])
@token_required
@role_required('courier')
def delete_expense(current_user, expense_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        expense = Expense.query.filter_by(id=expense_id, courier_id=courier.id).first()
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404

        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"delete_expense error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/expenses/summary', methods=['GET'])
@token_required
@role_required('courier')
def expenses_summary(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        query = Expense.query.filter_by(courier_id=courier.id)
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        if month and year:
            start, end = _month_range(month, year)
            query = query.filter(Expense.expense_date >= start.date(),
                                 Expense.expense_date < end.date())

        expenses = query.all()
        by_category = {}
        for e in expenses:
            cat = e.category or 'OTHER'
            by_category[cat] = by_category.get(cat, 0.0) + float(e.total_amount or 0)

        return jsonify({
            'data': {
                'total': round(sum(by_category.values()), 2),
                'count': len(expenses),
                'by_category': [{'category': k, 'total': round(v, 2)} for k, v in by_category.items()],
            }
        }), 200
    except Exception as e:
        logging.error(f"expenses_summary error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# Receipts (issue + document generation)
# ─────────────────────────────────────────────

def _next_receipt_number(courier):
    count = CourierReceipt.query.filter_by(courier_id=courier.id).count()
    return f"R-{courier.id}-{datetime.utcnow().year}-{count + 1:04d}"


@courier_business_bp.route('/business/receipts', methods=['GET'])
@token_required
@role_required('courier')
def list_receipts(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        query = CourierReceipt.query.filter_by(courier_id=courier.id)
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        if month and year:
            start, end = _month_range(month, year)
            query = query.filter(CourierReceipt.issue_date >= start.date(),
                                 CourierReceipt.issue_date < end.date())

        receipts = query.order_by(CourierReceipt.issue_date.desc(), CourierReceipt.id.desc()).all()
        return jsonify({'data': [_serialize_receipt(r) for r in receipts],
                        'total': len(receipts)}), 200
    except Exception as e:
        logging.error(f"list_receipts error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/receipts', methods=['POST'])
@token_required
@role_required('courier')
def create_receipt(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        data = request.get_json() or {}
        client_name = (data.get('client_name') or '').strip()
        amount = data.get('amount')

        if not client_name:
            return jsonify({'error': 'Client name is required'}), 400
        try:
            total = float(amount)
        except (TypeError, ValueError):
            return jsonify({'error': 'Valid amount is required'}), 400
        if total <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400

        base, vat = _split_vat(total)

        receipt = CourierReceipt(
            courier_id=courier.id,
            receipt_number=_next_receipt_number(courier),
            client_name=client_name,
            client_tax_id=data.get('client_tax_id'),
            description=data.get('description'),
            base_amount=base,
            vat_amount=vat,
            total_amount=total,
            payment_method=data.get('payment_method'),
            issue_date=datetime.utcnow().date(),
        )
        db.session.add(receipt)
        db.session.commit()
        return jsonify({'message': 'Receipt created', 'data': _serialize_receipt(receipt)}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"create_receipt error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/receipts/<int:receipt_id>/document', methods=['GET'])
@token_required
@role_required('courier')
def receipt_document(current_user, receipt_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        receipt = CourierReceipt.query.filter_by(id=receipt_id, courier_id=courier.id).first()
        if not receipt:
            return jsonify({'error': 'Receipt not found'}), 404

        fmt = (request.args.get('format') or 'pdf').lower()

        if fmt == 'docx':
            from utils.docx_generator import generate_docx
            temp = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
            temp.close()
            pm_map = {'cash': 'מזומן', 'bank_transfer': 'העברה בנקאית',
                      'credit_card': 'כרטיס אשראי', 'bit': 'ביט'}
            lines = [
                (f"קבלה מס'", receipt.receipt_number),
                ("תאריך:", receipt.issue_date.strftime('%d/%m/%Y')),
                ("מאת:", courier.full_name or ''),
                ("לכבוד:", receipt.client_name),
            ]
            if receipt.client_tax_id:
                lines.append(("ע.מ / ח.פ / ת.ז:", receipt.client_tax_id))
            lines.append(("תיאור:", receipt.description or 'שירותי משלוח'))
            lines.append(("סה\"כ לפני מע\"מ:", f"{float(receipt.base_amount):.2f} ₪"))
            lines.append(("מע\"מ:", f"{float(receipt.vat_amount):.2f} ₪"))
            lines.append(("סה\"כ שולם:", f"{float(receipt.total_amount):.2f} ₪"))
            if receipt.payment_method:
                lines.append(("אמצעי תשלום:", pm_map.get(receipt.payment_method, receipt.payment_method)))
            generate_docx(temp.name, f"קבלה {receipt.receipt_number}", lines)
            return send_file(temp.name, as_attachment=True,
                             download_name=f"receipt_{receipt.receipt_number}.docx")

        # Default: PDF
        from utils.pdf_generator import generate_courier_receipt
        temp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp.close()
        generate_courier_receipt(receipt, courier, temp.name)
        return send_file(temp.name, as_attachment=True,
                         download_name=f"receipt_{receipt.receipt_number}.pdf")
    except Exception as e:
        logging.error(f"receipt_document error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# Reports & Overview
# ─────────────────────────────────────────────

def _monthly_revenue(courier, start, end):
    deliveries = Delivery.query.filter(
        Delivery.courier_id == courier.id,
        Delivery.status == 'delivered',
        Delivery.updated_at >= start,
        Delivery.updated_at < end,
    ).all()
    revenue = sum(float(d.price or 0) for d in deliveries)
    return revenue, len(deliveries)


@courier_business_bp.route('/business/overview', methods=['GET'])
@token_required
@role_required('courier')
def business_overview(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        now = datetime.utcnow()
        month = request.args.get('month', now.month, type=int)
        year = request.args.get('year', now.year, type=int)
        start, end = _month_range(month, year)

        revenue, deliveries_count = _monthly_revenue(courier, start, end)

        expenses = Expense.query.filter(
            Expense.courier_id == courier.id,
            Expense.expense_date >= start.date(),
            Expense.expense_date < end.date(),
        ).all()
        expenses_total = sum(float(e.total_amount or 0) for e in expenses)

        receipts_count = CourierReceipt.query.filter(
            CourierReceipt.courier_id == courier.id,
            CourierReceipt.issue_date >= start.date(),
            CourierReceipt.issue_date < end.date(),
        ).count()

        return jsonify({
            'data': {
                'period': f"{month}/{year}",
                'receipts_count': receipts_count,
                'expenses_total': round(expenses_total, 2),
                'monthly_revenue': round(revenue, 2),
                'monthly_profit': round(revenue - expenses_total, 2),
                'deliveries_count': deliveries_count,
            }
        }), 200
    except Exception as e:
        logging.error(f"business_overview error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/reports/monthly', methods=['GET'])
@token_required
@role_required('courier')
def monthly_report(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        now = datetime.utcnow()
        month = request.args.get('month', now.month, type=int)
        year = request.args.get('year', now.year, type=int)
        start, end = _month_range(month, year)

        revenue, deliveries_count = _monthly_revenue(courier, start, end)
        vat_collected = revenue * VAT_RATE

        expenses = Expense.query.filter(
            Expense.courier_id == courier.id,
            Expense.expense_date >= start.date(),
            Expense.expense_date < end.date(),
        ).all()
        expenses_total = sum(float(e.total_amount or 0) for e in expenses)
        vat_deductible = sum(float(e.vat_amount or 0) for e in expenses)

        return jsonify({
            'data': {
                'period': f"{month}/{year}",
                'revenue': round(revenue, 2),
                'deliveries_count': deliveries_count,
                'expenses': round(expenses_total, 2),
                'vat_collected': round(vat_collected, 2),
                'vat_deductible': round(vat_deductible, 2),
                'vat_due': round(vat_collected - vat_deductible, 2),
                'profit': round(revenue - expenses_total, 2),
                'pension_contribution': round(revenue * PENSION_RATE, 2),
                'study_fund_contribution': round(revenue * STUDY_FUND_RATE, 2),
            }
        }), 200
    except Exception as e:
        logging.error(f"monthly_report error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_business_bp.route('/business/reports/annual', methods=['GET'])
@token_required
@role_required('courier')
def annual_report(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        now = datetime.utcnow()
        year = request.args.get('year', now.year, type=int)
        start = datetime(year, 1, 1)
        end = datetime(year + 1, 1, 1)

        revenue, deliveries_count = _monthly_revenue(courier, start, end)

        expenses = Expense.query.filter(
            Expense.courier_id == courier.id,
            Expense.expense_date >= start.date(),
            Expense.expense_date < end.date(),
        ).all()
        expenses_total = sum(float(e.total_amount or 0) for e in expenses)

        low_bracket = 7522 * 12
        if revenue <= low_bracket:
            ss_estimate = revenue * 0.0597
        else:
            ss_estimate = (low_bracket * 0.0597) + ((revenue - low_bracket) * 0.1783)

        return jsonify({
            'data': {
                'year': year,
                'total_revenue': round(revenue, 2),
                'total_expenses': round(expenses_total, 2),
                'net_profit': round(revenue - expenses_total, 2),
                'deliveries_count': deliveries_count,
                'social_security_estimate': round(ss_estimate, 2),
                'monthly_avg': round(revenue / 12, 2),
                'tax_bracket_hint': 'מדרגת מס 10%' if revenue < 84120 else 'מדרגת מס 14%+',
                'pension_contribution': round(revenue * PENSION_RATE, 2),
                'study_fund_contribution': round(revenue * STUDY_FUND_RATE, 2),
            }
        }), 200
    except Exception as e:
        logging.error(f"annual_report error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
