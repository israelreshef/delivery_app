from app import create_app
from extensions import db
from models import User, Courier, Customer

app = create_app()
with app.app_context():
    # Fix demo_client
    u1 = User.query.filter_by(username='demo_client').first()
    if not u1:
        print("Creating demo_client...")
        u1 = User(username='demo_client', email='client@tzir.com', phone='0503333333', user_type='customer')
        u1.set_password('TzirClient2026!')
        db.session.add(u1)
        db.session.flush()
    else:
        print("Updating demo_client password...")
        u1.set_password('TzirClient2026!')
    
    if not Customer.query.filter_by(user_id=u1.id).first():
        print("Adding Customer profile for demo_client...")
        db.session.add(Customer(user_id=u1.id, full_name='Demo Client', company_name='Tzir Client Ltd'))

    # Fix demo_courier
    u2 = User.query.filter_by(username='demo_courier').first()
    if not u2:
        print("Creating demo_courier...")
        u2 = User(username='demo_courier', email='courier@tzir.com', phone='0502222222', user_type='courier')
        u2.set_password('TzirRiderSpeed!77')
        db.session.add(u2)
        db.session.flush()
    else:
        print("Updating demo_courier password...")
        u2.set_password('TzirRiderSpeed!77')
    
    if not Courier.query.filter_by(user_id=u2.id).first():
        print("Adding Courier profile for demo_courier...")
        db.session.add(Courier(user_id=u2.id, full_name='Demo Courier', vehicle_type='scooter', is_available=True))

    db.session.commit()
    print("Done")
