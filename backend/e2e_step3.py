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
        return {'raw': r.stdout[:500]}

# Load state
with open('e2e_state.json') as f:
    state = json.load(f)
cust_token = state['cust_token']
order_id = state['order_id']
print(f'=== Starting with order_id={order_id} ===')

# Courier login
courier_resp = curl('POST', '/api/auth/login', body={'username': 'demo_courier', 'password': 'TzirRiderSpeed!77'})
courier_token = courier_resp.get('access_token', 'FAILED')
print(f'=== COURIER LOGIN: token_len={len(courier_token)}, user={courier_resp.get("user", {}).get("username")} ===')

# Accept order
accept = curl('POST', f'/api/couriers/orders/{order_id}/accept', token=courier_token)
print(f'=== ACCEPT: {json.dumps(accept, ensure_ascii=False)} ===')

# Update status: picked_up
pu = curl('POST', f'/api/couriers/orders/{order_id}/status', token=courier_token, body={'status': 'picked_up'})
print(f'=== PICKED_UP: {json.dumps(pu, ensure_ascii=False)} ===')

# Update status: delivered (completes delivery)
done = curl('POST', f'/api/couriers/orders/{order_id}/status', token=courier_token, body={
    'status': 'delivered',
    'pod_signature': None,
    'notes': 'Demo delivery by Antigravity'
})
print(f'=== DELIVERED: {json.dumps(done, ensure_ascii=False)} ===')

# Get final order status (via customer token)
final = curl('GET', f'/api/orders/{order_id}', token=cust_token)
print(f'=== FINAL ORDER STATUS: {final.get("status", final)} ===')

# Courier stats / earnings
stats = curl('GET', '/api/couriers/stats', token=courier_token)
print(f'=== COURIER STATS: totalDeliveries={stats.get("totalDeliveries")}, todayEarnings={stats.get("todayEarnings")}, weeklyEarnings={stats.get("weeklyEarnings")} ===')

# Customer order history
history = curl('GET', '/api/orders/customer', token=cust_token)
orders = history if isinstance(history, list) else history.get('data', history.get('orders', []))
print(f'=== CUSTOMER HISTORY: {len(orders) if isinstance(orders, list) else "n/a"} orders in response ===')
if isinstance(orders, list) and orders:
    for o in orders[:3]:
        print(f'    Order id={o.get("id")}, status={o.get("status")}, order_number={o.get("order_number")}')
