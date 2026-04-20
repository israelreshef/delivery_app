import requests
import os
import math

NOMINATIM_URL = os.getenv('NOMINATIM_URL', 'http://localhost:8080')
OSRM_URL = os.getenv('OSRM_URL', 'http://localhost:5000')

def get_coords_from_address(address):
    """הופך טקסט לקואורדינטות. מחזיר dict או None"""
    try:
        response = requests.get(
            f"{NOMINATIM_URL}/search", 
            params={'q': address, 'format': 'json', 'limit': 1},
            timeout=5
        )
        data = response.json()
        if data:
            return {'lat': float(data[0]['lat']), 'lon': float(data[0]['lon'])}
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None

def get_route_info(pickup_coords, delivery_coords):
    """מחשב מרחק וזמן בשרת המקומי"""
    try:
        url = f"{OSRM_URL}/route/v1/driving/{pickup_coords['lon']},{pickup_coords['lat']};{delivery_coords['lon']},{delivery_coords['lat']}?overview=false"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if data.get('code') == 'Ok':
            route = data['routes'][0]
            return {
                'distance_km': route['distance'] / 1000,
                'duration_min': round(route['duration'] / 60)
            }
    except Exception as e:
        print(f"Routing error: {e}")
    return None

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth (km)."""
    R = 6371 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c