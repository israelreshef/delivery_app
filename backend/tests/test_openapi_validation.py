"""S3 tests: OpenAPI spec endpoint, API reference page, runtime schema
validation, JSON safety guard and the in-process WAF layer.

Most tests use isolated apps so shared fixtures (rate-limit counters, the
session DB) stay untouched. Register/login bodies are valid per the actual
route contracts so only *syntactic* rejection is under test here.
"""

import os
import time
from pathlib import Path

import pytest

SESSION_DIR = Path(__file__).parent


def _fresh_app(name, waf=False):
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
    flask_app.config.update(TESTING=True, SECURITY_WAF_ENABLED=waf)
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


# --------------------------------------------------------------------------- #
# OpenAPI spec                                                                #
# --------------------------------------------------------------------------- #

def test_openapi_spec_endpoint(app):
    client = app.test_client()
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    body = r.get_json()
    assert body["openapi"].startswith("3.0")
    assert body["info"]["title"]
    assert "/api/health" not in body["paths"]  # exempt infra endpoint excluded
    assert body["paths"], "expected at least one API path"
    assert "bearerAuth" in body["components"]["securitySchemes"]


def test_openapi_spec_raw_json_is_valid_json():
    """The raw document must parse with the stdlib JSON decoder."""
    import json
    app, test_db = _fresh_app("test_oa_parse")
    client = app.test_client()
    raw = client.get("/api/openapi.json").data.decode("utf-8")
    doc = json.loads(raw)  # raises on invalid JSON
    assert doc["openapi"].startswith("3.0")
    assert len(doc["paths"]) > 0
    _teardown(app, test_db)


