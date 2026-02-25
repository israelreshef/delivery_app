import requests
import math
import logging
from typing import List, Dict, Tuple

# Fallback Haversine for local TSP heuristic when OSRM is unavailable
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Radius of earth in km
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat, dlon = rlat2 - rlat1, rlon2 - rlon1
    a = math.sin(dlat / 2)**2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class RouteOptimizer:
    """
    Handles Route Optimization using OSRM API or Fallback Nearest-Neighbor TSP
    """
    
    # Using public OSRM demo server for prototyping (in production use a dedicated instance or Google Maps API)
    OSRM_BASE_URL = "http://router.project-osrm.org/trip/v1/driving"
    
    @classmethod
    def optimize_route(cls, current_lat: float, current_lng: float, destinations: List[Dict]) -> Dict:
        """
        Organizes a list of destinations into their optimal driving sequence.
        destinations format: [{'id': 1, 'lat': 32.0, 'lng': 34.0, 'type': 'pickup'}, ...]
        """
        if not destinations:
            return {'optimized_sequence': [], 'total_distance_km': 0, 'total_duration_min': 0}
            
        # Try OSRM Trip API first (TSP solver built-in)
        try:
            return cls._osrm_optimize(current_lat, current_lng, destinations)
        except Exception as e:
            logging.warning(f"OSRM Optimization failed ({e}). Falling back to Nearest Neighbor TSP.")
            return cls._nearest_neighbor_optimize(current_lat, current_lng, destinations)

    @classmethod
    def _osrm_optimize(cls, start_lat: float, start_lng: float, destinations: List[Dict]) -> Dict:
        # OSRM takes coordinates as {longitude},{latitude}
        coords = [f"{start_lng},{start_lat}"]
        for dest in destinations:
            coords.append(f"{dest['lng']},{dest['lat']}")
            
        coord_string = ";".join(coords)
        
        # Roundtrip=false: End at the last optimal point. Source=first ensures we start at courier location.
        url = f"{cls.OSRM_BASE_URL}/{coord_string}?roundtrip=false&source=first&steps=false"
        
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data.get('code') != 'Ok':
            raise Exception("OSRM API returned non-Ok code")
            
        # The 'waypoints' array matches the input coordinates mapped to the trip sequence
        # index 0 is always our start point because of source=first
        waypoints = data['waypoints']
        
        # Sort waypoints by 'waypoint_index' to get the sequence order
        sorted_waypoints = sorted(waypoints, key=lambda w: w['waypoint_index'])
        
        # OSRM drops the first point if we just want the destinations
        # We need to map OSRM's original array index back to our destinations array
        # OSRM index: 0=Start, 1=Dest[0], 2=Dest[1] -> Thus dest_index = original_index - 1
        optimized_sequence = []
        for wp in sorted_waypoints:
            original_idx = wp['trips_index'] if 'trips_index' in wp else wp.get('waypoint_index', 0)
            # In newer OSRM, Waypoint index specifies where it falls in the route
            # The order of the 'waypoints' array corresponds to the input order.
            pass
            
        # Alternate parsing: The 'waypoints' array returned corresponds to input order.
        # wp['waypoint_index'] tells us its position in the final trip.
        sequence_map = {wp['waypoint_index']: idx for idx, wp in enumerate(waypoints)}
        
        for sequence_step in range(1, len(waypoints)): # Start at 1 to skip courier location
            input_idx = sequence_map[sequence_step]
            dest_idx = input_idx - 1 # Map back to destinations array
            destinations[dest_idx]['sequence_order'] = sequence_step
            optimized_sequence.append(destinations[dest_idx])
            
        trip = data['trips'][0]
        
        return {
            'optimized_sequence': optimized_sequence,
            'total_distance_km': round(trip['distance'] / 1000.0, 2),
            'total_duration_min': round(trip['duration'] / 60.0, 1),
            'provider': 'osrm'
        }

    @classmethod
    def _nearest_neighbor_optimize(cls, start_lat: float, start_lng: float, destinations: List[Dict]) -> Dict:
        """
        Greedy fallback TSP algorithm.
        O(n^2) time complexity, fine for < 50 stops.
        """
        unvisited = list(destinations) # Clone
        optimized_sequence = []
        current_loc = (start_lat, start_lng)
        
        total_distance = 0.0
        
        step = 1
        while unvisited:
            # Find nearest
            nearest_dest = None
            min_dist = float('inf')
            
            for dest in unvisited:
                dist = _haversine(current_loc[0], current_loc[1], dest['lat'], dest['lng'])
                if dist < min_dist:
                    min_dist = dist
                    nearest_dest = dest
                    
            unvisited.remove(nearest_dest)
            
            nearest_dest['sequence_order'] = step
            optimized_sequence.append(nearest_dest)
            
            total_distance += min_dist
            current_loc = (nearest_dest['lat'], nearest_dest['lng'])
            step += 1
            
        # Estimate duration (assuming average urban speed of 30 km/h)
        avg_speed_kmh = 30.0
        duration_hours = total_distance / avg_speed_kmh
        duration_mins = duration_hours * 60.0
        
        return {
            'optimized_sequence': optimized_sequence,
            'total_distance_km': round(total_distance, 2),
            'total_duration_min': round(duration_mins, 1),
            'provider': 'heuristic_fallback'
        }
