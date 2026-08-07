from flask import Blueprint, request, jsonify
from models import db, Pricing
import logging
import os
from utils.decorators import token_required, role_required

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
@token_required
@role_required('admin')
def get_all_settings(current_user):
    """Aggregated settings: pricing + branding + general"""
    try:
        pricing = Pricing.query.filter_by(is_active=True).first()
        pricing_data = {
            'base_price': float(pricing.base_price) if pricing else 20.0,
            'price_per_km': float(pricing.price_per_km) if pricing else 5.0,
            'price_per_kg': float(pricing.price_per_kg) if pricing else 2.0,
            'express_fee': float(pricing.express_fee) if pricing else 30.0,
            'weekend_fee': float(pricing.weekend_fee) if pricing else 15.0,
            'night_fee': float(pricing.night_fee) if pricing else 25.0,
            'city_surcharge': float(pricing.city_surcharge) if pricing else 10.0,
        }

        try:
            branding_data = _load_branding()
        except Exception:
            branding_data = {}

        return jsonify({
            'pricing': pricing_data,
            'branding': branding_data,
            'general': {
                'company_name': 'TZIR',
                'currency': 'ILS',
                'timezone': 'Asia/Jerusalem',
                'language': 'he',
            }
        }), 200
    except Exception as e:
        logging.error(f"Settings aggregation error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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


# ── Phase: Brand Design Settings ──────────────────────────────────────

import json

BRANDING_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'branding.json')

DEFAULT_BRANDING = {
    'primaryColor': '#145DDB',
    'primaryDark': '#1048B0',
    'primaryLight': '#5AA0FF',
    'navyDark': '#07162C',
    'navyMid': '#0C1E3A',
    'navyLight': '#1A3566',
    'accentColor': '#145DDB',
    'successColor': '#16A34A',
    'destructiveColor': '#EF4444',
    'borderRadius': '10',
    'fontFamily': 'Heebo',
    'logoUrl': '',
    'faviconUrl': '',
    'companyName': 'TZIR',
    'companyTagline': 'שליחויות חכמות'
}


def _load_branding():
    """Load saved branding or return defaults"""
    try:
        if os.path.exists(BRANDING_FILE):
            with open(BRANDING_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                merged = {**DEFAULT_BRANDING, **saved}
                return merged
    except Exception:
        pass
    return DEFAULT_BRANDING.copy()


def _save_branding(data):
    """Save branding to disk"""
    with open(BRANDING_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@settings_bp.route('/branding/public', methods=['GET'])
def get_branding_public():
    """Public GET — load brand colors without auth (used by global CSS provider)"""
    return jsonify(_load_branding()), 200


@settings_bp.route('/branding', methods=['GET'])
@token_required
@role_required('admin')
def get_branding(current_user):
    """GET current brand settings (admin only)"""
    return jsonify(_load_branding()), 200


@settings_bp.route('/branding', methods=['PUT'])
@token_required
@role_required('admin')
def update_branding(current_user):
    """PUT / save brand settings"""
    try:
        data = request.json
        current = _load_branding()
        # Only update provided keys
        for key in DEFAULT_BRANDING:
            if key in data:
                current[key] = data[key]
        _save_branding(current)
        return jsonify({'success': True, 'branding': current}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

