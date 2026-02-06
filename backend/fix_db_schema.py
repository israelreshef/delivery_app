import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from sqlalchemy import text

def fix_schema():
    app = create_app()
    with app.app_context():
        print("🔧 Attempting to fix DB schema...")
        
        # Check if column exists
        try:
            with db.engine.connect() as conn:
                # SQLite
                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'standard' NOT NULL"))
                    conn.commit()
                    print("✅ Added 'delivery_type' column to 'deliveries' table.")
                except Exception as e:
                    print(f"⚠️ Could not add column delivery_type (maybe exists?): {e}")

                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN urgency VARCHAR(20) DEFAULT 'standard' NOT NULL"))
                    conn.commit()
                    print("✅ Added 'urgency' column to 'deliveries' table.")
                except Exception as e:
                    print(f"⚠️ Could not add column urgency (maybe exists?): {e}")

                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN insurance_required BOOLEAN DEFAULT 0"))
                    conn.commit()
                    print("✅ Added 'insurance_required' column.")
                except Exception as e:
                    print(f"⚠️ Could not add column insurance_required (maybe exists?): {e}")

                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN insurance_value FLOAT DEFAULT 0.0"))
                    conn.commit()
                    print("✅ Added 'insurance_value' column.")
                except Exception as e:
                    print(f"⚠️ Could not add column insurance_value (maybe exists?): {e}")

                # Tracking & POD
                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN tracking_number VARCHAR(20)"))
                    # Add unique index? SQLite doesn't easily support ADD CONSTRAINT via ALTER TABLE for unique locally, 
                    # but typically NOT NULL or UNIQUE is added in CREATE. 
                    # For now, just column is enough to fix insert error.
                    conn.commit()
                    print("✅ Added 'tracking_number' column.")
                except Exception as e:
                    print(f"⚠️ Could not add column tracking_number: {e}")

                for col in ['pod_signature_path', 'pod_image_path']:
                    try:
                        conn.execute(text(f"ALTER TABLE deliveries ADD COLUMN {col} VARCHAR(255)"))
                        conn.commit()
                        print(f"✅ Added '{col}' column.")
                    except Exception as e:
                         print(f"⚠️ Could not add column {col}: {e}")

                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN pod_recipient_id VARCHAR(20)"))
                    conn.commit()
                    print("✅ Added 'pod_recipient_id' column.")
                except Exception as e:
                    print(f"⚠️ Could not add column pod_recipient_id: {e}")

                try:
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN pod_location_lat FLOAT"))
                    conn.execute(text("ALTER TABLE deliveries ADD COLUMN pod_location_lng FLOAT"))
                    conn.commit()
                    print("✅ Added POD location columns.")
                except Exception as e:
                    print(f"⚠️ Could not add POD location columns: {e}")

                # Also cleanup request_source if I messed up earlier? No need.
                
        except Exception as e:
            print(f"❌ DB Connection Error: {e}")

if __name__ == "__main__":
    fix_schema()
