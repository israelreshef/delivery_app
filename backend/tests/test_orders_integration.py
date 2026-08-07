"""Order lifecycle integration tests: pricing, availability, courier stats."""


class TestPriceEstimate:
    ENDPOINT = "/api/orders/price-estimate"

    def test_price_estimate_requires_auth(self, client):
        response = client.get(f"{self.ENDPOINT}?distance=10")
        assert response.status_code == 401

    def test_price_estimate_returns_valid_pricing(self, client, courier_auth_headers):
        response = client.get(
            f"{self.ENDPOINT}?distance=10.5",
            headers=courier_auth_headers
        )
        assert response.status_code == 200
        payload = response.get_json()
        assert payload.get("success") is True
        assert float(payload.get("courier_payment", 0)) > 0
        assert float(payload.get("distance_km", 0)) == 10.5

    def test_price_estimate_zero_distance_returns_400(self, client, courier_auth_headers):
        response = client.get(
            f"{self.ENDPOINT}?distance=0",
            headers=courier_auth_headers
        )
        assert response.status_code == 400

    def test_price_estimate_missing_distance_returns_400(self, client, courier_auth_headers):
        response = client.get(
            self.ENDPOINT,
            headers=courier_auth_headers
        )
        assert response.status_code == 400


class TestCourierOrderFlow:
    def test_courier_active_order_returns_200_or_404(self, client, courier_auth_headers):
        response = client.get(
            "/api/couriers/active-order",
            headers=courier_auth_headers
        )
        assert response.status_code in (200, 404)

    def test_courier_history_returns_dict(self, client, courier_auth_headers):
        response = client.get(
            "/api/couriers/history",
            headers=courier_auth_headers
        )
        assert response.status_code == 200
        payload = response.get_json()
        assert isinstance(payload, dict)
        assert "history" in payload

    def test_courier_history_requires_auth(self, client):
        response = client.get("/api/couriers/history")
        assert response.status_code == 401


class TestCourierStats:
    def test_courier_stats_returns_data(self, client, courier_auth_headers):
        response = client.get(
            "/api/couriers/stats",
            headers=courier_auth_headers
        )
        assert response.status_code == 200
        payload = response.get_json()
        assert payload.get("total_deliveries") is not None
        assert payload.get("balance") is not None

    def test_courier_stats_requires_auth(self, client):
        response = client.get("/api/couriers/stats")
        assert response.status_code == 401


class TestCourierAvailability:
    def test_update_availability_requires_auth(self, client):
        response = client.patch("/api/couriers/availability", json={"is_available": True})
        assert response.status_code == 401

    def test_update_availability_as_courier(self, client, courier_auth_headers):
        response = client.patch(
            "/api/couriers/availability",
            headers=courier_auth_headers,
            json={"is_available": True}
        )
        assert response.status_code in (200, 422, 400)

    def test_get_shift_status(self, client, courier_auth_headers):
        response = client.get(
            "/api/couriers/shift/status",
            headers=courier_auth_headers
        )
        assert response.status_code == 200

    def test_get_shift_status_requires_auth(self, client):
        response = client.get("/api/couriers/shift/status")
        assert response.status_code == 401
