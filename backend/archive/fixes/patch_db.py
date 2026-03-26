from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE inventory_items ADD COLUMN volume_per_unit_cm3 INTEGER DEFAULT 0"))
        print("Added volume_per_unit_cm3")
    except Exception as e:
        print("volume_per_unit_cm3 already exists or error:", e)
        
    try:
        db.session.execute(text("ALTER TABLE stock_movements ADD COLUMN bin_id INTEGER"))
        print("Added bin_id")
    except Exception as e:
        print("bin_id already exists or error:", e)
        
    db.session.commit()
    print("Patch complete.")
