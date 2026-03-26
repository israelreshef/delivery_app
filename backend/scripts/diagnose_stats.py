import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from models import Courier
from sockets.delivery_events import connected_couriers

def check_state():
    app = create_app()
    with app.app_context():
        print("--- Database State ---")
        couriers = Courier.query.filter_by(is_available=True).all()
        print(f"Available Couriers in DB: {len(couriers)}")
        for c in couriers:
            print(f"  ID: {c.id}, Name: {c.full_name}, Available: {c.is_available}")

        print("\n--- Socket State ---")
        # Note: In a new process, connected_couriers will be empty
        # because it is an in-memory dictionary.
        # This script can only check the DB.
        print(f"Connected Couriers Dict (Empty in new process): {connected_couriers}")

if __name__ == "__main__":
    check_state()
