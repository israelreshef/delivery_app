import subprocess, json

base = 'http://localhost:5000'

def curl(method, path, token=None, body=None):
    args = ['curl.exe', '-s', '-X', method, base + path]
    args += ['-H', 'Content-Type: application/json']
    if token:
        args += ['-H', 'Authorization: Bearer ' + token]
    if body:
        args += ['-d', json.dumps(body)]
    r = subprocess.run(args, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        return {'raw': r.stdout, 'stderr': r.stderr}

# Load state from step 1
with open('e2e_state.json') as f:
    state = json.load(f)

cust_token = state['cust_token']
order_id = state['order_id']
print(f'=== Loaded: order_id={order_id}, cust_token_len={len(cust_token)} ===')

# Admin login
admin = curl('POST', '/api/auth/login', body={'username': 'super_admin', 'password': 'admin123'})
admin_token = admin.get('access_token', 'FAILED')
print(f'=== ADMIN LOGIN: token_len={len(admin_token)} ===')

# Assign order
assign = curl('POST', f'/api/orders/{order_id}/assign', token=admin_token,
              body={'courier_username': 'demo_courier'})
print(f'=== ASSIGN RESULT: {json.dumps(assign, ensure_ascii=False)} ===')

# Courier login
courier = curl('POST', '/api/auth/login', body={'username': 'demo_courier', 'password': 'TzirRiderSpeed!77'})
courier_token = courier.get('access_token', 'FAILED')
print(f'=== COURIER LOGIN: token_len={len(courier_token)} ===')

# Courier accept
accept = curl('POST', f'/api/orders/{order_id}/accept', token=courier_token)
print(f'=== ACCEPT RESULT: {json.dumps(accept, ensure_ascii=False)} ===')

# Courier complete (with demo bypass)
complete = curl('POST', f'/api/orders/{order_id}/complete', token=courier_token,
                body={'demo_bypass': True, 'signature': 'demo_ok', 'notes': 'Verified by Antigravity'})
print(f'=== COMPLETE RESULT: {json.dumps(complete, ensure_ascii=False)} ===')

# Final order status
status = curl('GET', f'/api/orders/{order_id}', token=cust_token)
print(f'=== FINAL STATUS: {status.get("status", status)} ===')

# Courier earnings
earnings = curl('GET', '/api/courier/earnings', token=courier_token)
print(f'=== COURIER EARNINGS: {json.dumps(earnings, ensure_ascii=False)} ===')

# Customer history
history = curl('GET', '/api/orders/history', token=cust_token)
orders = history.get('data', history.get('orders', []))
print(f'=== CUSTOMER HISTORY: {len(orders)} orders ===')
if orders:
    print(f'    Latest: id={orders[0].get("id")}, status={orders[0].get("status")}')
