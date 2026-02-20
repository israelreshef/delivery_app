import sys
import os
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.db import SessionLocal
from app.crud.order import order as crud_order
from app.schemas.order import OrderCreate
from app.schemas.address import AddressCreate
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def create_test_orders():
    db = SessionLocal()
    try:
        # 1. Ensure we have a customer
        customer_email = "customer@test.com"
        customer = db.query(User).filter(User.email == customer_email).first()
        if not customer:
            print(f"Creating customer {customer_email}...")
            customer = User(
                email=customer_email,
                hashed_password=get_password_hash("password"),
                full_name="Test Customer",
                phone_number="0500000001",
                role=UserRole.CUSTOMER
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
        else:
            print(f"Customer {customer_email} exists.")

        # 2. Create Orders
        print("Creating orders...")
        
        # Order 1 - Tel Aviv Center
        order1_in = OrderCreate(
            pickup_address=AddressCreate(
                street="Rothschild Blvd",
                city="Tel Aviv",
                building_number="10",
                latitude=32.0644,
                longitude=34.7725
            ),
            delivery_address=AddressCreate(
                street="Dizengoff St",
                city="Tel Aviv",
                building_number="50",
                latitude=32.0780,
                longitude=34.7742
            ),
            package_description="Important Documents",
            pickup_time_estimated=datetime.utcnow() + timedelta(hours=1),
            delivery_time_estimated=datetime.utcnow() + timedelta(hours=2)
        )
        crud_order.create(db, obj_in=order1_in, customer_id=customer.id)
        
        # Order 2 - Tel Aviv North
        order2_in = OrderCreate(
            pickup_address=AddressCreate(
                street="Ibn Gabirol St",
                city="Tel Aviv",
                building_number="100",
                latitude=32.0863,
                longitude=34.7811
            ),
            delivery_address=AddressCreate(
                street="HaYarkon St",
                city="Tel Aviv",
                building_number="20",
                latitude=32.0700,
                longitude=34.7660
            ),
            package_description="Small Package",
             pickup_time_estimated=datetime.utcnow() + timedelta(hours=1),
            delivery_time_estimated=datetime.utcnow() + timedelta(hours=3)
        )
        crud_order.create(db, obj_in=order2_in, customer_id=customer.id)

        print("Orders created successfully!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_orders()
