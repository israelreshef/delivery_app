from flask import Blueprint, request, jsonify
from models import db, Expense, Invoice, Customer, Courier, CompanySettings
from utils.decorators import token_required, role_required
from datetime import datetime
import logging
from sqlalchemy import func

finances_bp = Blueprint('finances', __name__)

@finances_bp.route('/income/manual', methods=['POST'])
@token_required
@role_required(['admin', 'finance_admin'])
def create_manual_income(current_user):
    """הזנת הכנסה ידנית (קבלות/חשבוניות משנים עברו או הכנסות מיוחדות)"""
    try:
        data = request.json
        description = data.get('description')
        subtotal = float(data.get('subtotal', 0))
        vat_rate = float(data.get('vat_rate', 0.17))
        issue_date_str = data.get('issue_date') # Format: YYYY-MM-DD
        customer_id = data.get('customer_id')
        
        if not description or subtotal <= 0:
            return jsonify({'error': 'Description and subtotal are required'}), 400
            
        issue_date = datetime.strptime(issue_date_str, '%Y-%m-%d') if issue_date_str else datetime.utcnow()
        vat_amount = round(subtotal * vat_rate, 2)
        total_amount = round(subtotal + vat_amount, 2)
        
        # Generate a manual invoice number prefix
        month_year = issue_date.strftime('%y%m')
        prefix = f"MAN-{month_year}"
        last_manual = Invoice.query.filter(Invoice.invoice_number.like(f"{prefix}-%")).order_by(Invoice.id.desc()).first()
        if last_manual:
            last_num = int(last_manual.invoice_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
            
        invoice_number = f"{prefix}-{new_num:04d}"
        
        new_income = Invoice(
            invoice_number=invoice_number,
            document_type='manual_receipt',
            customer_id=customer_id,
            subtotal=subtotal,
            vat_rate=vat_rate,
            vat_amount=vat_amount,
            total_amount=total_amount,
            status='paid',
            issue_date=issue_date,
            notes=description
        )
        
        db.session.add(new_income)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Manual income recorded',
            'invoice_number': invoice_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finances_bp.route('/expense/manual', methods=['POST'])
@token_required
@role_required(['admin', 'finance_admin'])
def create_manual_expense(current_user):
    """הזנת הוצאה ידנית (חשבוניות ספקים, קבלנים, הוצאות תפעול)"""
    try:
        data = request.json
        description = data.get('description')
        base_amount = float(data.get('base_amount', 0))
        vat_amount = float(data.get('vat_amount', 0))
        withholding_tax = float(data.get('withholding_tax', 0))
        expense_date_str = data.get('expense_date')
        vendor_name = data.get('vendor_name')
        courier_id = data.get('courier_id')
        payment_method = data.get('payment_method', 'Bank Transfer')
        is_contractor = data.get('is_contractor', False)
        
        if not description or base_amount <= 0:
            return jsonify({'error': 'Description and base amount are required'}), 400
            
        expense_date = datetime.strptime(expense_date_str, '%Y-%m-%d').date() if expense_date_str else datetime.utcnow().date()
        total_amount = round(base_amount + vat_amount - withholding_tax, 2)
        
        new_expense = Expense(
            description=description,
            base_amount=base_amount,
            vat_amount=vat_amount,
            withholding_tax_deducted=withholding_tax,
            total_amount=total_amount,
            expense_date=expense_date,
            vendor_name=vendor_name,
            courier_id=courier_id,
            payment_method=payment_method,
            is_contractor_invoice=is_contractor,
            category=data.get('category', 'operational')
        )
        
        db.session.add(new_expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Manual expense recorded',
            'expense_id': new_expense.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@finances_bp.route('/reports/preview', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def get_report_preview(current_user):
    """תצוגה מקדימה של נתוני הדו"ח (רשימת תנועות) לפני ייצוא"""
    try:
        rtype = request.args.get('type', 'pcn874')
        month = request.args.get('month', datetime.utcnow().month, type=int)
        year = request.args.get('year', datetime.utcnow().year, type=int)
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        result = []
        
        if rtype == 'pcn874' or rtype == 'sales':
            invoices = Invoice.query.filter(
                Invoice.issue_date >= start_date,
                Invoice.issue_date < end_date
            ).all()
            for inv in invoices:
                result.append({
                    'type': 'sale',
                    'id': inv.invoice_number,
                    'date': inv.issue_date.strftime('%Y-%m-%d'),
                    'entity': inv.customer.full_name if inv.customer else 'Manual',
                    'tax_id': inv.customer.tax_id if inv.customer and hasattr(inv.customer, 'tax_id') else '',
                    'base': float(inv.subtotal),
                    'vat': float(inv.vat_amount),
                    'total': float(inv.total_amount),
                    'status': inv.status
                })

        if rtype == 'pcn874' or rtype == 'purchases':
            expenses = Expense.query.filter(
                Expense.expense_date >= start_date.date(),
                Expense.expense_date < end_date.date()
            ).all()
            for exp in expenses:
                result.append({
                    'type': 'purchase',
                    'id': f"EXP-{exp.id}",
                    'date': exp.expense_date.strftime('%Y-%m-%d'),
                    'entity': exp.courier.full_name if exp.courier else exp.vendor_name,
                    'tax_id': exp.courier.tax_id if exp.courier else '',
                    'base': float(exp.base_amount),
                    'vat': float(exp.vat_amount),
                    'tax_deducted': float(exp.withholding_tax_deducted),
                    'total': float(exp.total_amount),
                    'category': exp.category
                })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
