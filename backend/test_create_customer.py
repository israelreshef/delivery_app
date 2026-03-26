import requests
import json

base_url = 'http://localhost:5000/api'
login_url = f'{base_url}/auth/login'
customers_url = f'{base_url}/customers'

def test_create_customer():
    # Login as admin
    session = requests.Session()
    resp = session.post(login_url, json={'username': 'demo_admin', 'password': 'password'})
    if resp.status_code != 200:
        print("Login failed", resp.text)
        return
    
    token = resp.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Try to create customer 1 with empty email
    data1 = {
        'has_account': True,
        'username': 'customer_test_1',
        'password': 'password123',
        'full_name': 'Test Customer 1',
        'email': '',
        'phone': '0501234567',
        'is_business': False,
        'credit_limit': ''
    }
    resp1 = session.post(customers_url, json=data1, headers=headers)
    print("Customer 1 response:", resp1.status_code, resp1.text)
    
    # Try to create customer 2 with empty email
    data2 = {
        'has_account': True,
        'username': 'customer_test_2',
        'password': 'password123',
        'full_name': 'Test Customer 2',
        'email': '',
        'phone': '0501234568',
        'is_business': False,
        'credit_limit': ''
    }
    resp2 = session.post(customers_url, json=data2, headers=headers)
    print("Customer 2 response:", resp2.status_code, resp2.text)

if __name__ == '__main__':
    try:
        test_create_customer()
    except Exception as e:
        print("Error:", e)
