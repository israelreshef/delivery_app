# TZIR Delivery App — Comprehensive Technology Audit & Improvement Recommendations

> **Date:** 2026-08-03  
> **Scope:** Full-stack audit (Backend, Frontend, Mobile-Native, Infrastructure)  
> **Related:** `תוכנית_פעולה_שיפורים.md` (Action Plan) — this audit feeds directly into it

---

## 1. Executive Summary

| Area | Status | Risk Level |
|------|--------|------------|
| **Backend (Flask)** | Functional, feature-rich | 🟡 Medium (legacy patterns, SQLite fallback) |
| **Frontend (Next.js 14)** | Modern, typed, component-heavy | 🟢 Low (good practices) |
| **Mobile-Native (Android)** | **Broken build** (kapt/Kotlin 2.1 incompatibility) | 🔴 **Critical** |
| **Mobile-Capacitor** | Configured, not actively built | 🟡 Medium |
| **Infrastructure** | Docker/Compose + AppRunner config | 🟡 Medium (no CI/CD pipeline) |
| **Security** | Partial (Talisman, JWT, RLS, but gaps) | 🟠 High |
| **Data/DB** | SQLAlchemy + SQLite (dev) / PostgreSQL (prod) | 🟡 Medium (auto-migration risky) |

**Key Finding:** The **mobile-native Android build is currently broken** due to `kotlin-kapt` incompatibility with Kotlin 2.1.20 (see Section 13 of Action Plan). This blocks all Android development. The **courier and customer apps share identical HTTP base URLs** pointing to hardcoded IPs over HTTP — a major security gap (S1 in Action Plan).

---

## 2. Technology Stack Inventory

### 2.1 Backend (Python/Flask)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Flask | 3.0.0 | Modern, but monolithic `app.py` (640 lines) |
| ORM | SQLAlchemy | 2.0.23 | Core 2.x style, good |
| Migrations | Flask-Migrate / Alembic | 4.0.5 / 1.13+ | Auto-migration in `app.py` risky |
| DB Driver | psycopg2-binary | 2.9.9 | PostgreSQL production |
| Dev DB | SQLite | Built-in | `delivery.db` (958 MB!) — **huge for dev** |
| Auth | Flask-JWT-Extended | 4.6.0 | HS256, 600k PBKDF2 iterations ✅ |
| 2FA/MFA | pyotp + webauthn | 2.9.0 / 2.0.0 | TOTP + WebAuthn/Passkeys ✅ |
| WebSocket | Flask-SocketIO + gevent | 5.3.5 + 23.9.1 | gevent monkey-patched ✅ |
| Rate Limiting | Flask-Limiter + slowapi | 3.5.0 / 0.1.9 | Partial (only some routes) |
| Security | Flask-Talisman + custom middleware | 1.0.0+ | CSP, HSTS, but `force_https=False` |
| Encryption | cryptography (AES-256) | 42.0.0+ | `EncryptedString` TypeDecorator ✅ |
| Task Queue | APScheduler (backups) | Implicit | No Celery/Redis queue for async tasks |
| Routing | OR-Tools | 9.11.4210 | Route optimization ✅ |
| PDF/Reports | reportlab | 4.0.9 | PDF generation ✅ |
| Geospatial | GeoAlchemy2 + Shapely + geopy | 0.14.3 / 2.0.6 / 2.4.1 | PostGIS ready |

**Architecture Observation:** 40+ blueprints registered in `app.py` — monolithic but modular. No service layer separation; business logic lives in routes.

### 2.2 Frontend (Next.js 14 + React 18)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js | 14.2.35 | App Router (partial), Turbopack ready |
| Language | TypeScript | 5.x | Strict mode on |
| Styling | Tailwind CSS | 3.3.0 | Custom config, design tokens |
| UI Components | Radix UI | 1.x (40+ components) | Headless, accessible ✅ |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 | Validated ✅ |
| State | Zustand | 4.5.0 | Lightweight global store |
| Charts | Recharts | 3.7.0 | Good |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 4.2.1 | Cluster support ✅ |
| Real-time | socket.io-client | 4.7.4 | Matches backend |
| Auth | @react-oauth/google + WebAuthn | 0.13.4 / 13.2.2 | Social + Passkeys |
| Testing | Vitest + Testing Library | 2.1.9 | Configured |
| Mobile Bridge | Capacitor | 8.0.2 | Android/iOS wrapper |

