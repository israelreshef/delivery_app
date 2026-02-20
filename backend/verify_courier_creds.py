import sys
from pathlib import Path

# Add the current directory to sys.path to allow importing from the same folder
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from models import User

app = create_app()

def check_couriers():
    with app.app_context():
        couriers = User.query.filter_by(user_type='courier').all()
        print(f"found {len(couriers)} couriers")
        for c in couriers:
            print(f"Courier: {c.username} ({c.email})")
            # Try both passwords
            pwds = ['RiderFast99!', 'TzirRiderSpeed!77']
            for p in pwds:
                if c.check_password(p):
                    print(f"  ✅ Password WORKED: {p}")
                else:
                    print(f"  ❌ Password FAILED: {p}")

if __name__ == "__main__":
    check_couriers()
