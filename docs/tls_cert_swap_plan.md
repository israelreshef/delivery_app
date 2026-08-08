# TLS – תעודה עצמית ב-dev והחלפה עתידית (S6/S1)

## מטרה

השרת הנוכחי (פיתוח) מריץ **HTTPS עם תעודה חתומה עצמית** (mini-CA פנימי). המעבר לשרת אחר /
תעודה אמיתית יהיה **שינוי קונפיג בלבד — בלי שינוי קוד אחד**.

## עקרון ההנדסה

- הקוד **לא מכיר** תעודות: `KtorClientFactory` בונה את ה-base URL מתוך `BuildConfig` (`BACKEND_SCHEME`/`BACKEND_HOST`/`BACKEND_PORT`), ו-SocketManager יורש ממנו (→ `wss://` אוטומטית).
- האמון בתעודה העצמית מוגדר ב-`network_security_config.xml` (resource), **לא בקוד Kotlin**.
- ה-TLS בשרת נטען לפי `TZIR_TLS_CERT/TZIR_TLS_KEY` (env) — החלפת קבצים בלבד.

## מה קיים (2026-08-07)

| קובץ | תפקיד |
|---|---|
| `infrastructure/proxy/certs/tzir-dev-ca.crt/.key` | mini-CA פנימי (dev בלבד, לא ב-git) |
| `infrastructure/proxy/certs/tzir.crt/.key` | תעודת שרת חתומה ע"י ה-CA, SANs: `localhost`/`127.0.0.1`/`192.168.33.13`/`10.0.2.2` |
| `backend/app.py` (`_tls_context`) | בונה `ssl.SSLContext` מה-env (או None) |
| `backend/.env.example` | דוגמת `TZIR_TLS_CERT/TZIR_TLS_KEY` |
| `mobile-native/*-android/.../KtorClientFactory.kt` | base URL = `BACKEND_SCHEME://host:BACKEND_PORT` |
| `mobile-native/*-android/.../network_security_config.xml` | `cleartext=false` + trust ל-`@raw/tzir_dev_ca` ב-dev hosts בלבד |
| `mobile-native/*-android/src/main/res/raw/tzir_dev_ca.pem` | ה-CA הציבורי (חתום עצמית) — **נקודת החלפה** |
| `infrastructure/proxy/nginx.conf` | TLS termination (8443) עם `certs/tzir.crt|key` |

## מצב נוכחי

1. השרת התחיל עם `TZIR_TLS_CERT`/`TZIR_TLS_KEY` → `https://<host>:5001` (ובדיקות: `https_status=200`, `http_status=000`).
2. `pytest`: **124 passed**.
3. Unit tests Android (KtorClientFactory): **SUCCESS**.

## מעבר עתידי

### תרחיש A — שרת dev אחר (אותה תשתית)
1. יוצר תעודת שרת חדשה עם אותו CA:
   ```
   openssl req -newkey rsa:2048 -nodes -keyout tzir.key -out tzir.csr
     -subj "/CN=<new-host>" -addext "subjectAltName=IP:<new-ip>,DNS:<hostname>"
   openssl x509 -req -in tzir.csr -CA tzir-dev-ca.crt -CAkey tzir-dev-ca.key -CAcreateserial -days 365 -sha256 -extfile server_ext.cnf -out tzir.crt
   ```
2. החלפת `certs/tzir.crt|key` + `nginx reload` (או env vars ל-Flask).
3. **אין שינוי באפליקציות** — האמון עובר אוטומטית (אותו CA ברשימה).

### תרחיש B: פרודקשן עם תעודה אמיתית
1. **Server:** החלפת `tzir.crt/tzir.key` בקבצי התעודה מה-CA האמיתי, והצביעת env vars/nginx אליהם.
2. **Android:** החלפת `res/raw/tzir_dev_ca.pem` ב-public cert של ה-CA האמיתי (או מחיקת ה-`domain-config` מה-`network_security_config.xml` כשהשרת מגיע דרך domain ציבורי). לא נוגעים בקוד Kotlin.
3. **build config** (שינוי condition):
   ```
   ./gradlew :courierApp:assembleDebug -PbackendHost=api.domain.com -PbackendScheme=https -PbackendPort=443
   ```
4. **WebSocket** עובר ל-`wss://` אוטומטית.

### CSI/צ'ק
- `curl -kv https://<host>:8443/api/health` (nginx) או `:5001` (Flask) — ללא `-k` לא אמור להיכשל כשהאמון מוגדר נכון ב-device.
- login מלא ב-emulator/מכשיר + בדיקת WebSocket rooms.

## אזהרות
- ה-`tzir-dev-ca.key` הוא **רגיש** — אם הוא דולף, כל אמון ה-dev נזרק. ממוקם ב-`infrastructure/proxy/certs/` (ב-.gitignore).
- ל-production לא נשתמש ב-mini-CA — תעודה אמיתית.
- `debug-overrides` ב-network_security_config נשארים ל-debug בלבד (user CAs).