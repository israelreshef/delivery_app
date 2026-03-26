import sys
from app import create_app
from models import db, User

def list_users():
    app = create_app()
    with app.app_context():
        users = User.query.all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.user_type} | Name: {u.full_name}")

def reset_db():
    app = create_app()
    with app.app_context():
        print("Resetting database...")
        db.drop_all()
        db.create_all()
        print("Database reset complete.")

def check_db():
    app = create_app()
    with app.app_context():
        count = User.query.count()
        print(f"Database connected. Total users: {count}")

def reset_password(email, new_password):
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            from werkzeug.security import generate_password_hash
            user.password_hash = generate_password_hash(new_password)
            db.session.commit()
            print(f"Password reset for {email}.")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python admin_tools.py [list_users|reset_db|check_db|reset_password]")
        sys.exit(1)
        
    command = sys.argv[1]
    if command == "list_users":
        list_users()
    elif command == "reset_db":
        reset_db()
    elif command == "check_db":
        check_db()
    elif command == "reset_password":
        if len(sys.argv) < 4:
            print("Usage: python admin_tools.py reset_password <email> <new_password>")
        else:
            reset_password(sys.argv[2], sys.argv[3])
    else:
        print(f"Unknown command: {command}")
