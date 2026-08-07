# TZIR Delivery Project - Comprehensive Technical Audit

> **Generated:** 2026-07-16  
> **Repository root:** `C:\Users\israe\delivery_app`  
> **Backend:** Python 3.12 / Flask / PostgreSQL  
> **Mobile:** Kotlin / Jetpack Compose / Ktor  
> **Frontend:** React / Next.js / TypeScript  

---

## 1. Directory Tree & Architecture Overview

```
delivery_app/
├── backend/                          # Python/Flask server
│   ├── app.py                        # Flask app factory, JWT config, blueprint registry
│   ├── config.py                     # Legacy config (NOT used — app.py overrides)
│   ├── extensions.py                 # db, socketio, migrate, jwt, limiter
│   ├── models.py                     # 62 SQLAlchemy models
│   ├── requirements.txt              # Production dependencies
│   ├── requirements-dev.txt          # Test dependencies
│   ├── .env                          # Active environment (PostgreSQL dev config)
│   ├── .env.example                  # Template with all var names
│   ├── alembic/                      # DB migrations (7 versions)
│   ├── routes/                       # 46 route files, ~200 endpoints
│   ├── sockets/                      # Socket.IO event handlers
│   │   ├── __init__.py               # init_sockets()
│   │   ├── delivery_events.py        # 13 delivery WebSocket events
│   │   └── chat_events.py            # 3 chat WebSocket events
│   ├── services/                     # Notifications, messaging, gamification, etc.
│   ├── utils/                        # Decorators, audit, geo, pricing, security
│   ├── middleware/                    # API security, IP blocking
│   ├── tests/                        # 9 pytest test files
│   ├── Dockerfile                    # Python 3.11-slim dev
│   └── Dockerfile.prod               # Python 3.9-slim production
│
├── mobile-native/
│   ├── settings.gradle.kts           # Root: includes :courierApp, :customerApp
│   ├── gradle/wrapper/               # Gradle 8.14.3
│   │
│   ├── courier-android/              # Courier Android App
│   │   ├── build.gradle.kts          # compileSdk=34, minSdk=24, targetSdk=34
│   │   ├── proguard-rules.pro        # 34 lines
│   │   └── src/main/java/com/tzir/delivery/courier/
│   │       ├── TzirCourierApp.kt     # Application class (Hilt)
│   │       ├── MainActivity.kt       # Auth gate + navigation host
│   │       ├── di/                   # Hilt DI modules
│   │       │   ├── DatabaseModule.kt
│   │       │   ├── NetworkModule.kt
│   │       │   ├── RepositoryModule.kt
│   │       │   └── LocationModule.kt
│   │       ├── model/                # Data classes (Auth, Mission, User, etc.)
│   │       ├── network/              # Ktor client + DeliveryApi + TokenManager
│   │       ├── repository/           # 11 repositories
│   │       ├── database/             # Room DB: 8 entities, 8 DAOs, v5
│   │       ├── services/             # SocketManager, SyncManager, LocationService
│   │       ├── location/             # LocationManager
│   │       ├── ui/
│   │       │   ├── auth/             # LoginScreen, RegisterScreen, SplashScreen
│   │       │   ├── courier/          # 30+ Compose screens
│   │       │   ├── components/       # Reusable UI components
│   │       │   └── theme/            # Material3 theme + dark mode
│   │       └── utils/                # SecurityManager, TamperDetection, etc.
│   │
│   └── customer-android/             # Customer Android App
│       ├── build.gradle.kts          # compileSdk=34, minSdk=24, targetSdk=34
│       └── src/main/java/com/tzir/delivery/customer/
│           ├── ... (fewer screens, no Hilt/Room, no Firebase)
│           └── ui/customer/          # ~12 screens
│
├── frontend/                         # React/Next.js admin dashboard
│   ├── .env.local
│   └── tests/
│
├── realtime-engine/                  # Go real-time service
│   └── Dockerfile
│
├── scripts/                          # Test scripts (E2E, pricing, order tracking)
├── tests/                            # System-level tests (performance, E2E, security)
├── docker-compose.yml                # Dev: backend + postgis + redis + realtime + frontend
├── docker-compose.prod.yml           # Prod: same services + persistent volumes
└── GAP_WORK_PLAN.md                  # Priorities 1-6 status tracking
```

---

## 2. Backend Inventory (Python / Flask)

### 2.1 Environment Configuration (Active `.env`)

| Variable | Value |
|---|---|
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `postgres` |
| `POSTGRES_DB` | `tzir_delivery` |
| `POSTGRES_SERVER` | `db` (Docker service name) |
| `POSTGRES_PORT` | `5432` |
| `SECRET_KEY` | `test-secret-key-for-local-dev` |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000","http://localhost:8000","http://127.0.0.1:3000","http://127.0.0.1:8000"]` |
| `GOOGLE_PLACES_API_KEY` | `AIzaSyCCmP-545jtS4rtdOPFZKe0tQa05Pz9f8g` |

### 2.2 App Configuration (`app.py`)

