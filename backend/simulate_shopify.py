import requests
import json

# Configuration
API_URL = "http://localhost:5000/api/external/orders"
# In a real scenario, this key would be in the DB.
# Since we haven't manually inserted a key yet, we expect this to FAIL with 401 initially, 
# or we need to insert a key first. 
# For this script to work, we'll auto-insert a key if running against a local dev Environment 
# or manual entry is required.

API_KEY_PREFIX = "tzir_dev"
API_KEY_SECRET = "secret123" 
# Pre-hashed value for 'secret123' must be in DB. 
# $2b$12$eX6lqovX.... (bcrypt hash of secret123)

def simulate_shopify_order():
    payload = {
        "merchant_order_id": "SHOPIFY-1024",
        "customer": {
            "name": "Dana Cohen",
            "phone": "052-9999999",
            "email": "dana@store.com"
        },
        "delivery_address": {
            "city": "Ramat Gan",
            "street": "Bialik",
            "number": "55",
            "floor": "2",
            "apartment": "10"
        },
        "package_details": {
            "weight": 1.5,
            "description": "Fashion Accessories - Bag"
        },
        "notes": "Leave at door code 1234"
    }

    print(f"🔌 Simulate sending order from Shopify...")
    
    # We construct the header as expected: prefix.secret
    headers = {
        "X-API-KEY": f"{API_KEY_PREFIX}.{API_KEY_SECRET}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Order created successfully!")
            data = response.json()
            print(f"   Internal ID: {data.get('order_id')}")
            print(f"   Order Num: {data.get('order_number')}")
            print(f"   Tracking: {data.get('tracking_url')}")
        elif response.status_code == 401:
            print("❌ Authentication Failed: API Key invalid or not present in DB.")
            print("👉 Action: Run 'flask create-api-key' (if implemented) or manually insert key.")
        else:
            print("❌ Request failed.")
            
    except Exception as e:
        print(f"⚠️ Connection Error: {e}")

if __name__ == "__main__":
    simulate_shopify_order()
