import subprocess, json, sys

base = 'http://localhost:5000'

# Customer login
r = subprocess.run(['curl.exe','-s','-X','POST', base+'/api/auth/login',
    '-H','Content-Type: application/json',
    '-d','{"username":"demo_client","password":"TzirClient2026!"}'],
    capture_output=True, text=True)
cust = json.loads(r.stdout)
cust_token = cust.get('access_token','FAILED')
print('CUST_TOKEN_LEN:', len(cust_token))

# Create order
order_body = json.dumps({
    "sender":{"name":"Demo Customer","phone":"0503333333","address":"Rothschild 1, Tel Aviv","latitude":32.0628,"longitude":34.7691},
    "recipient":{"name":"Recipient","phone":"0504444444","address":"Herzl 12, Tel Aviv","latitude":32.0600,"longitude":34.7700},
    "package":{"content":"Test Package","weight":"1"},
    "service":{"type":"standard","urgency":"standard"}
})
r2 = subprocess.run(['curl.exe','-s','-X','POST', base+'/api/orders',
    '-H','Content-Type: application/json',
    '-H','Authorization: Bearer '+cust_token,
    '-d', order_body],
    capture_output=True, text=True)
print('CREATE ORDER RESPONSE:', r2.stdout)
order = json.loads(r2.stdout)
order_id = order.get('order_id') or order.get('id','FAILED')
print('ORDER_ID:', order_id)

# Save to file for next step  
with open('e2e_state.json','w') as f:
    json.dump({'cust_token': cust_token, 'order_id': order_id}, f)
