import requests
import json

url = "http://localhost:5000/api/auth/login"
payload = {
    "email": "test@example.com",
    "password": "password",
    "role": "customer"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Sending POST to {url} with payload {payload}")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
