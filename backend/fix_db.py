import sqlite3

db_path = r'c:\Users\Israel\Desktop\delivery_app\backend\delivery.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# update delivery urgency
cur.execute("UPDATE delivery SET urgency = 'standard' WHERE urgency = 'normal'")
print(f"Updated {cur.rowcount} delivery records.")

# just in case
cur.execute("UPDATE orders SET urgency = 'standard' WHERE urgency = 'normal'")
print(f"Updated {cur.rowcount} orders records.")

conn.commit()
conn.close()
