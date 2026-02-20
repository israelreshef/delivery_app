import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'delivery.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN fcm_token TEXT;")
    conn.commit()
    print("✅ Successfully added fcm_token column to users table.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️ fcm_token column already exists.")
    else:
        print(f"❌ Error adding column: {e}")

conn.close()
