from app import create_app, db
from sqlalchemy import text

app, _ = create_app()

def update_schema():
    with app.app_context():
        # 1. Add columns to 'customers' table
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE customers ADD COLUMN rating FLOAT DEFAULT 5.0"))
                conn.execute(text("ALTER TABLE customers ADD COLUMN total_orders INTEGER DEFAULT 0"))
                conn.commit()
                print("✅ Added columns to 'customers' table")
        except Exception as e:
            print(f"⚠️ 'customers' columns might already exist: {e}")

        # 2. Add columns to 'ratings' table
        try:
            with db.engine.connect() as conn:
                # Needed to create the enum type first if it doesn't exist, but postgres handles it. 
                # Since flask-sqlalchemy might have issues with raw enum creation in safe mode, let's try raw SQL.
                # First let's check if the type exists, or just use string for simplicity in raw sql if enum fails, 
                # but models use Enum.
                
                # Check if we can alter
                conn.execute(text("ALTER TABLE ratings ADD COLUMN rated_by VARCHAR(20) DEFAULT 'customer'"))
                conn.commit()
                print("✅ Added columns to 'ratings' table")
        except Exception as e:
             print(f"⚠️ 'ratings' columns might already exist: {e}")

if __name__ == '__main__':
    update_schema()
