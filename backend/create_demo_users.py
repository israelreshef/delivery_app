from backend.app import create_app
from backend.extensions import db
from backend.models import User, Courier, Customer
from werkzeug.security import generate_password_hash

app, _ = create_app()

def create_or_update_user(username, email, password, role, phone):
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"Creating new user: {username}")
            user = User(username=username, email=email, phone=phone, user_type=role)
            db.session.add(user)
        else:
            print(f"Updating existing user: {username}")

        # FORCE update password hash
        user.set_password(password)
        user.user_type = role 
        db.session.flush()

        # Handle Role Specifics
        if role == 'courier':
            courier = Courier.query.filter_by(user_id=user.id).first()
            if not courier:
                courier = Courier(user_id=user.id, full_name=f"Demo {username}", vehicle_type='scooter', is_available=True)
                db.session.add(courier)
            else:
                courier.is_available = True
                
        elif role == 'customer':
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                customer = Customer(user_id=user.id, full_name=f"Demo {username}", company_name=f"{username} Ltd")
                db.session.add(customer)
                
    except Exception as e:
        print(f"Error processing {username}: {e}")

with app.app_context():
    print("🔐 Creating Secure Demo Accounts...")
    
    # 1. Admin
    create_or_update_user('demo_admin', 'admin@tzir.com', 'AdminPower2026!', 'admin', '0501111111')
    
    # 2. Courier
    create_or_update_user('demo_courier', 'courier@tzir.com', 'RiderFast99!', 'courier', '0502222222')
    
    # 3. Customer
    create_or_update_user('demo_client', 'client@tzir.com', 'ClientShop88!', 'customer', '0503333333')
    
    db.session.commit()
    print("✅ Demo Accounts Ready!")
