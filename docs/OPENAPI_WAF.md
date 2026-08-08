# OpenAPI + Validation + WAF (S3)

## רקע

יישום מלא של הרכיבים מתוך משימת S3 ("WAF בפרוקסי · OpenAPI + validation"), אומת מול הקוד ב-2026-08-07:

1. **OpenAPI + request validation** — spec 3.0.3 שנוצר מהנתיבים הרשומים בפועל + בדיקת schemas בזמן ריצה (תשובת 400, לא 422 — שמירת חוזה ה-API הקיים).
2. **WAF (defence-in-depth)** — שלוש שכבות: nginx edge, AWS WAFv2, ומנוע WAF בתוך ה-application עצמו.

גישה מובילה: **`SECURITY_WAF_ENABLED`** — מופעל בפרודקשן, כבוי ב-dev/test.

---

## 1. OpenAPI spec + docs

| רכיב | מיקום | מה עושה |
|------|-------|---------|
| Build spec | `backend/utils/openapi.py` (`build_openapi_spec`) | מייצר spec 3.3 מתוך `app.url_map` (כולל ממיר `<int:...>`), ~255 נתיבים, `securitySchemes` מסוג bearer (`bearerAuth`), פרמטרים int/string |
| JSON endpoint | `GET /api/openapi.json` | spec גולמי (JSON) — `spec_json()` |
| DOCS | `GET /api/docs` | HTML פשוט + link ל-spec; CSP-friendly |
| Registration | `register_openapi(app)` | Blueprint + `app.before_request(validate_api_json)` |
| Exempt | `EXEMPT_PATHS` | `/api/openapi.json`, `/api/docs` ועוד — לא עוברים validation |

## 2. Runtime validation (`before_request`)

`validate_api_json()` (`backend/utils/openapi.py`) מופעל לפני כל בקשה:

1. **JSON safety railings** (`backend/utils/schemas.py`):
   - `MAX_JSON_DEPTH = 64` — מניעת nesting עמוק
   - `MAX_JSON_KEYS = 2000` — מניעת key-flooding
   - `MAX_JSON_BODY_BYTES = 1_048_576` — cap של 1 MiB
2. **Typed schema validation** — registry `REQUEST_SCHEMAS`:
   - `login`, `register`, `verify-token`, `fcm-token`, `consent`
   - `reset-password`, `2fa-verify`, `login-verify`, `courier/schedule`, `orders`
   - schemas סלחנים בכוונה: מפתחות נוספים מתעלמים (ברירת מחדל של pydantic), רוב השדות אופציונליים — כדי לא לשבור את חוזה ה-API
3. **שגיאה** → `400 {"error": "VALIDATION_ERROR", "success": false, ...}`

> הערה: validation מחזיר **400** (ולא 422) כדי להעמיד את החוזה הקיים שצובר 400 על `success: false`.

## 3. WAF in-app (`backend/utils/request_waf.py`)

מנוע rules מקומי, מופעל מ-`middleware/api_security.py` (`_waf_block_check`) — סורק URI, headers וגוף JSON.

| שם rule | תיאור |
|---------|-------|
| `SQLI-*` (UNION-SELECT, SELECT-FROM, INTO, DROP, EQ, CMDSHELL, COMMENT, SLEEP) | SQL injection |
| `XSS-*` (SCRIPT, JSURI, EVENT) | HTML/JS XSS |
| `SSRF-BODY` | URL עם scheme שנשלט ע"י לקוח |
| `TRAV-FILE` | path traversal (`../`) |
| `ANOM-NULLBYTE` | null byte |

נקודה חשובה: `_sensitive(key)` — ערכים של שדות רגישים (password, token, secret...) **לא מסורקים** כדי למנוע false-positives.

בסיס ל-URI מפענח **percent-encoding** (`unquote` + `unquote_plus`) לפני בדיקה.

`SECURITY_WAF_ENABLED` — ב-prod ברירת המחדל היא `True`, אחרת `False`.

## 4. Proxy WAF (nginx) — `infrastructure/proxy/`

| קובץ | פירוט |
|------|-------|
| `nginx.conf` | TLS (port 8443), reverse-proxy, `include waf_uri.conf;` |
| `waf_uri.conf` | rules URI-based (SQLi/XSS/traversal) + `limit_req` |
| `docker-compose.yml` | שירות nginx |
| `README.md` | ריצה מקומית |

## 5. AWS WAFv2 — `infrastructure/terraform/waf/`

| קובץ | פירוט |
|------|-------|
| `main.tf` | WebACL: `AWSManagedRulesCommonRuleSet`, `AWSManagedRulesSQLiRuleSet`, `AWSManagedRulesXSSRuleSet`, IP reputation, rate-based rule, CloudWatch logging (redact `Authorization`) |
| `README.md` | התקנה (apply) וקישור ל-App Runner |

## 6. בדיקות

`backend/tests/test_openapi_validation.py` — **17 בדיקות** (spec תקין, docs 200, schema → 400 VALIDATION_ERROR, JSON safety ועוד). **Suite מלא: 124 PASSED**.

## 7. שבוצע

- [x] סעיפי S3 ב-`MD/תוכנית_פעולה_שיפורים.md` מעודכנים (2026-08-07).
- [ ] לוודא ש-WAF מופעל בהתקנת production (`SECURITY_WAF_ENABLED=True`).

---

## קבצים נוגעים

- `backend/utils/openapi.py` — build spec + validation + endpoints
- `backend/utils/schemas.py` — schemas + registry + JSON railings
- `backend/utils/request_waf.py` — WAF in-app
- `backend/middleware/api_security.py` — `_waf_block_check`
- `backend/app.py` — `SECURITY_WAF_ENABLED` + error handlers
- `infrastructure/terraform/waf/main.tf` — WebACL
- `infrastructure/proxy/*` — nginx edge WAF