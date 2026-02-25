
from app import create_app
from models import db, Courier, Expense
import sqlalchemy as sa

app = create_app()
with app.app_context():
    engine = db.engine
    inspector = sa.inspect(engine)
    
    tables = ['couriers', 'expenses']
    for table in tables:
        print(f"\nChecking table: {table}")
        columns = [c['name'] for c in inspector.get_columns(table)]
        print(f"Columns: {columns}")
        
        # Check specific new columns
        if table == 'couriers':
            needed = ['tax_id', 'withholding_tax_rate', 'withholding_expiry']
        else:
            needed = ['base_amount', 'vat_amount', 'total_amount', 'is_contractor_invoice']
            
        for col in needed:
            if col in columns:
                print(f"  [OK] {col}")
            else:
                print(f"  [MISSING] {col}")

    try:
        print("\nAttempting query on Courier...")
        Courier.query.first()
        print("Courier query OK")
    except Exception as e:
        print(f"Courier query FAILED: {e}")

    try:
        print("\nAttempting query on Expense...")
        Expense.query.first()
        print("Expense query OK")
    except Exception as e:
        print(f"Expense query FAILED: {e}")
