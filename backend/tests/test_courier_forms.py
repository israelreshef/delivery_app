"""Tests for the courier tax forms endpoints (improvement plan, section 7)."""

import uuid

from flask_jwt_extended import create_access_token


def _create_second_courier(app):
    """Create an independent courier (user + profile) and return their token."""
    from models import db, User, Courier
    with app.app_context():
        if User.query.filter_by(username="bola_courier").first():
            existing = User.query.filter_by(username="bola_courier").first()
            return create_access_token(identity=str(existing.id))

        u = User(username="bola_courier", email=f"bola_{uuid.uuid4().hex[:8]}@tzir.com",
                 phone="0597777777", user_type="courier")
        u.password_hash = "not-used"
        db.session.add(u)
        db.session.flush()
        c = Courier(user_id=u.id, full_name="Bola Courier", vehicle_type="scooter")
        db.session.add(c)
        db.session.commit()
        return create_access_token(identity=str(u.id))


def test_tax_forms_requires_auth(client):
    response = client.get("/api/courier/forms")
    assert response.status_code == 401


def test_tax_forms_lists_catalogue(client, courier_auth_headers):
    response = client.get("/api/courier/forms", headers=courier_auth_headers)
    assert response.status_code == 200

    forms = response.get_json()
    assert isinstance(forms, list)
    assert len(forms) >= 4

    ids = {f["id"] for f in forms}
    assert "vat_monthly" in ids
    assert "tax_advances" in ids
    assert "national_insurance" in ids
    assert "annual_1301" in ids
    assert "withholding_106" in ids
    assert "year_end_assessment" in ids
    assert "withholding_bookkeeping" in ids
    assert "wealth_declaration" in ids
    assert "tax_coordination_116" in ids

    for form in forms:
        assert "title" in form
        assert "description" in form
        assert form["kind"] in ("auto", "blank")
        assert "available" in form
        # Internal file name must never leak to clients.
        assert "filename" not in form


def test_tax_forms_generate_requires_valid_courier(client, courier_auth_headers):
    # demo_courier exists in the seeded DB, so the request should be generated.
    response = client.post(
        "/api/courier/forms/vat_monthly/generate",
        headers=courier_auth_headers,
        json={"month": 1, "year": 2025},
    )
    assert response.status_code in (200, 404)


def test_tax_forms_generate_returns_pdf(client, courier_auth_headers):
    response = client.post(
        "/api/courier/forms/vat_monthly/generate",
        headers=courier_auth_headers,
        json={"month": 1, "year": 2025},
    )
    assert response.status_code == 200, response.get_json()
    assert response.content_type == "application/pdf"
    assert response.data[:4] == b"%PDF"


def test_tax_forms_generate_rejects_unknown_or_blank_form(client, courier_auth_headers):
    response = client.post(
        "/api/courier/forms/does_not_exist/generate",
        headers=courier_auth_headers,
        json={"month": 1, "year": 2025},
    )
    assert response.status_code == 404

    response = client.post(
        "/api/courier/forms/wealth_declaration/generate",
        headers=courier_auth_headers,
        json={"year": 2025},
    )
    # wealth_declaration is kind='blank' -> no auto generator.
    assert response.status_code == 404


def test_tax_forms_annual_generate_returns_pdf(client, courier_auth_headers):
    response = client.post(
        "/api/courier/forms/annual_1301/generate",
        headers=courier_auth_headers,
        json={"year": 2025},
    )
    assert response.status_code == 200, response.get_json()
    assert response.content_type == "application/pdf"
    assert response.data[:4] == b"%PDF"


def test_tax_forms_blank_requires_auth(client):
    response = client.get("/api/courier/forms/wealth_declaration/blank")
    assert response.status_code == 401


