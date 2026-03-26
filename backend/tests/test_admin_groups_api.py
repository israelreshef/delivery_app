def _uniq(prefix: str) -> str:
    from datetime import datetime
    return f"{prefix}-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"


def test_admin_groups_crud_and_user_permissions(client, admin_auth_headers, courier_login_payload):
    # Seed + read available permissions
    list_resp = client.get("/api/admin/groups?seed_defaults=1", headers=admin_auth_headers)
    assert list_resp.status_code == 200, list_resp.get_json()
    list_payload = list_resp.get_json()
    assert "available_permissions" in list_payload
    available_keys = {p["permission_key"] for p in list_payload["available_permissions"]}
    assert "support:view" in available_keys

    # Create group
    group_name = _uniq("support-group")
    create_resp = client.post(
        "/api/admin/groups",
        headers=admin_auth_headers,
        json={
            "name": group_name,
            "description": "temporary test group",
            "permission_keys": ["support:view", "support:comment", "tasks:view"],
        },
    )
    assert create_resp.status_code == 201, create_resp.get_json()
    group = create_resp.get_json()["group"]
    group_id = group["id"]
    assert "support:view" in group["permissions"]

    # Assign group to courier via groups endpoint
    courier_user_id = int(courier_login_payload["user"]["id"])
    update_resp = client.put(
        f"/api/admin/groups/{group_id}",
        headers=admin_auth_headers,
        json={"user_ids": [courier_user_id]},
    )
    assert update_resp.status_code == 200, update_resp.get_json()
    assert update_resp.get_json()["group"]["users_count"] >= 1

    users_resp = client.get("/api/admin/users?include_permissions=1", headers=admin_auth_headers)
    assert users_resp.status_code == 200, users_resp.get_json()
    users = users_resp.get_json()
    courier = next((u for u in users if int(u["id"]) == courier_user_id), None)
    assert courier is not None
    assert any(g["id"] == group_id for g in courier.get("groups", []))
    assert "support:view" in courier.get("permissions", [])


def test_update_user_group_ids(client, admin_auth_headers, courier_login_payload):
    group_name = _uniq("ops-group")
    create_resp = client.post(
        "/api/admin/groups",
        headers=admin_auth_headers,
        json={
            "name": group_name,
            "permission_keys": ["tasks:view"],
        },
    )
    assert create_resp.status_code == 201, create_resp.get_json()
    group_id = create_resp.get_json()["group"]["id"]

    courier_user_id = int(courier_login_payload["user"]["id"])
    assign_resp = client.put(
        f"/api/admin/users/{courier_user_id}",
        headers=admin_auth_headers,
        json={"group_ids": [group_id]},
    )
    assert assign_resp.status_code == 200, assign_resp.get_json()

    users_resp = client.get("/api/admin/users", headers=admin_auth_headers)
    assert users_resp.status_code == 200, users_resp.get_json()
    users = users_resp.get_json()
    courier = next((u for u in users if int(u["id"]) == courier_user_id), None)
    assert courier is not None
    assert any(g["id"] == group_id for g in courier.get("groups", []))
