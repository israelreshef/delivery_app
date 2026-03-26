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
