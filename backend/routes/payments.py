from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
import sys
from pathlib import Path

# Import from parent directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Invoice, Payment
from utils.decorators import token_required
import logging

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/create-intent', methods=['POST'])
@token_required
def create_payment_intent(current_user):
    """
    יצירת כוונת תשלום (Stripe PaymentIntent)
    כרגע זהו Mock שמחזיר הצלחה מדומיין.
    """
    try:
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'ILS')
        
        if not amount:
            return jsonify({'error': 'Amount is required'}), 400
            
        logging.info(f"Creating payment intent for {amount} {currency}")
        
        # --- Stripe Logic Would Go Here ---
        # intent = stripe.PaymentIntent.create(
        #     amount=int(float(amount) * 100),
        #     currency=currency,
        #     metadata={'user_id': current_user.id}
        # )
        # client_secret = intent.client_secret
        # ----------------------------------
        
        # MOCK Response
        client_secret = f"pi_mock_{uuid.uuid4().hex[:16]}_secret_{uuid.uuid4().hex[:6]}"
        
        return jsonify({
            'clientSecret': client_secret,
            'id': f"pi_mock_{uuid.uuid4().hex[:16]}"
        }), 200

    except Exception as e:
        logging.error(f"Error creating payment intent: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """
    נקודת קצה לקבלת וובהוקים מ-Stripe
    """
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    logging.info("Received Webhook")
    
    # Verify webhook signature...
    
    return jsonify({'status': 'success'}), 200