**Strengths:** Modern, typed, accessible components, good DX.  
**Gaps:** No E2E tests (Playwright/Cypress), no Storybook, App Router migration incomplete.

### 2.3 Mobile-Native (Android — Kotlin/Compose)

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| Language | Kotlin | 2.1.20 | **Latest, but breaks kapt** |
| Build | Gradle (KTS) | 8.14.3 | Modern |
| AGP | Android Gradle Plugin | 8.7.2 | Current |
| UI | Jetpack Compose | 1.6.7 / Material3 1.2.1 | Modern declarative UI |
| DI | Hilt | 2.56.2 | **Kapt-based — broken** |
| Database | Room | 2.7.1 | **Kapt-based — broken** |
| Networking | Ktor Client | 2.3.7 | OkHttp engine, Bearer auth |
| Serialization | kotlinx.serialization | (Kotlin plugin) | JSON ✅ |
| Maps | Maps Compose + Play Services | 4.3.3 / 18.2.0 | Google Maps |
| Location | Play Services Location | 21.1.0 | FusedLocationProvider |
| Sockets | socket.io-client (Java) | 2.1.0 | Legacy Java impl |
| Image Loading | Coil | 2.6.0 | Compose-native ✅ |
| Firebase | BOM 32.7.2 | Messaging, Crashlytics | Push + Crash reporting |
| SQLDelight | 2.0.1 | **Deprecated/removed** (archive) |
| Navigation | Navigation Compose | 2.7.7 | Type-safe routes |

**Critical Issue:** `kotlin-kapt` plugin + Room 2.7.1 + Hilt 2.56.2 **do not work with Kotlin 2.1.20**. Build fails with `e: Could not load module <Error module>` and generated code has `Unresolved reference: Int/Boolean`. **Fix: Migrate to KSP** (Section 13 of Action Plan).

**Modules:**
- `courier-android` (courierApp) — Room, Hilt, Maps, Firebase, Sockets
- `customer-android` (customerApp) — No Room/Hilt, simpler, builds OK

### 2.4 Mobile-Capacitor (Hybrid Wrapper)

| Config | Value |
|--------|-------|
| `@capacitor/core` | 8.0.2 |
| Platforms | Android, iOS |
| `capacitor.config.ts` | Present |

**Status:** Configured but not actively built/tested. Frontend PWA could wrap instead.

### 2.5 Infrastructure & DevOps

| Component | Technology | Status |
|-----------|------------|--------|
| Containerization | Docker / Docker Compose | `docker-compose.yml`, `.prod.yml`, `Dockerfile`, `Dockerfile.prod` |
| Orchestration | AWS AppRunner | `apprunner.yaml` present |
| Reverse Proxy | Nginx (implied) | Not in repo |
| CI/CD | **None** | GitHub Actions workflows missing |
| DB | PostgreSQL (prod) / SQLite (dev) | Auto-migrate on startup |
| Redis | Configured for SocketIO | `REDIS_URL` env var |
| Backups | APScheduler + custom script | `utils/backup.py` |
| Logs | File-based + JSON audit | `logs/security.json` |
| Monitoring | None | No Prometheus/Grafana/Datadog |
| Secrets | `.env` files + `SECRET_KEY` env | **No Vault/Secrets Manager** |

---

## 3. Compatibility & Integration Analysis

### 3.1 API Contract (Backend ↔ Frontend/Mobile)

| Aspect | Status | Issues |
|--------|--------|--------|
| REST Endpoints | 40+ blueprints, `/api/*` | No OpenAPI/Swagger spec |
| WebSocket | SocketIO v5 | Events defined in `sockets/`, no schema |
| Auth | JWT (HS256) + Refresh | 60min access / 180d refresh — **too long** |
| CORS | Hardcoded localhost:3000 | Prod frontend URL via env only |
| Error Format | JSON `{error, message, error_id}` | Consistent ✅ |
| Versioning | None | `/api/` no version prefix |

### 3.2 Mobile ↔ Backend Integration

| Component | Courier App | Customer App |
|-----------|-------------|--------------|
| Base URL | `http://10.0.2.2:5000` (emu) / `http://192.168.33.18:5000` (device) | Same |
| **Protocol** | **HTTP** (no TLS) | **HTTP** (no TLS) |
| Auth | Bearer JWT + Auto-refresh | Bearer JWT + Auto-refresh |
| Sockets | SocketIO (custom `SocketManager`) | SocketIO (custom `SocketManager`) |
| Push | Firebase Messaging | Not implemented |
| Cert Pinning | **Missing** | **Missing** |

