import random
from app import create_app
from extensions import db
from models import User, Courier, Customer, Address, PickupPoint, DeliveryPoint, Delivery, Invoice
from datetime import datetime, timedelta
import uuid

# Helper to generate random coordinates (Tel Aviv area)
def get_random_coords():
    # Center around Tel Aviv
    base_lat = 32.0853
    base_lng = 34.7818
    
    # Random offset (approx 5-10km radius)
    lat_offset = random.uniform(-0.05, 0.05)
    lng_offset = random.uniform(-0.05, 0.05)
    
    return base_lat + lat_offset, base_lng + lng_offset

def create_random_data():
    app, _ = create_app()
    print(f"🔌 Connecting to database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    with app.app_context():
        # Clear existing data
        print("🗑️ Clearing existing data...")
        # Force clean PostgreSQL schema
        try:
            from sqlalchemy import text
            # Wipe entire schema (cascades to tables and types)
            db.session.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"))
            db.session.commit()
            
            # Enable PostGIS extension in a fresh transaction
            db.session.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            db.session.commit()
            
            print("✅ Schema wiped clean & PostGIS enabled.")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Could not wipe schema (might be SQLite?): {e}")
            db.drop_all()
            
        db.create_all()
        
        # 1. Create Data
        print("🌱 Seeding data with users and orders...")
        
        # Create Couriers
        couriers = []
        for i in range(10):
            user = User(
                username=f"courier_{i}",
                email=f"courier{i}@test.com",
                phone=f"050000000{i}",
                user_type='courier'
            )
            user.set_password("123456")
            db.session.add(user)
            db.session.flush()
            
            lat, lng = get_random_coords()
            
            courier = Courier(
                user_id=user.id,
                full_name=f"Courier {i}",
                vehicle_type=random.choice(['motorcycle', 'car', 'bicycle', 'van']),
                license_plate=f"12-345-{i:02d}",
                current_location_lat=lat,
                current_location_lng=lng,
                location_geom=f'POINT({lng} {lat})', # WKT Format for PostGIS
                is_available=True
            )
            db.session.add(courier)
            couriers.append(courier)
            
        # Create Customers
        customers = []
        for i in range(10):
            user = User(
                username=f"customer_{i}",
                email=f"cust{i}@test.com",
                phone=f"052000000{i}",
                user_type='customer'
            )
            user.set_password("123456")
            db.session.add(user)
            db.session.flush()
            
            customer = Customer(
                user_id=user.id,
                full_name=f"Customer {i}",
                company_name=f"Company {i}" if i % 2 == 0 else None
            )
            db.session.add(customer)
            customers.append(customer)
            
        db.session.flush()
        
        # Create Orders
        for i in range(10):
            customer = random.choice(customers)
            
            # Pickup
            p_lat, p_lng = get_random_coords()
            pickup_addr = Address(
                street=f"Pickup St {i}",
                city="Tel Aviv",
                building_number=str(random.randint(1, 50)),
                latitude=p_lat,
                longitude=p_lng,
                geom=f'POINT({p_lng} {p_lat})'
            )
            db.session.add(pickup_addr)
            db.session.flush()
            
            pickup = PickupPoint(
                address_id=pickup_addr.id,
                contact_name=customer.full_name,
                contact_phone=customer.user.phone
            )
            db.session.add(pickup)
            db.session.flush()
            
            # Delivery
            d_lat, d_lng = get_random_coords()
            del_addr = Address(
                street=f"Delivery St {i}",
                city="Tel Aviv",
                building_number=str(random.randint(1, 50)),
                latitude=d_lat,
                longitude=d_lng,
                geom=f'POINT({d_lng} {d_lat})'
            )
            db.session.add(del_addr)
            db.session.flush()
            
            dest = DeliveryPoint(
                address_id=del_addr.id,
                recipient_name=f"Recipient {i}",
                recipient_phone="0541234567"
            )
            db.session.add(dest)
            db.session.flush()
            
            # Order
            delivery = Delivery(
                order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
                customer_id=customer.id,
                pickup_point_id=pickup.id,
                delivery_point_id=dest.id,
                status=random.choice(['pending', 'assigned', 'picked_up', 'delivered']),
                distance_km=random.uniform(1.0, 15.0),
                package_size=random.choice(['small', 'medium', 'large'])
            )
            
            if delivery.status in ['assigned', 'picked_up']:
                delivery.courier_id = random.choice(couriers).id
                
            db.session.add(delivery)
            db.session.flush()
            
            # Invoice
            inv = Invoice(
                invoice_number=f"INV-{uuid.uuid4().hex[:8]}",
                customer_id=customer.id,
                delivery_id=delivery.id,
                subtotal=50.0,
                vat_amount=8.5,
                total_amount=58.5
            )
            db.session.add(inv)
            
        # Create Admin
        admin_user = User(
             username="admin",
             email="admin@tzir.com",
             phone="0000000000",
             user_type="admin"
        )
        admin_user.set_password("admin123")
        db.session.add(admin_user)

        db.session.commit()
        print("✅ Database seeded successfully with PostGIS geometries!")

if __name__ == '__main__':
    create_random_data()
