import requests
import pyotp
import time

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    print("\n--- 1. Testing Demo Logins ---")
    # Customer
    r = requests.post(f"{BASE_URL}/api/auth/login", json={'username': 'demo_client', 'password': 'TzirClient2026!'})
    print(f"Customer login (username): {r.status_code}")

    # Courier
    r = requests.post(f"{BASE_URL}/api/auth/login", json={'username': 'demo_courier', 'password': 'TzirRiderSpeed!77'})
    print(f"Courier login (username): {r.status_code}")
    
    # Admin
    r = requests.post(f"{BASE_URL}/api/auth/login", json={'username': 'super_admin', 'password': 'TzirSuper2026!$!'})
    print(f"Admin login (username): {r.status_code}")
    
    admin_token = None
    if r.status_code == 200:
        data = r.json()
        if data.get('requires_2fa'):
            print("Admin login requires MFA. Setup not completed yet, which is expected.")
            mfa_token = data.get('mfa_token')
            # For testing, we need to bypass MFA or use the initial JWT if MFA wasn't enabled.
        elif data.get('token'):
            print("Admin login successful. Got token.")
            admin_token = data.get('token')

    if admin_token:
        print("\n--- 2. Testing Manual Backup ---")
        r = requests.post(f"{BASE_URL}/api/admin/backup", headers={'Authorization': f'Bearer {admin_token}'})
        print(f"Backup trigger: {r.status_code} {r.text}")

        print("\n--- 3. Testing MFA Flow ---")
        # Ensure we delete prior MFA state for demo_admin in DB if we want clean test
        # Actually, let's just do setup
        r = requests.post(f"{BASE_URL}/api/admin/mfa/setup", headers={'Authorization': f'Bearer {admin_token}'})
        print(f"MFA Setup: {r.status_code}")
        if r.status_code == 200:
            secret = r.json().get('secret')
            print(f"Got secret: {secret}")
            totp = pyotp.TOTP(secret)
            code = totp.now()
            print(f"Verifying with code: {code}")
            r2 = requests.post(f"{BASE_URL}/api/admin/mfa/verify", headers={'Authorization': f'Bearer {admin_token}'}, json={'code': code})
            print(f"MFA Verify: {r2.status_code} {r2.text}")
            
            # Now let's try login again
            print("Logging in again with MFA...")
            r3 = requests.post(f"{BASE_URL}/api/auth/login", json={'username': 'demo_admin', 'password': 'Admin1234!'})
            if r3.status_code == 200 and r3.json().get('requires_2fa'):
                mfa_token_2 = r3.json().get('mfa_token')
                code2 = pyotp.TOTP(secret).now()
                r4 = requests.post(f"{BASE_URL}/api/admin/mfa/validate", json={'mfa_token': mfa_token_2, 'code': code2})
                print(f"MFA Validate during login: {r4.status_code}")
            else:
                 print(f"MFA enforcement failed on second login: {r3.status_code} {r3.text}")
    else:
        print("Skipping admin routes as admin_token is missing.")

    print("\n--- 4. Testing Auto-Block (110 requests) ---")
    blocked = False
    for i in range(110):
        r = requests.get(f"{BASE_URL}/api/health")
        if r.status_code == 429:
            print(f"Blocked at request {i+1}: {r.json()}")
            blocked = True
            break
            
    if not blocked:
        r = requests.get(f"{BASE_URL}/api/health")
        print(f"Final status after 110 reqs: {r.status_code} {r.text}")

if __name__ == '__main__':
    run_tests()
