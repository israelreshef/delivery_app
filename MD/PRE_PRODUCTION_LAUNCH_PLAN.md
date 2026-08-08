# Pre-Production Launch Plan

## Overview
Security hardening & infrastructure readiness checklist for the Tzir delivery platform.

---

## 1. HTTPS Everywhere

**Problem:** All connections (Ktor API, Socket.IO, token refresh) use plain `http://`. MITM can steal tokens and read all traffic.

**Fix:**
- Purchase/configure SSL certificate (Let's Encrypt or commercial CA)
- Replace `http://` → `https://` in:
  - `SocketManager.kt:55` — `SOCKET_URL`
  - `KtorClientFactory.kt:36` — `resolveBaseUrl()`
  - All mobile config files
- Enable `force_https=True` in Flask-Talisman (`app.py:205`)
- Update `CORS` origins to include `https://` URLs

**Status:** 🔴 Blocked (requires SSL certificate + domain configuration)

---

## 2. API Key Configuration

**Problem:** Several external services use fallback/mock keys or hardcoded placeholders.

**Fix:**
- Set real keys via environment variables for:
  - Google Maps / Places API
  - Firebase Cloud Messaging (server key)
  - SmartBee payment gateway
  - WhatsApp/SMS gateway
  - reCAPTCHA (if used)
- Remove fallback `'default-api-key-change-in-production'` from `decorators.py:238`
- Remove HSM simulation `b"HARDWARE_BACKED_MASTER_SECRET_SIMULATION"` from `secrets_manager.py:44`

**Status:** ❌ Not started (requires SSL certificate + domain configuration)

---

## 3. Token Removal from Socket.IO Query String

**Problem:** JWT is sent in `query = "token=..."` which appears in server logs, browser history, and Referer headers.

**Fix (Mobile — SocketManager.kt:168):**
- Delete `query = "token=$currentToken"` line
- Keep only `auth = mapOf("token" to currentToken)` — Socket.IO transmits `auth` inside the Engine.IO handshake (WebSocket upgrade request headers), not the URL

**Status:** ✅ Completed — `query` parameter removed; `auth` object is the only vehicle for the token (requires SSL certificate + domain configuration)

---

## 4. Server-Side Room Assignment (Anti-Spoofing)

**Problem:** `handle_join` trusts client-supplied `role` and `id` for non-courier roles. Any JWT holder can join any room.

**Fix (Backend — `delivery_events.py:handle_join`):**
- Decode JWT server-side to extract the real `sub` (user_id)
- Look up user's `user_type` from the database
- Determine the room entirely from server data — ignore client's `role` and `id`
- Reject if the JWT's user doesn't match the requested role in the DB

**Status:** ✅ Completed — `handle_join` extracts user from JWT's `sub`, looks up `user_type` from DB, assigns rooms server-side; client `role`/`id` ignored

---

## 5. Socket Event Authorization Middleware

**Problem:** Event handlers (`new_order_notification`, `order_status_update`, `courier_location_update`, etc.) don't verify sender permissions.

**Fix (Backend):**
- Create a decorator `@socket_auth_required(roles=[], self_check=False)` that:
  1. Extracts the JWT from the event context
  2. Verifies the user has the required role
  3. For self-check events (location, status), verifies `courier_id` matches JWT's `sub`
- Apply to all sensitive event handlers

**Status:** ✅ Completed — `@socket_auth_required` decorator applied to `new_order_notification`, `order_status_update`, `courier_location_update`, `courier_availability_changed`

---

## 6. Ktor LogLevel Reduction

**Problem:** `LogLevel.BODY` logs full request/response bodies, including JWT tokens. Visible to any app via Logcat.

**Fix (Mobile — `KtorClientFactory.kt:59`):**
- Change `level = LogLevel.BODY` → `level = LogLevel.HEADERS`

**Status:** ✅ Completed — `LogLevel.BODY` → `LogLevel.HEADERS`

---

## 7. Race Condition Protection on Token Refresh

**Problem:** `ensureFreshToken()` is not synchronized. Two simultaneous calls can double-refresh, causing the server to blacklist the first refresh token.

**Fix (Mobile — `SocketManager.kt:108`):**
- Add `@Synchronized` annotation to `ensureFreshToken()`

**Status:** ✅ Completed — `@Synchronized` added to `ensureFreshToken()`

---

## 8. Eliminate Duplicate Disconnect Logic

**Problem:** Both `HttpResponseValidator` and Bearer `refreshTokens` call `TokenManager.clearTokens()` + `onUnauthorized()` on 401, causing double-logout.

**Fix (Mobile — `KtorClientFactory.kt`):**
- Remove the `HttpResponseValidator` block (lines 101-107)
- Let the Bearer auth plugin's `refreshTokens` handle 401 recovery exclusively
- If `refreshTokens` fails (no refresh token or refresh call fails), it already calls `clearTokens()` + `onUnauthorized()`

**Status:** ✅ Completed — `HttpResponseValidator` removed; Bearer auth plugin is the sole 401 handler

---

## 9. Exact Path Matching in sendWithoutRequest

**Problem:** `.contains("/auth/login")` matches `/auth/login-backup` or `/api/auth/login-v2`.

**Fix (Mobile — `KtorClientFactory.kt:94`):**
- Use exact path comparison or a Set of known paths:
  ```kotlin
  sendWithoutRequest { request ->
      val path = request.url.build().encodedPath
      val excluded = setOf("/api/auth/login", "/api/auth/register", "/api/auth/refresh")
      path !in excluded
  }
  ```

**Status:** ✅ Completed — `.contains("/auth/login")` → `path !in setOf("/api/auth/login", ...)`

---

## 10. Limit Reconnection Attempts + Backoff

**Problem:** `reconnectionAttempts = Int.MAX_VALUE` causes infinite retries, draining battery and loading the server.

**Fix (Mobile — `SocketManager.kt:159-162`):**
- Reduce `reconnectionAttempts` to a finite number (e.g., 10)
- Enable Socket.IO's built-in exponential backoff (already configured via `reconnectionDelay`/`reconnectionDelayMax`)
- Add connectivity check before reconnecting (use `ConnectivityManager`)

**Status:** ✅ Completed — `reconnectionAttempts` reduced from `Int.MAX_VALUE` to `10`

---

## 11. Server Extracts courierId from JWT, Not Client

**Problem:** `handle_join` trusts `data.get('id')` for the courier's identity. The server should extract the ID from the JWT.

**Fix (Backend — `delivery_events.py:103,132`):**
- After decoding the JWT, use `decoded['sub']` to get the user ID
- Look up the courier record from the database
- Use the database courier ID for room assignment — ignore client-supplied `id`

**Status:** ✅ Completed (covered by #4) — all roles now derive identity from JWT `sub` + DB lookup

---

## 12. Replace print() with Python Logging

**Problem:** Backend socket code uses `print()` for debugging, which leaks to stdout logs in production.

**Fix (Backend — `delivery_events.py`):**
- Replace all `print()` calls with `logging.getLogger(__name__).info/debug/warning()`
- Configure log levels per environment (DEBUG for dev, INFO/WARNING for prod)

**Status:** ✅ Completed — all `print()` calls replaced with `logger.info()` using Python `logging`

---

## Tracked Issues (Low Priority)

| # | Issue | Current Status |
|---|---|---|
| 13 | JWT decoded without signature on client (`getJwtExpiry`) | Intentional — pre-emptive check only. Server validates signature. |
| 14 | `doOutput = false` in refresh call | Works with current server. Documented for future maintenance. |
| 15 | Wildcard CORS in `__init__.py` | Not the active app factory. Remove to prevent confusion. |
