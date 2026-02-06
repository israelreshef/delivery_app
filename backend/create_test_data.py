"""
סקריפט מהיר ליצירת נתונים לבדיקת המערכת
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from models import db, User, Customer, Courier
import random

def create_quick_test_data():
    """צור נתונים מהירים לבדיקה"""
    app, _ = create_app()
    
    with app.app_context():
        print("\n🚀 יוצר נתונים לבדיקה...\n")
        
        # 1. צור 5 שליחים
        print("👨‍🚀 יוצר 5 שליחים...")
        courier_names = [
            ('אבי כהן', '0501111111', 'motorcycle'),
            ('דני לוי', '0502222222', 'motorcycle'),
            ('גיא מור', '0503333333', 'bicycle'),
            ('חיים ברוך', '0504444444', 'motorcycle'),
            ('יעקב שלום', '0505555555', 'car')
        ]
        
        for idx, (name, phone, vehicle) in enumerate(courier_names):
            username = f"courier{idx+1}"
            
            # בדוק אם קיים
            existing = User.query.filter_by(username=username).first()
            if existing:
                print(f"   ⚠️  {username} כבר קיים, מדלג...")
                continue
            
            user = User(
                username=username,
                email=f"{username}@delivery.com",
                phone=phone,
                user_type='courier'
            )
            user.set_password('123456')
            db.session.add(user)
            db.session.flush()
            
            courier = Courier(
                user_id=user.id,
                full_name=name,
                vehicle_type=vehicle,
                is_available=True,
                rating=round(random.uniform(4.5, 5.0), 1),
                total_deliveries=random.randint(10, 100),
                current_location_lat=32.0853 + random.uniform(-0.05, 0.05),
                current_location_lng=34.7818 + random.uniform(-0.05, 0.05)
            )
            db.session.add(courier)
            print(f"   ✅ {name} ({vehicle})")
        
        # 2. צור 3 לקוחות
        print("\n👥 יוצר 3 לקוחות...")
        customer_names = [
            ('דוד ישראלי', '0506666666', 'david@gmail.com'),
            ('שרה כהן', '0507777777', 'sarah@gmail.com'),
            ('משה לוי', '0508888888', 'moshe@gmail.com')
        ]
        
        for idx, (name, phone, email) in enumerate(customer_names):
            username = f"customer{idx+1}"
            
            existing = User.query.filter_by(username=username).first()
            if existing:
                print(f"   ⚠️  {username} כבר קיים, מדלג...")
                continue
            
            user = User(
                username=username,
                email=email,
                phone=phone,
                user_type='customer'
            )
            user.set_password('123456')
            db.session.add(user)
            db.session.flush()
            
            customer = Customer(
                user_id=user.id,
                full_name=name
            )
            db.session.add(customer)
            print(f"   ✅ {name}")
        
        # 3. צור מנהל (אם לא קיים)
        print("\n👨‍💼 יוצר משתמש מנהל...")
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@delivery.com',
                phone='0509999999',
                user_type='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("   ✅ admin (סיסמה: admin123)")
        else:
            print("   ⚠️  admin כבר קיים")
        
        db.session.commit()
        
        # סיכום
        print("\n" + "="*50)
        print("✅ נתונים נוצרו בהצלחה!")
        print("="*50)
        print(f"\n📊 סיכום:")
        print(f"   👨‍🚀 שליחים: {Courier.query.count()}")
        print(f"   👥 לקוחות: {Customer.query.count()}")
        print(f"   👤 סה\"כ משתמשים: {User.query.count()}")
        
        print(f"\n🔐 פרטי התחברות:")
        print(f"   מנהל: admin / admin123")
        print(f"   שליח: courier1 / 123456")
        print(f"   לקוח: customer1 / 123456")
        
        print(f"\n🌐 גש ל:")
        print(f"   📦 הזמנות: http://localhost:5000/orders.html")
        print(f"   ⚙️  ניהול: http://localhost:5000/admin.html")
        print(f"   🚴 שליח: http://localhost:5000/courier.html")
        print()

if __name__ == '__main__':
    create_quick_test_data()