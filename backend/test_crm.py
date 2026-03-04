import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, Lead, LeadActivity
from sqlalchemy import desc

with app.app_context():
    try:
        lead = Lead.query.first()
        if not lead:
            print("No leads in DB")
            sys.exit(0)
            
        print(f"Testing lead ID: {lead.id}")
        
        # This is the exact code from get_lead in routes/crm.py
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
        
        print("SUCCESS:", lead_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
