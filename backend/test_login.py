from app import create_app
from models import User
from werkzeug.security import check_password_hash

app = create_app()
with app.app_context():
    identifier = 'demo_courier'
    password = 'RiderFast99!'
    user = User.query.filter_by(username=identifier).first()
    if user:
        print(f"User found: {user.username}")
        match = user.check_password(password)
        print(f"Password match: {match}")
        print(f"Stored hash: {user.password_hash}")
        
        # Test manual check
        from werkzeug.security import generate_password_hash
        new_hash = generate_password_hash(password)
        print(f"Manual check: {check_password_hash(user.password_hash, password)}")
    else:
        print("User not found")
