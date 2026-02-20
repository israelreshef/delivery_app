from app import create_app
from models import db, User, Courier, Customer, Delivery, PickupPoint, DeliveryPoint, Address
from sqlalchemy import inspect, text

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    # We want to check all models
    models = [User, Courier, Customer, Delivery, PickupPoint, DeliveryPoint, Address]
    
    for model in models:
        table_name = model.__tablename__
        if table_name not in tables:
            print(f"Table {table_name} missing! Creating...")
            model.__table__.create(db.engine)
            continue
            
        columns_in_db = [c['name'] for c in inspector.get_columns(table_name)]
        for column in model.__table__.columns:
            if column.name not in columns_in_db:
                print(f"Column {column.name} missing in {table_name}. Adding...")
                # Simple ALTER TABLE for SQLite
                col_type = str(column.type)
                # Handle boolean and other types for sqlite
                if "BOOLEAN" in col_type: col_type = "BOOLEAN"
                elif "VARCHAR" in col_type: col_type = f"VARCHAR({column.type.length})"
                elif "DATETIME" in col_type: col_type = "DATETIME"
                elif "FLOAT" in col_type: col_type = "FLOAT"
                elif "INTEGER" in col_type: col_type = "INTEGER"
                elif "NUMERIC" in col_type: col_type = "NUMERIC"
                elif "TEXT" in col_type: col_type = "TEXT"
                
                default_clause = ""
                if column.default is not None:
                     # This is a simplification
                     pass
                
                try:
                    db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}"))
                    print(f"  Successfully added {column.name}")
                except Exception as e:
                    print(f"  Error adding {column.name}: {e}")
    
    db.session.commit()
    print("Schema synchronization complete.")
