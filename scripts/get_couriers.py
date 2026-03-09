from app import create_app
from models import User, Courier

app = create_app()
with app.app_context():
    couriers = User.query.filter_by(user_type='courier').all()
    print("--- COURIERS ---")
    for u in couriers:
        c = Courier.query.filter_by(user_id=u.id).first()
        print(f"Username: {u.username}, CourierID: {c.id if c else 'N/A'}, Phone: {u.phone or 'N/A'}")
