from models import User


def test_privacy_export_is_authenticated_and_minimized(client, courier_auth_headers):
    response = client.get("/api/privacy/export", headers=courier_auth_headers)
    assert response.status_code == 200

    payload = response.get_json()
    assert "username" in payload
    assert "email" in payload
    assert "role" in payload
    assert "created_at" in payload

    # Sensitive fields should never be exposed in GDPR/Privacy export API.
    assert "password_hash" not in payload
    assert "mfa_recovery_code" not in payload
    assert "totp_secret" not in payload


def test_privacy_consent_is_persisted(app, client, courier_auth_headers):
    response = client.post("/api/privacy/consent", headers=courier_auth_headers)
    assert response.status_code == 200

    with app.app_context():
        user = User.query.filter_by(username="demo_courier").first()
        assert user is not None
        assert user.privacy_policy_accepted_at is not None


def test_role_based_access_enforced_for_admin_route(client, courier_auth_headers, admin_auth_headers):
    courier_response = client.get("/api/admin/dashboard", headers=courier_auth_headers)
    assert courier_response.status_code == 403

    admin_response = client.get("/api/admin/dashboard", headers=admin_auth_headers)
    assert admin_response.status_code == 200
