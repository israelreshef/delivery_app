import json
import logging
from math import radians, cos, sin, asin, sqrt
from models import Courier, Delivery, db, Zone, AcademyProtocolCourse, AcademyProtocolProgress, DeliveryProtocolConfig
from utils.google_maps import GoogleMapsService

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

        # Phase 3.5: Zone Filtering
        active_zones = Zone.query.filter_by(is_active=True).all()
        pickup_zone = cls._get_zone_for_location(pickup_lat, pickup_lng, active_zones)

        if not pickup_zone:
            logger.warning(f"No zone found for pickup location ({pickup_lat}, {pickup_lng}). Falling back to radius-based allocation.")
        else:
            logger.debug(f"Detected pickup zone: {pickup_zone.name} (ID: {pickup_zone.id})")
            # Filter candidates to only those in the same zone
            candidates_in_zone = []
            for courier in candidates:
                c_lat = courier.current_location_lat
                c_lng = courier.current_location_lng
                if c_lat is not None and c_lng is not None:
                    c_zone = cls._get_zone_for_location(c_lat, c_lng, active_zones)
                    if c_zone and c_zone.id == pickup_zone.id:
                        candidates_in_zone.append(courier)
            
            if not candidates_in_zone:
                logger.warning(f"No couriers found in zone {pickup_zone.id} for order {delivery.order_number}. No allocation possible.")
                return None
            
            candidates = candidates_in_zone
            logger.info(f"Zone-based filtering: {len(candidates)} couriers available in zone {pickup_zone.name}")

        scored_candidates = []

        # 3. Initial filter & Sort by Haversine (Fast & Free)
        candidates_with_haversine = []
        for courier in candidates:
            if not cls._check_constraints(courier, delivery):
                continue
            
            h_dist = cls.haversine_distance(
                pickup_lat, pickup_lng, 
                courier.current_location_lat, courier.current_location_lng
            )
            
            if h_dist <= cls.MAX_RADIUS_KM:
                candidates_with_haversine.append({
                    'courier': courier,
                    'h_dist': h_dist
                })

        # 4. Refine with Real Road Distance (Up to top 10 candidates)
        candidates_with_haversine.sort(key=lambda x: x['h_dist'])
        top_candidates = candidates_with_haversine[:10]
        
        if not top_candidates:
            logger.info(f"Allocation: No suitable courier found for {delivery.order_number}")
            return None

        # Prepare origins for Google Matrix
        origins = [(c['courier'].current_location_lat, c['courier'].current_location_lng) for c in top_candidates]
        destination = (pickup_lat, pickup_lng)
        
        road_data = GoogleMapsService.get_distance_matrix(origins, [destination])
        
        scored_candidates = []
        for i, item in enumerate(top_candidates):
            courier = item['courier']
            dist = item['h_dist']
            
            # Use Road Distance if available
            if road_data and road_data['rows'][i]['elements'][0]['status'] == 'OK':
                element = road_data['rows'][i]['elements'][0]
                dist = element['distance']['value'] / 1000.0
                logger.debug(f"Smart Allocation: Used road distance {dist:.1f}km for {courier.full_name}")
            else:
                logger.debug(f"Smart Allocation: Falling back to Haversine {dist:.1f}km for {courier.full_name}")

            score = cls._calculate_score(courier, dist, delivery)
            scored_candidates.append({
                'courier': courier,
                'score': score,
                'distance': dist
            })

        # 5. Final Sort by Score (Desc)
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)
        best_match = scored_candidates[0]
        
        logger.info(f"Allocation: Assigned {best_match['courier'].full_name} (Score: {best_match['score']:.1f}, Road Dist: {best_match['distance']:.1f}km)")
        
        return best_match['courier']

    @classmethod
    def _is_point_in_polygon(cls, lat: float, lng: float, polygon_coords: list[dict]) -> bool:
        """
        Ray Casting algorithm to determine if a point (lat, lng) is inside a polygon.
        
        :param lat: Latitude of the point
        :param lng: Longitude of the point
        :param polygon_coords: List of dicts [{"lat": float, "lng": float}, ...]
        :return: True if inside, False otherwise
        """
        if not polygon_coords or len(polygon_coords) < 3:
            return False

        inside = False
        n = len(polygon_coords)
        for i in range(n):
            j = (i + 1) % n
            # Coordinates of vertices i and j
            yi, xi = polygon_coords[i]['lat'], polygon_coords[i]['lng']
            yj, xj = polygon_coords[j]['lat'], polygon_coords[j]['lng']

            # Check if point's latitude is between the vertex latitudes
            if ((yi > lat) != (yj > lat)):
                # Calculate the longitude intersection of the ray with the segment (i, j)
                intersect_lng = (xj - xi) * (lat - yi) / (yj - yi) + xi
                if lng < intersect_lng:
                    inside = not inside
                    
        return inside

    @classmethod
    def _get_zone_for_location(cls, lat: float, lng: float, active_zones: list[Zone] = None) -> Zone | None:
        """
        Finds the first active zone containing the given lat/lng.
        
        :param lat: Latitude
        :param lng: Longitude
        :param active_zones: Optional list of pre-fetched active zones for efficiency.
        :return: Zone object or None
        """
        if active_zones is None:
            active_zones = Zone.query.filter_by(is_active=True).all()

        for zone in active_zones:
            coords = json.loads(zone.polygon_coords)
            if cls._is_point_in_polygon(lat, lng, coords):
                return zone
        return None

    @classmethod
    def _check_constraints(cls, courier: Courier, delivery: Delivery) -> bool:
        """
        Check hard constraints like vehicle type vs package size.
        Also check Academy certifications for restricted delivery types.
        """
        allowed_vehicles = {
            'small': ['bicycle', 'scooter', 'motorcycle', 'car', 'van'],
            'medium': ['scooter', 'motorcycle', 'car', 'van'],
            'large': ['car', 'van'],
            'xlarge': ['van']
        }

        package_size = delivery.package_size or 'small'
        if courier.vehicle_type not in allowed_vehicles.get(package_size, []):
            return False
            
        # Phase 3: Academy Certification Checks (Legacy / General)
        # If order type is 'medical' or 'legal_document', check if courier has certification
        restricted_types = {
            'medical': 'Medical Logistics',
            'legal_document': 'Legal Custody'
        }
        
        req_type = delivery.delivery_type
        if req_type in restricted_types:
            has_cert = False
            for c in courier.certifications:
                if c.course.title == restricted_types[req_type]:
                    # They can do it if temporary or permanent
                    if c.status in ['temporary', 'permanent']:
                        has_cert = True
                        break
            if not has_cert:
                return False

        # Phase 4: Strict Protocol-based Certification (Customer App Spec)
        if not cls._check_protocol_certification(courier, delivery):
            return False

        return True

    @classmethod
    def _check_protocol_certification(cls, courier: Courier, delivery: Delivery) -> bool:
        """
        Check if courier has passed the Academy course for the delivery's protocol.
        """
        protocol_slug = delivery.protocol_slug
        if not protocol_slug:
            return True  # no protocol restriction

        course = AcademyProtocolCourse.query.filter_by(
            protocol_slug=protocol_slug,
            is_active=True
        ).first()

        if not course:
            return True  # no specific course defined yet for this protocol

        progress = AcademyProtocolProgress.query.filter_by(
            courier_id=courier.id,
            course_id=course.id,
            status='passed'
        ).first()

        if not progress:
            logger.debug(f"Courier {courier.id} not certified for protocol {protocol_slug}")
            return False

        return True

    @classmethod
    def _calculate_score(cls, courier: Courier, distance_km: float, delivery: Delivery) -> float:
        """
        Calculate weighted score (0-100+).
        Now leverages the advanced Performance Index from GamificationService,
        plus Academy phase 3 logic (Level multipliers + OJT routing).
        """
        # Distance Score (0-100): Closer is better.
        dist_score = max(0, 100 - (distance_km / cls.MAX_RADIUS_KM * 100))
        
        # Performance Score (0-100)
        perf_score = courier.performance_index or 50.0

        final_score = (
            dist_score * cls.WEIGHT_DISTANCE +
            perf_score * (1.0 - cls.WEIGHT_DISTANCE)
        )
        
        # Phase 3 Boost: High-level couriers get a slight edge (1% per level up to 20%)
        level = 1
        if courier.gamification:
            level = max(1, courier.gamification.level)
        
        level_bonus = min(0.20, (level - 1) * 0.01)
        final_score *= (1.0 + level_bonus)
        
        # Phase 3 Boost (OJT - On-The-Job Training)
        # If the order is a restricted type and the courier is in 'temporary' status, prioritize heavily!
        restricted_types = {'medical': 'Medical Logistics', 'legal_document': 'Legal Custody'}
        req_type = delivery.delivery_type
        if req_type in restricted_types:
            for c in courier.certifications:
                if c.course.title == restricted_types[req_type] and c.status == 'temporary':
                    final_score += 50.0  # Big bump to secure their real-world practice
                    break

        return final_score
