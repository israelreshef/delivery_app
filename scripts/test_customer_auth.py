import requests
import time

BASE_URL = 'http://localhost:5000/api'

def test_auth():
    print("1. Testing Registration")
    test_email = f"test_customer_{int(time.time())}@example.com"
    payload = {
        "email": test_email,
        "password": "password123",
        "user_type": "customer",
        "full_name": "Test Customer",
        "customer_type": "private"
    }
    
    res = requests.post(f"{BASE_URL}/auth/register", json=payload)
    print(res.status_code, res.json())
    assert res.status_code == 201

    print("\n2. Testing Login")
    login_payload = {
        "email": test_email,
        "password": "password123"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print(res.status_code)
    data = res.json()
    assert res.status_code == 200
    access_token = data['access_token']
    refresh_token = data.get('refresh_token')
    print(f"Got access token: {bool(access_token)} | refresh token: {bool(refresh_token)}")

    if refresh_token:
        print("\n3. Testing Refresh")
        res = requests.post(f"{BASE_URL}/auth/refresh", headers={
            "Authorization": f"Bearer {refresh_token}"
        })
        print(res.status_code, res.json())
        assert res.status_code == 200
    
    print("\n4. Testing Logout")
    res = requests.post(f"{BASE_URL}/auth/logout", headers={
        "Authorization": f"Bearer {access_token}"
    })
    print(res.status_code, res.json())
    assert res.status_code == 200
    print("\nALL PASSED")

if __name__ == "__main__":
    test_auth()
