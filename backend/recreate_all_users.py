import sys
from pathlib import Path
from werkzeug.security import generate_password_hash

# Add the current directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from models import User, Courier, Customer

app = create_app()

def setup_user(username, email, password, role, full_name, admin_role=None):
    user = User.query.filter_by(email=email).first()
    if not user:
        print(f"Creating {role}: {username}...")
        user = User(
            username=username,
            email=email,
            phone="0500000000",
            user_type=role,
            admin_role=admin_role,
            is_active=True
        )
        user.password_hash = generate_password_hash(password)
        db.session.add(user)
        db.session.flush()
        
        if role == 'courier':
            courier = Courier(
                user_id=user.id,
                full_name=full_name,
                vehicle_type='motorcycle',
                is_available=True
            )
            db.session.add(courier)
        elif role == 'customer':
            customer = Customer(
                user_id=user.id,
                full_name=full_name,
                company_name="TZIR Demo Corp"
            )
            db.session.add(customer)
    else:
        print(f"User {username} already exists, updating password...")
        user.password_hash = generate_password_hash(password)
        user.user_type = role
        user.admin_role = admin_role

with app.app_context():
    # 1. Super Admin
    setup_user('super_admin', 'admin@tzir.com', 'TzirSuper2026!$!', 'admin', 'TZIR Super Admin', 'super_admin')
    
    # 2. Finance Admin
    setup_user('finance_admin', 'finance@tzir.com', 'TzirFinance$$99', 'admin', 'TZIR Finance', 'finance_admin')
    
    # 3. Demo Client
    setup_user('demo_client', 'client@tzir.com', 'TzirClient2026!', 'customer', 'Demo Customer')
    
    # 4. Demo Courier
    setup_user('demo_courier', 'courier@tzir.com', 'TzirRiderSpeed!77', 'courier', 'Demo Rider')
    
    db.session.commit()
    print("✨ All demo accounts recreated successfully!")