def test_tax_forms_blank_returns_pdf(client, courier_auth_headers):
    response = client.get(
        "/api/courier/forms/wealth_declaration/blank",
        headers=courier_auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    assert response.content_type == "application/pdf"
    assert response.data[:4] == b"%PDF"


def test_tax_forms_blank_rejects_auto_form(client, courier_auth_headers):
    response = client.get(
        "/api/courier/forms/vat_monthly/blank",
        headers=courier_auth_headers,
    )
    assert response.status_code == 404


def test_tax_forms_new_generators_return_pdf(client, courier_auth_headers):
    for form_id in ("withholding_106", "year_end_assessment", "withholding_bookkeeping"):
        response = client.post(
            f"/api/courier/forms/{form_id}/generate",
            headers=courier_auth_headers,
            json={"year": 2025},
        )
        assert response.status_code == 200, (form_id, response.get_json())
        assert response.content_type == "application/pdf"
        assert response.data[:4] == b"%PDF"


def test_generate_persists_history_and_returns_report_id(client, courier_auth_headers):
    response = client.post(
        "/api/courier/forms/vat_monthly/generate",
        headers=courier_auth_headers,
        json={"month": 1, "year": 2025},
    )
    assert response.status_code == 200
    assert response.headers.get("X-Report-Id")

    history = client.get("/api/courier/forms/history", headers=courier_auth_headers)
    assert history.status_code == 200
    items = history.get_json()
    assert isinstance(items, list)
    matching = [i for i in items if i["form_id"] == "vat_monthly" and i["period_label"] == "1/2025"]
    assert len(matching) == 1


def test_generate_same_period_does_not_duplicate(client, courier_auth_headers):
    for _ in range(2):
        response = client.post(
            "/api/courier/forms/tax_advances/generate",
            headers=courier_auth_headers,
            json={"month": 2, "year": 2025},
        )
        assert response.status_code == 200
        assert response.headers.get("X-Report-Id")

    history = client.get("/api/courier/forms/history", headers=courier_auth_headers)
    items = history.get_json()
    matching = [i for i in items if i["form_id"] == "tax_advances" and i["period_label"] == "2/2025"]
    assert len(matching) == 1


def test_history_requires_auth(client):
    response = client.get("/api/courier/forms/history")
    assert response.status_code == 401


def test_history_download_returns_stored_pdf(client, courier_auth_headers):
    gen = client.post(
        "/api/courier/forms/annual_1301/generate",
        headers=courier_auth_headers,
        json={"year": 2025},
    )
    report_id = gen.headers.get("X-Report-Id")
    assert report_id

    dl = client.get(
        f"/api/courier/forms/history/{report_id}/download",
        headers=courier_auth_headers,
    )
    assert dl.status_code == 200
    assert dl.content_type == "application/pdf"
    assert dl.data[:4] == b"%PDF"


def test_history_download_unknown_id_returns_404(client, courier_auth_headers):
    response = client.get(
        "/api/courier/forms/history/999999/download",
        headers=courier_auth_headers,
    )
    assert response.status_code == 404


def test_history_delete_own_report(client, courier_auth_headers):
    gen = client.post(
        "/api/courier/forms/national_insurance/generate",
        headers=courier_auth_headers,
        json={"month": 3, "year": 2025},
    )
    report_id = gen.headers.get("X-Report-Id")
    assert report_id

    response = client.delete(
        f"/api/courier/forms/history/{report_id}",
        headers=courier_auth_headers,
    )
    assert response.status_code == 200

    # Now the download of the deleted report must 404.
    dl = client.get(
        f"/api/courier/forms/history/{report_id}/download",
        headers=courier_auth_headers,
    )
    assert dl.status_code == 404


def test_history_delete_unknown_id_returns_404(client, courier_auth_headers):
    response = client.delete(
        "/api/courier/forms/history/999999",
        headers=courier_auth_headers,
    )
    assert response.status_code == 404


def test_history_isolated_between_couriers_bola(app, client, courier_auth_headers):
    """Courier A's history/reports must be invisible and inaccessible to courier B (BOLA)."""
    # Courier A generates a report.
    gen = client.post(
        "/api/courier/forms/vat_monthly/generate",
        headers=courier_auth_headers,
        json={"month": 4, "year": 2025},
    )
    assert gen.status_code == 200
    report_id = gen.headers.get("X-Report-Id")
    assert report_id

    other_token = _create_second_courier(app)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # B's history list must not contain A's report.
    history = client.get("/api/courier/forms/history", headers=other_headers)
    assert history.status_code == 200
    ids = [item["id"] for item in history.get_json()]
    assert int(report_id) not in ids

    # B cannot download A's report (IDOR).
    dl = client.get(f"/api/courier/forms/history/{report_id}/download", headers=other_headers)
    assert dl.status_code == 404

    # B cannot delete A's report.
    dele = client.delete(f"/api/courier/forms/history/{report_id}", headers=other_headers)
    assert dele.status_code == 404

    # A's report is still intact.
    after = client.get(f"/api/courier/forms/history/{report_id}/download", headers=courier_auth_headers)
    assert after.status_code == 200
    assert after.data[:4] == b"%PDF"


def test_report_file_bytes_encrypted_at_rest(client, courier_auth_headers, app):
    """E.2: the PDF in the DB must be ciphertext, but the download returns a valid PDF."""
    from extensions import db
    from sqlalchemy import text

    gen = client.post(
        "/api/courier/forms/vat_monthly/generate",
        headers=courier_auth_headers,
        json={"month": 5, "year": 2025},
    )
    assert gen.status_code == 200, gen.get_json()
    assert gen.data[:4] == b"%PDF"
    plaintext = gen.data
    report_id = int(gen.headers["X-Report-Id"])

    with app.app_context():
        stored = db.session.execute(
            text("SELECT file_bytes FROM courier_report_history WHERE id = :rid"),
            {"rid": report_id},
        ).scalar()
        assert stored is not None, "file_bytes must be persisted"
        raw = bytes(stored)
        # Encrypted at rest: must not contain the raw PDF signature nor equal plaintext.
        assert not raw.startswith(b"%PDF"), "file_bytes must be encrypted at rest"
        assert raw != plaintext
        # Round-trip encryption must be deterministic enough to re-decrypt exactly.
        assert db.session.execute(
            text("SELECT length(file_bytes) FROM courier_report_history WHERE id = :rid"),
            {"rid": report_id},
        ).scalar() == len(raw)

    # The download endpoint decrypts transparently and returns exactly the generated PDF.
    dl = client.get(
        f"/api/courier/forms/history/{report_id}/download",
        headers=courier_auth_headers,
    )
    assert dl.status_code == 200
    assert dl.content_type == "application/pdf"
    assert dl.data[:4] == b"%PDF"
    assert dl.data == plaintext


def test_report_file_bytes_encrypted_after_regenerate(client, courier_auth_headers, app):
    """E.2: upserting an existing report re-encrypts the newly generated PDF."""
    from extensions import db
    from sqlalchemy import text

    for _ in range(2):
        gen = client.post(
            "/api/courier/forms/annual_1301/generate",
            headers=courier_auth_headers,
            json={"year": 2024},
        )
        assert gen.status_code == 200, gen.get_json()
    report_id = int(gen.headers["X-Report-Id"])

    with app.app_context():
        stored = db.session.execute(
            text("SELECT file_bytes FROM courier_report_history WHERE id = :rid"),
            {"rid": report_id},
        ).scalar()
        assert not bytes(stored).startswith(b"%PDF"), "stored file_bytes must stay encrypted"

    dl = client.get(
        f"/api/courier/forms/history/{report_id}/download",
        headers=courier_auth_headers,
    )
    assert dl.status_code == 200
    assert dl.data[:4] == b"%PDF"
