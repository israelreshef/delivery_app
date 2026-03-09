import sys
import os
sys.path.insert(0, r'c:\Users\Israel\Desktop\delivery_app\backend')

from app import create_app
from extensions import db
from models import User, Courier

def create_test_courier():
    app = create_app()
    with app.app_context():
        # Clean up existing if needed
        u = User.query.filter_by(username='test_courier').first()
        if u:
            # Delete related courier first
            c_old = Courier.query.filter_by(user_id=u.id).first()
            if c_old:
                db.session.delete(c_old)
            db.session.delete(u)
            db.session.commit()
            print("Old test_courier removed.")

        user = User(
            username='test_courier',
            email='test@test.com',
            user_type='courier'
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.flush()

        courier = Courier(
            user_id=user.id,
            full_name='Test Courier Movement',
            vehicle_type='motorcycle',
            is_available=True
        )
        db.session.add(courier)
        db.session.commit()
        print("✅ Test courier 'test_courier' with password 'password123' created successfully!")

if __name__ == "__main__":
    create_test_courier()
