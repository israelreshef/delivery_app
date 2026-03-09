import sys
from pathlib import Path
sys.path.append(str(Path('c:/Users/Israel/Desktop/delivery_app/backend')))
from app import create_app
from models import User, Courier

app = create_app()
with app.app_context():
    u = User.query.filter_by(username='demo_courier').first()
    if u:
        c = Courier.query.filter_by(user_id=u.id).first()
        print(f"User ID: {u.id}, Username: {u.username}, Role: {u.user_type}")
        print(f"Courier Record: {c.id if c else 'None'}")
    else:
        print("User 'demo_courier' not found")
