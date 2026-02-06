from app import create_app, db
from sqlalchemy import text

def enable_rls():
    app, _ = create_app()

    with app.app_context():
        print("🛡️ Enabling Row-Level Security (RLS) on 'deliveries' table...")
        
        sql = """
        -- Enable RLS on the table
        ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
        
        -- Force RLS even for the table owner (our app user), ensuring the policy always runs
        ALTER TABLE deliveries FORCE ROW LEVEL SECURITY;

        -- Drop existing policy if it exists to allow updates
        DROP POLICY IF EXISTS delivery_access_policy ON deliveries;

        -- Create the Security Policy
        CREATE POLICY delivery_access_policy ON deliveries
        FOR ALL
        USING (
            -- 1. Admins access all records
            current_setting('app.is_admin', true) = 'true'
            OR
            -- 2. Customers access their own orders
            customer_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
            OR
            -- 3. Couriers access orders assigned to them
            courier_id = NULLIF(current_setting('app.current_user_id', true), '')::INTEGER
        );
        """
        
        try:
            db.session.execute(text(sql))
            db.session.commit()
            print("✅ Row-Level Security (RLS) enabled successfully!")
            print("   - Non-admin users can now ONLY see their own deliveries.")
            print("   - AppOwner (delivery_user) is now subject to RLS.")
        except Exception as e:
            print(f"❌ Failed to enable RLS: {e}")
            db.session.rollback()

if __name__ == '__main__':
    enable_rls()
