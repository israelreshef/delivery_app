from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE deliveries ADD COLUMN current_bin_id INTEGER REFERENCES storage_bins(id)"))
        print("Success: Added current_bin_id to deliveries")
    except Exception as e:
        print("current_bin_id already exists or error:", e)
        
    db.session.commit()
    print("Patch complete.")
