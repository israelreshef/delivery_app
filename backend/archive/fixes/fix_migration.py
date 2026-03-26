import sqlite3

conn = sqlite3.connect('delivery.db')
c = conn.cursor()

def get_columns(table):
    c.execute(f'PRAGMA table_info({table})')
    return [row[1] for row in c.fetchall()]

def safe_add(table, column, col_type, default=None):
    cols = get_columns(table)
    if column not in cols:
        default_clause = f" DEFAULT '{default}'" if default else ""
        sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"
        print(f"  + {sql}")
        c.execute(sql)
        return True
    return False

count = 0
print("=== Syncing customers ===")
count += safe_add('customers', 'customer_type', 'VARCHAR(20)', 'business')
count += safe_add('customers', 'tax_id', 'VARCHAR(50)')
count += safe_add('customers', 'vat_status', "VARCHAR(20)", 'standard')
count += safe_add('customers', 'payment_terms', 'VARCHAR(50)', 'net30')

print("=== Syncing couriers ===")
count += safe_add('couriers', 'employment_type', 'VARCHAR(20)', 'freelance')

print("=== Syncing invoices ===")
count += safe_add('invoices', 'document_type', 'VARCHAR(30)', 'tax_invoice_receipt')

print("=== Syncing users ===")
count += safe_add('users', 'privacy_consent_at', 'DATETIME')

print("=== Creating new tables ===")
# Create traffic_scores if not exists
c.execute("""CREATE TABLE IF NOT EXISTS traffic_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    courier_id INTEGER NOT NULL REFERENCES couriers(id),
    points INTEGER DEFAULT 0,
    violation_type VARCHAR(100) NOT NULL,
    violation_date DATETIME NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)""")
print("  traffic_scores: OK")

# Create legal_cases if not exists
c.execute("""CREATE TABLE IF NOT EXISTS legal_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    courier_id INTEGER NOT NULL REFERENCES couriers(id),
    case_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    description TEXT NOT NULL,
    lawyer_assigned VARCHAR(255),
    court_date DATETIME,
    documents_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)""")
print("  legal_cases: OK")

# Create object_history if not exists
c.execute("""CREATE TABLE IF NOT EXISTS object_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action VARCHAR(10) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id),
    changes TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)""")
print("  object_history: OK")

# Create saved_routes if not exists
c.execute("""CREATE TABLE IF NOT EXISTS saved_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    courier_id INTEGER REFERENCES couriers(id),
    scheduled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)""")
print("  saved_routes: OK")

# Create route_stops if not exists
c.execute("""CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL REFERENCES saved_routes(id),
    sequence_number INTEGER NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    note TEXT,
    time_window_start DATETIME,
    time_window_end DATETIME,
    order_id INTEGER REFERENCES deliveries(id),
    stop_type VARCHAR(20) DEFAULT 'delivery',
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME
)""")
print("  route_stops: OK")

conn.commit()
conn.close()
print(f"\nDone! Applied {count} column migrations + table creation.")
