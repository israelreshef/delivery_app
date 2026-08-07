from flask import Blueprint, jsonify, request
from models import db, Courier, CourierWallet, CourierLedgerEntry, WithdrawalRequest, CourierPaymentMethod
from utils.decorators import token_required
from datetime import datetime
import json
import logging

courier_wallet_bp = Blueprint('courier_wallet', __name__)

def _get_or_create_wallet(courier):
    wallet = CourierWallet.query.filter_by(courier_id=courier.id).first()
    if not wallet:
        wallet = CourierWallet(courier_id=courier.id, balance=0.00)
        db.session.add(wallet)
        db.session.commit()
    return wallet

def _add_ledger_entry(wallet, amount, entry_type, reference_id, description):
    before = float(wallet.balance)
    after = before + amount
    wallet.balance = after
    entry = CourierLedgerEntry(
        wallet_id=wallet.id,
        amount=amount,
        entry_type=entry_type,
        reference_id=reference_id,
        description=description,
        balance_before=before,
        balance_after=after
    )
    db.session.add(entry)
    return entry

@courier_wallet_bp.route('/wallet', methods=['GET'])
@token_required
def get_wallet(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        wallet = _get_or_create_wallet(courier)
        pending = WithdrawalRequest.query.filter_by(courier_id=courier.id, status='pending').all()
        return jsonify({
            'balance': float(wallet.balance),
            'currency': wallet.currency,
            'pending_withdrawals': [{'id': w.id, 'amount': float(w.amount), 'created_at': w.created_at.isoformat() if w.created_at else None} for w in pending]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching wallet: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/withdraw', methods=['POST'])
@token_required
def request_withdrawal(current_user):
    try:
        data = request.json
        amount = float(data.get('amount', 0))
        payment_details = data.get('payment_details', '')
        if amount <= 0:
            return jsonify({'error': 'Invalid amount'}), 400
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        wallet = _get_or_create_wallet(courier)
        if float(wallet.balance) < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        _add_ledger_entry(wallet, -amount, 'withdrawal', None, f'Withdrawal request #{amount} {payment_details}')
        req = WithdrawalRequest(courier_id=courier.id, amount=amount, payment_details=payment_details)
        db.session.add(req)
        db.session.commit()
        return jsonify({
            'message': 'Withdrawal request created',
            'withdrawal_id': req.id,
            'new_balance': float(wallet.balance),
            'status': 'pending'
        }), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating withdrawal: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/history', methods=['GET'])
@token_required
def get_ledger_history(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        wallet = _get_or_create_wallet(courier)
        entries = CourierLedgerEntry.query.filter_by(wallet_id=wallet.id).order_by(CourierLedgerEntry.created_at.desc()).limit(100).all()
        return jsonify({
            'entries': [{
                'id': e.id,
                'amount': float(e.amount),
                'entry_type': e.entry_type,
                'description': e.description,
                'balance_before': float(e.balance_before),
                'balance_after': float(e.balance_after),
                'created_at': e.created_at.isoformat() if e.created_at else None
            } for e in entries]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching ledger: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/withdrawals', methods=['GET'])
@token_required
def get_withdrawal_history(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        requests = WithdrawalRequest.query.filter_by(courier_id=courier.id).order_by(WithdrawalRequest.created_at.desc()).limit(50).all()
        return jsonify({
            'withdrawals': [{
                'id': r.id,
                'amount': float(r.amount),
                'status': r.status,
                'payment_details': r.payment_details,
                'admin_notes': r.admin_notes,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'processed_at': r.processed_at.isoformat() if r.processed_at else None
            } for r in requests]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching withdrawals: {e}")
        return jsonify({'error': str(e)}), 500


# ─── Payment Methods ──────────────────────────────────────────────────────

@courier_wallet_bp.route('/wallet/payment-methods', methods=['GET'])
@token_required
def get_payment_methods(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        methods = CourierPaymentMethod.query.filter_by(courier_id=courier.id).order_by(CourierPaymentMethod.created_at.desc()).all()
        return jsonify({
            'payment_methods': [{
                'id': m.id,
                'method_type': m.method_type,
                'label': m.label,
                'details': json.loads(m.details) if isinstance(m.details, str) else m.details,
                'is_default': m.is_default,
                'created_at': m.created_at.isoformat() if m.created_at else None
            } for m in methods]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching payment methods: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/payment-methods', methods=['POST'])
@token_required
def add_payment_method(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        data = request.json
        if not data or not data.get('method_type') or not data.get('label') or not data.get('details'):
            return jsonify({'error': 'method_type, label, and details are required'}), 400
        method = CourierPaymentMethod(
            courier_id=courier.id,
            method_type=data['method_type'],
            label=data['label'],
            details=json.dumps(data['details']) if isinstance(data['details'], dict) else data['details'],
            is_default=data.get('is_default', False)
        )
        if method.is_default:
            CourierPaymentMethod.query.filter_by(courier_id=courier.id, is_default=True).update({'is_default': False})
        db.session.add(method)
        db.session.commit()
        return jsonify({
            'id': method.id,
            'method_type': method.method_type,
            'label': method.label,
            'details': json.loads(method.details),
            'is_default': method.is_default
        }), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error adding payment method: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/payment-methods/<int:method_id>/default', methods=['PUT'])
@token_required
def set_default_payment_method(current_user, method_id):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        method = CourierPaymentMethod.query.filter_by(id=method_id, courier_id=courier.id).first()
        if not method:
            return jsonify({'error': 'Payment method not found'}), 404
        CourierPaymentMethod.query.filter_by(courier_id=courier.id, is_default=True).update({'is_default': False})
        method.is_default = True
        db.session.commit()
        return jsonify({'message': 'Default payment method updated'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error setting default payment method: {e}")
        return jsonify({'error': str(e)}), 500

@courier_wallet_bp.route('/wallet/payment-methods/<int:method_id>', methods=['DELETE'])
@token_required
def delete_payment_method(current_user, method_id):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        method = CourierPaymentMethod.query.filter_by(id=method_id, courier_id=courier.id).first()
        if not method:
            return jsonify({'error': 'Payment method not found'}), 404
        db.session.delete(method)
        db.session.commit()
        return jsonify({'message': 'Payment method deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting payment method: {e}")
        return jsonify({'error': str(e)}), 500
