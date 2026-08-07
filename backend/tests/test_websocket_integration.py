from datetime import datetime

from extensions import socketio
import sockets.delivery_events as delivery_events


def _capture_server_emits(monkeypatch):
    emitted = []

    def fake_emit(name, data=None, room=None, **kwargs):
        emitted.append(
            {
                "name": name,
                "data": data,
                "room": room,
                "kwargs": kwargs,
            }
        )

    monkeypatch.setattr(delivery_events, "emit", fake_emit)
    return emitted


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
