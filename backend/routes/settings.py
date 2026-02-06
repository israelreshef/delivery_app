from flask import Blueprint, request, jsonify
from models import db, Pricing
import logging
from utils.decorators import token_required, role_required

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/pricing', methods=['GET'])
@token_required
@role_required('admin')
def get_pricing_settings(current_user):
    """קבלת הגדרות המחירים הנוכחיות"""
    try:
        # Get active pricing, or the last created one
        pricing = Pricing.query.filter_by(is_active=True).first()
        
        if not pricing:
            # If no pricing exists, return defaults
            return jsonify({
                'base_price': 20.0,
                'price_per_km': 5.0,
                'price_per_kg': 2.0,
                'express_fee': 30.0,
                'weekend_fee': 15.0,
                'night_fee': 25.0,
                'city_surcharge': 10.0
            }), 200
            
        return jsonify({
            'id': pricing.id,
            'base_price': float(pricing.base_price),
            'price_per_km': float(pricing.price_per_km),
            'price_per_kg': float(pricing.price_per_kg),
            'express_fee': float(pricing.express_fee),
            'weekend_fee': float(pricing.weekend_fee),
            'night_fee': float(pricing.night_fee),
            'city_surcharge': float(pricing.city_surcharge)
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching pricing: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/pricing', methods=['PUT'])
@token_required
@role_required('admin')
def update_pricing_settings(current_user):
    """עדכון מחירון (יוצר רשומה חדשה להיסטוריה)"""
    try:
        data = request.json
        
        # Deactivate old pricing
        old_pricings = Pricing.query.filter_by(is_active=True).all()
        for p in old_pricings:
            p.is_active = False
            
        # Create new pricing record
        new_pricing = Pricing(
            base_price=data.get('base_price', 20.0),
            price_per_km=data.get('price_per_km', 5.0),
            price_per_kg=data.get('price_per_kg', 2.0),
            express_fee=data.get('express_fee', 30.0),
            weekend_fee=data.get('weekend_fee', 15.0),
            night_fee=data.get('night_fee', 25.0),
            city_surcharge=data.get('city_surcharge', 10.0),
            is_active=True
        )
        
        db.session.add(new_pricing)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pricing updated successfully',
            'id': new_pricing.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
