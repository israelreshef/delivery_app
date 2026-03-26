from flask import Blueprint, jsonify, request
from models import db, DeliveryProtocolConfig, DeliveryProtocolTemplate
from utils.decorators import token_required
import logging

protocols_bp = Blueprint('protocols', __name__)

@protocols_bp.route('', methods=['GET'])
@token_required
def get_protocols(current_user):
    """List all active configs (grouped by category)"""
    try:
        configs = DeliveryProtocolConfig.query.filter_by(is_active=True).all()
        
        # Group by category
        grouped = {}
        for config in configs:
            cat = config.category
            if cat not in grouped:
                grouped[cat] = []
            
            grouped[cat].append({
                'id': config.id,
                'name': config.name,
                'slug': config.slug,
                'pricing_tier': config.pricing_tier,
                'chain_of_custody': config.chain_of_custody,
                'requires_otp': config.requires_otp
            })
            
        return jsonify(grouped), 200
    except Exception as e:
        logging.error(f"Error fetching protocols: {e}")
        return jsonify({'error': str(e)}), 500

@protocols_bp.route('/<slug>', methods=['GET'])
@token_required
def get_protocol_details(current_user, slug):
    """Get single protocol full details"""
    try:
        config = DeliveryProtocolConfig.query.filter_by(slug=slug).first()
        if not config:
            return jsonify({'error': 'Protocol not found'}), 404
            
        template = DeliveryProtocolTemplate.query.filter_by(code=config.base_protocol).first()
        
        result = {
            'id': config.id,
            'name': config.name,
            'slug': config.slug,
            'category': config.category,
            'base_template': {
                'code': template.code,
                'name': template.name,
                'steps': template.steps
            } if template else None,
            'requires_id_verification': config.requires_id_verification,
            'requires_photo': config.requires_photo,
            'requires_signature': config.requires_signature,
            'requires_otp': config.requires_otp,
            'otp_alternatives': config.otp_alternatives,
            'max_attempts': config.max_attempts,
            'return_document_required': config.return_document_required,
            'multi_stop_allowed': config.multi_stop_allowed,
            'chain_of_custody': config.chain_of_custody,
            'pricing_tier': config.pricing_tier,
            'pricing_multiplier': float(config.pricing_multiplier)
        }
        
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error fetching protocol details: {e}")
        return jsonify({'error': str(e)}), 500

@protocols_bp.route('/categories', methods=['GET'])
@token_required
def get_categories(current_user):
    """List category names + icons + count"""
    try:
        # Hardcoded icons for now as per spec
        icons = {
            'legal': '⚖️',
            'parcel': '📦',
            'biomedical': '🔬',
            'government': '🏛️',
            'financial': '💰',
            'realestate': '🏠',
            'medical': '🏥',
            'distribution': '🚚',
            'urgent': '🚀'
        }
        
        categories = db.session.query(
            DeliveryProtocolConfig.category, 
            db.func.count(DeliveryProtocolConfig.id)
        ).filter(DeliveryProtocolConfig.is_active == True).group_by(DeliveryProtocolConfig.category).all()
        
        result = []
        for cat, count in categories:
            result.append({
                'name': cat,
                'icon': icons.get(cat, '📦'),
                'count': count
            })
            
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error fetching categories: {e}")
        return jsonify({'error': str(e)}), 500
