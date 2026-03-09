
import sys
import os
from pathlib import Path
from datetime import datetime

sys.path.append(str(Path(__file__).parent.parent))

from app import create_app
from models import db, Courier, User, Delivery, Invoice

app = create_app()
with app.app_context():
    active_couriers = Courier.query.filter_by(is_available=True).count()
    active_orders = Delivery.query.filter(Delivery.status.in_(['pending', 'assigned', 'picked_up', 'in_transit'])).count()
    
    today = datetime.utcnow().date()
    # Handle SQLite date issues if any
    try:
        from sqlalchemy import func
        orders_today = Delivery.query.filter(func.date(Delivery.created_at) == today).count()
        revenue_today = db.session.query(func.sum(Invoice.total_amount)).filter(func.date(Invoice.issue_date) == today, Invoice.status == 'paid').scalar() or 0
    except Exception as e:
        print(f"Query Error: {e}")
        orders_today = "error"
        revenue_today = "error"

    print(f"Active Couriers Count: {active_couriers}")
    print(f"Active Orders Count: {active_orders}")
    print(f"Orders Today Count: {orders_today}")
    print(f"Revenue Today: {revenue_today}")
