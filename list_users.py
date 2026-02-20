import sqlite3
import os

db_path = "backend/delivery.db"
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, username, email, user_type, is_active FROM users")
    users = cursor.fetchall()
    
    print("ID | Username | Email | Role | Active")
    print("-" * 50)
    for user in users:
        print(f"{user[0]} | {user[1]} | {user[2]} | {user[3]} | {user[4]}")
except Exception as e:
    print(f"Error querying users: {e}")
finally:
    conn.close()
