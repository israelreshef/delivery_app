import sys
import os
from datetime import datetime, timedelta
import random

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app import create_app
from extensions import db
from models import User, Customer, Invoice, Delivery, CustomerTask, CustomerFile, CustomerNote, Payment
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # 1. Ensure admin user exists
    admin = User.query.filter_by(email='admin@tzir.com').first()
    if not admin:
        admin = User(
            username='admin_tzir',
            email='admin@tzir.com',
            role='admin',
            status='active'
        )
        admin.password_hash = generate_password_hash('admin123')
        db.session.add(admin)
        db.session.commit()
        print("✅ Created missing admin@tzir.com (pass: admin123)")
    else:
        # Force password reset to admin123 just in case
        admin.password_hash = generate_password_hash('admin123')
        db.session.commit()
        print("✅ Verified admin@tzir.com (pass: admin123)")

    # 2. Create rich dummy E2E customer
    company_name = f"Test E2E Corporation {random.randint(1000, 9999)}"
    
    customer = Customer(
        full_name=company_name,
        phone=f"050-{random.randint(1000000, 9999999)}",
        business_id=f"51{random.randint(1000000, 9999999)}",
        default_address="רחוב הבדיקות 42, תל אביב",
        customer_type="business",
        status="active",
        payment_terms="שוטף + 30",
        credit_limit=50000.0,
        website="https://www.teste2e.com",
        lead_source="Website Form",
        tags="VIP, Tech, enterprise",
        contact_person="Moshe Cohen"
    )
    db.session.add(customer)
    db.session.commit()
    print(f"✅ Created Customer: {customer.full_name} (ID: {customer.id})")

    # Update customer explicitly to trigger an Audit Log manually if needed, 
    # but SQLAlchemy models listener (utils/audit_trail.py) handles it!
    customer.credit_limit = 75000.0
    customer.status = "active" # dummy update
    db.session.commit()

    # 3. Seed Deliveries (Orders)
    for i in range(3):
        d = Delivery(
            customer_id=customer.id,
            origin_address="מחסן מרכזי",
            destination_address=customer.default_address,
            recipient_name=customer.contact_person,
            recipient_phone=customer.phone,
            package_description=f"Standard Office Equipment Part {i+1}",
            status="completed" if i < 2 else "pending",
            delivery_fee=random.randint(150, 400),
            created_at=datetime.utcnow() - timedelta(days=i*5)
        )
        db.session.add(d)
    
    # 4. Seed Invoices (which feed the financial display)
    # Total 3 invoices: 2 paid, 1 unpaid, 1 cancelled
    inv_paid1 = Invoice(customer_id=customer.id, invoice_number=f"INV-{random.randint(1000,9999)}", total_amount=1200.50, status="paid", issue_date=datetime.utcnow() - timedelta(days=30))
    inv_paid2 = Invoice(customer_id=customer.id, invoice_number=f"INV-{random.randint(1000,9999)}", total_amount=800.00, status="paid", issue_date=datetime.utcnow() - timedelta(days=20))
    inv_open = Invoice(customer_id=customer.id, invoice_number=f"INV-{random.randint(1000,9999)}", total_amount=450.00, status="sent", issue_date=datetime.utcnow() - timedelta(days=5))
    inv_cancelled = Invoice(customer_id=customer.id, invoice_number=f"INV-{random.randint(1000,9999)}", total_amount=2000.00, status="cancelled", issue_date=datetime.utcnow() - timedelta(days=40))
    
    db.session.add_all([inv_paid1, inv_paid2, inv_open, inv_cancelled])

    # 5. Seed Payments (Activities pane)
    pay1 = Payment(customer_id=customer.id, amount=1200.50, payment_method="Bank Transfer", payment_date=datetime.utcnow() - timedelta(days=28))
    pay2 = Payment(customer_id=customer.id, amount=800.00, payment_method="Credit Card", payment_date=datetime.utcnow() - timedelta(days=19))
    db.session.add_all([pay1, pay2])

    # 6. Seed Tasks
    t1 = CustomerTask(customer_id=customer.id, title="Follow up on unpaid invoice", description="Give them a call regarding INV...", priority="high", status="open", due_date=datetime.utcnow() + timedelta(days=2))
    t2 = CustomerTask(customer_id=customer.id, title="Send welcome package", priority="medium", status="completed", completed_at=datetime.utcnow() - timedelta(days=10))
    db.session.add_all([t1, t2])

    # 7. Seed Notes
    n1 = CustomerNote(customer_id=customer.id, content="Customer called and asked for a discount on the next delivery. Discussed with manager, approved 10%.", created_by=admin.id)
    n2 = CustomerNote(customer_id=customer.id, content="Onboarded successfully.", created_by=admin.id, created_at=datetime.utcnow() - timedelta(days=35))
    db.session.add_all([n1, n2])

    db.session.commit()
    print("✅ Seeded Orders, Invoices, Payments, Tasks, and Notes.")
    print(f"\n🚀 SUCCESS! Login using: admin@tzir.com / admin123")
    print(f"👉 Navigate to: http://localhost:3000/admin/customers/{customer.id}")
