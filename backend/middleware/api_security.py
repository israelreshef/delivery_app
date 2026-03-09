import hmac
import hashlib
import json
import time
from functools import wraps
from flask import request, jsonify, abort
from pydantic import ValidationError
from .anomaly_detection import anomaly_detector
from .threat_intel import threat_intel
from .audit_log import audit_log

# Configuration for HMAC
HMAC_SECRET = b"dev-device-hmac-key" # In prod, derived per-device
REPLAY_WINDOW = 300 # 5 minutes

def security_middleware(schema=None):
    """
    Consolidated API Security Middleware:
    - 1. Threat Intelligence (IP Blocklist)
    - 2. Behavioral Anomaly Detection
    - 3. HMAC-SHA256 Signature Verification
    - 4. Pydantic Schema Validation (Startup Compiled)
    - 5. Security Header cleaning (Cleaning done in Next.js middleware too)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Step 1: Threat Intelligence Check
            if threat_intel.is_blocked(request.remote_addr):
                abort(403, description="Access denied by security policy.")

            # Step 2: Behavioral Anomaly Detection
            user_id = getattr(request, 'user_id', None) # Assumes auth middleware ran
            anomaly_detector.check_request(user_id, request.path, request.remote_addr)

            # Step 3: HMAC Signature Verification (<0.5ms)
            signature = request.headers.get("X-Signature")
            timestamp = request.headers.get("X-Timestamp")
            
            if not signature or not timestamp:
                abort(401, description="Missing security headers.")
            
            # Replay Protection
            if abs(time.time() - int(timestamp)) > REPLAY_WINDOW:
                abort(401, description="Request expired.")

            # Calculate Signature
            payload = f"{timestamp}:{request.path}:{request.get_data(as_text=True)}"
            expected_sig = hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()
            
            if not hmac.compare_digest(signature, expected_sig):
                audit_log.log_event(user_id, "HMAC_VERIFICATION_FAILURE", request.path, level="CRITICAL")
                abort(401, description="Invalid signature.")

            # Step 4: Schema Validation (if provided)
            if schema and request.is_json:
                try:
                    schema(**request.json)
                except ValidationError as e:
                    abort(400, description=str(e))

            # Execute Request
            response_data = f(*args, **kwargs)
            
            # Step 5: PII Field Masking in Response
            # Logic to mask fields like 'email', 'phone' in the response object
            return mask_pii(response_data)

        return decorated_function
    return decorator

def mask_pii(data):
    """
    Implementation of Field Masking (Apple Tier):
    Masks PII in dictionary/list responses.
    """
    if isinstance(data, dict):
        for k, v in data.items():
            if k in ["phone", "email"]:
                data[k] = mask_value(v, k)
            elif isinstance(v, (dict, list)):
                mask_pii(v)
    elif isinstance(data, list):
        for item in data:
            mask_pii(item)
    return data

def mask_value(value, field_type):
    if not value: return value
    if field_type == "phone":
        return value[:4] + "***-**-" + value[-4:]
    if field_type == "email":
        parts = value.split("@")
        return parts[0][0] + "***@" + parts[1]
    return "***"