| Setting | Value |
|---|---|
| Framework | Flask 3.0 + Gevent monkey-patch |
| Database | PostgreSQL via `DATABASE_URL` env; fallback `sqlite:///delivery.db` |
| JWT Algorithm | HS256 (strict) |
| Access Token Expiry | 60 minutes |
| Refresh Token Expiry | 180 days |
| Token Locations | Headers + Cookies |
| Rate Limiting | 50,000/day, 10,000/hour default |
| CORS | Localhost:3000/8000 for `/api/*` and `/socket.io/*` |
| Security | Talisman CSP, nosniff, DENY framing, HSTS |
| RLS | Injects `current_user_id` + `is_admin` into PostgreSQL session |

### 2.3 Database Models (62 Models + 1 Association Table)

All defined in `backend/models.py` (1,993 lines).

| # | Model | Table | Key Fields |
|---|---|---|---|
| 1 | **User** | `users` | id, username, email, password_hash, phone, user_type, admin_role, mfa_enabled, mfa_secret, failed_login_attempts, locked_until |
| 2 | **TokenBlacklist** | `token_blacklist` | id, jti, expires_at, created_at |
| 3 | **AuditLog** | `audit_logs` | id, user_id, action, table_name, record_id, old_values, new_values |
| 4 | **Notification** | `notifications` | id, user_id, title, body, type, read, created_at |
| 5 | **Courier** | `couriers` | id, user_id, full_name, phone, vehicle_type, is_available, rating, latitude, longitude, is_verified, integrity_score |
| 6 | **Customer** | `customers` | id, user_id, company_name, contact_name, phone, email, balance |
| 7 | **PickupPoint** | `pickup_points` | id, address_id, contact_name, contact_phone |
| 8 | **DeliveryPoint** | `delivery_points` | id, address_id, recipient_name, recipient_phone |
| 9 | **Address** | `addresses` | id, street, city, lat, lng, place_id |
| 10 | **Delivery** | `deliveries` | id, customer_id, courier_id, pickup_id, delivery_id, status, pricing_id, protocol_config_id, created_at, scheduled_at, completed_at |
| 11 | **DeliveryLog** | `delivery_logs` | id, delivery_id, from_status, to_status, changed_by, timestamp |
| 12 | **DeliveryPhoto** | `delivery_photos` | id, delivery_id, url, uploaded_at |
| 13 | **DeliverySignature** | `delivery_signatures` | id, delivery_id, signature_data, captured_at |
| 14 | **PricingTier** | `pricing_tiers` | id, name, base_price, price_per_km, price_per_kg |
| 15 | **DeliveryPricing** | `delivery_pricing` | id, name, distance_min, distance_max, size, urgency, price |
| 16 | **Rating** | `ratings` | id, delivery_id, courier_id, customer_id, score, comment |
| 17 | **Invoice** | `invoices` | id, delivery_id, amount, tax, total, status, created_at |
| 18 | **InvoiceItem** | `invoice_items` | id, invoice_id, description, quantity, unit_price |
| 19 | **CourierReceipt** | `courier_receipts` | id, courier_id, amount, description, created_at |
| 20 | **InvitationCode** | `invitation_codes` | id, code, role, max_uses, expires_at |
| 21 | **ChatSession** | `chat_sessions` | id, user_id, status, created_at |
| 22 | **ChatMessage** | `chat_messages` | id, session_id, sender_id, content, created_at |
| 23 | **Zone** | `zones` | id, name, polygon_geojson, base_price |
| 24 | **SupportTicket** | `support_tickets` | id, user_id, order_id, subject, status, priority, assigned_to |
| 25 | **TicketMessage** | `ticket_messages` | id, ticket_id, sender_id, content |
| 26 | **Warehouse** | `warehouses` | id, name, address, lat, lng |
| 27 | **StorageZone** | `storage_zones` | id, warehouse_id, name |
| 28 | **StorageBin** | `storage_bins` | id, zone_id, label, volume_capacity |
| 29 | **InventoryItem** | `inventory_items` | id, sku, barcode, name, stock_level, volume |
| 30 | **ItemLocation** | `item_locations` | id, item_id, bin_id, quantity |
| 31 | **StockMovement** | `stock_movements` | id, item_id, movement_type, quantity, reference |
| 32 | **Lead** | `leads` | id, company_name, contact_name, email, phone, status, source, assigned_to |
| 33 | **LeadActivity** | `lead_activities` | id, lead_id, activity_type, description, performed_by |
| 34 | **ApiKey** | `api_keys` | id, name, prefix, secret_hash, is_active |
| 35 | **ApiUsage** | `api_usage` | id, api_key_id, endpoint, call_count, date |
| 36 | **LegalDeliveryEvidence** | `legal_delivery_evidence` | id, delivery_id, geo_coordinates, chain_of_custody |
| 37 | **InsurancePolicy** | `insurance_policies` | id, courier_id, policy_type, provider, expiry_date |
| 38 | **EmploymentContract** | `employment_contracts` | id, courier_id, contract_type, signed_at |
| 39 | **CustomerPricingOverride** | `customer_pricing_overrides` | id, customer_id, tier_id, discount_percent |
| 40 | **Expense** | `expenses` | id, courier_id, category, amount, vat, withholding_tax |
| 41 | **FinanceDocument** | `finance_documents` | id, uploader_id, type, url, uploaded_at |
| 42 | **TrafficScore** | `traffic_scores` | id, courier_id, points, reason, recorded_at |
| 43 | **LegalCase** | `legal_cases` | id, courier_id, status, description |
| 44 | **SavedRoute** | `saved_routes` | id, courier_id, name, geometry, created_at |
| 45 | **RouteStop** | `route_stops` | id, route_id, address, lat, lng, stop_type, order_index |
| 46 | **CompanySettings** | `company_settings` | id, key, value |
| 47 | **DeliveryProtocolTemplate** | `delivery_protocol_templates` | id, name, step_order |
| 48 | **DeliveryProtocolConfig** | `delivery_protocol_configs` | id, slug, name, template_id |
| 49 | **AcademyProtocolCourse** | `academy_protocol_courses` | id, protocol_config_id, title, description |
| 50 | **AcademyProtocolLesson** | `academy_protocol_lessons` | id, course_id, title, content, order_index |
| 51 | **AcademyProtocolProgress** | `academy_protocol_progress` | id, courier_id, course_id, completed, score |
| 52 | **AcademyProtocolQuizQuestion** | `academy_protocol_quiz_questions` | id, course_id, question, options, correct_answer |
| 53 | **CustomerWallet** | `customer_wallets` | id, customer_id, balance, currency |
| 54 | **WalletTransaction** | `wallet_transactions` | id, wallet_id, type, amount, reference |
| 55 | **CourierContact** | `courier_contacts` | id, courier_id, name, company, phone, email |
| 56 | **CourierWallet** | `courier_wallets` | id, courier_id, balance |
| 57 | **CourierLedgerEntry** | `courier_ledger_entries` | id, wallet_id, amount, type, description, balance_after |
| 58 | **WithdrawalRequest** | `withdrawal_requests` | id, courier_id, amount, status, payment_method_id |
| 59 | **CourierPaymentMethod** | `courier_payment_methods` | id, courier_id, method_type, label, details, is_default |
| 60 | **StorageType** | `storage_types` | id, name, description |
| 61 | **CourierVehicle** | `courier_vehicles` | id, courier_id, plate_number, vehicle_type, insurance_expiry, test_expiry, is_primary |
| 62 | **RatingFeedback** | `rating_feedbacks` | id, rating_id, tag |

