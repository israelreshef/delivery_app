import sqlite3

import os
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'delivery.db')
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
