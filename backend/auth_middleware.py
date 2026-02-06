from functools import wraps
from flask import request, jsonify
from models import ApiKey
from datetime import datetime
from werkzeug.security import check_password_hash
from extensions import db

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key_header = request.headers.get('X-API-KEY')
        
        if not api_key_header:
            return jsonify({'message': 'Missing API Key'}), 401
            
        # Format expected: prefix.secret
        if '.' not in api_key_header:
             return jsonify({'message': 'Invalid API Key format'}), 401
             
        prefix, secret = api_key_header.split('.', 1)
        
        # 1. Find key by prefix
        api_key_record = ApiKey.query.filter_by(prefix=prefix).first()
        
        if not api_key_record:
            return jsonify({'message': 'Invalid API Key'}), 401
            
        # 2. Verify hash
        if not check_password_hash(api_key_record.key_hash, secret):
            return jsonify({'message': 'Invalid API Key'}), 401
            
        # 3. Update usage stats
        api_key_record.last_used_at = datetime.utcnow()
        db.session.commit()
        
        return f(*args, **kwargs)
    return decorated_function
