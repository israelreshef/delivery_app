
from app import create_app
from models import User
from utils.file_encryption import encrypt_data, decrypt_data
from utils.audit import log_audit
import os
import json
import time

app = create_app()

def test_password_strength():
    print("Testing Password Strength...")
    u = User(username='test_sec', email='test@sec.com', user_type='admin', phone='000')
    u.set_password('securePassword123')
    
    if u.password_hash.startswith('pbkdf2:sha256:600000'):
        print("✅ Password Hash is using PBKDF2-SHA256 with 600,000 iterations.")
    else:
        print(f"❌ Weak Password Hash detected: {u.password_hash[:20]}...")

def test_encryption():
    print("Testing AES-256 Encryption...")
    original = b"Secret Data 123"
    encrypted = encrypt_data(original)
    decrypted = decrypt_data(encrypted)
    
    if original == decrypted:
        print("✅ Encryption/Decryption Round Trip successful.")
    else:
        print("❌ Decryption failed to match original.")

def test_audit_logging():
    print("Testing Audit Logging (JSON)...")
    with app.app_context():
        log_audit("TEST_ACTION", details="Testing JSON Log")
    
    time.sleep(1) # Wait for flush
    log_file = os.path.join(os.getcwd(), 'logs', 'security.json')
    
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            lines = f.readlines()
            last_line = lines[-1]
            data = json.loads(last_line)
            if data['action'] == "TEST_ACTION":
                print("✅ Audit Log written to JSON file correctly.")
            else:
                 print(f"❌ Audit Log content mismatch: {last_line}")
    else:
        print("❌ Log file not found.")

if __name__ == "__main__":
    test_password_strength()
    test_encryption()
    test_audit_logging()
