
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app import create_app
from models import db, Courier, User

app = create_app()
with app.app_context():
    couriers = Courier.query.all()
    print(f"Total Couriers: {len(couriers)}")
    for c in couriers:
        print(f"ID: {c.id}, Name: {c.full_name}, Avail: {c.is_available}, Lat: {c.current_location_lat}, Lng: {c.current_location_lng}")
