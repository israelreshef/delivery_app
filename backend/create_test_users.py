from app import create_app, db
from models import User, Customer, Courier
from werkzeug.security import generate_password_hash

app, _ = create_app()

def create_users():
    with app.app_context():
        print("🚀 Creating test users...")
        
        # --- 1. Super Admin ---
        admin = User.query.filter_by(email='admin@tzir.com').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@tzir.com',
                password_hash=generate_password_hash('123456'),
                user_type='admin',
                admin_role='super_admin', # ✅ Set as Super Admin
                phone='0500000000'
            )
            db.session.add(admin)
            print("✅ Super Admin created: admin@tzir.com / 123456")
        else:
            # Update existing admin to be super_admin if needed
            if admin.admin_role != 'super_admin':
                 admin.admin_role = 'super_admin'
                 db.session.add(admin)
                 print("ℹ️ Updated existing admin to super_admin")
            else:
                 print("ℹ️ Super Admin already exists")

        # --- 1.1 Finance Admin (Regular Admin) ---
        finance = User.query.filter_by(email='finance@tzir.com').first()
        if not finance:
            finance = User(
                username='finance',
                email='finance@tzir.com',
                password_hash=generate_password_hash('123456'),
                user_type='admin',
                admin_role='finance_admin', # ✅ Set as Finance Admin
                phone='0505555555'
            )
            db.session.add(finance)
            print("✅ Finance Admin created: finance@tzir.com / 123456")
        else:
            print("ℹ️ Finance Admin already exists")

        # --- 2. Customer ---
        customer_user = User.query.filter_by(email='client@tzir.com').first()
        if not customer_user:
            customer_user = User(
                username='client',
                email='client@tzir.com',
                password_hash=generate_password_hash('123456'),
                user_type='customer',
                phone='0501111111'
            )
            db.session.add(customer_user)
            db.session.commit() # Commit to get ID
            
            customer_profile = Customer(
                user_id=customer_user.id,
                full_name='Israel Client',
                company_name='Test Company Ltd',
                default_address='Tel Aviv Center'
            )
            db.session.add(customer_profile)
            print("✅ Customer created: client@tzir.com / 123456")
        else:
            print("ℹ️ Customer already exists")

        # --- 3. Courier ---
        courier_user = User.query.filter_by(email='courier@tzir.com').first()
        if not courier_user:
            courier_user = User(
                username='courier',
                email='courier@tzir.com',
                password_hash=generate_password_hash('123456'),
                user_type='courier',
                phone='0502222222'
            )
            db.session.add(courier_user)
            db.session.commit() # Commit to get ID
            
            courier_profile = Courier(
                user_id=courier_user.id,
                full_name='Fast Courier',
                vehicle_type='motorcycle',
                license_plate='12-345-67'
            )
            db.session.add(courier_profile)
            print("✅ Courier created: courier@tzir.com / 123456")
        else:
            print("ℹ️ Courier already exists")

        db.session.commit()
        print("✨ Done!")

if __name__ == '__main__':
    create_users()
