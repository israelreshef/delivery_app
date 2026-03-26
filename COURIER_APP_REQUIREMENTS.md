# 🚚 Courier App - Complete Requirements Document
## TZIR Delivery System - Courier Application

**Version:** 1.0  
**Date:** March 2026  
**Status:** Enterprise Architecture Design  
**Scope:** Mobile Native Android/iOS Application for Courier/Freelancer Management

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Core Features](#core-features)
3. [Technical Architecture](#technical-architecture)
4. [Data Models](#data-models)
5. [API Integration](#api-integration)
6. [Academy System](#academy-system)
7. [Algorithm & Optimization](#algorithm--optimization)
8. [Non-Functional Requirements](#non-functional-requirements)

---

## 1️⃣ Executive Summary

### Purpose
The Courier App is the **operational hub** for freelance couriers/delivery workers. It transforms them from simple delivery executors into **independent business operators** with:
- Full schedule control
- Profit maximization tools
- Skill progression system
- Multi-source job platform
- Real-time optimization

### Target User
- Freelance couriers
- Independent delivery operators
- Small logistics businesses
- Gig economy workers

### Business Model
- Commission-based (app takes %)
- Per-delivery fees managed by courier
- Multi-sourced work (own customers + platform)
- Skill-based pricing tiers

---

## 2️⃣ Core Features

### 2.1 Dashboard & Home Screen
**Purpose:** Central hub showing current status, revenue, and daily progress

**Components:**
- [ ] Daily/Weekly/Monthly revenue summary
- [ ] Active orders count & completion progress
- [ ] Current location with map preview
- [ ] Quick shortcuts to key actions
- [ ] Notifications badge (new orders, messages, alerts)
- [ ] Performance score/rating display
- [ ] Time-remaining indicators for delivery windows

**Data Needed:**
- Total earning today/week/month
- Completed deliveries count
- Active orders in route
- User rating (1-5 stars)
- Current status (online/offline/on-delivery)

---

### 2.2 Order Management System

#### 2.2.1 Order Discovery & Selection
**Purpose:** Courier selects which jobs to accept (not assigned to them)

**Screens:**
- [ ] **Available Orders List**
  - Scrollable feed of available jobs
  - Filters: by distance, delivery type, time window, reward
  - Map view of all available orders (cluster view)
  - Sorting: nearest, highest pay, earliest deadline, rating needed
  
- **Order Card Display:**
  - Pickup location + address
  - Drop-off location + address
  - Reward/payment amount
  - Time window (pickup from X to Y, deliver by Z)
  - Package size icon
  - Delivery type (standard, medical, legal, fragile, etc.)
  - Required skill/level to accept
  - Customer rating (if assigned courier already)
  - Distance to pickup
  - Estimated delivery time

- [ ] **Order Detail Screen**
  - Full pickup & drop-off addresses
  - Contact info (name, phone, notes)
  - Detailed payment breakdown
  - Special instructions
  - Photos/documents related to order
  - Required certifications
  - Customer reviews of past orders
  - Accept/Reject button

**Actions:**
- Accept order
- Reject order
- Save to wishlist
- Share with another courier
- Request information from customer/dispatcher

**Data to Sync:**
```json
{
  "order_id": "ORD-12345",
  "status": "available",
  "pickup": {
    "address": "string",
    "lat": float,
    "lng": float,
    "time_from": datetime,
    "time_to": datetime
  },
  "dropoff": {
    "address": "string", 
    "lat": float,
    "lng": float,
    "time_from": datetime,
    "time_to": datetime
  },
  "payment": {
    "base_fee": float,
    "distance_fee": float,
    "surge_multiplier": float,
    "total": float
  },
  "delivery_type": "enum",
  "required_skill_level": int,
  "required_certifications": ["cert1", "cert2"]
}
```

---

#### 2.2.2 Route Management (Smart Scheduling)
**Purpose:** Courier builds optimal route based on time windows and profit

**Features:**
- [ ] **Route Planner (Main Screen)**
  - Visual timeline of day (8am → 10pm)
  - Blocks for: "Breaks", "Own business", "Delivery slots"
  - Drag-and-drop orders into timeline
  - System suggests optimal order sequence
  - Shows estimated distance/time between stops
  - Calculates total daily profit with different arrangements
  
- [ ] **Algorithm-Suggested Optimization**
  - Input: Current route + available orders
  - Output: Suggested insertions that minimize deviation
  - Shows before/after: distance, time, profit
  - One-click accept suggestions

- [ ] **Multi-Delivery Consolidation**
  - Suggest grouping 2-3 deliveries in same area
  - Show combined profit vs sequential
  - Route optimization splits cost across deliveries
  - UI: "Consolidate" button showing potential saving/earning

- [ ] **Time Window Constraints**
  - Hard constraints: MUST deliver between X-Y
  - Soft constraints: preferred time
  - Visual warning if route violates constraints
  - Auto-adjustment suggestions

- [ ] **Navigation Integration**
  - Click order → starts Google Maps/Waze
  - Current waypoint + next waypoint highlighted
  - Real-time ETA with traffic
  - One-tap call to customer/merchant

**Data Model:**
```json
{
  "route": {
    "date": date,
    "planned_orders": [
      {
        "order_id": "ORD-123",
        "position": 1,
        "planned_pickup_time": datetime,
        "planned_delivery_time": datetime,
        "estimated_travel_time_from_prev": int (seconds)
      }
    ],
    "breaks": [
      {"start": datetime, "end": datetime, "type": "lunch/personal"}
    ],
    "own_business_blocks": [
      {"start": datetime, "end": datetime, "note": "own customers"}
    ],
    "total_distance": float (km),
    "total_time": float (hours),
    "estimated_profit": float,
    "optimization_score": float (0-100)
  }
}
```

---

### 2.3 Delivery Execution

#### 2.3.1 Real-Time Location Tracking
**Purpose:** Backend + customers can track courier in real-time

**Features:**
- [ ] **Background Location Service**
  - Runs continuously when app is active OR order is being delivered
  - Sends location every 30 seconds to backend
  - Battery-efficient mode (slower updates when idle)
  - Survives app close/restart
  
- [ ] **Location Sharing UI**
  - Toggle: "Share my location" during delivery
  - Shows timer: "Sharing for 2h 15m more"
  - One-tap emergency stop sharing
  
- [ ] **Offline Mode**
  - Queues location updates when offline
  - Syncs when connection returns

**Data:**
```json
{
  "location_update": {
    "courier_id": int,
    "lat": float,
    "lng": float,
    "accuracy": float (meters),
    "timestamp": datetime,
    "speed": float (km/h),
    "heading": float (degrees)
  }
}
```

#### 2.3.2 Delivery Process Flow
**Purpose:** Step-by-step guidance for each delivery

**Screens:**
- [ ] **Active Delivery Screen** (Main)
  - Large map showing current location + destination
  - Courier info card (name, rating, photo)
  - Destination address + directions button
  - Call/Message customer button
  - Current step indicator: "En route" | "Arrived" | "Delivering" | "Completed"
  - Time remaining / ETA

- [ ] **Arrival Confirmation**
  - Auto-detect when within 50m of pickup/dropoff
  - "Confirm arrival?" button
  - Photo of location (optional but recommended)
  - Note field for issues
  - Proceed button

- [ ] **Pickup Process**
  - Checklist of items (if provided)
  - "Verify contents" checkbox
  - Photos of package (before pickup)
  - Special handling instructions display
  - Confirm pickup button

- [ ] **Delivery Process**
  - Knock/Call customer notification
  - Wait timer (shows how long waiting)
  - Alternative instructions if customer not available
  - Photo of delivery location
  - Customer presence confirmation

- [ ] **Proof of Delivery (POD)**
  - [ ] **Signature Capture** (digital signature pad)
  - [ ] **Photo Capture** (package at destination)
  - [ ] **OTP Entry** (6-digit code sent to customer)
  - [ ] **Recipient ID Collection** (for legal deliveries)
  - [ ] **Custom Notes** (damage, refusal, etc.)
  - [ ] **Confirm delivery** → status = "completed"

**Data:**
```json
{
  "delivery_execution": {
    "order_id": int,
    "status": "pickup_pending | in_transit | delivery_pending | completed | failed",
    "pickup": {
      "confirmed_at": datetime,
      "photo_url": string,
      "notes": string
    },
    "delivery": {
      "confirmed_at": datetime,
      "photo_urls": [string],
      "signature_path": string,
      "otp_verified": boolean,
      "recipient_id": string,
      "recipient_name": string,
      "notes": string
    }
  }
}
```

---

### 2.3.3 Task Sync + Issue Automation (CustomerTask)
**Purpose:** לאחד את רשימת הדרישות וארכיטקטורת תהליך סיכום המשימות עם מודל המשימות הקיים ב־Backend (`CustomerTask`) ו־Frontend (`admin/tasks`).

**1) תהליך כללי:**
- כל דרישת מוצר חשובה מתועדת כפריט ב־`COURIER_APP_REQUIREMENTS.md` עם מזהה `REQ-xxxx`.
- כלי אדמין / מנהל מפרויקט יכול ליצור משימה בלחיצה מתוך ממשק ניהול (`/admin/tasks`) שממפה את הדרישה ל־`CustomerTask`.
- סטטוס משימה מתואם עם סטטוס הדרישה: `open` / `in_progress` / `completed` / `cancelled`.

**2) API יצירת issue אוטומטי:**
- Endpoint קיים: `POST /api/tasks` (CustomerTask).
- נדרש בייצוג הדרישה (requests):
  - `title`: `[REQ-XXXX] <שם דרישה>`
  - `description`: תיאור מהדרישה + קישור לחלק ב־MD
  - `due_date`: לוח זמנים דרישות
  - `priority`: `high`/`medium`/`low`
  - `status`: `open` בתחילה
  - `customer_id`: אפשרי (אם זמין לקוח ספציפי)
  - `assigned_to`: משתמש אחראי

**3) Sync אוטומטי ב־UI:**
- בפאנל `admin/tasks` יש כפתור `Import from requirements` שמקבל רשימת פריטים מ־MD במבנה JSON (או דרך פרמטר `req_id`).
- בקליק: קורא: `POST /api/tasks` בהתאם
- עדכון סטטוס: כאשר משימה מקבלת `completed`, נעדכן `COURIER_APP_REQUIREMENTS.md` בפרמטר `done` (one-way עם scripts)

**4) מיפוי Required fields -> CustomerTask fields**
- `REQ-id` ↔ `title`
- `description` ↔ `description`
- `section` ↔ `priority` (priority mapping: core features=high, ...)
- `owner` ↔ `assigned_to`
- `target date` ↔ `due_date`
- `done` ↔ `status: completed`

**5) תיעוד נדרש ל־MVP:**
- `tasks/docs-sync.sh` (script שפועל בעמדת הפיתוח):
  - קורא את `COURIER_APP_REQUIREMENTS.md`
  - מוציא כל פריט `%` עם `REQ-`
  - שולח `POST /api/tasks`
- `dashboard/admin/tasks` מציג גם idx/קישור ל־REQ ב־MD.

**6) מהדק בין הקיים למודיע**
- הסנכרון הראשון: רץ פעם אחת כדי ליצור משימות ראשוניות מ־`REQ`.
- עובדית: שינויים ב־`COURIER_APP_REQUIREMENTS` נערכים ידנית אבל בפועלים מייצרים משימה באמצעות `POST /api/tasks`.
- כל משימה ב־`/api/tasks` יכולה לקבל שדה מותאם `source = 'requirements'` + `source_id`.

---

### 2.4 Earnings & Payment

#### 2.4.1 Revenue Dashboard
- [ ] **Today's Earnings Summary**
  - Base fees earned
  - Distance/time bonuses
  - Surge pricing multiplier (if applicable)
  - Tips from customers
  - Total today
  - Projected weekly/monthly
  
- [ ] **Earnings Breakdown**
  - Per-order detail (order ID, amount, time, distance)
  - Filters: by date range, delivery type
  - Export to CSV/PDF
  
- [ ] **Payment History**
  - When paid out
  - To which account (bank/wallet)
  - Transaction status
  
- [ ] **Commission Transparency**
  - What % TZIR takes
  - What courier keeps
  - Incentive multipliers (if any)

#### 2.4.2 Payment Methods
- [ ] Multiple payment destination options:
  - Bank transfer
  - Mobile wallet
  - In-app wallet

- [ ] Payout Schedule
  - Daily/Weekly/Monthly options
  - Minimum payout threshold
  - Payout schedule display

---

### 2.5 Contact & Business Management

#### 2.5.1 Contact Directory
**Purpose:** Manage own customers, merchant relationships, communication

**Features:**
- [ ] **Contact List**
  - All contacts (customers, merchants, other couriers)
  - Search/filter
  - Tags (regular customer, VIP, merchant partnership, etc.)
  - Last interaction date
  
- [ ] **Contact Detail Card**
  - Full name, phone, email, address
  - All past orders with them
  - Notes/preferences
  - Custom delivery instructions
  - Preferred delivery times
  - Average payment (for merchants)
  
- [ ] **Communication Hub**
  - Call history
  - SMS/WhatsApp integration
  - In-app messaging
  - Message templates
  
- [ ] **My Customers/Merchants**
  - Directory of recurring customers
  - Quick-schedule new orders with them
  - Pricing agreements
  - Contract/notes
  - Auto-dispatch offers for regulars

**Data:**
```json
{
  "contact": {
    "id": int,
    "name": string,
    "phone": string,
    "email": string,
    "address": {lat, lng},
    "type": "customer | merchant | courier",
    "tags": [string],
    "notes": string,
    "delivery_preferences": {
      "preferred_times": [datetime],
      "special_instructions": string,
      "custom_rate": float
    }
  }
}
```

---

### 2.6 Academy & Skill Progression System

#### 2.6.1 Skill Levels & Tiers
```
Level 1: Starter (New)
├─ Can accept: standard, standard_fragile deliveries
├─ Max concurrent: 1 delivery
└─ Revenue cap: ₪300/day

Level 2: Intermediate (3+ months, 100+ deliveries)
├─ Can accept: + medical, + electronics
├─ Max concurrent: 2 deliveries
└─ Revenue cap: ₪600/day

Level 3: Professional (6+ months, 250+ deliveries, avg 4.5+ rating)
├─ Can accept: + legal_documents, + high_value
├─ Max concurrent: 3 deliveries
└─ Revenue unlocked

Level 4: Expert (1+ year, 500+ deliveries, avg 4.7+ rating)
├─ Can accept: + hazmat, + temperature_controlled
├─ Max concurrent: 4 deliveries
└─ Premium rates available

Level 5: Master (2+ years, 1000+ deliveries, avg 4.8+ rating)
├─ Can accept: ALL delivery types
├─ Max concurrent: 5 deliveries
└─ Negotiated rate agreements
```

#### 2.6.2 Academy Courses
**Purpose:** Learn delivery protocols → Pass exam → Execute 3 real deliveries → Level up

**Features:**
- [ ] **Course List Screen**
  - All available courses
  - Required for: Level 2, Level 3, etc.
  - Course duration (2-4 hours typically)
  - Prerequisites displayed
  - Enrolled status indicator
  - In-progress % bar
  
- [ ] **Course Content**
  - Video lessons (3-5 min each)
  - Reading material with images
  - Quizzes after each section (knowledge check)
  - Final exam (must score >90%)
  - Timer for exam (realistic time limits)
  
- [ ] **Exam System**
  - Multiple choice questions (20-30 questions)
  - Case study scenarios
  - Passing score: >90%
  - Retake after 48 hours if failed
  - Certificate issued on pass
  
- [ ] **Proficiency Demonstration**
  - After passing exam: "Complete 3 real deliveries"
  - Show counter: "0/3 completed"
  - Only orders of that type count
  - Bonus: high customer rating required
  - Upon completion → Level unlock

**Data:**
```json
{
  "course": {
    "id": int,
    "title": string,
    "description": string,
    "delivery_types_covered": [string],
    "level_unlocked": int,
    "duration_minutes": int,
    "prerequisites": [int] (course IDs),
    "sections": [
      {
        "title": string,
        "content_type": "video | reading | quiz",
        "content_url": string,
        "quiz_questions": []
      }
    ],
    "final_exam": {
      "questions": [
        {
          "text": string,
          "type": "multiple_choice | case_study",
          "options": [string],
          "correct_answer": int,
          "explanation": string
        }
      ],
      "passing_score": 90,
      "time_limit_minutes": 45
    }
  },
  
  "courier_progress": {
    "courier_id": int,
    "course_id": int,
    "status": "not_started | enrolled | in_progress | exam_passed | proficiency_in_progress | completed",
    "sections_completed": int,
    "exam_score": float,
    "proficiency_deliveries": [
      {
        "order_id": int,
        "completed_at": datetime,
        "customer_rating": float
      }
    ]
  }
}
```

#### 2.6.3 Academy UI
- [ ] **Academy Home Screen**
  - Current level display (with visual: star, badge, level number)
  - Progress to next level (%)
  - Recommended next course
  - All courses (filterable)
  - Completed certificates list
  
- [ ] **My Learning Path**
  - Timeline showing: completed → in-progress → upcoming courses
  - Estimated time to next level
  - Badges/achievements display
  
- [ ] **Certificates**
  - Digital certificates (downloadable, shareable)
  - Date earned
  - Proof of skill level

---

### 2.7 Ratings & Reputation System

#### 2.7.1 Courier Rating
- [ ] **Star Rating (1-5 scale)**
  - Average of all customer ratings
  - Breakdown: 5⭐, 4⭐, 3⭐, 2⭐, 1⭐ (with counts)
  - Recent ratings (last 10 highlighted)
  
- [ ] **Rating Factors**
  - On-time delivery
  - Professional communication
  - Package condition
  - Following instructions
  
- [ ] **Rating Display**
  - Shown to customers when viewing available orders
  - Shown on courier profile
  - Impacts order offers/prioritization

#### 2.7.2 Gamification & Achievements
- [ ] **Badges/Achievements**
  - Streak: 10 consecutive on-time deliveries
  - Speed Demon: 5 deliveries in <5 hours
  - Five-star Specialist: 20 deliveries rated 5⭐
  - Safety Expert: 0 damage reports in 100 deliveries
  - Partner: 50 deliveries with same customer
  
- [ ] **Leaderboards** (Optional)
  - Weekly earnings leaders
  - Top-rated couriers
  - Most deliveries this month
  - Local area: top performers in your zone

---

### 2.8 Notifications & Communications

#### 2.8.1 Notification Types
- [ ] **New Order Alert**
  - Push notification: "New order available: ₪45.50"
  - Map preview
  - Auto-dismiss after 2 minutes
  
- [ ] **Order Accepted Confirmation**
  - Order details
  - Directions to pickup
  
- [ ] **Time Window Alerts**
  - "15 minutes until pickup deadline"
  - "30 minutes until delivery deadline"
  
- [ ] **Customer Contact**
  - Customer calling courier
  - Customer sent message
  - Customer updated delivery instructions
  
- [ ] **System Alerts**
  - Payment successfully transferred
  - Course certificate ready
  - Level unlocked
  - New feature available

#### 2.8.2 In-App Messaging
- [ ] **Message Center**
  - Conversations with customers
  - Conversations with TZIR support
  - Message history
  - Read/unread status

---

### 2.9 Settings & Preferences

#### 2.9.1 Profile Management
- [ ] **Basic Information**
  - Name, phone, email
  - Profile photo
  - Bio/description
  
- [ ] **Business Details**
  - Vehicle type (bicycle, scooter, motorcycle, car, van)
  - Vehicle registration details
  - Insurance info
  - Business license (if applicable)
  
- [ ] **Payment & Banking**
  - Bank account details (encrypted)
  - Payment method preferences
  - Payout frequency
  
- [ ] **Availability Settings**
  - Working hours
  - Days available
  - Delivery types accepting
  - Geographic zones preferred

#### 2.9.2 Preferences
- [ ] **Notification Settings**
  - Push enabled/disabled by type
  - Sound preferences
  - Quiet hours
  
- [ ] **Navigation Preferences**
  - Preferred maps app (Google Maps, Waze)
  - Route optimization priority (shortest, fastest, cheapest)
  
- [ ] **Language & Regional**
  - Language selection
  - Currency display
  - Temperature units (°C/°F)

#### 2.9.3 Account & Security
- [ ] **Login & Auth**
  - Phone + OTP login
  - Biometric auth (fingerprint, face)
  - Session management
  
- [ ] **Privacy & Data**
  - Location history retention
  - Data export option
  - Account deletion option
  
- [ ] **Device Management**
  - Active sessions
  - Logout other devices
  - Last login info

---

## 3️⃣ Technical Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│          COURIER MOBILE APP (Kotlin)                │
│  ┌──────────────────────────────────────────────┐   │
│  │         UI Layer (Jetpack Compose)           │   │
│  │  Dashboard | Orders | Route | Delivery       │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  ViewModel Layer (MVVM Architecture)         │   │
│  │  Business Logic, State Management             │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Repository Layer (Data Abstraction)          │   │
│  │  Manages data from multiple sources           │   │
│  └──────────────────────────────────────────────┘   │
│         ↙                    ↓                   ↘    │
│   ┌──────────┐        ┌──────────┐      ┌──────────┐│
│   │Local DB  │        │Shared    │      │Services  ││
│   │(Room)    │        │Prefs     │      │(Location)││
│   └──────────┘        └──────────┘      └──────────┘│
└─────────────────────────────────────────────────────┘
         ↓ HTTP/WebSocket ↓ Location Service
┌─────────────────────────────────────────────────────┐
│          BACKEND API (Python/Flask)                 │
│  ├─ /orders/* (Order CRUD)                          │
│  ├─ /deliveries/* (Execution tracking)              │
│  ├─ /courier/* (Profile, ratings, academy)          │
│  ├─ /academy/* (Courses, exams, progress)           │
│  ├─ /earnings/* (Revenue, payouts)                  │
│  └─ /contacts/* (Business management)               │
└─────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌─────────┐  ┌──────────┐  ┌────────────┐
    │PostgreSQL│  │  Redis   │  │ File Store │
    │  (Data)  │  │(Cache,RT)│  │ (POD imgs) │
    └─────────┘  └──────────┘  └────────────┘

         ↓ Socket.IO / Real-time
    ┌──────────────────────────┐
    │   Realtime Engine (Go)    │
    │ - Location broadcasts     │
    │ - Order updates           │
    │ - Customer notifications  │
    └──────────────────────────┘
```

### 3.2 Technology Stack

**Mobile App:**
- Language: Kotlin
- UI Framework: Jetpack Compose
- Architecture: MVVM
- HTTP Client: Retrofit + OkHttp
- WebSocket: Socket.IO Client
- Local Database: Room
- Location: Google Play Services Location API
- Maps: Google Maps SDK
- Navigation: Jetpack Navigation
- Async: Coroutines
- Dependency Injection: Hilt
- Image Loading: Coil
- PDF Generation: iText or similar

**Backend Integration:**
- REST API (Retrofit)
- WebSocket (Socket.IO)
- Push Notifications: Firebase Cloud Messaging

### 3.3 Data Flow

```
User Action (Accept Order)
    ↓
ViewModel dispatches action
    ↓
Repository.acceptOrder(orderId)
    ↓
API Call: POST /orders/{id}/accept
    ↓
Backend updates DB + broadcasts via Socket.IO
    ↓
WebSocket listener updates local state
    ↓
UI re-renders (Compose reactive)
    ↓
New order appears in "Active Orders"
```

---

## 4️⃣ Data Models

### 4.1 Core Entities

#### Courier
```kotlin
data class Courier(
    val id: Int,
    val userId: Int,
    val fullName: String,
    val rating: Float, // 0.0 - 5.0
    val level: Int, // 1-5
    val currentLocationLat: Double?,
    val currentLocationLng: Double?,
    val vehicleType: String, // bicycle, scooter, motorcycle, car, van
    val isAvailable: Boolean,
    val totalDeliveries: Int,
    val totalEarnings: Double,
    val profilePhotoUrl: String?,
    val createdAt: DateTime
)
```

#### Order
```kotlin
data class Order(
    val id: Int,
    val orderNumber: String,
    val status: OrderStatus, // available, accepted, picked_up, in_transit, delivered, failed
    val pickup: LocationPoint,
    val dropoff: LocationPoint,
    val packageSize: PackageSize, // small, medium, large, xlarge
    val deliveryType: DeliveryType, // standard, medical, legal, fragile, etc.
    val requiredSkillLevel: Int,
    val requiredCertifications: List<String>,
    val basePrice: Double,
    val distanceFee: Double,
    val totalPrice: Double,
    val surgePricing: Float, // 1.0 - 3.0 multiplier
    val pickupTimeFrom: DateTime,
    val pickupTimeTo: DateTime,
    val deliveryTimeFrom: DateTime,
    val deliveryTimeTo: DateTime,
    val customerNotes: String?,
    val createdAt: DateTime
)

data class LocationPoint(
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val contactName: String,
    val contactPhone: String,
    val specialInstructions: String?
)
```

#### Delivery (Execution)
```kotlin
data class Delivery(
    val id: Int,
    val orderId: Int,
    val courierId: Int,
    val status: DeliveryStatus,
    val pickupConfirmedAt: DateTime?,
    val pickupPhotoUrl: String?,
    val deliveryConfirmedAt: DateTime?,
    val deliveryPhotoUrls: List<String>?,
    val signaturePath: String?,
    val otpVerified: Boolean,
    val recipientId: String?,
    val recipientName: String?,
    val notes: String?,
    val actualPickupTime: DateTime?,
    val actualDeliveryTime: DateTime?
)
```

#### CourierAcademyProgress
```kotlin
data class CourierAcademyProgress(
    val id: Int,
    val courierId: Int,
    val courseId: Int,
    val status: ProgressStatus, // not_started, enrolled, in_progress, exam_passed, proficiency_in_progress, completed
    val sectionsCompleted: Int,
    val examScore: Float?,
    val examPassedAt: DateTime?,
    val proficiencyDeliveries: List<ProficiencyDelivery>,
    val completedAt: DateTime?
)

data class ProficiencyDelivery(
    val orderId: Int,
    val completedAt: DateTime,
    val customerRating: Float
)
```

#### Route
```kotlin
data class Route(
    val id: Int,
    val courierId: Int,
    val date: LocalDate,
    val plannedOrders: List<PlannedOrder>,
    val breaks: List<TimeBlock>,
    val ownBusinessBlocks: List<TimeBlock>,
    val totalDistance: Double, // km
    val totalTime: Double, // hours
    val estimatedProfit: Double,
    val optimizationScore: Float // 0-100
)

data class PlannedOrder(
    val orderId: Int,
    val position: Int,
    val plannedPickupTime: DateTime,
    val plannedDeliveryTime: DateTime,
    val estimatedTravelTimeFromPrev: Int // seconds
)

data class TimeBlock(
    val startTime: DateTime,
    val endTime: DateTime,
    val type: String, // break, lunch, own_business
    val note: String?
)
```

---

## 5️⃣ API Integration

### 5.1 Required Endpoints

#### Orders
```
GET    /api/v1/courier/orders/available
       → Body: {filters: {distance, deliveryType, minPrice, timeWindow}}
       ← [Order]
       
GET    /api/v1/courier/orders/{id}
       ← Order (detailed)
       
POST   /api/v1/courier/orders/{id}/accept
       ← {success: bool, message: string}
       
POST   /api/v1/courier/orders/{id}/reject
       ← {success: bool}
       
PUT    /api/v1/courier/orders/{id}/status
       → Body: {status: "picked_up" | "in_transit" | "delivered"}
       ← {success: bool}
```

#### Deliveries (Execution & POD)
```
POST   /api/v1/courier/deliveries/{orderId}/pod
       → Body: {
           photoUrls: [string],
           signatureData: string (base64),
           otpCode: string,
           recipientId: string,
           notes: string
         }
       ← {success: bool}
       
POST   /api/v1/courier/deliveries/{orderId}/status
       → Body: {status: "..."}
       ← {success: bool}
```

#### Location Tracking
```
POST   /api/v1/courier/location
       → Body: {
           lat: float,
           lng: float,
           accuracy: float,
           speed: float,
           heading: float
         }
       ← {success: bool}
```

#### Route Optimization
```
POST   /api/v1/courier/route/optimize
       → Body: {
           courierId: int,
           date: date,
           plannedOrders: [int], // order IDs
           breaks: [TimeBlock]
         }
       ← {
           optimizedSequence: [int],
           suggestions: [Suggestion],
           consolidationOpportunities: [...]
         }
```

#### Academy
```
GET    /api/v1/courier/academy/courses
       ← [Course]
       
GET    /api/v1/courier/academy/courses/{id}
       ← Course (with full content)
       
POST   /api/v1/courier/academy/courses/{id}/enroll
       ← {success: bool}
       
POST   /api/v1/courier/academy/exams/{courseId}/submit
       → Body: {answers: [int]} // answer indices
       ← {success: bool, score: float, passed: bool}
       
GET    /api/v1/courier/academy/progress
       ← [CourierAcademyProgress]
```

#### Earnings & Payments
```
GET    /api/v1/courier/earnings/today
       ← {baseEarned: float, distanceFees: float, tips: float, total: float}
       
GET    /api/v1/courier/earnings/history
       → Params: {from: date, to: date}
       ← [{orderId, amount, date, type}]
       
GET    /api/v1/courier/payments/history
       ← [{date, amount, method, status}]
```

#### Contacts & Business
```
GET    /api/v1/courier/contacts
       ← [Contact]
       
POST   /api/v1/courier/contacts
       → Body: Contact
       ← {id: int}
       
PUT    /api/v1/courier/contacts/{id}
       → Body: Contact
       ← {success: bool}
```

---

## 6️⃣ Academy System (Detailed)

### 6.1 Course Structure
- Level 1 Prerequisites: None
- Level 2 Prerequisites: Level 1 certificate + 3 months active
- Level 3 Prerequisites: Level 2 certificate + 6 months active + 200+ deliveries
- Level 4 Prerequisites: Level 3 certificate + 1 year active + 500+ deliveries
- Level 5 Prerequisites: Level 4 certificate + 2 years active + 1000+ deliveries

### 6.2 Progression Flow

```
Take Course → Read/Watch → Quiz (knowledge check)
   ↓
Final Exam (>90% required)
   ↓
Certificate Issued
   ↓
Complete 3 real deliveries of that type
   ↓
(Optional: Achieve 4.5+ rating average on those 3)
   ↓
LEVEL UP + Unlock new delivery types
```

### 6.3 Content Types
- **Video**: 3-5 min explanatory videos with captions
- **Reading**: Formatted text with images, diagrams, checklists
- **Interactive**: Scenario-based questions (what would you do if...)
- **Quiz**: Knowledge checks (multiple choice, true/false)
- **Exam**: Comprehensive assessment (20-30 questions, 45 min time limit)

---

## 7️⃣ Algorithm & Optimization

### 7.1 Order-to-Courier Allocation (Backend)
- **Criteria Used:**
  1. Distance (Haversine then Google Maps API)
  2. Courier rating (>3.5 preferred)
  3. Courier current load (fewer active deliveries = prioritized)
  4. Skill level (must meet minimum)
  5. Zone affinity (prefer couriers in same zone)
  6. Time window feasibility (can complete in time?)

- **Output:** Best matching courier selected, order "assigned"

### 7.2 Route Optimization (Frontend + Backend)

**Input:**
- Courier's current location
- Courier's schedule blocks (breaks, own business)
- Available jobs for today
- Courier's target earnings

**Algorithm:**
1. Filter orders:
   - Within service radius (30km)
   - Skill level requirements met
   - Time windows feasible
   
2. Score each order:
   - Distance from current position
   - Distance from previously accepted order
   - Revenue per km (efficiency)
   - Time sensitivity (deadline urgency)
   
3. Suggest consolidations:
   - Orders in same area can share a trip
   - Show profit diff vs sequential visits
   
4. Output: Optimized sequence + statistics

**Frontend Display:**
- Timeline view with visual blocks
- Drag-and-drop reordering
- Before/after stats (distance, time, profit)
- Accept suggestion or keep manual

---

## 8️⃣ Non-Functional Requirements

### 8.1 Performance
- App launch time: <3 seconds
- Order list load: <2 seconds
- Map rendering: smooth 60 FPS
- Location update: <5 second delay
- API response: <2 seconds

### 8.2 Reliability
- 99.5% uptime target
- Offline fallback for critical features
- Data sync when reconnected
- Corrupt data recovery

### 8.3 Security
- OAuth2 / JWT token auth
- Encrypted local database
- TLS 1.3 for all API calls
- Biometric auth support
- PII encryption in storage
- OWASP Top 10 compliance

### 8.4 Scalability
- Support 10,000+ concurrent couriers
- 100,000+ orders/day
- Real-time updates via WebSocket
- CDN for image/media delivery

### 8.5 Compliance
- GDPR compliant (data deletion, export)
- Israel labor law compliance
- Payment processor integration (PCI-DSS)
- Activity logging for audit

---

## 📊 Summary

This document outlines a **production-grade Courier Application** suitable for:
- ✅ High-volume gig economy operations
- ✅ Multi-source job aggregation
- ✅ Professional skill progression
- ✅ Real-time optimization
- ✅ Transparent earnings & gamification
- ✅ Scalable to 10,000+ couriers

