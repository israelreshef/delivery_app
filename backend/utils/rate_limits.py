"""Global rate-limit tiers and a composite (user + IP) key function.

Design (see docs/SECURITY_RATE_LIMIT_BOLA_PLAN.md, task 1):
  * Authenticated requests are keyed by user id -> "user:<id>" so a single
    account cannot bypass IP limits by rotating addresses.
  * Anonymous requests are keyed by IP -> "ip:<addr>".
  * Tier constants are used as @limiter.limit(...) strings across routes.
"""

import logging

logger = logging.getLogger(__name__)

# --- Tiers -------------------------------------------------------------
# Tier 1: sensitive credential / MFA endpoints (strict)
TIER1_LIMITS = ["5 per minute", "20 per hour"]
# Tier 2: write operations (POST/PUT/PATCH/DELETE)
TIER2_WRITE_LIMITS = ["60 per minute", "500 per hour"]
# Tier 3: read-heavy operations
TIER3_READ_LIMITS = ["300 per minute", "10000 per day"]


def current_app_trusts_proxy():
    from flask import current_app
    return bool(current_app.config.get("TRUST_PROXY", False))


def _request_ip():
    from flask import request
    if current_app_trusts_proxy():
        fwd = request.headers.get("X-Forwarded-For")
        if fwd:
            return fwd.split(",")[0].strip()
    return getattr(request, "remote_addr", None) or "unknown"


def _user_key():
    """Best-effort JWT identity. Never raises for anonymous traffic."""
    try:
        # Optional verify so get_jwt_identity() has a context even when the
        # limiter's before_request runs before set_db_context does.
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return f"user:{identity}"
    except Exception:
        # Optional JWT verify runs before us via set_db_context; tolerate.
        logger.debug("Rate-limit key: no authenticated identity", exc_info=True)
    return None


def rate_limit_key():
    """Composite key: authenticated users by id, everyone else by IP."""
    return _user_key() or f"ip:{_request_ip()}"
