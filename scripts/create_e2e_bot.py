import sys
import os
from werkzeug.security import generate_password_hash

# Add backend to path so we can import as if we are inside backend/
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app import create_app
from extensions import db
from models import User, Courier

app = create_app()

def create_e2e_bot():
    with app.app_context():
        username = 'e2e_bot'
        email = 'e2e_bot@tzir.com'
        password = 'TestBot2026!'
        phone = '0509999999'
        
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"Creating new test bot: {username}")
            user = User(username=username, email=email, phone=phone, user_type='courier')
            user.password_hash = generate_password_hash(password)
            db.session.add(user)
            db.session.flush()
            
            courier = Courier(
                user_id=user.id, 
                full_name=f"E2E Test Bot", 
                vehicle_type='scooter', 
                is_available=True,
                current_location_lat=32.0850,
                current_location_lng=34.7810
            )
            db.session.add(courier)
            db.session.commit()
            print("✅ e2e_bot created successfully.")
        else:
            print(f"e2e_bot already exists. Updating password and making available.")
            user.password_hash = generate_password_hash(password)
            courier = Courier.query.filter_by(user_id=user.id).first()
            if courier:
                courier.is_available = True
            db.session.commit()
            print("✅ e2e_bot updated successfully.")

if __name__ == "__main__":
    create_e2e_bot()