**Association Table:** `courier_vehicle_storage` (CourierVehicle ↔ StorageType)

### 2.4 Registered Blueprints (46 Blueprints)

All registered in `app.py` in order:

| Prefix | Blueprint File | Key Purpose |
|---|---|---|
| `/api/orders` | `routes/orders.py` | Order CRUD, assign, cancel, photos, signatures |
| `/api/pricing` | `routes/pricing.py` | Pricing tiers, cards, calculation |
| `/api/couriers` | `routes/couriers.py` | Courier list, location, status, history |
| `/api/admin` | `routes/admin.py` | Admin user/order/courier management |
| `/api/auth` | `routes/auth.py` | Login, logout, register, refresh, 2FA, WebAuthn |
| `/api/stats` | `routes/stats.py` | Platform + courier statistics |
| `/api/courier-onboarding` | `routes/courier_onboarding.py` | Courier registration flow |
| `/api/customers` | `routes/customers.py` | Customer CRUD |
| `/api/external` | `routes/external_api.py` | Shopify/WooCommerce API |
| `/api/addresses` | `routes/addresses.py` | Geocode, autocomplete |
| `/api/ratings` | `routes/ratings.py` | Rating CRUD |
| `/api/couriers/earnings` | `routes/earnings_reports.py` | CSV export, VAT, annual summary |
| `/api/payments` | `routes/payments.py` | Payment intents, SmartBee integration |
| `/api` (customer) | `routes/customer.py` | Customer order/wallet flows |
| `/api/invoices` | `routes/invoices.py` | Invoice generation, PDF |
| `/api/hr` | `routes/hr_compliance.py` | Contracts, insurance |
| `/api/legal` | `routes/legal.py` | Legal evidence, cases |
| `/api/optimization` | `routes/optimization.py` | Route optimization |
| `/api/crm` | `routes/crm.py` | Leads, activities |
| `/api/reports` | `routes/reports.py` | Financial, courier performance reports |
| `/api/support` | `routes/support.py` | Support tickets |
| `/api/freelance` | `routes/freelance.py` | Courier contracts |
| `/api/privacy` | `routes/privacy.py` | GDPR data export/deletion/consent |
| `/api/wms` | `routes/wms.py` | Warehouse, inventory, stock movements |
| `/api/finances` | `routes/finances.py` | Financial summary |
| `/api/webauthn` | `routes/webauthn.py` | FIDO2 passkey auth |
| `/api/academy` | `routes/academy.py` | Courses, progress, quizzes |
| `/api/expenses` | `routes/expenses.py` | Expense CRUD |
| `/api/archive` | `routes/archive.py` | Archival system |
| `/api/tasks` | `routes/tasks.py` | Task management |
| `/api/courier` | `routes/courier_clients.py` | Courier's personal client book |
| `/api/courier` | `routes/courier_vehicles.py` | Courier vehicle management |
| `/api/courier` | `routes/courier_ratings.py` | Courier rating history |
| `/api/courier` | `routes/courier_wallet.py` | Wallet, withdrawals, payment methods |
| `/api/courier` | `routes/courier_notifications.py` | Courier notifications |
| `/api/courier` | `routes/courier_business.py` | Courier business profile |
| `/api` (google_auth) | `routes/google_auth.py` | Google OAuth calendar sync |
| `/api/settings` | `routes/settings.py` | User settings |
| `/api/zones` | `routes/zones.py` | Geofenced zone management |
| `/api/protocols` | `routes/protocols.py` | Delivery protocol definitions |
| `/api/orders/customer` | `routes/customer_orders.py` | Customer-side orders |
| `/api/payments/wallet` | `routes/wallet.py` | Wallet topup, pay, charge-card |
| `/api/academy/protocols` | `routes/academy_protocols.py` | Protocol-based academy courses |

