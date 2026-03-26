import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'delivery.db')
print(f"Using DB: {db_path}")

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print(f"Tables: {tables}")

# Check all distinct statuses in deliveries
c.execute("SELECT DISTINCT status FROM deliveries")
statuses = [r[0] for r in c.fetchall()]
print(f"Delivery statuses: {statuses}")

valid_statuses = ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')
invalid = [s for s in statuses if s not in valid_statuses]
print(f"Invalid statuses found: {invalid}")

for inv in invalid:
    c.execute("UPDATE deliveries SET status = 'assigned' WHERE status = ?", (inv,))
    print(f"  Fixed {c.rowcount} rows with status={inv}")

# Check status_history tables
for table_name in tables:
    if 'status' in table_name.lower() or 'history' in table_name.lower():
        print(f"\nChecking table: {table_name}")
        try:
            c.execute(f"SELECT DISTINCT status FROM [{table_name}]")
            hist_statuses = [r[0] for r in c.fetchall()]
            print(f"  Statuses: {hist_statuses}")
            for inv in [s for s in hist_statuses if s not in valid_statuses]:
                c.execute(f"UPDATE [{table_name}] SET status = 'assigned' WHERE status = ?", (inv,))
                print(f"  Fixed {c.rowcount} rows with status={inv}")
        except Exception as e:
            print(f"  Skipped: {e}")

conn.commit()
conn.close()
print("\nDatabase cleanup complete!")
