import os
import sys
from sqlalchemy import text

# Add backend to path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    try:
        # Update orders set status to 'cancelled' where status was 'arrived'
        # Sticking to table name 'deliveries'
        db.session.execute(text("UPDATE deliveries SET status = 'cancelled' WHERE status = 'arrived'"))
        db.session.commit()
        print("Successfully cleaned up stuck 'arrived' orders")
    except Exception as e:
        db.session.rollback()
        print(f"Error cleaning up orders: {e}")
