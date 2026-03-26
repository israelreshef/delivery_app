from flask import Blueprint, request, jsonify, send_file
from models import db, Invoice, Delivery, Customer, User
from utils.decorators import token_required, role_required
from utils.pdf_generator import generate_israeli_invoice
import logging
from sqlalchemy.exc import IntegrityError
import os
from datetime import datetime

invoices_bp = Blueprint('invoices', __name__)

# Basic storage path for generated PDFs
PDF_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files', 'invoices')
os.makedirs(PDF_STORAGE_DIR, exist_ok=True)

@invoices_bp.route('/', methods=['POST'])
@token_required
@role_required(['admin', 'finance_admin'])
def create_invoice(current_user):
    """
    Create a new legally compliant Israeli Invoice.
    Requires locking to ensure sequential invoice numbering (מספור רץ אטומי).
    """
    try:
        data = request.get_json()
        delivery_id = data.get('delivery_id')
        document_type = data.get('document_type', 'tax_invoice_receipt')
        
        if not delivery_id:
            return jsonify({'error': 'Delivery ID is required'}), 400
            
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return jsonify({'error': 'Delivery not found'}), 404
            
        if delivery.invoice:
             return jsonify({'error': 'Delivery already has an invoice', 'invoice_number': delivery.invoice.invoice_number}), 400
             
        customer = delivery.customer
        if not customer:
            return jsonify({'error': 'Cannot issue invoice without a linked customer'}), 400
            
        from decimal import Decimal, ROUND_HALF_UP
        
        # 1. Determine VAT Rate (0% for Eilat/Exempt, 18% otherwise via user requirements for 2026)
        vat_rate_applicable = Decimal('0.0') if customer.vat_status == 'exempt' else Decimal('0.18')
        
        subtotal = Decimal(str(data.get('subtotal', delivery.delivery_fee)))
        vat_amount = (subtotal * vat_rate_applicable).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_amount = (subtotal + vat_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # 2. Sequential Numbering Logic (Row-level Locking)
        # Assuming the prefix indicates the type, e.g., INV-001 or RCP-001
        prefix = "INV" if document_type in ('tax_invoice', 'tax_invoice_receipt') else "RCP"
        
        # We need a safe transaction to get max ID
        # In SQLite this is a normal query, in Postgres we would ideally use FOR UPDATE or a Sequence
        last_invoice = Invoice.query.with_for_update().filter(Invoice.invoice_number.like(f"{prefix}-%")).order_by(Invoice.id.desc()).first()
        
        if last_invoice:
            last_num = int(last_invoice.invoice_number.split('-')[1])
            new_num = last_num + 1
        else:
            new_num = 1000 # Start prefix
            
        new_invoice_number = f"{prefix}-{new_num:06d}"
        
        # Setup the invoice object
        new_invoice = Invoice(
            invoice_number=new_invoice_number,
            document_type=document_type,
            customer_id=customer.id,
            delivery_id=delivery.id,
            subtotal=subtotal,
            vat_rate=vat_rate_applicable,
            vat_amount=vat_amount,
            total_amount=total_amount,
            status='paid' if document_type == 'tax_invoice_receipt' else 'sent',
            issue_date=datetime.utcnow()
        )
        
        db.session.add(new_invoice)
        db.session.commit()
        
        # 3. Generate PDF Document
        pdf_filename = f"{new_invoice_number}.pdf"
        output_path = os.path.join(PDF_STORAGE_DIR, pdf_filename)
        generate_israeli_invoice(new_invoice, output_path)
        
        # Optionally, save PDF URL/Path to DB if added as field in models
        # new_invoice.pdf_url = f"/api/invoices/{new_invoice_number}/download"
        # db.session.commit()

        logging.info(f"Generated Legal Invoice {new_invoice_number} for Customer {customer.id}")
        
        return jsonify({
            'message': 'Invoice created successfully',
            'invoice_number': new_invoice_number,
            'total_amount': float(total_amount),
            'download_url': f"/api/invoices/{new_invoice.id}/download"
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        logging.error(f"Race condition in invoice numbering: {e}")
        return jsonify({'error': 'Failed to generate sequential invoice number. Please try again.'}), 409
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating invoice: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@invoices_bp.route('/<int:invoice_id>/download', methods=['GET'])
@token_required
def download_invoice(current_user, invoice_id):
    """Download the generated PDF for an invoice."""
    try:
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        # Security: Customer can only download their own, Admins can download all
        if current_user.user_type == 'customer' and current_user.customer.id != invoice.customer_id:
            return jsonify({'error': 'Unauthorized to view this invoice'}), 403
            
        pdf_filename = f"{invoice.invoice_number}.pdf"
        pdf_path = os.path.join(PDF_STORAGE_DIR, pdf_filename)
        
        if not os.path.exists(pdf_path):
             # Regenerate if missing
             generate_israeli_invoice(invoice, pdf_path)
             
        return send_file(pdf_path, as_attachment=True, download_name=pdf_filename, mimetype='application/pdf')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def list_invoices(current_user):
    """List all recent invoices."""
    try:
        invoices = Invoice.query.order_by(Invoice.issue_date.desc()).limit(100).all()
        result = [{
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'document_type': inv.document_type,
            'customer_name': inv.customer.full_name if inv.customer else 'N/A',
            'total_amount': float(inv.total_amount),
            'status': inv.status,
            'issue_date': inv.issue_date.isoformat()
        } for inv in invoices]
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@invoices_bp.route('/by-order/<int:order_id>', methods=['GET'])
@token_required
def get_invoice_by_order(current_user, order_id):
    """Get invoice metadata for a specific order. Used by the mobile customer app."""
    try:
        delivery = Delivery.query.get(order_id)
        if not delivery:
            return jsonify({'error': 'Order not found'}), 404

        # Customers can only see their own invoices
        if current_user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if not customer or delivery.customer_id != customer.id:
                return jsonify({'error': 'Unauthorized'}), 403

        invoice = delivery.invoice
        if not invoice:
            return jsonify({'error': 'No invoice found for this order'}), 404

        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'total_amount': float(invoice.total_amount),
            'vat_amount': float(invoice.vat_amount),
            'status': invoice.status,
            'issue_date': invoice.issue_date.isoformat() if invoice.issue_date else None,
            'download_url': f"/api/invoices/by-order/{order_id}/download"
        }), 200

    except Exception as e:
        logging.error(f"Error fetching invoice by order: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@invoices_bp.route('/by-order/<int:order_id>/download', methods=['GET'])
@token_required
def download_invoice_by_order(current_user, order_id):
    """Download the PDF invoice for a specific order. Used by the mobile customer app."""
    try:
        delivery = Delivery.query.get(order_id)
        if not delivery:
            return jsonify({'error': 'Order not found'}), 404

        # Customers can only download their own invoices
        if current_user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if not customer or delivery.customer_id != customer.id:
                return jsonify({'error': 'Unauthorized'}), 403

        invoice = delivery.invoice
        if not invoice:
            return jsonify({'error': 'No invoice found for this order'}), 404

        pdf_filename = f"{invoice.invoice_number}.pdf"
        pdf_path = os.path.join(PDF_STORAGE_DIR, pdf_filename)

        if not os.path.exists(pdf_path):
            generate_israeli_invoice(invoice, pdf_path)

        return send_file(pdf_path, as_attachment=False, download_name=pdf_filename, mimetype='application/pdf')

    except Exception as e:
        logging.error(f"Error downloading invoice by order: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

