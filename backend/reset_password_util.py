import sys
import os

# Set up path to find local modules
sys.path.append(os.getcwd())

from app import create_app
from models import db, User

app, socketio = create_app()

with app.app_context():
    print("--- Admin Reset Tool ---")
    
    # Check if admin exists
    admin = User.query.filter_by(username='admin').first()
    
    if admin:
        print(f"User 'admin' found (ID: {admin.id}). Resetting password...")
        admin.set_password('admin123')
        admin.user_type = 'admin' # Ensure it is admin
        db.session.commit()
        print("✅ Password reset to: admin123")
    else:
        print("User 'admin' not found. Creating new...")
        admin = User(
            username='admin', 
            email='admin@tzir.com', 
            user_type='admin',
            phone='0501234567'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("✅ Created new admin user: admin / admin123")
    
    # Verify
    u = User.query.filter_by(username='admin').first()
    if u.check_password('admin123'):
        print("Verification: Login with 'admin' and 'admin123' should work now.")
    else:
        print("❌ Verification failed.")
