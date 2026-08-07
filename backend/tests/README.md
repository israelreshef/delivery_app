# Backend Testing Suite

This suite provides a production-ready baseline for API quality, security, and privacy checks.

## Goals

- Verify critical API uptime and authentication flows.
- Enforce security headers and protected-route behavior.
- Validate privacy/data-rights behavior to support Israeli privacy law expectations and future GDPR alignment.

## Test Modules

- `test_api_smoke.py`
  - Health endpoint status
  - Security headers on API responses
  - Authentication required for protected routes
  - Login token issuance

- `test_privacy_compliance.py`
  - Authenticated privacy export with data minimization checks
  - Consent persistence check
  - Role-based access control check (courier vs admin)

- `test_payments_integration.py`
  - Payment intent auth guard
  - Input validation
  - Mock/live-configuration behavior
  - Webhook mock acceptance behavior

- `test_websocket_integration.py`
  - Ping/pong connectivity check
  - Courier join token validation
  - Valid courier join flow
  - Admin room receiving courier location events

## Run Locally

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

If Windows `python` points to a broken Store shim, run with an explicit interpreter:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

## Compliance Notes

- The suite validates technical controls (auth, headers, access control, data minimization).
- This is not legal certification by itself.
- For formal compliance audits, combine this with:
  - documented data-retention policy,
  - incident response runbooks,
  - periodic penetration testing,
  - DPA/legal review for Israeli and EU requirements.
