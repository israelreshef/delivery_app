"""
Fix existing admin user by adding admin_role
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from models import User

def fix_admin_user():
    app = create_app()
    with app.app_context():
        print("🔧 Fixing admin user...")
        
        admin = User.query.filter_by(username='admin').first()
        
        if not admin:
            print("❌ Admin user not found! Creating new one...")
            admin = User(
                username='admin',
                email='admin@tzir.com',
                phone='0500000000',
                user_type='admin',
                admin_role='super_admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created with admin_role='super_admin'")
        else:
            print(f"   Current user_type: {admin.user_type}")
            print(f"   Current admin_role: {getattr(admin, 'admin_role', 'NOT SET')}")
            
            if admin.user_type == 'admin' and not getattr(admin, 'admin_role', None):
                admin.admin_role = 'super_admin'
                db.session.commit()
                print("✅ Updated admin user with admin_role='super_admin'")
            elif admin.admin_role:
                print(f"✅ Admin user already has admin_role='{admin.admin_role}'")
            else:
                print("⚠️ Admin user is not type='admin', skipping...")

if __name__ == "__main__":
    fix_admin_user()
