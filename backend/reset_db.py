from app.core.db import engine, Base
from app.models import user, courier, order, address, notification

def reset_db():
    print("Resetting database...")
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped.")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("All tables recreated.")

if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA. Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        reset_db()
    else:
        print("Cancelled.")
