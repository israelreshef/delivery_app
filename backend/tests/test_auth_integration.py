"""Auth integration tests: login edge cases, token refresh, registration validation."""

import datetime


class TestLoginValidation:
    def test_login_missing_credentials_returns_400(self, client):
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 400
        payload = response.get_json()
        assert payload["success"] is False

    def test_login_missing_password_returns_400(self, client):
        response = client.post("/api/auth/login", json={"username": "test"})
        assert response.status_code == 400

    def test_login_invalid_email_format_returns_400(self, client):
        response = client.post("/api/auth/login", json={
            "email": "invalid@ email",
            "password": "somepass"
        })
        assert response.status_code == 400
        assert "Invalid email format" in response.get_json().get("error", "")

    def test_login_wrong_password_returns_401(self, client, courier_credentials):
        response = client.post("/api/auth/login", json={
            "username": courier_credentials["username"],
            "password": "wrong_password_12345"
        })
        assert response.status_code == 401
        assert response.get_json()["success"] is False

    def test_login_nonexistent_user_returns_401(self, client):
        response = client.post("/api/auth/login", json={
            "username": "this_user_does_not_exist_99999",
            "password": "whatever123"
        })
        assert response.status_code == 401
        assert response.get_json()["success"] is False


class TestLoginSuccess:
    def test_login_with_username_returns_tokens(self, client, courier_credentials):
        response = client.post("/api/auth/login", json={
            "username": courier_credentials["username"],
            "password": courier_credentials["password"]
        })
        assert response.status_code == 200
        payload = response.get_json()
        assert payload["success"] is True
        assert payload.get("access_token")
        assert payload.get("refresh_token")
        assert payload["user"]["user_type"] == "courier"

    def test_login_with_email_field_returns_tokens(self, client, courier_credentials):
        response = client.post("/api/auth/login", json={
            "email": courier_credentials["username"],
            "password": courier_credentials["password"]
        })
        assert response.status_code == 200
        payload = response.get_json()
        assert payload["success"] is True
        assert payload.get("access_token")

    def test_login_returns_user_data_with_courier_id(self, client, courier_credentials):
        response = client.post("/api/auth/login", json=courier_credentials)
        assert response.status_code == 200
        payload = response.get_json()
        user = payload["user"]
        assert user["user_type"] == "courier"
        assert user.get("courier_id")
        assert user.get("full_name")

    def test_login_success_resets_failed_attempts(self, client, courier_credentials):
        for _ in range(3):
            client.post("/api/auth/login", json={
                "username": courier_credentials["username"],
                "password": "wrong_attempt"
            })
        resp = client.post("/api/auth/login", json=courier_credentials)
        assert resp.status_code == 200


class TestTokenRefresh:
    def test_refresh_with_valid_token_returns_new_tokens(self, app, client):
        from models import User, Courier
        from extensions import db
        test_user = User(
            username="refresh_test_user",
            email="refresh_test@example.com",
            phone="050-0000000",
            user_type="courier",
            is_active=True
        )
        test_user.set_password("Password123!")
        db.session.add(test_user)
        db.session.flush()
        db.session.add(Courier(user_id=test_user.id, full_name="Refresh Test", vehicle_type="scooter"))
        db.session.commit()

        login_resp = client.post("/api/auth/login", json={
            "username": "refresh_test_user",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        refresh_token = login_resp.get_json()["refresh_token"]

        response = client.post("/api/auth/refresh", headers={
            "Authorization": f"Bearer {refresh_token}"
        })
        assert response.status_code == 200
        payload = response.get_json()
        assert payload.get("access_token")
        assert payload.get("refresh_token")

    def test_refresh_with_access_token_rejected(self, client, courier_login_payload):
        access_token = courier_login_payload["access_token"]
        response = client.post("/api/auth/refresh", headers={
            "Authorization": f"Bearer {access_token}"
        })
        assert response.status_code == 401

    def test_refresh_without_token_returns_401(self, client):
        response = client.post("/api/auth/refresh")
        assert response.status_code == 401

    def test_refresh_rotation_blacklists_old_token(self, app, client):
        from models import User
        from extensions import db
        test_user = User(
            username="rotation_test_user",
            email="rotation_test@example.com",
            phone="050-0000001",
            user_type="courier",
            is_active=True
        )
        test_user.set_password("Password123!")
        db.session.add(test_user)
        db.session.commit()

        login_resp = client.post("/api/auth/login", json={
            "username": "rotation_test_user",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        old_refresh = login_resp.get_json()["refresh_token"]

        resp1 = client.post("/api/auth/refresh", headers={
            "Authorization": f"Bearer {old_refresh}"
        })
        assert resp1.status_code == 200

        resp2 = client.post("/api/auth/refresh", headers={
            "Authorization": f"Bearer {old_refresh}"
        })
        assert resp2.status_code == 401


class TestRegisterValidation:
    REGISTER_PAYLOAD = {
        "email": "new_test_user@example.com",
        "password": "StrongPass123!",
        "user_type": "courier",
        "full_name": "Test Courier",
        "vehicle_type": "scooter",
        "license_plate": "12-345-67"
    }

    def test_register_missing_field_returns_400(self, client):
        response = client.post("/api/auth/register", json={
            "email": "test@example.com"
        })
        assert response.status_code == 400

    def test_register_invalid_email_returns_400(self, client):
        payload = {**self.REGISTER_PAYLOAD, "email": "bad-email"}
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 400

    def test_register_weak_password_returns_400(self, client):
        payload = {**self.REGISTER_PAYLOAD, "password": "123"}
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 400

    def test_register_invalid_user_type_returns_400(self, client):
        payload = {**self.REGISTER_PAYLOAD, "user_type": "admin"}
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 400

    def test_register_duplicate_email_returns_400(self, app, client):
        from models import User
        from extensions import db
        existing = User(
            username="dup_email_user",
            email="duplicate@example.com",
            phone="050-0000002",
            user_type="customer",
            is_active=True
        )
        existing.set_password("Password123!")
        db.session.add(existing)
        db.session.commit()

        response = client.post("/api/auth/register", json={
            **self.REGISTER_PAYLOAD,
            "email": "duplicate@example.com"
        })
        assert response.status_code == 400
        assert "already exists" in response.get_json().get("error", "").lower()

    def test_register_success_creates_user(self, app, client):
        import random
        suffix = random.randint(10000, 99999)
        response = client.post("/api/auth/register", json={
            **self.REGISTER_PAYLOAD,
            "email": f"fresh_user_{suffix}@example.com",
            "username": f"fresh_user_{suffix}"
        })
        assert response.status_code == 201, response.get_json()
        payload = response.get_json()
        assert payload.get("success") is True
        assert payload.get("user_id")


class TestAccountLockout:
    def test_repeated_failures_eventually_lock_account(self, client, courier_credentials):
        for i in range(11):
            resp = client.post("/api/auth/login", json={
                "username": courier_credentials["username"],
                "password": f"wrong_password_{i}"
            })
        assert resp.status_code == 403
        assert "locked" in resp.get_json().get("error", "").lower()

    def test_correct_password_after_lockout_is_rejected(self, app, client, courier_credentials):
        from models import User, db
        user = User.query.filter_by(username=courier_credentials["username"]).first()
        user.failed_login_attempts = 10
        user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        db.session.commit()

        resp = client.post("/api/auth/login", json=courier_credentials)
        assert resp.status_code == 403
        assert "locked" in resp.get_json().get("error", "").lower()
