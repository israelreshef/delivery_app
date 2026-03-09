import requests
import os
import logging
from typing import Dict, List, Optional, Tuple

class GoogleMapsService:
    """
    Service to interact with Google Maps APIs for distance matrix and directions.
    """
    API_KEY = os.getenv('GOOGLE_MAPS_API_KEY') or os.getenv('GOOGLE_PLACES_API_KEY')
    BASE_URL = "https://maps.googleapis.com/maps/api"

    @classmethod
    def get_distance_matrix(cls, origins: List[Tuple[float, float]], destinations: List[Tuple[float, float]]) -> Optional[Dict]:
        """
        Calculates driving distance and duration between multiple origins and destinations.
        Returns a matrix structure or None on error.
        """
        if not cls.API_KEY:
            logging.warning("GOOGLE_MAPS_API_KEY not set. Falling back to local/Haversine.")
            return None

        origins_str = "|".join([f"{lat},{lng}" for lat, lng in origins])
        destinations_str = "|".join([f"{lat},{lng}" for lat, lng in destinations])

        try:
            response = requests.get(
                f"{cls.BASE_URL}/distancematrix/json",
                params={
                    "origins": origins_str,
                    "destinations": destinations_str,
                    "mode": "driving",
                    "key": cls.API_KEY
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'OK':
                return data
            else:
                logging.error(f"Google Maps Matrix Error: {data.get('status')} - {data.get('error_message')}")
        except Exception as e:
            logging.error(f"Failed to fetch Google Maps Distance Matrix: {e}")
        
        return None

    @classmethod
    def get_directions(cls, origin: Tuple[float, float], destination: Tuple[float, float]) -> Optional[Dict]:
        """
        Gets precise driving directions/polyline between two points.
        """
        if not cls.API_KEY:
            return None

        try:
            response = requests.get(
                f"{cls.BASE_URL}/directions/json",
                params={
                    "origin": f"{origin[0]},{origin[1]}",
                    "destination": f"{destination[0]},{destination[1]}",
                    "mode": "driving",
                    "key": cls.API_KEY
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'OK':
                return data
            else:
                logging.error(f"Google Maps Directions Error: {data.get('status')} - {data.get('error_message')}")
        except Exception as e:
            logging.error(f"Failed to fetch Google Maps Directions: {e}")
        
        return None

    @classmethod
    def get_road_distance(cls, origin: Tuple[float, float], destination: Tuple[float, float]) -> Optional[Dict]:
        """
        Helper to get distance (km) and duration (mins) for a single pair of points.
        """
        matrix = cls.get_distance_matrix([origin], [destination])
        if matrix and matrix['rows'][0]['elements'][0]['status'] == 'OK':
            element = matrix['rows'][0]['elements'][0]
            return {
                'distance_km': element['distance']['value'] / 1000.0,
                'duration_min': round(element['duration']['value'] / 60.0, 1)
            }
        return None
