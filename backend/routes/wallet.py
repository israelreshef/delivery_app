from flask import Blueprint, jsonify, request
from models import db, User, Customer
from utils.decorators import token_required
import logging
from datetime import datetime

wallet_bp = Blueprint('wallet', __name__)

@wallet_bp.route('/balance', methods=['GET'])
@token_required
def get_wallet_balance(current_user):
    """Get wallet balance"""
    try:
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        if not customer:
            return jsonify({'error': 'Profile not found'}), 404
            
        return jsonify({
            'balance': float(customer.balance),
            'currency': 'ILS'
        }), 200
    except Exception as e:
        logging.error(f"Error fetching wallet balance: {e}")
        return jsonify({'error': str(e)}), 500

@wallet_bp.route('/topup', methods=['POST'])
@token_required
def topup_wallet(current_user):
    """Add funds to digital wallet"""
    try:
        data = request.json
        amount = data.get('amount', 0)
        card_token = data.get('card_token') # Mock for now
        
        if amount <= 0:
            return jsonify({'error': 'Invalid amount'}), 400
            
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        if not customer:
            return jsonify({'error': 'Profile not found'}), 404
            
        # Mock SmartBee Charge here
        # simulate_smartbee_charge(card_token, amount)
        
        customer.balance = float(customer.balance) + float(amount)
        db.session.commit()
        
        return jsonify({
            'message': 'Wallet topped up successfully',
            'new_balance': float(customer.balance)
        }), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error topping up wallet: {e}")
        return jsonify({'error': str(e)}), 500

@wallet_bp.route('/pay', methods=['POST'])
@token_required
def pay_from_wallet(current_user):
    """Pay order from wallet"""
    try:
        data = request.json
        amount = data.get('amount', 0)
        order_id = data.get('order_id')
        
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        if not customer:
            return jsonify({'error': 'Profile not found'}), 404
            
        if float(customer.balance) < float(amount):
            return jsonify({'error': 'Insufficient funds'}), 400
            
        customer.balance = float(customer.balance) - float(amount)
        # Update order payment status if applicable
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment successful',
            'remaining_balance': float(customer.balance)
        }), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error processing wallet payment: {e}")
        return jsonify({'error': str(e)}), 500

@wallet_bp.route('/charge-card', methods=['POST'])
@token_required
def charge_card(current_user):
    """Charge credit card via SmartBee (Directly for an order)"""
    # This would integrate with the existing payments route logic
    return jsonify({'message': 'Direct card charge initiated (Mock)', 'status': 'success'}), 200
