import sys
import os

# Add backend to path so we can import as if we are inside backend/
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

# Import using the same structure as app.py does (top-level module names)
from app import create_app
from models import User, Courier, Delivery

app, _ = create_app()

with app.app_context():
    try:
        user_count = User.query.count()
        courier_count = Courier.query.count()
        delivery_count = Delivery.query.count()
        print(f"DEBUG_STATUS: Users={user_count}, Couriers={courier_count}, Deliveries={delivery_count}")
    except Exception as e:
        print(f"ERROR: {e}")
