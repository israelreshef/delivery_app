import random
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from models import Customer, Delivery, Invoice, Payment, Expense, CustomerNote, CustomerTask, CustomerFile, User, AuditLog

app = create_app()

def seed():
    with app.app_context():
        # Clean up any existing test customer with this email if necessary, or just create a new one
        test_email = f"bamba_{random.randint(1000,9999)}@osem.co.il"
        
        u = User(username=test_email, email=test_email, phone="050-1234567", user_type='customer', is_active=True)
        u.set_password("123456")
        db.session.add(u)
        db.session.flush()

        c = Customer(
            user_id=u.id,
            full_name="אוסם השקעות בע״מ",
            company_name="אוסם השקעות",
            phone="050-1234567",
            customer_type="business",
            business_id="510003204",
            credit_limit=150000.0,
            balance=25000.0,
            payment_terms="shotef_plus_60",
            contact_person="דן שילון"
        )
        db.session.add(c)
        db.session.commit()
        
        print(f"Created Customer ID {c.id}")
        
        # Add Expenses
        for i in range(3):
            expense_date = (datetime.utcnow().date() - timedelta(days=i)).isoformat()
            db.session.execute(db.text("""
                INSERT INTO expenses (customer_id, description, amount, base_amount, total_amount, expense_date, category, payment_method, created_at, is_contractor_invoice, vat_amount, withholding_tax_deducted)
                VALUES (:cid, :desc, :amt, :bamt, :tamt, :edate, :cat, :pmethod, CURRENT_TIMESTAMP, 0, 0, 0)
            """), {
                'cid': c.id,
                'desc': f"הוצאת דלק - שליחות {i}",
                'amt': 117.0,
                'bamt': 100.0,
                'tamt': 117.0,
                'edate': expense_date,
                'cat': "דלק",
                'pmethod': 'Bank Transfer'
            })
            
        # Add Notes
        n = CustomerNote(customer_id=c.id, content="לקוח VIP, תמיד לתת להם עדיפות.", created_by=1)
        db.session.add(n)
        
        # Add Tasks
        t = CustomerTask(customer_id=c.id, title="לחדש חוזה משלוחים לשנה הבאה", description="פגישה פיזית.", due_date=datetime.utcnow()+timedelta(days=7), created_by=1, status="open")
        db.session.add(t)
        
        # Add Audit Log
        db.session.execute(db.text("INSERT INTO audit_logs (user_id, action, resource_type, resource_id, status, details, timestamp) VALUES (1, 'CREATE', 'Customer', :cid, 'SUCCESS', 'Customer profile initialized manually for integration testing', CURRENT_TIMESTAMP)"), {'cid': str(c.id)})
        
        db.session.commit()
        print("Done!")

import traceback
try:
    seed()
except Exception as e:
    with open('err.log', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
    print("FAILED")
