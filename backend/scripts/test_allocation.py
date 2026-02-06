import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app
from models import Delivery, Address, PickupPoint, DeliveryPoint, db
from utils.allocation_engine import AllocationEngine

app, _ = create_app()

def test_allocation():
    with app.app_context():
        print("🧪 Testing Allocation Algorithm...")
        
        # 1. Create a dummy delivery in memory (not saving to DB to avoid clutter, or save and rollback)
        # Center of Tel Aviv: 32.0853, 34.7818
        
        # Pickup at slight offset
        pickup = Address(latitude=32.0860, longitude=34.7820, street="Test Pickup", city="Tel Aviv", building_number="1")
        pickup_point = PickupPoint(address=pickup, contact_name="Test", contact_phone="050")
        
        delivery = Delivery(
            order_number="TEST-ALLOC",
            pickup_point=pickup_point,
            package_size="small",
            status="pending"
        )
        
        # 2. Run Allocation
        print(f"📍 Pickup Location: {pickup.latitude}, {pickup.longitude}")
        best_courier = AllocationEngine.find_best_courier(delivery)
        
        if best_courier:
            print(f"✅ SUCCESS: Assigned to {best_courier.full_name}")
            print(f"   Vehicle: {best_courier.vehicle_type}")
            print(f"   Rating: {best_courier.rating}")
            print(f"   Deliveries: {best_courier.total_deliveries}")
            print(f"   Location: {best_courier.current_location_lat}, {best_courier.current_location_lng}")
        else:
            print("❌ FAILURE: No courier assigned.")

if __name__ == "__main__":
    test_allocation()
