import sys
import os

# Add backend to path
# Add backend to path so we can import as if we are inside backend/
# Add backend to path (Root is already in path)
# sys.path.insert(0, os.path.join(os.getcwd(), 'backend')) # REMOVED

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Courier, Customer, Delivery, Pricing, PickupPoint, DeliveryPoint
import random
from datetime import datetime

app, _ = create_app()

def seed():
    with app.app_context():
        print("🚀 Starting High-Performance Seeding...")
        
        # --- Create Secure Demo Users (Always Run) ---
        from werkzeug.security import generate_password_hash
        
        demos = [
            ('demo_admin', 'admin@tzir.com', 'AdminPower2026!', 'admin', '0501111111'),
            ('demo_courier', 'courier@tzir.com', 'RiderFast99!', 'courier', '0502222222'),
            ('demo_client', 'client@tzir.com', 'ClientShop88!', 'customer', '0503333333')
        ]
        
        print("🔐 Ensuring Secure Demo Accounts exist...")
        for username, email, pwd, role, phone in demos:
            u = User.query.filter_by(username=username).first()
            if not u:
                u = User(username=username, email=email, phone=phone, user_type=role)
                db.session.add(u)
            
            # Force update password/role to match documentation
            u.password_hash = generate_password_hash(pwd)
            u.user_type = role
            db.session.flush()
            
            if role == 'courier':
                if not Courier.query.filter_by(user_id=u.id).first():
                    db.session.add(Courier(user_id=u.id, full_name=f"Demo {username}", vehicle_type='scooter', is_available=True))
            elif role == 'customer':
                if not Customer.query.filter_by(user_id=u.id).first():
                    db.session.add(Customer(user_id=u.id, full_name=f"Demo {username}", company_name=f"{username} Ltd"))
        
        db.session.commit()
        print("✅ Service Accounts Secured.")

        if User.query.filter_by(username='perf_c_0').first():
             print("⚠️ Bulk data exists. Skipping bulk generation.")
             return

        users = []
        couriers = []
        base_lat, base_lng = 32.0853, 34.7818
        
        from werkzeug.security import generate_password_hash
        
        # Optimize: Generate hash ONCE to save ~15 minutes of CPU time
        # This makes the script run in seconds instead of minutes
        print("   ... Pre-calculating password hash for speed")
        common_password_hash = generate_password_hash('123456')
        
        for i in range(10000):
            u = User(username=f'perf_c_{i}', email=f'perf_c_{i}@test.com', phone=f'059{i:07d}', user_type='courier')
            u.password_hash = common_password_hash # FAST
            users.append(u)
            
            is_active = i < 1000 # 10% active
            c = Courier(user=u, full_name=f"Courier {i}", vehicle_type=random.choice(['scooter', 'car', 'bike']), is_available=is_active, current_location_lat=base_lat + random.uniform(-0.1, 0.1) if is_active else None, current_location_lng=base_lng + random.uniform(-0.1, 0.1) if is_active else None, rating=round(random.uniform(3.5, 5.0), 2), total_deliveries=random.randint(0, 1000))
            couriers.append(c)
            
            if len(users) >= 1000:
                db.session.add_all(users)
                db.session.flush()
                for idx, usr in enumerate(users): couriers[idx].user_id = usr.id
                db.session.add_all(couriers)
                db.session.commit()
                users = []; couriers = []
                print(f"   ... Batch {i} done")
        
        if users:
            db.session.add_all(users)
            db.session.flush()
            for idx, usr in enumerate(users): couriers[idx].user_id = usr.id
            db.session.add_all(couriers)
            db.session.commit()
            
        print("✅ Data Generation Complete!")

if __name__ == "__main__":
    seed()
