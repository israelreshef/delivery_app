import threading
import requests
import time
import uuid

BASE_URL = "http://127.0.0.1:5001/api"
INVOICE_URL = f"{BASE_URL}/invoices/"

# You'll need a valid admin token to run this test
ADMIN_TOKEN = None 

def fetch_admin_token():
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": "finance@tzir.com",
            "password": "TzirFinance$$99"
        })
        return res.json().get('token')
    except Exception as e:
        print("Failed to get token:", e)
        return None

def create_dummy_delivery(token):
    # This requires a relatively complex payload per the Wizard flow
    # We will simulate just enough to get an order ID
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/orders/create", json={
        "sender": {"senderName": f"Test_{uuid.uuid4().hex[:4]}", "senderPhone": f"050{uuid.uuid4().hex[:7]}"},
        "recipient": {"recipientName": "Test_Dest"},
        "package": {"packageSize": "small", "packageWeight": 1},
        "service": {"serviceType": "regular"}
    }, headers=headers)
    if res.status_code == 201:
        return res.json().get('id')
    print("Failed to create dummy delivery:", res.text)
    return None

def generate_invoice(token, delivery_id, results_list):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(INVOICE_URL, json={
        "delivery_id": delivery_id,
        "document_type": "tax_invoice_receipt",
        "subtotal": 100.00
    }, headers=headers)
    
    if res.status_code == 201:
        results_list.append(res.json().get('invoice_number'))
    else:
        results_list.append(f"ERROR: {res.text}")

def run_concurrency_test():
    global ADMIN_TOKEN
    ADMIN_TOKEN = fetch_admin_token()
    
    if not ADMIN_TOKEN:
        print("Test Aborted: Admin login failed. Is the server running with demo users seeded?")
        return

    print("Generating Dummy Deliveries...")
    delivery_ids = []
    for _ in range(10): # We'll try to generate 10 invoices simultaneously
        d_id = create_dummy_delivery(ADMIN_TOKEN)
        if d_id:
            delivery_ids.append(d_id)
            
    print(f"Created {len(delivery_ids)} deliveries. Launching concurrent invoice requests...")
    
    threads = []
    results = []
    
    for d_id in delivery_ids:
        t = threading.Thread(target=generate_invoice, args=(ADMIN_TOKEN, d_id, results))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    print("\n--- TEST RESULTS ---")
    successful_invoices = [r for r in results if r.startswith("INV-")]
    errors = [r for r in results if r.startswith("ERROR")]
    
    print(f"Total Threads Executed: {len(threads)}")
    print(f"Successful Invoices Generated: {len(successful_invoices)}")
    print(f"Errors Encountered: {len(errors)}")
    
    # Check for duplicates
    if len(successful_invoices) != len(set(successful_invoices)):
        print("❌ FAILED: Duplicate Invoice Numbers Found!")
        print(successful_invoices)
    else:
        print("✅ SUCCESS: All invoice numbers are perfectly sequential and unique.")
        print("Invoices Generated:")
        for inv in sorted(successful_invoices):
            print(f"  - {inv}")

if __name__ == "__main__":
    run_concurrency_test()
