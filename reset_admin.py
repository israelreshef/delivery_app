from backend.app import create_app
from backend.models import db, User, Courier, Customer
from backend.extensions import jwt

app, socketio = create_app()

with app.app_context():
    print("Checking users in database...")
    users = User.query.all()
    for u in users:
        print(f"Found User: id={u.id}, username={u.username}, email={u.email}, role={u.user_type}")

    admin_email = "admin@example.com"
    admin_user = User.query.filter_by(email=admin_email).first()

    if admin_user:
        print(f"Admin user found: {admin_user.username}")
        print("Resetting password to 'admin123'...")
        admin_user.set_password("admin123")
        db.session.commit()
        print("Password reset successfully.")
    else:
        print("Admin user not found. Creating new admin user...")
        new_admin = User(
            username="admin",
            email=admin_email,
            phone="0500000000",
            user_type="admin"
        )
        new_admin.set_password("admin123")
        db.session.add(new_admin)
        db.session.commit()
        print(f"Created admin user: {new_admin.username} / admin123")

    # Verify explicitly
    u = User.query.filter_by(email=admin_email).first()
    if u and u.check_password("admin123"):
        print("VERIFICATION SUCCESS: Password 'admin123' is valid for admin.")
    else:
        print("VERIFICATION FAILED: Password check failed even after reset.")
