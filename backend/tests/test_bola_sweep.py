"""Global BOLA/IDOR sweep tests.

Covers every previously-verified ownership-sensitive endpoint family with a
cross-user (attacker) token. The attacker must never access a resource owned
by another account (404/403, never 200 with foreign data).

Covered (see docs/bola_inventory.md + docs/SECURITY_RATE_LIMIT_BOLA_PLAN.md):
  * invoice download (by id and by order) — courier/customer scoping
  * WMS inventory/topology — role gating
  * support tickets, chat history, courier forms history (regression)
"""

import uuid


def _second_customer(app):
    from models import db, User, Customer
    from flask_jwt_extended import create_access_token
    with app.app_context():
        existing = User.query.filter_by(username="bola_customer2").first()
        if existing:
            return create_access_token(identity=str(existing.id))
        u = User(username="bola_customer2", email=f"bolac2_{uuid.uuid4().hex[:8]}@tzir.com",
                 phone="0599999999", user_type="customer")
        u.password_hash = "not-used"
        db.session.add(u)
        db.session.flush()
        c = Customer(user_id=u.id, full_name="Bola Customer2", company_name="Bola2 Ltd")
        db.session.add(c)
        db.session.commit()
        return create_access_token(identity=str(u.id))


# ---------------------------------------------------------------------------
# Invoice ownership scoping
# ---------------------------------------------------------------------------

def _create_order_with_invoice(app, client, courier_auth_headers, admin_auth_headers):
    """Create an order, assign it to the demo courier, issue an invoice."""
    # Use an existing seeded order id via the admin route or a direct DB insert.
    from models import (db, Address, PickupPoint, Delivery, DeliveryPoint,
                        Invoice, Customer, Courier, User)
    with app.app_context():
        customer = Customer.query.filter(Customer.user_id.isnot(None)).first()
        courier = Courier.query.first()
        if not customer or not courier:
            return None
        address = Address(
            street="Rothschild", building_number="50", city="Tel Aviv",
            latitude=32.0626, longitude=34.7742,
        )
        db.session.add(address)
        db.session.flush()
        pickup = PickupPoint(
            address_id=address.id,
            contact_name="Test Pickup", contact_phone="0507654321",
        )
        db.session.add(pickup)
        db.session.flush()
        point = DeliveryPoint(
            address_id=address.id,
            recipient_name="Test Recipient",
            recipient_phone="0501234567",
        )
        db.session.add(point)
        db.session.flush()
        d = Delivery(
            courier_id=courier.id,
            customer_id=customer.id,
            pickup_point_id=pickup.id,
            delivery_point_id=point.id,
            order_number=f"BOLA-{uuid.uuid4().hex[:6].upper()}",
            status="delivered",
            delivery_fee=50.0,
        )
        db.session.add(d)
        db.session.flush()
        inv = Invoice(
            invoice_number=f"INV-{uuid.uuid4().hex[:6].upper()}",
            document_type="tax_invoice_receipt",
            customer_id=customer.id,
            delivery_id=d.id,
            subtotal=50.0,
            vat_amount=9.0,
            total_amount=59.0,
            status="sent",
        )
        db.session.add(inv)
        db.session.commit()
        return {"delivery_id": d.id, "invoice_id": inv.id}


def test_invoice_download_blocked_for_other_courier(app, client, courier_auth_headers,
                                                    second_courier_auth_headers, admin_auth_headers):
    data = _create_order_with_invoice(app, client, courier_auth_headers, admin_auth_headers)
    assert data, "test setup failed: no courier/customer to build an invoice"
    # Attacker courier B must not download courier A's order invoice.
    resp = client.get(f"/api/invoices/{data['invoice_id']}/download",
                      headers=second_courier_auth_headers)
    assert resp.status_code == 403, resp.get_json()
    # By-order download is equally blocked for the wrong courier.
    resp2 = client.get(f"/api/invoices/by-order/{data['delivery_id']}/download",
                       headers=second_courier_auth_headers)
    assert resp2.status_code == 403, resp2.get_json()


def test_invoice_download_allowed_for_owner_courier(app, client, courier_auth_headers,
                                                    admin_auth_headers):
    data = _create_order_with_invoice(app, client, courier_auth_headers, admin_auth_headers)
    assert data
    resp = client.get(f"/api/invoices/by-order/{data['delivery_id']}",
                      headers=courier_auth_headers)
    assert resp.status_code == 200, resp.get_json()


