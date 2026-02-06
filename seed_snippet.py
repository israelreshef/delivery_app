import sys
import os

# Add backend to path so 'import extensions' works inside models.py
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.models import User, Courier, Customer
from backend.extensions import db
from werkzeug.security import generate_password_hash

print("🔐 SHELL: Ensuring Secure Demo Accounts...")

demos = [
    ('demo_admin', 'admin@tzir.com', 'AdminPower2026!', 'admin', '0501111111'),
    ('demo_courier', 'courier@tzir.com', 'RiderFast99!', 'courier', '0502222222'),
    ('demo_client', 'client@tzir.com', 'ClientShop88!', 'customer', '0503333333')
]

for username, email, pwd, role, phone in demos:
    u = User.query.filter_by(username=username).first()
    if not u:
        print(f"   Creating {username}")
        u = User(username=username, email=email, phone=phone, user_type=role)
        db.session.add(u)
    else:
        print(f"   Updating {username}")
    
    u.password_hash = generate_password_hash(pwd)
    u.user_type = role
    db.session.flush()
    
    if role == 'courier':
        if not Courier.query.filter_by(user_id=u.id).first():
            db.session.add(Courier(user_id=u.id, full_name=f"Demo {username}", vehicle_type='scooter', is_available=True))
    elif role == 'customer':
        if not Customer.query.filter_by(user_id=u.id).first():
            db.session.add(Customer(user_id=u.id, full_name=f"Demo {username}", company_name=f"{username} Ltd"))

db.session.commit()
print("✅ SHELL: Service Accounts Secured.")
