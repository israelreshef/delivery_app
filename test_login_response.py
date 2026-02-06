import requests
import json

url = "http://localhost:5000/api/auth/login"
payload = {
    "username": "admin",
    "password": "admin123"
}

try:
    print(f"Testing login to {url}...")
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    try:
        data = response.json()
        print(json.dumps(data, indent=4))
        
        if 'user' in data:
            print("\n✅ Server returned 'user' key correctly.")
        elif 'user_data' in data:
            print("\n❌ Server returned 'user_data' key (mismatch with frontend).")
        else:
            print("\n❌ Server returned neither user nor user_data.")
            
    except Exception as e:
        print(f"Failed to parse JSON: {e}")
        print(response.text)

except Exception as e:
    print(f"Connection failed: {e}")
