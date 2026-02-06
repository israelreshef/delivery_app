# TZIR Delivery Platform - System Summary for AI Analysis

## 1. Project Overview
**Name:** TZIR (Hybrid Delivery Platform)
**Goal:** A scalable, secure, and legally compliant delivery platform connecting businesses/individuals with a fleet of independent couriers (Gig Economy model).
**Core Features:** Real-time tracking, secure "legal" deliveries (court documents), hybrid fleet management (on-demand + scheduled), and specific adaptations for the Israeli market.

## 2. Technology Stack

### Backend
*   **Language:** Python 3.10+
*   **Framework:** Flask (Modular Blueprints architecture)
*   **Database:** PostgreSQL 15 + PostGIS (Geospatial data)
*   **ORM:** SQLAlchemy
*   **Real-time:** Flask-SocketIO (WebSockets for location/chat)
*   **Auth:** JWT (flask-jwt-extended) + RSA key-pair (End-to-End Encryption support)
*   **Key Libraries:** `gevent` (WSGI server), `cryptography`, `pydantic`.

### Frontend (Web)
*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + Shadcn/UI
*   **State Management:** React Hooks + Context API
*   **Maps:** Leaflet (via React-Leaflet)
*   **Real-time Client:** `socket.io-client`

### Mobile (Courier App)
*   **Framework:** React Native (Expo)
*   **State:** Zustand
*   **Current Status:** Early Prototype (Login & Shift Logic implemented).
*   **Goal:** Offline-first architecture with GPS background tracking.

### DevOps & Infrastructure
*   **Containerization:** Docker & Docker Compose (Services: `web`, `db`, `redis`)
*   **Security:** Row-Level Security (RLS) in DB, Encrypted payloads for sensitive data.

## 3. Architecture & Data Model

### Key Database Models
*   **User:** Base user model (Admin / Courier / Customer).
*   **Courier:** Extended profile with vehicle details, rating, current location (PostGIS Point).
*   **Delivery (Order):** The core entity. Contains Pickup/Dropoff addresses, Status (PENDING, ASSIGNED, PICKED_UP, DELIVERED), and encrypted payload keys.
*   **AuditLog:** Immutable log of all critical system actions (Legal requirement).

### Data Flow
1.  **Order Creation:** Customer creates order -> Encrypted on client (AES/RSA) -> Sent to API.
2.  **Assignment:** Admin or Algorithm assigns to Courier -> Mobile App receives Push/Socket event.
3.  **Execution:** Courier updates status -> GPS coordinates streamed to Redis/Socket server -> Customer sees updates on live map.
4.  **Completion:** Proof of Delivery (POD) image + Digital Signature -> Saved to DB -> Invoice generated.

## 4. Current Development Status (Snapshot)

### ✅ Completed / Stable
*   **Authentication:** Robust JWT-based auth with Role-Based Access Control (RBAC).
*   **Basic Order Lifecycle:** Create -> Assign -> Pick Up -> Deliver.
*   **Security:** End-to-End Encryption infrastructure is active.
*   **Legal Compliance:** "Legal Delivery" mode with biometric signature and immutable logs/hashing.
*   **Admin Dashboard:** Basic metrics and order management table.

### 🚧 In Progress
*   **Mobile App:** Moving from prototype to fully functional app (Navigation, Offline Support).
*   **Routing Algorithm:** Currently manual assignment; moving to automated geospatial dispatching.
*   **Payments:** UI exists, but actual Payment Gateway integration (Stripe/Tranzila) is pending.

### 🗓️ Future Roadmap (AI Opportunities)
1.  **Smart Routing (AI):** Multi-stop optimization and dynamic load balancing.
2.  **Demand Prediction:** Analyzing historical order data to predict "hot zones" for couriers.
3.  **Fraud Detection:** Analysis of GPS anomalies to detect fake deliveries.
4.  **Voice assistant:** Hands-free voice commands for couriers while driving.

## 5. Known Issues / Constraints
*   **Scalability:** Current Flask-SocketIO setup is monolithic. Future scale >1000 users will require Redis Pub/Sub separation or migration to FastAPI/Go for the socket layer.
*   **Map Data:** Using OpenStreetMap (free); address resolution coverage in some areas needs improvement compared to Google Maps.

## 6. How to use this context with AI
*   **Code Generation:** Focus on Python (Flask) for logic and TypeScript (Next.js) for UI.
*   **Architecture:** Assume a microservices-ready structure but currently running as a modular monolith in Docker.
*   **Security First:** Always check for user roles (`@role_required`) and data ownership (RLS) when suggesting changes.
