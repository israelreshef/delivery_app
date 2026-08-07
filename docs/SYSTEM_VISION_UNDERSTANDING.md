# הבנת המערכת - TZIR Delivery Platform
## תיאור מקיף של הארכיטקטורה, החזון והאסטרטגיה

---

## 1. מה המערכת הזו?

**TZIR Delivery** היא פלטפורמת שליחויות דו-כיוונית:

1. **פלטפורמת הזמנות** - לקוחות מזמינים משלוחים, שליחים מבצעים אותם
2. **כלי ניהול עסקי לשליחים** - השליח מנהל את כל העסק שלו מתוך האפליקציה

החדשנות היא בשילוב: אותו שליח יכול לקבל משלוחים מהפלטפורמה **וגם** לנהל את הלקוחות הפרטיים שלו, הלו"ז האישי, החשבוניות, ההוצאות - הכל במקום אחד.

---

## 2. ארכיטקטורת המערכת

```
┌──────────────────────────────────────────────────────────────┐
│                    ADMIN WEB (Next.js)                       │
│  /admin/customers · /admin/tasks · /admin/support            │
│  /admin/users · /admin/groups · /admin/analytics             │
│  CRM Customer Card (עיצוב קיים: customer-card.html)          │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────────────┐
│                   BACKEND (Python/Flask)                      │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Routes                                            │  │
│  │  ├─ /api/auth/*          ─── אימות + JWT               │  │
│  │  ├─ /api/orders/*        ─── הזמנות (system)           │  │
│  │  ├─ /api/couriers/*      ─── שליחים, מיקום, סטטיסטיקות │  │
│  │  ├─ /api/customers/*     ─── CRM לקוחות (admin)         │  │
│  │  ├─ /api/courier/my-clients/* ── לקוחות אישיים (שליח)   │  │ ← NEW
│  │  ├─ /api/academy/*       ─── קורסים, בחינות            │  │
│  │  ├─ /api/payments/*      ─── תשלומים (חסר)              │  │
│  │  ├─ /api/support/*       ─── קריאות שירות              │  │
│  │  ├─ /api/tasks/*         ─── CustomerTask + משימות      │  │
│  │  ├─ /api/crm/*           ─── leads, pipeline            │  │
│  │  └─ /api/gamification/*  ─── XP, leaderboard            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Database Layer                                       │  │
│  │  ├─ PostgreSQL ─── Users, Orders, Customers, Tasks,   │  │
│  │  │                 Couriers, Payments, Academy, etc.   │  │
│  │  ├─ Redis ──────── Cache + Socket.IO adapter          │  │
│  │  └─ File Store ─── POD images, customer files         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Security & Permissions                                │  │
│  │  ├─ @token_required ─── JWT verification               │  │
│  │  ├─ @role_required ──── admin, courier, customer,      │  │
│  │  │                      support, sales, finance        │  │
│  │  ├─ Group/Permission ─── fine-grained RBAC             │  │
│  │  └─ Audit Trail ──────── כל שינוי מתועד               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP + WebSocket
         ┌─────────────────┼─────────────────────┐
         │                 │                     │
┌────────▼──────┐  ┌──────▼──────────┐  ┌──────▼──────────┐
│ COURIER APP   │  │ CUSTOMER APP    │  │ REALTIME ENGINE │
│ (Android)     │  │ (Android)       │  │ (Go)            │
│               │  │                 │  │                 │
│ Kotlin        │  │ Kotlin          │  │ Socket.IO       │
│ Jetpack       │  │ Jetpack         │  │ Location        │
│ Compose       │  │ Compose         │  │ Broadcast       │
│ MVVM          │  │                 │  │ Order Updates   │
│ Room DB       │  │                 │  │ Notifications   │
│ Location      │  │                 │  │                 │
│ Service       │  │                 │  │                 │
│ WebSocket     │  │                 │  │                 │
└───────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 3. מודל הנתונים המרכזי

### ישויות קיימות (רשימה חלקית)

```
User (משתמשים)
├── role: admin / courier / customer / support / sales / finance
├── groups: Group[] (many-to-many via UserGroup)
└── permissions: Permission[] (via groups)

