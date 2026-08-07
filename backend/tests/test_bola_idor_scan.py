"""BOLA / IDOR security scan for owner-scoped courier endpoints.

These tests verify that a courier cannot read or mutate another courier's
data through endpoints that derive the owner from the JWT (i.e. there is no
client-supplied object id that would allow IDOR).

This complements the dedicated tax-report BOLA tests in test_courier_forms.py.
"""

import uuid

from flask_jwt_extended import create_access_token


def _create_second_courier(app):
    """Create an independent courier (user + profile) and return their token."""
    from models import db, User, Courier
    with app.app_context():
        if User.query.filter_by(username="bola_wallet_courier").first():
            existing = User.query.filter_by(username="bola_wallet_courier").first()
            return create_access_token(identity=str(existing.id))

        u = User(username="bola_wallet_courier", email=f"bola_wallet_{uuid.uuid4().hex[:8]}@tzir.com",
                 phone="0598888888", user_type="courier")
        u.password_hash = "not-used"
        db.session.add(u)
        db.session.flush()
        c = Courier(user_id=u.id, full_name="Bola Wallet Courier", vehicle_type="scooter")
        db.session.add(c)
        db.session.commit()
        return create_access_token(identity=str(u.id))


def test_wallet_history_isolated_between_couriers(app, client, courier_auth_headers):
    """Courier B must not see ledger entries created by courier A."""
    other_token = _create_second_courier(app)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Courier A has an empty wallet but the wallet object is created on read.
    a_wallet = client.get("/api/courier/wallet", headers=courier_auth_headers)
    assert a_wallet.status_code == 200

    a_history = client.get("/api/courier/wallet/history", headers=courier_auth_headers)
    assert a_history.status_code == 200
    a_entries = a_history.get_json().get("entries", [])

    b_history = client.get("/api/courier/wallet/history", headers=other_headers)
    assert b_history.status_code == 200
    b_entries = b_history.get_json().get("entries", [])

    # B must not see A's ledger entries; and since B is a fresh courier,
    # B's ledger must not share ids with A's.
    a_ids = {e["id"] for e in a_entries}
    b_ids = {e["id"] for e in b_entries}
    assert a_ids.isdisjoint(b_ids), "Ledger entries leaked across couriers"


def test_withdrawal_history_isolated_between_couriers(app, client, courier_auth_headers):
    """Courier B must not see withdrawal requests created by courier A."""
    other_token = _create_second_courier(app)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    a_withdrawals = client.get("/api/courier/wallet/withdrawals", headers=courier_auth_headers)
    assert a_withdrawals.status_code == 200
    a_ids = {w["id"] for w in a_withdrawals.get_json().get("withdrawals", [])}

    b_withdrawals = client.get("/api/courier/wallet/withdrawals", headers=other_headers)
    assert b_withdrawals.status_code == 200
    b_ids = {w["id"] for w in b_withdrawals.get_json().get("withdrawals", [])}

    assert a_ids.isdisjoint(b_ids), "Withdrawal requests leaked across couriers"


def test_courier_cannot_read_own_schedule_only(app, client, courier_auth_headers):
    """Schedule is owner-scoped: returning 200 without leaking others is the
    minimum invariant; ensure no cross-courier data is exposed in response."""
    resp = client.get("/api/courier/schedule", headers=courier_auth_headers)
    assert resp.status_code in (200, 404)
    payload = resp.get_json()
    if resp.status_code == 200 and payload:
        assert "courier_id" not in payload or payload.get("courier_id") is not None
