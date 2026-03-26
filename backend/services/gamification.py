from models import db, Courier, Rating, Delivery, CourierGamification, DailyMission, ShiftSession, Milestone, EarnedMilestone
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
            logging.info(f" Updated Performance Index for {courier.full_name}: {courier.performance_index}")
            
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

    @staticmethod
    def award_xp(courier_id, amount, reason=""):
        """מעניק XP לשליח ובודק עליית רמה"""
        try:
            gamification = CourierGamification.query.filter_by(courier_id=courier_id).first()
            if not gamification:
                gamification = CourierGamification(courier_id=courier_id, level=1, xp=0)
                db.session.add(gamification)

            gamification.xp += amount
            logging.info(f" Courier {courier_id} awarded {amount} XP for: {reason}. Total XP: {gamification.xp}")

            # Check Level Up
            next_level_xp = gamification.level * 1000
            if gamification.xp >= next_level_xp:
                gamification.level += 1
                logging.info(f" Courier {courier_id} LEVELED UP to Level {gamification.level}!")
                # TODO: Trigger real-time push notification for level up
                
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error awarding XP: {e}")

    @staticmethod
    def process_delivery_completion(courier_id, delivery_id):
        """נקרא כאשר שליח מסיים משלוח תקין - מעדכן משימות ו-XP"""
        try:
            courier = Courier.query.get(courier_id)
            delivery = Delivery.query.get(delivery_id)
            if not courier or not delivery: return
            
            # Base XP
            GamificationService.award_xp(courier_id, 10, "סיום משלוח תקין")
            
            # Check Fast Delivery
            is_fast = False
            if delivery.actual_delivery_time and delivery.estimated_delivery_time:
                if delivery.actual_delivery_time <= delivery.estimated_delivery_time:
                    is_fast = True
                    GamificationService.award_xp(courier_id, 25, "משלוח מהיר מהיעד")
            
            # Process Daily Missions
            today = datetime.utcnow().date()
            mission = DailyMission.query.filter_by(courier_id=courier_id, mission_date=today).first()
            if not mission:
                mission = DailyMission(courier_id=courier_id, mission_date=today)
                db.session.add(mission)
                
            mission.completed_deliveries += 1
            if is_fast: mission.fast_deliveries += 1
            
            if mission.completed_deliveries == 5:
                GamificationService.award_xp(courier_id, 100, "5 משלוחים ביום אחד")
                
            db.session.commit()
            
            # Check Milestones asynchronously or here
            GamificationService.check_and_award_milestones(courier_id)
            
            # Update overall KPI scores asynchronously or here
            GamificationService.update_courier_performance(courier_id)
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error in gamification processing: {e}")

    @staticmethod
    def check_and_award_milestones(courier_id):
        """בודק אם השליח הגיע לאבני דרך ומעניק לו פרס ובונוס הפתעה"""
        try:
            courier = Courier.query.get(courier_id)
            if not courier: return

            # Get all milestones
            all_milestones = Milestone.query.all()
            
            # Get already earned milestones
            earned_ids = {em.milestone_id for em in EarnedMilestone.query.filter_by(courier_id=courier_id).all()}
            
            for milestone in all_milestones:
                if milestone.id in earned_ids:
                    continue
                
                achieved = False
                
                if milestone.trigger_type == 'total_deliveries':
                    if courier.total_deliveries >= milestone.trigger_value:
                        achieved = True
                        
                elif milestone.trigger_type == 'total_distance':
                    # Need to sum distance of all completed deliveries
                    # Doing a quick query for this (Warning: can be slow for many deliveries)
                    total_dist_query = db.session.query(db.func.sum(Delivery.distance_km)).filter(
                        Delivery.courier_id == courier_id,
                        Delivery.status == 'delivered'
                    ).scalar()
                    total_dist = total_dist_query or 0.0
                    
                    if total_dist >= milestone.trigger_value:
                        achieved = True

                if achieved:
                    # Grant Milestone
                    new_earned = EarnedMilestone(courier_id=courier_id, milestone_id=milestone.id)
                    db.session.add(new_earned)
                    
                    # Grant Rewards
                    if milestone.reward_xp > 0:
                        GamificationService.award_xp(courier_id, milestone.reward_xp, f"Milestone: {milestone.title}")
                    
                    logging.info(f" Courier {courier.full_name} ACHIEVED MILESTONE: {milestone.title} (+{milestone.reward_xp}XP)")
                    
                    # Send Socket.IO event to trigger Lottie Celebration Animation on mobile Device
                    try:
                        from app import socketio
                        socketio.emit(
                            'milestone_unlocked', 
                            {'title': milestone.title, 'xp': milestone.reward_xp, 'cash': milestone.reward_cash}, 
                            room=f'courier_{courier_id}'
                        )
                    except ImportError:
                        pass
                    
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error checking milestones: {e}")

    @staticmethod
    def get_leaderboard(limit=10):
        """מחזיר את רשימת השליחים המובילים ממויינים לפי XP ורמה"""
        try:
            # Join CourierGamification with Courier to get names and avatars
            top_gamers = db.session.query(CourierGamification, Courier).join(
                Courier, CourierGamification.courier_id == Courier.id
            ).filter(
                CourierGamification.xp > 0
            ).order_by(
                CourierGamification.xp.desc(),
                CourierGamification.level.desc()
            ).limit(limit).all()

            leaderboard = []
            for rank, (gamification, courier) in enumerate(top_gamers, start=1):
                badge = GamificationService.get_rank_badge(courier.performance_index)
                leaderboard.append({
                    "rank": rank,
                    "courier_name": courier.full_name,
                    "courier_id": courier.id,
                    "level": gamification.level,
                    "xp": gamification.xp,
                    "badge": badge,
                    "total_deliveries": courier.total_deliveries
                })

            return leaderboard
        except Exception as e:
            logging.error(f"Error fetching leaderboard: {e}")
            return []
