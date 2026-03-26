import requests
import time

BASE_URL = 'http://localhost:5000/api'

def test_orders_enhancements():
    print("1. Setup: Registering & Logging In (Business with 0 balance)")
    test_email = f"order_test_{int(time.time())}@example.com"
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": "password123",
        "user_type": "customer",
        "full_name": "Order Test Cust",
        "customer_type": "business"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": "password123"
    }).json()
    token = login_res['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Testing GET /api/orders/price-estimate")
    res = requests.get(f"{BASE_URL}/orders/price-estimate?distance_km=15&weight=5&urgency=express", headers=headers)
    print("GET Estimate:", res.status_code, res.json())
    assert res.status_code == 200
    assert 'price' in res.json()
    assert res.json()['price'] > 0

    print("\n3. Testing POST /api/orders/calculate (Backward compatibility)")
    res = requests.post(f"{BASE_URL}/orders/calculate", headers=headers, json={
        "distance_km": 15, "weight": 5, "urgency": "express"
    })
    print("POST Calculate:", res.status_code, res.json())
    assert res.status_code == 200

    print("\n4. Testing POST /api/orders (Insufficient Balance 402 Error)")
    order_payload = {
        "pickup_address": "Rothschild 1",
        "pickup_contact_name": "Test User",
        "pickup_contact_phone": "0501234567",
        "delivery_address": "Dizengoff 10",
        "recipient_name": "Delivery Guy",
        "recipient_phone": "0507654321",
        "package_description": "Documents",
        "distance_km": 15,
        "payment": {"paymentMethod": "wallet"}
    }
    res = requests.post(f"{BASE_URL}/orders", headers=headers, json=order_payload)
    print("Order Creation (0 Balance):", res.status_code, res.json())
    assert res.status_code == 402
    assert "Insufficient funds" in res.json()['error']

    print("\n5. Testing POST /api/orders (Multi-stop and Success with Credit Card)")
    order_payload['payment']['paymentMethod'] = "credit_card"
    order_payload['waypoints'] = [
        {"address": "Allenby 5", "lat": 32.06, "lng": 34.77},
        {"address": "Carmel Market", "lat": 32.065, "lng": 34.768}
    ]
    res = requests.post(f"{BASE_URL}/orders", headers=headers, json=order_payload)
    print("Order Creation (Credit Card + Waypoints):", res.status_code, res.json())
    assert res.status_code == 201
    assert "tracking_token" in res.json()
    
    print("\nALL PASSED")

if __name__ == "__main__":
    test_orders_enhancements()
