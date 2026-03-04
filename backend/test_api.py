import json
import traceback
from app import create_app
from models import User
from flask_jwt_extended import create_access_token

app = create_app()
app.config['TESTING'] = True
app.config['PROPAGATE_EXCEPTIONS'] = True

with app.app_context():
    admin = User.query.filter_by(email='admin@tzir.com').first()
    token = create_access_token(identity=str(admin.id))
    client = app.test_client()
    try:
        res = client.get('/api/customers/3/related', headers={'Authorization': f'Bearer {token}'})
    except Exception as e:
        with open('err.txt', 'w', encoding='utf-8') as f:
            traceback.print_exc(file=f)
