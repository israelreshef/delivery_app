import sys
import os
import secrets
import json
from werkzeug.security import generate_password_hash

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import ApiKey

def run_integration_test():
    # Setup Log File
    log_file = os.path.join(os.path.dirname(__file__), 'verification_output.txt')
    
    def log(msg):
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
        print(msg) # Still print to console just in case

    # Clear previous log
    open(log_file, 'w', encoding='utf-8').close()
    
    log("Starting Test via File Logging...")

    # Initialize App
    try:
        app = create_app()
        app.config['TESTING'] = True
        # Use main DB or sqlite? Let's use the one configured.
    except Exception as e:
        log(f"CRITICAL: Failed to create app: {e}")
        return

    generated_keys = []

    # 1. Generate Keys
    try:
        with app.app_context():
            log("Generating Keys...")
            for i in range(1, 11):
                merchant_name = f"Shopify Store #{i}"
                prefix = secrets.token_hex(4)
                secret = secrets.token_urlsafe(32)
                full_key = f"{prefix}.{secret}"
                key_hash = generate_password_hash(secret)
                
                if not ApiKey.query.filter_by(merchant_name=merchant_name).first():
                    new_key = ApiKey(prefix=prefix, key_hash=key_hash, merchant_name=merchant_name)
                    db.session.add(new_key)
                    generated_keys.append((merchant_name, full_key))
                else:
                    # Retrieve existing? No, we don't have secret. 
                    # Just generate a NEW unique name
                    pass
            
            db.session.commit()
            log(f"Generated {len(generated_keys)} NEW keys.")
            
            # If 0 new keys, generate fresh random ones
            if len(generated_keys) < 10:
                log("Supplementing with random keys...")
                for i in range(10 - len(generated_keys)):
                    merchant_name = f"Random Store {secrets.token_hex(4)}"
                    prefix = secrets.token_hex(4)
                    secret = secrets.token_urlsafe(32)
                    full_key = f"{prefix}.{secret}"
                    key_hash = generate_password_hash(secret)
                     
                    new_key = ApiKey(prefix=prefix, key_hash=key_hash, merchant_name=merchant_name)
                    db.session.add(new_key)
                    generated_keys.append((merchant_name, full_key))
                db.session.commit()
                
    except Exception as e:
        log(f"CRITICAL: DB Error: {e}")
        return

    # 2. Simulate
    client = app.test_client()
    success = 0
    
    for merchant, key in generated_keys:
        payload = {
            "merchant_order_id": f"ORD-{secrets.token_hex(2)}",
            "customer": {"name": "Test User", "phone": "0500000000"},
            "delivery_address": {"city": "TA", "street": "Test", "number": "1"},
            "package_details": {"description": "Test Pkg"}
        }
        headers = {"X-API-KEY": key, "Content-Type": "application/json"}
        
        try:
            resp = client.post('/api/external/orders', json=payload, headers=headers)
            if resp.status_code == 201:
                log(f"SUCCESS: {merchant}")
                success += 1
            else:
                log(f"FAIL: {merchant} | Code: {resp.status_code} | Body: {resp.get_data(as_text=True)}")
        except Exception as e:
            log(f"EXCEPTION: {e}")

    log(f"FINAL RESULT: {success}/{len(generated_keys)}")

if __name__ == "__main__":
    run_integration_test()
