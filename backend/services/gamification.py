from models import db, Courier, Rating, Delivery
from datetime import datetime, timedelta
import logging

class GamificationService:
    @staticmethod
    def update_courier_performance(courier_id):
        """
        Recalculates performance KPIs for a courier based on historical data.
        Reflects categories from performance_rating_questions.md.
        """
        courier = Courier.query.get(courier_id)
        if not courier:
            return

        try:
            # 1. Reliability Score (Punctuality)
            # Calculate % of deliveries completed within estimated time
            deliveries = Delivery.query.filter(
                Delivery.courier_id == courier.id,
                Delivery.status == 'delivered',
                Delivery.actual_delivery_time.isnot(None),
                Delivery.estimated_delivery_time.isnot(None)
            ).all()
            
            if deliveries:
                on_time_count = sum(1 for d in deliveries if d.actual_delivery_time <= d.estimated_delivery_time)
                courier.reliability_score = on_time_count / len(deliveries)
            else:
                courier.reliability_score = 1.0 # Default for new couriers

            # 2. Service Score (Customer Ratings)
            # Average of last 50 ratings
            ratings = Rating.query.filter_by(courier_id=courier.id, rated_by='customer').order_by(Rating.created_at.desc()).limit(50).all()
            if ratings:
                avg_rating = sum(r.rating for r in ratings) / len(ratings)
                courier.service_score = avg_rating / 5.0 # Normalize to 0-1
                courier.rating = avg_rating
            else:
                courier.service_score = 1.0

            # 3. Integrity Score (Mocked for now, based on % of incidents)
            # In a real app, this would track reported damages or complaints
            courier.integrity_score = 1.0 # Placeholder

            # 4. Efficiency Score (Volume vs Distance)
            if courier.total_deliveries > 0:
                # Experience bonus: more deliveries = better efficiency up to a point
                experience_factor = min(courier.total_deliveries / 500.0, 1.0) 
                courier.efficiency_score = 0.5 + (experience_factor * 0.5)
            else:
                courier.efficiency_score = 0.5

            # 5. Performance Index (Weighted sum 0-100)
            # Weights: Reliability 40%, Service 30%, Efficiency 20%, Integrity 10%
            weights = {
                'reliability': 0.40,
                'service': 0.30,
                'efficiency': 0.20,
                'integrity': 0.10
            }
            
            pi = (
                (courier.reliability_score * weights['reliability']) +
                (courier.service_score * weights['service']) +
                (courier.efficiency_score * weights['efficiency']) +
                (courier.integrity_score * weights['integrity'])
            ) * 100
            
            courier.performance_index = round(pi, 1)
            
            db.session.commit()
            logging.info(f"🏆 Updated Performance Index for {courier.full_name}: {courier.performance_index}")
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error updating gamification: {e}")

    @staticmethod
    def get_rank_badge(performance_index):
        """Returns a badge based on performance."""
        if performance_index >= 95: return "Legendary Platinum"
        if performance_index >= 85: return "Elite Gold"
        if performance_index >= 70: return "Professional Silver"
        return "Standard"
