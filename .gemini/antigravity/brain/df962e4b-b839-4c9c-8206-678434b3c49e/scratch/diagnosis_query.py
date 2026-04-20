import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app import create_app
from models import Delivery

app = create_app()
with app.app_context():
    # Sticking to the table name 'deliveries' as per models.py
    results = Delivery.query.order_by(Delivery.created_at.desc()).limit(5).all()
    print("ID | Status | Courier | Created At")
    print("-" * 50)
    for r in results:
        print(f"{r.id} | {r.status} | {r.courier_id} | {r.created_at}")
