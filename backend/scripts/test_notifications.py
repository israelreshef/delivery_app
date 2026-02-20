
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def run_verification():
    print("Starting Notification Verification...")
    
    # 1. Login Logic (Reuse from verify_backend.py or just quick login)
    def get_token(email, password):
        r = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
        if r.status_code != 200:
            print(f"Failed to login {email}: {r.text}")
            sys.exit(1)
        return r.json()["access_token"]

    admin_email = "admin@example.com"
    courier_email = "courier@example.com"
    
    admin_token = get_token(admin_email, "password")
    courier_token = get_token(courier_email, "password")
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    courier_headers = {"Authorization": f"Bearer {courier_token}"}
    
    # 2. Get User IDs (Need to know courier's ID to send notification)
    r = requests.get(f"{BASE_URL}/auth/me", headers=courier_headers)
    if r.status_code != 200:
        print(f"Failed to get current user: {r.status_code} {r.text}")
    assert r.status_code == 200
    courier_id = r.json()["id"]
    print(f"Courier ID: {courier_id}")

    # 3. Send Test Notification (As Admin)
    print("Sending Test Notification...")
    r = requests.post(f"{BASE_URL}/notifications/test", headers=admin_headers, params={
        "user_id": courier_id,
        "message": "Hello Courier from Verification Script"
    })
    if r.status_code != 200:
        print(f"Failed to send notification: {r.text}")
        sys.exit(1)
    
    notif = r.json()
    print(f"Notification sent: ID {notif['id']}")
    assert notif['user_id'] == courier_id
    assert notif['message'] == "Hello Courier from Verification Script"
    
    # 4. List Notifications (As Courier)
    print("Listing Notifications...")
    r = requests.get(f"{BASE_URL}/notifications/", headers=courier_headers)
    assert r.status_code == 200
    my_notifs = r.json()
    print(f"Found {len(my_notifs)} notifications.")
    
    target_notif = next((n for n in my_notifs if n['id'] == notif['id']), None)
    assert target_notif is not None
    assert target_notif['is_read'] is False
    
    # 5. Mark as Read (As Courier)
    print("Marking as Read...")
    r = requests.put(f"{BASE_URL}/notifications/{notif['id']}/read", headers=courier_headers)
    assert r.status_code == 200
    updated_notif = r.json()
    assert updated_notif['is_read'] is True
    
    print("Notification Verification Successful!")

if __name__ == "__main__":
    run_verification()
