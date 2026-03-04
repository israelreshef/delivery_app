import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, Lead, Customer, LeadActivity
from datetime import datetime

app = create_app()

with app.app_context():
    try:
        lead_id = 4
        lead = Lead.query.get(lead_id)
        if not lead:
            print(f"Lead {lead_id} not found")
            sys.exit(1)
            
        print(f"Converting Lead {lead.contact_name}...")
        
        new_customer = Customer(
            full_name=lead.contact_name,
            company_name=lead.company_name or lead.contact_name,
            phone=lead.phone,
            customer_type='business' if lead.company_name else 'private',
            lead_source='crm_conversion'
        )
        db.session.add(new_customer)
        db.session.flush()
        print(f"Customer created with ID {new_customer.id}")
        
        lead.status = 'won'
        lead.converted_to_customer_id = new_customer.id
        lead.converted_at = datetime.utcnow()
        
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type='other',
            description='הומר ללקוח רשום בהצלחה.',
            performed_by=1  # Dummy admin user ID
        )
        db.session.add(activity)
        
        # Don't actually commit so we don't mess up the DB if we want to re-run
        db.session.rollback()
        print("SUCCESS! No constraints failed during flush.")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
