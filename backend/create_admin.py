from app.core.db import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_admin_user():
    db = SessionLocal()
    email = "admin@tzir.com"
    password = "admin"
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Creating admin user {email}...")
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="System Admin",
                role=UserRole.ADMIN,
                is_active=True,
                is_approved=True,
                is_superuser=True
            )
            db.add(user)
            db.commit()
            print(f"✅ Admin user created successfully!")
            print(f"Email: {email}")
            print(f"Password: {password}")
        else:
            print(f"ℹ️  Admin user {email} already exists.")
            # Ensure it is approved and admin
            if not user.is_approved or user.role != UserRole.ADMIN:
                user.is_approved = True
                user.role = UserRole.ADMIN
                db.commit()
                print("   Updated existing user to be Approved Admin.")
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