**Critical:** Both apps use **hardcoded HTTP IPs**. No HTTPS, no certificate pinning. This is **S1 blocker** in Action Plan.

### 3.3 Database Compatibility

| Env | DB | Driver | Issues |
|-----|-----|--------|--------|
| Dev | SQLite (`delivery.db`) | Built-in | 958 MB file, no PostGIS, RLS not tested |
| Prod | PostgreSQL | psycopg2 | `config.py` handles `postgres://` → `postgresql://` |
| Migrations | Alembic + auto-migrate in `app.py` | | Auto-migration runs on **every startup** — risky |

---

## 4. Security Gap Analysis (Maps to Action Plan S1–S8)

| Control | Current State | Gap | Action Plan Ref |
|---------|---------------|-----|-----------------|
| **TLS/HTTPS** | ❌ HTTP only (hardcoded IPs) | No certs, no pinning, no HSTS on mobile | **S1** — Critical |
| **MFA** | Backend ✅ (TOTP + WebAuthn) / Frontend ✅ / Mobile ❌ | Mobile login has no MFA flow | **S2** |
| **Rate Limiting** | Partial (slowapi + Flask-Limiter on auth/addresses/orders only) | Not global, no per-user/IP quotas | **S3** |
| **Secrets Management** | `.env` files, hardcoded fallbacks (`dev-device-hmac-key`, `dev-secret-key`) | No Vault, no rotation | **S4** |
| **PII/Privacy** | Backend routes exist (`/api/privacy/*`) / Mobile ❌ | No consent UI, no data minimization | **S5** |
| **Mobile Hardening** | SecurityEnforcer (root/emu detect) / SecureStorage (Keystore) | No RASP, no anti-tamper, no pinning | **S6** |
| **SAST/DAST** | None in CI | No automated security testing | **S7** |
| **Incident Response** | Audit log (DB + JSON) / No playbook | SIEM missing, no 72h notification | **S8** |

---

## 5. Code Quality & Architecture Debt

### 5.1 Backend
- **Monolithic `app.py`** (640 lines) — creates app, registers 40+ blueprints, runs migrations, seeds data, starts scheduler
- **Auto-migration on every startup** — `ALTER TABLE` in `before_request` context; race conditions possible
- **Business logic in routes** — No service layer; hard to test, reuse
- **Large `models.py`** (2000+ lines) — All models in one file
- **Duplicate blueprint registration** — Lines 66-70 and 386-394 register same blueprints twice
- **Encoding issues** — Hebrew text shows `ג` artifacts in logs

### 5.2 Frontend
- **App Router migration incomplete** — Mix of Pages and App router
- **No API client layer** — `axios` used directly in components
- **SocketIO wrapper** — Custom hook, no reconnection strategy visible
- **Tailwind config** — Custom but no design token system (colors hardcoded in components)

### 5.3 Mobile-Native
- **Broken build** — KAPT/Kotlin 2.1 incompatibility (see Section 13)
- **Duplicate `KtorClientFactory`** — Courier & Customer each have own copy with hardcoded URLs
- **No shared module** — `:shared` was removed (archived), but common code (models, network) duplicated
- **Hardcoded IPs** — `resolveBaseUrl()` returns literal IPs over HTTP
- **Room + Hilt via kapt** — Deprecated path, blocks Kotlin 2.1+

---

## 6. Improvement Recommendations (Priority Order)

### 🔴 CRITICAL (Do First — Blockers)

| # | Action | Effort | Action Plan Ref |
|---|--------|--------|-----------------|
| 1 | **Migrate KAPT → KSP** (courier-android) | 1-2 days | Section 13 |
| 2 | **HTTPS + Cert Pinning for Mobile** (both apps) | 2-3 days | S1 |
| 3 | **Remove hardcoded HTTP IPs** — use `BASE_URL` env / config | 1 day | S1 |
| 4 | **Fix duplicate blueprint registration** in `app.py` | 30 min | Code quality |

### 🟠 HIGH (Security & Stability)

| # | Action | Effort | Action Plan Ref |
|---|--------|--------|-----------------|
| 5 | Mobile MFA flow (TOTP/WebAuthn) | 3-5 days | S2 |
| 6 | Global rate limiting + per-user quotas | 2 days | S3 |
| 7 | Secrets → Vault / AWS Secrets Manager | 2 days | S4 |
| 8 | Mobile consent/privacy screens | 2 days | S5 |
| 9 | Add SAST (Semgrep) + DAST (OWASP ZAP) to CI | 2 days | S7 |
| 10 | Incident response playbook + SIEM | 3 days | S8 |

