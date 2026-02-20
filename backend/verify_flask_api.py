import requests
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def test_api():
    print(f"🚀 Testing Flask API at {BASE_URL}...")
    
    # 1. Health Check
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {r.status_code} {r.json()}")
        assert r.status_code == 200
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return

    # 2. Try to login with demo credentials
    print("Trying login with demo_courier...")
    login_data = {
        "email": "courier@tzir.com",
        "password": "TzirRiderSpeed!77"
    }
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if r.status_code == 200:
            print("✅ Login Successful!")
            token = r.json().get("access_token")
            print(f"Token: {token[:20]}...")
            
            # 3. Test Profile
            headers = {"Authorization": f"Bearer {token}"}
            rp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            print(f"Profile Check: {rp.status_code} {rp.json().get('username')}")
            assert rp.status_code == 200
            
        else:
            print(f"❌ Login Failed: {r.status_code} {r.text}")
    except Exception as e:
        print(f"❌ Login Request Failed: {e}")

if __name__ == "__main__":
    test_api()
