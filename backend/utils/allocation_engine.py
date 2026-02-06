import logging
from math import radians, cos, sin, asin, sqrt
from models import Courier, Delivery, db

# Configure logging
logger = logging.getLogger(__name__)

class AllocationEngine:
    """
    Smart Courier Allocation Engine.
    Responsibility: Find the best available courier for a given order.
    """

    # Configuration constants
    MAX_RADIUS_KM = 30.0  # Maximum search radius
    WEIGHT_DISTANCE = 0.45
    WEIGHT_RATING = 0.35
    WEIGHT_ACTIVITY = 0.20
    
    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees)
        """
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return float('inf')

        # Convert decimal degrees to radians 
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

        # Haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a)) 
        r = 6371 # Radius of earth in kilometers. Use 3956 for miles
        return c * r

    @classmethod
    def find_best_courier(cls, delivery: Delivery):
        """
        Main entry point to find the best courier for a delivery.
        Returns: Courier object or None
        """
        pickup_lat = delivery.pickup_point.address.latitude
        pickup_lng = delivery.pickup_point.address.longitude

        if not pickup_lat or not pickup_lng:
            logger.error(f"Order {delivery.order_number} has no pickup coordinates.")
            return None

        # 1. Get Candidates (Filter Phase)
        # We fetch all available couriers and filter in python for now 
        # (For scale, use PostGIS ST_DWithin)
        candidates = Courier.query.filter_by(
            is_available=True,
            onboarding_status='approved' # Ensure only approved couriers
        ).all()

        scored_candidates = []

        for courier in candidates:
            # 2. Hard Constraints Filter
            if not cls._check_constraints(courier, delivery):
                continue
            
            # 3. Calculate Distance
            dist = cls.haversine_distance(
                pickup_lat, pickup_lng, 
                courier.current_location_lat, courier.current_location_lng
            )

            if dist > cls.MAX_RADIUS_KM:
                continue

            # 4. Calculate Score
            score = cls._calculate_score(courier, dist)
            scored_candidates.append({
                'courier': courier,
                'score': score,
                'distance': dist
            })

        # 5. Sort by Score (Desc)
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)

        if not scored_candidates:
            logger.info(f"Allocation: No suitable courier found for {delivery.order_number}")
            return None

        best_match = scored_candidates[0]
        logger.info(f"Allocation: Assigned {best_match['courier'].full_name} (Score: {best_match['score']:.1f}, Dist: {best_match['distance']:.1f}km)")
        
        return best_match['courier']

    @classmethod
    def _check_constraints(cls, courier: Courier, delivery: Delivery) -> bool:
        """
        Check hard constraints like vehicle type vs package size.
        """
        # Package Size Constraints
        # 'small' (envelope) -> Any vehicle
        # 'medium' (box) -> Scooter, Motorcycle, Car, Van
        # 'large' -> Car, Van
        # 'xlarge' -> Van only
        
        # Vehicle Types: 'bicycle', 'scooter', 'motorcycle', 'car', 'van'
        
        allowed_vehicles = {
            'small': ['bicycle', 'scooter', 'motorcycle', 'car', 'van'],
            'medium': ['scooter', 'motorcycle', 'car', 'van'],
            'large': ['car', 'van'],
            'xlarge': ['van']
        }

        package_size = delivery.package_size or 'small'
        if courier.vehicle_type not in allowed_vehicles.get(package_size, []):
            return False

        return True

    @classmethod
    def _calculate_score(cls, courier: Courier, distance_km: float) -> float:
        """
        Calculate weighted score (0-100).
        """
        # Distance Score (0-100): Closer is better.
        # 0km = 100, MAX_RADIUS = 0
        dist_score = max(0, 100 - (distance_km / cls.MAX_RADIUS_KM * 100))
        
        # Rating Score (0-100)
        # 5.0 = 100, 1.0 = 20
        rating_score = (courier.rating or 5.0) * 20

        # Activity Score (0-100)
        # Cap at 100 deliveries for max score to give new couriers a chance? 
        # Let's say 500 deliveries is max "experience"
        activity_score = min(100, (courier.total_deliveries or 0) / 5)

        final_score = (
            dist_score * cls.WEIGHT_DISTANCE +
            rating_score * cls.WEIGHT_RATING +
            activity_score * cls.WEIGHT_ACTIVITY
        )

        return final_score