### 2.5 WebSocket Events

**File:** `sockets/delivery_events.py`

| Event | Direction | Description |
|---|---|---|
| `connect` | Client→Server | Authenticates via JWT (`auth` object, query, or header); **strict** — rejects expired tokens. Mobile `SocketManager.ensureFreshToken()` decodes the JWT locally, checks `exp` vs wall-clock, and calls `/api/auth/refresh` *before* any reconnect attempt, guaranteeing a valid handshake. |
| `disconnect` | Client→Server | Cleans `connected_couriers` registry |
| `join` | Client→Server | Joins role-based room (`admin_room`, `courier_room`, `courier_{id}`, `customer_{id}`) |
| `leave` | Client→Server | Leaves a room |
| `new_order_notification` | Client→Server | Broadcasts to `admin_room` and `courier_room` |
| `order_status_update` | Client→Server | Broadcasts to `admin_room`, `customer_{id}`, `courier_{id}` |
| `courier_location_update` | Client→Server | Broadcasts to `admin_room`, `delivery_{id}`, `customer_{id}` |
| `courier_availability_changed` | Client→Server | Fast-sync to `admin_room` |
| `message` | Client→Server | General message echo |
| `ping` | Client→Server | Returns `pong` |

**Helper emit functions:**
- `notify_new_order(order_data)` → `admin_room` + `courier_room`
- `notify_order_assigned(order_data)` → `admin_room` + `courier_{id}`
- `notify_order_completed(order_data)` → `admin_room` + `customer_{id}`

**File:** `sockets/chat_events.py`

| Event | Direction | Description |
|---|---|---|
| `join_chat` | Client→Server | Joins `support_agents` or `chat_{session_id}` room |
| `start_session` | Client→Server | Creates ChatSession, joins room, notifies agents |
| `send_message` | Client→Server | Saves message to DB, broadcasts to room |

### 2.6 CLI Commands

| Command | Description |
|---|---|
| `flask create-demo-users` | Seeds 4 accounts (super_admin, finance_admin, demo_client, demo_courier) |
| `flask create-api-key <name>` | Generates merchant API key |
| `flask seed-perf` | Generates 10k couriers/users for load testing |

### 2.7 Middleware / Security

| Layer | File | Purpose |
|---|---|---|
| IP Blocking | `utils/ip_blocker.py` | Blocks IPs via `before_request` |
| JWT Auth | `utils/decorators.py` | `@token_required`, `@role_required` |
| API Key Auth | `auth_middleware.py` | Merchant API key validation |
| Rate Limiting | `extensions.py` (Flask-Limiter) | Global + per-endpoint limits |
| CSP Headers | `app.py` (Flask-Talisman) | Content Security Policy |
| HMAC Validation | `middleware/api_security.py` | HMAC-SHA256 signature verification |
| PII Masking | `middleware/api_security.py` | Masks phone/email in responses |
| Audit Trail | `utils/audit_trail.py` | SQLAlchemy event listeners for all changes |

---

## 3. Mobile Codebase Inventory (Android / Kotlin)

### 3.1 Courier App — Compose Screens (30+ Screens)

All under `.../ui/courier/`:

