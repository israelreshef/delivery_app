from datetime import datetime


def _unique_suffix():
    return datetime.utcnow().strftime("%Y%m%d%H%M%S%f")


def test_support_ticket_assignment_creates_customer_task(app, client, admin_auth_headers, courier_login_payload):
    courier_id = courier_login_payload["user"]["id"]
    suffix = _unique_suffix()

    response = client.post(
        "/api/support/tickets",
        headers=admin_auth_headers,
        json={
            "subject": f"Assignment sync {suffix}",
            "message": "Ensure task is created on assignment",
            "priority": "high",
            "assigned_to": courier_id,
        },
    )
    assert response.status_code == 201, response.get_json()
    ticket_id = response.get_json()["id"]

    with app.app_context():
        from models import CustomerTask

        task = CustomerTask.query.filter_by(
            source="support_ticket",
            source_id=str(ticket_id),
            assigned_to=courier_id,
        ).first()
        assert task is not None
        assert task.status == "in_progress"


def test_support_ticket_resolved_closes_task(app, client, admin_auth_headers, courier_login_payload):
    courier_id = courier_login_payload["user"]["id"]
    suffix = _unique_suffix()

    create_response = client.post(
        "/api/support/tickets",
        headers=admin_auth_headers,
        json={
            "subject": f"Resolve sync {suffix}",
            "message": "Task should complete when ticket resolves",
            "priority": "medium",
            "assigned_to": courier_id,
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    ticket_id = create_response.get_json()["id"]

    update_response = client.put(
        f"/api/support/tickets/{ticket_id}",
        headers=admin_auth_headers,
        json={"status": "resolved"},
    )
    assert update_response.status_code == 200, update_response.get_json()

    with app.app_context():
        from models import CustomerTask

        task = CustomerTask.query.filter_by(source="support_ticket", source_id=str(ticket_id)).first()
        assert task is not None
        assert task.status == "completed"
        assert task.completed_at is not None


def test_support_get_tickets_assigned_to_me(client, admin_auth_headers, admin_login_payload):
    admin_id = admin_login_payload["user"]["id"]
    suffix = _unique_suffix()

    create_response = client.post(
        "/api/support/tickets",
        headers=admin_auth_headers,
        json={
            "subject": f"Assigned-to-me filter {suffix}",
            "message": "Filter validation",
            "priority": "low",
            "assigned_to": admin_id,
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    created_ticket_id = create_response.get_json()["id"]

    list_response = client.get(
        "/api/support/tickets?assigned_to=me",
        headers=admin_auth_headers,
    )
    assert list_response.status_code == 200, list_response.get_json()

    payload = list_response.get_json()
    returned_ids = {row["id"] for row in payload}
    assert created_ticket_id in returned_ids


def test_tasks_access_by_role(
    client,
    admin_auth_headers,
    courier_auth_headers,
    admin_login_payload,
    courier_login_payload,
):
    admin_id = admin_login_payload["user"]["id"]
    courier_id = courier_login_payload["user"]["id"]
    suffix = _unique_suffix()

    assigned_response = client.post(
        "/api/tasks",
        headers=admin_auth_headers,
        json={
            "title": f"Courier visible {suffix}",
            "description": "Should be visible to courier",
            "priority": "high",
            "status": "open",
            "assigned_to": courier_id,
            "source": "manual",
            "source_id": f"ROLE-{suffix}-A",
        },
    )
    assert assigned_response.status_code == 201, assigned_response.get_json()
    assigned_task_id = assigned_response.get_json()["id"]

    hidden_response = client.post(
        "/api/tasks",
        headers=admin_auth_headers,
        json={
            "title": f"Courier hidden {suffix}",
            "description": "Should not be visible to courier",
            "priority": "medium",
            "status": "open",
            "assigned_to": admin_id,
            "source": "manual",
            "source_id": f"ROLE-{suffix}-B",
        },
    )
    assert hidden_response.status_code == 201, hidden_response.get_json()
    hidden_task_id = hidden_response.get_json()["id"]

    courier_list = client.get("/api/tasks", headers=courier_auth_headers)
    assert courier_list.status_code == 200, courier_list.get_json()
    payload = courier_list.get_json()
    ids = {row["id"] for row in payload}

    assert assigned_task_id in ids
    assert hidden_task_id not in ids
