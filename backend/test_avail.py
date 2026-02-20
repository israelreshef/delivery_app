
import requests

login_res = requests.post('http://127.0.0.1:5000/api/auth/login', json={'username':'demo_courier', 'password':'TzirRiderSpeed!77'})
if login_res.status_code == 200:
    token = login_res.json().get('access_token')
    print('Token successfully obtained')
    
    # Try updating availability to False first to trigger an event
    res1 = requests.patch('http://127.0.0.1:5000/api/couriers/availability', json={'is_available': False}, headers={'Authorization': f'Bearer {token}'})
    print('Update 1:', res1.json())
    
    # Try updating availability to True to trigger another event
    res2 = requests.patch('http://127.0.0.1:5000/api/couriers/availability', json={'is_available': True}, headers={'Authorization': f'Bearer {token}'})
    print('Update 2:', res2.json())
else:
    print('Login failed:', login_res.json())

