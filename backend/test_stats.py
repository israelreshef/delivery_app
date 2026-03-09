
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app import create_app
from models import db, Courier, User
from flask import json

app = create_app()
with app.app_context():
    from routes.stats import get_dashboard_stats
    # We need a dummy user that is an admin
    admin_user = User.query.filter_by(user_type='admin').first()
    if not admin_user:
        print("No admin user found to test stats!")
    else:
        # Mock request context if needed, but get_dashboard_stats takes current_user
        try:
            response, status_code = get_dashboard_stats(admin_user)
            print(f"Status Code: {status_code}")
            print(f"Response Data: {response.get_json()}")
        except Exception as e:
            print(f"Error calling get_dashboard_stats: {e}")
            import traceback
            traceback.print_exc()
