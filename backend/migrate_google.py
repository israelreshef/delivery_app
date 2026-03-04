import sqlite3

def upgrade_db():
    try:
        conn = sqlite3.connect('delivery.db')
        cursor = conn.cursor()
        
        # Add Google Calendar columns to users table
        columns = [
            ("google_access_token", "TEXT"),
            ("google_refresh_token", "TEXT"),
            ("google_token_expiry", "DATETIME"),
            ("google_calendar_id", "VARCHAR(255) DEFAULT 'primary'")
        ]
        
        for col_name, col_type in columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"Added column {col_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"Column {col_name} already exists")
                else:
                    raise e
                    
        conn.commit()
        print("Database migration successful!")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    upgrade_db()