| Screen | File | Composables | Parameters |
|---|---|---|---|
| Dashboard | `DashboardScreen.kt` | `DashboardScreen` | onMissionClick, onCalendarClick, ... |
| Missions | `MissionsScreen.kt` | `MissionsScreen`, `CalendarView` | missions, onMissionClick, ... |
| Mission Details | `MissionDetailsScreen.kt` | `MissionDetailsScreen` | missionId, repository, ... |
| Route Planner | `RoutePlannerScreen.kt` | `RoutePlannerPanel` | stops, plannerMode, ... (inline in Dashboard); **localized** — all strings via `stringResource()` |
| Manual Route | `ManualRoutePlannerScreen.kt` | `ManualRoutePlannerScreen` | onBack, repository, ...; **localized** — all strings via `stringResource()` |
| Route Optimization | `RouteOptimizationScreen.kt` | `RouteOptimizationScreen` | show, onDismiss, repository; **localized** — all strings via `stringResource()` |
| Calendar | `CalendarScreen.kt` | `CalendarScreen` | onBack, calendarRepository |
| Academy | `AcademyScreen.kt` | `AcademyScreen` | onBack, onCourseClick, ... |
| Course Detail | `CourseDetailScreen.kt` | `CourseDetailScreen` | courseId, onBack, ... |
| Quiz | `QuizScreen.kt` | `QuizScreen` | courseId, onBack, repository |
| Earnings | `EarningsScreen.kt` | `EarningsScreen` | onBack, repository |
| Balance | `BalanceScreen.kt` | `BalanceScreen` | onBack, repository |
| Payment Methods | `PaymentMethodsScreen.kt` | `PaymentMethodsScreen` | onBack, repository |
| Business | `BusinessScreen.kt` | `BusinessScreen` | onBack, repository |
| Clients | `ClientsScreen.kt` | `ClientsScreen` | onBack, onClientClick, ... |
| Client Detail | `ClientDetailScreen.kt` | `ClientDetailScreen` | clientId, onBack, ... |
| Profile | `ProfileScreen.kt` | `ProfileScreen` | onLogout, onBack, ... |
| Settings | `SettingsScreen.kt` | `SettingsScreen` | onBack |
| Vehicles | `VehicleScreen.kt` | `VehicleScreen` | onBack, repository |
| Documents | `DocumentsScreen.kt` | `DocumentsScreen` | onBack, repository |
| Mission Protocol | `MissionProtocolScreen.kt` | `MissionProtocolScreen` | orderId, onBack |
| Leaderboard | `LeaderboardScreen.kt` | `LeaderboardScreen` | onBack, repository |
| Mission History | `MissionHistoryScreen.kt` | `MissionHistoryScreen` | onBack, repository |
| Notifications | `NotificationCenterScreen.kt` | `NotificationCenterScreen` | onBack, repository |
| More | `MoreScreen.kt` | `MoreScreen` | onLogout, onNavigate |
| Worker Rating | `WorkerRatingScreen.kt` | `WorkerRatingScreen` | onBack, repository |
| Support Chat | `SupportChatScreen.kt` | `SupportChatScreen` | onBack, ... |
| Expenses | `ExpenseScreen.kt` | `ExpenseScreen` | onBack, repository |

**Auth screens** (under `.../ui/auth/`):

| Screen | File | Composables |
|---|---|---|
| Login | `LoginScreen.kt` | `LoginScreen` |
| Register | `RegisterScreen.kt` | `RegisterScreen` |
| Splash | `SplashScreen.kt` | `SplashScreen` |

### 3.2 Repositories (11 Files)

All under `.../repository/`:

| Repository | Constructor Parameters | Key Methods |
|---|---|---|
| **AuthRepository** | `api: DeliveryApi` | `login()`, `register()`, `logout()`, `updateFcmToken()` |
| **CourierRepository** | `api: DeliveryApi, db: TzirDatabase, syncManager: SyncManager?` | `refresh*()` (8 methods), `acceptMission()`, `updateMissionStatus()` |
| **ContactRepository** | `api: DeliveryApi, contactDao: ContactDao` | `getMyClients()`, `createClient()`, `deleteClient()`, etc. |
| **PaymentRepository** | `api: DeliveryApi` | `getWalletBalance()`, `createWithdrawal()`, `getPaymentMethods()` |
| **EarningsRepository** | `api: DeliveryApi` | `getEarnings()`, `getEarningsBreakdown()`, `exportEarnings()` |
| **ExpenseRepository** | `api: DeliveryApi` | `getExpenses()`, `createExpense()`, `deleteExpense()` |
| **BusinessRepository** | `api: DeliveryApi` | `getBusinessOverview()`, `getMonthlyReport()`, etc. |
| **VehicleRepository** | `api: DeliveryApi` | `getMyVehicles()`, `createVehicle()`, `updateVehicle()` |
| **RatingRepository** | `api: DeliveryApi` | `getMyRatingStats()`, `getMyRatingFeedback()` |
| **CalendarRepository** | `api: DeliveryApi?` (nullable) | `refresh()`, `setDayDeliveries()`, `getDeliveriesForDay()` |
| **NotificationRepository** | `api: DeliveryApi` | `getMyNotifications()`, `markRead()`, `markAllRead()` |

### 3.3 DI Layer (Hilt Modules)

All under `.../di/`:

**DatabaseModule.kt:**
- `provideTzirDatabase(context: Context)`: Room database v5
- `provideMissionDao(db: TzirDatabase)`
- `provideCourierStatsDao(db: TzirDatabase)`
- `provideAcademyCourseDao(db: TzirDatabase)`
- `provideGamificationProfileDao(db: TzirDatabase)`
- `provideContactDao(db: TzirDatabase)`
- `provideVehicleDao(db: TzirDatabase)`
- `providePendingActionDao(db: TzirDatabase)`
- `provideLocationUpdateDao(db: TzirDatabase)`

**NetworkModule.kt:**
- `provideHttpClient(authRepositoryProvider: Provider<AuthRepository>)`: Ktor HttpClient
- `provideDeliveryApi(client: HttpClient)`: DeliveryApiImpl

**RepositoryModule.kt:**
- All 11 repository providers (some with nullable params: `provideCalendarRepository`)

**LocationModule.kt:**
- `provideLocationManager(...)`: LocationManager

### 3.4 Room Database

**Class:** `TzirDatabase` (Singleton, version **5**)

