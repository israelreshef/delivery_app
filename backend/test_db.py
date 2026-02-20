from app import create_app
from models import db, User
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("Testing User model...")
    try:
        user_count = User.query.filter_by(is_active=True).count()
        print(f"User count with is_active=True: {user_count}")
    except Exception as e:
        print(f"Error querying with is_active: {e}")
        
    print("\nTesting raw SQL...")
    try:
        result = db.session.execute(text("SELECT name FROM pragma_table_info('users') WHERE name='is_active'")).fetchone()
        print(f"Raw SQL check for is_active: {result}")
    except Exception as e:
        print(f"Raw SQL error: {e}")
