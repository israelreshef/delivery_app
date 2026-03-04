from flask import Blueprint, request, jsonify, send_from_directory
from models import db, Expense, Invoice, Customer, Courier, CompanySettings, FinanceDocument
from utils.decorators import token_required, role_required
from datetime import datetime
import logging
from sqlalchemy import func
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import timedelta

finances_bp = Blueprint('finances', __name__)

FINANCE_DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files', 'finance_docs')
os.makedirs(FINANCE_DOCS_DIR, exist_ok=True)

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


@finances_bp.route('/documents', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def list_finance_documents(current_user):
    try:
        year = request.args.get('year', type=int)
        doc_type = request.args.get('doc_type')
        status = request.args.get('status')

        query = FinanceDocument.query
        if year:
            query = query.filter(FinanceDocument.year == year)
        if doc_type:
            query = query.filter(FinanceDocument.doc_type == doc_type)
        if status:
            query = query.filter(FinanceDocument.status == status)

        docs = query.order_by(FinanceDocument.created_at.desc()).all()
        return jsonify([{
            'id': d.id,
            'title': d.title,
            'description': d.description,
            'doc_type': d.doc_type,
            'authority': d.authority,
            'submitted_by': d.submitted_by,
            'entity_type': d.entity_type,
            'status': d.status,
            'year': d.year,
            'period': d.period,
            'due_date': d.due_date.isoformat() if d.due_date else None,
            'filed_date': d.filed_date.isoformat() if d.filed_date else None,
            'amount_due': float(d.amount_due) if d.amount_due is not None else None,
            'file_name': d.file_name,
            'mime_type': d.mime_type,
            'file_size': d.file_size,
            'created_at': d.created_at.isoformat() if d.created_at else None
        } for d in docs]), 200
    except Exception as e:
        logging.error(f"Error listing finance documents: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@finances_bp.route('/documents', methods=['POST'])
@token_required
@role_required(['admin', 'finance_admin'])
def upload_finance_document(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        title = request.form.get('title') or file.filename
        doc_type = request.form.get('doc_type') or 'other'
        year = request.form.get('year', type=int)
        period = request.form.get('period')
        authority = request.form.get('authority')
        submitted_by = request.form.get('submitted_by')
        entity_type = request.form.get('entity_type')
        status = request.form.get('status') or 'archived'
        description = request.form.get('description')
        due_date_str = request.form.get('due_date')
        filed_date_str = request.form.get('filed_date')
        amount_due = request.form.get('amount_due', type=float)

        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None
        filed_date = datetime.strptime(filed_date_str, '%Y-%m-%d').date() if filed_date_str else None

        ext = os.path.splitext(file.filename)[1].lower()
        safe_name = secure_filename(os.path.splitext(file.filename)[0])
        stored_name = f"{safe_name}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(FINANCE_DOCS_DIR, stored_name)
        file.save(file_path)

        doc = FinanceDocument(
            title=title,
            description=description,
            doc_type=doc_type,
            authority=authority,
            submitted_by=submitted_by,
            entity_type=entity_type,
            status=status,
            year=year,
            period=period,
            due_date=due_date,
            filed_date=filed_date,
            amount_due=amount_due,
            file_name=stored_name,
            file_path=file_path,
            mime_type=file.mimetype,
            file_size=os.path.getsize(file_path),
            uploaded_by=current_user.id
        )
        db.session.add(doc)
        db.session.commit()

        return jsonify({'success': True, 'document_id': doc.id}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error uploading finance document: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@finances_bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def download_finance_document(current_user, doc_id):
    try:
        doc = FinanceDocument.query.get_or_404(doc_id)
        return send_from_directory(FINANCE_DOCS_DIR, doc.file_name, as_attachment=True)
    except Exception as e:
        logging.error(f"Error downloading finance document: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@finances_bp.route('/documents/<int:doc_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'finance_admin'])
def update_finance_document(current_user, doc_id):
    try:
        doc = FinanceDocument.query.get_or_404(doc_id)
        data = request.json or {}

        editable_fields = [
            'title', 'description', 'doc_type', 'authority', 'submitted_by',
            'entity_type', 'status', 'year', 'period', 'amount_due'
        ]
        for key in editable_fields:
            if key in data:
                setattr(doc, key, data[key])

        due_date_str = data.get('due_date')
        filed_date_str = data.get('filed_date')
        if due_date_str is not None:
            doc.due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None
        if filed_date_str is not None:
            doc.filed_date = datetime.strptime(filed_date_str, '%Y-%m-%d').date() if filed_date_str else None

        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating finance document: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@finances_bp.route('/documents/alerts', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def finance_document_alerts(current_user):
    try:
        days = request.args.get('days', 30, type=int)
        today = datetime.utcnow().date()
        soon_limit = today + timedelta(days=days)

        base_query = FinanceDocument.query.filter(FinanceDocument.due_date.isnot(None))
        active_query = base_query.filter(FinanceDocument.status != 'accepted')

        overdue = active_query.filter(FinanceDocument.due_date < today).order_by(FinanceDocument.due_date.asc()).all()
        due_soon = active_query.filter(FinanceDocument.due_date >= today, FinanceDocument.due_date <= soon_limit).order_by(FinanceDocument.due_date.asc()).all()

        def serialize(d):
            return {
                'id': d.id,
                'title': d.title,
                'doc_type': d.doc_type,
                'authority': d.authority,
                'status': d.status,
                'year': d.year,
                'due_date': d.due_date.isoformat() if d.due_date else None
            }

        return jsonify({
            'days': days,
            'overdue': [serialize(d) for d in overdue],
            'due_soon': [serialize(d) for d in due_soon],
            'overdue_count': len(overdue),
            'due_soon_count': len(due_soon)
        }), 200
    except Exception as e:
        logging.error(f"Error fetching finance alerts: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
