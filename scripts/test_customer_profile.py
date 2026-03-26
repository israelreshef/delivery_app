import requests
import time

BASE_URL = 'http://localhost:5000/api'

def test_profile_and_addresses():
    print("1. Setup: Registering & Logging In")
    test_email = f"profile_test_{int(time.time())}@example.com"
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": "password123",
        "user_type": "customer",
        "full_name": "Profile Test Cust",
        "customer_type": "private"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": "password123"
    }).json()
    token = login_res['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Testing GET /api/customers/profile")
    res = requests.get(f"{BASE_URL}/customers/profile", headers=headers)
    print(res.status_code, res.json())
    assert res.status_code == 200
    assert res.json()['full_name'] == "Profile Test Cust"

    print("\n3. Testing PUT /api/customers/profile")
    res = requests.put(f"{BASE_URL}/customers/profile", headers=headers, json={
        "full_name": "Updated Profile Name",
        "phone": "0509999999"
    })
    print(res.status_code, res.json())
    assert res.status_code == 200
    
    # Verify update
    res = requests.get(f"{BASE_URL}/customers/profile", headers=headers).json()
    assert res['full_name'] == "Updated Profile Name"
    assert res['phone'] == "0509999999"
    
    print("\n4. Testing GET /api/customers/addresses (Empty)")
    res = requests.get(f"{BASE_URL}/customers/addresses", headers=headers)
    print(res.status_code, res.json())
    assert res.status_code == 200
    assert len(res.json()['addresses']) == 0
    
    print("\n5. Testing POST /api/customers/addresses")
    res = requests.post(f"{BASE_URL}/customers/addresses", headers=headers, json={
        "street": "Herzl",
        "city": "Tel Aviv",
        "building_number": "10",
        "apartment": "5",
        "notes": "Gate code 1234"
    })
    print(res.status_code, res.json())
    assert res.status_code == 201
    addr_id = res.json()['id']
    
    print("\n6. Testing GET /api/customers/addresses (1 item)")
    res = requests.get(f"{BASE_URL}/customers/addresses", headers=headers).json()
    print("Addresses:", res['addresses'])
    assert len(res['addresses']) == 1
    
    print("\n7. Testing DELETE /api/customers/addresses")
    res = requests.delete(f"{BASE_URL}/customers/addresses/{addr_id}", headers=headers)
    print(res.status_code, res.json())
    assert res.status_code == 200
    
    print("\nALL PASSED")

if __name__ == "__main__":
    test_profile_and_addresses()