def test_openapi_spec_documents_typed_contracts(app):
    """Logged-in endpoints advertise a typed request body (from the registry)."""
    client = app.test_client()
    spec = client.get("/api/openapi.json").get_json()
    login = spec["paths"]["/api/auth/login"]["post"]
    assert login["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith("LoginRequest")
    schedule = spec["paths"]["/api/courier/schedule"]["post"]
    assert "requestBody" in schedule
    # Every operation references the bearer scheme through components.
    assert "bearerAuth" in spec["components"]["securitySchemes"]


def test_api_docs_page():
    """/api/docs returns a CSP-friendly server-rendered HTML reference."""
    app, test_db = _fresh_app("test_oa_docs")
    client = app.test_client()
    r = client.get("/api/docs")
    assert r.status_code == 200
    assert r.content_type.startswith("text/html")
    assert "TZIR Delivery API" in r.data.decode("utf-8", "ignore")
    assert "/api/openapi.json" in r.data.decode("utf-8", "ignore")
    _teardown(app, test_db)


# --------------------------------------------------------------------------- #
# Runtime schema validation                                                   #
# --------------------------------------------------------------------------- #

def test_invalid_registration_rejected_400():
    app, test_db = _fresh_app("test_oa_reg_invalid")
    client = app.test_client()
    r = client.post("/api/auth/register", json={
        "email": "a@example.com",
        "password": "StrongPass123!",
        "user_type": "admin",  # not allowed
    })
    assert r.status_code == 400
    schema = r.get_json()
    assert schema["error"] == "VALIDATION_ERROR"
    assert any("user_type" in (d.get("loc") or []) for d in schema["details"]), str(schema)
    _teardown(app, test_db)


def test_valid_registration_still_passes():
    app, test_db = _fresh_app("test_oa_reg_valid")
    client = app.test_client()
    email = f"v{int(time.time()*1000)}@example.com"
    r = client.post("/api/auth/register", json={
        "email": email,
        "password": "StrongPass123!",
        "user_type": "courier",
    })
    assert r.status_code == 201, r.get_json()
    _teardown(app, test_db)


def test_login_missing_identifier_rejected_400():
    app, test_db = _fresh_app("test_oa_login")
    client = app.test_client()
    r = client.post("/api/auth/login", json={"password": "x" * 12})
    assert r.status_code == 400
    assert r.get_json()["error"] == "VALIDATION_ERROR"
    assert r.get_json()["success"] is False
    _teardown(app, test_db)


def test_valid_login_contract_passes():
    app, test_db = _fresh_app("test_oa_login_ok")
    client = app.test_client()
    r = client.post("/api/auth/login",
                    json={"username": "demo_courier", "password": "demo_courier2026!"})
    assert r.status_code == 200
    _teardown(app, test_db)


def test_deep_json_body_rejected():
    app, test_db = _fresh_app("test_oa_deep")
    client = app.test_client()
    deep = {"a": {}}
    node = deep["a"]
    for _ in range(80):
        node["b"] = {}
        node = node["b"]
    r = client.post("/api/auth/login", json=deep)
    assert r.status_code == 400
    assert r.get_json()["error"] == "PAYLOAD_REJECTED"
    _teardown(app, test_db)


def test_non_json_content_type_left_alone():
    """Multipart / form bodies must never be interpreted as JSON validation."""
    app, test_db = _fresh_app("test_oa_multipart")
    client = app.test_client()
    r = client.post("/api/auth/login",
                    data="x=1",
                    content_type="application/x-www-form-urlencoded")
    payload = r.get_json()
    # Guard must not have answered with a JSON schema rejection.
    assert payload is None or payload.get("error") != "VALIDATION_ERROR"
    _teardown(app, test_db)


# --------------------------------------------------------------------------- #
# In-process WAF                                                              #
# --------------------------------------------------------------------------- #

def test_waf_blocks_obvious_sqli_in_uri():
    app, test_db = _fresh_app("test_waf_uri", waf=True)
    client = app.test_client()
    r = client.get("/api/health?q=union%20select%201,2")
    assert r.status_code == 403
    assert "firewall" in r.get_json()["description"].lower()
    _teardown(app, test_db)


def test_waf_blocks_path_traversal():
    app, test_db = _fresh_app("test_waf_traversal", waf=True)
    client = app.test_client()
    r = client.get("/api/couriers/1?file=..%2F..%2Fetc%2Fpasswd")
    assert r.status_code == 403
    _teardown(app, test_db)


def test_waf_blocks_xss_in_uri():
    app, test_db = _fresh_app("test_waf_xss", waf=True)
    client = app.test_client()
    r = client.get("/api/health?q=%3Cscript%3Ealert(1)%3C/script%3E")
    assert r.status_code == 403
    _teardown(app, test_db)


def test_waf_blocks_sqli_in_json_body():
    app, test_db = _fresh_app("test_waf_body", waf=True)
    client = app.test_client()
    r = client.post("/api/auth/login", json={
        "username": "demo_courier",
        "password": "whatever",
        "note": "UNION SELECT password FROM users",  # scanned non-sensitive field
    })
    assert r.status_code == 403
    _teardown(app, test_db)


def test_waf_ignores_sensitive_fields():
    """Password/token fields are never scanned → normal logins still work."""
    app, test_db = _fresh_app("test_waf_sensitive", waf=True)
    client = app.test_client()
    r = client.post("/api/auth/login",
                    json={"username": "demo_courier",
                          "password": "demo_courier2026!",
                          "refresh_token": "UNION SELECT password FROM users"})
    assert r.status_code == 200
    _teardown(app, test_db)


def test_waf_off_when_not_enabled():
    app, test_db = _fresh_app("test_waf_off", waf=False)
    client = app.test_client()
    r = client.get("/api/health?q=union%20select%201,2")
    assert r.status_code == 200
    _teardown(app, test_db)


def test_waf_scan_helpers_are_deterministic():
    """Unit-level check of the scanning primitives (no app context needed)."""
    from utils.request_waf import scan_uri, scan_body, _sensitive
    assert scan_uri("/api/orders?q=union+select+1,2")
    assert not scan_uri("/api/health")
    assert scan_body({"desc": "select * from users"})
    assert not scan_body({"password": "select * from users"})
    assert _sensitive("refresh_token")
    assert not _sensitive("description")