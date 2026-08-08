import hmac
import hashlib
import time
from functools import wraps
from flask import current_app, request, abort
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# Consolidated API Security Middleware
#
#   1. Threat Intelligence (IP blocklist)   - consults utils.ip_blocker
#   2. Behavioral Anomaly Detection         - lightweight per-IP burst guard (opt-in)
#   3. HMAC-SHA256 Signature Verification   - config-gated; enforced only when
#                                            enabled OR when the client signs
#   4. Pydantic Schema Validation           - opt-in per route
#   5. PII Field Masking helper             - available for response sanitization
#
# Local dev behaviour (defaults):
#   - Clients do not send X-Signature yet, so HMAC is NOT enforced.
#   - The guard still drops IPs currently on the block list.
#   - Flip app.config['SECURITY_HMAC_ENFORCED'] = True (or send signature headers)
#     to enforce request signing.
# ---------------------------------------------------------------------------

# Fallback secret (dev only). In staging/prod set SECURITY_HMAC_SECRET env var.
DEFAULT_HMAC_SECRET = "dev-device-hmac-key"
REPLAY_WINDOW = 300  # 5 minutes

# Lightweight in-process anomaly guard (per-IP request bursts).
_anomaly_track = {}


def _hmac_secret():
    return current_app.config.get('SECURITY_HMAC_SECRET') or DEFAULT_HMAC_SECRET


def _hmac_enforced():
    return current_app.config.get('SECURITY_HMAC_ENFORCED', False)


def _anomaly_enabled():
    return current_app.config.get('SECURITY_ANOMALY_ENABLED', False)


def _is_blocked(ip):
    """Consult the shared block list maintained by utils.ip_blocker."""
    try:
        from utils.ip_blocker import blocked_ips
        return ip in blocked_ips and time.time() < blocked_ips[ip]
    except Exception:
        return False


def _check_anomaly(ip):
    """Simple per-IP burst guard. Returns True when the request is suspicious."""
    if not _anomaly_enabled():
        return False
    now = time.time()
    bucket = [t for t in _anomaly_track.get(ip, []) if now - t < 60]
    bucket.append(now)
    _anomaly_track[ip] = bucket
    # Endpoint-level limits are stricter; this only catches gross floods.
    return len(bucket) > 120


def _log_hmac_failure():
    try:
        from utils.audit import log_audit
        user_id = None
        try:
            from flask_jwt_extended import get_jwt_identity
            identity = get_jwt_identity()
            if identity:
                user_id = int(identity)
        except Exception:
            pass
        log_audit('HMAC_VERIFICATION_FAILURE', user_id=user_id,
                  resource_type='api', details=request.path, status='CRITICAL')
    except Exception:
        pass


def _waf_block_check():
    """In-process WAF layer (S3): blocks request when obvious attack artifacts
    are found in the URI / body / headers. Opt-in via SECURITY_WAF_ENABLED
    (default in production). Mirrors the edge WAF (nginx / AWS WAFv2)."""
    hits = []
    try:
        from utils.request_waf import waf_enabled, inspect_request
        if not waf_enabled():
            return None

        raw = request.get_data()
        body = None
        if raw:
            import json as _json
            try:
                body = _json.loads(raw)
            except Exception:
                # Non-JSON bodies (multipart, files) skip body inspection.
                body = None

        headers = {k: v for k, v in request.headers.items()
                   if k in ("User-Agent", "Referer", "X-Forwarded-For")}
        uri = (request.path + ("?" + request.query_string.decode("utf-8", "ignore") if request.query_string else ""))
        hits = inspect_request(uri, body, headers)
    except Exception:
        # Never let WAF failure take the API down — fail open.
        return None

    if not hits:
        return None

    from utils.audit import log_audit
    log_audit('WAF_BLOCK', user_id=_current_identity(),
              resource_type='api', details=f"{request.path} rules={hits}", status='CRITICAL')
    abort(403, description="Request blocked by Web Application Firewall.")


def _current_identity():
    try:
        from flask_jwt_extended import get_jwt_identity
        identity = get_jwt_identity()
        if identity:
            return int(identity)
    except Exception:
        pass
    return None


def _run_security_checks():
    """Shared checks: WAF + threat intelligence + anomaly + HMAC. Aborts on failure."""
    # 0. WAF (in-process): obvious injection artifacts → 403.
    _waf_block_check()

    # 1. Threat Intelligence: drop IPs already blocked by ip_blocker.
    if _is_blocked(request.remote_addr):
        abort(403, description="Access denied by security policy.")

    # 2. Behavioral Anomaly Detection (opt-in).
    if _check_anomaly(request.remote_addr):
        abort(429, description="Rate limit exceeded.")

    # 3. HMAC Signature Verification.
    signature = request.headers.get("X-Signature")
    timestamp = request.headers.get("X-Timestamp")

    if signature or timestamp:
        if not signature or not timestamp:
            abort(401, description="Missing security headers.")
        try:
            ts = int(timestamp)
        except (TypeError, ValueError):
            abort(401, description="Invalid timestamp.")

        # Replay Protection
        if abs(time.time() - ts) > REPLAY_WINDOW:
            abort(401, description="Request expired.")

        # Calculate expected signature
        payload = f"{timestamp}:{request.path}:{request.get_data(as_text=True)}"
        expected_sig = hmac.new(
            _hmac_secret().encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            _log_hmac_failure()
            abort(401, description="Invalid signature.")
    elif _hmac_enforced():
        abort(401, description="Missing security headers.")


def security_guard():
    """before_request-style guard for API routes. Non-breaking in local dev."""
    _run_security_checks()


def security_middleware(schema=None):
    """
    Route-level decorator: applies the shared security checks, then optional
    Pydantic schema validation and PII masking on the response.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            _run_security_checks()

            # 4. Schema Validation (if provided)
            if schema and request.is_json:
                try:
                    schema(**request.json)
                except ValidationError as e:
                    abort(400, description=str(e))

            # 5. PII Field Masking in response
            return mask_pii(f(*args, **kwargs))

        return decorated_function
    return decorator


def mask_pii(data):
    """
    Mask PII fields (phone/email) in dictionary/list responses.
    Non-dict/list payloads (Response objects, tuples) pass through untouched.
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
    if not value:
        return value
    if field_type == "phone":
        return value[:4] + "***-**-" + value[-4:]
    if field_type == "email":
        parts = value.split("@")
        return parts[0][0] + "***@" + parts[1]
    return "***"
