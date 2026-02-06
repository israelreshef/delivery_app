from flask import Blueprint, request, jsonify
from models import db, Zone
import json
from utils.decorators import token_required, role_required

zones_bp = Blueprint('zones', __name__)

@zones_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_zones(current_user):
    """קבלת רשימת כל האזורים"""
    try:
        zones = Zone.query.filter_by(is_active=True).all()
        return jsonify([z.to_dict() for z in zones]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@zones_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_zone(current_user):
    """יצירת אזור חלוקה חדש"""
    try:
        data = request.json
        
        # Validation
        if not data.get('name') or not data.get('polygon_coords'):
            return jsonify({'error': 'Name and coords required'}), 400
            
        new_zone = Zone(
            name=data['name'],
            description=data.get('description'),
            polygon_coords=json.dumps(data['polygon_coords']),
            price_multiplier=data.get('price_multiplier', 1.0),
            base_price_addition=data.get('base_price_addition', 0.0)
        )
        
        db.session.add(new_zone)
        db.session.commit()
        
        return jsonify({'success': True, 'id': new_zone.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/<int:zone_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_zone(current_user, zone_id):
    """עדכון אזור קיים"""
    try:
        zone = Zone.query.get_or_404(zone_id)
        data = request.json
        
        if 'name' in data: zone.name = data['name']
        if 'description' in data: zone.description = data['description']
        if 'polygon_coords' in data: zone.polygon_coords = json.dumps(data['polygon_coords'])
        if 'price_multiplier' in data: zone.price_multiplier = data['price_multiplier']
        if 'base_price_addition' in data: zone.base_price_addition = data['base_price_addition']
        
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/<int:zone_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_zone(current_user, zone_id):
    """מחיקת אזור (Soft Delete)"""
    try:
        zone = Zone.query.get_or_404(zone_id)
        zone.is_active = False
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
