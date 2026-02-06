import sys
import os
from pathlib import Path
from random import uniform, choice
import warnings

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app
from models import db, User, Courier
from werkzeug.security import generate_password_hash

app, _ = create_app()

def seed_couriers():
    with app.app_context():
        print("🌱 Seeding Mock Couriers...")
        
        # Center of Tel Aviv: 32.0853, 34.7818
        base_lat = 32.0853
        base_lng = 34.7818
        
        courier_profiles = [
            {"name": "Avi Cohen (Scooter/Fast)", "vehicle": "scooter", "rating": 4.9, "offset": (0.01, 0.01)}, # Close
            {"name": "Benny Levi (Car/Far)", "vehicle": "car", "rating": 4.5, "offset": (0.05, 0.05)}, # Farther
            {"name": "Gadi Yagil (Van/Pro)", "vehicle": "van", "rating": 5.0, "offset": (0.02, -0.02)}, 
            {"name": "Dani Shovevani (Bike/New)", "vehicle": "bicycle", "rating": 3.5, "offset": (-0.01, 0.01)},
            {"name": "Yossi Mahir (Banned)", "vehicle": "motorcycle", "rating": 1.0, "offset": (0.00, 0.00)} # Should have low score
        ]
        
        created_count = 0
        
        for profile in courier_profiles:
            username = f"courier_{profile['vehicle']}_{created_count}"
            email = f"{username}@test.com"
            
            # Check exist
            if User.query.filter_by(username=username).first():
                print(f"⚠️ {username} exists, skipping.")
                continue
                
            user = User(
                username=username,
                email=email,
                phone=f"050000000{created_count}",
                user_type='courier',
                is_active=True
            )
            user.set_password("123456")
            db.session.add(user)
            db.session.flush()
            
            courier = Courier(
                user_id=user.id,
                full_name=profile["name"],
                vehicle_type=profile["vehicle"],
                license_plate=f"12-{created_count}34-56",
                is_available=True,
                current_location_lat=base_lat + profile["offset"][0],
                current_location_lng=base_lng + profile["offset"][1],
                rating=profile["rating"],
                total_deliveries=int(uniform(10, 500)),
                onboarding_status='approved' # IMPORTANT for allocation
            )
            db.session.add(courier)
            created_count += 1
            
        db.session.commit()
        print(f"✅ Created {created_count} new couriers.")
        print("Run `python app.py` and create an order to test allocation.")

if __name__ == "__main__":
    seed_couriers()
