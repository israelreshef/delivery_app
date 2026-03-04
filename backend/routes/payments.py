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
import logging

payments_bp = Blueprint('payments', __name__)

SMARTBEE_API_KEY = os.environ.get('SMARTBEE_API_KEY')
SMARTBEE_COMPANY_ID = os.environ.get('SMARTBEE_COMPANY_ID')
SMARTBEE_API_URL = "https://server.smartbee.co.il/api/v1" # Example/Standard endpoint

@payments_bp.route('/create-intent', methods=['POST'])
@token_required
def create_payment_intent(current_user):
    """
    יצירת דרישת תשלום מול חברת סליקה SmartBee.
    אם מפתח API לא קיים, מוחזר Mock (סימולציה) כדי לאפשר פיתוח.
    """
    try:
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'ILS')
        description = data.get('description', 'תשלום עבור משלוח TZIR')
        
        if not amount:
            return jsonify({'error': 'Amount is required'}), 400
            
        logging.info(f"Creating SmartBee payment request for {amount} {currency}")
        
        if SMARTBEE_API_KEY and SMARTBEE_COMPANY_ID:
            # --- Actual SmartBee Logic ---
            # SmartBee usually requires generating a payment document or a payment link.
            # This is a boilerplate structure for their API.
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {SMARTBEE_API_KEY}'
            }
            payload = {
                'companyId': SMARTBEE_COMPANY_ID,
                'amount': float(amount),
                'currency': currency,
                'description': description,
                'customerName': current_user.username,
                'customerEmail': getattr(current_user, 'email', ''),
                'successUrl': f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success",
                'cancelUrl': f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/cancel"
            }
            
            # Example API Call (Adjust path based on exact SmartBee docs when provided)
            # response = requests.post(f"{SMARTBEE_API_URL}/payments/create", json=payload, headers=headers)
            # response.raise_for_status()
            # result = response.json()
            
            # return jsonify({
            #     'paymentUrl': result.get('payment_url'),
            #     'transactionId': result.get('transaction_id'),
            #     'isMock': False
            # }), 200
            
            # Temporary mock within the 'live' block until exact API endpoint is confirmed
            return jsonify({
                'error': 'SmartBee configured but exact endpoint pending API docs',
                'isMock': False
            }), 501
            
        else:
            # --- Mock Fallback ---
            logging.warning("SMARTBEE_API_KEY is missing. Using MOCK payment intent.")
            mock_transaction_id = f"sb_mock_{uuid.uuid4().hex[:16]}"
            
            return jsonify({
                'paymentUrl': f"http://localhost:3000/mock-payment-page/{mock_transaction_id}",
                'transactionId': mock_transaction_id,
                'isMock': True
            }), 200

    except Exception as e:
        logging.error(f"Error creating SmartBee payment intent: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/webhook', methods=['POST'])
def smartbee_webhook():
    """
    נקודת קצה לקבלת עדכונים (Webhooks) מ-SmartBee על עסקאות שאושרו.
    """
    payload = request.json
    
    logging.info("Received SmartBee Webhook")
    
    if not SMARTBEE_API_KEY:
         logging.warning("SMARTBEE keys missing. Bypassing Webhook validation (MOCK).")
         return jsonify({'status': 'ignored_no_secret'}), 200
         
    try:
        # Validate SmartBee Webhook signature according to their docs
        # (Usually an HMAC signature in headers or a token in the payload)
        
        transaction_id = payload.get('transactionId')
        status = payload.get('status')
        
        if status == 'approved':
             logging.info(f"SmartBee Payment {transaction_id} approved!")
             # Update DB logic here (e.g., mark invoice/delivery as paid)
             
        elif status == 'declined':
             logging.info(f"SmartBee Payment {transaction_id} declined.")
             
    except Exception as e:
        logging.error(f"Error processing SmartBee webhook: {e}")
        return jsonify({'error': 'Webhook processing failed'}), 500

    return jsonify({'status': 'success'}), 200
