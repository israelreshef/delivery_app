from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    print("🔍 Checking Privacy Policy Status for first 5 users...")
    users = User.query.limit(5).all()
    for u in users:
        print(f"User ID: {u.id}, Username: {u.username}, Role: {u.role if hasattr(u, 'role') else u.user_type}, Accepted At: {u.privacy_policy_accepted_at}")
