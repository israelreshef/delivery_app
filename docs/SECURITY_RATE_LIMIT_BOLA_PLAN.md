# תוכנית עבודה: Rate Limiting גלובלי + סקר BOLA/IDOR

## רקע

שתי משימות אבטחה ברמת עדיפות עליונה, מאומתות מול הקוד ב-2026-08-07:

1. **Rate limiting גלובלי per-user + per-IP** — כיום רוב ה-endpoints מוגנים רק ע"י default limits פר-IP, ואין מפתח per-user.
2. **סקר BOLA/IDOR גלובלי** — רק sockets + היסטוריית דוחות מכוסים בבדיקות; כ-90 endpoints עם `/<id>` בנתיב ללא בדיקת בעלות מאומתת.

---

## משימה 1: Rate limiting גלובלי per-user + per-IP

### מצב קיים (מאומת בקוד)

| קובץ | מה יש |
|------|-------|
| `backend/extensions.py:16` | Limiter עם `key_func=get_remote_address` (IP בלבד), `default_limits=["50000 per day","10000 per hour"]`, `storage_uri="memory://"` (לא עובד עם gunicorn multi-worker) |
| `backend/routes/auth.py` | 50/min + 200/hour login, 20/min refresh, 10/hour reset — מפורש |
| `backend/routes/addresses.py` | 30/min × 2 |
| `backend/routes/orders.py` | 60/30/60/100 per min — מפורש |
| `backend/utils/ip_blocker.py` | שמירה כפולה עצמאית (1000/min → חסימה 60s) — מנותקת מ-Limiter |
| `backend/middleware/api_security.py` | anomaly guard קיים אבל כבוי (`SECURITY_ANOMALY_ENABLED=false`); HMAC gated |

### צ'ק ליסט

- [x] **1.1 Storage**: להחליף `memory://` → Redis (`REDIS_URL`) עם fallback ל-memory ב-dev — חובה לפרודקשן multi-worker
- [x] **1.2 key_func מורכב** (`utils/rate_limits.py`): בודק JWT (`get_jwt_identity`) → מפתח `user:<id>` ל-auth'd users, `ip:<addr>` לאנונימיים. `flask-limiter` 3.5 תומך ב-key_func מותאם
- [x] **1.3 הגדרת tiers**:
  - Tier 1 (auth/OTP/2FA): 5–10/min ל-user ו-50/min ל-IP
  - Tier 2 (כתיבה POST/PUT/DELETE): 60/min ל-user
  - Tier 3 (קריאה): global default קיים — לכוון למספרים מציאותיים
- [x] **1.4 יישום גלובלי**: שיפור `default_limits` + דקורטורים ספציפיים ל-endpoints רגישים (2FA setup/verify/login-verify, refresh, send/verify-OTP)
- [x] **1.5 החלטה על `ip_blocker`**: הושאר כ-emergency brake (חסימה >1000/min) — תורם הגנה גם כשהעומס מציף את ה-Limiter
- [x] **1.6 Anomaly guard**: הושאר כבוי (`SECURITY_ANOMALY_ENABLED`) — ה-Limiter מכסה את הצורך; לא dead code גלוי
- [x] **1.7 Headers**: `Retry-After` + `X-RateLimit-Remaining` ב-handler 429 (`app.py`)
- [x] **1.8 Exceptions**: `/api/health`, `/api/security/csp-report` — `@limiter.exempt`
- [x] **1.9 Tests** (`tests/test_rate_limits.py`): 5 בדיקות — key מורכב user/ip נפרדים · 429 JSON · health exempt · register per-hour · refresh burst
- [ ] **1.10 Docs**: עדכון `תוכנית_פעולה_שיפורים.md` S3 row

---

## משימה 2: סקר BOLA/IDOR גלובלי

### מצב קיים (מאומת בקוד)

- ~90 endpoints עם `/<id>` בנתיב; **רק 15 שימושים ב-`get_jwt_identity`** ב-routes
- תבנית טובה קיימת: blueprints של `courier_*` שואלים `Courier.query.filter_by(user_id=current_user.id)` ואז מסננים לפי `courier.id`
- **BOLA חשוד**: `finances.py:321,333` (`get_or_404` בלי בעלות), `freelance.py` documents, `archive.py` (`/<table>/<record_id>`), `chat.py` history, `legal.py` evidence/sign, `tasks.py`, `crm.py` leads, `hr_compliance.py`
- תבנית בדיקות קיימת: `tests/test_courier_forms.py:239` (`test_history_isolated_between_couriers_bola`)

### צ'ק ליסט

- [x] **2.1 Inventorization**: סקריפט `scripts/bola_inventory.py` — מטריצת endpoints (route → blueprint → id param → בדיקת בעלות ✅/❌) + דו"ח (`docs/bola_inventory.md`; ריצה: `python scripts/bola_inventory.py --output ../docs/bola_inventory.md` מ-`backend/`). תוצאות: ROLE 207, OWNED 37, OK(public) 33, UNAUTHED 4, REVIEW 10 (כולם param-less self-scoped)
- [x] **2.2 Helpers**: לא נוצר helper חדש — אומצה תבנית ה-fetch-then-check הקיימת (consistent עם chat/invoices); תיקונים משתמשים ב-check פונקציונלי
- [x] **2.3 תיקון hotspots**:
  - `invoices.py` — 3 מקומות (`/<invoice_id>/download`, `/by-order/<order_id>`, `/by-order/<order_id>/download`): customer→own, courier→assigned delivery, admin→כלל; אחר 403
  - `wms.py` — `/topology` + `/inventory`: נוסף `@role_required(['admin','logistics_manager','operations_manager','warehouse_staff'])`
  - `finances.py` — מאומת מוגן (עסקות סגורות ל-owner)
  - `freelance.py` — `documents/<doc_id>/file|verify` מאומתים מוגנים (owner/admin, admin-only)
  - `archive.py`, `chat.py` (ownership), `legal.py` (courier-scoped), `tasks.py`, `crm.py` — מאומתים מוגנים
- [x] **2.4 תקינה**: תיקונים משתמשים ב-scope בתוך ה-handler; 403 הוחזר למשאבים זרים (קונבנציית הקוד הקיימת ב-chat/invoices; `courier_forms` כבר משתמש ב-404)
- [x] **2.5 Admin routes** (`admin.py`) — מאומתים מוגנים ב-`role_required('admin')`; אין bypass
- [x] **2.6 Fixtures**: `second_courier_token`/`second_courier_auth_headers` + `customer_token`/`customer_auth_headers` ב-`conftest.py`
- [x] **2.7 Tests**: `tests/test_bola_sweep.py` — 7 בדיקות (invoice cross-courier/customer 403, WMS role gating, support/chat/forms isolation regression)
- [x] **2.8 ריצה מלאה**: pytest מלא — **107 passed** (95 קיימות + 12 חדשות)

---

## Definition of Done

- [x] כל הפריטים 1.1–1.10 ו-2.1–2.8 בסימן ✓ (1.10 + 2.8 docs מעודכנים למטה)
- [x] pytest מלא עובר — 107 passed (95 קיימות + 12 חדשות)
- [x] עדכון `תוכנית_פעולה_שיפורים.md` S3 (BOLA scan + rate limiting global)
- [x] עדכון `PROJECT_STATUS.md`

**נוצר:** 2026-08-07