Courier (שליחים)
├── user_id → User
├── level: 1-5 (Academy)
├── vehicle_type, is_available
├── current_location
├── rating, total_deliveries, total_earnings
├── documents, certifications
└── contacts: CourierContact[] ← NEW

Customer (לקוחות מערכת)
├── full_name, company_name, phone, email
├── customer_type: private / business
├── tax_id, vat_status, payment_terms
├── credit_limit, balance
├── total_orders, rating
├── tags, lead_source
├── addresses, files, notes
└── tasks: CustomerTask[]

CourierContact (לקוחות אישיים של השליח) ← NEW
├── courier_id → Courier
├── name, company, phone, email
├── addresses: JSON[], tags: JSON[]
├── is_vip, is_business
├── notes
├── total_deliveries, total_revenue
└── last_interaction

Delivery (משלוח)
├── courier_id → Courier
├── customer_id → Customer (אם מהמערכת)
├── pickup_address, dropoff_address
├── status: available → accepted → picked_up → delivered
├── proof_of_delivery: photos, signature, OTP
└── customer_rating

CustomerTask (משימות)
├── customer_id → Customer (optional)
├── courier_contact_id → CourierContact (optional) ← NEW
├── title, description, due_date
├── priority: high / medium / low
├── status: open / in_progress / completed / cancelled
├── source: manual / support_ticket / requirements / followup
└── assigned_to → User

SupportTicket (קריאות שירות)
├── submitted_by → User
├── assigned_to → User
├── subject, description
├── status: open / in_progress / resolved / closed
├── priority
└── messages: TicketMessage[]
```

---

## 4. הטיפולוגיה של הלקוחות במערכת

זו הנקודה החשובה ביותר במערכת - ההבחנה בין סוגי הלקוחות:

```
                    ┌──────────────────────────────┐
                    │     SYSTEM CLIENTS           │
                    │  (Customer model - DB)       │
                    │                              │
                    │  לקוחות שהזמינו דרך          │
                    │  הפלטפורמה                   │
                    │                              │
                    │  ● Admin: CRUD מלא           │
                    │  ● שליח: מידע מוגבל בלבד     │
                    │    (רק דרך Delivery)         │
                    └──────────────────────────────┘

                    ┌──────────────────────────────┐
                    │     COURIER'S OWN CLIENTS    │
                    │  (CourierContact model - DB) │
                    │                              │
                    │  הלקוחות האישיים של השליח    │
                    │                              │
                    │  ● השליח: מנהל לבד           │
                    │  ● הפלטפורמה: כלי ניהול      │
                    │  ● אינטגרציות פשוטות בזול    │
                    └──────────────────────────────┘
```

**הכללים:**
- **System Client**: השליח לא יודע מי הזמין. רואה רק פרטי איסוף/מסירה מהמשלוח. המידע נפתח רק דרך דף המשלוח הספציפי.
- **Courier's Own Client**: השליח מנהל בעצמו. הפלטפורמה נותנת כלים (CRM, חשבוניות, תזכורות) אבל לא מתערבת ביחסי העבודה.

---

## 5. החזון: Courier Business OS

השליח אמור להריץ עסק שלם מהאפליקציה:

```
┌─────────────────────────────────────────────────────────┐
│                COURIER APP - BUSINESS OS                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  JOBS       │  │  MY CLIENTS  │  │  SCHEDULE      │ │
│  │  (Platform) │  │  (CRM)       │  │  (Route +      │ │
│  │             │  │              │  │   Calendar)    │ │
│  │  ● System   │  │  ● My list   │  │                │ │
│  │    orders   │  │  ● History   │  │  ● Drag-drop   │ │
│  │  ● My own   │  │  ● Quotes    │  │  ● Auto        │ │
│  │    orders   │  │  ● Tags      │  │    optimize    │ │
│  │  ● Combine  │  │  ● Tasks     │  │  ● Breaks      │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  FINANCE    │  │  VEHICLE     │  │  ACADEMY       │ │
│  │             │  │              │  │                │ │
│  │  ● Earnings │  │  ● Fleet     │  │  ● Courses     │ │
│  │  ● Invoices │  │  ● Expenses  │  │  ● Exams       │ │
│  │  ● Payments │  │  ● Insurance │  │  ● Levels      │ │
│  │  ● Reports  │  │  ● Fuel      │  │  ● Certs       │ │
│  │  ● Taxes    │  │  ● Services  │  │  ● Gamification│ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  DOCUMENTS  │  │  SUPPORT     │  │  SETTINGS      │ │
│  │             │  │              │  │                │ │
│  │  ● PODs     │  │  ● Tickets   │  │  ● Profile     │ │
│  │  ● Contracts│  │  ● Chat      │  │  ● Bank info   │ │
│  │  ● Receipts │  │  ● FAQ       │  │  ● Availability│ │
│  │  ● Certs    │  │              │  │  ● Notifications│ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. זרימת עבודה אופיינית (User Journey)