| Entity | DAO | Key Columns |
|---|---|---|
| `MissionEntity` | `MissionDao` | id, address, status, lat, lng, assignedAt |
| `CourierStatsEntity` | `CourierStatsDao` | id, deliveriesToday, rating, earnings |
| `AcademyCourseEntity` | `AcademyCourseDao` | id, title, progress, completed |
| `GamificationProfileEntity` | `GamificationProfileDao` | id, level, xp, leaderboardRank |
| `ContactEntity` | `ContactDao` | id, name, company, phone |
| `VehicleEntity` | `VehicleDao` | id, plateNumber, vehicleType |
| `PendingActionEntity` | `PendingActionDao` | id, actionType, endpoint, payloadJson, createdAt |
| `LocationUpdateEntity` | `LocationUpdateDao` | id, latitude, longitude, timestamp, synced |

### 3.5 Offline / Sync Capabilities

**SyncManager** (`.../services/SyncManager.kt`):
- `observeConnectivity(context)`: Monitors network state via `ConnectivityManager`
- `enqueue(actionType, endpoint, payloadJson)`: Queues failed actions to Room (`PendingActionDao`)
- `registerHandler(actionType, handler)`: Registers callback to process specific action types
- `processQueue()`: Replays pending actions when connectivity restored
- **Registered handlers in MainActivity:**
  - `ACCEPT_ORDER` → `courierRepository.acceptMission(id)`
  - `UPDATE_STATUS` → `courierRepository.updateMissionStatus(...)`
  - `SEND_LOCATION` → `api.sendLocation(...)`
  - `SEND_LOCATION_BATCH` → `locationUpdateDao` batch processing

**Offline fallback pattern in CourierRepository:**
- `refresh*()` methods catch exceptions, set `_isOffline = true`, and fall back to cached Room data
- `acceptMission()` / `updateMissionStatus()` catch network failures and enqueue via `syncManager`

### 3.6 Auth / Token Management

**TokenManager** (`.../network/TokenManager.kt`):
- Singleton using `EncryptedSharedPreferences` (AES256-GCM)
- Methods: `init(context)`, `token` (get/set), `saveToken()`, `saveRefreshToken()`, `getRefreshToken()`, `clearTokens()`
- `sessionInvalidated: Boolean` flag — set on `clearTokens()`, checked by `AuthRepository.init`

**KtorClientFactory** (`.../network/KtorClientFactory.kt`):
- `resolveBaseUrl()`: Emulator → `http://10.0.2.2:5000`, Device → `http://192.168.33.19:5000`
- Bearer auth with `loadTokens` + `refreshTokens` (silent refresh on 401)
- `sendWithoutRequest` excludes `/auth/login`, `/auth/register`, `/auth/refresh`
- `HttpResponseValidator` clears tokens and calls `onUnauthorized` on 401/403

**AuthRepository:**
- `_currentUser: MutableStateFlow<User?>` — drives auth-gating in `MainActivity`
- On init: checks `TokenManager.sessionInvalidated` to clear stale state
- `login()` saves both access + refresh tokens

---

## 4. Current Configuration & Infrastructure Specs

### 4.1 Base URLs & IPs

| Component | File | URL | Notes |
|---|---|---|---|
| Ktor API (Emulator) | `KtorClientFactory.kt:35` | `http://10.0.2.2:5000` | Routes through host loopback |
| Ktor API (Device) | `KtorClientFactory.kt:35` | `http://192.168.33.19:5000` | Hardcoded LAN IP |
| Socket.IO | `SocketManager.kt:45` | `http://192.168.33.19:5000` | **NOT dynamic** — always device IP |
| Customer App API | `customer-android/.../DeliveryApi.kt:31` | `http://192.168.33.19:5000` | Separate hardcoded value |
| Customer Socket | `customer-android/.../SocketManager.kt:20` | `http://192.168.33.19:5000` | Separate hardcode |
| Customer Address | `customer-android/.../AddressSelectionScreen.kt:50` | `http://192.168.33.19:5000` | Separate hardcode |
| Archive (old) | `archive/shared/.../DeliveryApi.kt:73` | `http://192.168.33.12:5000` | Different IP — stale |
| Frontend API | `frontend/.env.local` | `http://localhost:5000` | Via Docker or local |
| Frontend Socket | `frontend/.env.local` | `http://localhost:5000` | Via Docker or local |

### 4.2 Gradle & Dependencies (Courier Android)

| Setting | Value |
|---|---|
| `compileSdk` | 34 |
| `minSdk` | 24 |
| `targetSdk` | 34 |
| `applicationId` | `com.tzir.delivery.courier` |
| AGP | `8.2.2` |
| Kotlin | `1.9.22` |
| Gradle | `8.14.3` |
| Java compat | `VERSION_1_8` / `jvmTarget "1.8"` |
| Compose BOM | `1.6.7` |
| Compose compiler | `1.5.8` |

**Key Dependencies:**

