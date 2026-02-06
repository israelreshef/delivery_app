import requests
import os

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