### תרחיש א': שליח מקבל משלוח מהפלטפורמה
```
1. התחברות ← Auth API
2. Dashboard ← רואה הזמנות זמינות + סטטיסטיקות
3. בוחר הזמנה ← MissionDetailsScreen (רואה פרטי איסוף/מסירה)
4. מאשר ← MissionProtocolScreen (שלבי ביצוע)
5. אוסף + מספק ← LocationService עוקב ברקע
6. POD ← תמונה/חתימה/OTP
7. סיום ← Earnings מתעדכן
```

### תרחיש ב': שליח עובד מול לקוח אישי
```
1. פותח Clients → My Clients
2. מוסיף לקוח חדש ← CourierContact API
3. יוצר משלוח פרטי ← MissionCreationScreen (מתוזמן ללו"ז האישי)
4. הלקוח מקבל עדכון ← WebSocket/Push
5. השליח מבצע ← אותו Protocol
6. מנפיק חשבונית ← Finance module
7. מתעד שיחה ← ContactLog
```

### תרחיש ג': שליח משלב עבודה (Platform + Personal)
```
1. רואה ב-Schedule: משלוחי פלטפורמה + משלוחים אישיים + הפסקות
2. מערבל Drag-Drop ב-RoutePlanner
3. מקבל הצעת אופטימיזציה אוטומטית
4. לוחץ "Accept Route" ← הכל מתוזמן
5. מבצע ברצף ← LocationService עוקב אחרי כולם
```

---

## 7. מצב נוכחי - מה בנוי ומה חסר

### 🟢 בנוי ועובד
- **Auth** - Login/Register + JWT + roles
- **Orders** - CRUD, status flow, OTP, ratings
- **Location** - Background service, FusedLocationProvider
- **WebSocket** - Socket.IO, location + availability + route updates
- **Academy** - Courses, protocols, quizzes, gamification, Room cache
- **Route Optimization** - Auto + manual
- **Dashboard** - Stats, active orders
- **Missions** - Full flow
- **Documents** - Upload + protocol steps
- **Shift Management** - Start/stop, availability
- **Earnings Display** - Stats + CSV export + Room cache
- **Room Database** - 4 tables (missions, stats, courses, gamification)
- **Address Autocomplete/Geocode** - API connected
- **Gamification** - XP, levels, leaderboard
- **Support Tickets** - Backend + frontend admin
- **Permissions System** - Groups, roles, permissions
- **CustomerTask** - Linked to support tickets, requirements
- **Admin UI** - User management, groups, tasks page
- **Testing Suite** - Backend pytest (smoke, security, auth, privacy)
- **CRM Design** - `customer-card.html` ready

### 🟡 קיים חלקית
- **Clients Screen** - UI exists, mock data (not API connected)
- **WebSocket Events** - Location works, missing event handlers
- **Offline Mode** - Read cache via Room, **no write queue**
- **Expense Tracking** - Screen exists
- **Calendar Sync** - Exists (`CalendarSyncManager`)
- **Profile/Documents** - Connected but basic
- **Support Chat** - Screen exists, messages hardcoded
- **Business Screen** - Exists

