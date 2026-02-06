import sys
import os
from datetime import datetime, timedelta
import random
from pathlib import Path

# Add parent directory to path to import app and models
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db

# Create App Instance but do not run it
app, _ = create_app()

# Mock Data
CITIES = ["Tel Aviv", "Ramat Gan", "Givatayim", "Herzliya", "Holon"]
STREETS = ["Dizengoff", "Rothschild", "Allenby", "Ibn Gabirol", "King George", "Arlozorov", "Bialik"]
FIRST_NAMES = ["David", "Sarah", "Moshe", "Rachel", "Yossi", "Noa", "Itay", "Maya", "Omer", "Gal"]
LAST_NAMES = ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman"]
COMPANY_NAMES = ["TechFlow", "Law & Order", "Green Logistics", "FastShip", "Urban Eats", "MediCare"]

def create_address():
    return Address(
        street=random.choice(STREETS),
        city=random.choice(CITIES),
        number=str(random.randint(1, 150)),
        floor=str(random.randint(1, 10)),
        lat=32.0853 + random.uniform(-0.05, 0.05), # Around TLV
        lon=34.7818 + random.uniform(-0.05, 0.05)
    )

def seed_database():
    with app.app_context():
        # Import models from app module where they are already loaded
        from app import User, Courier, Customer, Delivery, Lead, DeliveryStatus, Address, PickupPoint, DeliveryPoint, Pricing, Invoice
        
        print("🌱 Starting Data Seeding...")
        
        # 1. Clear existing data (Optional: comment out if you want to keep)
        # db.drop_all()
        # db.create_all()
        
        # 2. Create Admin
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', email='admin@tzir.com', phone='0500000000', user_type='admin', admin_role='super_admin')
            admin.set_password('admin123')
            db.session.add(admin)
            print("✅ Admin created")

        # 3. Create Couriers
        couriers = []
        for i in range(5):
            username = f'courier{i+1}'
            if not User.query.filter_by(username=username).first():
                user = User(username=username, email=f'{username}@tzir.com', phone=f'054000000{i}', user_type='courier')
                user.set_password('123456')
                db.session.add(user)
                db.session.flush()
                
                courier = Courier(
                    user_id=user.id,
                    full_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                    vehicle_type=random.choice(['scooter', 'car', 'bike']),
                    is_available=True,
                    current_location_lat=32.0853 + random.uniform(-0.02, 0.02),
                    current_location_lng=34.7818 + random.uniform(-0.02, 0.02),
                    rating=random.uniform(4.5, 5.0),
                    total_deliveries=random.randint(10, 500)
                )
                db.session.add(courier)
                couriers.append(courier)
        print(f"✅ Created {len(couriers)} couriers")

        # 4. Create Customers
        customers = []
        for i in range(5):
            username = f'customer{i+1}'
            if not User.query.filter_by(username=username).first():
                user = User(username=username, email=f'{username}@gmail.com', phone=f'052000000{i}', user_type='customer')
                user.set_password('123456')
                db.session.add(user)
                db.session.flush()
                
                customer = Customer(
                    user_id=user.id,
                    full_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                    company_name=random.choice(COMPANY_NAMES) if random.random() > 0.5 else None
                )
                db.session.add(customer)
                customers.append(customer)
        print(f"✅ Created {len(customers)} customers")

        db.session.commit() # Commit users first

        # 5. Create Deliveries
        # Historical (Completed)
        for i in range(30):
            courier = random.choice(couriers) if couriers else None
            customer = random.choice(customers) if customers else None
            
            created_at = datetime.now() - timedelta(days=random.randint(1, 14))
            
            delivery = Delivery(
                order_number=f"ORD-{random.randint(10000, 99999)}",
                customer_id=customer.id if customer else None,
                courier_id=courier.id if courier else None,
                status='delivered',
                created_at=created_at,
                updated_at=created_at + timedelta(minutes=45),
                delivery_type=random.choice(['standard', 'standard', 'standard', 'legal_document']),
                distance_km=random.uniform(2.0, 15.0)
            )
            
            # Pricing & Invoice
            price = random.randint(30, 150)
            pricing = Pricing(delivery=delivery, base_price=price, final_price=price)
            invoice = Invoice(delivery=delivery, status='paid', total_amount=price, created_at=created_at)
            
            # Addresses
            pickup = PickupPoint(delivery=delivery, address=create_address())
            dropoff = DeliveryPoint(delivery=delivery, address=create_address())
            
            db.session.add_all([delivery, pricing, invoice, pickup, dropoff])

        # Active Orders
        statuses = ['pending', 'assigned', 'picked_up', 'in_transit_to_delivery']
        for i, status in enumerate(statuses):
            delivery = Delivery(
                order_number=f"LIVE-{random.randint(1000, 9999)}",
                customer_id=customers[0].id if customers else None,
                courier_id=couriers[i].id if i < len(couriers) and status != 'pending' else None,
                status=status,
                created_at=datetime.now() - timedelta(minutes=random.randint(10, 120)),
                delivery_type='legal_document' if i == 0 else 'standard', # Make one active legal delivery
                distance_km=random.uniform(3.0, 8.0)
            )
            
            # Add addresses
            pickup = PickupPoint(delivery=delivery, address=create_address())
            dropoff = DeliveryPoint(delivery=delivery, address=create_address())
            
            # Add pricing without invoice (not paid yet)
            pricing = Pricing(delivery=delivery, base_price=60.0, final_price=60.0)
            
            db.session.add_all([delivery, pricing, pickup, dropoff])
            
        print("✅ Created ~35 orders (Historical + Active)")

        # 6. Create CRM Leads
        lead_statuses = ['new', 'contacted', 'negotiation', 'won', 'lost']
        for i in range(15):
            lead = Lead(
                contact_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                company_name=f"{random.choice(COMPANY_NAMES)} {random.choice(['Ltd', 'Inc', 'Group'])}",
                email=f"contact{i}@company.com",
                phone=f"050-555{random.randint(1000,9999)}",
                status=random.choice(lead_statuses),
                source=random.choice(['Linkedin', 'Referral', 'Website']),
                estimated_monthly_value=random.randrange(1000, 20000, 500),
                notes="Created by seed script"
            )
            db.session.add(lead)
        
        print(f"✅ Created 15 CRM Leads")
        
        db.session.commit()
        print("🚀 Data Seeding Complete!")

if __name__ == "__main__":
    seed_database()
