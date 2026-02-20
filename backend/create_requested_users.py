import sys
from pathlib import Path

# Add the current directory to sys.path to allow importing from the same folder
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from models import User, Courier, Customer
from werkzeug.security import generate_password_hash

app = create_app()

def create_or_update_user(username, email, password, role, phone):
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"Creating new user: {username} ({email})")
            user = User(username=username, email=email, phone=phone, user_type=role)
            db.session.add(user)
        else:
            print(f"Updating existing user: {username} ({email})")
            user.username = username

        # Update password and role
        user.password_hash = generate_password_hash(password)
        user.user_type = role 
        db.session.flush()

        # Role specific initialization
        if role == 'courier':
            if not Courier.query.filter_by(user_id=user.id).first():
                courier = Courier(user_id=user.id, full_name=f"{username}", vehicle_type='scooter', is_available=True)
                db.session.add(courier)
        elif role == 'customer':
            if not Customer.query.filter_by(user_id=user.id).first():
                customer = Customer(user_id=user.id, full_name=f"{username}")
                db.session.add(customer)
                
    except Exception as e:
        print(f"Error processing {username}: {e}")

with app.app_context():
    print("🔐 Creating Requested User Accounts...")
    
    # 1. Admin
    create_or_update_user('admin_tzir', 'admin@tzir.com', 'TzirSuper2026!$!', 'admin', '0501111111')
    
    # 2. Client
    create_or_update_user('client_tzir', 'client@tzir.com', 'TzirClient2026!', 'customer', '0503333333')
    
    db.session.commit()
    print("✅ Accounts Created Successfully!")
