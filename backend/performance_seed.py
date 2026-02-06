from backend.app import create_app
from backend.extensions import db
from datetime import datetime
import random

# Initialize App
app, _ = create_app()

def performance_seed():
    with app.app_context():
        # Import models strictly from backend.models to ensure single source of truth
        from backend.models import User, Courier, Customer, Delivery, Pricing, PickupPoint, DeliveryPoint
        
        print("🚀 Starting High-Performance Seeding (10k Couriers)...")
        
        # Check if we already have too many to avoid duplication if run multiple times
        if User.query.count() > 5000:
            print("⚠️ Database already has significant data. Skipping bulk insert to avoid duplicates.")
            return

        # 1. Bulk Create Couriers
        users = []
        couriers = []
        base_lat, base_lng = 32.0853, 34.7818
        
        print("Generating 10,000 Couriers...")
        for i in range(10000):
            # Username must be unique
            u = User(username=f'perf_c_{i}', email=f'perf_c_{i}@test.com', phone=f'059{i:07d}', user_type='courier')
            u.set_password('123456') # Slow operation? Optimizing...
            # u.password_hash = '...' # In real perf test we'd skip hashing
            users.append(u)
            
            is_active = i < 1000 # 10% active
            
            c = Courier(
                user=u,
                full_name=f"Courier {i}",
                vehicle_type=random.choice(['scooter', 'car', 'bike']),
                is_available=is_active,
                current_location_lat=base_lat + random.uniform(-0.1, 0.1) if is_active else None,
                current_location_lng=base_lng + random.uniform(-0.1, 0.1) if is_active else None,
                rating=round(random.uniform(3.5, 5.0), 2),
                total_deliveries=random.randint(0, 1000)
            )
            couriers.append(c)
            
            if len(users) >= 1000:
                db.session.add_all(users)
                db.session.flush() # Flush to get IDs
                db.session.add_all(couriers)
                db.session.commit()
                users = []
                couriers = []
                print(f"   ... Committed batch {i}")

        if users:
            db.session.add_all(users)
            db.session.add_all(couriers)
            db.session.commit()
            
        print("✅ Couriers Done.")
        print("🏁 Simulation Ready!")

if __name__ == "__main__":
    performance_seed()
