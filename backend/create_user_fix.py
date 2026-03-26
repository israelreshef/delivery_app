from gevent import monkey
monkey.patch_all()
from app import create_app
from extensions import db
from models import User, Courier, Customer
from werkzeug.security import generate_password_hash

def create_specific_users():
    app = create_app()
    with app.app_context():
        users_to_create = [
            ('demo_courier', 'demo_courier@tzir.com', 'Demo1234!', 'courier'),
            ('demo_customer', 'demo_customer@tzir.com', 'Demo1234!', 'customer'),
            ('demo_admin', 'demo_admin@tzir.com', 'Demo1234!', 'admin')
        ]
        
        for username, email, password, role in users_to_create:
            user = User.query.filter_by(username=username).first()
            if not user:
                print(f"Creating user {username}...")
                user = User(
                    username=username,
                    email=email,
                    user_type=role,
                    phone="0500000000"
                )
            else:
                print(f"Updating user {username}...")
            
            user.password_hash = generate_password_hash(password)
            user.user_type = role
            db.session.add(user)
            db.session.flush() # Get user id
            
            if role == 'courier':
                if not Courier.query.filter_by(user_id=user.id).first():
                    db.session.add(Courier(user_id=user.id, full_name="Demo Courier", vehicle_type='scooter', is_available=True))
            elif role == 'customer':
                if not Customer.query.filter_by(user_id=user.id).first():
                    db.session.add(Customer(user_id=user.id, full_name="Demo Customer", company_name="Demo Corp"))
            elif role == 'admin':
                user.admin_role = 'super_admin'
                
        db.session.commit()
        print("Done creating users.")

if __name__ == "__main__":
    create_specific_users()