| Library | Version | Purpose |
|---|---|---|
| Jetpack Compose | 1.6.7 | UI framework |
| Material3 | 1.2.1 | Design system |
| Ktor Client | 2.3.7 | HTTP + Auth + Content Negotiation |
| Socket.IO Client | 2.1.0 | WebSocket real-time |
| Hilt | 2.50 | Dependency injection |
| Room | 2.6.1 | Local SQLite database |
| Firebase BOM | 32.7.2 | FCM + Crashlytics |
| Google Maps Compose | 4.3.3 | Map integration |
| Places SDK | 3.3.0 | Address autocomplete |
| Security-Crypto | 1.1.0-alpha06 | EncryptedSharedPreferences |
| Coil Compose | 2.6.0 | Image loading |
| MockK | 1.13.8 | Unit testing |
| kotlinx-serialization | (via Ktor) | JSON serialization |

### 4.3 Backend Dependencies (Python)

| Library | Version | Purpose |
|---|---|---|
| Flask | 3.0.0 | Web framework |
| Flask-SQLAlchemy | 3.1.1 | ORM |
| Flask-SocketIO | 5.3.5 | WebSocket |
| Flask-JWT-Extended | 4.6.0 | JWT auth |
| Flask-Limiter | 3.5.0 | Rate limiting |
| Flask-CORS | 4.0.0 | CORS |
| Flask-Talisman | >=1.0.0 | CSP headers |
| SQLAlchemy | 2.0.23 | SQL toolkit |
| psycopg2-binary | 2.9.9 | PostgreSQL driver |
| PyJWT | 2.8.0 | JWT encode/decode |
| ortools | 9.11.4210 | Route optimization |
| webauthn | 2.0.0 | FIDO2/WebAuthn |
| gevent | 23.9.1 | Async (prod) |
| Gunicorn | 21.2.0 | WSGI server |
| Redis | 5.0.1 | Caching/queue |
| Google Maps | 4.10.0 | Geocoding/distance |
| ReportLab | 4.0.9 | PDF generation |

### 4.4 Network Configuration (Docker)

| Service | Image | Port |
|---|---|---|
| backend | `python:3.11-slim` (dev) / `python:3.9-slim` (prod) | 5000 |
| db | `postgis/postgis:15-3.3` | 5432 |
| redis | `redis:alpine` | 6379 |
| realtime-engine | `golang:1.21-alpine` | 8080 |
| frontend | Next.js | 3000 |

---

## 5. Identified Gaps & Leftover Mocks

### 5.1 Critical Gaps

| # | Gap | Severity | Details |
|---|---|---|---|
| 1 | **No real payment integration** | 🔴 CRITICAL | All payment flows return mock data. `/api/payments/process-mock` accepts arbitrary card data and always approves. `/api/payments/create-intent` returns 501 (if SmartBee configured) or mock payload. No Stripe, no real SmartBee. |
| 2 | **No Stripe integration** | 🔴 CRITICAL | Zero Stripe code exists. Only mentioned in a security offboarding checklist. |
| 3 | **Missing `google-services.json`** | 🔴 CRITICAL | File does not exist. Firebase FCM, Crashlytics, and Google Maps will fail in release builds without it. |
| 4 | **Hardcoded LAN IPs** | 🟠 HIGH | All mobile apps hardcode `192.168.33.19:5000`. Won't work outside local network. SocketManager does NOT use the dynamic `resolveBaseUrl()` logic — it has a separate hardcoded constant. |
| 5 | **Stale archive IP** | 🟠 HIGH | Archive/shared code uses `192.168.33.12:5000` — different from active `192.168.33.19`. |
| 6 | **Fallback API key in code** | 🟠 HIGH | `'default-api-key-change-in-production'` hardcoded in `decorators.py:238`. |
| 7 | **HSM master secret simulated** | 🟠 HIGH | `b"HARDWARE_BACKED_MASTER_SECRET_SIMULATION"` — not real HSM. |
| 8 | **SmartBee integration stubbed** | 🟡 MEDIUM | Returns 501 "pending API docs" when configured. No real payment processing. |
| 9 | **FCM notifications mock** | 🟡 MEDIUM | Falls back to `print()` mock when no server key. |
| 10 | **WhatsApp/SMS mock** | 🟡 MEDIUM | Falls back to `{'mock': True}` when no keys configured. |

### 5.2 Mock Endpoints & Fallbacks

| Endpoint / Function | File | Mock Behavior |
|---|---|---|
| `POST /api/payments/process-mock` | `routes/payments.py:24-89` | Accepts any card data, always approves, generates `txn_mock_...` ID |
| `POST /api/payments/create-intent` | `routes/payments.py:118-153` | Returns mock payload with `isMock: True` or 501 if SmartBee configured |
| `POST /api/payments/webhook` | `routes/payments.py:156-177` | Returns 200 with `ignored_no_secret` when key missing |
| `POST /api/payments/wallet/charge-card` | `routes/wallet.py:92` | "Direct card charge initiated (Mock)" |
| `POST /api/customer/wallet/topup` | `routes/customer.py:272-311` | "Simulate SmartBee Success" |
| `POST /api/auth/register` | `routes/customer.py:132` | "Mocking Point Creation for this phase" |
| `GET /api/orders/calc-price` | `routes/customer_orders.py:72` | "mock distance for now" |
| `GET /api/couriers/<id>/stats` | `routes/couriers.py:472` | "mock logic if price is missing" |
| Route optimization notification | `routes/optimization.py:320` | `# TODO: Send Real-time notification via SocketIO/Firebase` |
| Real distance calculation | `routes/orders.py:319` | `# TODO: Calculate real distance using OSRM/Google` |
| Gamification integrity score | `services/gamification.py:42` | Hardcoded `1.0` placeholder |
| Virus scanner | `utils/audit.py:61` | Always returns `True` (mock) |
| Push notifications | `services/notifications.py` | `print(f"[MOCK PUSH] ...")` when no FCM key |
| Messaging (SMS/WhatsApp) | `services/messaging.py:51-53` | Returns `{'mock': True}` when no keys |
| Secrets manager | `services/secrets_manager.py:44` | Returns placeholder `b"HARDWARE_BACKED_MASTER_SECRET_SIMULATION"` |
| Distance calculation fallback | `routes/orders.py:537-551` | Haversine formula when Google Maps unavailable |