### 🔴 חסר לחלוטין
- **Payment System** - No Stripe, no withdrawals, no bank accounts
- **Clients/Contacts API** - No backend model, no API endpoints (THIS WEEK)
- **Invoicing** - No invoice generation for couriers
- **Tax Reports** - No tax calculation
- **Vehicle Management** - Screen exists, no API
- **Push Notification Handling** - FCM registered, routing missing
- **Offline Write Queue** - No WorkManager, no pending actions
- **Hilt DI** - Manual DI in MainActivity
- **Unit/UI Tests** - No mobile tests

---

## 8. אסטרטגיית בנייה מומלצת

### עכשיו (השבוע) - Clients API
```mermaid
gantt
    title שבוע נוכחי
    dateFormat  YYYY-MM-DD
    section Backend
    CourierContact Model + API   :d1, 1d
    Delivery Clients Endpoint    :d2, 1d
    section Mobile
    Data Layer + Repository      :d2, 1d
    ClientsScreen Refactor       :d3, 1d
    Client Detail Screen (CRM)   :d4, 1d
    Offline + Testing            :d5, 1d
```

### הבא - Payment (קריטי)
- Stripe/Razorpay integration
- Withdrawals, balance, history
- Payment methods screen

### חודש הבא - Business Tools
- Invoicing system
- Expense tracking with receipts
- Vehicle management
- Tax reports
- Offline write queue (WorkManager)

### רבעון הבא - Advanced
- Hilt DI refactor
- Full WebSocket integration
- Analytics + Crashlytics
- Unit/UI tests
- Multi-language support

---

## 9. CRM Customer Card - איך זה משתלב

העיצוב ב-`customer-card.html` הוא כרטיס CRM שיועד ל-Web Admin. לדעתי, אותו עיצוב צריך **להתקיים ב-2 מקומות**:

1. **Web Admin** - לניהול לקוחות מערכת (`/admin/customers/<id>`)
   - Full CRM: 3-column layout, timeline, tasks, finance
   - גישה: admin, support, sales

2. **Mobile Courier App** - גרסה מותאמת למובייל
   - **ללקוחות אישיים**: Full CRM (אבל ב-Compose, לא 3-column)
   - **ללקוחות מערכת**: הצגה מוגבלת (פרטי משלוח בלבד)

התאמה למובייל:
- 3-column → Tab-based (Identity Tab | Activity Tab | Finance Tab)
- Dark theme → קיים (`Navy950`, `Amber`, colors)
- Heebo font → זמין ב-Compose
- Timeline → LazyColumn with timeline items
- KPIs → Row of MiniStat cards (כבר קיים ב-ClientsScreen)

---

## 10. סיכום: מה אני מבין שהמערכת אמורה להיות

המערכת היא **לא** סתם אפליקציית שליחויות.

היא **פלטפורמה שמאפשרת לשליחים עצמאיים לנהל עסק שלם**:
- לקבל עבודה מהפלטפורמה
- לנהל לקוחות פרטיים
- לבנות לו"ז שמשלב הכל
- לנהל כספים, הוצאות, חשבוניות
- להתקדם דרך האקדמיה
- ולהרוויח יותר

הפלטפורמה מרוויחה כי:
- השליחים פעילים יותר (כי הכל במקום אחד)
- הם נשארים בפלטפורמה (כי הכלי טוב)
- והם מביאים את הלקוחות הפרטיים שלהם

זהו **B2B2C** - אנחנו נותנים כלים לעסקים קטנים (השליחים) שנותנים שירות ללקוחות שלהם.

---

## נספח: בעיות ידועות ותקלות סביבת פיתוח

לתיעוד מלא של בעיות ידועות, תקלות סביבת פיתוח, ופתרונן — ראה:
📄 [`docs/KNOWN_ISSUES_AND_WORKAROUNDS.md`](../docs/KNOWN_ISSUES_AND_WORKAROUNDS.md)
