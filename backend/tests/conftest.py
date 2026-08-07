import os
from pathlib import Path

import pytest


@pytest.fixture(scope="session")
def app():
    # Dedicated test environment to avoid touching development/production data.
    test_db_path = Path(__file__).parent / "test_suite.db"
    if test_db_path.exists():
        test_db_path.unlink()

    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path.as_posix()}"
    os.environ["DISABLE_SCHEDULER"] = "1"

    from app import create_app

    flask_app = create_app()
    flask_app.config.update(TESTING=True)
    yield flask_app

    try:
        from extensions import db
        with flask_app.app_context():
            db.session.remove()
            db.engine.dispose()
    except Exception:
        pass

    if test_db_path.exists():
        test_db_path.unlink(missing_ok=True)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(scope="session")
def courier_credentials():
    return {
        "username": "demo_courier",
        "password": "demo_courier2026!",
    }


@pytest.fixture(scope="session")
def admin_credentials():
    return {
        "username": "super_admin",
        "password": "super_admin2026!",
    }


@pytest.fixture(scope="session")
def courier_login_payload(app, courier_credentials):
    with app.test_client() as client:
        response = client.post("/api/auth/login", json=courier_credentials)
        assert response.status_code == 200, response.get_json()
        payload = response.get_json()
        assert payload.get("access_token"), payload
        return payload


@pytest.fixture(scope="session")
def admin_login_payload(app, admin_credentials):
    with app.test_client() as client:
        response = client.post("/api/auth/login", json=admin_credentials)
        assert response.status_code == 200, response.get_json()
        payload = response.get_json()
        assert payload.get("access_token"), payload
        return payload


@pytest.fixture(scope="session")
def courier_token(courier_login_payload):
    return courier_login_payload["access_token"]


@pytest.fixture(scope="session")
def admin_token(admin_login_payload):
    return admin_login_payload["access_token"]


@pytest.fixture
def courier_auth_headers(courier_token):
    return {"Authorization": f"Bearer {courier_token}"}


@pytest.fixture
def admin_auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