### 🟡 MEDIUM (Architecture & DX)

| # | Action | Effort | Action Plan Ref |
|---|--------|--------|-----------------|
| 11 | Extract service layer from routes | 1-2 weeks | Code quality |
| 12 | Split `models.py` into modules | 2 days | Code quality |
| 13 | OpenAPI/Swagger spec generation | 2 days | API contract |
| 14 | Shared Kotlin module (models, network, constants) | 3 days | Mobile |
| 15 | Capacitor → PWA or drop (unused) | 1 day | Mobile |
| 16 | CI/CD pipeline (GitHub Actions) | 3 days | Infrastructure |
| 17 | PostgreSQL dev environment (docker-compose) | 1 day | Data/DB |
| 18 | E2E tests (Playwright) | 3 days | Frontend |
| 19 | Storybook for component library | 2 days | Frontend |
| 20 | Design token system (Tailwind + Compose) | 2 days | UI consistency |

### 🟢 LOW (Nice to Have)

| # | Action | Effort |
|---|--------|--------|
| 21 | Feature flags (LaunchDarkly/Unleash) | 1 week |
| 22 | Chaos engineering / Game Days | Ongoing |
| 23 | Performance budgets + monitoring | 2 weeks |

---

## 7. Mapping to `תוכנית_פעולה_שיפורים.md`

| Action Plan Section | Audit Finding | Status |
|---------------------|---------------|--------|
| **0. Security/Compliance** | S1–S8 gaps confirmed; S1 (HTTPS) & S4 (secrets) most critical | 🔴 Start here |
| **1. Pension/Study Fund** | Backend models exist; UI needs fields | ✅ Ready |
| **2. Route Planner Brand Colors** | Courier `RoutePlannerScreen` uses Obsidian palette | 🟡 In progress |
| **3. Calendar Tap-to-Create** | Backend GET exists; POST + UI missing | 🟡 Ready to build |
| **4. Courier Title (not "Premium")** | Hardcoded in `SettingsScreen` | ✅ Quick fix |
| **5. Day/Night Theme** | Hardcoded dark colors; Light theme exists but disconnected | 🟡 Medium |
| **6. Profile Image** | Backend upload exists; Mobile UI missing | 🟡 Medium |
| **7. Tax Forms/Reports** | Backend generators exist (reportlab); Mobile UI missing | 🟢 Large |
| **8-12. Hardening/Compliance/Zero Trust** | This audit confirms all gaps | 🔴 Start with S1, S4 |

**Key Insight:** The Action Plan's **Sections 0, 13, and S1 are prerequisites** for everything else. You cannot reliably develop features on a broken build (13) or insecure transport (S1).

---

## 8. Recommended Next Steps (Immediate)

1. **Today:** Execute Section 13 — KAPT → KSP migration (unblocks Android)
2. **Today-Tomorrow:** Execute S1 — HTTPS + Pinning for both mobile apps (config + `network_security_config.xml`)
3. **This Week:** Fix `app.py` duplicate blueprints; add `BASE_URL` env to mobile apps
4. **This Week:** Set up GitHub Actions CI (build + test + Semgrep)
5. **Next Week:** Mobile MFA flow; Global rate limiting; Secrets Manager

---

## Appendix: Key Files to Modify First

| File | Change |
|------|--------|
| `mobile-native/courier-android/build.gradle.kts` | KAPT → KSP (Section 13) |
| `mobile-native/gradle/libs.versions.toml` | Add KSP version/plugin |
| `mobile-native/courier-android/.../network/KtorClientFactory.kt` | HTTPS base URL + pinning |
| `mobile-native/customer-android/.../network/KtorClientFactory.kt` | HTTPS base URL + pinning |
| `mobile-native/courier-android/.../res/xml/network_security_config.xml` | **Create** — Cert pinning config |
| `mobile-native/customer-android/.../res/xml/network_security_config.xml` | **Create** — Cert pinning config |
| `backend/app.py` | Remove duplicate blueprint registration (lines 66-70 vs 386-394) |
| `backend/config.py` | Use for `BASE_URL` env propagation |
| `.github/workflows/ci.yml` | **Create** — Build, test, Semgrep, lint |

---

*This audit should be reviewed alongside `תוכנית_פעולה_שיפורים.md`. The Action Plan provides the "what" and "when"; this audit provides the "why" and technical details.*