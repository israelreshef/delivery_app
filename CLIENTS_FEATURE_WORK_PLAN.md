# תוכנית עבודה: Clients API - ניהול לקוחות באפליקציית השליח
## גרסה מעודכנת (2026-07-15) — **הכל מומש** ✅

---

## רקע: 2 שכבות לקוחות

| סוג | מקור | מידע | גישה |
|-----|------|------|------|
| **לקוחות אישיים (My Clients)** | ניהול עצמי של השליח | שם, טלפון, כתובות, הערות, היסטוריה, תגיות VIP/עסק | CRUD מלא |
| **לקוחות מערכת (Delivery Clients)** | משלוחים שביצע דרך הפלטפורמה | רק פרטי איסוף/מסירה + טלפון מהמשלוח | קריאה בלבד, מידע מוגבל |

---

## סטטוס מימוש

### יום 1: Backend - CourierContact Model + API ✅

- [x] **`CourierContact` model** ב-`backend/models.py` (line 1798)
- [x] `role_required` / `permission_required` — leverages קיים
- [x] **Migration** — `migrations/versions/350b3de640fc_init.py`
- [x] **Blueprint** `backend/routes/courier_clients.py` — רשום ב-`app.py` (line 309-310)
- [x] CRUD (`@role_required('courier')`):
  - `GET /api/courier/my-clients` (pagination, search, filter by tag/VIP/business)
  - `POST /api/courier/my-clients`
  - `GET /api/courier/my-clients/<id>`
  - `PUT /api/courier/my-clients/<id>`
  - `DELETE /api/courier/my-clients/<id>`
- [x] `GET /api/courier/my-clients/<id>/orders` — היסטוריית הזמנות
- [x] `POST /api/courier/my-clients/<id>/quote` — הצעת מחיר (יוצר אירוע + CustomerTask)
- [x] `POST /api/courier/my-clients/<id>/contact-log` — תיעוד אינטרקציה

### יום 2: Backend - Delivery Clients + Mobile Data Layer ✅

- [x] `GET /api/courier/delivery-clients` — לקוחות ייחודיים ממשלוחי השליח
- [x] Mobile: `model/CourierContact.kt` + `model/DeliveryClient.kt` + `model/QuoteRequest.kt`
- [x] Mobile: `DeliveryApi.kt` — 6 methods signatures
- [x] Mobile: מימוש ב-`DeliveryApiImpl.kt`

### יום 3: Mobile - Repository + Room + ClientsScreen ✅

- [x] `repository/ContactRepository.kt`:
  - StateFlows: `myClients`, `deliveryClients`, `isOffline`
  - CRUD + fallback ל-Room
- [x] Room: `ContactEntity.kt` + `ContactDao.kt` + הרשמה ב-`TzirDatabase.kt`
- [x] `ClientsScreen.kt` — 2 טאבים (**"לקוחות אישיים"** + **"מהמערכת"**)
- [x] החלפת `sampleClients` → StateFlow מ-ContactRepository
- [x] AddClientDialog → API call
- [x] QuoteDialog → API call

### יום 4: Mobile - Client Detail View (CRM-Style) ✅

- [x] **ClientDetailScreen.kt** — מסך מלא בהשראת `customer-card.html`:
  - **חלק עליון**: אווטאר, שם, תגיות VIP/עסק, סטטוס
  - **KPI מהירים**: משלוחים, הכנסות, ממוצע
  - **פרטי קשר**: טלפון (חיוג ישיר), אימייל, כתובות
  - **היסטוריית הזמנות** (רשימה)
  - **הערות** (חופשיות, עם תאריך)
  - **כפתורי פעולה**: שיחה, SMS, הצעת מחיר, תיעוד, משימה
- [x] Delivery Clients: לחיצה → הצגת פרטי המשלוח המקורי
- [x] Filtering/Sorting: חיפוש, VIP, עסק — FilterChips ב-ClientsScreen

### יום 5: Offline + CRM Connection + Testing ✅

- [x] Room cache complete: store/read contacts offline, sync on reconnect
- [x] UiState (Loading / Success / Error / Empty) בשני המסכים
- [x] **CustomerTask** — נוצר אוטומטית ב-follow-up (AuditLog + Task + WebSocket)
- [x] Navigation integration בתפריט — `showClients` + `selectedClient` ב-NavGraph
- [x] Cleanup: `sampleClients` הוסר

---

## הערות מימוש

- **ClientsScreen** — 3 טאבים: "הרשימה שלי" (לקוחות אישיים), "משלוחים" (Delivery Clients), "סטטיסטיקה"
- **Quote endpoint** — `POST /api/courier/my-clients/<id>/quote` — נוסף ל-backend, שומר הערה + מעדכן last_interaction
- **DeliveryApiImpl** — בתוך `DeliveryApi.kt` (לא בקובץ נפרד)
- **10 methods** ב-DeliveryApi לניהול לקוחות (לא 6)

---

## התאמה ל-CRM Customer Card קיים

העיצוב ב-`work in progress/customer-card.html` שימש בסיס. ההתאמה למובייל:

| רכיב מה-HTML | סטטוס במובייל |
|---------------|--------------|
| 3 עמודות: Identity / Content / Tasks | מותאם למסך אנכי ב-ClientDetailScreen |
| KPI Grid | ✅ ממומש: משלוחים, הכנסות, VIP |
| Timeline פעילות | ✅ ContactLog |
| טבלת הזמנות | ✅ היסטוריית הזמנות עם סטטוס |
| משימות + עדיפויות | ✅ CustomerTask |
| Tags VIP/עסק/אזור | ✅ תגיות חופשיות |

---

## תשתיות קיימות שנוצלו

| תשתית | שימוש |
|-------|-------|
| `@role_required('courier')` | אבטחת כל ה-endpoints |
| `CustomerTask` | משימת פולו-אפ אוטומטית |
| `CustomerContactLog` | תיעוד שיחות/אינטרקציות |
| `Notification` (WebSocket + Push) | התראות על אינטרקציות |
| `Room` | Offline cache |

---

## קבצים שנוצרו/שונו

### Backend
| קובץ | פעולה |
|------|--------|
| `backend/models.py` | ✅ `CourierContact` model (line 1798) |
| `backend/routes/courier_clients.py` | ✅ Blueprint (CRUD + orders + quote + contact-log + tasks) |
| `backend/app.py` | ✅ הרשמה |

### Mobile
| קובץ | פעולה |
|------|--------|
| `model/CourierContact.kt` | ✅ |
| `model/DeliveryClient.kt` | ✅ |
| `model/QuoteRequest.kt` | ✅ |
| `network/DeliveryApi.kt` | ✅ 10 methods (interface + implementation באותו קובץ) |
| `repository/ContactRepository.kt` | ✅ |
| `database/ContactEntity.kt` | ✅ |
| `database/ContactDao.kt` | ✅ |
| `database/TzirDatabase.kt` | ✅ הרשמה |
| `ui/courier/ClientsScreen.kt` | ✅ שיפוץ מלא |
| `ui/courier/ClientDetailScreen.kt` | ✅ מסך CRM מלא |
| `MainActivity.kt` | ✅ DI |

---

## סיכום

**הפרויקט הושלם במלואו.** כל 5 הימים יושמו:
- Backend: model + 11 endpoints (CRUD + orders + contact-log + tasks + quote) + migration + blueprint
- Mobile: 4 models + 10 API methods + Repository + Room + 2 screens (ClientsScreen — 3 tabs + ClientDetailScreen CRM)
- DI: Hilt modules + NavGraph + MainActivity
