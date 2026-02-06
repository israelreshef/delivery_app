import requests
import json

BASE_URL = "http://localhost:5000/api/orders/calculate"
# We need a token. For dev, we might mock it or login first.
# Assuming we can use the 'admin' user created in seed.
LOGIN_URL = "http://localhost:5000/api/auth/login"

def get_token():
    try:
        res = requests.post(LOGIN_URL, json={"username": "admin", "password": "adminpassword123"})
        if res.status_code == 200:
            return res.json()['token']
        print("Login failed:", res.text)
        return None
    except Exception as e:
        print("Login error:", e)
        return None

def test_pricing():
    token = get_token()
    if not token:
        print("Skipping test due to no token (Server might be down)")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    scenarios = [
        {
            "name": "Standard Local",
            "payload": {
                "distance_km": 5,
                "package_size": "small",
                "urgency": "standard",
                "delivery_type": "standard"
            }
        },
        {
            "name": "Express Valuable",
            "payload": {
                "distance_km": 15,
                "package_size": "medium",
                "urgency": "express",
                "delivery_type": "valuable",
                "insurance_required": True,
                "insurance_value": 2000
            }
        }
    ]

    for s in scenarios:
        print(f"\nTesting: {s['name']}")
        try:
            res = requests.post(BASE_URL, json=s['payload'], headers=headers)
            if res.status_code == 200:
                data = res.json()
                print(f"Price: {data['price']} ILS")
                print("Breakdown:", json.dumps(data['breakdown'], indent=2))
            else:
                print("Error:", res.status_code, res.text)
        except Exception as e:
            print("Request failed:", e)

if __name__ == "__main__":
    test_pricing()
