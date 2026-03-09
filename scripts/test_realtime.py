import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"
COURIER_USER = "demo_courier"
COURIER_PASS = "TzirRiderSpeed!77"



def test_location_update():
    # 1. Login to get token
    print("🔑 Logging in as courier...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": COURIER_USER,
        "password": COURIER_PASS
    })
    
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        return
        
    token = login_res.json().get('access_token') or login_res.json().get('token')
    print(f"✅ Logged in. Token: {token[:20]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 2. Update Location
    # Movement path
    path = [
        {"lat": 32.0853, "lng": 34.7818},
        {"lat": 32.0860, "lng": 34.7825},
        {"lat": 32.0870, "lng": 34.7835}
    ]
    
    for loc in path:
        print(f"📍 Sending location: {loc}")
        res = requests.post(f"{BASE_URL}/api/couriers/location", json=loc, headers=headers)
        if res.status_code == 200:
            print("✅ Location updated successfully!")
        else:
            print(f"❌ Failed to update location: {res.text}")
        time.sleep(2)

if __name__ == "__main__":
    test_location_update()
