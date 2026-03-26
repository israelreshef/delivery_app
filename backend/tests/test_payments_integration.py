def test_payments_create_intent_requires_auth(client):
    response = client.post("/api/payments/create-intent", json={"amount": 100})
    assert response.status_code == 401


def test_payments_create_intent_rejects_invalid_amount(client, courier_auth_headers):
    response = client.post(
        "/api/payments/create-intent",
        headers=courier_auth_headers,
        json={"amount": 0},
    )
    assert response.status_code == 400


def test_payments_create_intent_returns_mock_payload_when_keys_missing(client, courier_auth_headers):
    response = client.post(
        "/api/payments/create-intent",
        headers=courier_auth_headers,
        json={"amount": 123.45, "currency": "ILS"},
    )
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["isMock"] is True
    assert payload["transactionId"].startswith("sb_mock_")
    assert "mock-payment-page" in payload["paymentUrl"]


def test_payments_create_intent_returns_not_implemented_when_live_keys_configured(
    client, courier_auth_headers, monkeypatch
):
    from routes import payments as payments_module

    monkeypatch.setattr(payments_module, "SMARTBEE_API_KEY", "test-live-key")
    monkeypatch.setattr(payments_module, "SMARTBEE_COMPANY_ID", "test-company")

    response = client.post(
        "/api/payments/create-intent",
        headers=courier_auth_headers,
        json={"amount": 50.0, "currency": "ILS"},
    )
    assert response.status_code == 501

    payload = response.get_json()
    assert payload["isMock"] is False
    assert "pending API docs" in payload["error"]


def test_payments_webhook_without_secret_is_accepted_as_mock(client):
    response = client.post(
        "/api/payments/webhook",
        json={"transactionId": "tx_1", "status": "approved"},
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "ignored_no_secret"
