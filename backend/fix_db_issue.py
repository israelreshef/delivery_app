from app import create_app, db
from sqlalchemy import text
import logging

app = create_app()

def fix_schema():
    with app.app_context():
        columns_to_add = [
            ("reliability_score", "FLOAT DEFAULT 1.0"),
            ("integrity_score", "FLOAT DEFAULT 1.0"),
            ("service_score", "FLOAT DEFAULT 1.0"),
            ("efficiency_score", "FLOAT DEFAULT 1.0"),
            ("performance_index", "FLOAT DEFAULT 100.0")
        ]
        
        with db.engine.connect() as conn:
            for col_name, col_type in columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE couriers ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"✅ Added column '{col_name}' to 'couriers' table")
                except Exception as e:
                    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"ℹ️ Column '{col_name}' already exists.")
                    else:
                        print(f"❌ Error adding '{col_name}': {e}")
            
            # Check for other potential missing columns mentioned in the error log
            # integer columns often default to 0
            other_columns = [
                ("total_deliveries", "INTEGER DEFAULT 0"),
                ("onboarding_status", "VARCHAR(20) DEFAULT 'new'"),
                ("rejection_reason", "TEXT"),
                ("rating", "FLOAT DEFAULT 5.0")
            ]
            
            for col_name, col_type in other_columns:
                try:
                    conn.execute(text(f"ALTER TABLE couriers ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"✅ Added column '{col_name}' to 'couriers' table")
                except Exception as e:
                    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                        pass
                    else:
                        print(f"❌ Error adding '{col_name}': {e}")

if __name__ == '__main__':
    print("Starting database schema fix...")
    fix_schema()
    print("Database schema fix completed.")
