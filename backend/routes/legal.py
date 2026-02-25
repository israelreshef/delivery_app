from flask import Blueprint, request, jsonify
from models import db, Delivery, LegalDeliveryEvidence
from utils.decorators import token_required, role_required
import logging
from datetime import datetime
import json

legal_bp = Blueprint('legal', __name__)

@legal_bp.route('/<int:delivery_id>/sign', methods=['POST'])
@token_required
@role_required('courier')
def sign_legal_delivery(current_user, delivery_id):
    """
    Courier endpoint to digitally sign a Legal Delivery.
    Requires mandatory geolocation and proof of timestamp.
    """
    try:
        data = request.json
        lat = data.get('latitude')
        lng = data.get('longitude')
        signature_hash = data.get('digital_signature_id') # From external service or client-side generation
        
        if lat is None or lng is None:
            return jsonify({'error': 'Geolocation (latitude and longitude) is legally required for this delivery.'}), 400
            
        delivery = Delivery.query.get_or_404(delivery_id)
        
        # Verify Courier Auth
        if delivery.courier_id != current_user.courier.id:
            return jsonify({'error': 'You are not assigned to this legal delivery.'}), 403
            
        if delivery.delivery_type != 'legal_document':
            return jsonify({'error': 'This delivery is not classified as a legal document.'}), 400
            
        if delivery.legal_evidence is not None:
            return jsonify({'error': 'Legal evidence already exists for this delivery.'}), 400

        # Initialize Chain of Custody Log
        chain_log = [
            {
                "actor": "courier",
                "courier_id": current_user.courier.id,
                "action": "legal_signature_collected",
                "timestamp": datetime.utcnow().isoformat(),
                "location": {"lat": lat, "lng": lng}
            }
        ]

        evidence = LegalDeliveryEvidence(
            delivery_id=delivery.id,
            signed_lat=lat,
            signed_lng=lng,
            signed_at=datetime.utcnow(),
            digital_signature_id=signature_hash,
            chain_of_custody_log=json.dumps(chain_log)
        )
        
        db.session.add(evidence)
        
        # Optionally, mark delivery as delivered here
        delivery.status = 'delivered'
        delivery.actual_delivery_time = datetime.utcnow()
        delivery.pod_location_lat = lat
        delivery.pod_location_lng = lng
        
        db.session.commit()
        
        # Audit Logging
        from utils.audit import log_audit
        log_audit(
            action='LEGAL_DELIVERY_SIGNED',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=delivery.id,
            details=f"Legal signature collected at [{lat}, {lng}]"
        )
        
        return jsonify({
            'success': True,
            'message': 'Legal delivery signed and secured in the chain of custody.',
            'evidence_id': evidence.id
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error signing legal delivery: {e}")
        return jsonify({'error': str(e)}), 500

@legal_bp.route('/<int:delivery_id>/evidence', methods=['GET'])
@token_required
@role_required(['admin', 'customer', 'finance_admin'])
def get_legal_evidence(current_user, delivery_id):
    """
    Retrieves the chain of custody and legal evidence for a delivery.
    """
    try:
        delivery = Delivery.query.get_or_404(delivery_id)
        
        # Security Checks
        if current_user.user_type == 'customer' and delivery.customer_id != current_user.customer.id:
             return jsonify({'error': 'Unauthorized access.'}), 403
             
        evidence = delivery.legal_evidence
        if not evidence:
            return jsonify({'error': 'No legal evidence found for this delivery.'}), 404
            
        return jsonify({
            'delivery_id': evidence.delivery_id,
            'signed_at': evidence.signed_at.isoformat(),
            'location': {
                'lat': evidence.signed_lat,
                'lng': evidence.signed_lng
            },
            'digital_signature_id': evidence.digital_signature_id,
            'chain_of_custody': json.loads(evidence.chain_of_custody_log) if evidence.chain_of_custody_log else []
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@legal_bp.route('/traffic', methods=['GET', 'POST'])
@token_required
@role_required(['admin', 'operations_manager'])
def manage_traffic_scores(current_user):
    """
    Manage Traffic Scores and Violations for Couriers
    GET: Retrieve all traffic records
    POST: Add a new traffic violation/score
    """
    from models import TrafficScore
    
    if request.method == 'GET':
        courier_id = request.args.get('courier_id')
        query = TrafficScore.query
        if courier_id:
            query = query.filter_by(courier_id=courier_id)
            
        records = query.order_by(TrafficScore.created_at.desc()).all()
        return jsonify([{
            'id': r.id,
            'courier_id': r.courier_id,
            'points': r.points,
            'violation_type': r.violation_type,
            'violation_date': r.violation_date.isoformat(),
            'notes': r.notes,
            'created_at': r.created_at.isoformat()
        } for r in records]), 200
        
    elif request.method == 'POST':
        data = request.json
        try:
            new_record = TrafficScore(
                courier_id=data['courier_id'],
                points=data.get('points', 0),
                violation_type=data['violation_type'],
                violation_date=datetime.fromisoformat(data['violation_date'].replace('Z', '+00:00')),
                notes=data.get('notes')
            )
            db.session.add(new_record)
            db.session.commit()
            return jsonify({'message': 'Traffic record created successfully', 'id': new_record.id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

@legal_bp.route('/cases', methods=['GET', 'POST'])
@token_required
@role_required(['admin', 'operations_manager', 'finance_admin'])
def manage_legal_cases(current_user):
    """
    Manage Legal Cases involving Couriers
    GET: Retrieve all legal cases
    POST: Open a new legal case
    """
    from models import LegalCase
    
    if request.method == 'GET':
        status = request.args.get('status')
        query = LegalCase.query
        if status:
            query = query.filter_by(status=status)
            
        cases = query.order_by(LegalCase.created_at.desc()).all()
        return jsonify([{
            'id': c.id,
            'courier_id': c.courier_id,
            'case_number': c.case_number,
            'status': c.status,
            'description': c.description,
            'lawyer_assigned': c.lawyer_assigned,
            'court_date': c.court_date.isoformat() if c.court_date else None,
            'created_at': c.created_at.isoformat()
        } for c in cases]), 200
        
    elif request.method == 'POST':
        data = request.json
        try:
            import uuid
            new_case = LegalCase(
                courier_id=data['courier_id'],
                case_number=data.get('case_number', f"CAS-{uuid.uuid4().hex[:8].upper()}"),
                description=data['description'],
                lawyer_assigned=data.get('lawyer_assigned'),
                status=data.get('status', 'open')
            )
            if 'court_date' in data and data['court_date']:
                 new_case.court_date = datetime.fromisoformat(data['court_date'].replace('Z', '+00:00'))
                 
            db.session.add(new_case)
            db.session.commit()
            return jsonify({'message': 'Legal case opened successfully', 'case_number': new_case.case_number}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
