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
        # PostgreSQL specific command
        db.session.execute(text("ALTER TYPE delivery_status_type ADD VALUE IF NOT EXISTS 'arrived' AFTER 'in_transit'"))
        db.session.commit()
        print("Successfully updated delivery_status_type enum in DB")
    except Exception as e:
        db.session.rollback()
        print(f"Error updating DB: {e}")
        # If it fails, maybe it's not Postgres or the type name is different.
