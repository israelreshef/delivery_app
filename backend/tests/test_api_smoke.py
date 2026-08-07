def test_health_check_returns_healthy(client):
    response = client.get("/api/health")
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "tzir-backend"


def test_api_security_headers_are_present(client):
    response = client.get("/api/health")
    assert response.status_code == 200

    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") in {"DENY", "SAMEORIGIN"}
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert "no-store" in response.headers.get("Cache-Control", "")
    assert response.headers.get("Pragma") == "no-cache"


def test_protected_endpoint_requires_token(client):
    response = client.get("/api/privacy/export")
    assert response.status_code == 401

    payload = response.get_json()
    assert "token" in payload.get("message", "").lower()


def test_login_returns_access_token_and_user(client, courier_credentials):
    response = client.post("/api/auth/login", json=courier_credentials)
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["success"] is True
    assert payload.get("access_token")
    assert payload.get("refresh_token")
    assert payload["user"]["user_type"] == "courier"


def test_cors_allows_known_origin_and_blocks_unknown_origin(client):
    allowed = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert allowed.status_code == 200
    assert allowed.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"

    denied = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert denied.status_code == 200
    assert denied.headers.get("Access-Control-Allow-Origin") in (None, "")


def test_global_default_limits_are_configured():
    """Un-decorated endpoints must be covered by default limits.

    Pins the production intent in extensions.py: every endpoint without an
    explicit @limiter.limit decorator is protected by the global day/hour
    ceilings. Reads our own config file (stable) instead of library internals.
    """
    from pathlib import Path

    src = Path(__file__).resolve().parents[1] / "extensions.py"
    content = src.read_text(encoding="utf-8")

    assert "default_limits" in content, "Limiter default_limits not configured"
    assert "per day" in content, "Global per-day default limit missing"
    assert "per hour" in content, "Global per-hour default limit missing"


def test_rate_limiter_enforces_429_on_explicit_limit():
    """Functional proof that a decorated route returns 429 once exhausted.

    Uses an isolated app so the shared session fixture is untouched.
    """
    import os
    from pathlib import Path

    test_db = Path(__file__).parent / "test_rl_probe.db"
    if test_db.exists():
        test_db.unlink()

    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db.as_posix()}"
    os.environ["DISABLE_SCHEDULER"] = "1"

    from app import create_app
    from extensions import limiter

    flask_app = create_app()

    @flask_app.route("/api/_rl_probe")
    @limiter.limit("2 per minute")
    def rl_probe():
        return {"ok": True}

    client = flask_app.test_client()
    assert client.get("/api/_rl_probe").status_code == 200
    assert client.get("/api/_rl_probe").status_code == 200
    assert client.get("/api/_rl_probe").status_code == 429

    try:
        from extensions import db
        with flask_app.app_context():
            db.session.remove()
            db.engine.dispose()
    except Exception:
        pass

    if test_db.exists():
        test_db.unlink(missing_ok=True)
