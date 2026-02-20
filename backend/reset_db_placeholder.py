import asyncio
from app.core.db import engine, Base
from app.models import user, courier, order, address, notification  # Import all models to ensure they are registered

async def reset_db():
    print("Resetting database...")
    async with engine.begin() as conn:
        # Drop all tables
        await conn.run_sync(Base.metadata.drop_all)
        print("All tables dropped.")
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("All tables recreated.")

if __name__ == "__main__":
    # For synchronous engine (if using psycopg2/non-async)
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)
    
    # Check if engine is async or sync
    # Based on previous files, it seems we might be using sync engine in some places or async in others.
    # Let's check db.py first. 
    pass

# Re-writing this after I check db.py to be sure about sync/async.
# I'll just write a sync version assuming standard SQLAlchemy setup for checking.