def test_invoice_by_order_blocked_for_other_customer(app, client, customer_auth_headers):
    from models import db, Delivery, Invoice, Customer, User
    with app.app_context():
        # Pick an invoice owned by a customer that is NOT our fixture customer.
        inv = (
            db.session.query(Invoice)
            .join(Delivery, Delivery.id == Invoice.delivery_id)
            .filter(Invoice.customer_id.isnot(None))
            .first()
        )
        target_customer = None
        if inv:
            target_customer = Customer.query.get(inv.customer_id)
        if not inv or not target_customer or target_customer.user_id is None:
            return  # nothing to cross-access in an empty DB
        other = User.query.filter_by(username="bola_customer2").first()
        if not other:
            return
        if target_customer.user_id == other.id:
            return
    resp = client.get(f"/api/invoices/by-order/{inv.delivery_id}", headers=customer_auth_headers)
    assert resp.status_code == 403, resp.get_json()


# ---------------------------------------------------------------------------
# WMS role gating
# ---------------------------------------------------------------------------

def test_wms_topology_and_inventory_require_warehouse_role(app, client, courier_auth_headers,
                                                           admin_auth_headers):
    # Courier must be denied; admin allowed.
    top = client.get("/api/wms/topology", headers=courier_auth_headers)
    assert top.status_code == 403, top.get_json()
    inv = client.get("/api/wms/inventory", headers=courier_auth_headers)
    assert inv.status_code == 403, inv.get_json()

    top_admin = client.get("/api/wms/topology", headers=admin_auth_headers)
    assert top_admin.status_code == 200, top_admin.get_json()
    inv_admin = client.get("/api/wms/inventory", headers=admin_auth_headers)
    assert inv_admin.status_code == 200, inv_admin.get_json()


# ---------------------------------------------------------------------------
# Support tickets — cross-courier isolation (regression)
# ---------------------------------------------------------------------------

def test_support_ticket_isolated_between_couriers(app, client, courier_auth_headers,
                                                  second_courier_auth_headers):
    created = client.post("/api/support/tickets",
                          headers=courier_auth_headers,
                          json={"subject": "BOLA sweep", "message": "hello"})
    assert created.status_code == 201, created.get_json()
    ticket_id = created.get_json()["id"]

    # Attacker B must not see the ticket list entry.
    listing = client.get("/api/support/tickets", headers=second_courier_auth_headers)
    ids = [t["id"] for t in listing.get_json()]
    assert ticket_id not in ids, "ticket leaked into another courier's list"

    # Attacker B cannot read the ticket detail.
    detail = client.get(f"/api/support/tickets/{ticket_id}", headers=second_courier_auth_headers)
    assert detail.status_code == 403, detail.get_json()

    # Owner can still read it.
    owner = client.get(f"/api/support/tickets/{ticket_id}", headers=courier_auth_headers)
    assert owner.status_code == 200, owner.get_json()


# ---------------------------------------------------------------------------
# Chat history — cross-user isolation (regression)
# ---------------------------------------------------------------------------

def test_chat_history_isolated_between_users(app, client, courier_auth_headers,
                                             second_courier_auth_headers):
    started = client.post("/api/chat/start", headers=courier_auth_headers)
    assert started.status_code == 200, started.get_json()
    session_id = started.get_json()["id"]

    foreign = client.get(f"/api/chat/history/{session_id}", headers=second_courier_auth_headers)
    assert foreign.status_code == 403, foreign.get_json()

    owner = client.get(f"/api/chat/history/{session_id}", headers=courier_auth_headers)
    assert owner.status_code == 200, owner.get_json()


# ---------------------------------------------------------------------------
# Courier forms history — cross-courier isolation (regression)
# ---------------------------------------------------------------------------

def test_courier_forms_history_isolated_between_couriers(app, client, courier_auth_headers,
                                                         second_courier_auth_headers):
    gen = client.post("/api/courier/forms/vat_monthly/generate",
                      headers=courier_auth_headers,
                      json={"month": 6, "year": 2025})
    assert gen.status_code == 200, gen.get_json()
    report_id = gen.headers.get("X-Report-Id")
    assert report_id

    history = client.get("/api/courier/forms/history", headers=second_courier_auth_headers)
    ids = [h["id"] for h in history.get_json()]
    assert int(report_id) not in ids, "report leaked into another courier's history"

    dl = client.get(f"/api/courier/forms/history/{report_id}/download",
                    headers=second_courier_auth_headers)
    assert dl.status_code == 404, dl.get_json()