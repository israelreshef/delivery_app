import time
import random
from app import app
from models import db, Courier

def move_couriers():
    """
    Simulates courier movement for demo purposes.
    Updates lat/lon and PostGIS geometry every 2 seconds.
    """
    with app.app_context():
        print("🚀 Starting courier movement simulation (Press Ctrl+C to stop)...")
        # Bounds for Tel Aviv area to keep them roughly on screen
        # Not strictly enforced, just random walk
        
        while True:
            try:
                couriers = Courier.query.filter_by(is_available=True).all()
                
                if not couriers:
                    print("⚠️ No available couriers found to move.")
                
                for courier in couriers:
                    # Initialize location if missing (Center TLV)
                    if not courier.current_location_lat:
                        courier.current_location_lat = 32.0853
                        courier.current_location_lng = 34.7818

                    # Move slightly (approx 50-100 meters random direction)
                    # 0.001 degrees is roughly 111 meters
                    lat_move = random.uniform(-0.0005, 0.0005)
                    lng_move = random.uniform(-0.0005, 0.0005)
                    
                    courier.current_location_lat += lat_move
                    courier.current_location_lng += lng_move
                    
                    # Update PostGIS geometry column
                    # Note: PostGIS uses (x, y) -> (lng, lat)
                    courier.location_geom = f'POINT({courier.current_location_lng} {courier.current_location_lat})'
                
                db.session.commit()
                print(f"📡 Updated locations for {len(couriers)} couriers...")
                
                # Wait 2 seconds before next update
                time.sleep(2)
                
            except Exception as e:
                print(f"❌ Error in simulation loop: {e}")
                db.session.rollback()
                time.sleep(5)

if __name__ == "__main__":
    move_couriers()
