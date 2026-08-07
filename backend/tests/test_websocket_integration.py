from datetime import datetime

from extensions import socketio
import sockets.delivery_events as delivery_events


def _capture_server_emits(monkeypatch):
    """Capture every emit() the socket handlers under test perform.

    Hooks the `emit` reference in all three socket event modules so support and
    chat events are captured too (not just delivery events).
    """
    import sockets.support_events as support_events
    import sockets.chat_events as chat_events

    emitted = []

    def make_emitter(module):
        original = module.emit

        def fake_emit(name, data=None, room=None, **kwargs):
            emitted.append(
                {
                    "name": name,
                    "data": data,
                    "room": room,
                    "kwargs": kwargs,
                }
            )
            return original(name, data, room=room, **kwargs)

        return original, fake_emit

    originals = []
    for module in (delivery_events, support_events, chat_events):
        original, fake = make_emitter(module)
        originals.append((module, original))
        monkeypatch.setattr(module, "emit", fake)

    return emitted


def _capture_join_rooms(monkeypatch):
    """Capture every room entered by the socket handlers under test.

    The Flask-SocketIO test client has no get_rooms() API, so we wrap the
    `join_room` imported by the modules we test and assert on the recorded calls.
    """
    import sockets.support_events as support_events
    import sockets.chat_events as chat_events

    joined = []

    def make_recorder(module):
        original = module.join_room

        def recorder(room, sid=None, namespace=None):
            joined.append(room)
            return original(room, sid=sid, namespace=namespace)

        return original, recorder

    for module in (delivery_events, support_events, chat_events):
        original, recorder = make_recorder(module)
        monkeypatch.setattr(module, "join_room", recorder)

    return joined


def test_websocket_ping_handler_emits_pong(app, courier_login_payload, monkeypatch):
    emitted = _capture_server_emits(monkeypatch)
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("ping")
    assert any(event["name"] == "pong" for event in emitted)

    ws_client.disconnect()


def test_websocket_courier_join_rejects_invalid_token(app, courier_login_payload, monkeypatch):
    emitted = _capture_server_emits(monkeypatch)
    token = courier_login_payload["access_token"]

    with delivery_events.connected_couriers_lock:
        delivery_events.connected_couriers.clear()

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join", {"role": "courier", "id": "1", "token": "invalid.jwt.token"})

    with delivery_events.connected_couriers_lock:
        assert len(delivery_events.connected_couriers) == 0
    assert any(event["name"] == "error" for event in emitted)

    ws_client.disconnect()


def test_websocket_courier_join_accepts_valid_token(app, courier_login_payload, monkeypatch):
    emitted = _capture_server_emits(monkeypatch)
    courier_id = int(courier_login_payload["user"]["courier_id"])
    token = courier_login_payload["access_token"]

    with delivery_events.connected_couriers_lock:
        delivery_events.connected_couriers.clear()

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join", {"role": "courier", "id": str(courier_id), "token": token})

    with delivery_events.connected_couriers_lock:
        assert list(delivery_events.connected_couriers.values()) == [courier_id]

    joined_events = [event for event in emitted if event["name"] == "joined"]
    assert joined_events
    assert joined_events[-1]["data"]["room"] == f"courier_{courier_id}"

    ws_client.disconnect()