### 5.3 Mobile Catch/Default Fallbacks

All `catch (e: Exception)` blocks in `DeliveryApi.kt` return silent defaults:

| Method | Fallback |
|---|---|
| `login()` / `register()` | `AuthResponse(success=false, error=message)` |
| `sendLocation()` | `false` |
| `getAvailableOrders()` | `emptyList()` |
| `acceptOrder()` / `rejectOrder()` | `false` |
| `getCourierStats()` | `CourierStats(0, 0.0, 0.0, 0.0, 0.0, 0.0, "Standard")` — **zero stats silently** |
| `getActiveOrder()` | `null` |
| `getMissionHistory()` | `emptyList()` |
| `uploadImage()` | `null` |
| `submitRating()` / `sendOTP()` / `verifyOTP()` | `false` |
| `updateFcmToken()` / `updateAvailability()` | `false` |
| `optimizeManualRoute()` / `startShift()` / `getShiftStatus()` | `MapsResult(success=false)` |
| `autocompleteAddress()` | `emptyList()` |
| `geocodeAddress()` | `null` |
| `getGamificationProfile()` / `getMyCertifications()` | `emptyList()` / `emptyMap()` |
| All academy methods | `emptyList()` / `emptyMap()` |
| `getDocuments()` | `emptyList()` |
| All client methods | `emptyList()` / `ApiListResponse()` |
| `getPaymentMethods()` | `emptyList()` |
| `deleteClient()` / `deleteVehicle()` | `false` |

### 5.4 Hardcoded / Demo Values in Mobile

| File | Value | Type |
|---|---|---|
| `customer-android/.../LoginScreen.kt:41-42` | `username="demo_client"`, `password="Tzir2026!"` | Demo credentials |
| `customer-android/.../OrderSummaryScreen.kt:159-166` | `senderName="Demo Customer"`, `senderPhone="0503333333"`, `recipientPhone="0504444444"` | Demo data |
| `courier-android/.../TamperDetection.kt:26` | `nonce = "simulated_nonce_from_server"` | Simulated security |
| `courier-android/.../TamperDetection.kt:29` | `.setCloudProjectNumber(123456789)` | Play Integrity placeholder |
| `archive/shared/.../CourierRepository.kt:431` | `completeCourseQuiz(courseId, 100)` | Mock score 100 |

### 5.5 Test Coverage Summary

| Category | Location | Test Files | Status |
|---|---|---|---|
| **Backend pytest** | `backend/tests/` | 9 files | 27/27 PASS |
| **Android unit tests** | `courier-android/src/test/` | 4 files | 9/9 PASS |
| **System/E2E** | `tests/` | 5 files | Manual run |
| **Script-based** | `scripts/` | 6 files | Manual run |
| **Frontend** | `frontend/tests/` | 2 files | Not assessed |

### 5.6 Localization Status (Courier Android)

| Screen | `values/` (EN) | `values-iw/` (HE) | Notes |
|---|---|---|---|
| RouteOptimizationScreen | ✅ `stringResource()` | ✅ `stringResource()` | All strings externalized |
| RoutePlannerScreen (RoutePlannerPanel) | ✅ `stringResource()` | ✅ `stringResource()` | 15 strings externalized + `SaveRouteButton` |
| ManualRoutePlannerScreen | ✅ `stringResource()` | ✅ `stringResource()` | 11 strings externalized + default `arrivalTime` |
| Remaining screens (Dashboard, Clients, Academy, etc.) | ❌ Hebrew hardcoded | ℹ️ N/A | ~40+ hardcoded Hebrew strings remain across 8+ screens |

### 5.7 Build Obstacles

| Issue | Impact |
|---|---|
| **No `google-services.json`** | Firebase plugins will fail at build time unless fallback configured in `build.gradle.kts` |
| **Gradle 8.14.3 + AGP 8.2.2** | AGP 8.2.2 requires Gradle 8.2–8.4. **Gradle 8.14.3 may be incompatible** with AGP 8.2.2. |
| **Java 1.8 target** | Kotlin 1.9.22 + Compose compiler 1.5.8 may require JDK 17+ at build time despite `jvmTarget = "1.8"` |
| **Play Services missing on emulator** | `sdk_gphone16k_x86_64` image without Google Play Store limits Google Maps/Firebase testing |
| **ProGuard rules** | May need updates for Ktor serialization and Socket.IO keep rules |
