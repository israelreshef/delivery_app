from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
import sys
import os
import requests
from pathlib import Path

# Import from parent directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Invoice, Payment
from utils.decorators import token_required
from utils.validation_helpers import is_valid_amount
import logging

payments_bp = Blueprint('payments', __name__)

SMARTBEE_API_KEY = os.environ.get('SMARTBEE_API_KEY')
SMARTBEE_COMPANY_ID = os.environ.get('SMARTBEE_COMPANY_ID')
SMARTBEE_API_URL = "https://server.smartbee.co.il/api/v1"


@payments_bp.route('/process-mock', methods=['POST'])
@token_required
def process_mock_payment(current_user):
    """
    Mock payment processing - simulates credit card payment.
    Accepts card details and always returns 'approved'.
    When real SmartBee API is connected, this will be replaced.
    """
    try:
        data = request.json or {}
        amount = data.get('amount')
        order_id = data.get('order_id')
        card_number = data.get('card_number', '')
        card_expiry = data.get('card_expiry', '')
        card_cvv = data.get('card_cvv', '')
        card_holder = data.get('card_holder', '')
        currency = data.get('currency', 'ILS')

        if not amount or not is_valid_amount(amount):
            return jsonify({'error': 'Valid amount is required'}), 400

        if not order_id:
            return jsonify({'error': 'order_id is required'}), 400

        # Basic card validation (mock)
        card_last4 = card_number[-4:] if len(card_number) >= 4 else '0000'

        # Generate mock transaction ID
        transaction_id = f"txn_mock_{uuid.uuid4().hex[:12]}"

        # Update invoice status to paid
        invoice = Invoice.query.filter_by(delivery_id=order_id).first()
        if invoice:
            invoice.status = 'paid'
            invoice.paid_at = datetime.utcnow()
            invoice.payment_method = 'credit_card'

        # Create payment record
        payment = Payment(
            invoice_id=invoice.id if invoice else None,
            amount=float(amount),
            payment_method='credit_card',
            transaction_id=transaction_id,
            status='completed',
            payment_date=datetime.utcnow()
        )
        db.session.add(payment)
        db.session.commit()

        logging.info(f"Mock payment processed: {transaction_id} for order {order_id}, amount {amount} {currency}")

        return jsonify({
            'success': True,
            'status': 'approved',
            'transaction_id': transaction_id,
            'amount': float(amount),
            'currency': currency,
            'card_last4': card_last4,
            'isMock': True,
            'message': 'Payment processed successfully (mock)'
        }), 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error processing mock payment: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/order/<int:order_id>/status', methods=['GET'])
@token_required
def get_payment_status(current_user, order_id):
    """Get payment status for a specific order."""
    try:
        invoice = Invoice.query.filter_by(delivery_id=order_id).first()
        if not invoice:
            return jsonify({'status': 'no_invoice', 'paid': False}), 200

        payment = Payment.query.filter_by(invoice_id=invoice.id).order_by(Payment.payment_date.desc()).first()

        return jsonify({
            'status': invoice.status,
            'paid': invoice.status == 'paid',
            'total_amount': float(invoice.total_amount),
            'payment_method': invoice.payment_method,
            'paid_at': invoice.paid_at.isoformat() if invoice.paid_at else None,
            'transaction_id': payment.transaction_id if payment else None,
            'currency': 'ILS'
        }), 200

    except Exception as e:
        logging.error(f"Error getting payment status: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/create-intent', methods=['POST'])
@token_required
def create_payment_intent(current_user):
    """
    Create a payment intent via SmartBee.
    Falls back to mock if API key is not configured.
    """
    try:
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'ILS')
        description = data.get('description', 'Payment for TZIR delivery')

        if not amount or not is_valid_amount(amount):
            return jsonify({'error': 'Valid amount is required'}), 400

        if SMARTBEE_API_KEY and SMARTBEE_COMPANY_ID:
            # Real SmartBee integration (pending API docs)
            return jsonify({
                'error': 'SmartBee configured but exact endpoint pending API docs',
                'isMock': False
            }), 501
        else:
            # Mock fallback
            logging.warning("SMARTBEE_API_KEY is missing. Using MOCK payment intent.")
            mock_transaction_id = f"sb_mock_{uuid.uuid4().hex[:16]}"

            return jsonify({
                'paymentUrl': f"http://localhost:3000/mock-payment-page/{mock_transaction_id}",
                'transactionId': mock_transaction_id,
                'isMock': True
            }), 200

    except Exception as e:
        logging.error(f"Error creating payment intent: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/webhook', methods=['POST'])
def smartbee_webhook():
    """Webhook endpoint for SmartBee payment updates."""
    payload = request.json
    logging.info("Received SmartBee Webhook")

    if not SMARTBEE_API_KEY:
        logging.warning("SMARTBEE keys missing. Bypassing Webhook validation (MOCK).")
        return jsonify({'status': 'ignored_no_secret'}), 200

    try:
        transaction_id = payload.get('transactionId')
        status = payload.get('status')

        if status == 'approved':
            logging.info(f"SmartBee Payment {transaction_id} approved!")
        elif status == 'declined':
            logging.info(f"SmartBee Payment {transaction_id} declined.")

    except Exception as e:
        logging.error(f"Error processing SmartBee webhook: {e}")
        return jsonify({'error': 'Webhook processing failed'}), 500

    return jsonify({'status': 'success'}), 200
