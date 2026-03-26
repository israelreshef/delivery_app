from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Lead, LeadActivity, User, Customer, CustomerPricingOverride, lead_status_enum, lead_source_enum, activity_type_enum
from utils.decorators import token_required, role_required
from utils.sanitization import sanitize_input
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
        lead_activities = LeadActivity.query.filter_by(lead_id=lead.id).order_by(desc(LeadActivity.created_at)).all()
        for activity in lead_activities:
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
        data = sanitize_input(request.get_json())
        
        company_val = data.get('company_name')
        if not company_val or str(company_val).strip() == '':
            company_val = data.get('contact_name')
        
        new_lead = Lead(
            contact_name=data.get('contact_name'),
            company_name=company_val,
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
        data = sanitize_input(request.get_json())
        
        if 'status' in data:
            lead.status = data['status']
        if 'assigned_to' in data:
            lead.assigned_to = data['assigned_to']
        if 'estimated_monthly_value' in data:
            lead.estimated_monthly_value = data['estimated_monthly_value']
        if 'notes' in data:
            lead.notes = data['notes']
        if 'next_follow_up' in data:
            if data['next_follow_up']:
                follow_up_dt = datetime.strptime(data['next_follow_up'], '%Y-%m-%d %H:%M')
                lead.next_follow_up = follow_up_dt
                
                # Bi-directional Google Calendar Sync Push
                try:
                    from services.google_calendar import GoogleCalendarService
                    cal_service = GoogleCalendarService(current_user)
                    if cal_service.is_configured():
                        summary = f"CRM Follow Up: {lead.contact_name}"
                        desc = f"Lead Status: {lead.status}\nPhone: {lead.phone}\nCompany: {lead.company_name or 'N/A'}\nNotes: {lead.notes or ''}"
                        cal_service.create_event(summary, desc, follow_up_dt)
                except Exception as e:
                    print(f"Google Calendar passive sync failed: {str(e)}")
            else:
                lead.next_follow_up = None
            
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
        data = sanitize_input(request.get_json())
        
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


@crm_bp.route('/leads/<int:lead_id>/convert', methods=['POST'])
@token_required
@role_required(['admin', 'sales'])
def convert_lead_to_customer(current_user, lead_id):
    """
    Convert a Lead into a registered Customer.
    """
    try:
        lead = Lead.query.get_or_404(lead_id)
        
        if lead.status == 'won' and lead.converted_to_customer_id:
            return jsonify({'message': 'Lead already converted', 'customer_id': lead.converted_to_customer_id}), 400

        import random
        import string
        
        temp_username = f"lead_{lead.id}_{random.randint(1000,9999)}"
        temp_email = lead.email if lead.email else f"{temp_username}@pending-customer.com"
        temp_pw = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        
        new_user = User(
            username=temp_username,
            email=temp_email,
            phone=lead.phone,
            user_type='customer'
        )
        new_user.set_password(temp_pw)
        db.session.add(new_user)
        db.session.flush()

        from models import Customer
        new_customer = Customer(
            user_id=new_user.id,
            full_name=lead.contact_name,
            company_name=lead.company_name or lead.contact_name,
            phone=lead.phone,
            customer_type='business' if lead.company_name else 'private',
            lead_source='crm_conversion'
        )
        db.session.add(new_customer)
        db.session.flush()
        
        lead.status = 'won'
        lead.converted_to_customer_id = new_customer.id
        lead.converted_at = datetime.utcnow()
        
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type='other',
            description='הומר ללקוח רשום בהצלחה.',
            performed_by=current_user.id
        )
        db.session.add(activity)
        
        db.session.commit()
        return jsonify({'message': 'Lead converted to customer successfully', 'customer_id': new_customer.id}), 200
        
    except Exception as e:
        db.session.rollback()
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

# =====================================================================
# Customer B2B Pricing Management
# =====================================================================

@crm_bp.route('/customers/<int:customer_id>/pricing', methods=['GET'])
@token_required
@role_required(['admin', 'sales', 'finance_admin'])
def get_customer_pricing(current_user, customer_id):
    """Fetch custom B2B pricing overrides for a customer"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        override = CustomerPricingOverride.query.filter_by(customer_id=customer.id).first()
        
        if not override:
            return jsonify({'message': 'No custom overrides. Customer uses standard global pricing.'}), 200
            
        return jsonify({
            'base_price': float(override.base_price) if override.base_price else None,
            'price_per_km': float(override.price_per_km) if override.price_per_km else None,
            'price_per_kg': float(override.price_per_kg) if override.price_per_kg else None,
            'discount_percentage': override.discount_percentage
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@crm_bp.route('/customers/<int:customer_id>/pricing', methods=['PUT'])
@token_required
@role_required(['admin', 'finance_admin'])
def update_customer_pricing(current_user, customer_id):
    """Set or update B2B pricing overrides for a customer"""
    try:
        data = sanitize_input(request.json)
        customer = Customer.query.get_or_404(customer_id)
        override = CustomerPricingOverride.query.filter_by(customer_id=customer.id).first()
        
        if not override:
            override = CustomerPricingOverride(customer_id=customer.id)
            db.session.add(override)
            
        if 'base_price' in data:
            override.base_price = data['base_price']
        if 'price_per_km' in data:
            override.price_per_km = data['price_per_km']
        if 'price_per_kg' in data:
            override.price_per_kg = data['price_per_kg']
        if 'discount_percentage' in data:
            override.discount_percentage = float(data['discount_percentage'])
            
        # Ensure customer is marked as business
        if customer.customer_type != 'business':
             customer.customer_type = 'business'
             
        db.session.commit()
        
        from utils.audit import log_audit
        log_audit(
            action='UPDATE_B2B_PRICING',
            user_id=current_user.id,
            resource_type='Customer',
            resource_id=customer.id,
            details=f"Updated override: Base={override.base_price}, Discount={override.discount_percentage}"
        )
        
        return jsonify({'message': 'Customer B2B pricing updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
