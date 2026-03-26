from flask import Blueprint, request, jsonify
from extensions import limiter
from models import Address, db
from utils.decorators import token_required
import requests as http_requests
import os
from routes.expenses import track_api_call

# Load .env if dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
except ImportError:
    pass

addresses_bp = Blueprint('addresses', __name__)

GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY')

@addresses_bp.route('/autocomplete', methods=['GET'])
@limiter.limit("30 per minute")
def autocomplete_address():
    """Public endpoint - geocoding autocomplete doesn't require auth."""
    query = request.args.get('q', '').strip()
    # Log the raw query bytes to diagnose encoding issues
    print(f"DEBUG: Autocomplete request for query: '{query}' (len={len(query)})")
    if not query or len(query) < 2:
        return jsonify([]), 200

    # Try Google Places first if key is available
    if GOOGLE_PLACES_API_KEY:
        result = _google_places_autocomplete(query)
        if result is not None:
            return result
    
    # Fallback to Nominatim (free, always works)
    return _nominatim_autocomplete(query)


def _google_places_autocomplete(query):
    """Use Google Places Autocomplete API. Returns None if API fails."""
    try:
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        # Detect if query has Hebrew characters
        is_hebrew = any("\u0590" <= c <= "\u05FF" for c in query)
        lang = 'iw' if is_hebrew else 'en'
        params = {
            'input': query,
            'key': GOOGLE_PLACES_API_KEY,
            'components': 'country:il',
            'language': lang,
            # Removed 'types': 'address' to allow more flexible results (cities, POIs)
        }
        resp = http_requests.get(url, params=params, timeout=5)
        data = resp.json()
        
        # If API denied or no results, return None to trigger fallback
        if data.get('status') in ('REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'INVALID_REQUEST'):
            print(f"Google Places API: {data.get('status')} - {data.get('error_message', '')}")
            return None

        suggestions = []
        for i, prediction in enumerate(data.get('predictions', [])[:8]):
            desc = prediction.get('description', '')
            
            # Use structured formatting for more reliable parsing
            structured = prediction.get('structured_formatting', {})
            main_text = structured.get('main_text', '')
            secondary_text = structured.get('secondary_text', '')
            
            # Try to extract city from secondary text (usually "City, Country" or "Neighborhood, City, Country")
            city = ''
            if secondary_text:
                parts = [p.strip() for p in secondary_text.split(',')]
                if len(parts) >= 2:
                    city = parts[-2] # Second to last is usually city in Israel (e.g., "Tel Aviv-Yafo, Israel")
                elif len(parts) == 1:
                    city = parts[0]

            suggestions.append({
                'id': f'gp_{i}',
                'street': main_text,
                'city': city,
                'number': '',
                'full_address': desc,
                'place_id': prediction.get('place_id', ''),
                'source': 'google'
            })
        track_api_call('google_places')
        return jsonify(suggestions), 200
    except Exception as e:
        print(f"Google Places API error: {e}")
        return None


def _nominatim_autocomplete(query):
    """Use OpenStreetMap Nominatim as free fallback."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'json',
            'addressdetails': 1,
            'limit': 8,
            'countrycodes': 'il',
            'accept-language': 'he',
        }
        headers = {
            'User-Agent': 'TzirDeliveryApp/1.0'
        }
        resp = http_requests.get(url, params=params, headers=headers, timeout=5)
        data = resp.json()

        suggestions = []
        seen = set()
        for i, result in enumerate(data):
            addr = result.get('address', {})
            
            # Extract city - try multiple fields
            city = (addr.get('city') or addr.get('town') or 
                    addr.get('village') or addr.get('municipality') or 
                    addr.get('suburb') or '')
            
            street = addr.get('road', '')
            house_number = addr.get('house_number', '')
            
            # Build display string
            display = result.get('display_name', '').split(',')
            # Take first 3 meaningful parts for clean display
            clean_parts = [p.strip() for p in display[:3] if p.strip()]
            full_address = ', '.join(clean_parts) if clean_parts else result.get('display_name', '')
            
            # Deduplicate
            dedup_key = f"{street}|{city}"
            if dedup_key in seen and street:
                continue
            seen.add(dedup_key)
            
            suggestions.append({
                'id': f'nom_{i}',
                'street': street,
                'city': city,
                'number': house_number,
                'full_address': full_address,
                'source': 'nominatim'
            })
        
        # If Nominatim gave few results, supplement with local DB
        if len(suggestions) < 3:
            db_results = _local_db_search(query, 5)
            for r in db_results:
                dedup_key = f"{r['street']}|{r['city']}"
                if dedup_key not in seen:
                    suggestions.append(r)
                    seen.add(dedup_key)

        track_api_call('nominatim')
        return jsonify(suggestions), 200
    except Exception as e:
        print(f"Nominatim API error: {e}")
        # Final fallback: local DB
        return jsonify(_local_db_search(query, 10)), 200

@addresses_bp.route('/geocode', methods=['GET'])
@limiter.limit("30 per minute")
def geocode_address():
    """Convert address or place_id to coordinates."""
    query = request.args.get('q', '').strip()
    place_id = request.args.get('place_id', '').strip()
    
    if not query and not place_id:
        return jsonify({'error': 'Query or Place ID required'}), 400

    # Try Google Geocoding first
    if GOOGLE_PLACES_API_KEY:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'key': GOOGLE_PLACES_API_KEY,
            'language': 'he'
        }
        # Only use place_id for Google if it appears to be a real Google Place ID (not our 'nom_' mock prefix)
        if place_id and not place_id.startswith('nom_') and not place_id.startswith('local_'):
            params['place_id'] = place_id
        else:
            params['address'] = query
            
        try:
            resp = http_requests.get(url, params=params, timeout=5)
            data = resp.json()
            if data.get('status') == 'OK' and data.get('results'):
                loc = data['results'][0]['geometry']['location']
                track_api_call('google_places')
                return jsonify({
                    'lat': loc['lat'],
                    'lng': loc['lng'],
                    'formatted_address': data['results'][0].get('formatted_address', ''),
                    'source': 'google',
                    'is_verified': True
                }), 200
        except Exception as e:
            print(f"Google Geocode error: {e}")

    # Fallback to Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'il'
        }
        headers = {'User-Agent': 'TzirDeliveryApp/1.0'}
        resp = http_requests.get(url, params=params, headers=headers, timeout=5)
        data = resp.json()
        if data:
            track_api_call('nominatim')
            return jsonify({
                'lat': float(data[0]['lat']),
                'lng': float(data[0]['lon']),
                'formatted_address': data[0].get('display_name', ''),
                'source': 'nominatim',
                'is_verified': False
            }), 200
    except Exception as e:
        print(f"Nominatim Geocode error: {e}")

    return jsonify({'error': 'Coordinates not found'}), 404


def _local_db_search(query, limit=10):
    """Search local database for saved addresses."""
    search_pattern = f"%{query}%"
    results = Address.query.filter(
        (Address.street.ilike(search_pattern)) |
        (Address.city.ilike(search_pattern))
    ).limit(limit).all()

    suggestions = []
    seen = set()
    for addr in results:
        full_addr = f"{addr.street} {addr.building_number}, {addr.city}"
        if full_addr not in seen:
            suggestions.append({
                'id': addr.id,
                'street': addr.street,
                'city': addr.city,
                'number': addr.building_number,
                'full_address': full_addr,
                'source': 'local'
            })
            seen.add(full_addr)
    return suggestions
