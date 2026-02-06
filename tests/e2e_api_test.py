import requests
import random
import string

BASE_URL = "http://localhost:5000"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def run_test():
    print("🚀 Starting API E2E Verification...")
    
    # 1. Registration
    username = f"User_{generate_random_string()}"
    email = f"{username}@test.com"
    password = "password123"
    phone = f"050{generate_random_string(7)}"
    
    print(f"1. Registering new user: {username}...")
    try:
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": email,
            "password": password,
            "full_name": "Test User",
            "phone": phone,
            "user_type": "customer"
        })
        if res.status_code != 201:
            print(f"❌ Registration Failed: {res.text}")
            return
        print("✅ Registration Successful.")
    except Exception as e:
        print(f"❌ Connection Error (Is server running?): {e}")
        return

    # 2. Login
    print("2. Logging in...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if res.status_code != 200:
        print(f"❌ Login Failed: {res.text}")
        return
    token = res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login Successful. Token acquired.")

    # 3. Create Order
    print("3. Creating New Order...")
    order_payload = {
        "sender": {
            "senderName": "Sender One",
            "senderPhone": "0501111111",
            "senderAddress": {
                "city": "Tel Aviv",
                "street": "Rothschild",
                "number": "10",
                "floor": "1",
                "apartment": "2"
            }
        },
        "recipient": {
            "recipientName": "Receiver One",
            "recipientPhone": "0522222222",
            "recipientAddress": {
                "city": "Haifa",
                "street": "Herzl",
                "number": "20",
                "floor": "2",
                "apartment": "5"
            }
        },
        "package": {
            "packageContent": "Important Documents",
            "packageWeight": 0.5,
            "packageSize": "small"
        },
        "service": {
            "deliveryType": "standard",
            "urgency": "standard"
        }
    }
    
    res = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers)
    if res.status_code != 201:
        print(f"❌ Order Creation Failed: {res.text}")
        return
    
    order_data = res.json()
    order_id = order_data.get('id')
    print(f"✅ Order Created Successfully. Order ID: {order_id}")

    # 4. Track Order
    print(f"4. Tracking Order #{order_id}...")
    res = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=headers)
    if res.status_code != 200:
        print(f"❌ Tracking Failed: {res.text}")
        return
    
    data = res.json()
    print(f"   Status: {data.get('status')}")
    print(f"   Tracking Number: {data.get('order_number')}")
    print(f"   Pickup: {data['pickup']['address']}")
    print(f"   Delivery: {data['delivery']['address']}")
    
    if data.get('status') == 'pending':
        print("✅ E2E Verification PASSED! System is fully functional.")
    else:
        print(f"⚠️ Warning: Unexpected status '{data.get('status')}'. Expected 'pending'.")

if __name__ == "__main__":
    run_test()
