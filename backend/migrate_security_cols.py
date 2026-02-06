
from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Migrating Database Schema for Security Hardening...")
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"))
            print("✅ Added failed_login_attempts column")
    except Exception as e:
        print(f"⚠️ failed_login_attempts column might already exist: {e}")

    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
            print("✅ Added locked_until column")
    except Exception as e:
        # Retry with TIMESTAMP if DATETIME not supported by some dialects, 
        # but SQLAlchemy usually handles this. SQLite uses TEXT for datetime often.
        print(f"⚠️ locked_until column might already exist or error: {e}")

    print("Migration Check Complete.")
