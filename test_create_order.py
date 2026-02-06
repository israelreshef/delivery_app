import requests
import json

# 1. Login to get token
base_url = "http://localhost:5000/api"
login_url = f"{base_url}/auth/login"
auth_data = {
    "username": "admin",
    "password": "admin123"
}

print("🔑 Logging in...")
login_res = requests.post(login_url, json=auth_data)

if login_res.status_code != 200:
    print(f"❌ Login failed: {login_res.text}")
    exit(1)

token = login_res.json().get('token')
headers = {"Authorization": f"Bearer {token}"}
print("✅ Logged in successfully.")

# 2. Create Order
order_url = f"{base_url}/orders"
order_payload = {
    "customer_name": "Test Client",
    "customer_phone": "0509998877",
    "pickup_address": "Tel Aviv, Rothschild 1",
    "pickup_coords": {"lat": 32.064, "lon": 34.773},
    "delivery_address": "Ramat Gan, Abba Hillel 7",
    "delivery_coords": {"lat": 32.088, "lon": 34.800},
    "package_type": "box",
    "package_size": "medium",
    "notes": "Test order via script",
    # Simulate correct behavior
    "encrypted_payload": "" 
}

print("📦 Sending create_order request...")
res = requests.post(order_url, json=order_payload, headers=headers)

print(f"Status Code: {res.status_code}")
try:
    print(json.dumps(res.json(), indent=4))
except:
    print(f"Raw Response: {res.text}")
