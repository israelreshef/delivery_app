import sys
import os
sys.path.insert(0, r'c:\Users\Israel\Desktop\delivery_app\backend')

from app import create_app
from extensions import db
from models import User, Courier, Delivery

def check_counts():
    app = create_app()
    with app.app_context():
        print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"Users count: {User.query.count()}")
        print(f"Couriers count: {Courier.query.count()}")
        print(f"Deliveries count: {Delivery.query.count()}")
        
        # Check active couriers
        active_couriers = Courier.query.filter_by(is_available=True).all()
        print(f"Available couriers: {len(active_couriers)}")
        for c in active_couriers:
            print(f" - Courier ID: {c.id}, Name: {c.full_name}, Location: {c.current_location_lat}, {c.current_location_lng}")

if __name__ == "__main__":
    check_counts()
