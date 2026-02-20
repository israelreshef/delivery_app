
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def run_verification():
    print("Starting Verification...")
    
    # 1. Login/Get Token (assuming we have a superuser or can create one)
    # Since we can't easily rely on existing data, we might need to create one via script using CRUD directly 
    # OR use a known initial user if seeded.
    # Let's try to use the 'login/access-token' if we know credentials, otherwise we use python to create one directly in DB.
    
    # Using internal python imports to setup data is reliability.
    from app.core.db import SessionLocal
    from app.crud.user import user as crud_user
    from app.schemas.auth import UserCreate
    from app.core.security import get_password_hash
    
    db = SessionLocal()
    
    # Create Admin
    admin_email = "admin@example.com"
    admin = crud_user.get_by_email(db, email=admin_email)
    if not admin:
        print("Creating Admin...")
        admin = crud_user.create(db, user_in=UserCreate(
            email=admin_email, password="password", full_name="Admin User", role="admin"
        ))
        # promote to superuser manually if needed for endpoints
        admin.is_superuser = True
        db.commit()
    
    # Create Courier User
    courier_email = "courier@example.com"
    courier_user = crud_user.get_by_email(db, email=courier_email)
    if not courier_user:
        print("Creating Courier User...")
        courier_user = crud_user.create(db, user_in=UserCreate(
            email=courier_email, password="password", full_name="Courier User", role="courier"
        ))
        
    # Create Customer User
    customer_email = "customer@example.com"
    customer_user = crud_user.get_by_email(db, email=customer_email)
    if not customer_user:
        print("Creating Customer User...")
        customer_user = crud_user.create(db, user_in=UserCreate(
            email=customer_email, password="password", full_name="Customer User", role="customer"
        ))

    # Get Tokens
    def get_token(email, password):
        r = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
        if r.status_code != 200:
            print(f"Failed to login {email}: {r.text}")
            sys.exit(1)
        return r.json()["access_token"]

    admin_token = get_token(admin_email, "password")
    courier_token = get_token(courier_email, "password")
    customer_token = get_token(customer_email, "password")
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    courier_headers = {"Authorization": f"Bearer {courier_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    
    # 2. Create Courier Profile (As Courier)
    print("Creating Courier Profile...")
    # Check if exists first
    r = requests.get(f"{BASE_URL}/couriers/me", headers=courier_headers)
    if r.status_code == 404:
        r = requests.post(f"{BASE_URL}/couriers/", headers=courier_headers, json={
            "vehicle_type": "scooter",
            "is_available": True,
            "is_online": True,
            "current_latitude": 32.0853, # Tel Aviv
            "current_longitude": 34.7818
        })
        if r.status_code != 200:
            print(f"Failed to create courier profile: {r.text}")
            # sys.exit(1) # Don't exit, might already exist differently
    else:
        print("Courier profile exists.")

    # Update Location
    print("Updating Courier Location...")
    r = requests.put(f"{BASE_URL}/couriers/me", headers=courier_headers, json={
        "current_latitude": 32.0800,
        "current_longitude": 34.7800,
        "is_online": True
    })
    if r.status_code != 200:
        print(f"Failed to update courier location: {r.status_code} {r.text}")
    assert r.status_code == 200
    
    # 3. Search Nearest (As Admin)
    print("Searching Nearest Couriers...")
    r = requests.get(f"{BASE_URL}/couriers/nearest", headers=admin_headers, params={
        "lat": 32.0800, "lng": 34.7800, "radius_km": 5
    })
    if r.status_code != 200:
        print(f"Failed to search nearest couriers: {r.status_code} {r.text}")
    assert r.status_code == 200
    data = r.json()
    print(f"Found {len(data)} couriers.")
    assert len(data) > 0
    
    # 4. Create Order (As Customer)
    print("Creating Order...")
    order_data = {
        "pickup_address": {
            "street": "Rothschild 1",
            "city": "Tel Aviv",
            "building_number": "1",
            "latitude": 32.0625,
            "longitude": 34.7709
        },
        "delivery_address": {
             "street": "Dizengoff 50",
            "city": "Tel Aviv",
            "building_number": "50",
            "latitude": 32.0784,
            "longitude": 34.7744
        },
        "package_description": "Small box",
        "priority": "normal"
    }
    r = requests.post(f"{BASE_URL}/orders/", headers=customer_headers, json=order_data)
    if r.status_code != 200:
        print(f"Failed to create order: {r.text}")
        sys.exit(1)
    
    order = r.json()
    print(f"Order created: {order['order_number']}")
    
    # 5. List Orders (As Customer)
    print("Listing Orders...")
    r = requests.get(f"{BASE_URL}/orders/", headers=customer_headers)
    assert r.status_code == 200
    my_orders = r.json()
    assert any(o['id'] == order['id'] for o in my_orders)
    
    print("Verification Successful!")

if __name__ == "__main__":
    run_verification()
