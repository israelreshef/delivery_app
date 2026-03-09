from app import create_app, db
from models import User, Invoice, Expense
from datetime import datetime

print("Starting E2E Excel Test...")
app = create_app()

with app.app_context():
    # 1. Test Excel Endpoint
    print("Testing /api/reports/regulatory logic...")
    # Import the actual handler map
    from routes.reports import export_regulatory_excel
    
    from flask_jwt_extended import create_access_token
    
    # We will simulate a request object
    from flask import Request
    
    current_user = User.query.filter_by(username='super_admin').first()
    if not current_user:
        print("Super admin not found, test aborted.")
        exit(1)
        
    access_token = create_access_token(identity=current_user.id)
    headers = {'Authorization': f'Bearer {access_token}'}
    
    # Just call it within a test request context
    with app.test_request_context('/api/reports/regulatory?start_date=2026-01-01&end_date=2026-12-31', headers=headers):
        try:
            response = export_regulatory_excel()
            if response.status_code == 200:
                print(" Excel Regulatory Report generated successfully.")
                print("Content-Type:", response.headers.get('Content-Type'))
            else:
                print(" Failed:", response.get_json())
        except Exception as e:
            print(" Exception during excel:", str(e))
    
    # 2. Test Traffic Endpoint
    print("Testing /api/legal/traffic...")
    from routes.legal import manage_traffic_scores
    with app.test_request_context('/api/legal/traffic', method='GET', headers=headers):
        try:
            res = manage_traffic_scores()
            print(" Traffic Records:", res[0].get_json() if isinstance(res, tuple) else res.get_json())
        except Exception as e:
            print(" Exception during traffic:", str(e))

    # 3. Test Cases Endpoint
    print("Testing /api/legal/cases...")
    from routes.legal import manage_legal_cases
    with app.test_request_context('/api/legal/cases', method='GET', headers=headers):
        try:
            res = manage_legal_cases()
            print(" Legal Cases:", res[0].get_json() if isinstance(res, tuple) else res.get_json())
        except Exception as e:
            print(" Exception during cases:", str(e))

print("E2E Test Complete.")