def test_websocket_location_update_emits_admin_room_events(app, courier_login_payload, monkeypatch):
    emitted = _capture_server_emits(monkeypatch)
    user_id = str(courier_login_payload["user"]["id"])
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit(
        "courier_location_update",
        {
            "courier_id": user_id,
            "lat": 32.0853,
            "lng": 34.7818,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

    location_broadcasts = [
        event
        for event in emitted
        if event["name"] == "courier_location_update" and event["room"] == "admin_room"
    ]
    availability_broadcasts = [
        event
        for event in emitted
        if event["name"] == "courier_availability_update" and event["room"] == "admin_room"
    ]

    assert location_broadcasts
    assert availability_broadcasts
    assert str(location_broadcasts[-1]["data"]["courier_id"]) == user_id

    ws_client.disconnect()


def test_websocket_connect_rejects_expired_token_but_fresh_join_succeeds(app, courier_login_payload, monkeypatch):
    """Verifies the zero-compromise connection policy:
    - An expired token is rejected at connection time (never granted a socket).
    - A fresh token connects, and joining the courier room succeeds.
    """
    from flask_jwt_extended import create_access_token
    import datetime

    emitted = _capture_server_emits(monkeypatch)

    with delivery_events.connected_couriers_lock:
        delivery_events.connected_couriers.clear()

    expired_token = create_access_token(
        identity=str(courier_login_payload["user"]["id"]),
        expires_delta=datetime.timedelta(seconds=-1)
    )

    ws_client = socketio.test_client(
        app,
        flask_test_client=app.test_client(),
        auth={"token": expired_token}
    )
    assert not ws_client.is_connected(), "Connection with an expired token must be rejected"

    courier_id = int(courier_login_payload["user"]["courier_id"])
    fresh_token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(
        app,
        flask_test_client=app.test_client(),
        auth={"token": fresh_token}
    )
    assert ws_client.is_connected()

    ws_client.emit("join", {
        "role": "courier",
        "id": str(courier_id),
        "token": fresh_token
    })

    joined_events = [e for e in emitted if e["name"] == "joined"]
    assert joined_events, "Expected a joined event after connecting with a fresh token"

    with delivery_events.connected_couriers_lock:
        assert courier_id in delivery_events.connected_couriers.values()

    ws_client.disconnect()


def test_websocket_connect_rejects_no_token(app, monkeypatch):
    emitted = _capture_server_emits(monkeypatch)

    ws_client = socketio.test_client(
        app,
        flask_test_client=app.test_client(),
        auth={}
    )
    assert not ws_client.is_connected(), "Connection without token should be rejected"


# ---------------------------------------------------------------------------
# BOLA / authorization tests for socket rooms (support + delivery tracking)
# ---------------------------------------------------------------------------

def _login(app, username, password):
    with app.test_client() as client:
        response = client.post("/api/auth/login", json={"username": username, "password": password})
        assert response.status_code == 200, response.get_json()
        return response.get_json()


def _create_delivery(app, order_number, customer_id, courier_id):
    from extensions import db
    from models import Address, PickupPoint, DeliveryPoint, Delivery

    with app.app_context():
        pickup_addr = Address(street="Rothschild", city="Tel Aviv", building_number="1")
        dropoff_addr = Address(street="Dizengoff", city="Tel Aviv", building_number="2")
        db.session.add_all([pickup_addr, dropoff_addr])
        db.session.flush()

        pickup = PickupPoint(address=pickup_addr, contact_name="Sender", contact_phone="0500000001")
        dropoff = DeliveryPoint(address=dropoff_addr, recipient_name="Receiver", recipient_phone="0500000002")
        db.session.add_all([pickup, dropoff])
        db.session.flush()

        delivery = Delivery(
            order_number=order_number,
            customer_id=customer_id,
            courier_id=courier_id,
            pickup_point_id=pickup.id,
            delivery_point_id=dropoff.id,
        )
        db.session.add(delivery)
        db.session.commit()
        delivery_id = delivery.id
        return delivery_id


def _create_ticket(app, user_id):
    from extensions import db
    from models import SupportTicket

    with app.app_context():
        ticket = SupportTicket(user_id=user_id, subject="Test ticket", status="open")
        db.session.add(ticket)
        db.session.commit()
        return ticket.id


def test_websocket_delivery_room_blocks_unassigned_courier(app, courier_login_payload, monkeypatch):
    """A courier must NOT be able to track a delivery they are not assigned to."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)

    from models import Customer, Courier, User
    with app.app_context():
        customer = User.query.filter_by(username="demo_client").first()
        assert customer is not None
        customer_row = Customer.query.filter_by(user_id=customer.id).first()
        courier_user = User.query.filter_by(username="demo_courier").first()
        courier_row = Courier.query.filter_by(user_id=courier_user.id).first()

    delivery_id = _create_delivery(
        app,
        order_number=f"BOLA-D-BLOCK-{abs(hash(('u', courier_login_payload['user']['id'])))}",
        customer_id=customer_row.id,
        courier_id=None,
    )
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_delivery_room", {"delivery_id": delivery_id})

    errors = [e for e in emitted if e["name"] == "error"]
    assert errors, "Expected an error when a non-assigned courier joins a delivery room"
    assert not [e for e in emitted if e["name"] == "joined_delivery_room"]
    assert f"delivery_{delivery_id}" not in joined, "Non-assigned courier must not join the delivery room"

    ws_client.disconnect()


def test_websocket_delivery_room_allows_assigned_courier(app, courier_login_payload, monkeypatch):
    """The assigned courier IS allowed to track the delivery."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)

    from models import Customer, Courier, User
    with app.app_context():
        customer = User.query.filter_by(username="demo_client").first()
        customer_row = Customer.query.filter_by(user_id=customer.id).first()
        courier_user = User.query.filter_by(username="demo_courier").first()
        courier_row = Courier.query.filter_by(user_id=courier_user.id).first()

    delivery_id = _create_delivery(
        app,
        order_number=f"BOLA-D-OK-{abs(hash(('k', courier_login_payload['user']['id'])))}",
        customer_id=customer_row.id,
        courier_id=courier_row.id,
    )
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_delivery_room", {"delivery_id": delivery_id})

    assert [e for e in emitted if e["name"] == "joined_delivery_room"], \
        "Assigned courier should join the delivery room"
    assert f"delivery_{delivery_id}" in joined

    ws_client.disconnect()


def test_websocket_ticket_room_blocks_non_owner_courier(app, courier_login_payload, monkeypatch):
    """A courier must NOT be able to join a support ticket that belongs to another user."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)

    from models import User
    with app.app_context():
        customer = User.query.filter_by(username="demo_client").first()
        assert customer is not None

    ticket_id = _create_ticket(app, customer.id)
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_ticket_room", {"ticket_id": ticket_id})

    errors = [e for e in emitted if e["name"] == "error"]
    assert errors, "Expected an error when a non-owner joins a ticket room"
    assert not [e for e in emitted if e["name"] == "joined_ticket_room"]
    assert f"ticket_{ticket_id}" not in joined

    ws_client.disconnect()


def test_websocket_ticket_room_allows_owner(app, monkeypatch):
    """The ticket owner IS allowed to join their ticket room."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)

    from models import User
    with app.app_context():
        customer = User.query.filter_by(username="demo_client").first()
        assert customer is not None

    login = _login(app, "demo_client", "demo_client2026!")
    ticket_id = _create_ticket(app, customer.id)

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": login["access_token"]})
    assert ws_client.is_connected()

    ws_client.emit("join_ticket_room", {"ticket_id": ticket_id})

    joined_events = [e for e in emitted if e["name"] == "joined_ticket_room"]
    assert joined_events, "Ticket owner should join the ticket room"
    assert f"ticket_{ticket_id}" in joined

    ws_client.disconnect()


def test_websocket_ticket_room_allows_admin(app, admin_login_payload, monkeypatch):
    """An admin IS allowed to join any ticket room (support duty)."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)

    from models import User
    with app.app_context():
        customer = User.query.filter_by(username="demo_client").first()
        assert customer is not None

    ticket_id = _create_ticket(app, customer.id)
    token = admin_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_ticket_room", {"ticket_id": ticket_id})

    joined_events = [e for e in emitted if e["name"] == "joined_ticket_room"]
    assert joined_events, "Admin should join any ticket room"
    assert f"ticket_{ticket_id}" in joined

    ws_client.disconnect()


def test_websocket_join_support_non_staff_gets_user_room_only(app, courier_login_payload, monkeypatch):
    """A courier emitting join_support must land in their own user_<id> room only —
    never in the shared support_agents staff room (no privilege escalation)."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)
    user_id = str(courier_login_payload["user"]["id"])
    token = courier_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_support", {"role": "admin", "token": token})

    assert f"user_{user_id}" in joined, "User should be in their own user_<id> room"
    assert "support_agents" not in joined, "Non-staff must never join the support_agents room"

    joined_events = [e for e in emitted if e["name"] == "joined_support"]
    assert joined_events and joined_events[-1]["data"]["role"] == "courier"

    ws_client.disconnect()


def test_websocket_join_support_admin_gets_staff_room(app, admin_login_payload, monkeypatch):
    """An admin joining support lands in the shared support_agents room."""
    emitted = _capture_server_emits(monkeypatch)
    joined = _capture_join_rooms(monkeypatch)
    token = admin_login_payload["access_token"]

    ws_client = socketio.test_client(app, flask_test_client=app.test_client(), auth={"token": token})
    assert ws_client.is_connected()

    ws_client.emit("join_support", {"role": "admin", "token": token})

    assert "support_agents" in joined, "Admin should be in the support_agents room"

    joined_events = [e for e in emitted if e["name"] == "joined_support"]
    assert joined_events and joined_events[-1]["data"]["role"] == "admin"

    ws_client.disconnect()