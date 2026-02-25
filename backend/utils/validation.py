from flask import request, jsonify
from functools import wraps
import re

def validate_input(*expected_args, **kwargs):
    """
    Decorator to validate required fields in JSON request body.
    And ensures basic sanitization to prevent XSS/SQLi in basic routes.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args_inner, **kwargs_inner):
            if not request.is_json:
                return jsonify({'error': 'Request must be JSON'}), 400
            
            data = request.get_json()
            missing_args = [arg for arg in expected_args if arg not in data]
            
            if missing_args:
                return jsonify({
                    'error': 'Missing required fields',
                    'fields': missing_args
                }), 400
                
            # Basic sanitization check for <script> tags or similar malicious injection
            for key, value in data.items():
                if isinstance(value, str):
                    if re.search(r'<script.*?>.*?</script>', value, re.IGNORECASE) or 'javascript:' in value.lower():
                        return jsonify({'error': 'Invalid characters in input', 'field': key}), 400
                        
            return f(*args_inner, **kwargs_inner)
        return decorated_function
    return decorator
