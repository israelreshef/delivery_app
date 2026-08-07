from flask import Blueprint, request, jsonify
from models import db, Courier, Rating, RatingFeedback
from utils.decorators import token_required, role_required
import logging

courier_ratings_bp = Blueprint('courier_ratings', __name__)
logger = logging.getLogger(__name__)


def _get_courier(current_user):
    return Courier.query.filter_by(user_id=current_user.id).first()


@courier_ratings_bp.route('/rating/stats', methods=['GET'])
@token_required
@role_required('courier')
def rating_stats(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        # Customer ratings for this courier
        customer_ratings = Rating.query.filter_by(
            courier_id=courier.id, rated_by='customer'
        ).order_by(Rating.created_at.desc()).all()

        total = len(customer_ratings)
        avg = round(sum(r.rating for r in customer_ratings) / total, 2) if total else float(courier.rating or 0.0)

        # Category breakdowns: derive from stored performance KPIs (normalized 0-1)
        service_quality = round((courier.service_score or 0.0) * 5.0, 1)
        delivery_time = round((courier.efficiency_score or 0.0) * 5.0, 1)
        reliability = round((courier.reliability_score or 0.0) * 5.0, 1)

        return jsonify({
            'data': {
                'average_rating': avg,
                'total_ratings': total,
                'service_quality': service_quality,
                'delivery_time': delivery_time,
                'reliability': reliability,
            }
        }), 200
    except Exception as e:
        logger.error(f"Error fetching rating stats: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_ratings_bp.route('/rating/feedback', methods=['GET'])
@token_required
@role_required('courier')
def rating_feedback(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        feedbacks = RatingFeedback.query.filter_by(courier_id=courier.id)\
            .order_by(RatingFeedback.created_at.desc()).all()

        return jsonify({
            'data': [f.to_dict() for f in feedbacks],
            'total': len(feedbacks),
        }), 200
    except Exception as e:
        logger.error(f"Error fetching rating feedback: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
