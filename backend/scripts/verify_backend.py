import requests
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

BASE_URL = "http://localhost:5000/api"

def run_verification():
    print("Starting Verification...")
    
    # 1. Registration
    def register_user(email, password, role, name):
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email, 
            "password": password, 
            "full_name": name, 
            "user_type": role,
            "username": email.split('@')[0],
            "phone": email.split('@')[0]
        })
        if r.status_code not in (200, 201) and "already exists" not in r.text:
            print(f"Failed to register {email}: {r.text}")
            
    admin_email = "admin_v4@example.com"
    courier_email = "courier_v4@example.com"
    customer_email = "customer_v4@example.com"
    
    print("Creating Users...")
    register_user(admin_email, "password123", "admin", "Admin Verify")
    register_user(courier_email, "password123", "courier", "Courier Verify")
    register_user(customer_email, "password123", "customer", "Customer Verify")

    # 2. Login
    def get_token(email, password):
        r = requests.post(f"{BASE_URL}/auth/login", json={"username": email, "password": password})
        if r.status_code != 200:
            print(f"Failed to login {email}: {r.text}")
            sys.exit(1)
        return r.json()

    admin_login = get_token(admin_email, "password123")
    courier_login = get_token(courier_email, "password123")
    customer_login = get_token(customer_email, "password123")
    
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
    courier_headers = {"Authorization": f"Bearer {courier_login['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_login['access_token']}"}
    
    # Extract Courier ID
    # In auth response, if courier_id is not directly there, we fetch via Admin API
    print("Fetching Courier ID...")
    r = requests.get(f"{BASE_URL}/couriers", headers=admin_headers)
    assert r.status_code == 200, f"Failed to get couriers: {r.text}"
    couriers_list = r.json().get('data', [])
    courier_id = None
    for c in couriers_list:
        if c.get('phone') == courier_email.split('@')[0]:
            courier_id = c['id']
            break
    
    assert courier_id is not None, "Could not find registered courier ID"

    # 3. Create Order (As Customer)
    print("Creating Order...")
    order_data = {
        "sender": {
            "senderName": "Sender",
            "senderPhone": "customer_v4",
            "senderAddress": {"street": "Rothschild 1", "city": "Tel Aviv"}
        },
        "recipient": {
            "recipientName": "Recipient",
            "recipientPhone": "0502222222",
            "recipientAddress": {"street": "Dizengoff 50", "city": "Tel Aviv"}
        },
        "package": {
            "packageContent": "Small box",
            "packageWeight": 1,
            "packageSize": "small"
        },
        "service": {
            "deliveryType": "standard",
            "urgency": "standard"
        }
    }
    r = requests.post(f"{BASE_URL}/orders/create", headers=customer_headers, json=order_data)
    if r.status_code not in (200, 201):
        print(f"Failed to create order: {r.text}")
        sys.exit(1)
    
    order = r.json()
    order_id = order['id']
    print(f"Order created: {order['order_number']}")
    
    # 4. List Orders (As Customer)
    print("Listing Orders...")
    r = requests.get(f"{BASE_URL}/orders", headers=customer_headers)
    assert r.status_code == 200, f"Failed to list orders {r.text}"
    my_orders = r.json()
    assert any(o['id'] == order_id for o in my_orders), "Newly created order not in customer's list"

    # 5. Assign Order to Courier (As Admin)
    print("Assigning Order to Courier...")
    r = requests.post(f"{BASE_URL}/orders/{order_id}/assign", headers=admin_headers, json={"courier_id": courier_id})
    assert r.status_code == 200, f"Failed to assign order: {r.text}"
    
    # 6. Courier Accepts Order
    print("Courier Accepting Order...")
    r = requests.post(f"{BASE_URL}/couriers/orders/{order_id}/accept", headers=courier_headers)
    assert r.status_code == 200, f"Courier failed to accept order: {r.text}"

    # 7. Courier Updates Status to Picked Up
    print("Courier Marking as Picked Up...")
    r = requests.post(f"{BASE_URL}/couriers/orders/{order_id}/status", headers=courier_headers, json={"status": "picked_up"})
    assert r.status_code == 200, f"Failed to set status to picked up: {r.text}"

    print("Verification Successful!")

if __name__ == "__main__":
    run_verification()
