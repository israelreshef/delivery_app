
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'delivery.db')
print(f"Connecting to database at {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists first
    cursor.execute("PRAGMA table_info(deliveries)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'biometric_verification_required' not in columns:
        print("Adding 'biometric_verification_required' column...")
        cursor.execute("ALTER TABLE deliveries ADD COLUMN biometric_verification_required BOOLEAN DEFAULT 0")
        conn.commit()
        print("Column added successfully.")
    else:
        print("Column 'biometric_verification_required' already exists.")
        
    conn.close()
    print("Database patch completed.")
    
except Exception as e:
    print(f"Error: {e}")
