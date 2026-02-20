from flask import Blueprint, request, jsonify
from models import db, Rating, Delivery, Courier
from utils.decorators import token_required
from datetime import datetime

ratings_bp = Blueprint('ratings', __name__)

@ratings_bp.route('/', methods=['POST'])
@token_required
def submit_rating(current_user):
    """
    Courier rates a delivery (customer/shop)
    """
    try:
        data = request.get_json()
        delivery_id = data.get('delivery_id')
        rating_value = data.get('rating')
        comment = data.get('comment')

        if not delivery_id or not rating_value:
            return jsonify({'error': 'Missing delivery_id or rating'}), 400

        # Verify delivery existence and status
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return jsonify({'error': 'Delivery not found'}), 404

        # Verify courier ownership
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier or delivery.courier_id != courier.id:
            return jsonify({'error': 'Unauthorized: Not your delivery'}), 403

        if delivery.status != 'delivered':
            return jsonify({'error': 'Can only rate delivered missions'}), 400

        # Check if already rated
        existing_rating = Rating.query.filter_by(delivery_id=delivery_id, rated_by='courier').first()
        if existing_rating:
            return jsonify({'error': 'Already rated this delivery'}), 409

        new_rating = Rating(
            delivery_id=delivery_id,
            customer_id=delivery.customer_id,
            courier_id=courier.id,
            rated_by='courier',
            rating=rating_value,
            comment=comment
        )

        db.session.add(new_rating)
        db.session.commit()

        return jsonify({'message': 'Rating submitted successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@ratings_bp.route('/customer', methods=['POST'])
@token_required
def submit_customer_rating(current_user):
    """
    Customer rates a courier
    """
    try:
        data = request.get_json()
        delivery_id = data.get('delivery_id')
        rating_value = data.get('rating')
        comment = data.get('comment')

        if not delivery_id or not rating_value:
            return jsonify({'error': 'Missing delivery_id or rating'}), 400

        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return jsonify({'error': 'Delivery not found'}), 404

        # Verify customer ownership
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        if not customer or delivery.customer_id != customer.id:
            return jsonify({'error': 'Unauthorized: Not your delivery'}), 403

        if delivery.status != 'delivered':
            return jsonify({'error': 'Can only rate delivered missions'}), 400

        # Check if already rated
        existing_rating = Rating.query.filter_by(delivery_id=delivery_id, rated_by='customer').first()
        if existing_rating:
            return jsonify({'error': 'Already rated this delivery'}), 409

        new_rating = Rating(
            delivery_id=delivery_id,
            customer_id=customer.id,
            courier_id=delivery.courier_id,
            rated_by='customer',
            rating=rating_value,
            comment=comment
        )

        db.session.add(new_rating)
        db.session.commit()

        # --- Trigger Gamification Update ---
        try:
            from services.gamification import GamificationService
            GamificationService.update_courier_performance(delivery.courier_id)
        except Exception as e:
            import logging
            logging.error(f"Gamification update failed: {e}")

        return jsonify({'message': 'Rating submitted successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
