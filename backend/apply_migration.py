
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'delivery.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, definition):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError:
        print(f"Column {column} already exists in {table}")

# Migrations for couriers
add_column('couriers', 'tax_id', 'VARCHAR(20)')
add_column('couriers', 'withholding_tax_rate', 'FLOAT DEFAULT 0.0')
add_column('couriers', 'withholding_expiry', 'DATE')

# Migrations for expenses
add_column('expenses', 'base_amount', 'NUMERIC(10, 2) DEFAULT 0.0')
add_column('expenses', 'vat_amount', 'NUMERIC(10, 2) DEFAULT 0.0')
add_column('expenses', 'withholding_tax_deducted', 'NUMERIC(10, 2) DEFAULT 0.0')
add_column('expenses', 'total_amount', 'NUMERIC(10, 2) DEFAULT 0.0')
add_column('expenses', 'vendor_name', 'VARCHAR(100)')
add_column('expenses', 'payment_method', 'VARCHAR(50)')
add_column('expenses', 'is_contractor_invoice', 'BOOLEAN DEFAULT 0')
add_column('expenses', 'courier_id', 'INTEGER REFERENCES couriers(id)')

# Sync existing amount to total_amount for expenses
try:
    cursor.execute("UPDATE expenses SET total_amount = amount WHERE total_amount = 0 AND amount > 0")
    print("Synced existing amounts in expenses")
except Exception as e:
    print(f"Sync error: {e}")

conn.commit()
conn.close()
print("Migration complete!")
