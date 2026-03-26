from flask import Blueprint, request, jsonify
import math

pricing_bp = Blueprint('pricing', __name__)

def haversine(lat1, lon1, lat2, lon2):
    # Radius of earth in kilometers
    R = 6371.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0)**2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Straight line distance
    distance = R * c
    # Multiply by a factor of 1.3 to approximate road distance routing
    return distance * 1.3

def calculate_dynamic_price(distance_km, duration_mins):
    base_fee = 24.6
    min_calc_distance = 6.0
    
    # Effective distance for calculation
    eff_distance = max(distance_km, min_calc_distance)
    
    # Pricing tiers (absolute per km cost based on total distance bucket)
    if eff_distance <= 12:
        per_km = 5.25
    elif eff_distance <= 25:
        per_km = 5.05
    elif eff_distance <= 36:
        per_km = 4.65
    elif eff_distance <= 44:
        per_km = 4.05
    elif eff_distance <= 59:
        per_km = 3.85
    else:
        per_km = 3.75
        
    distance_cost = eff_distance * per_km
    raw_price = base_fee + distance_cost
    
    # Time multiplier
    if duration_mins <= 30:
        multiplier = 1.0
    elif duration_mins <= 45:
        multiplier = 1.25
    elif duration_mins <= 60:
        multiplier = 1.75
    elif duration_mins <= 75:
        multiplier = 2.25
    else:
        multiplier = 2.5
        
    final_price = raw_price * multiplier
    
    # Min price enforcement
    final_price = max(final_price, 56.1)
    
    return round(final_price, 2)

@pricing_bp.route('/quote', methods=['GET', 'POST'])
def get_quote():
    if request.method == 'POST':
        data = request.json or {}
    else:
        data = request.args
        
    try:
        p_lat = float(data.get('p_lat'))
        p_lng = float(data.get('p_lng'))
        d_lat = float(data.get('d_lat'))
        d_lng = float(data.get('d_lng'))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'Invalid or missing coordinates'}), 400
        
    distance_km = haversine(p_lat, p_lng, d_lat, d_lng)
    
    # Assume 30 km/h average urban speed in traffic -> 0.5 km per min
    # Calculate duration in minutes
    duration_mins = (distance_km / 30.0) * 60.0
    
    estimated_price = calculate_dynamic_price(distance_km, duration_mins)
    
    return jsonify({
        'success': True,
        'distance_km': round(distance_km, 2),
        'duration_mins': round(duration_mins, 0),
        'price': estimated_price,
        'currency': 'ILS'
    })
