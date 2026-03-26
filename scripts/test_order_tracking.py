import requests
import time

BASE_URL = 'http://localhost:5000/api'

def test_order_tracking():
    print("1. Setup: Registering & Logging In")
    test_email = f"track_test_{int(time.time())}@example.com"
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": "password123",
        "user_type": "customer",
        "full_name": "Tracker Test Cust",
        "customer_type": "private"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": "password123"
    }).json()
    token = login_res['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Creating an Order")
    order_payload = {
        "pickup_address": {"street": "Herzl 1", "city": "Tel Aviv", "number": "1"},
        "pickup_contact_name": "Tracker Test Cust",
        "pickup_contact_phone": "0509876543",
        "delivery_address": {"street": "Dizengoff 10", "city": "Tel Aviv", "number": "10"},
        "recipient_name": "Recipient Name",
        "recipient_phone": "0501234567",
        "package": {"packageContent": "Sensitive Stuff", "packageWeight": 2, "packageSize": "medium"},
        "payment": {"paymentMethod": "credit_card"}
    }
    res = requests.post(f"{BASE_URL}/orders", headers=headers, json=order_payload).json()
    print("Order Create Response:", res)
    order_number = res['order_number']
    print(f"Order Number: {order_number}")

    print("\n3. Testing Public Tracking (No Auth)")
    res = requests.get(f"{BASE_URL}/orders/track/{order_number}")
    print("Public Track Status:", res.status_code)
    try:
        data = res.json()
        print("Public Track Data:", data)
    except Exception as e:
        print("Failed to decode JSON. Raw response:", res.text)
        raise e
    assert res.status_code == 200
    assert data['order_number'] == order_number
    assert 'status' in data
    assert 'status_history' in data
    assert 'pickup_city' in data
    assert 'delivery_city' in data
    # Privacy check: sensitive info like full address or contact phone should NOT be in public tracking
    assert 'recipient_phone' not in data
    assert 'package' not in data

    print("\n4. Testing Customer Order List")
    res = requests.get(f"{BASE_URL}/orders/customer", headers=headers)
    print("Customer Orders Status:", res.status_code)
    data = res.json()
    assert res.status_code == 200
    assert len(data['data']) >= 1
    assert data['data'][0]['order_number'] == order_number

    print("\nALL PASSED")

if __name__ == "__main__":
    test_order_tracking()
