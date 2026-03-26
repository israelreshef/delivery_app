import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app
from extensions import db
from sqlalchemy import text, inspect

def fix_schema():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        
        # 1. Check Invoices Table
        if inspector.has_table('invoices'):
            columns = [c['name'] for c in inspector.get_columns('invoices')]
            
            # Add vat_rate if missing
            if 'vat_rate' not in columns:
                print("Adding missing column 'vat_rate' to 'invoices' table...")
                try:
                    db.session.execute(text("ALTER TABLE invoices ADD COLUMN vat_rate FLOAT DEFAULT 0.17 NOT NULL"))
                    db.session.commit()
                    print(" Added 'vat_rate' to 'invoices'.")
                except Exception as e:
                    db.session.rollback()
                    print(f" Failed to add 'vat_rate': {e}")
            else:
                print("Column 'vat_rate' already exists in 'invoices'.")
                
            # Check for document_type (added in previous sessions but let's be sure)
            if 'document_type' not in columns:
                print("Adding missing column 'document_type' to 'invoices' table...")
                try:
                    db.session.execute(text("ALTER TABLE invoices ADD COLUMN document_type VARCHAR(50) DEFAULT 'tax_invoice_receipt'"))
                    db.session.commit()
                    print(" Added 'document_type' to 'invoices'.")
                except Exception as e:
                    db.session.rollback()
                    print(f" Failed to add 'document_type': {e}")
        else:
            print("Table 'invoices' does not exist.")

        # 2. Check Orders/Deliveries table for missing fields in result mapping
        # Nothing critical found yet but good to check
        
        print("\nSchema synchronization complete.")

if __name__ == "__main__":
    fix_schema()
