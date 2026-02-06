from flask import Blueprint, request, jsonify
from models import Address, db
from utils.decorators import token_required

addresses_bp = Blueprint('addresses', __name__)

@addresses_bp.route('/autocomplete', methods=['GET'])
@token_required
def autocomplete_address(current_user):
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify([]), 200
        
    # Search for matching addresses
    # We search by street OR city
    # Limit results to 10
    
    search_pattern = f"%{query}%"
    
    results = Address.query.filter(
        (Address.street.ilike(search_pattern)) | 
        (Address.city.ilike(search_pattern))
    ).limit(10).all()
    
    suggestions = []
    seen = set()
    
    for addr in results:
        # Create a formatted string "Street Number, City"
        full_addr = f"{addr.street} {addr.building_number}, {addr.city}"
        if full_addr not in seen:
            suggestions.append({
                'id': addr.id,
                'street': addr.street,
                'city': addr.city,
                'number': addr.building_number,
                'full_address': full_addr
            })
            seen.add(full_addr)
            
    return jsonify(suggestions), 200
