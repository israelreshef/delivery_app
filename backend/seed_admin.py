"""Seed an admin user into the database."""
import sys
sys.path.insert(0, "/app")

from app.core.db import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# Ensure tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Check if admin already exists
    existing = db.query(User).filter(User.email == "admin@tzir.com").first()
    if existing:
        print(f"Admin user already exists (id={existing.id}). Updating password...")
        existing.hashed_password = get_password_hash("TzirSuper2026!$!")
        existing.role = UserRole.ADMIN
        existing.is_active = True
        existing.is_superuser = True
        existing.is_approved = True
        db.commit()
        print("Admin user updated successfully!")
    else:
        admin = User(
            email="admin@tzir.com",
            hashed_password=get_password_hash("TzirSuper2026!$!"),
            full_name="Admin",
            phone_number="+972500000000",
            role=UserRole.ADMIN,
            is_active=True,
            is_superuser=True,
            is_approved=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created successfully! (id={admin.id})")
finally:
    db.close()
