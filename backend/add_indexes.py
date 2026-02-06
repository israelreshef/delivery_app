# Database Performance Optimization Script
# Run this to add critical indexes

from app import create_app
from extensions import db
from sqlalchemy import text

def add_performance_indexes():
    app = create_app()
    with app.app_context():
        print("🚀 Adding Performance Indexes...")
        
        indexes = [
            # User indexes (critical for auth!)
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
            "CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type)",
            "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
            
            # Delivery indexes
            "CREATE INDEX IF NOT EXISTS idx_delivery_customer ON deliveries(customer_id)",
            "CREATE INDEX IF NOT EXISTS idx_delivery_tracking ON deliveries(tracking_number)",
            "CREATE INDEX IF NOT EXISTS idx_delivery_pickup_time ON deliveries(estimated_pickup_time)",
            "CREATE INDEX IF NOT EXISTS idx_delivery_delivery_time ON deliveries(estimated_delivery_time)",
            
            # Address indexes
            "CREATE INDEX IF NOT EXISTS idx_address_user ON addresses(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_address_city ON addresses(city)",
            
            # Customer indexes
            "CREATE INDEX IF NOT EXISTS idx_customer_user ON customers(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_customer_balance ON customers(balance)",
            
            # Courier indexes (additional)
            "CREATE INDEX IF NOT EXISTS idx_courier_user ON couriers(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_courier_rating ON couriers(rating DESC)",
            
            # Support indexes
            "CREATE INDEX IF NOT EXISTS idx_ticket_status ON support_tickets(status)",
            "CREATE INDEX IF NOT EXISTS idx_ticket_user ON support_tickets(user_id)",
            
            # CRM indexes
            "CREATE INDEX IF NOT EXISTS idx_lead_status ON leads(status)",
            "CREATE INDEX IF NOT EXISTS idx_lead_created ON leads(created_at DESC)",
            
            # Composite indexes for common queries
            "CREATE INDEX IF NOT EXISTS idx_delivery_courier_created ON deliveries(courier_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_delivery_customer_created ON deliveries(customer_id, created_at DESC)",
        ]
        
        success_count = 0
        skip_count = 0
        
        with db.engine.connect() as conn:
            for idx_sql in indexes:
                try:
                    conn.execute(text(idx_sql))
                    conn.commit()
                    idx_name = idx_sql.split('idx_')[1].split(' ')[0]
                    print(f"✅ Added: {idx_name}")
                    success_count += 1
                except Exception as e:
                    error_msg = str(e)
                    if 'already exists' in error_msg.lower():
                        skip_count += 1
                    else:
                        print(f"⚠️ Error: {error_msg[:80]}")
        
        print(f"\n✨ Done! Added {success_count} indexes, skipped {skip_count} existing.")
        print("🚀 Database queries should be significantly faster now!")

if __name__ == "__main__":
    add_performance_indexes()
