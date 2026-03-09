import time
import requests
import socketio
import sys
import threading

sio = socketio.Client()
test_success = False

@sio.event
def connect():
    print("📲 [Courier Device] Connected to Socket.IO server!")

@sio.on('route_updated')
def on_route_updated(data):
    global test_success
    print(f"✅ [Courier Device] SUCCESS: Received 'route_updated' event! Payload: {data}")
    test_success = True
    sio.disconnect()

def run_test():
    global test_success
    base_url = 'http://127.0.0.1:5001'
    
    print("--- E2E Routing & WebSocket Test ---")
    
    # 1. Login as Admin to get Admin JWT token
    print("\n👨‍💻 [Admin Console] Logging in to trigger recalculation...")
    admin_auth = requests.post(f'{base_url}/api/auth/login', json={
        'username': 'admin@tzir.com',
        'password': 'TzirSuper2026!$!'
    })
    
    if admin_auth.status_code != 200:
        print(f"❌ Admin login failed! Status: {admin_auth.status_code}, Response: {admin_auth.text}")
        sys.exit(1)
        
    admin_token = admin_auth.json().get('access_token')
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    print("👨‍💻 [Admin Console] Login successful. Access Token acquired.")

    # 2. Login as Courier to get Courier JWT token and Courier ID
    print("\n🛵 [Courier App] Logging in...")
    courier_auth = requests.post(f'{base_url}/api/auth/login', json={
        'username': 'courier@tzir.com',
        'password': 'TzirRiderSpeed!77'
    })
    
    if courier_auth.status_code != 200:
        print(f"❌ Courier login failed! Status: {courier_auth.status_code}, Response: {courier_auth.text}")
        sys.exit(1)
    
    courier_data = courier_auth.json()
    courier_token = courier_data.get('access_token')
    courier_user_id = courier_data.get('user', {}).get('id')
    
    # We need the courier_id, not just user_id.
    # Fetch all couriers using the Admin token to find our real courier ID.
    profile_resp = requests.get(f'{base_url}/api/couriers', headers=admin_headers)
    courier_id = None
    if profile_resp.status_code == 200:
        data = profile_resp.json()
        # Handle paginated response if backend uses pagination
        courier_list = data.get('items', data.get('couriers', [])) if isinstance(data, dict) else data
        for c in courier_list:
            if isinstance(c, dict) and c.get('user_id') == courier_user_id:
                courier_id = c.get('id')
                break
    
    if not courier_id:
        print("⚠️ Could not determine Courier ID from API. Falling back to courier_id = 1")
        courier_id = 1
        
    print(f"🛵 [Courier App] Login successful. Courier ID: {courier_id}")
    
    # 3. Start a background thread for the SocketIO client with courier auth
    try:
        sio.connect(f'{base_url}?token={courier_token}')
    except Exception as e:
        print(f"❌ Failed to connect to {base_url}: {e}")
        sys.exit(1)

    sio.emit('join', {'role': 'courier', 'id': courier_id, 'token': courier_token})
    print(f"📲 [Courier Device] Joined WebSocket room 'courier_{courier_id}'")
    
    time.sleep(2) # Let the join process and logs flush
    
    # 4. Trigger recalculate endpoint as Admin
    print(f"\n👨‍💻 [Admin Console] Calling POST /api/optimize/recalculate/{courier_id}...")
    recalc_resp = requests.post(f'{base_url}/api/optimize/recalculate/{courier_id}', headers=admin_headers)
    print(f"👨‍💻 [Admin Console] API Response ({recalc_resp.status_code}): {recalc_resp.text}")
    
    # Wait up to 5 seconds for the socket event to trigger our callback
    print("\n⏳ Waiting for WebSocket delivery to Courier Device...")
    timeout = 5
    while timeout > 0 and not test_success:
        time.sleep(1)
        timeout -= 1
        
    if not test_success:
        print("❌ FAILED: Did not receive 'route_updated' event via WebSocket within timeout.")
        sio.disconnect()
        sys.exit(1)
    else:
        print("\n🎉 E2E TEST PASSED: Route recalculation API successfully triggers Courier device WebSockets in real-time!")
        sys.exit(0)

if __name__ == '__main__':
    run_test()
