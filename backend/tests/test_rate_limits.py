"""Global rate-limit tests: composite per-user/per-IP keying, 429 shape, headers.

See docs/SECURITY_RATE_LIMIT_BOLA_PLAN.md (task 1). Uses isolated apps so the
shared session fixture and its counters are untouched.
"""

import os
import time
from pathlib import Path

import pytest

SESSION_DIR = Path(__file__).parent


def _fresh_app(name):
    test_db = SESSION_DIR / f"{name}.db"
    if test_db.exists():
        test_db.unlink()
    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db.as_posix()}"
    os.environ["DISABLE_SCHEDULER"] = "1"
    from app import create_app
    flask_app = create_app()
    flask_app.config.update(TESTING=True)
    return flask_app, test_db


def _teardown(app, test_db):
    try:
        from extensions import db
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
    except Exception:
        pass
    test_db.unlink(missing_ok=True)


def test_composite_key_user_and_ip_are_distinct(app):
    """Anonymous traffic is keyed by IP; authenticated traffic by user id."""
    from utils.rate_limits import rate_limit_key
    from models import db, User
    with app.test_request_context("/api/health"):
        anon = rate_limit_key()
        assert anon.startswith("ip:")
    username = f"rl_composite_{int(time.time())}"
    with app.app_context():
        u = User(username=username, email=f"{username}@test.com",
                 phone="0500000000", user_type="courier")
        u.password_hash = "not-used"
        db.session.add(u)
        db.session.commit()
        token_src = u.id
    from flask_jwt_extended import create_access_token
    token = create_access_token(identity=str(token_src))
    with app.test_request_context(
        "/api/courier/forms", headers={"Authorization": f"Bearer {token}"}
    ):
        user = rate_limit_key()
        assert user.startswith("user:")
    assert user != anon


def test_anonymous_ip_gets_429_from_explicit_limit():
    """Explicit per-IP limit returns 429 once exhausted, with JSON error shape."""
    from extensions import limiter
    app, test_db = _fresh_app("test_rl_ip")

    @app.route("/api/_rl_probe_ip")
    @limiter.limit("2 per minute")
    def rl_probe_ip():
        return {"ok": True}

    client = app.test_client()
    assert client.get("/api/_rl_probe_ip").status_code == 200
    assert client.get("/api/_rl_probe_ip").status_code == 200
    third = client.get("/api/_rl_probe_ip")
    assert third.status_code == 429
    body = third.get_json()
    assert body["error"] == "RATE_LIMIT"
    assert "Retry-After" in third.headers
    _teardown(app, test_db)


def test_health_endpoint_exempt_from_rate_limits(app):
    """/api/health is exempt and must never 429 even under pressure."""
    client = app.test_client()
    for _ in range(30):
        assert client.get("/api/health").status_code == 200


def test_registration_is_per_ip_per_hour():
    """register (10/hour per key) stays open for a second anonymous key."""
    from extensions import limiter
    limiter.reset()  # clear counters from the shared in-memory store
    app, test_db = _fresh_app("test_rl_register")
    client = app.test_client()
    for _ in range(10):
        client.post(
            "/api/auth/register",
            json={
                "email": f"u{time.time()}{_}@test.com",
                "password": "StrongPass123!",
                "user_type": "courier",
            },
        )
    # The 11th request must trip the 10/hour limit → 429.
    r = client.post(
        "/api/auth/register",
        json={
            "email": f"v{time.time()}@test.com",
            "password": "StrongPass123!",
            "user_type": "courier",
        },
    )
    assert r.status_code == 429, f"register should be rate-limited, got {r.status_code}"
    _teardown(app, test_db)


def test_auth_refresh_has_burst_limit():
    """Refresh endpoint is protected by an explicit burst limit (20/min)."""
    from extensions import limiter
    limiter.reset()
    app, test_db = _fresh_app("test_rl_refresh")
    client = app.test_client()
    login = client.post(
        "/api/auth/login",
        json={"username": "demo_courier", "password": "demo_courier2026!"},
    )
    assert login.status_code == 200
    refresh = login.get_json()["refresh_token"]
    statuses = []
    for _ in range(22):
        r = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {refresh}"},
        )
        statuses.append(r.status_code)
    assert 429 in statuses, f"refresh never rate-limited: {statuses[:5]}..."
    _teardown(app, test_db)
