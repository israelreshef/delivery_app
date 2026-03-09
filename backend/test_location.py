
import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def simulate_location():
    # 1. Login to get a valid token (Israel Reshef - Courier 1)
    login_data = {
        "email": "courier@tzir.com",
        "password": "TzirRiderSpeed!77"
    }
    
    print("Logging in as courier...")
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
        
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get Courier ID
    # In this app, courier_id might be different from user_id.
    # Israel Reshef is ID 1 in my previous API test.
    courier_id = 1
    
    # 3. Send Location
    lat, lng = 32.0853, 34.7818 # Tel Aviv Center
    print(f"Sending location for courier {courier_id}: {lat}, {lng}")
    
    payload = {
        "courier_id": courier_id,
        "lat": lat,
        "lng": lng
    }
    
    res = requests.post(f"{BASE_URL}/couriers/location", json=payload, headers=headers)
    print(f"Response Status: {res.status_code}")
    print(f"Response Body: {res.text}")
    
    if res.status_code == 200:
        print("SUCCESS: Location update accepted.")
        
        # 4. Verify DB
        print("\nVerifying database update...")
        from models import Courier
        from app import create_app
        import os
        
        app_instance = create_app()
        with app_instance.app_context():
            from extensions import db
            c = Courier.query.get(courier_id)
            print(f"Courier {c.id} Location in DB: {c.current_location_lat}, {c.current_location_lng}")
            if c.current_location_lat == lat and c.current_location_lng == lng:
                print("DB UPDATE VERIFIED.")
            else:
                print("DB UPDATE FAILED (mismatch).")

if __name__ == "__main__":
    simulate_location()
