import sys
import os

# Add the current directory to sys.path to import models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        print("Starting RouteStop migration...")
        
        # Check current columns in route_stops
        result = db.session.execute(text("PRAGMA table_info(route_stops)"))
        columns = [row[1] for row in result.fetchall()]
        
        new_columns = {
            'city': 'VARCHAR(100)',
            'street': 'VARCHAR(200)',
            'building_number': 'VARCHAR(10)',
            'floor': 'VARCHAR(10)',
            'apartment': 'VARCHAR(10)',
            'contact_name': 'VARCHAR(100)',
            'contact_phone': 'VARCHAR(20)'
        }
        
        for col, col_type in new_columns.items():
            if col not in columns:
                print(f"Adding missing column '{col}' to 'route_stops' table...")
                try:
                    db.session.execute(text(f"ALTER TABLE route_stops ADD COLUMN {col} {col_type}"))
                    db.session.commit()
                    print(f" Added '{col}' to 'route_stops'.")
                except Exception as e:
                    db.session.rollback()
                    print(f" Failed to add '{col}': {e}")
            else:
                print(f"Column '{col}' already exists.")

        print("RouteStop synchronization complete.")

if __name__ == "__main__":
    migrate()
