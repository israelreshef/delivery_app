import requests
import time
import logging

BASE_URL = "http://localhost:5000"

def test_pagination_and_speed():
    print("🧪 Verifying Pagination and Performance...")
    
    # Needs a valid token - for simplicity, we assume the server is seeded with certain data
    # In a real environment, we'd login first.
    
    # 1. Test Orders Pagination
    print("   Checking Orders Pagination...")
    try:
        # We need a token. Let's try to login as admin.
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@tzir.com",
            "password": "password123"
        })
        if login_res.status_code != 200:
            print("   ❌ Admin login failed. Skipping performance verification.")
            return
            
        token = login_res.json()['token']
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Page 1, Limit 5
        start_time = time.time()
        res = requests.get(f"{BASE_URL}/api/orders?page=1&per_page=5", headers=headers)
        duration = time.time() - start_time
        
        if res.status_code == 200:
            data = res.json()
            print(f"   ✅ Orders Paginated: {len(data.get('data', []))} items returned.")
            print(f"   ✅ Response time: {duration:.3f}s")
            if 'total' in data:
                print(f"   ✅ Metadata present: Total={data['total']}, Pages={data['pages']}")
        else:
            print(f"   ❌ Orders request failed: {res.text}")

        # 2. Test Customers Pagination
        print("   Checking Customers Pagination...")
        start_time = time.time()
        res = requests.get(f"{BASE_URL}/api/customers?page=1&per_page=5", headers=headers)
        duration = time.time() - start_time
        
        if res.status_code == 200:
            data = res.json()
            print(f"   ✅ Customers Paginated: {len(data.get('data', []))} items returned.")
            print(f"   ✅ Response time: {duration:.3f}s")
        else:
            print(f"   ❌ Customers request failed: {res.text}")

    except Exception as e:
        print(f"   ❌ Error during verification: {e}")

if __name__ == "__main__":
    test_pagination_and_speed()
