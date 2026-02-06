from flask import Blueprint, request, jsonify
from models import db, Lead, LeadActivity, User, Customer, lead_status_enum, lead_source_enum, activity_type_enum
from utils.decorators import token_required, role_required
import logging
from datetime import datetime
from sqlalchemy import desc

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/leads', methods=['GET'])
@token_required
@role_required(['admin', 'sales'])
def get_leads(current_user):
    """
    Get all leads with optional filtering
    """
    try:
        status = request.args.get('status')
        source = request.args.get('source')
        assigned_to = request.args.get('assigned_to')
        
        query = Lead.query
        
        if status:
            query = query.filter_by(status=status)
        if source:
            query = query.filter_by(source=source)
        if assigned_to:
            query = query.filter_by(assigned_to=assigned_to)
            
        leads = query.order_by(desc(Lead.created_at)).all()
        
        result = []
        for lead in leads:
            result.append({
                'id': lead.id,
                'contact_name': lead.contact_name,
                'company_name': lead.company_name,
                'email': lead.email,
                'phone': lead.phone,
                'status': lead.status,
                'source': lead.source,
                'estimated_monthly_value': lead.estimated_monthly_value,
                'assigned_to': lead.assigned_to,
                'next_follow_up': lead.next_follow_up.strftime('%Y-%m-%d %H:%M') if lead.next_follow_up else None,
                'created_at': lead.created_at.strftime('%Y-%m-%d %H:%M'),
                'notes': lead.notes
            })
            
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f"Error fetching leads: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/leads/<int:lead_id>', methods=['GET'])
@token_required
@role_required(['admin', 'sales'])
def get_lead(current_user, lead_id):
    """
    Get single lead details with activities
    """
    try:
        lead = Lead.query.get_or_404(lead_id)
        
        activities = []
        for activity in lead.activities.order_by(desc(LeadActivity.created_at)).all():
            activities.append({
                'id': activity.id,
                'activity_type': activity.activity_type,
                'description': activity.description,
                'performed_by': activity.performed_by,
                'created_at': activity.created_at.strftime('%Y-%m-%d %H:%M')
            })
            
        lead_data = {
            'id': lead.id,
            'contact_name': lead.contact_name,
            'company_name': lead.company_name,
            'email': lead.email,
            'phone': lead.phone,
            'status': lead.status,
            'source': lead.source,
            'estimated_monthly_value': lead.estimated_monthly_value,
            'assigned_to': lead.assigned_to,
            'next_follow_up': lead.next_follow_up.strftime('%Y-%m-%d %H:%M') if lead.next_follow_up else None,
            'notes': lead.notes,
            'created_at': lead.created_at.strftime('%Y-%m-%d %H:%M'),
            'activities': activities
        }
        
        return jsonify(lead_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/leads', methods=['POST'])
@token_required
@role_required(['admin', 'sales'])
def create_lead(current_user):
    """
    Create a new lead
    """
    try:
        data = request.get_json()
        
        new_lead = Lead(
            contact_name=data.get('contact_name'),
            company_name=data.get('company_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            source=data.get('source', 'other'),
            status=data.get('status', 'new'),
            estimated_monthly_value=data.get('estimated_monthly_value', 0),
            notes=data.get('notes'),
            assigned_to=current_user.id if not data.get('assigned_to') else data.get('assigned_to')
        )
        
        db.session.add(new_lead)
        db.session.commit()
        
        return jsonify({'message': 'Lead created successfully', 'id': new_lead.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/leads/<int:lead_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'sales'])
def update_lead(current_user, lead_id):
    """
    Update lead details (status, assignment, etc)
    """
    try:
        lead = Lead.query.get_or_404(lead_id)
        data = request.get_json()
        
        if 'status' in data:
            lead.status = data['status']
        if 'assigned_to' in data:
            lead.assigned_to = data['assigned_to']
        if 'estimated_monthly_value' in data:
            lead.estimated_monthly_value = data['estimated_monthly_value']
        if 'notes' in data:
            lead.notes = data['notes']
        if 'next_follow_up' in data:
            lead.next_follow_up = datetime.strptime(data['next_follow_up'], '%Y-%m-%d %H:%M') if data['next_follow_up'] else None
            
        # Update other fields as needed
        for field in ['contact_name', 'email', 'phone', 'company_name']:
            if field in data:
                setattr(lead, field, data[field])
                
        db.session.commit()
        
        return jsonify({'message': 'Lead updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/leads/<int:lead_id>/activity', methods=['POST'])
@token_required
@role_required(['admin', 'sales'])
def add_activity(current_user, lead_id):
    """
    Log a sales activity (call, meeting, etc)
    """
    try:
        lead = Lead.query.get_or_404(lead_id)
        data = request.get_json()
        
        activity = LeadActivity(
            lead_id=lead.id,
            performed_by=current_user.id,
            activity_type=data.get('activity_type'),
            description=data.get('description')
        )
        
        db.session.add(activity)
        
        # If activity is a 'call' or 'meeting', maybe update lead status automatically?
        # For now, keep it manual.
        
        db.session.commit()
        
        return jsonify({'message': 'Activity logged successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(str(e), exc_info=True)
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/pipeline', methods=['GET'])
@token_required
@role_required(['admin', 'sales'])
def get_pipeline_stats(current_user):
    """
    Get counts and value by stage for Kanban view
    """
    try:
        # Aggregate counts by status
        stats = db.session.query(
            Lead.status,
            db.func.count(Lead.id),
            db.func.sum(Lead.estimated_monthly_value)
        ).group_by(Lead.status).all()
        
        result = {}
        for status, count, value in stats:
            result[status] = {
                'count': count,
                'value': float(value) if value else 0
            }
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
