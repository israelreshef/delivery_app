import sys
from pathlib import Path

# Add the current directory to sys.path to allow importing from the same folder
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from models import User

app = create_app()

def test_login(identifier, password):
    with app.app_context():
        from sqlalchemy import or_
        user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()
        if not user:
            print(f"❌ User not found: {identifier}")
            return
        
        success = user.check_password(password)
        if success:
            print(f"✅ Login successful for {identifier}")
            print(f"   User Type: {user.user_type}")
            print(f"   Active: {user.is_active}")
        else:
            print(f"❌ Login failed for {identifier} (Invalid password)")
            # Debug: show the stored hash (partially)
            print(f"   Stored hash prefix: {user.password_hash.split('$')[0] if '$' in user.password_hash else 'N/A'}")

if __name__ == "__main__":
    print("🧪 Testing requested credentials...")
    test_login('admin@tzir.com', 'TzirSuper2026!$!')
    test_login('client@tzir.com', 'TzirClient2026!')
